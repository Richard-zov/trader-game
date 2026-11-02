// ===== v12.2: живописная карта «Владений» — фон, спрайты зданий 5 ступеней, стройка, анимация улучшения, пан/зум, «Что даёт уровень N» =====
'use strict';
const CITY_SPR = {"market":[[202,208],[226,239],[237,281],[268,341],[327,412]],"quarry":[[167,147],[187,180],[234,251],[320,318],[316,387]],"workshop":[[200,213],[215,242],[232,286],[259,346],[316,478]],"farm":[[149,145],[214,181],[261,227],[295,274],[335,372]],"tavern":[[187,180],[228,212],[219,260],[271,299],[371,340]],"baths":[[201,255],[224,301],[243,336],[247,328],[341,411]],"library":[[216,247],[155,357],[199,427],[255,495],[336,510]],"brothel":[[173,215],[182,279],[217,322],[331,382],[383,478]],"guard":[[200,209],[213,271],[175,283],[293,340],[317,423]],"houses":[[216,168],[248,194],[225,211],[256,261],[301,282]],"park":[[206,234],[215,230],[227,246],[249,286],[314,311]],"slavemkt":[[234,169],[256,193],[251,245],[257,204],[268,275]],"build":[[240,222],[231,234],[220,259],[243,372],[308,429]]};
const GRADE_N = ['', 'Лачуга', 'Скромное', 'Добротное', 'Аристократическое', 'Имперское'];
// участки перенесены на нарисованную карту (id прежние — сохранения не ломаются)
Object.assign(PLOTS.c1, { x: 138, y: 222 }); Object.assign(PLOTS.c2, { x: 222, y: 222 }); Object.assign(PLOTS.c3, { x: 138, y: 300 }); Object.assign(PLOTS.c4, { x: 222, y: 300 });
Object.assign(PLOTS.sq, { x: 180, y: 262 });
Object.assign(PLOTS.cr1, { x: 104, y: 114 }); Object.assign(PLOTS.cr2, { x: 156, y: 114 }); Object.assign(PLOTS.cr3, { x: 104, y: 154 }); Object.assign(PLOTS.cr4, { x: 156, y: 154 });
Object.assign(PLOTS.h1, { x: 268, y: 86 }); Object.assign(PLOTS.h2, { x: 284, y: 120 }); Object.assign(PLOTS.h3, { x: 276, y: 156 });
Object.assign(PLOTS.g1, { x: 44, y: 238 }); Object.assign(PLOTS.g2, { x: 50, y: 322 }); Object.assign(PLOTS.g3, { x: 306, y: 266 }); Object.assign(PLOTS.g4, { x: 312, y: 336 });
Object.assign(PLOTS.r1, { x: 62, y: 414 }); Object.assign(PLOTS.r2, { x: 150, y: 384 }); Object.assign(PLOTS.r3, { x: 226, y: 384 }); Object.assign(PLOTS.r4, { x: 300, y: 410 });
DISTRICTS.center.r = [96, 192, 168, 132];
DISTRICTS.craft.r = [74, 80, 112, 98];
DISTRICTS.hill.r = [208, 44, 136, 136];
DISTRICTS.gardens.r = [4, 196, 88, 158]; DISTRICTS.gardens.r2 = [268, 220, 88, 150];
DISTRICTS.river.r = [18, 350, 324, 96];

function sprOf(b) {
  const t = b.t, lv = b.lv;
  if (t === 'slavemkt') {
    if (!lv) { const st = b.stage || 0; return { k: 'slavemkt', g: st >= 1 ? 2 : 1, scaf: st >= 1 }; }
    return { k: 'slavemkt', g: Math.min(5, lv + 2), scaf: !!b.job };
  }
  if (!lv) { const p = b.job ? b.job.done / b.job.need : 0; return { k: 'build', g: Math.min(5, 1 + Math.floor(p * 5)), scaf: false }; }
  return { k: t, g: Math.min(5, lv), scaf: !!b.job };
}
function sprUrl(k, g) { return `assets/city/${k}${g}.webp`; }
function sprBox(k, g, plot) {
  const wh = (CITY_SPR[k] || CITY_SPR.build)[g - 1], kk = k === 'slavemkt' ? 0.22 : 0.18;
  let w = clamp(wh[0] * kk, 32, k === 'slavemkt' ? 82 : 64); if (PLOTS[plot] && PLOTS[plot].d === 'hill') w *= 0.88;
  const h = w * wh[1] / wh[0]; return { w, h };
}
function gradeOf(b) { return b.t === 'slavemkt' ? Math.min(5, (b.lv || 0) + 2) : b.lv; }
window.bldNode = function (id, b) {
  const P = PLOTS[b.plot], s = sprOf(b), { w, h } = sprBox(s.k, s.g, b.plot), E = estOf();
  E.seenLv = E.seenLv || {};
  const up = E.seenLv[id] != null && b.lv > E.seenLv[id]; E.seenLv[id] = b.lv;
  const foot = w * 0.2, y0 = foot - h;
  const scaf = s.scaf ? `<g class="scaf" opacity=".9"><path d="M${-w * 0.42} ${foot - 2} V${y0 + h * 0.3} M${w * 0.42} ${foot - 2} V${y0 + h * 0.3} M${-w * 0.42} ${y0 + h * 0.45} H${w * 0.42} M${-w * 0.42} ${y0 + h * 0.7} H${w * 0.42} M${-w * 0.42} ${y0 + h * 0.7} L${w * 0.42} ${y0 + h * 0.45}" stroke="#8a5f2e" stroke-width="1.8" stroke-linecap="round"/><text class="hammer" x="${w * 0.3}" y="${y0 + h * 0.35}" font-size="11">⚒</text></g>` : '';
  const prog = b.job ? `<rect x="-20" y="${foot + 3}" width="40" height="4.5" rx="2.2" fill="#1b140c" opacity=".75"/><rect x="-20" y="${foot + 3}" width="${40 * Math.min(1, b.job.done / b.job.need)}" height="4.5" rx="2.2" fill="#e8b445"/>` : '';
  const closed = b.closed === S.day ? `<text y="${y0 + 8}" font-size="10" text-anchor="middle">🔒</text>` : '';
  const glow = up ? `<ellipse class="up-glow" cx="0" cy="${foot * 0.2}" rx="${w * 0.7}" ry="${w * 0.36}" fill="url(#upg)"/>` : '';
  return `<g class="bld${up ? ' bld-up' : ''}${b.job ? ' bld-job' : ''}" data-cid="${id}" data-g="${s.k}${s.g}" transform="translate(${P.x} ${P.y})">${glow}<ellipse cx="${w * 0.06}" cy="${foot * 0.55}" rx="${w * 0.52}" ry="${w * 0.2}" fill="#0b0805" opacity=".5" filter="url(#shb)"/>`
    + `<g class="bld-in"><image href="${sprUrl(s.k, s.g)}" x="${-w / 2}" y="${y0}" width="${w}" height="${h}" preserveAspectRatio="none"/>${scaf}</g>${prog}${closed}`
    + `${up ? `<g class="sparks">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${Math.round(Math.cos(i) * w * 0.4)}" cy="${Math.round(y0 + h * 0.4 + Math.sin(i * 2) * h * 0.3)}" r="1.6" fill="#ffe9a0" style="animation-delay:${i * 0.12}s"/>`).join('')}</g>` : ''}`
    + `<rect x="${-w / 2}" y="${y0}" width="${w}" height="${h - y0 > 0 ? h : 40}" fill="transparent"/></g>`;
};
window.bldTag = function (id, b) {
  const P = PLOTS[b.plot], nm = (BT[b.t].short || BT[b.t].n).replace('Дом утех ', ''), txt = `${nm}${b.lv ? ' · ' + b.lv : ''}${b.job ? ' ⚒' : ''}`, w = Math.max(40, txt.length * 4.5 + 10);
  const s = sprOf(b), { w: sw } = sprBox(s.k, s.g, b.plot), y = P.y + sw * 0.2 + (b.job ? 9 : 2);
  return `<g class="bld-lab" data-cid="${id}"><rect x="${P.x - w / 2}" y="${y}" width="${w}" height="11.5" rx="5.75" fill="#1d150d" opacity=".78" stroke="#c9a25a" stroke-width=".6"/><text x="${P.x}" y="${y + 8.4}" text-anchor="middle" font-size="7.4" fill="#f6e6c2">${esc(txt)}</text></g>`;
};
window.mapSvg = function () {
  const E = estOf(), used = new Set(Object.values(E.b).map(b => b.plot));
  let s = `<svg viewBox="0 0 360 640" class="est-svg city-svg city-art"><defs><filter id="shb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter><filter id="fogb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter><radialGradient id="upg"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".95"/><stop offset="1" stop-color="#ffb640" stop-opacity="0"/></radialGradient><radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>`;
  s += `<image href="assets/city/bg.webp" x="0" y="0" width="360" height="640" preserveAspectRatio="none"/><rect width="360" height="640" fill="url(#vig)" pointer-events="none"/>`;
  for (const [k, D] of Object.entries(DISTRICTS)) {
    if (k === 'center' || E.dist[k]) continue;
    const rs = [D.r, D.r2].filter(Boolean);
    s += rs.map(r => `<g class="dist-lock" data-cdist="${k}"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="16" fill="#120d08" opacity=".58" filter="url(#fogb)"/><rect x="${r[0] + 3}" y="${r[1] + 3}" width="${r[2] - 6}" height="${r[3] - 6}" rx="12" fill="transparent" stroke="#d8b46a" stroke-opacity=".6" stroke-dasharray="5 4"/></g>`).join('');
    s += rs.map((r, i) => (k !== 'gardens' && i) ? '' : `<g data-cdist="${k}" class="dist-tag"><text x="${r[0] + r[2] / 2}" y="${r[1] + r[3] / 2 - 3}" text-anchor="middle" font-size="${r[2] < 100 ? 9 : 10.5}" fill="#f6e2b0" font-weight="700">${k === 'gardens' ? 'Сады' : D.n}</text><text x="${r[0] + r[2] / 2}" y="${r[1] + r[3] / 2 + 11}" text-anchor="middle" font-size="${r[2] < 100 ? 8 : 9.5}" fill="#f6e2b0">🔒 ${k === 'gardens' ? '' : 'купить · '}${fmt(D.cost)}</text></g>`).join('');
  }
  for (const [p, P] of Object.entries(PLOTS)) {
    if (used.has(p) || !E.dist[P.d]) continue;
    if (P.big) s += `<g class="plot plot-sq" data-csq="1"><ellipse cx="${P.x}" cy="${P.y}" rx="34" ry="20" fill="#000" fill-opacity="0"/><rect x="${P.x - 25}" y="${P.y + 16}" width="50" height="${mktLv() ? 12 : 20}" rx="5" fill="#1d150d" opacity=".72"/><text x="${P.x}" y="${P.y + 25}" text-anchor="middle" font-size="7.4" fill="#f6e6c2" font-weight="700">Площадь</text>${mktLv() ? '' : `<text x="${P.x}" y="${P.y + 33}" text-anchor="middle" font-size="6.2" fill="#e8d3a6">под рынок</text>`}</g>`;
    else s += `<g class="plot" data-cplot="${p}" transform="translate(${P.x} ${P.y})"><ellipse rx="17" ry="10" fill="#fff3c8" fill-opacity=".18" stroke="#ffe7a8" stroke-width="1.1" stroke-dasharray="3.5 2.5" class="plot-ring"/><text y="4" text-anchor="middle" font-size="12" fill="#fff3c8" font-weight="700">+</text></g>`;
  }
  const items = Object.entries(E.b).sort((a, b) => PLOTS[a[1].plot].y - PLOTS[b[1].plot].y);
  s += items.map(([id, b]) => bldNode(id, b)).join('') + items.map(([id, b]) => bldTag(id, b)).join('');
  return s + '</svg>';
};
// ---------- пан/зум ----------
const CZ = { z: 1, x: 0, y: 0 };
function czApply(box) {
  box = box || document.querySelector('.cz-box'); if (!box) return;
  const inner = box.querySelector('.cz-inner'), W = box.clientWidth, H = box.clientHeight;
  CZ.z = clamp(CZ.z, 1, 2.6); CZ.x = Math.min(0, Math.max(W - W * CZ.z, CZ.x)); CZ.y = Math.min(0, Math.max(H - inner.offsetHeight * CZ.z, CZ.y));
  inner.style.transform = `translate(${CZ.x}px, ${CZ.y}px) scale(${CZ.z})`;
  box.classList.toggle('zoomed', CZ.z > 1.01);
  const zl = box.parentNode.querySelector('.cz-lv'); if (zl) zl.textContent = '×' + CZ.z.toFixed(1);
}
function czZoom(f, cx, cy) {
  const box = document.querySelector('.cz-box'); if (!box) return;
  if (cx == null) { cx = box.clientWidth / 2; cy = box.clientHeight / 2; }
  const nz = clamp(CZ.z * f, 1, 2.6), k = nz / CZ.z; CZ.x = cx - (cx - CZ.x) * k; CZ.y = cy - (cy - CZ.y) * k; CZ.z = nz; czApply(box);
}
function czBind(box) {
  if (!box || box._cz) return; box._cz = 1;
  const pts = new Map(); let last = null, moved = 0, pinch = null;
  box.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; last = { x: e.clientX, y: e.clientY };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: CZ.z }; } });
  box.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = box.getBoundingClientRect();
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); czZoom(pinch.z * d / pinch.d / CZ.z, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); moved = 99; return; }
    if (CZ.z > 1.01 && last) { const dx = e.clientX - last.x, dy = e.clientY - last.y; moved += Math.abs(dx) + Math.abs(dy); CZ.x += dx; CZ.y += dy; czApply(box); }
    last = { x: e.clientX, y: e.clientY };
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = null; if (moved > 8) CZ.dragEnd = Date.now(); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', e => { e.preventDefault(); const r = box.getBoundingClientRect(); czZoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  box.addEventListener('dblclick', e => { const r = box.getBoundingClientRect(); czZoom(CZ.z > 1.8 ? 0.01 : 1.6, e.clientX - r.left, e.clientY - r.top); });
}
const _oViewEstate12 = window.viewEstate;
window.viewEstate = function () {
  let h = _oViewEstate12.apply(this, arguments);
  return h.replace(/<div class="est-map parchment">([\s\S]*?<\/svg>)<\/div>/, (m, svg) => `<div class="est-map city-frame"><div class="cz-box"><div class="cz-inner">${svg}</div></div><div class="cz-ctl"><button class="cz-b" data-cz="in" aria-label="Приблизить">＋</button><span class="cz-lv">×1.0</span><button class="cz-b" data-cz="out" aria-label="Отдалить">－</button><button class="cz-b" data-cz="fit" aria-label="Вся карта">⤢</button></div></div>`);
};
window.addEventListener('click', e => { if (CZ.dragEnd && Date.now() - CZ.dragEnd < 400 && e.target.closest && e.target.closest('.cz-box')) { CZ.dragEnd = 0; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cz]'); if (!b) return; const k = b.dataset.cz; if (k === 'in') czZoom(1.35); else if (k === 'out') czZoom(1 / 1.35); else { CZ.z = 1; CZ.x = 0; CZ.y = 0; czApply(); } });
new MutationObserver(() => { const box = document.querySelector('.cz-box'); if (box && !box._cz) { czBind(box); requestAnimationFrame(() => czApply(box)); } }).observe(document.documentElement, { childList: true, subtree: true });
// ---------- «Что даёт уровень N» ----------
function gradePerks(t, lv) {
  const B = BT[t], out = [];
  if (t === 'slavemkt') { out.push(`+${MKT.lots[lv]} лотов, скидка ${Math.round(MKT.disc[lv] * 100)}%, продажа +${Math.round(MKT.sell[lv] * 100)}%`, `загон ${MKT.stable[lv]} мест, покупателей в день ${MKT.buyers[lv]}, редкости +${Math.round(MKT.rare[lv] * 100)}%`); if (lv >= 2) out.push('бесплатное обновление лотов раз в день'); out.push(`репутация района +${5 * lv}, безопасность −${5 * lv}`); return out; }
  if (!B.noWork) { const sl = (B.slots || DEF_SLOTS)[lv]; out.push(`работников: ${sl}${lv > 1 && sl > (B.slots || DEF_SLOTS)[lv - 1] ? ' (+' + (sl - (B.slots || DEF_SLOTS)[lv - 1]) + ')' : ''}`); if (B.base) out.push(`выработка ×${(1 + 0.4 * (lv - 1)).toFixed(1)}, требование к навыкам ${12 + lv * 6}`); else out.push(`требование к навыкам ${12 + lv * 6}`); }
  const per = { market: [`репутация района +${2 * lv}`], quarry: ['можно копить камень на склад', `шум: репутация района −${2 * lv}`], workshop: ['можно копить инструменты на склад'], farm: [`еда в поместье дешевле на ${Math.min(45, 6 * lv)}% (все огороды вместе — до 45%)`], tavern: [`счастье +${2 * lv}, безопасность −${3 * lv}`], brothel: [`содержание ${15 + 10 * lv} мон./день; политика дома меняет доход и стресс`], baths: [`каждый день всем стресс −${3 * lv}, здоровье +${2 * lv}`, `счастье +${5 * lv}, репутация района +${3 * lv}`], library: [`репутация района +${6 * lv}`, 'работники понемногу умнеют'], guard: [`безопасность +${10 * lv}`, 'каждый стражник ещё +3'], houses: [`мест в поместье +${2 * lv}`, `счастье +${4 * lv}`], park: [`счастье +${4 * lv}, репутация района +${5 * lv}`] }[t] || [];
  out.push(...per);
  if (lv === 3) out.push('<b>Добротное:</b> крепкая утварь — выработка ещё ×1.05');
  if (lv === 4) out.push('<b>Аристократическое:</b> парадный фасад — репутация района +2');
  if (lv === 5) out.push('<b>Имперское:</b> роскошь — репутация района +4, счастье +2, утварь ×1.10');
  if (lv >= 3) { const m = bldMats(t, lv); if (matsTxt(m)) out.push(`<span class="muted">для улучшения нужно: ${matsTxt(m)}</span>`); }
  return out;
}
function gradeTable(b) {
  const max = BT[b.t].maxLv || 5; let h = '<div class="panel-title small" style="margin-top:8px">Ступени здания</div><div class="grades">';
  for (let lv = 1; lv <= max; lv++) {
    const g = b.t === 'slavemkt' ? lv + 2 : lv, cur = lv === b.lv, nxt = lv === b.lv + 1;
    h += `<div class="grade ${cur ? 'cur' : ''} ${lv < b.lv ? 'past' : ''} ${nxt ? 'next' : ''}"><img src="${sprUrl(b.t, g)}" alt="" loading="lazy"><div><b>Что даёт уровень ${lv}</b> · <i>${GRADE_N[g]}</i>${cur ? ' <span class="chip on">сейчас</span>' : nxt ? ' <span class="chip">следующий</span>' : ''}<ul>${gradePerks(b.t, lv).map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
  }
  return h + '</div>';
}
const _oBldModal12 = window.bldModal;
window.bldModal = function (id) {
  const r = _oBldModal12.apply(this, arguments);
  try {
    const key = String(id || '').replace(/^@/, ''), b = estOf().b[key], body = document.querySelector('#modal .modal-body'); if (!b || !body) return r;
    const pic = body.querySelector('.bld-pic'), s = sprOf(b);
    if (pic) { pic.classList.add('bld-pic-art'); pic.innerHTML = `<img src="${sprUrl(s.k, s.g)}" alt="">${b.lv ? `<div class="grade-cap">${GRADE_N[gradeOf(b)]}</div>` : `<div class="grade-cap">Стройка</div>`}`; }
    if (b.lv && !body.querySelector('.grades')) body.insertAdjacentHTML('beforeend', gradeTable(b));
  } catch (e) { console.warn(e); }
  return r;
};
