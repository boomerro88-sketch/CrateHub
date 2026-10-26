from pathlib import Path
import zipfile,shutil,json,hashlib,urllib.request,subprocess,sys
root=Path(__file__).resolve().parents[1];payload=root/'windows-payload';downloads=root/'build/windows-downloads'
downloads.mkdir(parents=True,exist_ok=True)
for filename,url in {
 'python.zip':'https://www.python.org/ftp/python/3.14.9/python-3.14.9-embed-amd64.zip',
 'node.exe':'https://nodejs.org/dist/v22.23.4/win-x64/node.exe',
 'ffmpeg.zip':'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
}.items():
 if not (downloads/filename).exists(): urllib.request.urlretrieve(url,downloads/filename)
wheels=downloads/'wheels';wheels.mkdir(exist_ok=True)
subprocess.run([sys.executable,'-m','pip','download','yt-dlp[default]==2026.10.21','--platform','win_amd64','--python-version','314','--implementation','cp','--only-binary=:all:','--dest',str(wheels)],check=True)
runtime=payload/'runtime';runtime.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256((downloads/'python.zip').read_bytes()).hexdigest()=='3c01d7cfc666f746a6f064f60fb2156ab0ec464d3d738ab796371a46a9bb24a2'
assert hashlib.sha256((downloads/'node.exe').read_bytes()).hexdigest()=='dccc52de28d8df2ee22d2062424f8c563070d95d8ad70c54c4bf01d590dec14f'
with zipfile.ZipFile(downloads/'python.zip')as z:z.extractall(runtime)
(runtime/'python314._pth').write_text('python314.zip\n.\nLib/site-packages\n..\nimport site\n')
site=runtime/'Lib/site-packages';site.mkdir(parents=True,exist_ok=True)
for wheel in (downloads/'wheels').glob('*.whl'):
 with zipfile.ZipFile(wheel)as z:z.extractall(site)
shutil.copytree(root/'app',payload/'app',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
for name in ['desktop.py','README.md','THIRD_PARTY.md','ESSENTIA-LICENSE.txt']:shutil.copy2(root/name,payload/name)
(payload/'branding').mkdir(exist_ok=True)
for name in ['cratehub.png','cratehub.ico','cratehub.icns']:shutil.copy2(root/'branding'/name,payload/'branding'/name)
(payload/'bin').mkdir(exist_ok=True);shutil.copy2(downloads/'node.exe',payload/'bin/node.exe')
with zipfile.ZipFile(downloads/'ffmpeg.zip')as z:
 for name in z.namelist():
  if name.endswith(('/bin/ffmpeg.exe','/bin/ffprobe.exe')): (payload/'bin'/Path(name).name).write_bytes(z.read(name))
  if not name.endswith('/') and ('/doc/' in name or '/licenses/' in name or Path(name).name in ['LICENSE.txt','LICENSE','README.txt']):
   dest=payload/'licenses/ffmpeg'/Path(name).relative_to(Path(name).parts[0]);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
print('Windows payload ready:',sum(p.stat().st_size for p in payload.rglob('*')if p.is_file()))
