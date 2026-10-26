"""CrateHub native desktop window with a bundled local application service."""
import os,sys,json,shutil,threading,urllib.request,logging
from pathlib import Path
BUNDLE=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))
os.environ['PATH']=str(BUNDLE/'bin')+os.pathsep+os.environ.get('PATH','')
# Frozen yt-dlp children must run the CLI, never recursively start the desktop UI.
if len(sys.argv)>1 and sys.argv[1]=='--yt-dlp':
 import yt_dlp
 yt_dlp.main(sys.argv[2:]);sys.exit(0)
VERSION='1.1.1'
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
 if not (root/'catalog-data.json').exists():
  import gzip
  (root/'catalog-data.json').write_bytes(gzip.decompress((root/'catalog-data.json.gz').read_bytes()))
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
 native_status={'window_loaded':False}
 class DesktopHandler(server_v2.Handler):
  def do_GET(self):
   if self.path=='/desktop-health' and self.valid_host():return self.answer({'app':'cratehub','version':VERSION,**native_status})
   return super().do_GET()
 if opts.self_test:
  import subprocess,yt_dlp,webview
  if sys.platform=='win32':
   import clr
   clr.AddReference('System.Windows.Forms')
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
  if ours:raise RuntimeError('CrateHub jest już uruchomiony. Przełącz się do jego okna.')
  raise RuntimeError(f'Port {opts.port} jest zajęty przez inny program. Zamknij go i uruchom aplikację ponownie.')
 if opts.headless:server.serve_forever();return
 import webview
 webview.settings['ALLOW_DOWNLOADS']=True
 webview.settings['ALLOW_FILE_URLS']=False
 webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER']=True
 window=webview.create_window('CrateHub',url,width=1380,height=900,min_size=(780,600),background_color='#E59000',text_select=True)
 def loaded():native_status['window_loaded']=True
 window.events.loaded+=loaded
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  webview.start(gui='edgechromium' if sys.platform=='win32' else None,private_mode=False,storage_path=str(root/'window-profile'),localization={'global.quitConfirmation':'Zamknąć CrateHub?','global.ok':'OK','global.cancel':'Anuluj','global.saveFile':'Zapisz plik','global.openFile':'Otwórz plik'})
 finally:
  server.shutdown();server.server_close()
if __name__=='__main__':
 try:main()
 except Exception as error:
  if '--headless' in sys.argv or '--self-test' in sys.argv:raise
  if sys.platform=='win32':
   import ctypes
   ctypes.windll.user32.MessageBoxW(None,str(error),'CrateHub',0x10);sys.exit(1)
  import AppKit
  alert=AppKit.NSAlert.alloc().init();alert.setMessageText_('CrateHub');alert.setInformativeText_(str(error));alert.runModal()
