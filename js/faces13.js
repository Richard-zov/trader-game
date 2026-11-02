// ===== v13: новые лица =====
// Лицо — атлас из 9 кадров (радость, смущение, грусть, гнев, НЕЙТРАЛЬ, удивление, румянец, подмигивание, усталость)
// поверх лица пресета-носителя: причёска, тело и наряды остаются от пресета, меняются черты лица.
// Новым случайным персонажам (женщинам) лицо выдаётся случайно; пресеты, заданные явно, и уникальные — без изменений.
'use strict';
(function () {
  if (typeof FACE_META === 'undefined') return;
  const FACE_CHANCE = 0.85;
  const byHost = {};
  for (const id in FACE_META) (byHost[FACE_META[id].c] = byHost[FACE_META[id].c] || []).push(id);
  window.FACE_TOTAL = Object.keys(FACE_META).length;

  function allChars() {
    const out = [];
    try { out.push(...(S.owned || []), ...(S.market || [])); if (S.auc && Array.isArray(S.auc.lots)) for (const l of S.auc.lots) if (l && l.ch) out.push(l.ch); } catch (e) { }
    return out;
  }
  function pickFace(host) {
    const pool = byHost[host]; if (!pool || !pool.length) return null;
    const used = new Set(allChars().map(c => c && c.face).filter(Boolean));
    const free = pool.filter(id => !used.has(id));
    return pick(free.length ? free : pool);
  }
  window.pickFace = pickFace;
  function seen(id) { if (!id || typeof S === 'undefined' || !S) return; S.facesSeen = S.facesSeen || {}; if (!S.facesSeen[id]) S.facesSeen[id] = S.day || 1; }

  const oMake = window.makeCharacter;
  window.makeCharacter = function (opts) {
    opts = opts || {};
    const c = oMake.apply(this, arguments);
    try { if (c && !opts.preset && !c.unique && c.g === 'f' && R() < FACE_CHANCE) { const f = pickFace(c.preset); if (f) c.face = f; } } catch (e) { console.warn('face', e); }
    return c;
  };
  const oHeir = window.makeHeir2;
  if (oHeir) window.makeHeir2 = function (mother, father) {
    const child = oHeir.apply(this, arguments);
    try {
      if (child && child.g === 'f' && !child.unique) {
        const look = [mother, father].find(x => x && x.preset === child.preset && x.face);
        child.face = look && R() < 0.5 ? look.face : (R() < FACE_CHANCE ? pickFace(child.preset) : null);
        if (!child.face) delete child.face;
      }
    } catch (e) { console.warn('heir face', e); }
    return child;
  };

  // разметка портрета: помечаем картинки лицом
  const oRender = window.renderPortrait;
  window.renderPortrait = function (ch, size, extra) {
    let h = oRender.apply(this, arguments);
    try {
      const F = ch && ch.face && FACE_META[ch.face];
      if (F && ch.preset === F.c) {
        seen(ch.face);
        const key = artKeyFor(ch);
        const tag = `data-face="${ch.face}" data-fkey="${key}" data-fsz="${size}"`;
        h = h.replace('<img class="art-img"', `<img class="art-img" ${tag}`)
             .replace(/<img class="portrait-art art-(sm|md)"/, m => m.replace('<img ', `<img ${tag} `))
             .replace('class="portrait-art art-lg art-box" data-key=', `class="portrait-art art-lg art-box" data-face="${ch.face}" data-key=`);
      }
    } catch (e) { console.warn('face render', e); }
    return h;
  };

  // композиты: полный арт и миниатюра _face с нейтральным лицом
  const cache = new Map();
  function loadI(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  async function composite(id, key, sm) {
    const ck = id + '|' + key + '|' + (sm ? 1 : 0);
    if (cache.has(ck)) return cache.get(ck);
    const p = (async () => {
      const meta = ART_META[key]; if (!meta) return null;
      const isBase = key === FACE_META[id].c, dir = isBase ? PORTRAIT_CFG.artDir : PORTRAIT_CFG.outfitDir;
      const L = await Anim.faceNeutral(id, key, meta.w); if (!L) return null;
      if (sm) {
        const fb = FACE_FB[key]; if (!fb) return null;
        const im = await loadI(dir + key + '_face' + PORTRAIT_CFG.ext); if (!im) return null;
        const N = im.width, k = N / fb[2], cv = document.createElement('canvas'); cv.width = N; cv.height = N;
        const x = cv.getContext('2d'); x.drawImage(im, 0, 0); x.imageSmoothingQuality = 'high';
        x.drawImage(L.cv, (L.x - fb[0]) * k, (L.y - fb[1]) * k, L.cv.width * k, L.cv.height * k);
        return cv.toDataURL('image/webp', 0.88);
      }
      const im = await loadI(dir + key + PORTRAIT_CFG.ext); if (!im) return null;
      const cv = document.createElement('canvas'); cv.width = meta.w; cv.height = meta.h;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0, meta.w, meta.h); x.drawImage(L.cv, L.x, L.y);
      return cv.toDataURL('image/webp', 0.9);
    })();
    cache.set(ck, p); return p;
  }
  window.faceComposite = composite;
  async function fix(img) {
    if (img.dataset.fdone) return; img.dataset.fdone = '1';
    img.dataset.src0 = img.getAttribute('src');
    const url = await composite(img.dataset.face, img.dataset.fkey, img.dataset.fsz !== 'lg');
    if (url && img.isConnected) img.src = url;
  }
  function scan(root) { (root.querySelectorAll ? root : document).querySelectorAll('img[data-face]:not([data-fdone])').forEach(fix); }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches('img[data-face]')) fix(n); else scan(n); } })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => scan(document));

  // мини-игра: медальон с лицом
  const oZg = window.zgFace;
  if (oZg) window.zgFace = function (c, cb) {
    if (c && c.face && FACE_META[c.face]) {
      composite(c.face, artKeyFor(c), true).then(u => { if (!u) return oZg(c, cb); const im = new Image(); im.onload = () => cb(im); im.onerror = () => oZg(c, cb); im.src = u; });
      return;
    }
    return oZg.apply(this, arguments);
  };

  // «Альбом лиц»
  async function albumModal() {
    const ids = Object.keys(FACE_META), got = (S && S.facesSeen) || {};
    const n = ids.filter(i => got[i]).length;
    const cells = ids.map(i => `<div class="fa-cell ${got[i] ? 'on' : ''}" data-fa="${i}">${got[i] ? '' : '<span>?</span>'}</div>`).join('');
    showModal('Альбом лиц', `<p class="small">Встречено лиц: <b>${n}</b> из ${ids.length}. Новые лица появляются у случайных персонажей на рынке, на аукционе и у наследников.</p><div class="fa-grid">${cells}</div>`,
      [{ label: 'Закрыть', act: 'close' }]);
    for (const i of ids) {
      if (!got[i]) continue;
      const u = await composite(i, FACE_META[i].c, true);
      const el = document.querySelector(`.fa-cell[data-fa="${i}"]`); if (el && u) el.style.backgroundImage = `url('${u}')`;
    }
  }
  window.faceAlbumModal = albumModal;
  const oMenu = window.menuModal;
  window.menuModal = function () {
    const r = oMenu.apply(this, arguments);
    try {
      const box = document.querySelector('#modal .settings');
      if (box && !document.getElementById('btn-falbum')) {
        const n = Object.keys((S && S.facesSeen) || {}).filter(i => FACE_META[i]).length;
        box.insertAdjacentHTML('afterend', `<button class="btn" id="btn-falbum" style="width:100%;margin:6px 0">Альбом лиц · ${n}/${FACE_TOTAL}</button>`);
        document.getElementById('btn-falbum').addEventListener('click', albumModal);
      }
    } catch (e) { }
    return r;
  };
})();
