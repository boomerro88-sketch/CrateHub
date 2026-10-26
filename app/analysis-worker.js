/* Essentia.js runs off the UI thread. Input is mono Float32 PCM at 44100 Hz. */
'use strict';
// The packaged web build only reads currentScript/title from document.
// Supply these inert fields inside the worker; all computation stays here.
var document = {currentScript: {src: new URL('vendor/essentia-wasm.web.js', self.location.href).href}, title: ''};
self.onmessage = async event => {
  let vector;
  let rhythm;
  try {
    self.postMessage({type: 'status', message: 'Uruchamianie silnika Essentia.js…'});
    importScripts('vendor/essentia-wasm.web.js', 'vendor/essentia.js-core.js');
    const wasm = typeof EssentiaWASM === 'function' ? await EssentiaWASM({locateFile: name => new URL('vendor/' + name, self.location.href).href}) : await EssentiaWASM;
    const essentia = new Essentia(wasm);
    const samples = event.data.samples;
    if (!(samples instanceof Float32Array) || samples.length < 44100 * 5) throw new Error('Nagranie jest zbyt krótkie do analizy.');
    vector = essentia.arrayToVector(samples);
    self.postMessage({type: 'status', message: 'Wykrywanie tempa oryginalnego nagrania…'});
    rhythm = essentia.RhythmExtractor2013(vector, 208, 'multifeature', 40);
    self.postMessage({type: 'status', message: 'Wykrywanie tonacji oryginalnego nagrania…'});
    const tonal = essentia.KeyExtractor(vector);
    self.postMessage({type: 'result', result: {
      bpm: Number.isFinite(rhythm.bpm) && rhythm.bpm > 0 ? rhythm.bpm : null,
      key: tonal.key || null,
      scale: tonal.scale || null,
      keyStrength: Number.isFinite(tonal.strength) ? tonal.strength : null,
      rhythmConfidence: Number.isFinite(rhythm.confidence) ? rhythm.confidence : null
    }});
  } catch (error) {
    self.postMessage({type: 'error', message: `Analiza Essentia.js nie powiodła się: ${error.message || String(error)}`});
  } finally {
    if (vector && vector.delete) vector.delete();
    if (rhythm) for (const value of Object.values(rhythm)) if (value && value.delete) value.delete();
  }
};
