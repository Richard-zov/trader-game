// ===== Живые портреты: лёгкая деформация полноростового арта на canvas =====
// Дыхание, покачивание, наклон головы при поглаживании, подёргивание ушей у зверолюдей.
// Картинка режется на горизонтальные полоски, каждая смещается чуть-чуть — без швов и без доп. файлов.
'use strict';

const Anim = (() => {
  let cur = null;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

  async function mount() {
    const box = document.querySelector('.card-portrait .art-box');
    if (!box) { stop(); return; }
    if (cur && cur.box === box) return;
    stop();
    const img = box.querySelector('.art-img');
    const key = box.dataset.key, meta = (typeof ART_META !== 'undefined') && ART_META[key];
    if (!img || !meta || reduce) return;
    const base = await loadImg(img.getAttribute('src'));
    if (!base || !box.isConnected) return;
    const rect = box.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
    // собираем арт и головные уборы в один слой, чтобы шляпа качалась вместе с головой
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.drawImage(base, 0, 0, W, H);
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
    const neckY = headTop + headH * 1.05, shoulderY = neckY + headW * 0.3, waistY = headTop + (H - headTop) * 0.46;
    cur = {
      box, cv, ctx: cv.getContext('2d'), off, W, H, headTop, headH, neckY, shoulderY, waistY,
      beast: box.dataset.race === 'beast', ph: Math.random() * 6, tilt: 0, tiltT: 0, twitchAt: performance.now() + 2500, twitch: -1,
      pet: 0, last: 0, raf: 0, t0: performance.now(),
    };
    cur.raf = requestAnimationFrame(frame);
  }
  function stop() { if (cur) { cancelAnimationFrame(cur.raf); cur = null; } }

  function frame(now) {
    const c = cur; if (!c) return;
    if (!c.cv.isConnected) { stop(); return; }
    c.raf = requestAnimationFrame(frame);
    if (now - c.last < 32) return; // ~30 кадров в секунду
    const dt = Math.min(0.1, (now - (c.last || now)) / 1000); c.last = now;
    const t = (now - c.t0) / 1000;
    c.tilt += (c.tiltT - c.tilt) * Math.min(1, dt * 6);
    if (c.pet > 0) { c.pet -= dt; c.tiltT = Math.sin(t * 5.2) * 0.55 + 0.45; if (c.pet <= 0) c.tiltT = 0; }
    // уши/макушка: короткое подёргивание раз в несколько секунд
    let tw = 0;
    if (c.beast) {
      if (now > c.twitchAt) { c.twitch = now; c.twitchAt = now + 4000 + Math.random() * 5000; }
      const s = (now - c.twitch) / 1000; if (c.twitch > 0 && s < 0.7) tw = Math.sin(s * Math.PI * 2 * 7) * Math.exp(-s * 5);
    }
    const sway = Math.sin(t * 2 * Math.PI / 5.3 + c.ph), breathe = (Math.sin(t * 2 * Math.PI / 3.6) + 1) / 2;
    const { ctx, off, W, H, headTop, headH, neckY, shoulderY, waistY } = c;
    ctx.clearRect(0, 0, W, H);
    const strip = Math.max(2, Math.round(H / 260));
    const A = W * 0.006, T = W * 0.03, E = W * 0.012, B = H * 0.0045;
    for (let y = 0; y < H; y += strip) {
      const head = y < neckY ? Math.min(1, Math.pow((neckY - y) / (neckY - headTop), 0.8)) : 0;
      const ear = c.beast && y < headTop + headH * 0.35 ? (headTop + headH * 0.35 - y) / (headH * 0.35 + 1) : 0;
      const dx = sway * A * Math.pow((H - y) / H, 1.5) + c.tilt * T * head + tw * E * Math.min(1, ear);
      const lift = y < waistY ? Math.min(1, (waistY - y) / (waistY - shoulderY)) : 0;
      const dy = -breathe * B * lift + c.tilt * H * 0.004 * head;
      ctx.drawImage(off, 0, y, W, strip, dx, y + dy, W, strip + 1);
    }
  }

  // ---------- поглаживание ----------
  const HAND = `<svg viewBox="0 0 64 64"><path d="M14 40 C10 30 12 22 18 22 L20 24 L20 12 C20 8 26 8 26 12 L26 22 L27 8 C27 4 33 4 33 8 L33 22 L35 10 C35 6 41 6 41 10 L40 24 L43 16 C44 12 50 13 49 17 L46 34 C45 46 38 54 28 54 C21 54 17 48 14 40 Z" fill="#f6d2b0" stroke="#3b2616" stroke-width="2.4" stroke-linejoin="round"/><path d="M26 22 L26 30 M33 22 L33 30 M40 24 L39 31" stroke="#c9946a" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const HEART = `<svg viewBox="0 0 24 24"><path d="M12 21 C4 15 2 10 4.5 6.5 C7 3.5 11 4.5 12 8 C13 4.5 17 3.5 19.5 6.5 C22 10 20 15 12 21 Z" fill="#e8707a" stroke="#8a2a3a" stroke-width="1.5"/></svg>`;
  function pet(uid, strength, liked) {
    const cp = document.querySelector(`.card-portrait[data-uid="${uid}"]`); if (!cp) return;
    const box = cp.querySelector('.art-box'); if (!box) return;
    const meta = ART_META[box.dataset.key]; if (!meta) return;
    const hx = meta.cx * 100, hy = meta.top * 100, hw = meta.hw * 100;
    const headHf = meta.hw * 1.25 * meta.w / meta.h * 100;
    const fx = document.createElement('div'); fx.className = 'pet-fx';
    const dur = liked ? 1.6 + strength * 1.6 : 1.1;
    fx.innerHTML = `<div class="pet-hand" style="left:${hx}%;top:${hy + headHf * 0.05}%;width:${hw * 0.95}%;--d:${dur}s">${HAND}</div>
      <div class="pet-ripple" style="left:${hx}%;top:${hy + headHf * 0.25}%;width:${hw * 1.2}%"></div>
      ${liked ? `<div class="pet-blush" style="left:${hx - hw * 0.19}%;top:${hy + headHf * 0.64}%;width:${hw * 0.2}%"></div>
      <div class="pet-blush" style="left:${hx + hw * 0.19}%;top:${hy + headHf * 0.64}%;width:${hw * 0.2}%"></div>` : ''}
      ${liked ? Array.from({ length: 3 + Math.round(strength * 4) }, (_, i) => `<div class="pet-heart" style="left:${hx + (Math.random() - 0.5) * hw * 1.6}%;top:${hy + headHf * 0.3}%;--dl:${(0.25 + i * 0.22).toFixed(2)}s;--sx:${((Math.random() - 0.5) * 40).toFixed(0)}px;width:${(hw * (0.22 + Math.random() * 0.16)).toFixed(1)}%">${HEART}</div>`).join('') : ''}`;
    box.appendChild(fx);
    setTimeout(() => fx.remove(), (dur + 1.8) * 1000);
    if (cur && cur.box === box && liked) { cur.pet = dur; }
    cp.querySelector('.portrait').classList.add(liked ? 'petted' : 'flinch');
    setTimeout(() => { const p = cp.querySelector('.portrait'); p && p.classList.remove('petted', 'flinch'); }, dur * 1000 + 400);
  }
  return { mount, stop, pet };
})();
