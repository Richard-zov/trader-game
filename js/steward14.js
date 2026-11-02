'use strict';
// ===== v14.2: Управляющий и «Пропустить N дней» =====
// Управляющий (житель или наёмный Фрол Счётов) по утрам делает рутину по вашим правилам:
// отдых уставшим, угощения грустным, безопасные заказы, гашение долга, подготовка к ревизии, лекарь, продажа из загона.
// «Пропустить N дней» — прокрутка дней подряд; останавливается на важном (сюжет, заботы, звание, испытание, ропот, рождение…).
const STW_HIRE = { n: 'Фрол Счётов', d: 'наёмный управляющий в нарукавниках, считает быстрее, чем говорит' };
const STW_DEF = { on: false, uid: null, tasks: 'rest', rest: 65, treats: true, budget: 80, orders: true, ordMin: 0.75, debt: true, risk: true, sell: false, reserve: 600, events: true, dig: [] };
function stwOf() { const C = carOf(); if (!C.stw) C.stw = JSON.parse(JSON.stringify(STW_DEF)); for (const k in STW_DEF) if (C.stw[k] === undefined) C.stw[k] = JSON.parse(JSON.stringify(STW_DEF[k])); return C.stw; }
const stwUnl = () => !!(S && S.car && hasUnlock('steward'));
const stwOn = () => stwUnl() && stwOf().on && !carOf().ended;
function stwWho() { const W = stwOf(); const c = W.uid ? findOwned(W.uid) : null; return c && c.status !== 'gone' ? c : null; }
function stwFee() { return stwWho() ? 0 : 25 + 5 * carOf().stage; }
function stwSkill(c) { c = c === undefined ? stwWho() : c; if (!c) return 50; return Math.round(((c.stats.int || 0) + (c.stats.wil || 0) + (c.stats.cha || 0) * 0.5) / 2.5); }
const stwFree = () => Math.max(0, S.gold - stwOf().reserve);

// ---------- утренняя рутина (перед подсчётом дня) ----------
function stwPre() {
  const W = stwOf(), L = [], act = [];
  if (!stwOn()) return L;
  const who = stwWho(), sk = stwSkill(who), disc = Math.max(0.7, 1 - (sk - 40) / 200);
  // жалованье или усталость управляющего
  const fee = stwFee(); if (fee) { S.gold -= fee; act.push(`жалованье ${fmt(fee)}`); }
  else if (who) { who.fatigue = clamp(who.fatigue + 4); if (S.day % 5 === 0) loyaltyGain(who, 1); }
  // распорядок
  if (W.tasks !== 'off') {
    let nr = 0, nw = 0;
    for (const c of S.owned) {
      if (c.status !== 'home' || isAuto(c) || c.manualDay === S.day) continue;
      const tired = c.sickDays > 0 || c.health < 45 || c.fatigue >= W.rest || c.stress >= 70 || mood(c) < 30;
      if (tired && c.task !== 'rest') { c.task = 'rest'; nr++; }
      else if (!tired && W.tasks === 'all') { const r = autoPick(c); if (r && r.task !== c.task) { c.task = r.task; nw++; } }
    }
    if (nr) act.push(`отдых ${nr}`); if (nw) act.push(`дела ${nw}`);
  }
  // угощения
  if (W.treats) {
    let spent = 0, n = 0;
    const want = S.owned.filter(c => c.status !== 'gone' && (mood(c) < 45 || c.stress >= 55)).sort((a, b) => mood(a) - mood(b));
    for (const c of want) {
      const id = c.stress >= 55 && mood(c) >= 40 ? 'tea' : 'gingerbread', pr = Math.round(ITEMS[id].price * disc);
      if (S.inv[id] > 0) { S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; }
      else if (spent + pr <= W.budget && stwFree() >= pr) { S.gold -= pr; spent += pr; }
      else continue;
      if (id === 'tea') c.stress = clamp(c.stress - 20); else c.moodMod = (c.moodMod || 0) + 15 * (has(c, 'gourmet') ? 2 : 1);
      n++;
    }
    if (n) act.push(`угощения ${n}${spent ? ` (−${fmt(spent)})` : ''}`);
  }
  // безопасные заказы
  if (W.orders) {
    let n = 0;
    for (const o of S.orders.filter(o => !o.assigned && o.expires >= S.day)) {
      if (n >= 2) break;
      const cs = S.owned.filter(c => c.status === 'home' && !c.preg && !(c.sickDays > 0) && c.fatigue < 45 && c !== who && c.manualDay !== S.day);
      let best = null, bp = 0; for (const c of cs) { const p = orderChance(c, o); if (p > bp) { bp = p; best = c; } }
      if (best && bp >= W.ordMin) { o.assigned = best.uid; o.daysLeft = ORDER_TEMPLATES[o.tpl].days; best.status = 'order'; best.orderId = o.id; n++; L.push(`⚙ Управляющий: ${fn1(best)} — на заказ «${ORDER_TEMPLATES[o.tpl].title}» (шанс ${Math.round(bp * 100)}%).`); }
    }
    if (n) act.push(`заказы ${n}`);
  }
  // долг ростовщику
  if (W.debt && S.debt > 0 && stwFree() > 50) { const v = Math.min(S.debt, stwFree()); S.debt -= v; S.gold -= v; act.push(`долг −${fmt(v)}`); }
  // заботы: ревизия, лекарь
  if (W.risk && typeof rkOf === 'function' && rkOn()) {
    const K = rkOf(), C = carOf();
    if (C.stage >= 1 && K.insp && K.insp.day - S.day <= 1 && !K.prep && inspIssues().length) { const cost = 80 + 40 * C.stage; if (stwFree() >= cost) { S.gold -= cost; K.prep = 1; for (const c of S.owned) c.discipline = clamp((c.discipline || 0) + 8); act.push(`порядок к ревизии (−${cost})`); } }
    if (K.out && !K.out.cured) { const cost = 120 + 30 * S.owned.length; if (stwFree() >= cost) { S.gold -= cost; K.out.cured = 1; for (const c of S.owned) if (c.sickDays > 0) { c.sickDays = Math.max(0, c.sickDays - 1); c.health = clamp(c.health + 10); } act.push(`лекарь (−${cost})`); } }
  }
  // загон: продать тех, кто ждёт покупателя больше 2 дней
  if (W.sell) { try { const E = estOf(); let n = 0, sum = 0; for (const c of (E.stable || []).slice()) { if (c.stockDay >= S.day - 2 || stableBuyersLeft() <= 0) continue; const p = stablePrice(c); S.gold += p; S.totalEarned += p; sum += p; E.sold.n++; E.stable = E.stable.filter(x => x !== c); n++; addLog(`Управляющий продал из загона: ${c.name} за ${fmt(p)} мон.`); } if (n) act.push(`загон: продано ${n} (+${fmt(sum)})`); } catch (e) { } }
  if (act.length) L.unshift(`⚙ Управляющий${who ? ' ' + fn1(who) : ''}: ${act.join(', ')}.`);
  W.dig.push({ d: S.day, t: act.join(', ') || 'всё спокойно' }); W.dig = W.dig.slice(-14);
  return L;
}

// ---------- выбор в мелких событиях (при прокрутке) ----------
function stwPickChoice(e, x) {
  const ok = e.ch.map((ch, i) => [ch, i, ch.ok ? ch.ok(x) === true : true]).filter(z => z[2]);
  if (!ok.length) return null;
  const cost = ch => { const m = String(typeof ch.l === 'function' ? '' : ch.l).match(/(\d[\d\s]*)\s*мон/); return m ? +m[1].replace(/\s/g, '') : 0; };
  const lim = stwFree() * 0.15;
  return (ok.find(z => cost(z[0]) <= lim) || ok[ok.length - 1])[0];
}
function stwAutoEvent(rec) {
  const q = S.xev; if (!q) return true;
  const e = XEV.find(z => z.id === q.id);
  if (!e) { S.xev = null; return true; }
  if (e.story || e.risk || e.cs || e.arc) return false;
  const x = { c: q.c ? findOwned(q.c) : null, c2: q.c2 ? findOwned(q.c2) : null };
  if ((e.who && !x.c) || (e.who2 && !x.c2)) { S.xev = null; return true; }
  const ch = stwPickChoice(e, x); if (!ch) { S.xev = null; return true; }
  const lab = xFill(x, ch.l);
  xChoose(e, x, ch); closeModal(true);
  rec.push(`${e.title}: «${lab.replace(/<[^>]+>/g, '')}»`);
  return true;
}

// ---------- прокрутка дней ----------
let _stwSkip = null;
function stwSnap() { const C = carOf(), K = typeof rkOf === 'function' ? rkOf() : {}; return { ready: stageReady(), tr: JSON.stringify(Object.entries(C.tr || {}).map(([k, s]) => k + s.st)), ch: Object.keys(C.done || {}).length, stage: C.stage }; }
function stwStopWhy(s0) {
  const C = carOf(), K = typeof rkOf === 'function' ? rkOf() : {};
  if (S.xev) { const e = XEV.find(z => z.id === S.xev.id); if (e && e.story) return 'сюжет: ' + e.title; if (e && (e.risk || e.cs)) return 'заботы: ' + e.title.replace('Заботы · ', ''); if (e && e.arc) return 'история жителя: ' + e.title; }
  if (C.ended) return 'карьера завершена';
  if (stageReady() && !s0.ready) return 'можно принять новое звание';
  if (JSON.stringify(Object.entries(C.tr || {}).map(([k, s]) => k + s.st)) !== s0.tr) return 'испытание гильдии: есть итог';
  if (K.unrest >= 3) return 'в поместье ропот';
  if (K.bk >= 2) return 'капитал тает — гильдия обеспокоена';
  if ((K.loans || []).some(l => l.miss)) return 'просрочен платёж по займу';
  if (K.out && !K.out.cured) return 'в доме простуда, лекарю не хватило денег';
  if (K.insp && K.insp.day - S.day <= 0 && !K.prep && inspIssues().length) return 'завтра ревизия, есть нарушения';
  if ((window._newborn || []).length) return 'в поместье пополнение';
  if (S.gold < 0) return 'касса ушла в минус';
  if (document.querySelector('#modal.open')) return 'важное окно';
  return null;
}
async function stwSkip(n) {
  if (!stwOn()) return toast('Сначала назначьте управляющего.');
  if (_stwSkip) return;
  closeModal(true);
  const W = stwOf(), d0 = S.day, g0 = S.gold, r0 = S.rep;
  const R14 = _stwSkip = { n, i: 0, imp: [], ev: [], stop: null, cancel: false };
  const ov = document.createElement('div'); ov.id = 'stw-skip'; ov.innerHTML = `<div class="stw-sk"><div class="stw-sk-t">⏩ Управляющий ведёт дела…</div><div class="stw-sk-d">день 1 из ${n}</div><div class="bar"><i style="width:0%"></i></div><button class="btn small" id="stw-stop">Стоп</button></div>`;
  document.body.appendChild(ov); ov.querySelector('#stw-stop').onclick = () => { R14.cancel = true; };
  const oFx = FX.dayChange, oSync = window._rkSync; FX.dayChange = (d, s, cb) => { R14.cb = cb; }; window._rkSync = true;
  try {
    for (let i = 0; i < n; i++) {
      R14.i = i + 1;
      const s0 = stwSnap();
      if (S.xev && !stwAutoEvent(R14.ev)) { R14.stop = stwStopWhy(s0) || 'событие'; break; }
      try { const E = estOf(); if (E.ev && typeof CEV !== 'undefined' && CEV[E.ev.k]) { const D = CEV[E.ev.k], t = D.t(E.ev); evResolve(D.def, true); R14.ev.push(`${t}: «${D.o[D.def][0]}»`); } } catch (e) { }
      R14.cb = null; endDay(); try { R14.cb && R14.cb(); } catch (e) { console.warn('stw fx', e); } closeModal(true);
      if (S.xev) { const e = XEV.find(z => z.id === S.xev.id); if (e && !(e.story || e.risk || e.cs || e.arc)) stwAutoEvent(R14.ev); }
      const why = stwStopWhy(s0);
      const pr = ov.querySelector('.bar i'); if (pr) pr.style.width = Math.round((i + 1) / n * 100) + '%';
      const dd = ov.querySelector('.stw-sk-d'); if (dd) dd.textContent = `день ${i + 1} из ${n} · касса ${fmt(S.gold)}`;
      if (why) { R14.stop = why; break; }
      if (R14.cancel) { R14.stop = 'вы нажали «Стоп»'; break; }
      await new Promise(r => setTimeout(r, window._stwFast ? 0 : 90));
    }
  } catch (e) { console.warn('stw skip', e); R14.stop = R14.stop || 'что-то пошло не так'; }
  finally { FX.dayChange = oFx; window._rkSync = oSync; _stwSkip = null; ov.remove(); }
  W.last = { d0, d1: S.day, g: S.gold - g0, r: S.rep - r0, stop: R14.stop };
  save(); try { render(); } catch (e) { }
  const days = S.day - d0;
  const imp = R14.imp.filter((l, i, a) => a.indexOf(l) === i);
  const h = `<div class="stw14"><p>Прошло <b>${dn(days)}</b> (дни ${d0}–${S.day - 1}). ${R14.stop ? `Остановились: <b>${esc(R14.stop)}</b>.` : 'Всё прошло гладко.'}</p>
    <div class="stw-tot"><span class="${S.gold - g0 >= 0 ? 'pos' : 'neg'}">касса ${S.gold - g0 >= 0 ? '+' : ''}${fmt(S.gold - g0)}</span><span class="${S.rep - r0 >= 0 ? 'pos' : 'neg'}">репутация ${S.rep - r0 >= 0 ? '+' : ''}${S.rep - r0}</span><span>капитал ${fmt(capital())}</span></div>
    ${imp.length ? `<div class="panel-title">Важное</div><ul class="report">${imp.slice(-12).map(l => `<li class="${l[0] === '!' ? 'warn' : l[0] === '★' ? 'star' : 'car'}">${esc(l)}</li>`).join('')}</ul>` : ''}
    ${R14.ev.length ? `<details class="small"><summary>Управляющий решил сам (${R14.ev.length})</summary><ul>${R14.ev.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
    <details class="small"><summary>Журнал управляющего</summary><ul>${W.dig.slice(-days).map(x => `<li>д.${x.d}: ${esc(x.t)}</li>`).join('')}</ul></details></div>`;
  showModal(`⏩ Пропущено: ${dn(days)}`, h, [{ label: 'Дальше', cls: 'btn-primary', act: () => closeModal() }]);
}

// ---------- окно управляющего ----------
function stwModal() {
  if (!stwUnl()) return toast(`Управляющий — со звания «${CSTAGES[1].n}».`);
  const W = stwOf(), who = stwWho();
  const cands = S.owned.filter(c => c.status !== 'gone').map(c => [c, stwSkill(c)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sel = (k, opts) => `<select data-stwset="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(W[k]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const tog = (k, l) => `<label class="set-row"><span>${l}</span><input type="checkbox" data-stwset="${k}" ${W[k] ? 'checked' : ''}></label>`;
  const h = `<div class="stw14">
    <div class="stw-who"><b>${who ? esc(who.name) : esc(STW_HIRE.n)}</b> <span class="small muted">${who ? `житель · хватка ${stwSkill(who)} (ум, воля, обаяние) · +4 усталости в день` : `${esc(STW_HIRE.d)} · ${fmt(stwFee())} мон. в день`}</span></div>
    <label class="set-row"><span>Управляющий</span><select data-stwset="uid"><option value="">${esc(STW_HIRE.n)} (наёмный)</option>${cands.map(([c, s]) => `<option value="${c.uid}" ${W.uid === c.uid ? 'selected' : ''}>${esc(c.name)} · хватка ${s}</option>`).join('')}</select></label>
    <label class="set-row"><span><b>Управляющий работает</b></span><input type="checkbox" data-stwset="on" ${W.on ? 'checked' : ''}></label>
    <div class="panel-title">Правила</div>
    <label class="set-row"><span>Распорядок</span>${sel('tasks', [['off', 'не трогать'], ['rest', 'только отдых уставшим'], ['all', 'отдых + выгодные дела']])}</label>
    <label class="set-row"><span>Отдых с усталости</span>${sel('rest', [[50, '50'], [65, '65'], [80, '80']])}</label>
    ${tog('treats', 'Угощать грустных и встревоженных')}
    <label class="set-row"><span>На угощения в день</span>${sel('budget', [[40, '40 мон.'], [80, '80 мон.'], [150, '150 мон.']])}</label>
    ${tog('orders', 'Брать надёжные заказы таверны')}
    <label class="set-row"><span>Шанс заказа не ниже</span>${sel('ordMin', [[0.65, '65%'], [0.75, '75%'], [0.85, '85%']])}</label>
    ${tog('debt', 'Гасить долг ростовщику')}
    ${tog('risk', 'Ревизия и лекарь — по необходимости')}
    ${tog('sell', 'Продавать из загона (ждут больше 2 дней)')}
    ${tog('events', 'Решать мелкие события при прокрутке')}
    <label class="set-row"><span>Неприкосновенный запас</span>${sel('reserve', [[300, '300'], [600, '600'], [1000, '1 000'], [2000, '2 000']])}</label>
    <p class="small muted">Сюжет, заботы, звания, испытания, ропот и рождения управляющий не решает — он остановится и позовёт вас.</p>
    ${W.dig.length ? `<details class="small"><summary>Журнал (${W.dig.length})</summary><ul>${W.dig.slice().reverse().map(x => `<li>д.${x.d}: ${esc(x.t)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
  showModal('⚙ Управляющий', h, [{ label: '⏩ 3 дня', cls: W.on ? '' : 'disabled', act: () => stwSkip(3) }, { label: '⏩ 7 дней', cls: W.on ? 'btn-primary' : 'disabled', act: () => stwSkip(7) }, { label: '⏩ 14 дней', cls: W.on ? '' : 'disabled', act: () => stwSkip(14) }, { label: 'Закрыть', act: 'close' }]);
  document.querySelectorAll('#modal [data-stwset]').forEach(el => el.addEventListener('change', () => {
    const k = el.dataset.stwset; let v = el.type === 'checkbox' ? el.checked : el.value;
    if (['rest', 'budget', 'reserve'].includes(k)) v = +v; if (k === 'ordMin') v = +v; if (k === 'uid') v = v ? +v || v : null;
    W[k] = v; if (k === 'on' && v) { const c = stwWho(); toast(c ? `${fn1(c)} берёт хозяйство в свои руки.` : `${STW_HIRE.n} раскладывает счёты и нарукавники.`); }
    save(); stwModal(); try { render(); } catch (e) { }
  }));
}

(function () {
  // утренняя рутина — до подсчёта дня
  const oEnd = window.endDay;
  window.endDay = function () {
    try { window._stwPre = stwPre(); } catch (e) { console.warn('stw pre', e); window._stwPre = []; }
    return oEnd.apply(this, arguments);
  };
  // при прокрутке «Итоги дня» не показываем, а собираем важное
  const oModal = window.showModal;
  window.showModal = function (title, html, btns) {
    if (_stwSkip && /^Итоги дня/.test(title)) {
      try { for (const l of _c14lines) if (l[0] === '!' || l[0] === '★') _stwSkip.imp.push(l); _c14lines = [];
        const re = /<li class="(warn|star)">([^<]*)<\/li>/g; let m; while ((m = re.exec(html))) _stwSkip.imp.push((m[1] === 'warn' ? '' : '') + m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")); } catch (e) { }
      return;
    }
    return oModal.apply(this, arguments);
  };
  if (window.maybeDayEvent) { const oM = window.maybeDayEvent; window.maybeDayEvent = function () { if (_stwSkip) return; return oM.apply(this, arguments); }; }
  // кнопки на панели карьеры
  const oPanel = window.careerPanel;
  window.careerPanel = function () {
    let h = oPanel.apply(this, arguments);
    try { if (stwUnl()) { const on = stwOf().on; h = h.replace(/(<div class="car14-b">[\s\S]*?)(<\/div><\/div>\s*)$/, `$1<button class="btn small ${on ? 'stw-on' : ''}" data-stw="open">⚙ Управляющий${on ? '' : ' · выкл'}</button>${on ? '<button class="btn small" data-stw="skip">⏩ Дни</button>' : ''}$2`); } } catch (e) { }
    return h;
  };
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-stw]'); if (!t) return;
    ev.preventDefault(); ev.stopPropagation();
    const d = t.dataset.stw;
    if (d === 'open') return stwModal();
    if (d === 'skip') return showModal('⏩ Пропустить дни', `<p>Управляющий будет вести дела сам и остановится на важном: сюжет, заботы, звание, испытание, ропот, рождение.</p><p class="small muted">Сейчас: касса ${fmt(S.gold)}, запас ${fmt(stwOf().reserve)}${stwFee() ? `, жалованье ${fmt(stwFee())} в день` : ''}.</p>`, [{ label: '3 дня', act: () => stwSkip(3) }, { label: '7 дней', cls: 'btn-primary', act: () => stwSkip(7) }, { label: '14 дней', act: () => stwSkip(14) }, { label: 'Правила', act: () => stwModal() }, { label: 'Отмена', act: 'close' }]);
  }, true);
  try {
    HELP.push(['steward', 'Управляющий и пропуск дней (v14)', () => `<p>Со звания «${CSTAGES[1].n}» можно назначить <b>управляющего</b> (кнопка «⚙ Управляющий» на панели карьеры): жителя с хорошими умом и волей (бесплатно, но он устаёт) или наёмного ${STW_HIRE.n} (жалованье растёт со званием).</p>
      <p>Каждое утро он делает рутину по вашим правилам: отправляет уставших отдыхать (или подбирает выгодные дела), угощает грустных пряником и чаем в пределах бюджета, берёт заказы таверны с высоким шансом, гасит долг ростовщику, наводит порядок перед ревизией, зовёт лекаря и продаёт засидевшихся в загоне. Касса ниже «неприкосновенного запаса» не трогается. Отчёт — строки «⚙» в итогах дня.</p>
      <p><b>«⏩ Пропустить 3/7/14 дней»</b> прокручивает дни подряд. Мелкие события управляющий решает сам (осторожно и недорого), а на важном — сюжет, заботы, новое звание, итог испытания, ропот, просрочка, рождение — останавливается и показывает сводку.</p>`]);
  } catch (e) { }
})();
