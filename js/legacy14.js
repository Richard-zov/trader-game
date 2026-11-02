'use strict';
// ===== v14.4: «Наследие» — мета-прогресс между карьерами, экран «Новая карьера» =====
const LG_KEY = 'trader_legacy_v14', LG_ARCH = 'trader_archive_v14';
const LG_PERKS = {
  gold: { n: 'Семейная кубышка', d: '+500 мон. на старте', max: 3, cost: [8, 16, 28] },
  rep: { n: 'Добрая молва', d: '+3 репутации на старте', max: 3, cost: [6, 12, 20] },
  pantry: { n: 'Полная кладовая', d: '+3 чая, +3 пряника, +1 пирог на старте', max: 1, cost: [5] },
  friend: { n: 'Верный друг', d: 'первый помощник реже обычного и лояльнее', max: 2, cost: [12, 24] },
  stw: { n: 'Старый приказчик', d: 'управляющий доступен с первого дня', max: 1, cost: [18] },
  thick: { n: 'Толстая кожа', d: 'мягкое банкротство наступает позже (порог −1000 мон.)', max: 1, cost: [15] },
};
const LG_SCEN = {
  heir: { n: 'Наследник поместья', d: 'Обычное начало: поместье, друг и большие планы.', need: () => true, needT: '' },
  merchant: { n: 'Купеческий отпрыск', d: '+1 500 мон. и +3 репутации, но долг ростовщику 1 000 мон.', need: L => L.careers.length >= 1, needT: 'после первой завершённой карьеры' },
  noble: { n: 'Опальный дворянин', d: '+12 репутации и +500 мон., но Ставрак уже вас невзлюбил.', need: L => L.careers.some(c => c.kind === 'win'), needT: 'после победы — звания главы гильдии' },
  ruin: { n: 'Из пепла', d: '800 мон., репутация 1, друг сомневается в вас. Очки наследия ×1,5.', need: L => L.careers.some(c => c.kind === 'bankrupt') || L.careers.length >= 2, needT: 'после банкротства или двух карьер' },
};
const LG_DIFFM = { easy: 0.8, norm: 1, hard: 1.3 };
function lgLoad() { let L = null; try { L = JSON.parse(localStorage.getItem(LG_KEY) || 'null'); } catch (e) { } L = L || {}; L.pts = L.pts || 0; L.total = L.total || 0; L.careers = L.careers || []; L.perks = L.perks || {}; return L; }
function lgSave(L) { try { localStorage.setItem(LG_KEY, JSON.stringify(L)); } catch (e) { } }
const lgPerk = k => (lgLoad().perks[k] || 0);
function lgChDone() { let n = 0; try { for (const k of Object.keys(CHAPTERS)) if (chDone(+k)) n++; } catch (e) { } return n; }
function lgArcs() { let n = 0; try { for (const c of S.owned) if (c.arc && c.arc.s >= 3) n++; } catch (e) { } return n; }
function legacyPts(kind, ep) {
  const C = carOf(); let cap = 0; try { cap = capital(); } catch (e) { }
  const parts = [['Звание', C.stage * 8], ['Главы сюжета', lgChDone() * 3], ['Капитал', Math.max(0, Math.min(20, Math.floor(cap / 2500)))], ['Репутация', Math.min(10, Math.floor((S.rep || 0) / 10))], ['Сбывшиеся мечты', lgArcs() * 2]];
  if (kind === 'win') parts.push(['Победа', 30]);
  if (ep && ep.bonus) parts.push([`Финал «${ep.title}»`, ep.bonus]);
  let p = parts.reduce((a, x) => a + x[1], 0);
  let m = (LG_DIFFM[C.diff] || 1) * (C.scen === 'ruin' ? 1.5 : 1) * (kind === 'bankrupt' ? 0.5 : kind === 'retire' ? 0.75 : 1);
  p = Math.max(kind === 'bankrupt' ? 3 : 1, Math.round(p * m));
  return { pts: p, parts, m };
}
function careerEnd(kind, silent) {
  const C = carOf(); if (C.ended) return C.ended;
  const ep = kind === 'win' && typeof endingOf === 'function' ? endingOf() : null;
  const P = legacyPts(kind, ep);
  const title = ep ? ep.title : { win: 'Глава Торговой гильдии', bankrupt: 'Дело закрыто', retire: 'Почётная отставка' }[kind] || 'Карьера окончена';
  C.ended = { kind, day: S.day, title, pts: P.pts, end: ep ? ep.k : null };
  const L = lgLoad(); L.pts += P.pts; L.total += P.pts;
  L.careers.push({ n: C.num || L.careers.length + 1, kind, title, stage: C.stage, st: CSTAGES[C.stage].n, days: S.day - (C.start || 1) + 1, cap: (() => { try { return capital(); } catch (e) { return 0; } })(), pts: P.pts, end: C.ended.end, scen: C.scen || 'heir', diff: C.diff || 'norm', who: S.owned.length });
  lgSave(L);
  try { cLog(`Карьера окончена: ${title}. Наследие +${P.pts}.`); addLog(`Карьера окончена: ${title}. Очки наследия +${P.pts}.`); } catch (e) { }
  save(); try { render(); } catch (e) { }
  if (silent) return C.ended;
  const chips = P.parts.filter(x => x[1]).map(([n, v]) => [`${n} +${v}`, true]); if (P.m !== 1) chips.push([`множитель ×${P.m.toFixed(2).replace(/\.?0+$/, '')}`, P.m > 1]);
  const lines = ep ? ep.lines.slice() : kind === 'bankrupt'
    ? ['Госпожа Бук закрывает папку, и звук этот похож на захлопнувшуюся дверь. Вывеску снимают аккуратно — почти с уважением.', 'Жильцы помогают донести сундуки. Кто-то плачет, кто-то делает вид, что это пыль.', 'Но опыт не продаётся с молотка. Всё, чему вы научились, переходит в <b>Наследие</b>.']
    : kind === 'retire' ? ['Вы передаёте ключи и печать с лёгким сердцем. Поместье остаётся жить своей жизнью.', 'Опыт и связи переходят в <b>Наследие</b> — с ними следующая карьера начнётся увереннее.']
      : ['Вы — глава Торговой гильдии. Печать тяжёлая, просители бесконечные, а мёд в Медовом Логе — всё такой же сладкий.'];
  lines.push(`Очки наследия: <b>+${P.pts}</b> (всего ${L.pts}).`);
  const btns = [{ label: 'Новая карьера', cls: 'btn-primary', act: () => { closeModal(true); newCareerModal(); } }];
  btns.push({ label: kind === 'bankrupt' ? 'Осмотреться напоследок' : 'Хозяйничать дальше', act: 'close' });
  csShow({ bg: ep ? ep.bg : kind === 'bankrupt' ? 'bg04' : 'bg06', kicker: ep ? 'Эпилог' : kind === 'bankrupt' ? 'Конец пути' : 'Итог карьеры', title, lines, chips, btns });
  return C.ended;
}
// ---------- экран «Новая карьера» ----------
let _lgSel = { scen: 'heir', diff: 'norm' };
function newCareerModal() {
  const L = lgLoad(), C = S && S.car ? carOf() : null;
  if (!LG_SCEN[_lgSel.scen] || !LG_SCEN[_lgSel.scen].need(L)) _lgSel.scen = 'heir';
  let h = `<div class="lg14"><div class="lg14-pts"><b>Наследие: ${L.pts}</b> <span class="small muted">очков · всего заработано ${L.total} · карьер ${L.careers.length}</span></div>`;
  if (C && !C.ended) { const P = legacyPts('retire'); h += `<p class="small">Текущая карьера №${C.num || 1} («${esc(CSTAGES[C.stage].n)}») будет завершена как <b>отставка</b>: +${P.pts} очков. Её сохранение уйдёт в архив — к нему можно вернуться отсюда же.</p>`; }
  else if (C && C.ended) h += `<p class="small">Текущая карьера завершена: «${esc(C.ended.title)}».</p>`;
  if (L.careers.length) h += `<details class="lg14-hist"><summary>Прошлые карьеры</summary><ul class="report">${L.careers.slice(-6).reverse().map(c => `<li class="${c.kind === 'win' ? 'star' : c.kind === 'bankrupt' ? 'warn' : ''}">№${c.n} · ${esc(LG_SCEN[c.scen] ? LG_SCEN[c.scen].n : '')}: ${esc(c.title)} — ${esc(c.st)}, ${c.days} дн., +${c.pts}</li>`).join('')}</ul></details>`;
  h += `<div class="panel-title">Начало</div><div class="lg14-sc">${Object.entries(LG_SCEN).map(([k, s]) => { const ok = s.need(L); return `<button class="lg14-card ${_lgSel.scen === k ? 'sel' : ''} ${ok ? '' : 'locked'}" data-lg="scen" data-id="${k}"><b>${s.n}</b><small>${ok ? esc(s.d) : '🔒 ' + esc(s.needT)}</small></button>`; }).join('')}</div>`;
  h += `<div class="panel-title">Сложность</div><div class="btn-row">${Object.entries(DIFF14).map(([k, d]) => `<button class="btn small ${_lgSel.diff === k ? 'btn-primary' : ''}" data-lg="diff" data-id="${k}">${d.n}${LG_DIFFM[k] !== 1 ? ` ×${LG_DIFFM[k]}` : ''}</button>`).join('')}</div>`;
  h += `<div class="panel-title">Наследие — навсегда</div><div class="lg14-perks">${Object.entries(LG_PERKS).map(([k, p]) => { const lv = L.perks[k] || 0, cost = p.cost[lv]; return `<div class="lg14-pk"><div><b>${p.n}</b> <span class="small">${'●'.repeat(lv)}${'○'.repeat(p.max - lv)}</span><div class="small muted">${esc(p.d)}</div></div>${lv < p.max ? `<button class="btn small ${L.pts >= cost ? '' : 'disabled'}" data-lg="perk" data-id="${k}">${cost} оч.</button>` : '<span class="small">✓</span>'}</div>`; }).join('')}</div>`;
  let arch = null; try { arch = localStorage.getItem(LG_ARCH); } catch (e) { }
  h += '</div>';
  const btns = [{ label: 'Начать карьеру', cls: 'btn-primary', act: () => lgStart() }];
  if (arch) btns.push({ label: 'Вернуться к прошлой карьере', act: () => confirmModal('Вернуться?', 'Текущая игра и архив поменяются местами.', 'Поменять', lgSwap) });
  btns.push({ label: 'Отмена', act: 'close' });
  showModal('Новая карьера', h, btns);
}
function lgStart() {
  const L = lgLoad(), sel = Object.assign({}, _lgSel);
  try { if (S && S.car && !S.car.ended && S.owned && S.owned.length) careerEnd('retire', true); } catch (e) { console.warn('lg retire', e); }
  try { if (S && S.owned) localStorage.setItem(LG_ARCH, JSON.stringify(S)); } catch (e) { }
  closeModal(true);
  newGame();
  const L2 = lgLoad(), C = carOf(); C.num = L2.careers.length + 1; C.scen = sel.scen; C.diff = sel.diff;
  const P = k => L2.perks[k] || 0; const fr = S.owned[0];
  S.gold += 500 * P('gold'); S.rep += 3 * P('rep');
  if (P('pantry')) { S.inv.tea = (S.inv.tea || 0) + 3; S.inv.gingerbread = (S.inv.gingerbread || 0) + 3; S.inv.pie = (S.inv.pie || 0) + 1; }
  if (P('friend') && fr) { fr.loyalty = Math.min(100, fr.loyalty + 10 * P('friend')); for (const k of Object.keys(fr.stats)) fr.stats[k] = Math.min(fr.pot[k], fr.stats[k] + 4 * P('friend')); }
  if (sel.scen === 'merchant') { S.gold += 1500; S.rep += 3; S.debt = (S.debt || 0) + 1000; }
  if (sel.scen === 'noble') { S.rep += 12; S.gold += 500; C.rv.heat = 40; }
  if (sel.scen === 'ruin') { S.gold = 800 + 500 * P('gold'); S.rep = 1 + 3 * P('rep'); if (fr) fr.loyalty = 35; }
  save(); go('manor');
  const sc = LG_SCEN[sel.scen];
  csShow({ bg: 'bg01', kicker: `Карьера №${C.num}`, title: sc.n, lines: [sc.d, L2.careers.length ? `За плечами ${L2.careers.length} ${L2.careers.length === 1 ? 'карьера' : L2.careers.length < 5 ? 'карьеры' : 'карьер'} — и кое-что из них перешло по наследству.` : 'Всё впереди. Даже Ставрак.'], chips: Object.entries(L2.perks).filter(([, v]) => v).map(([k, v]) => [`${LG_PERKS[k].n}${v > 1 ? ' ×' + v : ''}`, true]) });
}
function lgSwap() {
  let a = null; try { a = localStorage.getItem(LG_ARCH); } catch (e) { } if (!a) return toast('Архив пуст.');
  try { localStorage.setItem(LG_ARCH, JSON.stringify(S)); localStorage.setItem(SAVE_KEY, a); load(); save(); closeModal(true); go('manor'); toast('Вы вернулись к прошлой карьере.'); } catch (e) { toast('Не получилось: ' + e.message); }
}
// ---------- хуки ----------
(function () {
  const oModal = window.showModal;
  window.showModal = function (title, html, btns) {
    if (title === 'Меню' && Array.isArray(btns)) btns = btns.map(b => b && b.label === 'Новая игра' ? { label: 'Новая карьера', cls: b.cls, act: () => { closeModal(true); newCareerModal(); } } : b);
    return oModal.call(this, title, html, btns);
  };
  const oU = window.hasUnlock;
  window.hasUnlock = function (u) { if (u === 'steward' && lgPerk('stw')) return true; return oU.apply(this, arguments); };
  // порог мягкого банкротства — через capital() не трогаем; сдвигаем через долговой лимит гильдии
  if (window.riskDayEnd) { const oR = window.riskDayEnd; window.riskDayEnd = function (L) { if (!lgPerk('thick')) return oR.apply(this, arguments); const K = rkOf(), bk = K.bk; const r = oR.apply(this, arguments); try { if (K.bk > bk && capital() > -(2500 + 1000 * carOf().stage)) { K.bk = bk; if (L && L.length && /гильдия обеспокоена/.test(L[L.length - 1])) L.pop(); } } catch (e) { } return r; }; }
  const oP = window.careerPanel;
  if (oP) window.careerPanel = function () { let h = oP.apply(this, arguments); try { if (carOf().ended) h = h.replace(/(<div class="car14-b">[\s\S]*?)(<\/div><\/div>\s*)$/, '$1<button class="btn small btn-primary" data-lg="new">Новая карьера</button>$2'); if (carOf().ended && !/data-lg="new"/.test(h)) h = h.replace(/<\/div>\s*$/, '<div class="car14-b"><button class="btn small btn-primary" data-lg="new">Новая карьера</button></div></div>'); } catch (e) { } return h; };
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-lg]'); if (!t) return; ev.preventDefault(); ev.stopPropagation();
    const d = t.dataset, L = lgLoad();
    if (d.lg === 'new') return newCareerModal();
    if (d.lg === 'scen') { if (!LG_SCEN[d.id].need(L)) return toast('Откроется ' + LG_SCEN[d.id].needT + '.'); _lgSel.scen = d.id; return newCareerModal(); }
    if (d.lg === 'diff') { _lgSel.diff = d.id; return newCareerModal(); }
    if (d.lg === 'perk') { const p = LG_PERKS[d.id], lv = L.perks[d.id] || 0, cost = p.cost[lv]; if (lv >= p.max) return; if (L.pts < cost) return toast(`Нужно ${cost} очков наследия.`); L.pts -= cost; L.perks[d.id] = lv + 1; lgSave(L); toast(`Наследие: «${p.n}»`); return newCareerModal(); }
  }, true);
  try { HELP.push(['legacy', 'Наследие и новая карьера (v14)', () => `<p>Каждая карьера заканчивается: <b>победой</b> (звание главы гильдии и один из трёх финалов), <b>банкротством</b> (гильдия закрывает дело) или <b>отставкой</b> (если начать новую карьеру из меню).</p><p>За итог начисляются <b>очки наследия</b>: звание ×8, главы сюжета ×3, капитал, репутация, сбывшиеся мечты жильцов, +30 за победу и бонус финала. Банкротство — ×0,5, отставка — ×0,75; «Суровая» сложность ×1,3, «Уютная» ×0,8.</p><p>Очки тратятся на постоянные улучшения старта: ${Object.values(LG_PERKS).map(p => p.n.toLowerCase()).join(', ')}. Новые начала («Купеческий отпрыск», «Опальный дворянин», «Из пепла») открываются по мере опыта.</p><p>Прошлая карьера уходит в архив — к ней можно вернуться из экрана «Новая карьера». Старые сохранения считаются карьерой №1.</p>`]); } catch (e) { }
})();
