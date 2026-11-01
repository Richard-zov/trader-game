// ===== Звук: процедурная уютная музыка, короткие эффекты и мурчание (WebAudio, без файлов) =====
'use strict';

const SETTINGS_KEY = 'trader_settings_v1';
const Audio_ = (() => {
  const st = Object.assign({ music: true, sfx: true, vol: 0.6 }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } })());
  let ctx = null, master, musicBus, sfxBus, reverb, started = false, timer = null;
  let nextT = 0, step = 0, chordIdx = 0, prog = null, melNote = 7, section = 0;

  function saveSt() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); } catch (e) { } }
  function makeImpulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = st.vol; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = st.music ? 0.55 : 0;
    sfxBus = ctx.createGain(); sfxBus.gain.value = st.sfx ? 0.9 : 0;
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(3.2, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    musicBus.connect(master); musicBus.connect(reverb); reverb.connect(wet); wet.connect(master);
    sfxBus.connect(master);
    const sfxWet = ctx.createGain(); sfxWet.gain.value = 0.25; sfxBus.connect(sfxWet); sfxWet.connect(reverb);
  }
  // Первое касание пользователя разрешает звук
  function unlock() {
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!started) { started = true; startMusic(); }
  }

  // ---------- музыка ----------
  // Ре-миксолидийский / ре-мажор, мягкая лютня, пэд, бас, иногда арфа. Каждые 8 тактов — новая прогрессия.
  const ROOT = 50; // D3
  const PROGS = [
    [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],      // D Bm G A
    [[0, 4, 7], [-2, 2, 5], [-7, -3, 0], [0, 4, 7]],        // D C G D (миксолидийский)
    [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]],      // Bm G D A
    [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [-5, -1, 2]],       // D G/ Bm A
    [[-7, -3, 0], [-5, -1, 2], [-3, 0, 4], [-3, 0, 4]],     // G A Bm Bm
  ];
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // пентатоника
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BEAT = 60 / 68; // темп 68

  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function pad(chord, t, dur) {
    for (const n of chord) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = hz(ROOT + 12 + n); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = 900;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 1.4); g.gain.linearRampToValueAtTime(0.018, t + dur - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
        o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 1.3);
      }
    }
  }
  function bass(n, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(ROOT - 12 + ((n % 12) + 12) % 12 - (n < 0 ? 0 : 0));
    env(g, t, 0.03, 0.09, BEAT * 1.6); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + BEAT * 2);
  }
  function pluck(m, t, vol = 0.07, bright = 2600) {
    // лютня: два осциллятора + быстро закрывающийся фильтр
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 1.002;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    f.type = 'lowpass'; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    env(g, t, 0.005, vol, 1.3);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(musicBus);
    o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }
  function chime(m, t, vol = 0.025) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m); env(g, t, 0.01, vol, 2.2);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 2.4);
  }
  function scheduleBar(t) {
    const bar = step;
    if (bar % 8 === 0) { prog = PROGS[Math.floor(Math.random() * PROGS.length)]; section = Math.random(); }
    const chord = prog[Math.floor(bar / 2) % 4];
    if (bar % 2 === 0) { pad(chord, t, BEAT * 8); }
    bass(chord[0], t); bass(chord[0] + (Math.random() < 0.5 ? 7 : 0), t + BEAT * 2);
    // мелодия: случайная прогулка по пентатонике, тяготеет к нотам аккорда
    const busy = section < 0.3 ? 0.25 : section < 0.75 ? 0.5 : 0.7;
    for (let i = 0; i < 8; i++) {
      const tt = t + i * BEAT / 2 + (i % 2 ? 0.03 : 0);
      if (Math.random() > busy * (i % 2 ? 0.7 : 1)) continue;
      melNote = Math.max(2, Math.min(SCALE.length - 1, melNote + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      pluck(ROOT + 12 + SCALE[melNote], tt, 0.05 + Math.random() * 0.025);
    }
    // арфа-арпеджио на каждом четвёртом такте
    if (bar % 4 === 3 && Math.random() < 0.7) chord.concat(chord.map(n => n + 12)).forEach((n, i) => chime(ROOT + 24 + n, t + i * 0.14, 0.018));
    step++;
  }
  function startMusic() {
    if (!ctx) return;
    nextT = ctx.currentTime + 0.3;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!st.music || ctx.state !== 'running') { nextT = Math.max(nextT, ctx.currentTime + 0.2); return; }
      while (nextT < ctx.currentTime + 1.2) { scheduleBar(nextT); nextT += BEAT * 4; }
    }, 250);
  }

  // ---------- эффекты ----------
  function tone(type, f, t, a, d, vol, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, vol, d); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + a + d + 0.05);
  }
  const SFX = {
    coin() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) { const f = 1900 + Math.random() * 1400; tone('sine', f, t + i * 0.06 + Math.random() * 0.02, 0.003, 0.25, 0.08); tone('sine', f * 2.7, t + i * 0.06, 0.003, 0.12, 0.025); } },
    buy() { const t = ctx.currentTime; [72, 76, 79, 84].forEach((m, i) => tone('triangle', hz(m), t + i * 0.09, 0.01, 0.6, 0.09)); SFX.coin(); },
    sell() { const t = ctx.currentTime; [84, 79, 76].forEach((m, i) => tone('triangle', hz(m), t + i * 0.08, 0.01, 0.5, 0.07)); SFX.coin(); },
    bell() { const t = ctx.currentTime; tone('sine', 523, t, 0.01, 2.2, 0.12); tone('sine', 1046, t, 0.01, 1.4, 0.05); tone('sine', 1568, t, 0.01, 0.8, 0.02); },
    pop() { const t = ctx.currentTime; tone('sine', 700, t, 0.005, 0.12, 0.09, 1300); },
    sparkle() { const t = ctx.currentTime; [88, 91, 96].forEach((m, i) => tone('sine', hz(m), t + i * 0.07, 0.005, 0.5, 0.035)); },
    bad() { const t = ctx.currentTime; tone('triangle', 220, t, 0.01, 0.35, 0.1, 140); },
    heart() { const t = ctx.currentTime; [79, 83, 86].forEach((m, i) => tone('sine', hz(m), t + i * 0.1, 0.01, 0.7, 0.04)); },
  };
  // шумовые всплески для прикосновений: шорох, похлопывание, взмах
  let wbuf = null;
  function nz(t, dur, type, f0, f1, vol, q) {
    if (!wbuf) { const len = ctx.sampleRate; wbuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = wbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = wbuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  Object.assign(SFX, {
    pat() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) { nz(t + i * 0.22, 0.09, 'lowpass', 420, 160, 0.35, 0.7); tone('sine', 140, t + i * 0.22, 0.004, 0.08, 0.12, 90); } },
    knead() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) { nz(t + i * 0.28, 0.16, 'lowpass', 300, 150, 0.22, 0.8); tone('sine', 110 + i * 6, t + i * 0.28, 0.02, 0.14, 0.08, 85); } },
    rustle() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) nz(t + i * 0.12 + Math.random() * 0.04, 0.16, 'bandpass', 3200 + Math.random() * 1500, 2200, 0.09, 1.4); },
    swish() { const t = ctx.currentTime; nz(t, 0.42, 'bandpass', 600, 2600, 0.16, 2.2); nz(t + 0.36, 0.3, 'bandpass', 2400, 700, 0.1, 2.2); },
    squish() { const t = ctx.currentTime; tone('sine', 520, t, 0.01, 0.16, 0.12, 880); tone('triangle', 900, t + 0.13, 0.005, 0.12, 0.05, 620); },
    flick() { const t = ctx.currentTime; tone('triangle', 1400, t, 0.002, 0.06, 0.07, 700); nz(t, 0.08, 'highpass', 4000, 0, 0.08, 0.7); tone('triangle', 1250, t + 0.16, 0.002, 0.06, 0.05, 650); },
    warm() { const t = ctx.currentTime; tone('sine', hz(69), t, 0.06, 0.6, 0.07); tone('sine', hz(76), t + 0.12, 0.06, 0.7, 0.06); tone('sine', hz(81), t + 0.24, 0.06, 0.8, 0.045); },
    giggle() { const t = ctx.currentTime; for (let i = 0; i < 5; i++) tone('triangle', 820 + (i % 2) * 140 + i * 30, t + i * 0.075, 0.005, 0.06, 0.05, 700 + i * 20); },
    boing() { const t = ctx.currentTime; tone('sine', 320, t, 0.005, 0.32, 0.16, 110); tone('triangle', 640, t, 0.005, 0.18, 0.04, 220); },
    plop() { const t = ctx.currentTime; tone('sine', 260, t, 0.004, 0.18, 0.18, 620); nz(t + 0.05, 0.12, 'lowpass', 900, 300, 0.12, 0.8); },
  });

  // удары инструментов наказания (без жестокости — короткие «шлёп» и «вжух»)
  Object.assign(SFX, {
    slap() { const t = ctx.currentTime; nz(t, 0.07, 'highpass', 1800, 0, 0.32, 0.8); nz(t, 0.11, 'lowpass', 900, 250, 0.3, 0.8); tone('sine', 170, t, 0.002, 0.08, 0.1, 90); },
    smack() { const t = ctx.currentTime; tone('triangle', 820, t, 0.001, 0.07, 0.14, 380); nz(t, 0.06, 'bandpass', 2600, 1200, 0.22, 2); tone('sine', 1300, t + 0.01, 0.001, 0.12, 0.04, 1100); },
    swish2() { const t = ctx.currentTime; nz(t, 0.16, 'bandpass', 900, 4200, 0.16, 3); nz(t + 0.15, 0.06, 'highpass', 3000, 0, 0.3, 0.8); tone('triangle', 600, t + 0.15, 0.001, 0.05, 0.06, 300); },
    crack() { const t = ctx.currentTime; nz(t, 0.2, 'bandpass', 500, 3800, 0.14, 2.5); nz(t + 0.19, 0.035, 'highpass', 2500, 0, 0.5, 0.7); nz(t + 0.2, 0.12, 'bandpass', 1500, 700, 0.12, 1.5); },
  });

  // ---------- голос: мягкий формантный синтез (вздох, «м-м», смешок, ворчание, «ай!») ----------
  // Только короткие бытовые звуки: никакой «взрослой» вокализации.
  const VOW = {
    a: [[800, 90, 1], [1250, 110, 0.5], [2600, 160, 0.14]], i: [[310, 60, 1], [2250, 120, 0.42], [3000, 170, 0.18]],
    o: [[520, 70, 1], [900, 90, 0.5], [2500, 150, 0.08]], u: [[340, 60, 1], [780, 90, 0.3], [2300, 150, 0.05]],
    e: [[480, 70, 1], [1850, 110, 0.4], [2600, 150, 0.14]], y: [[380, 70, 1], [1500, 110, 0.35], [2450, 150, 0.1]],
    m: [[260, 60, 1], [1100, 260, 0.05], [2300, 300, 0.02]],
  };
  function voc(t, o) {
    const male = o.male, fk = male ? 0.86 : 1, base = (male ? 118 : 225) * (o.pitch || 1);
    const dur = o.dur, vol = (o.vol || 0.14), A = VOW[o.v0 || 'a'], B = VOW[o.v1 || o.v0 || 'a'];
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    const pts = o.f0 || [[0, 1], [1, 0.9]];
    src.frequency.setValueAtTime(base * pts[0][1], t);
    for (const [x, y] of pts.slice(1)) src.frequency.linearRampToValueAtTime(base * y, t + x * dur);
    let lfo = null;
    if (o.vib) { lfo = ctx.createOscillator(); lfo.frequency.value = o.vib; const lg = ctx.createGain(); lg.gain.value = base * 0.025; lfo.connect(lg); lg.connect(src.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    const pre = ctx.createBiquadFilter(); pre.type = 'lowpass'; pre.frequency.value = o.v0 === 'm' ? 900 : (o.lp || 3400);
    const vg = ctx.createGain(); vg.gain.value = o.voiced == null ? 1 : o.voiced;
    src.connect(pre); pre.connect(vg);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.06, dur * (o.att || 0.2)));
    out.gain.setValueAtTime(vol, t + dur * 0.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(sfxBus);
    let br = null;
    if (o.breath) {
      if (!wbuf) nz(t, 0.01, 'lowpass', 100, 0, 0.0001, 1);
      br = ctx.createBufferSource(); br.buffer = wbuf; br.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const bg = ctx.createGain(); bg.gain.value = o.breath; br.connect(hp); hp.connect(bg);
      br._g = bg; br.start(t, Math.random() * 0.5); br.stop(t + dur + 0.05);
    }
    A.forEach((fa, i) => {
      const fb = B[i], bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fa[0] * fk, t); bp.frequency.linearRampToValueAtTime(fb[0] * fk, t + dur * 0.85);
      bp.Q.value = fa[0] / fa[1];
      const gg = ctx.createGain(); gg.gain.value = fa[2] * 3.2;
      vg.connect(bp); if (br) br._g.connect(bp); bp.connect(gg); gg.connect(out);
    });
    src.start(t); src.stop(t + dur + 0.05);
  }
  const VOICE = {
    hum: (t, m) => voc(t, { male: m, v0: 'm', dur: 0.7, f0: [[0, 1], [0.35, 1.16], [1, 0.94]], vol: 0.16, vib: 5, breath: 0.03 }),
    content: (t, m) => { voc(t, { male: m, v0: 'm', dur: 0.22, f0: [[0, 1], [1, 1.05]], vol: 0.14 }); voc(t + 0.3, { male: m, v0: 'm', dur: 0.4, f0: [[0, 1.02], [0.5, 1.22], [1, 1.12]], vol: 0.15, vib: 5 }); },
    sigh: (t, m) => voc(t, { male: m, v0: 'a', v1: 'y', dur: 0.85, f0: [[0, 1.1], [1, 0.8]], vol: 0.12, voiced: 0.18, breath: 0.55, att: 0.35 }),
    giggle: (t, m) => { for (let i = 0; i < 4; i++) voc(t + i * 0.13, { male: m, v0: 'i', v1: 'e', dur: 0.09, pitch: 1.55 - i * 0.07, f0: [[0, 1.05], [1, 0.95]], vol: 0.12, breath: 0.3 }); },
    oh: (t, m) => voc(t, { male: m, v0: 'o', dur: 0.3, f0: [[0, 1], [1, 1.35]], vol: 0.13, breath: 0.1 }),
    grumble: (t, m) => voc(t, { male: m, v0: 'y', v1: 'm', dur: 0.5, pitch: 0.82, f0: [[0, 1], [0.4, 1.05], [1, 0.74]], vol: 0.13, lp: 2400, breath: 0.08 }),
    hmph: (t, m) => { voc(t, { male: m, v0: 'm', dur: 0.12, pitch: 0.95, vol: 0.06, voiced: 0.2, breath: 0.6 }); voc(t + 0.14, { male: m, v0: 'm', dur: 0.3, pitch: 0.9, f0: [[0, 1.1], [1, 0.8]], vol: 0.13 }); },
    yelp: (t, m) => voc(t, { male: m, v0: 'a', v1: 'i', dur: 0.3, f0: [[0, 1.3], [0.25, 2.0], [1, 1.45]], vol: 0.18, att: 0.08, breath: 0.12 }),
    ow: (t, m) => voc(t, { male: m, v0: 'u', v1: 'i', dur: 0.34, f0: [[0, 1.5], [0.3, 1.85], [1, 1.25]], vol: 0.17, att: 0.08, breath: 0.1 }),
    hiss: (t, m) => voc(t, { male: m, v0: 'i', v1: 'i', dur: 0.42, pitch: 1.2, f0: [[0, 1], [1, 0.95]], vol: 0.1, voiced: 0.04, breath: 0.9, lp: 6000, att: 0.05 }),
    grunt: (t, m) => voc(t, { male: m, v0: 'y', v1: 'a', dur: 0.2, pitch: 0.8, f0: [[0, 1.1], [0.3, 1.2], [1, 0.85]], vol: 0.2, att: 0.05, breath: 0.15, lp: 2600 }),
    whimper: (t, m) => voc(t, { male: m, v0: 'u', v1: 'y', dur: 0.6, f0: [[0, 1.45], [1, 1.1]], vol: 0.09, vib: 7, breath: 0.15 }),
  };
  // kind — тип звука, g — пол ('m'/'f'), delay — задержка в секундах
  function voice(kind, g, delay) { if (!ctx || !st.sfx || !VOICE[kind]) return; try { VOICE[kind](ctx.currentTime + 0.02 + (delay || 0), g === 'm'); } catch (e) { } }
  function sfx(name) { if (!ctx || !st.sfx) return; try { SFX[name] && SFX[name](); } catch (e) { } }

  // Мурчание: шум через полосовой фильтр, амплитуда модулируется частотой ~25 Гц (как у кошек),
  // плюс низкий гул. Ритм «вдох — выдох». strength 0..1 — громкость и длительность.
  let noiseBuf = null;
  function purr(strength = 0.6, cat = false) {
    if (!ctx || !st.sfx) return 0;
    if (!noiseBuf) { const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.5; } }
    const t0 = ctx.currentTime + 0.05;
    const cycles = Math.max(1, Math.round(1 + strength * 3));
    const vol = (cat ? 0.5 : 0.32) * (0.45 + strength * 0.55);
    let t = t0;
    for (let c = 0; c < cycles; c++) {
      for (const [len, rate, v] of [[0.95, 24, 1], [0.75, 27, 0.6]]) { // выдох громче, вдох тише и чуть выше
        const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cat ? 150 : 120; bp.Q.value = 0.9;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        const am = ctx.createGain(); am.gain.value = 0;
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = rate + Math.random();
        const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
        const dc = ctx.createConstantSource ? ctx.createConstantSource() : null;
        lfo.connect(lfoG); lfoG.connect(am.gain);
        if (dc) { dc.offset.value = 0.5; dc.connect(am.gain); dc.start(t); dc.stop(t + len + 0.1); } else am.gain.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + len * 0.3); g.gain.linearRampToValueAtTime(vol * v * 0.8, t + len * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + len);
        // низкий гул той же пульсации
        const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = cat ? 55 : 48;
        const humG = ctx.createGain(); humG.gain.value = 0.35;
        src.connect(bp); bp.connect(lp); lp.connect(am); hum.connect(humG); humG.connect(am); am.connect(g); g.connect(sfxBus);
        src.start(t); src.stop(t + len + 0.05); lfo.start(t); lfo.stop(t + len + 0.05); hum.start(t); hum.stop(t + len + 0.05);
        t += len + 0.05;
      }
    }
    return (t - t0) * 1000;
  }

  function apply() {
    if (master) master.gain.value = st.vol;
    if (musicBus) musicBus.gain.setTargetAtTime(st.music ? 0.55 : 0, ctx.currentTime, 0.3);
    if (sfxBus) sfxBus.gain.value = st.sfx ? 0.9 : 0;
    saveSt();
  }
  return {
    st, unlock, sfx, purr, voice, VOICES: Object.keys(VOICE),
    setMusic(v) { st.music = v; apply(); }, setSfx(v) { st.sfx = v; apply(); }, setVol(v) { st.vol = v; apply(); },
    get ready() { return !!ctx; },
  };
})();
window.addEventListener('pointerdown', () => Audio_.unlock(), { capture: true });
window.addEventListener('keydown', () => Audio_.unlock(), { capture: true });
