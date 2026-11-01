'use strict';
// ===== v10: Владения (мини-карта построек), цели, налоги и спрос, аукцион =====
// v11: модуль города (постройки, карта, события) — в js/city.js

// ===== Цели =====
const GOAL_POOL = [
  ['praise', 'Похвалить кого-нибудь', 1, 60, 0], ['talk', 'Поговорить с персонажем', 2, 50, 0], ['self', 'Поработать самому во Владениях', 1, 80, 0],
  ['assign', 'Поставить работника в постройку', 1, 60, 0], ['build', 'Построить или улучшить здание', 1, 150, 1], ['bid', 'Сделать ставку на аукционе', 1, 70, 0],
  ['touch', 'Приласкать (по-доброму)', 2, 40, 0], ['gift', 'Сделать подарок', 1, 70, 0], ['order', 'Отправить кого-то на заказ в таверне', 1, 90, 1],
];
const MILESTONES = [
  ['b1', 'Первая постройка', () => Object.values(S.est.b).some(b => b.lv), 300, 2],
  ['w3', 'Три работника во Владениях', () => S.owned.filter(c => c.bld).length >= 3, 400, 2],
  ['b3', 'Три разных постройки', () => Object.values(S.est.b).filter(b => b.lv).length >= 3, 600, 3],
  ['lv3', 'Здание 3-го уровня', () => Object.values(S.est.b).some(b => b.lv >= 3), 800, 3],
  ['rD', 'Ранг гильдии D', () => S.rep >= 15, 500, 0], ['own6', 'Шесть жителей в поместье', () => S.owned.length >= 6, 500, 2],
  ['auc', 'Выиграть лот на аукционе', () => S.auc.won >= 1, 300, 2], ['rC', 'Ранг гильдии C', () => S.rep >= 30, 1200, 0],
  ['lv5', 'Здание 5-го уровня', () => Object.values(S.est.b).some(b => b.lv >= 5), 2500, 5], ['g20', '20 000 монет в кассе', () => S.gold >= 20000, 1500, 5],
];
function goalsRoll() {
  const G = estOf() && S.goals;
  if (G.day === S.day) return G;
  const pool = GOAL_POOL.filter(p => !p[5] || p[5]()).sort(() => R() - 0.5).slice(0, 3);
  G.day = S.day; G.cnt = {}; G.list = pool.map(p => ({ id: p[0], t: p[1], need: p[2], rw: p[3] + S.day * 3, rep: p[4], done: false }));
  return G;
}
function goalBump(id) { try { const G = goalsRoll(); G.cnt[id] = (G.cnt[id] || 0) + 1; } catch (e) { } }
function goalClaim(i) {
  const G = goalsRoll(), q = G.list[i]; if (!q || q.done || (G.cnt[q.id] || 0) < q.need) return;
  q.done = true; S.gold += q.rw; S.rep += q.rep; sfx('coin'); toast(`Цель выполнена: +${q.rw} мон.${q.rep ? `, репутация +${q.rep}` : ''}`);
  if (G.list.every(x => x.done)) { S.gold += 150; S.rep += 1; toast('Все цели дня! Бонус +150 мон., репутация +1'); }
  save(); render();
}
function msClaim(id) {
  const m = MILESTONES.find(x => x[0] === id); if (!m || S.goals.ms[id] || !m[2]()) return;
  S.goals.ms[id] = S.day; S.gold += m[3]; S.rep += m[4]; sfx('coin'); toast(`Веха «${m[1]}»: +${fmt(m[3])} мон.${m[4] ? `, репутация +${m[4]}` : ''}`); save(); render();
}
function goalsPanel() {
  const G = goalsRoll(), ri = rankIdx(), nx = RANKS[ri + 1];
  const pr = nx ? Math.round((S.rep - RANKS[ri].rep) / (nx.rep - RANKS[ri].rep) * 100) : 100;
  const ms = MILESTONES.filter(m => !S.goals.ms[m[0]]).slice(0, 2);
  return `<div class="panel parchment goals-panel"><div class="panel-title">Цели</div>
    <div class="rank-bar small"><span>Ранг ${RANKS[ri].key}${nx ? ` → ${nx.key}: репутация ${S.rep}/${nx.rep}` : ' — высший'}</span><div class="bar"><i style="width:${clamp(pr, 0, 100)}%"></i></div></div>
    <div class="small muted">На сегодня (обновятся завтра):</div>
    ${G.list.map((q, i) => { const h = Math.min(q.need, G.cnt[q.id] || 0), ok = h >= q.need; return `<div class="goal ${q.done ? 'done' : ''}"><span>${q.done ? '✓' : ok ? '★' : '○'} ${q.t} ${q.need > 1 ? `(${h}/${q.need})` : ''}</span>${q.done ? '<small>получено</small>' : ok ? `<button class="btn small btn-primary" data-goal="${i}">+${q.rw}</button>` : `<small>+${q.rw}</small>`}</div>`; }).join('')}
    <div class="small muted" style="margin-top:4px">Вехи:</div>
    ${ms.map(m => { const ok = m[2](); return `<div class="goal"><span>${ok ? '★' : '◇'} ${m[1]}</span>${ok ? `<button class="btn small btn-primary" data-ms="${m[0]}">+${fmt(m[3])}</button>` : `<small>+${fmt(m[3])}${m[4] ? ` · реп. +${m[4]}` : ''}</small>`}</div>`; }).join('')}
  </div>`;
}

// ===== Аукцион =====
const BIDDERS = [
  { n: 'Скряга Мортимер', p: 'жадный: торгуется по монетке, сдаётся рано', lo: 0.75, hi: 1.05, agg: 0.55, say: ['Ещё монетка — и ни медяком больше!', 'Хм... ладно, накину.'] },
  { n: 'Вдова Ильза', p: 'азартная: перебивает почти всегда', lo: 0.95, hi: 1.45, agg: 0.9, say: ['Ха! Моё!', 'Не отдам, голубчик.'] },
  { n: 'Гном Бруни', p: 'расчётливый: знает цену и выше не идёт', lo: 1.0, hi: 1.15, agg: 0.8, say: ['По справедливости — столько.', 'Посчитано.'] },
  { n: 'Барон фон Штрудель', p: 'тщеславный: любит редкое, ненавидит проигрывать', lo: 0.9, hi: 1.6, agg: 0.7, say: ['Это украсит мой зал!', 'Барон не уступает!'] },
  { n: 'Тётушка Мэйбл', p: 'осторожная: ставит редко', lo: 0.7, hi: 1.0, agg: 0.4, say: ['Ох, ну разве что чуть-чуть...', 'Попробую.'] },
];
function aucRoll() {
  const A = estOf() && S.auc; if (A.next > S.day && A.lots.length) return A;
  A.next = S.day + 2; A.lots = [];
  const n = 3 + (rankIdx() >= 2 ? 1 : 0) + (typeof mktLv === 'function' && mktLv() ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const t = i === 0 ? 'slave' : pick(['gear', 'gear', 'item', 'rare']);
    let lot = { id: 'L' + (S.nextId++), t };
    if (t === 'slave') { const c = makeCharacter({ rarity: R() < 0.3 ? 3 : 2 }); lot.ch = c; lot.name = fn1(c) + ` (${c.race ? (RACES[c.race] ? RACES[c.race].name : c.race) : ''})`; lot.val = Math.round(corePrice(c)); }
    else if (t === 'gear') { const isO = R() < 0.4, base = pick(Object.keys(isO ? OUTFITS : ACCESSORIES)), q = R() < 0.4 ? 2 : 1, it = makeGear(isO ? 'outfit' : 'acc', base, Math.min(q, GEAR_Q.length - 1)); lot.it = it; lot.name = gearDef(it).name + ' · ' + GEAR_Q[it.q].name; lot.val = Math.round(gearVal(it) * 1.1); }
    else if (t === 'item') { const id = pick(Object.keys(ITEMS)), q = rint(3, 6); lot.item = id; lot.q = q; lot.name = `${ITEMS[id].name} ×${q}`; lot.val = ITEMS[id].price * q; }
    else { lot.item = 'amulet'; lot.q = 2; lot.name = 'Редкость: 2 амулета удачи с юга'; lot.val = 300; }
    lot.reserve = Math.round(lot.val * 0.6); lot.buyout = Math.round(lot.val * 1.35); lot.bid = 0; lot.done = false;
    S.auc.lots.push(lot);
  }
  return A;
}
let AUCS = null; // текущие торги
function aucFee() { return 0.08; }
function aucOpen(id) {
  const lot = S.auc.lots.find(l => l.id === id); if (!lot || lot.done) return;
  const bs = BIDDERS.slice().sort(() => R() - 0.5).slice(0, 3).map(b => ({ ...b, max: Math.round(lot.val * (b.lo + R() * (b.hi - b.lo))) }));
  AUCS = { lot, bs, cur: lot.reserve, lead: null, log: [`Стартовая цена (резерв) — ${fmt(lot.reserve)} мон. Торгуются: ${bs.map(b => b.n).join(', ')}.`] };
  aucRender();
}
function aucStep() { return Math.max(5, Math.round(AUCS.lot.val * 0.06 / 5) * 5); }
function aucRender() {
  const A = AUCS; if (!A) return; const st = aucStep(), my = A.lead === 'you';
  showModal('Торги: ' + A.lot.name, `<div class="auc-cur">Ставка: <b>${fmt(A.cur)}</b> мон. · лидер: <b>${A.lead ? (my ? 'вы' : A.lead) : '—'}</b></div>
    <div class="small muted">Рыночная оценка ≈ ${fmt(A.lot.val)} · выкуп сразу: ${fmt(A.lot.buyout)} · у вас ${fmt(S.gold)}</div>
    <div class="auc-bs">${A.bs.map(b => `<div class="small"><b>${b.n}</b> — ${b.p}${b.out ? ' · <i>выбыл</i>' : ''}</div>`).join('')}</div>
    <div class="auc-log">${A.log.slice(-6).map(l => `<div>${l}</div>`).join('')}</div>`, [
    { label: `Ставка ${fmt(A.lead ? A.cur + st : A.cur)}`, cls: 'btn-primary', act: () => aucBid() },
    { label: `Выкуп ${fmt(A.lot.buyout)}`, act: () => aucWin(A.lot.buyout, true) },
    { label: my ? 'Ждать (молоток)' : 'Пас', act: () => my ? aucHammer() : aucPass() }]);
}
function aucBid() {
  const A = AUCS, amt = A.lead ? A.cur + aucStep() : A.cur;
  if (amt > S.gold) return toast('Столько монет у вас нет.');
  if (A.lot.t === 'slave' && S.owned.length >= S.capacity) return toast('В поместье нет места для нового жителя.');
  A.cur = amt; A.lead = 'you'; A.log.push(`Вы: ${fmt(amt)}.`); goalBump('bid');
  // ответы соперников
  const alive = A.bs.filter(b => !b.out && b.max >= A.cur + aucStep());
  A.bs.forEach(b => { if (b.max < A.cur + aucStep() && !b.out) { b.out = true; A.log.push(`${b.n} качает головой и выходит из торгов.`); } });
  const r = alive.sort(() => R() - 0.5).find(b => R() < b.agg);
  if (r) { A.cur += aucStep(); A.lead = r.n; A.log.push(`${r.n}: «${pick(r.say)}» — ${fmt(A.cur)}.`); }
  else if (!alive.length) return aucHammer();
  else A.log.push('Зал затих...');
  aucRender();
}
function aucHammer() {
  const A = AUCS;
  if (A.lead === 'you') { const r = A.bs.filter(b => !b.out && b.max >= A.cur + aucStep()).find(b => R() < b.agg * 0.6); if (r) { A.cur += aucStep(); A.lead = r.n; A.log.push(`В последний миг ${r.n} поднимает руку — ${fmt(A.cur)}!`); return aucRender(); } return aucWin(A.cur); }
  aucPass();
}
function aucPass() { const A = AUCS; A.lot.done = true; A.lot.who = A.lead || 'никто'; addLog(`Аукцион: «${A.lot.name}» ушёл к ${A.lead || 'никому'}${A.lead ? ' за ' + fmt(A.cur) : ''}.`); AUCS = null; closeModal(); save(); render(); }
function aucWin(price, buyout) {
  const A = AUCS, lot = A.lot;
  if (price > S.gold) return toast('Столько монет у вас нет.');
  if (lot.t === 'slave' && S.owned.length >= S.capacity) return toast('В поместье нет места для нового жителя.');
  S.gold -= price; lot.done = true; lot.who = 'вы'; S.auc.won++;
  if (lot.ch) { const c = lot.ch; c.status = 'home'; c.boughtFor = price; c.task = 'rest'; S.owned.push(c); if (typeof migrateChar === 'function') try { migrateChar(c); } catch (e) { } }
  if (lot.it) S.stash.push(lot.it);
  if (lot.item) S.inv[lot.item] = (S.inv[lot.item] || 0) + lot.q;
  sfx('coin'); addLog(`Аукцион: вы ${buyout ? 'выкупили' : 'выиграли'} «${lot.name}» за ${fmt(price)} мон.`);
  AUCS = null; closeModal(); toast(`Молоток! «${lot.name}» ваш за ${fmt(price)} мон.`); save(); render();
}
function aucSellList(kind, ref) {
  const A = aucRoll(); if (A.sell.length >= 3) return toast('Не больше трёх своих лотов за раз.');
  let lot = null;
  if (kind === 'slave') { const c = findOwned(ref); if (!c || c.status !== 'home' || c.preg) return toast('Сейчас выставить нельзя.'); if (A.sell.some(s => s.uid === ref)) return; lot = { k: 'slave', uid: ref, name: fn1(c), val: sellPrice(c) }; }
  if (kind === 'gear') { const it = S.stash.find(x => x.iid === ref); if (!it) return; S.stash = S.stash.filter(x => x !== it); lot = { k: 'gear', it, name: gearDef(it).name, val: Math.round(gearVal(it) * 0.6) }; }
  if (kind === 'item') { if (!(S.inv[ref] > 0)) return; S.inv[ref]--; lot = { k: 'item', item: ref, name: ITEMS[ref].name, val: Math.round(ITEMS[ref].price * 0.6) }; }
  if (!lot) return;
  lot.reserve = Math.round(lot.val * 0.9); A.sell.push(lot); toast(`Выставлено: ${lot.name}. Итог — в конце дня.`); save(); render();
}
function aucResolveSells() {
  const A = estOf() && S.auc, out = []; if (!A.sell.length) return out;
  const keep = [];
  for (const l of A.sell) {
    const c = l.k === 'slave' ? findOwned(l.uid) : null;
    if (l.k === 'slave' && (!c || c.status !== 'home')) { if (c) keep.push(l); continue; }
    const price = Math.round(l.val * (0.75 + R() * 0.75)), fee = Math.round(Math.max(price, l.val) * aucFee());
    if (price < l.reserve) { const lf = Math.round(l.val * 0.02); S.gold -= lf; out.push(`Аукцион: «${l.name}» не продан (лучшая ставка ${fmt(price)} < резерва ${fmt(l.reserve)}). Сбор за лот −${lf}.`); if (l.k === 'gear') S.stash.push(l.it); if (l.k === 'item') S.inv[l.item] = (S.inv[l.item] || 0) + 1; continue; }
    S.gold += price - fee; S.totalEarned += price - fee;
    if (c) { S.owned = S.owned.filter(x => x !== c); }
    out.push(`Аукцион: «${l.name}» продан${c ? g(c, '', 'а') : ''} за ${fmt(price)} (на рынке ≈${fmt(l.val)}), комиссия −${fee}.`);
  }
  A.sell = keep; return out;
}
function viewAuction() {
  const A = aucRoll();
  const mine = homeChars().filter(c => !c.preg && !A.sell.some(s => s.uid === c.uid));
  const inv = Object.entries(S.inv).filter(([k, v]) => v > 0 && ITEMS[k]);
  return `<div class="screen-head"><h1>Аукцион «Молоток и мёд»</h1><div class="sub">Новые лоты раз в два дня (следующие — день ${A.next}). Торгуйтесь против купцов с характером.</div></div>
  <div class="panel parchment"><div class="panel-title">Лоты</div>
  ${A.lots.map(l => `<div class="auc-lot ${l.done ? 'done' : ''}"><div><b>${esc(l.name)}</b><div class="small muted">оценка ≈${fmt(l.val)} · старт ${fmt(l.reserve)} · выкуп ${fmt(l.buyout)}</div></div>${l.done ? `<small>ушло: ${esc(l.who)}</small>` : `<button class="btn btn-primary small" data-auc="${l.id}">Торговаться</button>`}</div>`).join('')}
  </div>
  <div class="panel parchment"><div class="panel-title">Продать через аукцион</div>
  <div class="small muted">Цена может выйти выше рынка (до +50%), но есть резерв 90% оценки и комиссия ${Math.round(aucFee() * 100)}%. Не продано — сбор 2% и вещь возвращается. Итог в конце дня.</div>
  ${A.sell.length ? `<div class="small" style="margin:6px 0">Выставлено: ${A.sell.map(s => `<b>${esc(s.name)}</b> (≈${fmt(s.val)})`).join(', ')}</div>` : ''}
  <div class="auc-sell">${mine.map(c => `<button class="chip" data-aucsell="slave:${c.uid}">${esc(fn1(c))} ≈${fmt(sellPrice(c))}</button>`).join('')}
  ${S.stash.slice(0, 8).map(it => `<button class="chip" data-aucsell="gear:${it.iid}">${esc(gearDef(it).name)}</button>`).join('')}
  ${inv.map(([k, v]) => `<button class="chip" data-aucsell="item:${k}">${ITEMS[k].name} (${v})</button>`).join('')}</div></div>`;
}

// ===== подключение =====
(function () {
  const oEnd = window.endDay;
  window.endDay = function () {
    estOf(); let aucLines = [];
    try { estDayStart(); aucLines = aucResolveSells(); } catch (e) { console.warn('v10 day', e); }
    try { return oEnd.apply(this, arguments); }
    finally { try { estDayEnd(); if (S.est.last) S.est.last.lines.push(...aucLines); save(); } catch (e) { console.warn('v10 end', e); } }
  };
  const oModal = window.showModal;
  window.showModal = function (title, html, btns) {
    try {
      const L = S.est && S.est.last;
      if (L && L.day === S.day - 1 && !L.shown && /report|Итог/i.test(html + title) && /report-total/.test(html)) {
        L.shown = true;
        const net = L.inc - L.upk - (L.tax || 0);
        if (L.lines.length || L.inc || L.upk) html = html.replace(/(<[^>]*class="[^"]*report-total)/, `<div class="est-rep"><div class="panel-title small">Город и аукцион</div>${L.lines.map(l => `<div class="small">${esc(l)}</div>`).join('')}<div class="small"><b>Город: доход +${fmt(L.inc)} − содержание ${fmt(L.upk)}${L.tax ? ` − сбор ${fmt(L.tax)}` : ''} = ${net >= 0 ? '+' : ''}${fmt(net)} мон.</b></div></div>$1`);
        html = html.replace(/Итог дня: <b class="(pos|neg)">([^<]*)<\/b> мон\./, (m0, cls, num) => {
          const base = parseInt(String(num).replace(/[^0-9\-−]/g, '').replace('−', '-'), 10) || 0, tot = base + net;
          return `Итог дня: <b class="${tot >= 0 ? 'pos' : 'neg'}">${tot >= 0 ? '+' : ''}${fmt(tot)}</b> мон.<div class="small muted">дела и заказы ${base >= 0 ? '+' : ''}${fmt(base)} · город ${net >= 0 ? '+' : ''}${fmt(net)}</div>`;
        });
      }
    } catch (e) { }
    return oModal.call(this, title, html, btns);
  };
  const oRender = window.render;
  window.render = function () {
    const r = oRender.apply(this, arguments);
    try {
      estOf();
      if (UI.screen === 'estate') $app().innerHTML = viewEstate();
      else if (UI.screen === 'auction') $app().innerHTML = viewAuction();
      else if (UI.screen === 'manor') { const h = document.querySelector('#screen .screen-head'); if (h) h.insertAdjacentHTML('afterend', goalsPanel()); }
      else if (UI.screen === 'card') { const c = findOwned(UI.cardUid); if (c && c.bld) { const h = document.querySelector('#screen .screen-head') || document.querySelector('#screen > *'); if (h) h.insertAdjacentHTML('afterend', `<div class="panel parchment est-note small">${c.bld[0] === '@' ? 'Строит' : 'Работает'} во Владениях: <b>${esc(bldLabel(c.bld))}</b> — обычные дела не выполняет. <button class="btn small" data-bldun="${c.uid}">Снять</button></div>`); } }
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === UI.screen));
    } catch (e) { console.warn('v10 render', e); }
    return r;
  };
  const oAct = window.act; window.act = function (uid, kind) { if (kind === 'praise') { const c = findOwned(uid); if (c && c.praisedDay !== S.day) goalBump('praise'); } return oAct.apply(this, arguments); };
  const oTouch = window.touch; if (oTouch) window.touch = function () { goalBump('touch'); return oTouch.apply(this, arguments); };
  const oUse = window.useItem; window.useItem = function () { goalBump('gift'); return oUse.apply(this, arguments); };
  const oAO = window.assignOrder; window.assignOrder = function (oid, uid) { const c = findOwned(uid); if (c && c.bld) c.bld = null; const n = S.owned.filter(x => x.status === 'order').length; const r = oAO.apply(this, arguments); if (S.owned.filter(x => x.status === 'order').length > n) goalBump('order'); return r; };
  if (window.aiSend) { const oS = window.aiSend; window.aiSend = function () { goalBump('talk'); return oS.apply(this, arguments); }; }
  const oSell = window.sell; window.sell = function (uid) { if (S.auc && S.auc.sell.some(s => s.uid === uid)) S.auc.sell = S.auc.sell.filter(s => s.uid !== uid); return oSell.apply(this, arguments); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-bld],[data-bldto],[data-bldun],[data-goal],[data-ms],[data-auc],[data-aucsell]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.bldto) { bldAssign(+t.dataset.bldto || t.dataset.bldto, t.dataset.k); render(); return bldModal(t.dataset.k); }
    if (t.dataset.bldun) { const c = findOwned(+t.dataset.bldun || t.dataset.bldun); const k = c && c.bld; bldAssign(c && c.uid, null); render(); if (k && document.getElementById('modal') && document.getElementById('modal').classList.contains('open')) bldModal(k); return; }
    if (t.dataset.bld) return bldModal(t.dataset.bld);
    if (t.dataset.goal) return goalClaim(+t.dataset.goal);
    if (t.dataset.ms) return msClaim(t.dataset.ms);
    if (t.dataset.auc) return aucOpen(t.dataset.auc);
    if (t.dataset.aucsell) { const [k, ...r] = t.dataset.aucsell.split(':'); const ref = r.join(':'); return aucSellList(k, k === 'slave' ? (+ref || ref) : ref); }
  }, true);
  try {
    HELP.push(['estate', 'Владения', () => `<p>Карта поместья: 7 участков. Постройте здание и улучшайте до 5-го уровня — оно растёт и меняет вид. Каждое здание даёт доход от работников, но требует содержания.</p><p>Работникам нужны свои навыки (например, каменоломне — Сила и Выносливость), а черты дают +25% (Трудолюбие, Выносливость, Обаяние...). Ниже требования — выработка ×0.6. В окне здания строка «Почему так» раскладывает доход по множителям.</p><p>Работник постройки весь день там и не берёт обычные дела. «Поработать самому» — раз в день, небольшой доход. Спрос на каждую постройку меняется ежедневно. Огород удешевляет еду, купальни лечат всех, библиотека учит, таверна иногда даёт репутацию. Раз в неделю гильдия берёт сбор.</p>`]);
    HELP.push(['auction', 'Аукцион и цели', () => `<p>Аукцион: раз в два дня новые лоты (житель, наряды, припасы, редкости). Соперники с характером: скряга сдаётся рано, азартная вдова перебивает. «Ставка» поднимает цену, «Ждать» — ударить молотком, «Выкуп» — забрать сразу.</p><p>Можно выставить своё: цена бывает выше рынка, но есть резерв и комиссия 8%. Итог в конце дня.</p><p>Цели: три задания на день с наградой, бонус за все три, вехи с крупными наградами и полоса до следующего ранга гильдии.</p>`]);
  } catch (e) { }
})();
