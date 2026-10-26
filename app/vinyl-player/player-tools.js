'use strict';
(()=>{
 let current={id:'zWWR3F1KqZk',artist:'7th Wonder',title:'Daisy Lady'};
 const template=document.getElementById('trackTools').cloneNode(true);template.hidden=false;
 function bind(){
  const panel=document.getElementById('trackTools'),track={...current};
  panel.querySelector('.analyze-button').dataset.id=track.id;
  let loaded=false;
  const details=panel.querySelector('.sample-uses'),output=panel.querySelector('.uses-result');
  details.addEventListener('toggle',async()=>{
   if(!details.open||loaded)return;loaded=true;output.textContent='Wczytywanie relacji z archiwum WhoSampled…';
   try{
    const r=await fetch('/uses?id='+encodeURIComponent(track.id));if(!r.ok)throw Error();
    const doc=new DOMParser().parseFromString(await r.text(),'text/html');
    doc.querySelectorAll('script,iframe,object,embed,style,link,form').forEach(n=>n.remove());
    doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{if(a.name.startsWith('on')||a.name==='style')n.removeAttribute(a.name);});if(n.tagName==='A'){const url=new URL(n.getAttribute('href'),location.href);if(!['http:','https:'].includes(url.protocol))n.removeAttribute('href');else n.href=url.href;n.target='_blank';n.rel='noopener noreferrer';}});
    output.replaceChildren(...doc.body.childNodes);
   }catch(e){loaded=false;output.textContent='Nie udało się odczytać relacji. Sprawdź, czy serwer katalogu na porcie 8766 jest uruchomiony.';}
  });
  async function download(noise){
   const buttons=[...panel.querySelectorAll('#downloadClean,#downloadVinyl')],result=panel.querySelector('.export-status');buttons.forEach(b=>b.disabled=true);
   result.textContent=noise==='off'?'Przygotowywanie MP3 oryginału…':'Przygotowywanie MP3 z trzaskami i 2-sekundowym intro…';
   try{
    const r=await fetch('/download',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id:track.id,noise,volume:String(Number(document.getElementById('noiseVolume').value)/100)})});
    if(!r.ok)throw Error('Nie udało się przygotować pliku. Sprawdź dostępność nagrania, serwer katalogu i FFmpeg.');
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${track.artist} - ${track.title} - ${noise==='off'?'oryginal':'vinyl-'+noise}.mp3`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    result.textContent='Plik gotowy — pobieranie rozpoczęte.';
   }catch(e){result.textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
  }
  panel.querySelector('#downloadClean').onclick=()=>download('off');
  panel.querySelector('#downloadVinyl').onclick=()=>download(panel.querySelector('#exportNoise').value);
  window.SoulCrateAnalysis?.hydrate(panel);
 }
 document.addEventListener('vinyl:track',e=>{current=e.detail;const old=document.getElementById('trackTools');old.replaceWith(template.cloneNode(true));bind();});
 bind();
})();
