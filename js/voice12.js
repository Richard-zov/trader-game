'use strict';
// ===== v12: голос — мягкий Gemini TTS, русские голоса Google, «дизайн» голоса, локальный нейроголос (Piper), WebAudio-обработка =====
// Ключ Gemini берётся только из localStorage (AI.getKey) и уходит только в Google. Локальный голос качается с jsDelivr/Hugging Face один раз и кэшируется.
const VOICE12 = (() => {
  const st = VOICE.st;
  // ---------- миграция настроек ----------
  if (!st.v12) {
    st.v12 = 1;
    if (!st.eng) st.eng = AI.cfg.nv ? 'gemini' : 'browser';
    if (st.soft == null) st.soft = true;
    if (st.room == null) st.room = false;
    if (st.mood == null) st.mood = true;
    if (st.full == null) st.full = false;
    st.lib = st.lib || [];
    st.lhave = st.lhave || {};
    if (AI.cfg.nvModel === 'gemini-3.8-flash-lite-tts') { AI.cfg.nvModel = 'gemini-3.8-flash-tts'; AI.saveCfg(); }
    VOICE.saveV();
  }
  const TTS_LITE = 'gemini-3.8-flash-lite-tts', TTS_FLASH = 'gemini-3.8-flash-tts';
  // мягкие голоса впереди; описания — по документации Google
  const NV_F = ['Sulafat', 'Achernar', 'Vindemiatrix', 'Despina', 'Callirrhoe', 'Leda', 'Aoede', 'Erinome', 'Algieba', 'Autonoe', 'Laomedeia', 'Zephyr', 'Kore', 'Gacrux', 'Pulcherrima'];
  const NV_M = ['Algieba', 'Achird', 'Umbriel', 'Iapetus', 'Charon', 'Sadaltager', 'Enceladus', 'Orus', 'Algenib', 'Puck', 'Rasalgethi', 'Alnilam', 'Schedar', 'Zubenelgenubi', 'Sadachbia', 'Fenrir'];
  const DESC = Object.assign({}, VOICE.NV_DESC, { Sulafat: 'тёплый ★', Achernar: 'мягкий ★', Vindemiatrix: 'нежный ★', Despina: 'бархатный ★', Callirrhoe: 'спокойный ★', Algieba: 'бархатный ★', Achird: 'дружелюбный ★', Umbriel: 'спокойный ★' });
  const PRESET = { f01: 'Leda', f02: 'Vindemiatrix', f03: 'Aoede', f04: 'Callirrhoe', f05: 'Sulafat', f06: 'Despina', f07: 'Achernar', f08: 'Erinome', f09: 'Achernar', f10: 'Despina', f11: 'Sulafat', f12: 'Vindemiatrix', f13: 'Leda', f14: 'Aoede', f15: 'Aoede', f16: 'Callirrhoe', f17: 'Erinome', f18: 'Despina', f19: 'Sulafat', f20: 'Achernar', f21: 'Erinome', f22: 'Callirrhoe', f23: 'Vindemiatrix', f24: 'Sulafat', m01: 'Algieba', m02: 'Iapetus', m03: 'Umbriel', m04: 'Charon', m05: 'Achird', m06: 'Sadaltager', m07: 'Algenib', m08: 'Achird' };
  const SOFT_F = NV_F.slice(0, 8), SOFT_M = NV_M.slice(0, 6);
  const LV = { 'ru_RU-irina-medium': { n: 'Ирина', g: 'f' }, 'ru_RU-ruslan-medium': { n: 'Руслан', g: 'm' }, 'ru_RU-dmitri-medium': { n: 'Дмитрий', g: 'm' }, 'ru_RU-denis-medium': { n: 'Денис', g: 'm' } };
  const LV_MB = 63, ENGINE_MB = 30;
  const per = (c) => { const p = st.per[c.uid] || (st.per[c.uid] = {}); if (!p.v12) { p.v12 = 1; if (p.nv) { const keep = st.per[c.uid]; delete st.per[c.uid]; let old = ''; try { old = VOICE.nvVoice(c); } catch (e) { } st.per[c.uid] = keep; if (keep.nv === old) delete keep.nv; } } return p; };
  const isDemo = (c) => !c || c.uid === 'demo';
  function nvVoice(c) {
    const p = isDemo(c) ? {} : per(c);
    if (p.dv) return p.dv;
    if (p.nv) return p.nv;
    if (c.voice12) return c.voice12;
    if (!c.parents && PRESET[c.preset]) return PRESET[c.preset];
    const L = c.g === 'm' ? SOFT_M : SOFT_F; return L[aiHash(String(c.uid)) % L.length];
  }
  function localVoice(c) { const p = isDemo(c) ? {} : per(c); if (p.lv && LV[p.lv]) return p.lv; if (c.g === 'm') return ['ru_RU-ruslan-medium', 'ru_RU-dmitri-medium', 'ru_RU-denis-medium'][aiHash(String(c.uid)) % 3]; return 'ru_RU-irina-medium'; }
  const MOOD = { sad: 'softly, a little sad', surprised: 'gently surprised', frown: 'a little displeased', back: 'cool and curt', shy: 'shy and quiet', blush: 'shy and soft' };
  function style(c, expr) {
    const p = isDemo(c) ? {} : per(c);
    let s = p.sty || c.style12 || 'soft, warm and calm';
    if (st.mood && MOOD[expr]) s = MOOD[expr] + ', warm';
    const sp = p.sp || 1;
    if (sp <= 0.93) s += ', unhurried'; else if (sp >= 1.08) s += ', a bit brisk';
    return s;
  }
  // ---------- текст: чистка и деление на фразы ----------
  const SKIP = /течк|постел|наедине|ласк|близост|раздень|разде[вт]|страст|жар\b|ночь вместе|за закрытыми/i;
  function sentences(t) { return (String(t).match(/[^.!?…]+(?:[.!?…]+["»)]?|$)/g) || []).map(s => s.trim()).filter(s => s.length > 1); }
  function chunks(text, maxLen, maxN) {
    const out = []; let cur = '';
    for (let s of sentences(text)) {
      if (SKIP.test(s)) continue;
      if (s.length > maxLen) s = (s.slice(0, maxLen).match(/^.*[,;:—]/) || [s.slice(0, maxLen)])[0];
      if (cur && (cur + ' ' + s).length > maxLen) { out.push(cur); cur = ''; if (out.length >= maxN) break; }
      cur = cur ? cur + ' ' + s : s;
    }
    if (cur && out.length < maxN) out.push(cur);
    return out;
  }
  // ---------- WebAudio ----------
  let ctx = null;
  function ac() {
    try { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); } if (ctx.state === 'suspended') ctx.resume().catch(() => { }); } catch (e) { return null; }
    return ctx;
  }
  function str4(dv, o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); }
  // WAV (RIFF, ищем чанки fmt/data) или сырой PCM16 → Float32 моно
  function toPcm(ab, mime) {
    const dv = new DataView(ab);
    let rate = +((String(mime || '').match(/rate=(\d+)/) || [])[1]) || 24000, ch = 1, bits = 16, off = 0, len = ab.byteLength, fmt = 1;
    if (ab.byteLength > 44 && str4(dv, 0) === 'RIFF' && str4(dv, 8) === 'WAVE') {
      let o = 12; off = -1;
      while (o + 8 <= ab.byteLength) {
        const id = str4(dv, o), sz = dv.getUint32(o + 4, true);
        if (id === 'fmt ') { fmt = dv.getUint16(o + 8, true); ch = dv.getUint16(o + 10, true); rate = dv.getUint32(o + 12, true); bits = dv.getUint16(o + 22, true); }
        else if (id === 'data') { off = o + 8; len = Math.min(sz || ab.byteLength, ab.byteLength - off); break; }
        o += 8 + sz + (sz & 1);
      }
      if (off < 0 || (fmt !== 1 && fmt !== 3) || (bits !== 16 && bits !== 32)) return null;
    }
    const bps = bits / 8, n = Math.floor(len / (bps * ch)), f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (let k = 0; k < ch; k++) { const p = off + (i * ch + k) * bps; v += bits === 16 ? dv.getInt16(p, true) / 32768 : dv.getFloat32(p, true); }
      f[i] = v / ch;
    }
    return { f, rate };
  }
  // мягкая подготовка: без сдвига высоты — убрать постоянную составляющую, тишину по краям, выровнять громкость, плавные края
  function polish(a) {
    let f = a.f; const rate = a.rate, n = f.length; if (!n) return a;
    let m = 0; for (let i = 0; i < n; i++) m += f[i]; m /= n;
    const th = 0.006; let s = 0, e = n - 1;
    while (s < n && Math.abs(f[s] - m) < th) s++;
    while (e > s && Math.abs(f[e] - m) < th) e--;
    const pad = Math.round(rate * 0.05); s = Math.max(0, s - pad); e = Math.min(n - 1, e + pad);
    const out = new Float32Array(Math.max(1, e - s + 1)); let peak = 0;
    for (let i = 0; i < out.length; i++) { const v = f[s + i] - m; out[i] = v; const av = Math.abs(v); if (av > peak) peak = av; }
    const g = peak > 0 ? Math.min(2.5, 0.8 / peak) : 1, fd = Math.min(out.length >> 2, Math.round(rate * 0.012));
    for (let i = 0; i < out.length; i++) { let k = g; if (i < fd) k *= i / fd; else if (i > out.length - 1 - fd) k *= (out.length - 1 - i) / fd; out[i] *= k; }
    return { f: out, rate, peak, gain: g };
  }
  let roomIR = null;
  function ir(c) { if (roomIR && roomIR.sampleRate === c.sampleRate) return roomIR; const len = Math.round(c.sampleRate * 0.35), b = c.createBuffer(2, len, c.sampleRate); for (let k = 0; k < 2; k++) { const d = b.getChannelData(k); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.5; } return (roomIR = b); }
  let cur = null, playSeq = 0;
  const STATS = { played: 0, last: null };
  function stop() { playSeq++; try { if (cur && cur.stop) cur.stop(); } catch (e) { } cur = null; try { VOICE.stopAll(); } catch (e) { } }
  function playPcm(a, opt) {
    return new Promise((res) => {
      const c = ac();
      const vol = clamp(TTS.st.vol, 0, 1);
      if (!c) { // запасной путь: <audio>
        try { const au = new Audio(URL.createObjectURL(wavBlob(a))); au.volume = vol; cur = { stop: () => au.pause() }; au.onended = () => res(); au.onerror = () => res(); au.play().catch(() => res()); } catch (e) { res(); }
        return;
      }
      const buf = c.createBuffer(1, a.f.length, a.rate); buf.getChannelData(0).set(a.f);
      const src = c.createBufferSource(); src.buffer = buf;
      if (opt && opt.cents) try { src.detune.value = opt.cents; } catch (e) { }
      let node = src;
      if (st.soft) {
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9500; lp.Q.value = 0.5;
        const hs = c.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 6000; hs.gain.value = -2.5;
        const ls = c.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 220; ls.gain.value = 1.5;
        node.connect(lp); lp.connect(hs); hs.connect(ls); node = ls;
      }
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      const out = c.createGain(); out.gain.value = vol;
      node.connect(comp);
      if (st.room) { const cv = c.createConvolver(); cv.buffer = ir(c); const wet = c.createGain(); wet.gain.value = 0.12; node.connect(cv); cv.connect(wet); wet.connect(comp); }
      comp.connect(out); out.connect(c.destination);
      src.onended = () => { try { out.disconnect(); } catch (e) { } res(); };
      cur = src; STATS.played++; STATS.last = { dur: a.f.length / a.rate, rate: a.rate, soft: !!st.soft, room: !!st.room, cents: (opt && opt.cents) || 0, peak: a.peak, gain: a.gain };
      try { src.start(); } catch (e) { res(); }
    });
  }
  function wavBlob(a) {
    const n = a.f.length, h = new DataView(new ArrayBuffer(44 + n * 2)); const w = (o, s) => { for (let i = 0; i < 4; i++) h.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); h.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, a.rate, true); h.setUint32(28, a.rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) h.setInt16(44 + i * 2, Math.max(-1, Math.min(1, a.f[i])) * 32767, true);
    return new Blob([h.buffer], { type: 'audio/wav' });
  }
  // ---------- кэш клипов (IndexedDB, своя база v12) ----------
  const mem = new Map(); let dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise((res) => { try { const r = indexedDB.open('trader_tts12', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return dbp; }
  async function cget(k) { if (mem.has(k)) return mem.get(k); const d = await db(); if (!d) return null; return new Promise(res => { try { const q = d.transaction('clips').objectStore('clips').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  async function cput(k, v) { mem.set(k, v); if (mem.size > 40) mem.delete(mem.keys().next().value); const d = await db(); if (!d) return; try { const os = d.transaction('clips', 'readwrite').objectStore('clips'); os.put(v, k); const cq = os.count(); cq.onsuccess = () => { if (cq.result > 300) { const kq = os.getAllKeys(); kq.onsuccess = () => { for (const kk of kq.result.slice(0, 60)) os.delete(kk); }; } }; } catch (e) { } }
  // ---------- Gemini TTS ----------
  let nvLast = 0, nvCool = 0;
  function b64ab(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  async function gemini(c, txt, expr) {
    const voice = nvVoice(c), sty = style(c, expr);
    let model = AI.cfg.nvModel || TTS_FLASH;
    const key = 'g|' + model + '|' + voice + '|' + sty + '|' + txt;
    let hit = await cget(key); if (hit) return hit;
    AI.rollDay();
    if (Date.now() < nvCool || AI.cfg.nvN >= AI.cfg.nvCap) throw AI.aerr('busy');
    const wait = nvLast + 1200 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    nvLast = Date.now(); AI.cfg.nvN++; AI.saveCfg();
    const body = (m) => ({ model: m, store: false, input: [{ type: 'user_input', content: [{ type: 'text', text: txt, annotations: [{ type: 'speech_metadata', style: sty }] }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice }] } });
    let j;
    try { j = await AI.post(body(model), 30000); }
    catch (e) {
      // качественная модель упёрлась в лимит или недоступна — один раз пробуем быструю
      if ((e.kind === 'quota' || e.kind === 'model') && model !== TTS_LITE) { model = TTS_LITE; try { j = await AI.post(body(model), 30000); } catch (e2) { e = e2; j = null; } }
      if (!j) { if (e.kind === 'quota') { nvCool = Date.now() + Math.max(60, e.retry || 0) * 1000 * (e.message === 'day' ? 60 : 1); toast('Нейроголос Gemini: бесплатный лимит — пока говорит запасной голос.'); } throw e; }
    }
    const a = AI.audioOf(j); if (!a) throw AI.aerr('empty');
    const pcm = toPcm(b64ab(a.data), a.mime_type || a.mimeType); if (!pcm) throw AI.aerr('empty');
    const out = { f: pcm.f, rate: pcm.rate };
    cput(key, out);
    return out;
  }
  // Google: русские голоса из расширенной библиотеки и дизайн голоса
  const VAPI = 'https://generativelanguage.googleapis.com/v1beta/voices';
  async function vfetch(url, opt) {
    const k = AI.getKey(); if (!k) throw AI.aerr('nokey');
    let r; try { r = await fetch(url, Object.assign({ headers: { 'content-type': 'application/json', 'x-goog-api-key': k } }, opt || {})); } catch (e) { throw AI.aerr('offline'); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok || (j && j.error)) throw AI.classify(r.status, j && j.error);
    return j || {};
  }
  async function loadLibrary() {
    const all = []; let tok = '';
    for (let i = 0; i < 5; i++) {
      const j = await vfetch(VAPI + '?language_code=ru-RU&page_size=100' + (tok ? '&page_token=' + encodeURIComponent(tok) : ''));
      for (const v of j.voices || []) {
        const id = v.id || v.name; if (!id || v.type === 'prebuilt' || /^(voices\/)?[A-Z][a-z]+$/.test(id) && NV_F.concat(NV_M).includes(String(id).replace('voices/', ''))) continue;
        const g = /^f/i.test(v.gender || '') ? 'f' : /^m/i.test(v.gender || '') ? 'm' : '';
        all.push({ id, n: String(v.display_name || v.displayName || id).slice(0, 40), g, d: String(v.description || v.persona || '').slice(0, 80), p: v.pitch || '' });
      }
      tok = j.next_page_token || j.nextPageToken; if (!tok) break;
    }
    st.lib = all.slice(0, 120); VOICE.saveV();
    return st.lib;
  }
  function designPrompt(c) {
    const fem = c.g !== 'm';
    let s = fem ? 'A soft, warm and gentle adult woman\'s voice' : 'A calm, warm and kind adult man\'s voice';
    if (c.race === 'elf') s += ', light and melodic'; else if (c.race === 'dwarf') s += ', slightly husky but friendly';
    if (c.voiceHint) s += ', ' + c.voiceHint;
    return s + '. Speaks natural, native Russian at an easy conversational pace, intimate and close to the microphone, clear diction, no theatrics, no accent.';
  }
  async function design(c) {
    const j = await vfetch(VAPI, { method: 'POST', body: JSON.stringify({ store: true, voice: { model: TTS_FLASH, type: 'prompted', display_name: ('Медовый Лог — ' + (c.name || 'персонаж')).slice(0, 60), gender: c.g === 'm' ? 'male' : 'female', language_code: 'ru-RU', prompted: { input: designPrompt(c) } } }) });
    const id = j.id || j.name; if (!id) throw AI.aerr('empty');
    const p = per(c); p.dv = id; p.dn = 'свой голос'; VOICE.saveV();
    const sa = j.sample_audio || j.sampleAudio;
    if (sa && sa.data) { const pcm = toPcm(b64ab(sa.data), sa.mime_type || sa.mimeType); if (pcm) playPcm(polish(pcm)); }
    return id;
  }
  // ---------- локальный нейроголос: Piper (ONNX Runtime Web + espeak-ng) в фоновом потоке ----------
  const WSRC = `
const ORT='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const PH='https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const PHJS='https://cdn.jsdelivr.net/npm/@jtsage/piper-tts-web@1.2.0/dist/piper-CLXk3wTk.js';
const HF='https://huggingface.co/diffusionstudio/piper-voices/resolve/main/ru/ru_RU/';
const CN='trader-piper-v1';
let ort=null, createPh=null, phW=null, phD=null; const S=new Map();
const vurl=(v)=>{const n=v.split('-')[1];return HF+n+'/medium/'+v+'.onnx';};
async function cached(url, id, prog){
  const c=await caches.open(CN); const hit=await c.match(url); if(hit) return hit.blob();
  const r=await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status+' '+url);
  const tot=+r.headers.get('content-length')||0, rd=r.body.getReader(), ch=[]; let got=0, t=0;
  for(;;){const x=await rd.read(); if(x.done) break; ch.push(x.value); got+=x.value.length; if(prog&&Date.now()-t>250){t=Date.now(); postMessage({t:'prog',id,url,got,tot});}}
  const b=new Blob(ch); await c.put(url,new Response(b)); return b;
}
async function engine(id){
  if(ort) return;
  const w=await cached(ORT+'ort-wasm-simd-threaded.wasm',id,1);
  const m=await import(ORT+'ort.wasm.min.mjs'); ort=m.default||m;
  ort.env.wasm.numThreads=self.crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||2):1;
  ort.env.wasm.wasmPaths={wasm:URL.createObjectURL(new Blob([w],{type:'application/wasm'})), mjs:ORT+'ort-wasm-simd-threaded.mjs'};
  phW=URL.createObjectURL(new Blob([await (await cached(PH+'.wasm',id,1)).arrayBuffer()],{type:'application/wasm'}));
  phD=URL.createObjectURL(await cached(PH+'.data',id,1));
  createPh=(await import(PHJS)).createPiperPhonemize;
}
async function voice(v,id){
  if(S.has(v)) return S.get(v);
  await engine(id);
  const cfg=JSON.parse(await (await cached(vurl(v)+'.json',id,0)).text());
  const model=await (await cached(vurl(v),id,1)).arrayBuffer();
  const sess=await ort.InferenceSession.create(model,{executionProviders:['wasm']});
  const o={cfg,sess}; S.set(v,o); return o;
}
async function phon(text,lang){
  let out=null;
  const m=await createPh({print:(d)=>{out=d;},printErr:()=>{},locateFile:(u)=>u.endsWith('.wasm')?phW:u.endsWith('.data')?phD:u});
  m.callMain(['-l',lang,'--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);
  if(!out) throw new Error('phonemize');
  return JSON.parse(out).phoneme_ids;
}
onmessage=async(e)=>{
  const q=e.data, id=q.id;
  try{
    if(q.t==='has'){const c=await caches.open(CN); const ks=(await c.keys()).map(r=>r.url); postMessage({t:'ok',id,r:ks}); return;}
    if(q.t==='del'){const c=await caches.open(CN); await c.delete(vurl(q.v)); await c.delete(vurl(q.v)+'.json'); S.delete(q.v); postMessage({t:'ok',id}); return;}
    if(q.t==='load'){await voice(q.v,id); postMessage({t:'ok',id}); return;}
    if(q.t==='synth'){
      const t0=performance.now(); const o=await voice(q.v,id); const t1=performance.now();
      const ids=await phon(q.text,o.cfg.espeak.voice); const inf=o.cfg.inference;
      const feeds={input:new ort.Tensor('int64',BigInt64Array.from(ids.map(BigInt)),[1,ids.length]),input_lengths:new ort.Tensor('int64',BigInt64Array.from([BigInt(ids.length)]),[1]),scales:new ort.Tensor('float32',Float32Array.from([inf.noise_scale,inf.length_scale/(q.speed||1),inf.noise_w]),[3])};
      if(o.cfg.num_speakers>1) feeds.sid=new ort.Tensor('int64',BigInt64Array.from([0n]),[1]);
      const r=await o.sess.run(feeds); const f=r.output.data; const rate=o.cfg.audio.sample_rate;
      const ms=performance.now()-t1;
      postMessage({t:'ok',id,r:{f,rate,ms,loadMs:t1-t0,dur:f.length/rate}},[f.buffer]); return;
    }
  }catch(err){postMessage({t:'err',id,e:String(err&&err.message||err)});}
};`;
  const LOCAL = (() => {
    let w = null, n = 0; const pend = new Map(); let busy = null;
    function worker() {
      if (w) return w;
      w = new Worker(URL.createObjectURL(new Blob([WSRC], { type: 'text/javascript' })));
      w.onmessage = (e) => { const m = e.data, p = pend.get(m.id); if (!p) return; if (m.t === 'prog') { p.prog && p.prog(m); return; } pend.delete(m.id); m.t === 'ok' ? p.res(m.r) : p.rej(new Error(m.e)); };
      w.onerror = (e) => { for (const [, p] of pend) p.rej(new Error('worker')); pend.clear(); w = null; };
      return w;
    }
    function call(msg, prog) { return new Promise((res, rej) => { const id = ++n; pend.set(id, { res, rej, prog }); worker().postMessage(Object.assign({ id }, msg)); }); }
    const supported = () => typeof Worker !== 'undefined' && typeof caches !== 'undefined' && typeof WebAssembly !== 'undefined';
    async function download(v, prog) {
      const tot = {}; const pr = (m) => { tot[m.url] = m; let got = 0, all = 0; for (const k in tot) { got += tot[k].got; all += tot[k].tot || 0; } prog && prog(got, all); };
      await call({ t: 'load', v }, pr); st.lhave[v] = 1; VOICE.saveV();
    }
    async function synth(text, v, speed) { const r = await call({ t: 'synth', text, v, speed }); return r; }
    async function remove(v) { await call({ t: 'del', v }); delete st.lhave[v]; VOICE.saveV(); }
    async function has() { try { return await call({ t: 'has' }); } catch (e) { return []; } }
    return { download, synth, remove, has, supported, get busy() { return busy; }, set busy(x) { busy = x; } };
  })();
  async function local(c, txt) {
    const v = localVoice(c); const p = isDemo(c) ? {} : per(c);
    const key = 'l|' + v + '|' + (p.sp || 1) + '|' + txt;
    let hit = await cget(key); if (hit) return hit;
    const r = await LOCAL.synth(txt, v, p.sp || 1);
    const out = { f: r.f, rate: r.rate }; cput(key, out); STATS.rtf = r.ms / 1000 / r.dur; return out;
  }
  // ---------- выбор движка и очередь ----------
  function engineFor() {
    if (st.eng === 'gemini' && AI.hasKey()) return 'gemini';
    if (st.eng === 'local' && LOCAL.supported() && Object.keys(st.lhave).length) return 'local';
    if ((st.eng === 'gemini') && LOCAL.supported() && Object.keys(st.lhave).length) return 'local';
    return 'browser';
  }
  function browserSay(c, txt) { if (!TTS.ok) return; try { VOICE._browser ? VOICE._browser(c, txt) : speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(txt), { lang: 'ru-RU' })); } catch (e) { } }
  let lastSpoken = null;
  async function run(c, list, expr, eng, my) {
    const p = isDemo(c) ? {} : per(c), cents = (p.pt || 0) * 100;
    const syn = (t) => eng === 'gemini' ? gemini(c, t, expr) : local(c, t);
    let next = syn(list[0]);
    for (let i = 0; i < list.length; i++) {
      let a;
      try { a = await next; }
      catch (e) {
        if (my !== playSeq) return;
        if (eng === 'gemini' && LOCAL.supported() && st.lhave[localVoice(c)]) { eng = 'local'; i--; next = syn(list[i + 1]); continue; }
        browserSay(c, list.slice(i).join(' ')); return;
      }
      if (my !== playSeq) return;
      if (i + 1 < list.length) next = syn(list[i + 1]);
      await playPcm(polish(a), { cents });
      if (my !== playSeq) return;
    }
  }
  function speak(c, line, expr) {
    if (!TTS.st.on || !c || !line) return;
    try { if (typeof Audio_ !== 'undefined' && Audio_.st && Audio_.st.sfx === false) return; } catch (e) { }
    if (!isDemo(c) && typeof inHeat === 'function' && inHeat(c)) return;
    const txt = VOICE.clean(line); if (!txt || txt.length < 2) return;
    const eng = engineFor();
    const list = eng === 'gemini' ? chunks(txt, 240, st.full ? 5 : 2) : eng === 'local' ? chunks(txt, 200, st.full ? 10 : 4) : chunks(txt, 400, st.full ? 3 : 1);
    if (!list.length) return;
    lastSpoken = { eng, list, uid: c.uid };
    stop(); const my = playSeq;
    if (eng === 'browser') { browserSay(c, list.join(' ')); return; }
    ac(); // создаём/будим аудиоконтекст ещё внутри нажатия
    run(c, list, expr || VOICE.lastExpr || 'smile', eng, my).catch(() => { });
  }
  return { st, speak, stop, chunks, toPcm, polish, playPcm, gemini, local, loadLibrary, design, designPrompt, nvVoice, localVoice, style, LOCAL, LV, LV_MB, ENGINE_MB, NV_F, NV_M, DESC, PRESET, STATS, engineFor, get last() { return lastSpoken; } };
})();
VOICE.speak = (c, line, expr) => VOICE12.speak(c, line, expr);
VOICE.nvVoice = VOICE12.nvVoice;

// ---------- окно «Голоса» v12 ----------
window.voiceModal = function () {
  const vs = VOICE.st, cf = AI.cfg, V = VOICE12;
  const vopt = (gn, cur) => { const L = VOICE.ranked(gn); return L.length ? L.map((v, i) => `<option value="${esc(v.name)}" ${v.name === cur || (!cur && i === 0) ? 'selected' : ''}>${i === 0 ? '★ ' : ''}${esc(v.name)}</option>`).join('') : '<option value="">нет русских голосов</option>'; };
  const chars = (typeof S !== 'undefined' && S.owned ? S.owned : []).slice(0, 30);
  const lvRows = Object.keys(V.LV).map(v => `<div class="vo-lv" data-lvrow="${v}"><span>${V.LV[v].n} <small class="muted">${V.LV[v].g === 'f' ? 'жен.' : 'муж.'} · ≈${V.LV_MB} МБ</small></span>${vs.lhave[v] ? `<b class="good small">✓ скачан</b><button class="btn small" type="button" data-lvdel="${v}">удалить</button>` : `<button class="btn small" type="button" data-lvget="${v}">⬇ скачать</button>`}</div>`).join('');
  const gOpts = (c) => {
    const L = c.g === 'm' ? V.NV_M : V.NV_F, cur = V.nvVoice(c), p = vs.per[c.uid] || {};
    const lib = (vs.lib || []).filter(v => !v.g || v.g === (c.g === 'm' ? 'm' : 'f'));
    return `${p.dv ? `<option value="dv:${esc(p.dv)}" selected>✨ свой голос (создан)</option>` : ''}<optgroup label="Голоса Gemini">${L.map(v => `<option value="${v}" ${!p.dv && v === cur ? 'selected' : ''}>${v} — ${V.DESC[v] || ''}</option>`).join('')}</optgroup>${lib.length ? `<optgroup label="Русские голоса Google">${lib.map(v => `<option value="${esc(v.id)}" ${!p.dv && v.id === cur ? 'selected' : ''}>${esc(v.n)}${v.d ? ' — ' + esc(v.d.slice(0, 30)) : ''}</option>`).join('')}</optgroup>` : ''}`;
  };
  const charRow = (c) => {
    const p = vs.per[c.uid] || {};
    return `<details class="vo-ch"><summary>${esc(fn1(c))} <small class="muted">${esc(String(V.nvVoice(c)).replace(/^voices\//, '').slice(0, 18))} · ${V.LV[V.localVoice(c)].n}</small></summary>
      <label class="ai-lab small">Голос Gemini</label><select data-vochar="${c.uid}">${gOpts(c)}</select>
      <div class="btn-row"><button class="btn small" type="button" data-vodesign="${c.uid}" ${AI.hasKey() ? '' : 'disabled'}>✨ Создать свой голос</button>${p.dv ? `<button class="btn small" type="button" data-vodvx="${c.uid}">сбросить</button>` : ''}</div>
      <label class="ai-lab small">Локальный голос</label><select data-volv="${c.uid}">${Object.keys(V.LV).map(v => `<option value="${v}" ${v === V.localVoice(c) ? 'selected' : ''}>${V.LV[v].n}</option>`).join('')}</select>
      <label class="set-row small"><span>Темп</span><input type="range" data-vosp="${c.uid}" min="85" max="115" value="${Math.round((p.sp || 1) * 100)}"></label>
      <label class="set-row small"><span>Высота <small class="muted">(чуть меняет и темп)</small></span><input type="range" data-vopt="${c.uid}" min="-3" max="3" step="1" value="${p.pt || 0}"></label>
      <button class="btn small" data-votry="${c.uid}" type="button">▶ Прослушать</button></details>`;
  };
  showModal('Голоса персонажей', `
    <label class="set-row"><span>Озвучка реплик</span><input type="checkbox" id="vo-on" ${TTS.st.on ? 'checked' : ''}></label>
    <label class="ai-lab small">Чем озвучивать</label>
    <select id="vo-eng"><option value="gemini" ${vs.eng === 'gemini' ? 'selected' : ''}>★ Gemini — самый живой</option><option value="local" ${vs.eng === 'local' ? 'selected' : ''}>Локальный — без ключа, офлайн</option><option value="browser" ${vs.eng === 'browser' ? 'selected' : ''}>Браузер — мгновенно, роботом</option></select>
    <div class="vo-box"><b class="small">Нейроголос Gemini</b>
    <div class="small muted">${AI.hasKey() ? 'Тот же бесплатный ключ, что и для разговоров. Фразы кэшируются; при лимите — локальный голос или голос браузера.' : 'Нужен бесплатный ключ Gemini: <a href="#" id="vo-key">добавить ключ</a>.'}</div>
    <select id="vo-nvm">${AI.TTS_MODELS.map(([id, n]) => `<option value="${id}" ${cf.nvModel === id ? 'selected' : ''}>${id === 'gemini-3.8-flash-tts' ? '★ 3.8 Flash TTS — лучшее качество' : '3.8 Flash-Lite TTS — быстрее, проще'}</option>`).join('')}</select>
    <label class="set-row small"><span>Интонация по настроению</span><input type="checkbox" id="vo-mood" ${vs.mood ? 'checked' : ''}></label>
    <label class="set-row small"><span>Озвучивать длинные ответы целиком</span><input type="checkbox" id="vo-full" ${vs.full ? 'checked' : ''}></label>
    <div class="btn-row"><button class="btn small" id="vo-lib" type="button" ${AI.hasKey() ? '' : 'disabled'}>🇷🇺 Загрузить русские голоса Google</button></div>
    <div class="small muted" id="vo-libst">${(vs.lib || []).length ? 'Русских голосов в списке: ' + vs.lib.length : 'Носители русского из библиотеки Google звучат естественнее; «✨ свой голос» создаёт голос по описанию персонажа.'}</div></div>
    <div class="vo-box"><b class="small">Локальный нейроголос (Piper)</b>
    <div class="small muted">${V.LOCAL.supported() ? `Работает прямо в браузере, без интернета после загрузки. Один раз: движок ≈${V.ENGINE_MB} МБ + голос ≈${V.LV_MB} МБ. Звучит чище браузерного, но проще Gemini. Женский голос пока один — Ирина.` : 'Этот браузер не поддерживает локальный голос.'}</div>
    ${V.LOCAL.supported() ? lvRows : ''}<div class="vo-prog small" id="vo-prog"></div></div>
    <div class="vo-box"><b class="small">Звук</b>
    <label class="set-row small"><span>Мягкая обработка (тише «шипящие», без искажений)</span><input type="checkbox" id="vo-soft" ${vs.soft ? 'checked' : ''}></label>
    <label class="set-row small"><span>Лёгкое эхо комнаты</span><input type="checkbox" id="vo-room" ${vs.room ? 'checked' : ''}></label></div>
    <details class="vo-box"><summary class="small"><b>Голос браузера (запасной)</b></summary>
    <label class="ai-lab small">Женский</label><select id="vo-fv">${vopt('f', vs.fv)}</select>
    <label class="ai-lab small">Мужской</label><select id="vo-mv">${vopt('m', vs.mv)}</select>
    <label class="set-row small"><span>Темп</span><input type="range" id="vo-rate" min="70" max="130" value="${Math.round(vs.rate * 100)}"></label>
    <label class="set-row small"><span>Высота</span><input type="range" id="vo-pitch" min="70" max="130" value="${Math.round(vs.pitch * 100)}"></label></details>
    ${chars.length ? `<div class="vo-box"><b class="small">Голос каждого персонажа</b>${chars.map(charRow).join('')}</div>` : ''}
    <div class="btn-row"><button class="btn" id="vo-test" type="button">▶ Прослушать</button></div>`,
    [{ label: 'Готово', cls: 'btn-primary', act: 'close' }]);
  const $ = (id) => document.getElementById(id);
  const upd = () => {
    TTS.set('on', $('vo-on').checked); vs.eng = $('vo-eng').value; cf.nv = vs.eng === 'gemini'; cf.nvModel = $('vo-nvm').value; AI.saveCfg();
    vs.mood = $('vo-mood').checked; vs.full = $('vo-full').checked; vs.soft = $('vo-soft').checked; vs.room = $('vo-room').checked;
    vs.fv = $('vo-fv').value; vs.mv = $('vo-mv').value; vs.rate = $('vo-rate').value / 100; vs.pitch = $('vo-pitch').value / 100;
    const P = (u) => vs.per[u] || (vs.per[u] = { v12: 1 });
    document.querySelectorAll('[data-vochar]').forEach(s => { const p = P(s.dataset.vochar), v = s.value; if (/^dv:/.test(v)) return; if (v !== VOICE12.nvVoice(findOwned(s.dataset.vochar) || { uid: s.dataset.vochar }) || p.nv) { p.nv = v; delete p.dv; } });
    document.querySelectorAll('[data-volv]').forEach(s => { P(s.dataset.volv).lv = s.value; });
    document.querySelectorAll('[data-vosp]').forEach(s => { P(s.dataset.vosp).sp = s.value / 100; });
    document.querySelectorAll('[data-vopt]').forEach(s => { P(s.dataset.vopt).pt = +s.value; });
    VOICE.saveV();
  };
  document.querySelectorAll('#modal input, #modal select').forEach(el => el.addEventListener('change', upd));
  const k = $('vo-key'); if (k) k.onclick = (e) => { e.preventDefault(); aiSettingsModal(); };
  const say = (c, t) => { upd(); const was = TTS.st.on; TTS.st.on = true; VOICE12.speak(c, t, 'smile'); TTS.st.on = was; };
  $('vo-test').onclick = () => say({ uid: 'demo', g: 'f', race: 'human' }, addr('Здравствуйте, {х}! Сегодня чудесный день, правда? Я заварила вам чай с мятой.'));
  document.querySelectorAll('[data-votry]').forEach(b => b.onclick = () => { const c = findOwned(b.dataset.votry); if (c) say(Object.assign({}, c, { sickDays: 0 }), addr('Я здесь, {х}. Чем могу помочь? Если хотите, расскажу, как прошёл день.')); });
  $('vo-lib').onclick = async () => { const s = $('vo-libst'); s.textContent = 'Загружаю список…'; try { const L = await VOICE12.loadLibrary(); s.textContent = 'Русских голосов загружено: ' + L.length + '. Выберите их у персонажей ниже.'; setTimeout(() => { if (document.getElementById('vo-libst')) voiceModal(); }, 700); } catch (e) { s.textContent = '✗ ' + AI.errText(e); } };
  document.querySelectorAll('[data-vodesign]').forEach(b => b.onclick = async () => { const c = findOwned(b.dataset.vodesign); if (!c) return; b.disabled = true; b.textContent = 'Создаю голос…'; try { await VOICE12.design(c); toast('Голос создан — звучит образец.'); voiceModal(); } catch (e) { b.disabled = false; b.textContent = '✨ Создать свой голос'; toast('Не вышло: ' + AI.errText(e)); } });
  document.querySelectorAll('[data-vodvx]').forEach(b => b.onclick = () => { const p = vs.per[b.dataset.vodvx]; if (p) { delete p.dv; delete p.dn; VOICE.saveV(); } voiceModal(); });
  document.querySelectorAll('[data-lvget]').forEach(b => b.onclick = async () => {
    const v = b.dataset.lvget, pr = $('vo-prog'); document.querySelectorAll('[data-lvget]').forEach(x => x.disabled = true);
    try { await VOICE12.LOCAL.download(v, (got, all) => { if (pr) pr.innerHTML = `Загрузка: ${(got / 1048576).toFixed(1)} из ≈${all ? (all / 1048576).toFixed(0) : '…'} МБ <span class="vo-bar"><i style="width:${all ? Math.min(100, got / all * 100) : 5}%"></i></span>`; }); if (vs.eng === 'browser') { vs.eng = 'local'; VOICE.saveV(); } toast('Локальный голос готов.'); voiceModal(); }
    catch (e) { if (pr) pr.textContent = '✗ Не удалось скачать: ' + String(e.message || e).slice(0, 120); document.querySelectorAll('[data-lvget]').forEach(x => x.disabled = false); }
  });
  document.querySelectorAll('[data-lvdel]').forEach(b => b.onclick = async () => { await VOICE12.LOCAL.remove(b.dataset.lvdel).catch(() => { }); voiceModal(); });
};
