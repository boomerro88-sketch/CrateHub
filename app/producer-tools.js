'use strict';
(()=>{
 // Inline asset variants also work with the already running server's fixed static allowlist.
 const crateRecords=n=>'/vinyl-player/assets/record-layers/records-'+String(Math.max(0,Math.min(CAPACITY,n))).padStart(2,'0')+'.png';

 const CAPACITY=30;
 const KEY='crate-user-v1',valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id),el=(t,text)=>{const n=document.createElement(t);if(text!==undefined)n.textContent=text;return n;};
 function normalizeTags(values){const found=new Map();for(const value of Array.isArray(values)?values:[]){if(typeof value!=='string')continue;const tag=value.trim().replace(/\s+/g,' ').slice(0,40);if(tag&&!found.has(tag.toLocaleLowerCase('pl')))found.set(tag.toLocaleLowerCase('pl'),tag);if(found.size>=100)break;}return [...found.values()];}
 function clean(x){const out={fav:[],heard:[],skip:[],crates:Object.create(null),tags:Object.create(null)};for(const k of ['fav','heard','skip'])out[k]=[...new Set((Array.isArray(x?.[k])?x[k]:[]).filter(valid))];out.heard=[...new Set([...out.heard,...out.skip])];if(x?.crates&&typeof x.crates==='object')for(const [name,ids] of Object.entries(x.crates)){const n=name.trim().slice(0,60);if(n&&Array.isArray(ids))out.crates[n]=[...new Set(ids.filter(valid))];}if(x?.tags&&typeof x.tags==='object')for(const [id,values]of Object.entries(x.tags)){if(valid(id)){const tags=normalizeTags(values);if(tags.length)out.tags[id]=tags;}}for(const [name,ids]of Object.entries(out.crates)){if(ids.length<=CAPACITY)continue;out.crates[name]=ids.slice(0,CAPACITY);for(let offset=CAPACITY,part=2;offset<ids.length;offset+=CAPACITY){let extra;do{extra=name.slice(0,48)+' · '+part++;}while(Object.hasOwn(out.crates,extra));out.crates[extra]=ids.slice(offset,offset+CAPACITY);}}return out;}
 let state;try{state=clean(JSON.parse(localStorage.getItem(KEY)));}catch(_){state=clean({});}
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
 let activeCrate='',pictureSelector;
 let view='all',tagFilter='',tagSelect,crateList,crateCount,panel,selector,notice,duplicateCounts=new Map(),rowsRef;
 const canonical=r=>(r.artist+' '+r.title).normalize('NFKD').toLowerCase().replace(/ł/g,'l').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
 function rows(){return window.CrateRows||[];}
 function matches(r,v=view){if(tagFilter&&!(state.tags[r.id]||[]).some(t=>t.toLocaleLowerCase('pl')===tagFilter))return false;if(v==='fav')return state.fav.includes(r.id);if(v==='heard')return state.heard.includes(r.id);if(v==='skip')return state.skip.includes(r.id);if(v==='unheard')return !state.heard.includes(r.id)&&!state.skip.includes(r.id);if(v==='safe')return !state.skip.includes(r.id);if(v==='duplicates')return (duplicateCounts.get(canonical(r))||0)>1;if(v.startsWith('crate:'))return (state.crates[v.slice(6)]||[]).includes(r.id);return true;}
 window.CrateProducer={matches,
  listCrates:()=>Object.entries(state.crates).map(([name,ids])=>({name,count:ids.length,ids:[...ids]})),
  addToCrate:(id,name)=>{
   name=typeof name==='string'?name.trim().slice(0,60):'';
   if(!valid(id)||!rows().some(r=>r.id===id)||!name)return {ok:false,reason:'invalid'};
   const ids=state.crates[name]||[];
   if(ids.includes(id))return {ok:true,already:true};
   if(ids.length>=CAPACITY)return {ok:false,reason:'full'};
   const next=clean(state);next.crates[name]=[...ids,id];
   try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_){return {ok:false,reason:'storage'};}
   state=next;activeCrate=name;document.dispatchEvent(new CustomEvent('crate:state'));return {ok:true};
  }
 };
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){if(notice)notice.textContent='Przeglądarka nie zapisała danych. Wyeksportuj kopię.';}document.dispatchEvent(new CustomEvent('crate:state'));}
 function toggle(list,id){const i=list.indexOf(id);i<0?list.push(id):list.splice(i,1);}
 function refreshOptions(){const choices=[['all','Wszystkie utwory'],['safe','Bez odrzuconych'],['fav','Ulubione'],['unheard','Nieodsłuchane (bez odrzuconych)'],['heard','Odsłuchane'],['skip','Odrzucone'],['duplicates','Możliwe duplikaty'],...Object.keys(state.crates).map(n=>['crate:'+n,'Skrzynka: '+n])];selector.replaceChildren();for(const [v,t] of choices)selector.add(new Option(`${t} (${rows().filter(r=>matches(r,v)).length.toLocaleString('pl-PL')})`,v));if(!choices.some(([v])=>v===view))view='all';selector.value=view;const tags=new Map();for(const list of Object.values(state.tags))for(const tag of list)tags.set(tag.toLocaleLowerCase('pl'),tag);tagSelect.replaceChildren(new Option('Wszystkie moje tagi',''));[...tags].sort((a,b)=>a[1].localeCompare(b[1],'pl')).forEach(([key,name])=>tagSelect.add(new Option(name,key)));if(tagFilter&&!tags.has(tagFilter))tagSelect.add(new Option(tagFilter+' (0)',tagFilter));tagSelect.value=tagFilter;}
 function decorate(){
  if(!rows().length)return;
  if(rowsRef!==rows()){rowsRef=rows();duplicateCounts=new Map();rows().forEach(r=>{const k=canonical(r);duplicateCounts.set(k,(duplicateCounts.get(k)||0)+1);});}
  if(!panel)mount();refreshOptions();renderCrateList();
  document.querySelectorAll('.catalog-card').forEach(card=>{
   if(card.querySelector('.producer-actions'))return;
   const id=card.dataset.videoId,r=rows().find(x=>x.id===id);if(!r)return;const bar=el('div');bar.className='producer-actions';
   for(const [k,label] of [['fav','♥ Ulubione'],['heard','✓ Odsłuchane'],['skip','✕ Odrzucone']]){const b=el('button',label);b.type='button';b.setAttribute('aria-pressed',String(state[k].includes(id)));b.onclick=e=>{e.stopPropagation();toggle(state[k],id);if(k==='skip'&&state.skip.includes(id)&&!state.heard.includes(id))state.heard.push(id);save();};bar.append(b);}
   const crates=el('select');crates.setAttribute('aria-label','Do skrzynki…');crates.add(new Option('Do skrzynki…',''));Object.entries(state.crates).forEach(([n,ids])=>crates.add(new Option((ids.includes(id)?'✓ ':'')+n+' ('+ids.length+'/30)',n)));crates.onchange=()=>{if(!crates.value)return;const name=crates.value,ids=state.crates[name];if(!ids.includes(id)&&ids.length>=CAPACITY){notice.textContent='Skrzynka jest pełna (30/30). Wybierz inną skrzynkę lub usuń jedną płytę.';crates.value='';return;}toggle(ids,id);activeCrate=name;save();};bar.append(crates);card.insertBefore(bar,card.querySelector('.catalog-player'));
   const editor=el('form');editor.className='producer-tags';editor.setAttribute('aria-label','Twoje tagi: '+r.artist+' — '+r.title);
   const caption=el('span','Twoje tagi');caption.className='producer-tags-caption';const chips=el('div');chips.className='producer-tag-list';
   for(const tag of state.tags[id]||[]){const chip=el('button',tag+' ×');chip.type='button';chip.className='producer-tag';chip.setAttribute('aria-label','Usuń tag '+tag);chip.onclick=()=>{state.tags[id]=state.tags[id].filter(t=>t!==tag);if(!state.tags[id].length)delete state.tags[id];save();};chips.append(chip);}
   const input=el('input');input.type='text';input.maxLength=400;input.placeholder='np. ciepłe piano, mocny break';input.setAttribute('aria-label','Dodaj własne tagi');
   const addTag=el('button','Dodaj tagi');addTag.type='submit';editor.onsubmit=event=>{event.preventDefault();const incoming=normalizeTags(input.value.split(/[,;]+/));if(!incoming.length)return;state.tags[id]=normalizeTags([...(state.tags[id]||[]),...incoming]);save();};
   editor.append(caption,chips,input,addTag);bar.after(editor);

   const n=duplicateCounts.get(canonical(r));if(n>1){const label=el('p',`Możliwy duplikat (${n}× ten sam wykonawca i tytuł)`);label.className='duplicate-note';bar.after(label);}
  });
 }
 function renderCrateList(){
  if(!crateList)return;
  // A selected crate shows its own contents. The overview combines all user crates.
  const names=Object.keys(state.crates);if(view.startsWith('crate:'))activeCrate=view.slice(6);if(!names.includes(activeCrate))activeCrate=names[0]||'';
  if(pictureSelector){pictureSelector.replaceChildren();names.forEach(name=>pictureSelector.add(new Option(name+' ('+state.crates[name].length+'/30)',name)));if(!names.length)pictureSelector.add(new Option('Brak skrzynek',''));pictureSelector.value=activeCrate;}
  const selected=activeCrate;
  const ids=new Set(state.crates[selected]||[]);
  const items=rows().filter(r=>ids.has(r.id)).sort((a,b)=>a.artist.localeCompare(b.artist,'pl')||a.title.localeCompare(b.title,'pl'));
  const count=Math.min(CAPACITY,ids.size);const picture=panel.querySelector('.personal-crate-records');if(picture.dataset.count!==String(count)){picture.src=crateRecords(count);picture.dataset.count=String(count);}
  crateCount.textContent=(selected||'Skrzynka na winyle')+' · '+ids.size+'/30';
  crateList.replaceChildren();
  if(!items.length){crateList.append(el('p','Skrzynka jest pusta. Utwórz skrzynkę, a następnie dodaj utwory przez „Do skrzynki…” na kartach.'));return;}
  const list=el('ol');
  items.forEach(r=>{const item=el('li');const button=el('button');button.type='button';button.className='personal-crate-track';button.append(el('strong',r.artist),el('span',r.title));const tags=state.tags[r.id]||[];if(tags.length)button.append(el('small',tags.join(' · ')));button.setAttribute('aria-label','Pokaż utwór '+r.artist+' — '+r.title);button.onclick=()=>{tagFilter='';view='all';document.querySelector('.catalog-clear')?.click();const search=document.querySelector('[name="search"]');search.value=r.artist+' '+r.title;document.dispatchEvent(new CustomEvent('crate:state'));document.querySelector('.catalog-grid,.catalog-compact-list')?.scrollIntoView({behavior:'smooth',block:'start'});};item.append(button);list.append(item);});crateList.append(list);
 }
 function mount(){
  panel=el('section');panel.className='producer-panel';panel.setAttribute('aria-label','Skrzynka na winyle');panel.append(el('h2','Skrzynka na winyle'));
  const show=el('label','Pokaż ');selector=el('select');selector.setAttribute('aria-label','Pokaż');selector.onchange=()=>{view=selector.value;document.dispatchEvent(new CustomEvent('crate:state'));};show.append(selector);panel.append(show);const tagLabel=el('label','Mój tag ');tagSelect=el('select');tagSelect.setAttribute('aria-label','Mój tag');tagSelect.onchange=()=>{tagFilter=tagSelect.value;document.dispatchEvent(new CustomEvent('crate:state'));};tagLabel.append(tagSelect);panel.append(tagLabel);
  const name=el('input');name.maxLength=60;name.placeholder='np. boom bap 90 BPM';name.setAttribute('aria-label','Nowa skrzynka');panel.append(name);
  const add=el('button','Utwórz skrzynkę');add.type='button';const createStatus=el('p');createStatus.className='crate-create-status';createStatus.setAttribute('role','status');createStatus.setAttribute('aria-live','polite');
  name.placeholder='Nazwa skrzynki (opcjonalnie)';
  add.onclick=()=>{let n=name.value.trim();if(!n){let index=1;do{n='Nowa skrzynka '+index++;}while(Object.hasOwn(state.crates,n));}const exists=Object.hasOwn(state.crates,n);if(!exists)state.crates[n]=[];activeCrate=n;view='all';tagFilter='';name.value='';save();createStatus.textContent=exists?'Skrzynka „'+n+'” już istnieje.':'Utworzono skrzynkę „'+n+'”. Dodaj do niej utwory przez „Do skrzynki…” na kartach.';};
  name.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();add.click();}};panel.append(add,createStatus);
  let armed='',until=0;const remove=el('button','Usuń wybraną skrzynkę');remove.type='button';remove.onclick=()=>{if(!view.startsWith('crate:')){notice.textContent='Najpierw wybierz skrzynkę z listy Pokaż.';return;}if(armed===view&&Date.now()<until){delete state.crates[view.slice(6)];view='all';armed='';remove.textContent='Usuń wybraną skrzynkę';save();return;}armed=view;until=Date.now()+4000;remove.textContent='Kliknij ponownie, aby usunąć';setTimeout(()=>{armed='';remove.textContent='Usuń wybraną skrzynkę';},4000);};panel.append(remove);
  const exp=el('button','Rozpakuj skrzynkę');exp.title='Eksportuj swoje dane do pliku JSON';exp.type='button';exp.onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=el('a');a.href=u;a.download='crate-moje-dane.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);};panel.append(exp);
  const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;const imp=el('button','Zapakuj skrzynkę');imp.title='Importuj i scal swoje dane z pliku JSON';imp.type='button';imp.onclick=()=>file.click();file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>5e6)throw Error('Plik jest za duży.');const x=clean(JSON.parse(await f.text()));for(const k of ['fav','heard','skip'])state[k]=[...new Set([...state[k],...x[k]])];for(const [n,ids]of Object.entries(x.crates))state.crates[n]=[...new Set([...(state.crates[n]||[]),...ids])];for(const [id,tags]of Object.entries(x.tags))state.tags[id]=normalizeTags([...(state.tags[id]||[]),...tags]);state=clean(state);save();notice.textContent='Dane scalono z obecnymi.';}catch(e){notice.textContent='Nie udało się odczytać danych: '+e.message;}file.value='';};panel.append(imp,file);
  const display=el('div');display.className='personal-crate-display';
  const picture=el('div');picture.className='personal-crate-picture';const image=el('img');image.src='/vinyl-player/assets/record-crate-empty.png';image.alt='Skrzynka na winyle';image.loading='lazy';const records=el('img');records.className='personal-crate-records';records.src=crateRecords(0);records.dataset.count='0';records.alt='';records.setAttribute('aria-hidden','true');records.loading='lazy';picture.append(image,records);
  const contents=el('div');contents.className='personal-crate-contents';pictureSelector=el('select');pictureSelector.setAttribute('aria-label','Podgląd skrzynki');pictureSelector.onchange=()=>{activeCrate=pictureSelector.value;renderCrateList();};contents.append(pictureSelector);crateCount=el('h3');crateList=el('div');crateList.className='personal-crate-list';crateList.tabIndex=0;crateList.setAttribute('aria-label','Utwory w skrzynce na winyle');contents.append(crateCount,crateList);display.append(picture,contents);panel.append(display);
  notice=el('p');notice.setAttribute('role','status');panel.append(notice);document.querySelector('.catalog-filters').after(panel);
  const imports=el('section');imports.className='producer-panel youtube-import';imports.append(el('h2','Dodaj utwory z YouTube'));const input=el('textarea');input.setAttribute('aria-label','Linki YouTube');input.placeholder='Linki do filmów lub playlist, po jednym w linii';input.rows=3;const submit=el('button','Dodaj utwory');submit.type='button';const result=el('p');result.setAttribute('role','status');try{result.textContent=sessionStorage.getItem('crate-last-import')||'';}catch(_){}imports.append(input,submit,result);panel.after(imports);
  submit.onclick=async()=>{submit.disabled=true;try{const r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({urls:input.value})}),start=await r.json();if(!r.ok)throw Error(start.error||'Błąd importu.');result.textContent='Import trwa. Odczytujemy metadane bez pobierania audio…';let job;do{await new Promise(resolve=>setTimeout(resolve,3000));const response=await fetch('/add-status?job='+start.job);if(!response.ok)throw Error('Nie można sprawdzić stanu importu.');job=await response.json();}while(job.state==='running');if(job.state!=='done')throw Error(job.error||'Błąd importu.');const x=job.report;result.textContent=`Dodano: ${x.added}; już było: ${x.existing}; duplikaty: ${x.duplicates}; odrzucono: ${x.rejected}; błędy źródeł: ${x.errors.length}.`;try{sessionStorage.setItem('crate-last-import',result.textContent);}catch(_){}if(x.added){const b=el('button','Odśwież listę');b.onclick=()=>location.reload();result.append(' ',b);location.reload();}}catch(e){result.textContent=e.message;}finally{submit.disabled=false;}};
 }
 document.addEventListener('soulcrate:rendered',decorate);
 window.addEventListener('storage',e=>{if(e.key===KEY){try{state=clean(JSON.parse(e.newValue));}catch(_){return;}document.dispatchEvent(new CustomEvent('crate:state'));}});
})();
