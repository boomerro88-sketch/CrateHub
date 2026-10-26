/* SOUL CRATE: on-demand original-audio estimates, powered by Essentia.js. */
(() => {
  'use strict';
  const CACHE = 'soulcrate-essentia-0.1.3-v1:';
  const scriptURL = document.currentScript && document.currentScript.src;
  const workerURL = new URL('analysis-worker.js', scriptURL || location.href).href;
  let busy = false;
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat('pl-PL', {maximumFractionDigits: 1}).format(value) : 'brak danych';
  function render(node, data) {
    const text = document.createElement('p');
    text.className = 'analysis-estimate';
    const key = data.key && data.scale ? `${data.key} ${data.scale === 'major' ? 'dur' : data.scale === 'minor' ? 'moll' : data.scale}` : 'brak danych';
    text.textContent = `Analiza audio oryginału: ${number(data.bpm)} BPM · Tonacja: ${key}.`;
    const detail = document.createElement('small');
    detail.textContent = `Szacunek automatyczny Essentia.js, niezweryfikowany. Analizowano ${number(data.duration)} s nagrania. Tempo może być wykryte dwukrotnie szybciej lub wolniej. Siła dopasowania tonacji: ${number(data.keyStrength)}.`;
    node.replaceChildren(text, detail);
    node.dataset.state = 'done';
  }
  function readCache(id) {
    try { const x = JSON.parse(localStorage.getItem(CACHE + id)); return x && x.engine === 'essentia.js-0.1.3' && x.duration > 0 ? x : null; } catch (_) { return null; }
  }
  function analyzeAudio(samples, duration, status) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerURL);
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Analiza trwała zbyt długo. Spróbuj ponownie.')); }, 300000);
      const finish = () => { clearTimeout(timer); worker.terminate(); };
      worker.onmessage = event => {
        if (event.data.type === 'status') { status(event.data.message); return; }
        finish();
        if (event.data.type === 'result') resolve({...event.data.result, duration, engine: 'essentia.js-0.1.3', analyzedAt: new Date().toISOString()});
        else reject(new Error(event.data.message || 'Analiza audio nie powiodła się.'));
      };
      worker.onerror = () => { finish(); reject(new Error('Nie udało się uruchomić silnika analizy. Otwórz katalog przez lokalny serwer.')); };
      worker.postMessage({samples}, [samples.buffer]);
    });
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('.analyze-button');
    if (!button) return;
    const card = button.closest('article');
    const output = card && card.querySelector('.analysis-result');
    if (!output) return;
    output.setAttribute('role', 'status'); output.setAttribute('aria-live', 'polite');
    const id = button.dataset.id;
    const status = message => { output.textContent = message; output.dataset.state = 'busy'; };
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) { status('Brak prawidłowego identyfikatora oryginalnego nagrania.'); output.dataset.state = 'error'; return; }
    const cached = readCache(id);
    if (cached) { render(output, cached); return; }
    if (busy) { status('Trwa analiza innego utworu. Poczekaj na jej zakończenie.'); output.dataset.state = 'error'; return; }
    if (location.protocol === 'file:') { status('Aby analizować audio, otwórz katalog przez dołączony lokalny serwer.'); output.dataset.state = 'error'; return; }
    busy = true; button.disabled = true;
    let context;
    try {
      status('Przygotowywanie audio oryginalnego nagrania… Pierwsze pobranie może potrwać kilka minut.');
      const response = await fetch('/download', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({id})});
      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 350);
        throw new Error(`Nie udało się pobrać oryginału (${response.status}). ${errorText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
      }
      const bytes = await response.arrayBuffer();
      status('Odczytywanie audio i przygotowywanie analizy…');
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('Ta przeglądarka nie obsługuje odczytu audio.');
      context = new Context({sampleRate: 44100});
      let audio = await context.decodeAudioData(bytes);
      if (audio.duration > 1200) throw new Error('Nagranie jest dłuższe niż 20 minut. Wybierz właściwy oryginalny utwór.');
      const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!Offline) throw new Error('Ta przeglądarka nie obsługuje przygotowania sygnału do analizy.');
      const offline = new Offline(1, Math.ceil(audio.duration * 44100), 44100);
      const source = offline.createBufferSource(); source.buffer = audio; source.connect(offline.destination); source.start();
      const mono = await offline.startRendering();
      const duration = mono.duration;
      const samples = new Float32Array(mono.getChannelData(0));
      audio = null;
      await context.close(); context = null;
      const result = await analyzeAudio(samples, duration, status);
      try { localStorage.setItem(CACHE + id, JSON.stringify(result)); } catch (_) { /* Cache is optional. */ }
      render(output, result);
      document.dispatchEvent(new CustomEvent("soulcrate:analysis", {detail:{id, result}}));
    } catch (error) {
      status(error.message || 'Nie udało się przeanalizować nagrania.'); output.dataset.state = 'error';
    } finally {
      if (context) await context.close().catch(() => {});
      busy = false; button.disabled = false;
    }
  });
  function hydrate(scope=document) {
  scope.querySelectorAll('.analyze-button').forEach(button => {
    const node = button.closest('article')?.querySelector('.analysis-result');
    const cached = readCache(button.dataset.id);
    if (node && cached) render(node, cached);
  });
  }
  window.SoulCrateAnalysis={hydrate};
  document.addEventListener('soulcrate:rendered',event=>hydrate(event.target));
  hydrate();
})();
