'use strict';
(()=>{
 let current={id:'zWWR3F1KqZk',artist:'7th Wonder',title:'Daisy Lady'};
 const template=document.getElementById('trackTools').cloneNode(true);template.hidden=false;
 function crateControls(panel,track){
  let api;try{api=window.parent.CrateProducer;}catch(_){}if(!api?.addToCrate)return;
  const en=()=>window.CrateI18n?.language==='en',t=(pl,eng)=>en()?eng:pl;
  const box=document.createElement('div');box.className='roulette-crate-save';
  const label=document.createElement('label'),select=document.createElement('select'),input=document.createElement('input'),button=document.createElement('button'),result=document.createElement('p');
  label.textContent=t('Do skrzynki na winyle','Save to vinyl crate');select.setAttribute('aria-label',label.textContent);
  input.maxLength=60;input.placeholder=t('Nazwa nowej skrzynki','New crate name');input.setAttribute('aria-label',input.placeholder);input.hidden=true;
  button.type='button';button.textContent=t('Dodaj do skrzynki','Add to crate');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  function refresh(){const previous=select.value;select.replaceChildren();for(const crate of api.listCrates()){const option=new Option(crate.name+' ('+crate.count+'/30)'+(crate.ids.includes(track.id)?' ✓':''),crate.name);option.disabled=crate.count>=30&&!crate.ids.includes(track.id);select.add(option);}select.add(new Option(t('+ Nowa skrzynka…','+ New crate…'),'__new__'));if([...select.options].some(o=>o.value===previous&&!o.disabled))select.value=previous;else select.selectedIndex=[...select.options].findIndex(o=>!o.disabled);input.hidden=select.value!=='__new__';}
  select.onchange=()=>{input.hidden=select.value!=='__new__';result.textContent='';if(!input.hidden)input.focus();};
  button.onclick=()=>{const name=select.value==='__new__'?input.value.trim():select.value;if(!name){result.textContent=t('Wpisz nazwę skrzynki.','Enter a crate name.');input.focus();return;}const response=api.addToCrate(track.id,name);result.textContent=response.ok?(response.already?t('Ten utwór jest już w tej skrzynce.','This track is already in this crate.'):t('Dodano do skrzynki: ','Added to crate: ')+name):response.reason==='full'?t('Skrzynka jest pełna (30/30). Wybierz inną.','Crate is full (30/30). Choose another.'):t('Nie udało się zapisać utworu. Spróbuj ponownie.','Could not save the track. Try again.');if(response.ok){refresh();select.value=name;input.hidden=true;}};
  refresh();label.append(select);box.append(label,input,button,result);panel.prepend(box);
 }
 function bind(){
  const panel=document.getElementById('trackTools'),track={...current};
  crateControls(panel,track);
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
 document.addEventListener('cratehub:language',()=>{const panel=document.getElementById('trackTools');panel.querySelector('.roulette-crate-save')?.remove();crateControls(panel,current);});
 bind();
})();
