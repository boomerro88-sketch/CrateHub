window.CrateRegionTaxonomy=["Arabskie / Bliski Wschód","Afryka", "Afryka Południowa", "Afryka Północna", "Afryka Subsaharyjska", "Afryka Wielkich Jezior", "Afryka Wschodnia", "Afryka Zachodnia", "Afryka Środkowa", "Alpy", "Amazonia", "Ameryka Południowa", "Ameryka Północna", "Ameryka Łacińska", "Ameryka Łacińska i Karaiby", "Ameryka Środkowa", "Anatolia", "Andaluzja", "Archipelag Malajski", "Australia", "Australia i Nowa Zelandia", "Azja", "Azja Południowa", "Azja Południowo-Wschodnia", "Azja Wschodnia", "Azja Zachodnia", "Azja Środkowa", "Bałkany", "Bengal", "Bliski Wschód", "Brazylia", "Bretania", "Chiny i obszar sinicki", "Dorzecze Konga", "Europa", "Europa Południowa", "Europa Północna", "Europa Wschodnia", "Europa Zachodnia", "Europa Środkowa", "Hawaje", "Indochiny", "Iran / Persja", "Japonia", "Karaiby", "Karaiby anglojęzyczne", "Karaiby francuskojęzyczne", "Karaiby hiszpańskojęzyczne", "Karaiby niderlandzkojęzyczne", "Kaszmir", "Katalonia", "Kaukaz", "Kraje Zatoki Perskiej", "Kraje andyjskie", "Kraje bałtyckie", "Kraje nordyckie", "Lewant", "Madagaskar i wyspy Oceanu Indyjskiego", "Maghreb", "Melanezja", "Mikronezja", "Nieustalone", "Nordeste (Brazylia)", "Nowa Zelandia", "Oceania", "Pendżab", "Polinezja", "Południowe Indie", "Półwysep Arabski", "Półwysep Iberyjski", "Półwysep Koreański", "Radżastan", "Region Rio de Janeiro", "Region São Paulo", "Róg Afryki", "Sahel", "Skandynawia", "Stożek Południowy", "Subkontynent indyjski", "Tybet", "USA — Południe", "USA — Północny Wschód", "USA — Zachodnie Wybrzeże", "USA — Środkowy Zachód", "Wybrzeże Suahili", "Wyspy Brytyjskie"];
/* SOUL CRATE catalogue. Data and origin labels are provided by the source dataset. */
(() => {
  'use strict';
  const CACHE = 'soulcrate-essentia-0.1.3-v1:';
  const PAGE_SIZE = 20;
  const collator = new Intl.Collator('pl',{sensitivity:'base',numeric:true});
  let alphabetical=[];
  const notes = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const enharmonic = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','Cb':'B','Fb':'E','E#':'F','B#':'C','H':'B'};
  function normalizeKey(value) {
    if (!value) return null;
    const variants=String(value).split(/\s+\/\s+/);if(variants.length>1){const keys=variants.map(normalizeKey);return keys.every(k=>k&&k===keys[0])?keys[0]:null;}
    const text = String(value).trim().replace(/♯/g,'#').replace(/♭/g,'b').replace(/[-–]/g,' ');
    const m = /^([A-GH])([#b]?)[ ]*(major|minor|dur|moll|maj|min|m)?$/i.exec(text);
    if (!m || !m[3]) return null;
    const name = m[1].toUpperCase() + m[2];
    const note = enharmonic[name] || name;
    return notes.includes(note) ? note + (/^(minor|moll|min|m)$/i.test(m[3]) ? ' minor' : ' major') : null;
  }
  const keyLabels = key => key.replace(' major',' dur').replace(' minor',' moll');
  const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/Ł/g,'L').toLowerCase();
  function cached(id) { try {const x=JSON.parse(localStorage.getItem(CACHE+id));return x && x.engine==='essentia.js-0.1.3' ? x : null;}catch(_){return null;} }
  const keyFor = row => {const x=cached(row.id); return normalizeKey(row.key) || (x && normalizeKey(`${x.key} ${x.scale}`)) || null;};
  const format = n => new Intl.NumberFormat('pl-PL').format(n);
  const element = (tag, cls, text) => {const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const link = (text, href, cls) => {const a=element('a',cls,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function safeURL(value) {try {const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'#';}catch(_){return '#';}}
  const analysisSignatures=new Map();
  let rows=[],filtered=[],page=1,mode='cards',root,grid,summary,pagination,form,loadError,selectedId=null,syncKeyPads=()=>{};
  const fields={};
  let appMode='explorer',explorerPanel,roulettePanel,vinylFrame,cratePlayerPanel,cratePlayerFrame;
  const vinylOrigin=location.origin;
  function switchMode(value){
    appMode=value;explorerPanel.hidden=value!=='explorer';roulettePanel.hidden=value!=='roulette';cratePlayerPanel.hidden=value!=='crate-player';
    root.querySelectorAll('[data-app-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appMode===value)));
    for(const [name,frame]of [['roulette',vinylFrame],['crate-player',cratePlayerFrame]]){
      if(value===name){if(!frame.src)frame.src=vinylOrigin+'/vinyl-player/index.html?embedded=1&v=crate-markers-v1'+(name==='crate-player'?'&source=crate':'');else if(name==='crate-player')frame.contentWindow.postMessage({type:'vinyl:crate-refresh'},vinylOrigin);}
      else if(frame.contentWindow)frame.contentWindow.postMessage({type:'vinyl:pause'},vinylOrigin);
    }
    if(value!=='explorer')explorerPanel.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),new URL(frame.src).origin);}catch(_){}});
  }

  function field(label, name, tag='input') {const wrapper=element('label','catalog-field');wrapper.append(element('span','',label));const input=element(tag);input.name=name;input.setAttribute('aria-label',label);fields[name]=input;wrapper.append(input);return wrapper;}
  function options(select, values, first) {const old=select.value;select.replaceChildren(new Option(first,''));values.forEach(value=>select.add(new Option(value,value)));if([...select.options].some(x=>x.value===old))select.value=old;}
  function reset(){form.reset();fields.unknownYear.checked=true;page=1;apply();}
  function matches(row){
    const f=fields;
    if(f.search.value&&!fold(row.artist+' '+row.title).includes(fold(f.search.value.trim())))return false;
    if(f.artist.value&&!fold(row.artist).includes(fold(f.artist.value.trim())))return false;
    if(f.sampleType.value&&(f.sampleType.value==='unknown'?(row.sample_types||[]).length:!(row.sample_types||[]).includes(f.sampleType.value)))return false;
    if(f.genre.value&&!(row.genres||[]).includes(f.genre.value))return false;
    if(f.country.value&&!(Array.isArray(row.country)?row.country:[row.country||'Nieustalone']).includes(f.country.value))return false;
    if(f.region.value&&!(row.regions||[row.region]).includes(f.region.value)&&row.region!==f.region.value&&row.subregion!==f.region.value)return false;
    
    if(f.key.value){const k=keyFor(row);if(f.key.value==='unknown'?k!==null:k!==f.key.value)return false;}
    const y=Number(row.year);if(!row.year||!Number.isFinite(y)){if(!f.unknownYear.checked)return false;}else{
      if(f.yearFrom.value&&y<Number(f.yearFrom.value))return false;
      if(f.yearTo.value&&y>Number(f.yearTo.value))return false;
    }
    return true;
  }
  function apply(){syncKeyPads();const sort=fields.order?.value||'az';const base=sort==='new'?[...rows].reverse():sort==='old'?rows:sort==='za'?[...alphabetical].reverse():alphabetical;filtered=base.filter(r=>matches(r)&&(!window.CrateProducer||CrateProducer.matches(r)));page=Math.min(page,Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)));render();}
  function badge(text, cls=''){return element('span','catalog-badge '+cls,text);}
  const dataSpan=value=>{const s=element('span',value?'':'nodata',value?String(value):'brak danych');return s;};
  function selectCard(id,card){selectedId=id;document.querySelectorAll('.catalog-card.is-selected').forEach(c=>{c.classList.remove('is-selected');c.removeAttribute('aria-current');});card.classList.add('is-selected');card.setAttribute('aria-current','true');}
  function createCard(row){
    const card=element('article','item catalog-card');card.dataset.videoId=row.id;if(selectedId===row.id){card.classList.add('is-selected');card.setAttribute('aria-current','true');}
    card.addEventListener('click',()=>selectCard(row.id,card));card.addEventListener('focusin',()=>selectCard(row.id,card));
    const top=element('div','catalog-card-top');top.append(element('span','meta','#'+String(row.number).padStart(5,'0')),badge(row.year||'Brak roku'));card.append(top);
    card.append(element('div','artist',row.artist),element('h2','',row.title));
    const tags=element('div','catalog-tags');(row.genres||[]).forEach(g=>tags.append(badge(g)));tags.append(badge(row.region||'Nieustalone'));if(row.genre_scope==='artist')tags.append(badge('Gatunki wykonawcy'));if(row.subregion)tags.append(badge(row.subregion));if((row.sample_types||[]).includes('drum_break'))tags.append(badge('Drum break · kurator'));if((row.sample_types||[]).includes('sample_idea'))tags.append(badge('Pomysł na sample · kurator'));card.append(tags);
    const frame=element('div','catalog-player');const iframe=element('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(row.id)}?rel=0`;iframe.title=`${row.artist} — ${row.title} · oryginalne nagranie`;iframe.loading='lazy';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';frame.append(iframe);card.append(frame);
    const meta=element('div','catalog-audio-meta');
    const srcRow=element('div','lcd-row');srcRow.append(element('span','lcd-label','Dane źródłowe · oryginalne nagranie'));
    const value=element('span','lcd-value');value.append('BPM: ',dataSpan(row.bpm),' · Tonacja: ',dataSpan(row.key));srcRow.append(value);
    if(row.metadata_source)srcRow.append(link('Źródło danych ↗',safeURL(row.metadata_source),'catalog-source'));if(row.playlist_url)srcRow.append(link('Playlista źródłowa ↗',safeURL(row.playlist_url),'catalog-source'));if(row.classification_source&&row.classification_source!==row.metadata_source)srcRow.append(link('Pochodzenie / gatunki ↗',safeURL(row.classification_source),'catalog-source'));
    if(row.country||row.genre_scope==='artist'){const info=element('small','catalog-provenance');info.textContent=[row.country?'Powiązania kraju wykonawcy: '+(Array.isArray(row.country)?row.country.join(', '):row.country):'',row.genre_scope==='artist'?'Gatunki według wykonawcy':''].filter(Boolean).join(' · ');srcRow.append(info);}
    if(row.sample_type_sources){srcRow.append(element('small','catalog-provenance',row.sample_type_status));row.sample_type_sources.forEach(source=>srcRow.append(link('Drum break: '+source.title+' ↗',safeURL(source.url),'catalog-source')));}
    if(row.region_scope&&row.region_scope.startsWith('Ręczna'))srcRow.append(element('small','catalog-provenance',row.region_scope));
    if(row.identity_status)srcRow.append(element('small','catalog-provenance',row.identity_status));
    meta.append(srcRow);
    const anRow=element('div','lcd-row');anRow.append(element('span','lcd-label','Analiza audio oryginału · Essentia.js · szacunek automatyczny'));
    const result=element('div','analysis-result');result.setAttribute('aria-live','polite');const saved=cached(row.id);try{analysisSignatures.set(row.id,localStorage.getItem(CACHE+row.id));}catch(_){}if(saved){const k=normalizeKey(`${saved.key} ${saved.scale}`);result.textContent=`Analiza audio oryginału: ${Number.isFinite(saved.bpm)?saved.bpm.toFixed(1):'brak danych'} BPM · Tonacja: ${k||'brak danych'}. Szacunek automatyczny Essentia.js, niezweryfikowany.`;result.dataset.state='done';}anRow.append(result);meta.append(anRow);card.append(meta);
    const actions=element('div','links catalog-actions');actions.append(link('▶ Otwórz YouTube ↗',`https://www.youtube.com/watch?v=${encodeURIComponent(row.id)}`));
    const download=element('form','catalog-download');download.method='POST';download.action='/download';download.target='_blank';const input=element('input');input.type='hidden';input.name='id';input.value=row.id;const submit=element('button','','↓ Pobierz MP3');submit.type='submit';download.append(input,submit);actions.append(download);
    const analyze=element('button','analyze-button','Analizuj BPM i tonację');analyze.type='button';analyze.dataset.id=row.id;actions.append(analyze);card.append(actions);
    const uses=element('details','catalog-uses');const heading=element('summary','',`Gdzie użyto sampla (${format(row.uses_count||0)})`);uses.append(heading);const content=element('div','catalog-uses-body');content.append(link('WhoSampled · sprawdź bieżące użycia ↗',safeURL(row.whosampled_url)));const list=element('div','catalog-uses-list');content.append(list);uses.append(content);let loaded=false;
    uses.addEventListener('toggle',async()=>{if(!uses.open||loaded)return;loaded=true;list.textContent='Wczytywanie pełnej listy z archiwum…';try{const response=await fetch('/uses?id='+encodeURIComponent(row.id));if(!response.ok)throw new Error();const html=await response.text();const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,iframe,object,embed,style,link').forEach(x=>x.remove());doc.querySelectorAll('*').forEach(x=>{[...x.attributes].forEach(a=>{if(a.name.startsWith('on'))x.removeAttribute(a.name);});if(x.tagName==='A'){x.href=safeURL(x.getAttribute('href'));x.target='_blank';x.rel='noopener noreferrer';}});list.replaceChildren(...doc.body.childNodes);}catch(_){list.textContent='Nie udało się wczytać listy. Skorzystaj z linku WhoSampled.';loaded=false;}});
    card.append(uses);return card;
  }
  function compactRow(row){const details=element('details','catalog-compact');const summary=element('summary');summary.append(element('span','catalog-row-number','#'+String(row.number).padStart(5,'0')),element('span','catalog-row-artist',row.artist),element('span','catalog-row-title',row.title),element('span','catalog-row-year',row.year||'Brak roku'));details.append(summary);details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('article')){details.append(createCard(row));root.dispatchEvent(new CustomEvent('soulcrate:rendered',{bubbles:true}));}});return details;}
  function render(){
    const total=filtered.length,pages=Math.max(1,Math.ceil(total/PAGE_SIZE)),start=(page-1)*PAGE_SIZE,end=Math.min(start+PAGE_SIZE,total);
    const counter=root.querySelector('.catalog-total-number');counter.textContent=format(rows.length);
    summary.textContent=`${format(total)} z ${format(rows.length)} utworów · widoczne ${total?format(start+1):'0'}–${format(end)} · strona ${page} z ${pages}`;
    grid.className=mode==='all'?'catalog-compact-list':'grid catalog-grid';grid.replaceChildren();
    if(!total){grid.append(element('div','catalog-empty','Brak utworów spełniających wszystkie filtry. Zmień kryteria lub wyczyść filtry.'));}
    else if(mode==='all'){const fragment=document.createDocumentFragment();filtered.slice(start,end).forEach(row=>fragment.append(compactRow(row)));grid.append(fragment);}
    else filtered.slice(start,end).forEach(row=>grid.append(createCard(row)));
    pagination.replaceChildren();
    const make=(label,handler,disabled=false)=>{const b=element('button','catalog-button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',handler);pagination.append(b);return b;};
    const turn=next=>{page=Math.max(1,Math.min(pages,next));render();grid.scrollIntoView({block:'start',behavior:'smooth'});};
    make('← Poprzednia',()=>turn(page-1),page<=1);
    const pageLabel=element('label','catalog-page-label','Strona '), pageInput=element('input','catalog-page-input');pageInput.type='number';pageInput.min='1';pageInput.max=String(pages);pageInput.value=String(page);pageInput.setAttribute('aria-label','Numer strony');const goToPage=()=>{const next=Number(pageInput.value);if(Number.isInteger(next)&&next>=1&&next<=pages)turn(next);else pageInput.value=String(page);};pageInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();goToPage();}});pageLabel.append(pageInput,document.createTextNode(' / '+pages));pagination.append(pageLabel);make('Idź',goToPage);
    make('Następna →',()=>turn(page+1),page>=pages);
    make(mode==='cards'?'Widok listy':'Widok kart',()=>{mode=mode==='cards'?'all':'cards';render();},!total);
    root.dispatchEvent(new CustomEvent('soulcrate:rendered',{bubbles:true}));
  }
  function group(cls,title){const g=element('div','filter-group '+cls);g.setAttribute('role','group');g.setAttribute('aria-label',title);g.append(element('h3','panel-title',title));return g;}
  function mount(){
    root.replaceChildren();const overview=element('div','catalog-overview');const total=element('div','catalog-total');total.append(element('strong','catalog-total-number',format(rows.length)),element('span','','utworów w katalogu'));overview.append(total,element('p','catalog-explainer','Łącz filtry, aby znaleźć oryginalne nagrania. Brak danych pozostaje widoczny; kraj, region i tonacja pojawiają się tylko wtedy, gdy są dostępne w źródłach.'));root.append(overview);
    form=element('form','catalog-filters');form.setAttribute('aria-label','Filtry katalogu');form.addEventListener('submit',e=>e.preventDefault());
    const gSearch=group('g-search','Szukaj');
    const search=field('Szukaj utworu lub wykonawcy','search');fields.search.type='search';fields.search.placeholder='Tytuł lub wykonawca…';search.classList.add('catalog-search');gSearch.append(search);
    gSearch.append(field('Kolejność','order','select'));[['az','Alfabetycznie A–Z'],['za','Alfabetycznie Z–A'],['new','Ostatnio dodane'],['old','Najstarsze dodane']].forEach(([v,t])=>fields.order.add(new Option(t,v)));gSearch.append(field('Wykonawca','artist'));fields.artist.type='search';fields.artist.setAttribute('list','catalog-artists');fields.artist.placeholder='Wpisz nazwę…';const datalist=element('datalist');datalist.id='catalog-artists';[...new Set(rows.map(r=>r.artist))].sort((a,b)=>a.localeCompare(b,'pl')).forEach(x=>datalist.append(new Option(x)));gSearch.append(datalist);
    const gKey=group('g-key','Tonacja oryginału');
    const keyField=field('Tonacja oryginału','key','select');fields.key.add(new Option('Wszystkie tonacje',''));notes.forEach(note=>['major','minor'].forEach(scale=>fields.key.add(new Option(`${note==='B'?'B (H)':note} ${scale==='major'?'dur':'moll'}`,note+' '+scale))));fields.key.add(new Option('Brak danych o tonacji','unknown'));gKey.append(keyField);
    const gClass=group('g-class','Klasyfikacja');
    gClass.append(field('Gatunek','genre','select'));options(fields.genre,[...new Set(rows.flatMap(r=>r.genres||[]))].sort((a,b)=>a.localeCompare(b,'pl')),'Wszystkie gatunki');
    gClass.append(field('Region świata','region','select'));fields.region.add(new Option('Wszystkie regiony',''));const rc=new Map();rows.forEach(r=>(r.regions||[]).forEach(g=>rc.set(g,(rc.get(g)||0)+1)));window.CrateRegionTaxonomy.forEach(g=>fields.region.add(new Option(g+' ('+format(rc.get(g)||0)+')',g)));gClass.append(field('Kraj wykonawcy','country','select'));options(fields.country,[...new Set(rows.flatMap(r=>Array.isArray(r.country)&&r.country.length?r.country:[r.country||'Nieustalone']))].sort((a,b)=>a.localeCompare(b,'pl')),'Wszystkie kraje');
    const gYear=group('g-year','Rok nagrania');gYear.append(field('Rok od','yearFrom'),field('Rok do','yearTo'));['yearFrom','yearTo'].forEach(n=>{fields[n].type='number';fields[n].min='1800';fields[n].max='2100';fields[n].placeholder=n==='yearFrom'?'np. 1960':'np. 1980';});
    const unknown=element('label','catalog-checkbox');fields.unknownYear=element('input');fields.unknownYear.type='checkbox';fields.unknownYear.checked=true;unknown.append(fields.unknownYear,document.createTextNode('Uwzględnij brak roku'));gYear.append(unknown);
    const gType=group('g-type','Czego szukasz?');gType.append(field('Rodzaj materiału','sampleType','select'));fields.sampleType.add(new Option('Wszystkie nagrania',''));fields.sampleType.add(new Option('Drum breaks — wskazanie kuratora','drum_break'));fields.sampleType.add(new Option('Pomysły na sample — wskazanie kuratora','sample_idea'));fields.sampleType.add(new Option('Jeszcze niesklasyfikowane','unknown'));gType.append(element('small','catalog-provenance','Tagi wskazują selekcję autora playlisty. Fragmenty nie zostały jeszcze zweryfikowane odsłuchem. Brak tagu nie oznacza braku przydatnego sampla.'));form.append(gSearch,gClass,gType,gKey,gYear);
    const actions=element('div','filter-actions');const clear=element('button','catalog-button catalog-clear','Wyczyść filtry');clear.type='button';clear.addEventListener('click',reset);actions.append(clear);form.append(actions);
    let inputTimer;form.addEventListener('input',event=>{clearTimeout(inputTimer);if((event.target===fields.yearFrom||event.target===fields.yearTo)&&(fields.yearFrom.value||fields.yearTo.value))fields.unknownYear.checked=false;page=1;inputTimer=setTimeout(apply,event.target.tagName==='SELECT'||event.target.type==='checkbox'?0:180);});root.append(form);
    const note=element('p','catalog-filter-note','Tonacje: B = H; bemole i krzyżyki enharmoniczne są łączone. Gdy brak tonacji źródłowej, filtr korzysta z zapisanego pomiaru Essentia.js. Regiony z liczbą 0 nie mają jeszcze przypisanych utworów. Obszary kulturowe nakładają się; nie są automatycznym przypisaniem stylu muzycznego.');root.append(note);
    const transport=element('div','catalog-transport');summary=element('p','catalog-summary');summary.setAttribute('role','status');pagination=element('nav','catalog-pagination');pagination.setAttribute('aria-label','Strony katalogu');transport.append(summary,pagination);root.append(transport);grid=element('div');root.append(grid);apply();
    explorerPanel=element('div','explorer-panel');explorerPanel.id='explorer-panel';explorerPanel.append(...root.childNodes);root.append(explorerPanel);
    const modes=element('nav','catalog-modes');modes.setAttribute('aria-label','Tryb odkrywania muzyki');[['explorer','Explorer'],['roulette','Rhythm Roulette'],['crate-player','Twoje skrzynki']].forEach(([value,label])=>{const b=element('button','catalog-button',label);b.type='button';b.dataset.appMode=value;b.setAttribute('aria-controls',value==='explorer'?'explorer-panel':value==='roulette'?'roulette-panel':'crate-player-panel');b.addEventListener('click',()=>switchMode(value));modes.append(b);});root.prepend(modes);
    roulettePanel=element('section','roulette-panel roulette-vinyl');roulettePanel.id='roulette-panel';roulettePanel.setAttribute('aria-label','Rhythm Roulette — gramofon');
    vinylFrame=element('iframe','vinyl-mode-frame');vinylFrame.title='Rhythm Roulette — gramofon, analiza i pobieranie';vinylFrame.allow='autoplay';
    roulettePanel.append(vinylFrame);root.append(roulettePanel);cratePlayerPanel=element('section','roulette-panel roulette-vinyl');cratePlayerPanel.id='crate-player-panel';cratePlayerPanel.setAttribute('aria-label','Twoje skrzynki');cratePlayerFrame=element('iframe','vinyl-mode-frame');cratePlayerFrame.title='Gramofon — utwory z Twoich skrzynek';cratePlayerFrame.allow='autoplay';cratePlayerPanel.append(cratePlayerFrame);root.append(cratePlayerPanel);
    window.addEventListener('message',event=>{const frame=[vinylFrame,cratePlayerFrame].find(f=>f.contentWindow===event.source);if(!frame||event.origin!==vinylOrigin)return;if(event.data?.type==='vinyl:height'&&Number.isFinite(event.data.height))frame.style.height=Math.min(12000,Math.max(800,event.data.height))+'px';});
    switchMode(appMode);
    document.addEventListener('crate:state',()=>{page=1;apply();if(cratePlayerFrame.src)cratePlayerFrame.contentWindow.postMessage({type:'vinyl:crate-refresh'},vinylOrigin);});
    document.addEventListener('soulcrate:analysis',event=>{const id=event.detail&&event.detail.id;if(!id)return;let signature;try{signature=localStorage.getItem(CACHE+id);}catch(_){return;}if(analysisSignatures.get(id)===signature)return;analysisSignatures.set(id,signature);if(fields.key.value)apply();});
    window.addEventListener('storage',event=>{if(event.key&&event.key.startsWith(CACHE))apply();});
  }
  async function start(){root=document.getElementById('catalog-app');if(!root)return;root.textContent='Wczytywanie pełnego katalogu…';try{const response=await fetch('catalog-data.json');if(!response.ok)throw new Error();const data=await response.json();rows=Array.isArray(data)?data:(data.tracks||data.entries||[]);if(!rows.length)throw new Error();rows=rows.filter(row=>row&&row.artist&&row.title&&/^[A-Za-z0-9_-]{11}$/.test(row.id||''));if(!rows.length)throw new Error();rows.forEach((r,i)=>{r.added_order=i;r.number=i+1;});alphabetical=[...rows].sort((a,b)=>collator.compare(a.artist,b.artist)||collator.compare(a.title,b.title));window.CrateRows=rows;mount();const staticCatalog=document.getElementById('static-catalog');if(staticCatalog)staticCatalog.hidden=true;}catch(_){root.textContent='Filtry są chwilowo niedostępne. Pełny katalog poniżej pozostaje dostępny.';}}
  document.addEventListener('cratehub:language',()=>{document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage({type:'cratehub:language',language:window.CrateI18n.language},location.origin);}catch(_){}});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
