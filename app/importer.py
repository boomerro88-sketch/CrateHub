"""Metadata-only YouTube import, shared by CLI and local /add endpoint."""
import json,re,unicodedata,datetime,threading,os,sys
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
import os
ROOT=Path(os.environ.get('CRATE_DATA_ROOT',Path(__file__).resolve().parent))
sys.path.insert(0,str(ROOT/'.runtime'))
LOCK=threading.Lock()
BLOCK=re.compile(r'\b(?:sample\s*pack|loop\s*kit|drum\s*kit|sound\s*kit|kit|pack|royalty\s*free|free\s+for\s+(?:profit|download)|loops?|presets?|vst|bundle|samples\s+vol|free\s+samples|no\s+copyright|copyright\s+free|midi|splice|producer\s+pack|out\s+now|available\s+now|buy\s+now|download\s+link|shop|sale|type\s+beat|full\s+(?:album|lp)|mix|learn|copyright\s+killers|bruh\s+samples|tutorial|how\s+to)\b|\d+\s*%\s*off',re.I)
def key(artist,title):
 text=unicodedata.normalize('NFKD',str(artist)+' '+str(title)).casefold().replace('ł','l')
 return ''.join(c for c in text if c.isalnum() and not unicodedata.combining(c))
def canonical(value):
 u=urlsplit(value.strip())
 if u.scheme not in ['http','https'] or (u.hostname or '').lower() not in ['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be']:raise ValueError('Dozwolone są wyłącznie linki YouTube.')
 q=parse_qs(u.query)
 if q.get('list') and re.fullmatch(r'[A-Za-z0-9_-]{10,100}',q['list'][0]):return 'https://www.youtube.com/playlist?list='+q['list'][0]
 vid=u.path.strip('/') if u.hostname=='youtu.be' else q.get('v',[''])[0]
 if u.path.startswith(('/shorts/','/embed/')):vid=u.path.split('/')[2]
 if not re.fullmatch(r'[A-Za-z0-9_-]{11}',vid):raise ValueError('Nieprawidłowy link do filmu lub playlisty.')
 return 'https://www.youtube.com/watch?v='+vid
def candidate(e,url):
 raw=(e.get('title') or '').strip();vid=e.get('id','');duration=e.get('duration')
 if not re.fullmatch(r'[A-Za-z0-9_-]{11}',vid) or not raw or raw in ['[Private video]','[Deleted video]'] or BLOCK.search(raw):return None,'reklama, nie-utwór lub niedostępny film'
 if not isinstance(duration,(float,int)) or not 20<=duration<=1800:return None,'długość poza zakresem 20–1800 s lub brak długości'
 channel=e.get('channel') or e.get('uploader') or ''
 split=re.split(r'\s[-–—]\s',raw,maxsplit=1)
 artist,title=split if len(split)==2 else (re.sub(r'\s*-\s*Topic$','',channel,flags=re.I),raw)
 if not artist.strip() or not title.strip():return None,'brak wykonawcy lub tytułu'
 return dict(id=vid,artist=artist.strip(),title=title.strip(),playlist_url=url if 'playlist?' in url else '',channel=channel,raw_title=raw,duration=duration,imported_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),genres=[],regions=['Nieustalone'],region='Nieustalone',uses_count=0,whosampled_url='https://www.whosampled.com/search/?q='+__import__('urllib.parse',fromlist=['quote']).quote(artist+' '+title)),None
def import_urls(urls,progress=None):
 import yt_dlp
 urls=list(dict.fromkeys(canonical(u) for u in urls if u.strip()))
 if not urls or len(urls)>30:raise ValueError('Wklej od 1 do 30 linków.')
 report=dict(added=0,existing=0,duplicates=0,rejected=0,sources=[],errors=[]);collected=[]
 for url in urls:
  if progress:progress(url)
  source=dict(url=url,entries=0,rejected=[]);report['sources'].append(source)
  try:
   with yt_dlp.YoutubeDL({'extract_flat':'in_playlist','skip_download':True,'quiet':True,'no_warnings':True,'ignoreerrors':True,'socket_timeout':15,'retries':1,'extractor_retries':1}) as ydl:data=ydl.extract_info(url,download=False)
   if not data:raise ValueError('YouTube nie zwrócił danych.')
   entries=data.get('entries') if data.get('_type')=='playlist' else [data]
   for e in entries or []:
    source['entries']+=1
    if not e:report['rejected']+=1;continue
    row,reason=candidate(e,url)
    if row:collected.append(row)
    else:report['rejected']+=1;source['rejected'].append({'id':e.get('id'),'title':e.get('title'),'reason':reason})
  except Exception as e:report['errors'].append({'url':url,'error':str(e)[:500]})
 with LOCK:
  path=ROOT/'catalog-data.json';rows=json.loads(path.read_text(encoding='utf-8'));ids={r['id'] for r in rows};keys={key(r['artist'],r['title']) for r in rows}
  for r in collected:
   if r['id'] in ids:report['existing']+=1;continue
   k=key(r['artist'],r['title'])
   if k in keys:report['duplicates']+=1;continue
   r['number']=len(rows)+1;rows.append(r);ids.add(r['id']);keys.add(k);report['added']+=1
  for i,r in enumerate(rows):
   r['number']=i+1;r.setdefault('imported_at',None);r.setdefault('raw_title',r['title']);r.setdefault('channel','');r.setdefault('playlist_url','')
  temp=path.with_suffix('.json.tmp');temp.write_text(json.dumps(rows,ensure_ascii=False), encoding='utf-8');os.replace(temp,path)
  # Keep the existing no-JS fallback and append new imported cards.
  import html
  page=ROOT/'crate_e_digger.html';markup=page.read_text(encoding='utf-8');present=set(re.findall(r'youtube.com/watch\?v=([\w-]{11})',markup));cards=[]
  for r in rows:
   if r['id'] not in present:cards.append('<article class="static-item"><span>#'+str(r['number'])+'</span><h2>'+html.escape(r['artist']+' — '+r['title'])+'</h2><p>Brak danych o roku, BPM i tonacji</p><a href="https://www.youtube.com/watch?v='+r['id']+'">Oryginał YouTube</a> · <a href="'+html.escape(r.get('whosampled_url',''),quote=True)+'">WhoSampled</a></article>')
  markup=markup.replace('</section><section class="panel" id="o-danych"',''.join(cards)+'</section><section class="panel" id="o-danych"')
  count=f'{len(rows):,}'.replace(',',' ');markup=re.sub(r'<title>CrateHub — .*?</title>','<title>CrateHub — '+count+' utworów</title>',markup);markup=re.sub(r'Pełna lista: [\d ]+ utwor(?:ów|y)', 'Pełna lista: '+count+' utworów',markup)
  temp=page.with_suffix('.html.tmp');temp.write_text(markup, encoding='utf-8');os.replace(temp,page)
  tracks=[{k:r[k] for k in ['id','artist','title']} for r in rows];temp=ROOT/'vinyl-player/tracks.json.tmp';temp.write_text(json.dumps(tracks,ensure_ascii=False), encoding='utf-8');os.replace(temp,ROOT/'vinyl-player/tracks.json')
 report['total']=len(rows);return report
if __name__=='__main__':
 urls=Path(sys.argv[1]).read_text(encoding='utf-8').splitlines();report=import_urls(urls,lambda u:print(u,flush=True));(ROOT/'import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='sources'},ensure_ascii=False))
