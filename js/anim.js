// ===== Живые портреты: деформация полноростового арта на canvas, 60 кадров =====
// Голова, руки (маятник от плеча), ноги (перенос веса), хвост (поворот от корня), дыхание, моргание,
// смена выражения лица (атласы assets/expr), реакции на прикосновения. Если кадр тяжёлый — сами снижаем частоту.
'use strict';

const Anim = (() => {
  let cur = null;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIM_KEY = 'trader_anim';
  function enabled() { const v = localStorage.getItem(ANIM_KEY); return v == null ? !reduce : v === '1'; }
  function setEnabled(on) { localStorage.setItem(ANIM_KEY, on ? '1' : '0'); applyBody(); }
  function applyBody() { document.documentElement.classList.toggle('no-anim', !enabled()); }
  applyBody();

  // ---------- плавности ----------
  const ease = {
    inOut: t => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2,
    out: t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3),
    back: t => { t = Math.min(1, Math.max(0, t)); const s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    bell: t => (t <= 0 || t >= 1) ? 0 : Math.sin(Math.PI * t),
  };
  // пружина с критическим затуханием: x тянется к target без рывков
  function spring(x0 = 0, k = 60) { return { x: x0, v: 0, t: x0, k }; }
  function stepSpring(s, dt) { const k = s.k, d = 2 * Math.sqrt(k) * 0.9; const a = k * (s.t - s.x) - d * s.v; s.v += a * dt; s.x += s.v * dt; }

  // ---------- эмоции над головой ----------
  const EMO = {
    sweat: '<svg viewBox="0 0 20 28"><path d="M10 2 C14 10 18 14 18 19 A8 8 0 0 1 2 19 C2 14 6 10 10 2 Z" fill="#9fd3f0" stroke="#2f5f7f" stroke-width="1.6"/><path d="M6 18 A4 4 0 0 0 9 23" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    zzz: '<span>z</span><span>z</span><span>Z</span>',
    hearts: '<svg viewBox="0 0 24 24"><path d="M12 21 C4 15 2 10 4.5 6.5 C7 3.5 11 4.5 12 8 C13 4.5 17 3.5 19.5 6.5 C22 10 20 15 12 21 Z" fill="#e8707a" stroke="#8a2a3a" stroke-width="1.5"/></svg>',
    anger: '<svg viewBox="0 0 24 24"><path d="M9 3 C9 7 7 9 3 9 M15 3 C15 7 17 9 21 9 M3 15 C7 15 9 17 9 21 M21 15 C17 15 15 17 15 21" fill="none" stroke="#d23a2a" stroke-width="3" stroke-linecap="round"/></svg>',
    preg: '<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#fbe3ea" stroke="#b05a78" stroke-width="1.6"/><ellipse cx="14" cy="17" rx="6.5" ry="5" fill="#fff" stroke="#b05a78" stroke-width="1.4"/><circle cx="14" cy="10" r="3.6" fill="#f6d2b0" stroke="#b05a78" stroke-width="1.4"/></svg>',
    heat: '<svg viewBox="0 0 28 28"><path d="M14 25 C6 20 4 15 6 11 C8 8 11 9 12 11 C11 7 13 4 16 3 C15 7 19 9 20 12 C22 16 20 22 14 25 Z" fill="#ff8fb0" stroke="#a03060" stroke-width="1.6"/><path d="M14 21 C11 19 10 17 11 15 C12 14 13 15 14 16 C15 14 17 15 17 17 C17 19 16 20 14 21 Z" fill="#fff0f5"/></svg>',
  };
  const EMO_TITLE = { sweat: 'Устал(а)', zzz: 'Клонит в сон', hearts: 'Счастлив(а)', anger: 'Раздражён(а)', preg: 'Ждёт малыша', heat: 'Течка: щёки горят, хочется внимания' };
  function decorate(box, meta) {
    const cp = box.closest('.card-portrait'); if (!cp) return;
    const old = box.querySelector('.emotes'); if (old) old.remove();
    const list = (cp.dataset.emote || '').split(',').filter(x => EMO[x]); if (!list.length) return;
    const headHf = meta.hw * 1.25 * meta.w / meta.h * 100;
    const wrap = document.createElement('div'); wrap.className = 'emotes';
    wrap.innerHTML = list.map((k, i) => `<div class="emo emo-${k}" title="${EMO_TITLE[k]}" style="left:${(meta.cx + meta.hw * (0.62 + i * 0.05)) * 100}%;top:${meta.top * 100 + headHf * (0.05 + i * 0.36)}%;width:${Math.min(15, Math.max(10, meta.hw * 110)).toFixed(1)}%">${EMO[k]}</div>`).join('');
    box.appendChild(wrap);
  }

  const imgCache = new Map();
  function loadImg(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    imgCache.set(src, p); return p;
  }

  // ---------- выражения лица ----------
  const EXPR_IDX = {}; if (typeof EXPR_LIST !== 'undefined') EXPR_LIST.forEach((n, i) => EXPR_IDX[n] = i);
  // старые имена реакций → кадры атласа
  const EXPR_ALIAS = { smile: 'happy', blush: 'shy', frown: 'angry', back: 'sad', neutral: null, calm: null };
  const EXPR_ALPHA = { tired: 0.78 };
  async function exprLayer(c, name) {
    if (!name || !c.em) return null;
    const j = EXPR_IDX[name]; if (j == null || c.em.ch.ok[j] !== '1') return null;
    if (c.exprCache[name]) return c.exprCache[name];
    const atlas = await loadImg(`assets/expr/${c.em.k.c}.webp`); if (!atlas || !cur || cur !== c) return null;
    const { x, y, w, h } = c.em.ch, [a, b, tx, ty] = c.em.k.m, gn = c.em.k.g || [1, 1, 1];
    // кадр с поправкой цвета под этот наряд/освещение
    const cell = document.createElement('canvas'); cell.width = w; cell.height = h;
    const cx = cell.getContext('2d'); cx.drawImage(atlas, j * w, 0, w, h, 0, 0, w, h);
    if (gn.some(v => Math.abs(v - 1) > 0.01)) {
      const id = cx.getImageData(0, 0, w, h), d = id.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * gn[0]); d[i + 1] = Math.min(255, d[i + 1] * gn[1]); d[i + 2] = Math.min(255, d[i + 2] * gn[2]); }
      cx.putImageData(id, 0, 0);
    }
    // в координатах холста: base → key (m) → холст (s)
    const s = c.W / c.meta.w;
    const M = [a * s, b * s, -b * s, a * s, (a * x - b * y + tx) * s, (b * x + a * y + ty) * s];
    // габариты слоя
    const pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([u, v]) => [M[0] * u + M[2] * v + M[4], M[1] * u + M[3] * v + M[5]]);
    const X0 = Math.floor(Math.min(...pts.map(p => p[0]))) - 1, Y0 = Math.floor(Math.min(...pts.map(p => p[1]))) - 1;
    const X1 = Math.ceil(Math.max(...pts.map(p => p[0]))) + 1, Y1 = Math.ceil(Math.max(...pts.map(p => p[1]))) + 1;
    const lay = document.createElement('canvas'); lay.width = Math.max(1, X1 - X0); lay.height = Math.max(1, Y1 - Y0);
    const lx = lay.getContext('2d'); lx.setTransform(M[0], M[1], M[2], M[3], M[4] - X0, M[5] - Y0); lx.imageSmoothingQuality = 'high'; lx.drawImage(cell, 0, 0);
    const L = { cv: lay, x: X0, y: Y0, cy: (Y0 + Y1) / 2, alpha: EXPR_ALPHA[name] || 1, name };
    c.exprCache[name] = L; return L;
  }
  async function setExpr(name, ms) {
    const c = cur; if (!c) return;
    name = EXPR_ALIAS.hasOwnProperty(name) ? EXPR_ALIAS[name] : name;
    if (ms) { c.exprUntil = performance.now() + ms; c.exprTemp = name; if (!c.live) setTimeout(() => { if (cur === c && c.exprUntil && performance.now() >= c.exprUntil) { c.exprUntil = 0; applyExpr(c, c.exprBase); } }, ms + 30); } else { c.exprBase = name; if (c.exprUntil > performance.now()) return; }
    await applyExpr(c, name);
  }
  async function applyExpr(c, name) {
    if (c.exprWant === name) return; c.exprWant = name;
    const L = await exprLayer(c, name);
    if (cur !== c || c.exprWant !== name) return;
    if (c.ex && c.ex.L === L) return;
    c.exPrev = c.ex ? { L: c.ex.L, a: c.ex.a } : null;
    c.ex = { L, a: 0, t0: performance.now() };
    if (!c.live) { c.ex.a = 1; c.exPrev = null; draw(c, performance.now()); }
  }

  // ---------- сборка ----------
  async function mount() {
    const box = document.querySelector('.card-portrait .art-box');
    if (!box) { stop(); return; }
    if (cur && cur.box === box) return;
    stop();
    const img = box.querySelector('.art-img');
    const key = box.dataset.key, meta = (typeof ART_META !== 'undefined') && ART_META[key];
    if (!img || !meta) return;
    decorate(box, meta);
    const live = enabled();
    const base = await loadImg(img.getAttribute('src'));
    if (!base || !box.isConnected) return;
    const rect = box.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
    const rig = (typeof RIG_META !== 'undefined') && RIG_META[key];
    const s = W / meta.w;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.drawImage(base, 0, 0, W, H);
    // хвост — отдельный слой: под ним дорисованный фон, сам он качается от корня
    let tail = null;
    if (rig && rig.tail && live) {
      const T = rig.tail;
      const [ti, ui] = await Promise.all([loadImg(`assets/tails/${key}.webp`), loadImg(`assets/tails/${key}_u.webp`)]);
      if (ti && ui) {
        o.clearRect(T.ux * s, T.uy * s, ui.width * s, ui.height * s);
        o.drawImage(ui, T.ux * s, T.uy * s, ui.width * s, ui.height * s);
        tail = { img: ti, x: T.x * s, y: T.y * s, w: T.w * s, h: T.h * s, rx: T.rx * s, ry: T.ry * s };
      }
    }
    for (const ov of box.querySelectorAll('.acc-ov')) {
      const im = await loadImg(ov.getAttribute('src')); if (!im) continue;
      const x = parseFloat(ov.style.left) / 100 * W, y = parseFloat(ov.style.top) / 100 * H;
      const w = parseFloat(ov.style.width) / 100 * W, h = w * im.height / im.width;
      const r = parseFloat(ov.style.getPropertyValue('--r')) || 0;
      o.save(); o.translate(x, y); o.rotate(r * Math.PI / 180); o.shadowColor = 'rgba(30,15,5,.35)'; o.shadowBlur = 2 * dpr; o.drawImage(im, -w / 2, -h / 2, w, h); o.restore();
    }
    if (!box.isConnected) return;
    const cv = document.createElement('canvas'); cv.className = 'art-cv'; cv.width = W; cv.height = H;
    box.appendChild(cv); box.classList.add('warp-on');
    const headTop = meta.top * H, headW = meta.hw * W, headH = headW * 1.25;
    const neckY = headTop + headH * 1.05;
    const shoulderY = rig ? rig.sh * H : neckY + headW * 0.3;
    const crotchY = rig ? rig.cr * H : H * 0.56;
    const waistY = headTop + (H - headTop) * 0.46;
    const cp = box.closest('.card-portrait'), md = (cp && cp.dataset.mood) || 'calm';
    const now0 = performance.now();
    const em = (typeof EXPR_META !== 'undefined') && EXPR_META.keys[key] ? { k: EXPR_META.keys[key], ch: EXPR_META.chars[EXPR_META.keys[key].c] } : null;
    // полосы рук: на каждой строке — где кончается рука и начинается торс
    let arms = null;
    if (rig) {
      const a0 = rig.ay0 * H, a1 = rig.ay1 * H, hb = Math.max(...rig.hands.map(p => p[1])) * H + H * 0.05;
      arms = { a0, a1: Math.max(a1, hb), n: rig.L.length, L: rig.L.map(v => v * W), R: rig.R.map(v => v * W), bcx: rig.bcx * W, span: a1 - a0 };
    }
    cur = {
      box, cv, ctx: cv.getContext('2d'), off, W, H, meta, rig, arms, tail, em, live, key,
      headTop, headH, headW, neckY, shoulderY, waistY, crotchY, md,
      beast: box.dataset.race === 'beast', ph: Math.random() * 6,
      tilt: spring(0, 40), nod: spring(0, 70), armL: spring(0, 25), armR: spring(0, 25), hip: spring(0, 18), shrug: spring(0, 60), lean: spring(0, 35), squish: spring(0, 90),
      tailA: spring(0, 30), twitchAt: now0 + 2500, twitch: -1, earBoost: 0,
      acts: [], last: 0, raf: 0, t0: now0, slowN: 0, fps: 60, strip: Math.max(2, Math.round(H / 260)), costs: [],
      eyes: meta.eyes ? meta.eyes.map(([x, y]) => [x * W, y * H]) : null, erx: (meta.erx || 0) * W, ery: (meta.ery || 0) * H, sk: meta.sk,
      blinkAt: now0 + 900 + Math.random() * 1500, blink: -1, dbl: false, squint: 0,
      idleAt: now0 + 4000 + Math.random() * 3000, idle: null, idleT: 0,
      droop: md === 'tired' ? 1 : md === 'sad' ? 0.6 : 0,
      sway: 0, breathe: 0, lid: 0, tw: 0, exprCache: {}, ex: null, exPrev: null, exprBase: null, exprTemp: null, exprUntil: 0, exprWant: undefined,
    };
    const c = cur;
    const be = cp && cp.dataset.expr; c.exprBase = be || null;
    if (be) await applyExpr(c, be);
    if (cur !== c) return;
    if (live) c.raf = requestAnimationFrame(frame); else draw(c, now0);
  }
  function stop() { if (cur) { cancelAnimationFrame(cur.raf); cur = null; } }

  // ---------- действия (реакции) ----------
  // play('headpat' | 'ears' | 'tail' | 'cheek' | 'shoulder' | 'back' | 'hand' | 'hair' | 'flinch' | 'bounce' | 'shake' | 'nod' | 'yawn' | 'sway')
  const ACT_DUR = { headpat: 2.4, ears: 1.6, tail: 2.2, cheek: 1.8, shoulder: 2.2, back: 1.4, hand: 2.4, hair: 2.6, flinch: 0.9, bounce: 1.1, shake: 1.0, nod: 1.0, yawn: 2.2, sway: 3.2 };
  function play(name, opts = {}) {
    const c = cur; if (!c) return;
    const now = performance.now();
    c.acts = c.acts.filter(a => a.name !== name);
    c.acts.push({ name, t0: now, dur: (opts.dur || ACT_DUR[name] || 1.5) * 1000, side: opts.side || (Math.random() < 0.5 ? -1 : 1), k: opts.k == null ? 1 : opts.k });
    if (!c.live) { /* без анимации — только выражение */ }
  }
  function actK(a, now) { return (now - a.t0) / a.dur; }

  function update(c, now, dt) {
    const t = (now - c.t0) / 1000;
    // цели по умолчанию — поза настроения
    let tilt = 0, nod = c.droop * 0.5, armL = 0, armR = 0, hip = 0, shrug = 0, lean = 0, squish = 0, tailT = 0, squint = 0;
    const slow = c.md === 'tired' ? 0.7 : c.md === 'happy' ? 1.15 : c.md === 'heat' ? 1.25 : 1;
    // идл: оглянуться, переступить, вздохнуть, поправить руки; у уставших — зевок
    if (now > c.idleAt && !c.acts.length) {
      const pool = c.md === 'tired' ? ['look', 'shift', 'yawn', 'sigh'] : c.md === 'happy' ? ['look', 'shift', 'bounce', 'arms', 'look'] : c.md === 'sad' ? ['look', 'sigh', 'sigh', 'shift'] : c.md === 'heat' ? ['shift', 'shift', 'look', 'arms', 'sway'] : ['look', 'look', 'shift', 'sigh', 'arms'];
      c.idle = pool[Math.floor(Math.random() * pool.length)]; c.idleT = now; c.idleSide = Math.random() < 0.5 ? -1 : 1;
      c.idleAt = now + (c.md === 'heat' ? 3500 : 5500) + Math.random() * 6000;
      if (c.idle === 'yawn') play('yawn'); if (c.idle === 'bounce') play('bounce', { k: 0.5 }); if (c.idle === 'sway') play('sway');
    }
    const it = c.idle ? (now - c.idleT) / 1000 : 0;
    if (c.idle === 'look') { tilt += c.idleSide * 0.32 * ease.bell(it / 2.4); if (it > 2.4) c.idle = null; }
    else if (c.idle === 'shift') { hip += c.idleSide * ease.bell(it / 2.6); if (it > 2.6) c.idle = null; }
    else if (c.idle === 'sigh') { if (it > 2.6) c.idle = null; }
    else if (c.idle === 'arms') { const k = ease.bell(it / 2.4); armL += -0.5 * k; armR += 0.5 * k; if (it > 2.4) c.idle = null; }
    else if (c.idle && it > 3) c.idle = null;
    const sighK = c.idle === 'sigh' ? ease.bell(it / 2.4) : 0;
    // реакции
    for (const a of c.acts) {
      const k = actK(a, now), e = ease.bell(k) * a.k, sd = a.side;
      switch (a.name) {
        case 'headpat': tilt += Math.sin(k * Math.PI * 4) * 0.35 * e + 0.25 * e * sd; nod += 0.35 * e; squint = Math.max(squint, e); break;
        case 'hair': tilt += sd * 0.45 * e + Math.sin(k * Math.PI * 3) * 0.12 * e; squint = Math.max(squint, e * 0.7); break;
        case 'ears': c.earBoost = Math.max(c.earBoost, e); tilt += sd * 0.2 * e; squint = Math.max(squint, e * 0.8); break;
        case 'tail': tailT += Math.sin(k * Math.PI * 9) * 1.2 * e; hip += sd * 0.6 * e; lean += 0.3 * e; break;
        case 'cheek': tilt += sd * 0.55 * e; squish += 0.8 * e; squint = Math.max(squint, e * 0.5); break;
        case 'shoulder': shrug += (k < 0.25 ? ease.out(k / 0.25) : 1 - ease.inOut((k - 0.25) / 0.75) * 1.6) * a.k; nod += 0.25 * e; break;
        case 'back': lean += Math.sin(k * Math.PI * 3) * 0.5 * e; nod -= 0.2 * e; break;
        case 'hand': if (sd < 0) armL += -1.6 * e; else armR += 1.6 * e; tilt += sd * 0.2 * e; break;
        case 'flinch': lean -= 0.9 * e; shrug += 0.7 * e; tilt += sd * 0.3 * e; armL += 0.5 * e; armR -= 0.5 * e; break;
        case 'bounce': nod -= 0.5 * Math.abs(Math.sin(k * Math.PI * 2)) * a.k; shrug += 0.4 * Math.abs(Math.sin(k * Math.PI * 2)) * a.k; armL -= 0.4 * e; armR += 0.4 * e; break;
        case 'shake': tilt += Math.sin(k * Math.PI * 6) * 0.4 * e; break;
        case 'nod': nod += Math.sin(k * Math.PI * 4) * 0.6 * e; break;
        case 'yawn': nod -= 0.6 * e; shrug += 0.5 * e; armL -= 0.3 * e; armR += 0.3 * e; squint = Math.max(squint, e); break;
        case 'sway': hip += Math.sin(k * Math.PI * 2) * 0.9 * e; tilt += Math.sin(k * Math.PI * 2 + 1) * 0.2 * e; tailT += Math.sin(k * Math.PI * 4) * 0.6 * e; break;
      }
    }
    c.acts = c.acts.filter(a => actK(a, now) < 1);
    // хвост: ленивое покачивание, быстрее у счастливых и в течке
    const tailRate = c.md === 'happy' ? 1.3 : c.md === 'heat' ? 1.6 : c.md === 'tired' ? 0.5 : c.md === 'sad' ? 0.4 : 0.8;
    tailT += Math.sin(t * tailRate * 2.1 + c.ph) * 0.45 + Math.sin(t * 5.3) * 0.08;
    c.tilt.t = tilt; c.nod.t = nod; c.armL.t = armL; c.armR.t = armR; c.hip.t = hip; c.shrug.t = shrug; c.lean.t = lean; c.squish.t = squish; c.tailA.t = tailT;
    for (const sp of [c.tilt, c.nod, c.armL, c.armR, c.hip, c.shrug, c.lean, c.squish, c.tailA]) stepSpring(sp, dt);
    c.squint += (squint - c.squint) * Math.min(1, dt * 8);
    c.earBoost *= Math.pow(0.2, dt);
    // уши
    c.tw = 0;
    if (c.beast) {
      if (now > c.twitchAt) { c.twitch = now; c.twitchAt = now + 3500 + Math.random() * 5000; }
      const s = (now - c.twitch) / 1000; if (c.twitch > 0 && s < 0.7) c.tw = Math.sin(s * Math.PI * 2 * 7) * Math.exp(-s * 5);
      c.tw += Math.sin(t * 22) * c.earBoost * 0.9;
    }
    c.sway = Math.sin(t * slow * 2 * Math.PI / 5.3 + c.ph);
    c.breathe = Math.min(1.6, (Math.sin(t * slow * 2 * Math.PI / 3.6) + 1) / 2 + sighK * 0.9);
    // моргание
    let lid = 0;
    if (c.eyes) {
      if (now > c.blinkAt) { c.blink = now; c.dbl = Math.random() < 0.2; c.blinkAt = now + 2600 + Math.random() * 3600; }
      const dur = c.md === 'tired' ? 420 : 200, s0 = now - c.blink;
      const one = (s) => s < 0 || s > dur ? 0 : s < dur * 0.4 ? ease.inOut(s / (dur * 0.4)) : s < dur * 0.55 ? 1 : 1 - ease.inOut((s - dur * 0.55) / (dur * 0.45));
      if (c.blink > 0) lid = Math.max(one(s0), c.dbl ? one(s0 - dur - 90) : 0);
      lid = Math.max(lid, c.squint * 0.85);
      if (c.md === 'tired') lid = Math.max(lid, 0.35);
    }
    const exn = c.ex && c.ex.L && c.ex.L.name;
    if (exn === 'happy' || exn === 'sleepy' || exn === 'wink' || exn === 'tired' || exn === 'shy' && c.squint < 0.3) lid = exn === 'shy' ? lid : 0;
    c.lid = lid;
    // временное выражение истекло — вернуть базовое
    if (c.exprUntil && now > c.exprUntil) { c.exprUntil = 0; applyExpr(c, c.exprBase); }
    if (c.ex && c.ex.a < 1) { c.ex.a = Math.min(1, (now - c.ex.t0) / 260); if (c.ex.a >= 1) c.exPrev = null; }
  }

  // смещение строки y для головы/торса (без рук и ног)
  function rowOff(c, y) {
    const { H, W, headTop, neckY, shoulderY, waistY } = c;
    const head = y < neckY ? Math.min(1, Math.pow((neckY - y) / (neckY - headTop), 0.8)) : 0;
    const up = y < waistY ? Math.min(1, (waistY - y) / (waistY - shoulderY)) : 0;
    const legs = y > c.crotchY ? (y - c.crotchY) / (H - c.crotchY) : 0;
    const A = W * 0.006 * (c.live ? 1 : 0);
    let dx = c.sway * A * Math.pow((H - y) / H, 1.5) + c.tilt.x * W * 0.03 * head + c.lean.x * W * 0.01 * up * up;
    dx += c.hip.x * W * 0.008 * (y < c.crotchY ? Math.min(1, Math.max(0, (y - shoulderY) / (c.crotchY - shoulderY))) * 0.7 + 0.3 * (1 - up) : 1 - legs);
    let dy = -c.breathe * H * 0.0045 * up + (c.nod.x * 0.006) * H * head - c.shrug.x * H * 0.006 * (y < shoulderY + c.headW * 0.4 ? Math.min(1, up * 1.2) : 0);
    // сжатие щёк: голова чуть приплющивается
    if (head > 0 && c.squish.x > 0.01) dy += c.squish.x * H * 0.003 * head;
    return [dx, dy];
  }

  function draw(c, now) {
    const { ctx, off, W, H, crotchY } = c;
    ctx.clearRect(0, 0, W, H);
    const strip = c.strip, ar = c.arms;
    const ov = W * 0.008;
    for (let y = 0; y < H; y += strip) {
      const [dx, dy] = rowOff(c, y);
      if (ar && y >= ar.a0 && y < ar.a1) {
        const i = Math.min(ar.n - 1, Math.max(0, Math.floor((y - ar.a0) / ar.span * ar.n)));
        const Lx = ar.L[i], Rx = ar.R[i];
        const dist = (y - c.shoulderY) / (H * 0.3);
        // торс с запасом под руки
        ctx.drawImage(off, Lx - ov, y, Rx - Lx + 2 * ov, strip, Lx - ov + dx, y + dy, Rx - Lx + 2 * ov, strip + 1);
        const aL = c.armL.x, aR = c.armR.x;
        const lx = dx + aL * W * 0.018 * dist, ly = dy - Math.abs(aL) * H * 0.004 * dist * dist;
        const rx = dx + aR * W * 0.018 * dist, ry = dy - Math.abs(aR) * H * 0.004 * dist * dist;
        if (Lx > 0) ctx.drawImage(off, 0, y, Lx, strip, lx, y + ly, Lx, strip + 1);
        if (Rx < W) ctx.drawImage(off, Rx, y, W - Rx, strip, Rx + rx, y + ry, W - Rx, strip + 1);
      } else if (ar && y > crotchY) {
        // ноги: ненагруженная чуть сгибается в колене
        const bx = ar.bcx, lk = Math.sin(Math.PI * (y - crotchY) / (H - crotchY));
        const bendL = Math.max(0, -c.hip.x) * lk * W * 0.005, bendR = Math.max(0, c.hip.x) * lk * W * 0.005;
        ctx.drawImage(off, 0, y, bx, strip, dx + bendL, y + dy, bx, strip + 1);
        ctx.drawImage(off, bx, y, W - bx, strip, bx + dx - bendR, y + dy, W - bx, strip + 1);
      } else {
        // уши зверолюдей: верх головы подёргивается
        let ex = 0;
        if (c.beast && y < c.headTop + c.headH * 0.35) ex = c.tw * W * 0.012 * Math.min(1, (c.headTop + c.headH * 0.35 - y) / (c.headH * 0.35 + 1));
        ctx.drawImage(off, 0, y, W, strip, dx + ex, y + dy, W, strip + 1);
      }
    }
    // хвост — поворот от корня, корень едет вместе с бёдрами
    if (c.tail) {
      const T = c.tail, [rdx, rdy] = rowOff(c, T.ry);
      ctx.save(); ctx.translate(T.rx + rdx, T.ry + rdy); ctx.rotate(c.tailA.x * 0.1);
      ctx.drawImage(T.img, T.x - T.rx, T.y - T.ry, T.w, T.h); ctx.restore();
    }
    // лицо: выражение поверх, с той же качкой головы
    const drawEx = (e, a) => {
      if (!e || !e.L || a <= 0) return;
      const [fx, fy] = rowOff(c, e.L.cy);
      ctx.globalAlpha = a * e.L.alpha; ctx.drawImage(e.L.cv, e.L.x + fx, e.L.y + fy); ctx.globalAlpha = 1;
    };
    if (c.exPrev) drawEx(c.exPrev, 1 - (c.ex ? c.ex.a : 0));
    if (c.ex) drawEx(c.ex, c.ex.a);
    if (c.live && c.lid > 0.02 && c.sk && c.eyes) drawLids(c, c.lid, (y) => rowOff(c, y));
  }

  function frame(now) {
    const c = cur; if (!c) return;
    if (!c.cv.isConnected) { stop(); return; }
    c.raf = requestAnimationFrame(frame);
    // 60 кадров; если устройство не успевает — 30
    const minGap = c.fps >= 60 ? 0 : 30;
    if (now - c.last < minGap) return;
    const dt = Math.min(0.05, (now - (c.last || now)) / 1000); c.last = now;
    const t0 = performance.now();
    update(c, now, dt || 0.016);
    draw(c, now);
    const cost = performance.now() - t0;
    c.costs.push(cost); if (c.costs.length > 40) c.costs.shift();
    if (c.costs.length === 40) {
      const avg = c.costs.reduce((a, b) => a + b, 0) / 40;
      if (avg > 7 && c.fps === 60) { c.fps = 30; c.costs = []; }
      else if (avg > 9 && c.strip < 6) { c.strip++; c.costs = []; }
    }
  }

  function drawLids(c, k, off) {
    const { ctx, erx, ery, sk } = c;
    const rx = erx * 1.12, ry = ery * 1.55;
    for (const [ex, ey] of c.eyes) {
      const [ox, oy] = off(ey), X = ex + ox, Y = ey + oy;
      const edge = Y - ry + k * ry * 2 * 0.92;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      const g = ctx.createLinearGradient(0, Y - ry, 0, edge);
      g.addColorStop(0, sk); g.addColorStop(1, shade(sk, 0.86));
      ctx.fillStyle = g; ctx.fillRect(X - rx - 1, Y - ry - 1, rx * 2 + 2, edge - (Y - ry) + 1);
      ctx.restore();
      if (k > 0.25) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (k - 0.25) * 2);
        ctx.strokeStyle = '#2a1a12'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, ery * 0.42);
        ctx.beginPath(); ctx.moveTo(X - rx * 0.92, edge - ry * 0.12); ctx.quadraticCurveTo(X, edge + ry * 0.32 * k, X + rx * 0.92, edge - ry * 0.12); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.round((n >> 16) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
  }

  // ---------- геометрия зон прикосновения (в % от art-box) ----------
  function zoneGeom(key, race) {
    const m = ART_META[key]; if (!m) return null;
    const r = (typeof RIG_META !== 'undefined') && RIG_META[key];
    const asp = m.w / m.h, headHf = m.hw * 1.25 * asp; // высота головы в долях H
    const cx = m.cx, top = m.top, hw = m.hw;
    const ey = m.eyes ? (m.eyes[0][1] + m.eyes[1][1]) / 2 : top + headHf * 0.5;
    const exs = m.eyes ? [m.eyes[0][0], m.eyes[1][0]] : [cx - hw * 0.18, cx + hw * 0.18];
    const d = Math.abs(exs[1] - exs[0]) || hw * 0.35;
    const sh = r ? r.sh : top + headHf * 1.4, bcx = r ? r.bcx : cx;
    const z = {};
    const box = (x, y, w, h) => ({ x: (x - w / 2) * 100, y: (y - h / 2) * 100, w: w * 100, h: h * 100 });
    z.head = box(cx, top + headHf * 0.13, hw * 0.75, headHf * 0.24);
    if (race === 'beast') { z.earL = box(cx - hw * 0.34, top + headHf * 0.06, hw * 0.3, headHf * 0.2); z.earR = box(cx + hw * 0.34, top + headHf * 0.06, hw * 0.3, headHf * 0.2); }
    else if (race === 'elf') { z.earL = box(exs[0] - d * 1.05, ey, hw * 0.2, headHf * 0.22); z.earR = box(exs[1] + d * 1.05, ey, hw * 0.2, headHf * 0.22); }
    z.cheekL = box(exs[0] - d * 0.1, ey + d * 0.55 * asp, d * 0.55, d * 0.5 * asp);
    z.cheekR = box(exs[1] + d * 0.1, ey + d * 0.55 * asp, d * 0.55, d * 0.5 * asp);
    z.hairL = box(cx - hw * 0.52, top + headHf * 0.62, hw * 0.24, headHf * 0.4);
    z.hairR = box(cx + hw * 0.52, top + headHf * 0.62, hw * 0.24, headHf * 0.4);
    z.shoulderL = box(bcx - hw * 0.62, sh + 0.012, hw * 0.4, headHf * 0.3);
    z.shoulderR = box(bcx + hw * 0.62, sh + 0.012, hw * 0.4, headHf * 0.3);
    if (r) { z.handL = box(r.hands[0][0] - 0.01, r.hands[0][1], hw * 0.42, headHf * 0.36); z.handR = box(r.hands[1][0] + 0.01, r.hands[1][1], hw * 0.42, headHf * 0.36); }
    else { z.handL = box(cx - hw * 0.9, 0.5, hw * 0.4, headHf * 0.35); z.handR = box(cx + hw * 0.9, 0.5, hw * 0.4, headHf * 0.35); }
    if (race === 'beast') {
      if (r && r.tail) { const T = r.tail; z.tail = box((T.x + T.w * 0.6) / m.w, (T.y + T.h * 0.55) / m.h, Math.min(0.3, T.w / m.w), Math.min(0.25, T.h / m.h * 0.7)); }
      else z.tail = box(bcx + hw * 0.95, (r ? r.cr : 0.55) - 0.03, hw * 0.4, headHf * 0.4);
    }
    return z;
  }

  // ---------- прикосновение: рука, эффект и движение тела ----------
  const HAND = `<svg viewBox="0 0 64 64"><path d="M14 40 C10 30 12 22 18 22 L20 24 L20 12 C20 8 26 8 26 12 L26 22 L27 8 C27 4 33 4 33 8 L33 22 L35 10 C35 6 41 6 41 10 L40 24 L43 16 C44 12 50 13 49 17 L46 34 C45 46 38 54 28 54 C21 54 17 48 14 40 Z" fill="#f6d2b0" stroke="#3b2616" stroke-width="2.4" stroke-linejoin="round"/><path d="M26 22 L26 30 M33 22 L33 30 M40 24 L39 31" stroke="#c9946a" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const HEART = `<svg viewBox="0 0 24 24"><path d="M12 21 C4 15 2 10 4.5 6.5 C7 3.5 11 4.5 12 8 C13 4.5 17 3.5 19.5 6.5 C22 10 20 15 12 21 Z" fill="#e8707a" stroke="#8a2a3a" stroke-width="1.5"/></svg>`;
  const ZONE_ACT = { head: 'headpat', ears: 'ears', tail: 'tail', cheek: 'cheek', shoulder: 'shoulder', back: 'back', hand: 'hand', hair: 'hair' };
  const HAND_MOTION = { head: 'stroke', hair: 'comb', ears: 'rub', tail: 'stroke', cheek: 'pinch', shoulder: 'knead', back: 'pat', hand: 'hold' };
  function touch(uid, zone, strength, liked, side) {
    const cp = document.querySelector(`.card-portrait[data-uid="${uid}"]`); if (!cp) return;
    const box = cp.querySelector('.art-box'); if (!box) return;
    const meta = ART_META[box.dataset.key]; if (!meta) return;
    const zg = zoneGeom(box.dataset.key, box.dataset.race) || {};
    const sd = side || (Math.random() < 0.5 ? -1 : 1);
    const zk = zone === 'head' || zone === 'back' ? 'head' : zone + (sd < 0 ? 'L' : 'R');
    let g = zg[zk] || zg[zone + 'L'] || zg.head;
    if (zone === 'back') g = { x: zg.shoulderL.x, y: zg.shoulderL.y + 3, w: zg.shoulderR.x + zg.shoulderR.w - zg.shoulderL.x, h: zg.shoulderL.h };
    const hx = g.x + g.w / 2, hy = g.y + g.h / 2, hw = meta.hw * 100;
    const fx = document.createElement('div'); fx.className = 'pet-fx';
    const dur = liked ? 1.5 + strength * 1.4 : 1.0;
    const blush = (zone === 'cheek' || zone === 'head' || zone === 'ears' || zone === 'hand' || zone === 'tail' || zone === 'hair') && liked;
    const headHf = meta.hw * 1.25 * meta.w / meta.h * 100;
    const ey = meta.eyes ? (meta.eyes[0][1] + meta.eyes[1][1]) / 2 * 100 : meta.top * 100 + headHf * 0.5;
    fx.innerHTML = `<div class="pet-hand hm-${HAND_MOTION[zone] || 'stroke'}${sd > 0 ? ' flip' : ''}" style="left:${hx}%;top:${hy}%;width:${hw * (zone === 'hand' || zone === 'cheek' ? 0.7 : 0.9)}%;--d:${dur}s">${HAND}</div>
      <div class="pet-ripple" style="left:${hx}%;top:${hy}%;width:${hw * 0.9}%"></div>
      ${blush ? `<div class="pet-blush" style="left:${meta.cx * 100 - hw * 0.19}%;top:${ey + headHf * 0.14}%;width:${hw * 0.2}%"></div>
      <div class="pet-blush" style="left:${meta.cx * 100 + hw * 0.19}%;top:${ey + headHf * 0.14}%;width:${hw * 0.2}%"></div>` : ''}
      ${liked ? Array.from({ length: 2 + Math.round(strength * 4) }, (_, i) => `<div class="pet-heart" style="left:${hx + (Math.random() - 0.5) * hw * 1.2}%;top:${hy}%;--dl:${(0.25 + i * 0.22).toFixed(2)}s;--sx:${((Math.random() - 0.5) * 40).toFixed(0)}px;width:${(hw * (0.2 + Math.random() * 0.14)).toFixed(1)}%">${HEART}</div>`).join('') : ''}`;
    box.appendChild(fx);
    setTimeout(() => fx.remove(), (dur + 1.8) * 1000);
    if (cur && cur.box === box) play(liked ? (ZONE_ACT[zone] || 'headpat') : 'flinch', { side: sd, k: liked ? 0.6 + 0.4 * strength : 1, dur: liked ? dur : 0.9 });
    const p = cp.querySelector('.portrait'); p.classList.add(liked ? 'petted' : 'flinch');
    setTimeout(() => { p.classList.remove('petted', 'flinch'); }, dur * 1000 + 400);
  }
  function pet(uid, strength, liked) { touch(uid, 'head', strength, liked); }
  function setMood(md) { if (cur) { cur.md = md; cur.droop = md === 'tired' ? 1 : md === 'sad' ? 0.6 : 0; } }
  function redecorate() { if (cur) decorate(cur.box, cur.meta); }
  return { mount, stop, pet, touch, play, setExpr, setMood, zoneGeom, redecorate, enabled, setEnabled, ease };
})();
