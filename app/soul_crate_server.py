#!/usr/bin/env python3
"""Local SOUL CRATE player and MP3 download handler."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlsplit, quote
import html, os, re, shutil, subprocess, sys, tempfile, threading, webbrowser, json
ROOT = Path(os.environ.get('CRATE_DATA_ROOT',Path(__file__).resolve().parent))
PAGE = 'crate_e_digger.html'
STATIC = {'/crate_e_digger.html','/fonts/sharpie-hand.woff2','/', '/soul_crate_58_youtube_bpm_tonacja.html', '/soul_crate_1000.html', '/analyzer.js', '/analysis-worker.js','/soul_crate_10000.html','/catalog.js','/catalog.css','/catalog-data.json'}
STATIC.update('/'+str(p.relative_to(ROOT)) for p in (ROOT/'vendor').rglob('*') if p.is_file() and p.suffix in {'.js','.wasm','.txt'})
LIMIT = threading.BoundedSemaphore(2)
TRACKS = json.loads((ROOT/'catalog-data.json').read_text(encoding='utf-8'))
TRACK_BY_ID = {r['id']:r for r in TRACKS}
IDS = set(TRACK_BY_ID)
USES = json.loads((ROOT/'catalog-uses.json').read_text(encoding='utf-8'))
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def valid_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
    def error_page(self, message, status=502):
        body = ('<!doctype html><html lang="pl"><meta charset="utf-8"><title>Pobieranie MP3</title><body style="background:#111;color:#eee;font:18px system-ui;padding:40px;max-width:800px"><h1>Nie udało się pobrać MP3</h1><p>'+html.escape(message)+'<p>Film musi być dostępny w YouTube. Wróć do katalogu i wybierz inny utwór.</body></html>').encode()
        self.send_response(status); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if not self.valid_host(): return self.send_error(403)
        if urlsplit(self.path).path == '/uses': return self.serve_uses()
        if urlsplit(self.path).path not in STATIC: return self.send_error(404)
        if self.headers.get('Host','').startswith('127.0.0.1:'):
            self.send_response(302); self.send_header('Location', f'http://localhost:{self.server.server_port}/'+PAGE); self.end_headers(); return
        if self.path == '/': self.path = '/'+PAGE
        super().do_GET()
    def do_HEAD(self):
        if not self.valid_host() or urlsplit(self.path).path not in STATIC: return self.send_error(404)
        if self.path == "/": self.path = "/"+PAGE
        super().do_HEAD()
    def serve_uses(self):
        vid = parse_qs(urlsplit(self.path).query).get('id',[''])[0]
        if vid not in IDS: return self.send_error(404)
        row=TRACK_BY_ID[vid]; found=USES.get(vid,{}).get('uses',[])
        body='<section><p><strong>'+html.escape(row['artist']+' — '+row['title'])+'</strong></p><p>Wszystkie znalezione relacje w archiwum z 2019 r.: '+str(len(found))+'. Bieżąca lista serwisu może być dłuższa.</p>'
        if found:
            body+='<ol>'+''.join('<li><a href="'+html.escape(u['url'],quote=True)+'" target="_blank" rel="noopener noreferrer">'+html.escape(u['artist']+' — '+u['title'])+'</a> ('+html.escape(str(u.get('year') or 'brak roku'))+')</li>' for u in found)+'</ol>'
        else: body+='<p>Nie znaleziono relacji w dostępnym archiwum. Nie oznacza to, że utwór nigdy nie był samplowany.</p>'
        body+='<p><a href="'+html.escape(row['whosampled_url'],quote=True)+'" target="_blank" rel="noopener noreferrer">Sprawdź WhoSampled</a></p></section>'
        data=body.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_POST(self):
        if not self.valid_host() or self.headers.get('Sec-Fetch-Site') == 'cross-site': return self.send_error(403)
        origin = self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'}: return self.send_error(403)
        if self.path != '/download': return self.send_error(404)
        try: length = int(self.headers.get('Content-Length', '0'))
        except ValueError: return self.send_error(400)
        if not 0 < length < 256: return self.send_error(400)
        vid = parse_qs(self.rfile.read(length).decode()).get('id',[''])[0]
        if vid not in IDS: return self.send_error(400)
        if not LIMIT.acquire(blocking=False): return self.error_page('Trwają już dwa pobrania. Spróbuj ponownie za chwilę.',429)
        try:
            ffmpeg = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
            if not Path(ffmpeg).is_file(): return self.error_page('Brakuje programu FFmpeg na komputerze.')
            with tempfile.TemporaryDirectory(prefix='soul-crate-') as folder:
                env = os.environ.copy(); env['PYTHONPATH'] = str(ROOT/'.runtime')
                cmd = [sys.executable, '-m', 'yt_dlp', '--ignore-config', '--no-playlist', '--no-progress', '--socket-timeout','20', '--retries','2', '--ffmpeg-location',ffmpeg, '-f','bestaudio/best','-x','--audio-format','mp3','--audio-quality','0', '--max-filesize','150M', '--restrict-filenames', '-o',str(Path(folder)/'%(title).150B [%(id)s].%(ext)s'), 'https://www.youtube.com/watch?v='+vid]
                result = subprocess.run(cmd,env=env,capture_output=True,text=True,timeout=240)
                files = list(Path(folder).glob('*.mp3'))
                if result.returncode or not files:
                    lines = [x for x in result.stderr.splitlines() if 'ERROR:' in x]
                    return self.error_page((lines[-1] if lines else 'YouTube nie udostępnił pliku audio.')[:700])
                file = files[0]
                self.send_response(200); self.send_header('Content-Type','audio/mpeg'); self.send_header('Content-Disposition',"attachment; filename*=UTF-8''"+quote(file.name)); self.send_header('Content-Length',str(file.stat().st_size)); self.send_header('Cache-Control','no-store'); self.end_headers()
                with file.open('rb') as audio: shutil.copyfileobj(audio,self.wfile)
        except subprocess.TimeoutExpired: self.error_page('Przekroczono czas pobierania. Spróbuj ponownie później.')
        except (BrokenPipeError, ConnectionResetError): pass
        finally: LIMIT.release()
def main():
    port = int(sys.argv[1]) if len(sys.argv)>1 else 0
    server = ThreadingHTTPServer(('127.0.0.1',port),Handler)
    url = f'http://localhost:{server.server_port}/{PAGE}'
    print('CrateHub: '+url,flush=True)
    print('Pozostaw to okno otwarte podczas korzystania z katalogu. Ctrl+C kończy.',flush=True)
    if '--open' in sys.argv: threading.Timer(0.4,lambda:webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
