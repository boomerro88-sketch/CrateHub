from pathlib import Path
import json,sys,urllib.parse,tempfile,subprocess,shutil,threading,mimetypes,importlib.util
from http.server import ThreadingHTTPServer
import os
ROOT=Path(os.environ.get('CRATE_DATA_ROOT',Path(__file__).resolve().parent))
import soul_crate_server as base
from importer import import_urls
JOBS={};GUARD=threading.Lock()
base.STATIC.update('/'+str(p.relative_to(ROOT)) for p in (ROOT/'vinyl-player').rglob('*') if p.is_file() and p.suffix in ['.js','.css','.html','.jpg','.png','.wav','.txt','.json','.wasm'])
base.STATIC.update(['/producer-tools.js','/producer-tools.css'])
def refresh():
 base.TRACKS=json.loads((ROOT/'catalog-data.json').read_text(encoding='utf-8'));base.TRACK_BY_ID={r['id']:r for r in base.TRACKS};base.IDS=set(base.TRACK_BY_ID)
def download(vid):
 ffmpeg=shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
 with tempfile.TemporaryDirectory() as d:
  import os
  env=os.environ.copy();env['PYTHONPATH']=str(ROOT/'.runtime')
  subprocess.run(([sys.executable,'--yt-dlp'] if getattr(sys,'frozen',False) else [str(Path(sys.executable).with_name('python.exe')) if sys.platform=='win32' else sys.executable,'-m','yt_dlp'])+['--ignore-config','--no-playlist','--no-progress','--js-runtimes','node','--socket-timeout','20','--retries','1','--ffmpeg-location',ffmpeg,'-f','bestaudio/best','-x','--audio-format','mp3','--max-filesize','150M','-o',str(Path(d)/'audio.%(ext)s'),'https://www.youtube.com/watch?v='+vid],env=env,capture_output=True,check=True,timeout=240,creationflags=(subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0))
  return (Path(d)/'audio.mp3').read_bytes()
class Handler(base.Handler):
 def answer(self,data,kind='application/json; charset=utf-8',code=200):
  if not isinstance(data,bytes):data=json.dumps(data,ensure_ascii=False).encode()
  self.send_response(code);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def do_GET(self):
  if not self.valid_host():return self.send_error(403)
  path=urllib.parse.urlsplit(self.path).path
  if path=='/add-status':
   job=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('job',[''])[0];return self.answer(JOBS.get(job,{'error':'Nieznany import'}))
  if path=='/audio':
   vid=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('id',[''])[0]
   refresh()
   if vid not in base.IDS:return self.send_error(400)
   try:return self.answer(download(vid),'audio/mpeg')
   except Exception:return self.send_error(502)
  if path=='/vinyl-player/tracks.json':refresh()
  return super().do_GET()
 def do_POST(self):
  if not self.valid_host() or self.headers.get('Sec-Fetch-Site')=='cross-site':return self.send_error(403)
  if self.headers.get('Origin') not in [None,f'http://localhost:{self.server.server_port}',f'http://127.0.0.1:{self.server.server_port}']:return self.send_error(403)
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<20000:return self.send_error(400)
   body=self.rfile.read(size).decode();args=urllib.parse.parse_qs(body)
  except Exception:return self.send_error(400)
  if self.path=='/add':
   from importer import canonical
   try:urls=[canonical(u) for u in args.get('urls',[''])[0].splitlines() if u.strip()];assert 0<len(urls)<=30
   except Exception:return self.answer({'error':'Wklej 1–30 poprawnych linków YouTube.'},code=400)
   with GUARD:
    if any(j.get('state')=='running' for j in JOBS.values()):return self.answer({'error':'Trwa już import. Poczekaj.'},code=409)
    import uuid
    job=uuid.uuid4().hex;JOBS[job]={'state':'running'}
   def run():
    try:JOBS[job]={'state':'done','report':import_urls(urls)};refresh()
    except Exception as e:JOBS[job]={'state':'error','error':str(e)[:400]}
   threading.Thread(target=run,daemon=True).start();return self.answer({'job':job},code=202)
  if self.path!='/download':return self.send_error(404)
  refresh();vid=args.get('id',[''])[0];mode=args.get('noise',['off'])[0]
  try:volume=float(args.get('volume',['0.22'])[0]);assert 0<=volume<=1 and mode in ['off','intro','full'] and vid in base.IDS
  except Exception:return self.send_error(400)
  if not base.LIMIT.acquire(False):return self.send_error(429)
  try:
   data=download(vid)
   if mode!='off':
    with tempfile.TemporaryDirectory() as folder:
     folder=Path(folder);src=folder/'original.mp3';out=folder/'vinyl.mp3';src.write_bytes(data)
     trim=',atrim=duration=2' if mode=='intro' else ''
     graph=f'[0:a]adelay=2000:all=1[song];[1:a]volume={volume}{trim}[noise];[song][noise]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95:level=false[out]'
     subprocess.run([shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-i',str(src),'-stream_loop','-1','-i',str(ROOT/'vinyl-player/assets/vinyl-crackle.wav'),'-filter_complex',graph,'-map','[out]','-c:a','libmp3lame','-q:a','2',str(out)],check=True,capture_output=True,timeout=300,creationflags=(subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0));data=out.read_bytes()
   self.send_response(200);self.send_header('Content-Type','audio/mpeg');self.send_header('Content-Disposition',f'attachment; filename="crate-{vid}-{mode}.mp3"');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  except Exception:self.send_error(502,'Audio export unavailable')
  finally:base.LIMIT.release()
if __name__=='__main__':
 port=int(sys.argv[1]) if len(sys.argv)>1 else 8880
 if '--open' in sys.argv:
  import webbrowser
  threading.Timer(1,lambda:webbrowser.open(f'http://localhost:{port}/crate_e_digger.html#catalog-app')).start()
 ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
