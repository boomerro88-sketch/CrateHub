"""Desktop launcher; runs the unchanged local catalogue in the default browser."""
import os,sys,json,shutil,threading,webbrowser,urllib.request,logging
from pathlib import Path
BUNDLE=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))
os.environ['PATH']=str(BUNDLE/'bin')+os.pathsep+os.environ.get('PATH','')
# Frozen yt-dlp children must run the CLI, never recursively start the desktop UI.
if len(sys.argv)>1 and sys.argv[1]=='--yt-dlp':
 import yt_dlp
 yt_dlp.main(sys.argv[2:]);sys.exit(0)
VERSION='1.0.1'
os.environ.setdefault('SSL_CERT_FILE',__import__('certifi').where())
def data_root():
 if os.environ.get('CRATE_DESKTOP_DATA'):return Path(os.environ['CRATE_DESKTOP_DATA'])
 if sys.platform=='darwin':return Path.home()/'Library/Application Support/CrateHub'
 if sys.platform=='win32':return Path(os.environ.get('LOCALAPPDATA',Path.home()))/'CrateHub'
 return Path.home()/'.local/share/cratehub'
def prepare():
 root=data_root();root.mkdir(parents=True,exist_ok=True)
 seed=BUNDLE/'app';marker=root/'version.txt';old=marker.read_text().strip() if marker.exists() else None
 if old!=VERSION:
  for source in seed.rglob('*'):
   if not source.is_file() or '__pycache__' in source.parts:continue
   relative=source.relative_to(seed);dest=root/relative
   # User-imported catalogue is persistent, also across application upgrades.
   if str(relative) in ['catalog-data.json','vinyl-player/tracks.json'] and dest.exists():continue
   dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
  marker.write_text(VERSION)
 os.environ['CRATE_DATA_ROOT']=str(root)
 sys.path.insert(0,str(BUNDLE/'app'))
 return root

def main():
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('--headless',action='store_true');parser.add_argument('--self-test',action='store_true');parser.add_argument('--port',type=int,default=8890);opts=parser.parse_args()
 root=prepare()
 log=open(root/'desktop.log','a',encoding='utf-8',buffering=1)
 if sys.stdout is None:sys.stdout=log
 if sys.stderr is None:sys.stderr=log
 import server_v2
 from http.server import ThreadingHTTPServer
 class DesktopHandler(server_v2.Handler):
  def do_GET(self):
   if self.path=='/desktop-health' and self.valid_host():return self.answer({'app':'cratehub','version':VERSION})
   return super().do_GET()
 if opts.self_test:
  import subprocess,yt_dlp
  for command in ['ffmpeg','node']:
   binary=shutil.which(command)
   assert binary,command+' missing'
   result=subprocess.run([binary,'-version' if command=='ffmpeg' else '--version'],capture_output=True,text=True,timeout=30)
   assert result.returncode==0,result.stderr
  assert len(server_v2.base.TRACKS)>0
  print(json.dumps({'ok':True,'tracks':len(server_v2.base.TRACKS),'data':str(root),'yt_dlp':yt_dlp.version.__version__}));return
 url=f'http://localhost:{opts.port}/crate_e_digger.html#catalog-app'
 try:server=ThreadingHTTPServer(('127.0.0.1',opts.port),DesktopHandler)
 except OSError:
  try:
   with urllib.request.urlopen(f'http://localhost:{opts.port}/desktop-health',timeout=2) as response:ours=json.load(response).get('app')=='cratehub'
  except Exception:ours=False
  if ours:webbrowser.open(url);return
  raise RuntimeError(f'Port {opts.port} jest zajęty przez inny program. Zamknij go i uruchom aplikację ponownie.')
 if opts.headless:server.serve_forever();return
 if sys.platform=='win32':
  import ctypes
  threading.Thread(target=server.serve_forever,daemon=True).start()
  webbrowser.open(url)
  ctypes.windll.user32.MessageBoxW(None,'CrateHub działa lokalnie. Kliknij OK, aby zakończyć aplikację.\n\nCrateHub is running locally. Click OK to quit the app.','CrateHub',0x40)
  server.shutdown();server.server_close();return
 import tkinter as tk
 window=tk.Tk();window.title('CrateHub');window.geometry('480x300');window.configure(bg='#E59000');window.resizable(False,False)
 language='pl'
 settings=root/'desktop-settings.json'
 try:language=json.loads(settings.read_text()).get('language','pl')
 except Exception:pass
 controls=tk.Frame(window,bg='#E59000');controls.pack(anchor='e',padx=12,pady=(8,0))
 title=tk.Label(window,text='CrateHub',font=('Helvetica',34,'bold'),bg='#E59000',fg='#111111',justify='left');title.pack(pady=(10,12))
 explanation=tk.Label(window,bg='#E59000',fg='#111111');explanation.pack()
 open_button=tk.Button(window,command=lambda:webbrowser.open(url));open_button.pack(pady=12)
 footer=tk.Label(window,bg='#E59000',fg='#111111',font=('Helvetica',10));footer.pack()
 def set_language(value):
  nonlocal language
  language=value;settings.write_text(json.dumps({'language':value}))
  explanation.configure(text='Aplikacja działa lokalnie na Twoim komputerze.' if value=='pl' else 'The app runs locally on your computer.')
  open_button.configure(text='OTWÓRZ KATALOG ↗' if value=='pl' else 'OPEN CATALOGUE ↗')
  footer.configure(text='Zamknięcie tego okna zatrzyma aplikację.' if value=='pl' else 'Closing this window stops the app.')
 for code in ['pl','en']:tk.Button(controls,text=code.upper(),command=lambda code=code:set_language(code)).pack(side='left')
 set_language(language)
 def close():
  threading.Thread(target=server.shutdown,daemon=True).start();window.destroy()
 window.protocol('WM_DELETE_WINDOW',close)
 threading.Thread(target=server.serve_forever,daemon=True).start();window.after(700,lambda:webbrowser.open(url));window.mainloop();server.server_close()
if __name__=='__main__':
 try:main()
 except Exception as error:
  if '--headless' in sys.argv or '--self-test' in sys.argv:raise
  if sys.platform=='win32':
   import ctypes
   ctypes.windll.user32.MessageBoxW(None,str(error),'CrateHub',0x10);sys.exit(1)
  import tkinter as tk
  from tkinter import messagebox
  window=tk.Tk();window.withdraw();messagebox.showerror('CrateHub',str(error));window.destroy()
