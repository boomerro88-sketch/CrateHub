"""Build on the target OS: bundled Python, FFmpeg, Node and yt-dlp."""
import sys,shutil,subprocess,os,platform,re,plistlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
ffmpeg=os.environ.get('CRATE_FFMPEG') or shutil.which('ffmpeg')
node=shutil.which('node')
assert ffmpeg and node,'Build machine needs FFmpeg and Node; end users do not.'
cmd=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--windowed','--onedir','--name','CrateHub','--paths','app','--add-data','app:app','--collect-all','yt_dlp','--collect-all','yt_dlp_ejs','--collect-all','certifi','--collect-all','webview','--add-binary',str(Path(ffmpeg).resolve())+':bin','--add-binary',str(Path(node).resolve())+':bin','--hidden-import','server_v2','--hidden-import','importer','--hidden-import','soul_crate_server']
probe=shutil.which('ffprobe')
if probe:cmd+=['--add-binary',str(Path(probe).resolve())+':bin']
icon=ROOT/'branding'/('cratehub.icns' if sys.platform=='darwin' else 'cratehub.ico')
if icon.exists():cmd+=['--icon',str(icon)]
if sys.platform=='darwin':cmd+=['--osx-bundle-identifier','com.mattmattick.cratehub']
cmd+=['--add-data','licenses:licenses','--add-data','THIRD_PARTY.md:licenses','--add-data','ESSENTIA-LICENSE.txt:licenses','desktop.py'];subprocess.run(cmd,check=True)

if sys.platform=='darwin':
 version=re.search(r"VERSION\s*=\s*['\"]([^'\"]+)",(ROOT/'desktop.py').read_text()).group(1)
 info=ROOT/'dist/CrateHub.app/Contents/Info.plist'
 data=plistlib.loads(info.read_bytes());data.update(CFBundleShortVersionString=version,CFBundleVersion=version)
 info.write_bytes(plistlib.dumps(data))
 subprocess.run(['codesign','--force','--deep','--sign','-',str(ROOT/'dist/CrateHub.app')],check=True)
