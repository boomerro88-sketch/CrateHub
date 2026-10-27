'use strict';
let vinylMode=false,rpm=100/3,pitch=0;const audio=document.getElementById('audio');audio.preservesPitch=false;audio.mozPreservesPitch=false;audio.webkitPreservesPitch=false;
const crateMode=new URLSearchParams(location.search).get('source')==='crate';let allTracks=[],crateChoice='',crateSelect,crateTrackSelect,crateStatus;
let player,ready=false,tracks=[],current={id:'zWWR3F1KqZk',artist:'7th Wonder',title:'Daisy Lady'},engaged=false;
const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
const time=n=>Math.floor((n||0)/60)+':'+String(Math.floor((n||0)%60)).padStart(2,'0');
function artwork(){ $('cover').src=`https://i.ytimg.com/vi/${current.id}/hqdefault.jpg`;$('title').textContent=current.title;$('artist').textContent=current.artist;$('labelArtist').textContent=current.artist;$('ytlink').href='https://www.youtube.com/watch?v='+current.id;document.dispatchEvent(new CustomEvent('vinyl:track',{detail:{...current}}));}
let cueing=false,cueGeneration=0,initialSpin=false;
function initialRoulette(){if(!initialSpin&&ready&&tracks.length&&new URLSearchParams(location.search).has('embedded')){initialSpin=true;$('random').click();}}
// CC0 loop by OwlStorm; public preview converted to PCM WAV (see asset credits).
let noiseContext,noiseGain,noiseSource,noiseBufferPromise,leadIn=false,awaitingPlayback=false;
const noiseFile=fetch('assets/vinyl-crackle.wav').then(r=>{if(!r.ok)throw Error('Brak pliku trzasków');return r.arrayBuffer();});
noiseFile.catch(()=>{});
function unlockNoise(){
 if(!noiseContext){noiseContext=new(window.AudioContext||window.webkitAudioContext)();noiseGain=noiseContext.createGain();noiseGain.connect(noiseContext.destination);noiseGain.gain.value=Number($('noiseVolume').value)/100;noiseBufferPromise=noiseFile.then(b=>noiseContext.decodeAudioData(b.slice(0)));noiseBufferPromise.catch(()=>{});}
 return noiseContext.resume();
}
function stopNoise(){if(noiseSource){noiseSource.stop();noiseSource.disconnect();noiseSource=null;}}
async function startNoise(generation=cueGeneration){
 if($('noiseMode').value==='off')return;
 await unlockNoise();const buffer=await noiseBufferPromise;
 if(generation!==cueGeneration||!noiseShouldRun())return;
 if(noiseSource)return;
 noiseSource=noiseContext.createBufferSource();noiseSource.buffer=buffer;noiseSource.loop=true;noiseSource.connect(noiseGain);noiseSource.start();
}
function isSongPlaying(){return vinylMode?!audio.paused:(ready&&player.getPlayerState()===1);}
function noiseShouldRun(){
 const mode=$('noiseMode').value;
 if(mode==='off')return false;
 // Keep the same crackle source alive until the song actually starts,
 // including YouTube's CUED/PAUSED/BUFFERING events during the handoff.
 if(leadIn||awaitingPlayback)return true;
 return mode==='full'&&(isSongPlaying()||(!vinylMode&&engaged&&ready&&player.getPlayerState()===3));
}
function syncNoise(){
 if(!noiseShouldRun())stopNoise();
 else startNoise().catch(()=>status('Nie udało się odtworzyć trzasków winylu.'));
}
$('noiseMode').onchange=()=>{unlockNoise().catch(()=>{});syncNoise();};
$('noiseVolume').oninput=()=>{const value=Number($('noiseVolume').value);$('noiseValue').textContent=value+'%';if(noiseGain)noiseGain.gain.setTargetAtTime(value/100,noiseContext.currentTime,.025);};
function progressNow(){const d=vinylMode?audio.duration:(ready?player.getDuration():0),t=vinylMode?audio.currentTime:(ready?player.getCurrentTime():0);return d?Math.max(0,Math.min(1,t/d)):0;}
function grooveAngle(progress){
 // Stylus orbit measured from the photographic layers, in deck-width units.
 const radius=.348-(.348-.122)*Math.max(0,Math.min(1,progress));let low=26,high=54;
 for(let i=0;i<28;i++){const angle=(low+high)/2,t=angle*Math.PI/180;const x=.826-.01064*Math.cos(t)-.5134*Math.sin(t),y=.1816-.01064*Math.sin(t)+.5134*Math.cos(t);if(Math.hypot(x-.385,y-.3766)>radius)low=angle;else high=angle;}
 return (low+high)/2;
}
function arm(progress=0){$('arm').style.transform=`rotate(${engaged||cueing?grooveAngle(progress):-6}deg)`;}
async function beginPlayback(){
 if(cueing||(crateMode&&!tracks.length))return;
 unlockNoise().catch(()=>{});
 if(!vinylMode){try{await ensureVinyl(false);}catch(e){status(e.message);return;}if(!vinylMode||cueing)return;}
 if(!engaged){
  const generation=++cueGeneration;cueing=true;$('arm').classList.add('cueing');$('play').disabled=true;$('start').disabled=true;
  status('Ramię dojeżdża do zewnętrznego rowka…');arm(progressNow());
  await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?0:1600));
  if(generation!==cueGeneration)return;
  $('arm').classList.remove('cueing');leadIn=true;$('deck').classList.add('playing');
  status('Igła w rowku · 2 sekundy przed startem utworu…');
  try{await startNoise(generation);}catch(e){status('Trzaski niedostępne · za chwilę ruszy utwór.');}
  if(generation!==cueGeneration)return;
  await new Promise(resolve=>setTimeout(resolve,2000));
  if(generation!==cueGeneration)return;
  awaitingPlayback=true;leadIn=false;cueing=false;engaged=true;
  // End intro-only noise in the real PLAYING callback, not on the timer.
  $('play').disabled=false;$('start').disabled=false;
 }
 awaitingPlayback=true;
 if(vinylMode){try{await audio.play();}catch(e){awaitingPlayback=false;stopNoise();$('deck').classList.remove('playing');status(e.message);}}else if(ready)player.playVideo();
}
function play(){if(cueing)return;if(vinylMode){if(audio.paused)beginPlayback();else{awaitingPlayback=false;audio.pause();}return;}if(!ready)return;if(player.getPlayerState()===1){awaitingPlayback=false;player.pauseVideo();}else beginPlayback();}
function stop(){awaitingPlayback=false;cueGeneration++;leadIn=false;stopNoise();cueing=false;engaged=false;$('arm').classList.remove('cueing');$('play').disabled=!ready;$('start').disabled=!ready;audio.pause();audio.currentTime=0;if(ready)player.stopVideo();arm();$('deck').classList.remove('playing');$('play').textContent='▶ START';$('seek').value=0;$('elapsed').textContent='0:00';status('Ramię na podpórce. Płyta gotowa do odtworzenia.');}
window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('youtube',{host:'https://www.youtube-nocookie.com',width:320,height:180,videoId:current.id,playerVars:{playsinline:1,origin:location.origin,rel:0},events:{onReady(){ready=true;['play','start','seek'].forEach(id=>$(id).disabled=false);status('Gotowe. Naciśnij START, aby opuścić igłę.');if(crateMode)refreshCratePool();else initialRoulette();},onStateChange(e){const active=e.data===YT.PlayerState.PLAYING;if(active){awaitingPlayback=false;$('deck').classList.add('playing');}else if(!cueing&&!vinylMode&&e.data===YT.PlayerState.PAUSED&&!awaitingPlayback)$('deck').classList.remove('playing');$('play').textContent=active?'Ⅱ PAUZA':'▶ START';if(active&&!engaged){player.pauseVideo();beginPlayback();return;}if(!cueing&&!vinylMode)syncNoise();if(active){arm(progressNow());status('Odtwarzanie oryginału · 33⅓ RPM');}if(e.data===YT.PlayerState.PAUSED&&!cueing&&!vinylMode)status('Pauza · igła pozostaje w bieżącym miejscu.');if(e.data===YT.PlayerState.ENDED)stop();},onError(e){awaitingPlayback=false;cueGeneration++;cueing=false;leadIn=false;stopNoise();engaged=false;arm();$('deck').classList.remove('playing');status('YouTube nie udostępnił tego filmu w odtwarzaczu (kod '+e.data+'). Wylosuj inną płytę lub użyj linku YouTube.');}}});};
$('play').onclick=play;$('start').onclick=play;
$('seek').oninput=()=>{if(vinylMode&&audio.duration){audio.currentTime=Number($('seek').value)/1000*audio.duration;return;}if(ready&&player.getDuration()){const p=Number($('seek').value)/1000;player.seekTo(p*player.getDuration(),true);if(engaged)arm(p);}};
function chooseTrack(next){
 if(!next)return;if(audioRequest)audioRequest.abort();audioRequest=null;audioPreparing=null;if(ready)stop();vinylMode=false;audio.removeAttribute('src');current=next;artwork();$('elapsed').textContent='0:00';$('duration').textContent='0:00';$('vinylAudio').textContent='AUDIO VINYL / PITCH AKTYWNE';$('vinylAudio').disabled=false;if(ready)player.cueVideoById(current.id);speed();if(crateTrackSelect)crateTrackSelect.value=current.id;status('Nowa płyta na talerzu. Naciśnij START.');
}
$('random').onclick=()=>{if(!tracks.length){status(crateMode?'Ta skrzynka jest pusta. Dodaj utwory w Explorerze.':'Baza jest jeszcze niedostępna.');return;}let next;do{const n=new Uint32Array(1);crypto.getRandomValues(n);next=tracks[Math.floor(n[0]/4294967296*tracks.length)];}while(tracks.length>1&&next.id===current.id);chooseTrack(next);};
function refreshCratePool(){
 if(!crateMode||!crateSelect)return;
 let saved;try{saved=JSON.parse(localStorage.getItem('crate-user-v1'))||{};}catch(_){saved={};}
 const crates=saved.crates&&typeof saved.crates==='object'?saved.crates:{};
 if(crateChoice&&!Object.hasOwn(crates,crateChoice))crateChoice='';
 const available=new Set(allTracks.map(r=>r.id));crateSelect.replaceChildren(new Option('Wszystkie moje skrzynki',''));
 Object.entries(crates).forEach(([name,ids])=>{if(Array.isArray(ids))crateSelect.add(new Option(name+' ('+new Set(ids.filter(id=>available.has(id))).size+')',name));});crateSelect.value=crateChoice;
 const ids=new Set((crateChoice?(Array.isArray(crates[crateChoice])?crates[crateChoice]:[]):Object.values(crates).filter(Array.isArray).flat()).filter(id=>typeof id==='string'));
 tracks=allTracks.filter(r=>ids.has(r.id));
 const crateBase=document.querySelector('.record-crate'),crateRecords=document.querySelector('.record-crate-records');
 if(crateBase&&crateRecords){crateBase.parentElement.classList.add('user-crate');const count=Math.min(30,tracks.length);crateBase.src='assets/record-crate-empty.png';crateBase.alt='Skrzynka na winyle';crateRecords.hidden=false;crateRecords.src='assets/record-layers/records-'+String(count).padStart(2,'0')+'.png';crateRecords.dataset.count=String(count);}
 crateTrackSelect.replaceChildren(new Option('Wybierz utwór ze skrzynki…',''));tracks.forEach(r=>crateTrackSelect.add(new Option(r.artist+' — '+r.title,r.id)));
 crateStatus.textContent=tracks.length?tracks.length+' utworów · odtwarzanie wyłącznie z Twoich skrzynek':'Skrzynka jest pusta. Dodaj do niej utwory w Explorerze przez „Do skrzynki…”.';
 $('cover').hidden=!tracks.length;$('trackTools').hidden=!tracks.length;document.querySelector('.source').hidden=!tracks.length;
 for(const id of ['play','start','seek','vinylAudio','random'])$(id).disabled=!tracks.length||(!ready&&id!=='random');
 if(!tracks.length){if(ready){if(audioRequest)audioRequest.abort();audioRequest=null;audioPreparing=null;stop();}for(const id of ['play','start','seek','vinylAudio','random'])$(id).disabled=true;$('title').textContent='Pusta skrzynka';$('artist').textContent='Dodaj utwory w Explorerze';status('Brak utworów do odtwarzania z tej skrzynki.');return;}
 if(ready&&(!initialSpin||!tracks.some(r=>r.id===current.id))){initialSpin=true;$('random').click();}else crateTrackSelect.value=current.id;
}
if(crateMode){
 const panel=document.createElement('section');panel.className='crate-source';panel.setAttribute('aria-label','Wybór skrzynki do odsłuchu');
 const heading=document.createElement('h2');heading.textContent='TWOJE SKRZYNKI';
 const label=document.createElement('label');label.textContent='Skrzynka ';crateSelect=document.createElement('select');crateSelect.setAttribute('aria-label','Skrzynka do odsłuchu');label.append(crateSelect);crateSelect.onchange=()=>{crateChoice=crateSelect.value;refreshCratePool();};
 const trackLabel=document.createElement('label');trackLabel.textContent='Utwór ';crateTrackSelect=document.createElement('select');crateTrackSelect.setAttribute('aria-label','Utwór ze skrzynki');trackLabel.append(crateTrackSelect);crateTrackSelect.onchange=()=>chooseTrack(tracks.find(r=>r.id===crateTrackSelect.value));
 const prev=document.createElement('button'),next=document.createElement('button');prev.textContent='← POPRZEDNIA PŁYTA';next.textContent='NASTĘPNA PŁYTA →';prev.type=next.type='button';const step=delta=>{if(!tracks.length)return;const index=tracks.findIndex(r=>r.id===current.id);chooseTrack(tracks[(Math.max(0,index)+delta+tracks.length)%tracks.length]);};prev.onclick=()=>step(-1);next.onclick=()=>step(1);
 crateStatus=document.createElement('p');crateStatus.setAttribute('role','status');panel.append(heading,label,trackLabel,prev,next,crateStatus);document.querySelector('.scene').before(panel);$('random').textContent='LOSUJ ZE SKRZYNKI ↗';window.addEventListener('storage',e=>{if(e.key==='crate-user-v1')refreshCratePool();});refreshCratePool();
}

setInterval(()=>{if(!ready)return;const duration=(vinylMode?audio.duration:player.getDuration())||0,elapsed=(vinylMode?audio.currentTime:player.getCurrentTime())||0;$('duration').textContent=time(duration);if(!engaged)return;const progress=duration?Math.min(1,elapsed/duration):0;$('seek').value=Math.round(progress*1000);$('elapsed').textContent=time(elapsed);arm(progress);},500);
fetch('tracks.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{allTracks=data;if(crateMode)refreshCratePool();else{tracks=data;initialRoulette();}}).catch(()=>status(crateMode?'Nie udało się wczytać utworów ze skrzynki. Odśwież stronę.':'Nie udało się wczytać bazy. Domyślna płyta nadal jest dostępna.'));
setTimeout(()=>{if(!ready)status('YouTube nadal się ładuje. Sprawdź internet lub blokowanie skryptów YouTube w przeglądarce.');},18000);

function speed(){const factor=rpm/(100/3)*(1+pitch/100);audio.playbackRate=factor;const animation=$('record').getAnimations()[0];if(animation)animation.playbackRate=factor;$('pitchValue').textContent=(pitch>0?'+':'')+pitch.toFixed(1)+'%';$('quartz').classList.toggle('off',Math.abs(pitch)>.01);$('rateInfo').textContent=(rpm>40?'45':'33⅓')+' RPM · pitch '+pitch.toFixed(1)+'% · '+(vinylMode?'audio '+factor.toFixed(3)+'× · zmiana tempa i wysokości':'YouTube: standardowe audio · zmiana pitch / RPM automatycznie przygotuje AUDIO VINYL');}
document.querySelectorAll('[data-rpm]').forEach(b=>b.onclick=()=>{rpm=Number(b.dataset.rpm);document.querySelectorAll('[data-rpm]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));speed();ensureVinyl(false).catch(e=>status(e.message));});
$('pitch').oninput=()=>{pitch=Number($('pitch').value);speed();ensureVinyl(false).catch(e=>status(e.message));};$('pitch').ondblclick=()=>{$('pitch').value=0;pitch=0;speed();};
let audioRequest=null,audioPreparing=null;
async function ensureVinyl(forcePlay=false){
 if(crateMode&&!tracks.length){status('Ta skrzynka jest pusta.');return;}
 if(vinylMode){speed();if(forcePlay)await beginPlayback();return;}
 if(audioPreparing){await audioPreparing;if(forcePlay&&vinylMode)await beginPlayback();return;}
 const id=current.id,controller=new AbortController();audioRequest=controller;
 const b=$('vinylAudio');b.disabled=true;
 status('Przygotowanie audio: pitch oraz 33/45 będą zmieniały tempo i wysokość dźwięku…');
 audioPreparing=(async()=>{
  const response=await fetch('/audio?id='+encodeURIComponent(id),{signal:controller.signal});
  if(!response.ok)throw Error('Audio z regulacją obrotów jest niedostępne. YouTube gra standardowo — pitch dźwięku wymaga dostępnego audio.');
  const blob=await response.blob();if(current.id!==id||controller.signal.aborted)return;
  const resume=forcePlay||(ready&&player.getPlayerState()===1),position=ready?player.getCurrentTime():0;
  awaitingPlayback=resume;if(ready)player.pauseVideo();
  if(audio.src.startsWith('blob:'))URL.revokeObjectURL(audio.src);
  audio.src=URL.createObjectURL(blob);
  await new Promise((resolve,reject)=>{audio.onloadedmetadata=resolve;audio.onerror=()=>reject(Error('Nie udało się odczytać audio.'));audio.load();});
  if(current.id!==id||controller.signal.aborted)return;
  audio.currentTime=Math.min(position,audio.duration||0);vinylMode=true;speed();
  b.textContent='AUDIO VINYL / PITCH AKTYWNE';
  if(resume)await beginPlayback();else status('Audio gotowe. Pitch i 33/45 zmieniają tempo oraz wysokość dźwięku.');
 })();
 try{await audioPreparing;}finally{if(audioRequest===controller){audioRequest=null;audioPreparing=null;b.disabled=false;}}
}
$('vinylAudio').onclick=()=>{unlockNoise().catch(()=>{});ensureVinyl(true).catch(e=>status(e.message));};
audio.onplaying=()=>{awaitingPlayback=false;engaged=true;syncNoise();$('deck').classList.add('playing');$('play').textContent='Ⅱ PAUZA';arm(progressNow());status('Oryginalne audio · płynny pitch ±8% · bez zachowywania wysokości tonu');};audio.onpause=()=>{if(cueing||awaitingPlayback)return;stopNoise();$('deck').classList.remove('playing');$('play').textContent='▶ START';if(vinylMode&&engaged)status('Pauza · igła pozostaje w bieżącym miejscu.');};audio.onended=stop;speed();

// The catalogue hosts the same player as a mode; leaving it pauses all sound.
if(new URLSearchParams(location.search).has('embedded')){
 document.body.classList.add('embedded-player');
 let parentOrigin;
 try{const u=new URL(document.referrer);if(['localhost','127.0.0.1'].includes(u.hostname))parentOrigin=u.origin;}catch(_){}
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==parentOrigin||!['vinyl:pause','vinyl:crate-refresh'].includes(event.data?.type))return;
  if(event.data.type==='vinyl:crate-refresh'){refreshCratePool();return;}
  if(audioRequest){audioRequest.abort();audioRequest=null;audioPreparing=null;$('vinylAudio').disabled=false;}
  awaitingPlayback=false;if(cueing)stop();else{audio.pause();if(ready)player.pauseVideo();stopNoise();$('deck').classList.remove('playing');}
 });
 if(parentOrigin){let pending=false;const report=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;parent.postMessage({type:'vinyl:height',height:document.documentElement.scrollHeight},parentOrigin);});};new ResizeObserver(report).observe(document.body);report();}
}
