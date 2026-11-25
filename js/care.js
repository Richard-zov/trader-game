// care.js — шанс ошибки и план дня, справка, новости.
// Подключается после game.js: использует его функции и состояние S.

// ---------- общие помощники ----------
const gx = (c, s) => addr(s).replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => g(c, m, f));
const pp = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d == null ? (Math.abs(v) < 0.1 ? 1 : 0) : d).replace(/\.0$/, '') + '%';
function whyHtml(parts, totalTxt, note) {
  return `<details class="why"><summary>Почему так</summary><table>${parts.map(([l, v, h]) =>
    `<tr><td>${l}${h ? `<small>${h}</small>` : ''}</td><td class="${typeof v === 'string' ? '' : v > 0.0005 ? 'bad' : v < -0.0005 ? 'good' : ''}">${typeof v === 'string' ? v : pp(v)}</td></tr>`).join('')}
    ${totalTxt ? `<tr class="tot"><td>Итого</td><td>${totalTxt}</td></tr>` : ''}</table>${note ? `<div class="small muted">${note}</div>` : ''}</details>`;
}
function wsum(c, w, gear) { let s = 0; for (const k in w) s += (gear ? eff(c, k) : c.stats[k]) * w[k]; return s; }

// ---------- ошибка в работе ----------
const JOB_DIFF = {
  craft: { d: 40, w: { mas: 0.5, agi: 0.3, str: 0.2 }, n: 'Ремесло', sk: 'Мастерство, Ловкость, Сила', bad: 'испортить заготовку' },
  shop: { d: 40, w: { int: 0.45, cha: 0.35, agi: 0.2 }, n: 'Торговля', sk: 'Ум, Обаяние, Ловкость', bad: 'обсчитаться у прилавка' },
  train: { d: 35, w: { int: 0.6, wil: 0.4 }, n: 'Учёба', sk: 'Ум, Воля', bad: 'отвлечься на уроке' },
};
const FAIL_BASE = 0.03, FAIL_MIN = 0.01, FAIL_MAX = 0.40;
function failInfo(c, task) {
  task = task || c.task; if (!JOB_DIFF[task]) task = 'craft';
  const J = JOB_DIFF[task], parts = [];
  const add = (id, l, v, h) => { if (Math.abs(v) >= 0.0005) parts.push([l, v, h, id]); };
  add('base', 'База', FAIL_BASE, 'у всех');
  if (c.fatigue > 30) add('fat', 'Усталость ' + Math.round(c.fatigue), (c.fatigue - 30) / 350, 'выше 30 — растёт');
  if (c.stress > 30) add('str', 'Стресс ' + Math.round(c.stress), (c.stress - 30) / 450, 'выше 30 — растёт');
  const m = mood(c);
  if (m < 35) add('mood', 'Плохое настроение ' + m, 0.04 + (35 - m) / 500, 'ниже 35');
  else if (m >= 75) add('mood', 'Отличное настроение ' + m, -0.01, '75+');
  if (c.loyalty < 30) add('loy', 'Низкая лояльность ' + Math.round(c.loyalty), (30 - c.loyalty) / 600, 'ниже 30 — работает спустя рукава');
  else if (c.loyalty >= 70) add('loy', 'Преданность ' + Math.round(c.loyalty), -0.01, '70+');
  add('dis', 'Дисциплина ' + Math.round(c.discipline), -c.discipline / 1000, '');
  const raw = wsum(c, J.w, false), full = wsum(c, J.w, true);
  add('skill', `Навыки ${Math.round(raw)} против сложности ${J.d}`, clamp((J.d - raw) / 600, -0.06, 0.06), J.sk);
  if (full > raw) add('gear', 'Снаряжение', -(full - raw) / 600, `навыки +${Math.round(full - raw)}`);
  if (c.health < 50) add('hp', 'Здоровье ' + Math.round(c.health), 0.06, 'ниже 50');
  if (has(c, 'clumsy')) add('trait', 'Неуклюжесть', 0.04, 'черта');
  if (has(c, 'diligent')) add('trait', 'Трудолюбие', -0.01, 'черта');
  if (has(c, 'lazy')) add('trait', 'Лень', 0.01, 'черта');
  if (has(c, 'sensitive') && c.stress > 50) add('trait', 'Ранимость при стрессе', 0.01, 'черта');
  let p = parts.reduce((a, x) => a + x[1], 0);
  if (c.race === 'dwarf') { add('race', 'Гном: аккуратность ×0.6', -p * 0.4, 'раса'); p *= 0.6; }
  const cl = clamp(p, FAIL_MIN, FAIL_MAX);
  if (Math.abs(cl - p) > 0.0005) add('cap', cl > p ? 'Минимум 1%' : 'Предел 40%', cl - p, '');
  return { p: cl, parts, task, raw: Math.round(raw), d: J.d };
}
function failChance(c, task) { return failInfo(c, task).p; }
function failPart(c, id) { return failInfo(c).parts.filter(x => x[3] === id).reduce((a, x) => a + x[1], 0); }
function failTop(fi, n) { return fi.parts.filter(x => x[3] !== 'base' && x[1] > 0.0005).sort((a, b) => b[1] - a[1]).slice(0, n || 2); }
function failWhy(c, task) {
  const fi = failInfo(c, task);
  return whyHtml(fi.parts, `<b>${Math.round(fi.p * 100)}%</b>`, `При ошибке ${JOB_DIFF[fi.task].bad === 'отвлечься на уроке' ? 'навык не растёт' : 'приносит лишь 30% дохода'}. <a href="#" data-help="work">Подробнее</a>`);
}

// ---------- план дня (вместо простого «Завершить день?») ----------
function dayPlanModal() {
  applyAuto();
  const body = document.querySelector('#modal .modal-body'); const keep = body ? body.scrollTop : 0;
  let exp = 0, trainCost = 0;
  const rows = S.owned.map(c => {
    const n = esc(fn1(c));
    if (c.status === 'order') {
      const o = S.orders.find(x => x.id === c.orderId);
      const t = o && ORDER_TEMPLATES[o.tpl];
      return `<div class="plan-row"><div class="pr-p">${renderPortrait(c, 'sm')}</div><div class="pr-b"><b>${n}</b> — на заказе${t ? ` «${esc(t.title)}», ещё ${dn(o.daysLeft)}` : ''}${t && o.daysLeft <= 1 ? ` · успех ${Math.round(orderChance(c, o) * 100)}%` : ''}</div></div>`;
    }
    const warn = [];
    let task = c.task;
    if (c.sickDays > 0 || c.health < 30) { warn.push(c.sickDays > 0 ? 'болеет — будет отдыхать' : 'здоровье ниже 30 — будет отдыхать'); task = 'rest'; }
    if (c.fatigue >= 90) warn.push('усталость 90+: здоровье −10 за день');
    else if (c.fatigue >= 75 && task !== 'rest') warn.push('устал' + g(c, '', 'а') + ' — лучше дать отдых');
    if (c.stress >= 80) warn.push('стресс 80+: лояльность падает');
    let line = '';
    if (task === 'salon' && !salonOk(c).ok) { const so = salonOk(c); warn.push('чайная: ' + (so.block || 'не по душе (охота ' + so.will + '/' + SALON_NEED + ')') + ' — будет отдыхать'); task = 'rest'; }
    if (hasFault(c)) warn.push('промах: ' + faultsOf(c)[0].t + ' — стоит поговорить о работе');
    if (task === 'salon') {
      const L = salonLine(c); exp += evOf(L.inf.v, L.fi.p);
      if (L.so.reluct) warn.push('работает без охоты: доверие −2, стресс +5');
      line = `<div class="pr-l">${L.txt}</div>${failWhy(c, 'salon')}${salonWhy(c)}`;
    } else if (task === 'craft' || task === 'shop') {
      const inf = incomeInfo(c, task), fi = failInfo(c, task);
      const e = inf.v * (1 - fi.p) + inf.v * 0.3 * fi.p; exp += e;
      const top = failTop(fi, 2).map(x => x[0].toLowerCase()).join(', ');
      line = `<div class="pr-l">≈ <b>+${inf.v}</b> мон. · ошибка <b class="${fi.p >= 0.15 ? 'neg' : fi.p <= 0.06 ? 'pos' : ''}">${Math.round(fi.p * 100)}%</b>${top ? ` <span class="muted">(${top})</span>` : ''}</div>${failWhy(c, task)}`;
    } else if (task === 'train') {
      const fi = failInfo(c, 'train'); trainCost += TRAIN_COST;
      line = `<div class="pr-l">«${statName(c.trainStat)}» ×${trainInfo(c).mult.toFixed(2)} · −${TRAIN_COST} мон. · срыв <b>${Math.round(fi.p * 100)}%</b></div>${failWhy(c, 'train')}`;
    } else line = `<div class="pr-l muted">Отдых: усталость −${c.race === 'beast' ? 60 : 35}, стресс −20, здоровье +10</div>`;
    return `<div class="plan-row"><div class="pr-p">${renderPortrait(c, 'sm')}</div><div class="pr-b"><b>${n}</b> ${autoToggleHtml(c)}
      ${isAuto(c) && c.autoWhy ? `<div class="pr-auto">⚙ ${TASKS[c.task]}: ${esc(c.autoWhy)}</div>` : ''}
      <div class="seg">${Object.entries(TASKS).map(([k, nm]) => `<button class="seg-b ${c.task === k ? 'on' : ''} ${k === 'salon' && !salonOk(c).ok ? 'off' : ''}" data-plantask="${k}" data-uid="${c.uid}">${nm}</button>`).join('')}</div>
      ${line}${warn.map(w => `<div class="pr-w">! ${w}</div>`).join('')}</div></div>`;
  }).join('');
  const up = upkeep(), cash = up.total - up.interest;
  const net = Math.round(exp - trainCost - cash);
  showModal('План на завтра', `<div class="plan-auto">${autoAllHtml()}<span class="small muted">авто: отдых при усталости, стрессе и болезни, иначе самое выгодное дело</span></div>${rows || '<p class="muted">В хозяйстве пока нет работников.</p>'}
    <div class="plan-tot">Ожидаемый доход ≈ <b>+${Math.round(exp)}</b>${trainCost ? ` · учёба −${trainCost}` : ''} · расходы (жалованье, стол, жильё) −${cash}${up.interest ? ` · проценты +${up.interest} к долгу` : ''}<br>Итог ≈ <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</b> мон. <span class="muted small">(с учётом шанса ошибок)</span></div>
    <div class="small muted">Ошибка — испорченная заготовка или просчёт у прилавка: остаётся 30% дохода. <a href="#" data-help="work">Как снизить шанс?</a></div>`,
    [{ label: 'Отмена', act: 'close' }]);
  // подтверждение — сверху, липкой полосой: видно сразу, без прокрутки списка
  const nb = document.querySelector('#modal .modal-body');
  if (nb) {
    nb.insertAdjacentHTML('afterbegin', `<div class="plan-confirm"><button class="btn btn-primary" id="plan-go">Подтвердить и завершить день</button><small>Итог ≈ <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</b> мон.</small></div>`);
    document.getElementById('plan-go').onclick = () => { closeModal(); endDay(); };
    nb.scrollTop = keep;
  }
}

// ---------- справка ----------
const HELP = [
  ['work', 'Ошибки в работе', () => `<p>В конце дня каждый работник может ошибиться: в ремесле — <b>испортить заготовку</b>, за прилавком — <b>обсчитаться</b>, на учёбе — <b>отвлечься</b>. При ошибке ремесло и торговля приносят лишь <b>30%</b> дохода, а учёба не даёт роста навыка.</p>
    <p>Шанс складывается из условий. Точный процент и разбор видны в <b>плане дня</b> (кнопка «Завершить день») и в карточке, раздел «Прогноз».</p>
    <table class="help-t"><tr><td>База</td><td>3%</td></tr><tr><td>Усталость выше 30</td><td>+1% за каждые 3.5</td></tr><tr><td>Стресс выше 30</td><td>+1% за каждые 4.5</td></tr>
    <tr><td>Настроение ниже 35 / 75+</td><td>+4…11% / −1%</td></tr><tr><td>Лояльность ниже 30 / 70+</td><td>до +5% / −1%</td></tr><tr><td>Собранность</td><td>−1% за каждые 10</td></tr>
    <tr><td>Навыки против сложности дела (40, учёба 35)</td><td>от −6% до +6%</td></tr><tr><td>Снаряжение с бонусом к навыкам</td><td>снижает</td></tr><tr><td>Здоровье ниже 50</td><td>+6%</td></tr>
    <tr><td>Неуклюжесть / лень / трудолюбие</td><td>+4% / +1% / −1%</td></tr><tr><td>Гномы</td><td>×0.6</td></tr><tr><td>Пределы</td><td>1–40%</td></tr></table>
    <p class="small">Навыки для дел: ремесло — Мастерство, Ловкость, Сила; торговля — Ум, Обаяние, Ловкость; учёба — Ум, Воля. Проще всего снизить риск: отдых при усталости, разговор, похвала и выходной при стрессе и плохом настроении.</p>`],
  ['income', 'Доход', () => `<p>Доход за день = база по навыкам × множители (настроение, усталость, здоровье, черты, снаряжение, должность, сезон, спрос в городе). Разбор множителей — в карточке, раздел «Прогноз».</p>`],
  ['state', 'Настроение, стресс, усталость', () => `<p><b>Настроение</b> поднимают разговор, похвала, премия, подарки, угощения и выходной. Ниже 35 — работа хуже и ошибки чаще.</p><p><b>Стресс</b> растёт от работы и замечаний, снимается отдыхом, выходным и чаем. Выше 80 — падает лояльность.</p><p><b>Усталость</b> растёт от работы; выше 90 — здоровье падает.</p>`],
  ['staff', 'Работники, жалованье и договор', () => `<p>Все работники — <b>вольные наёмные люди</b>. При найме вы платите <b>подъёмные</b>, а потом каждый вечер — <b>жалованье</b>. Договор заключается на ${typeof CONTRACT_DAYS !== 'undefined' ? CONTRACT_DAYS : 14} дней; в конце срока работник предложит продлить его — иногда попросит прибавку.</p>
    <ul><li>Если касса пуста и жалованье не выплачено, настроение и лояльность падают. После трёх невыплат подряд работник уходит.</li>
    <li>Если работник долго недоволен (настроение ниже 30 или лояльность ниже 20), он предупредит, что подумывает уйти. Поговорите, дайте выходной, премию или прибавку.</li>
    <li><b>Повышение</b>: опытным и надёжным работникам можно дать должность — старший, бригадир, мастер артели. Доход растёт, жалованье тоже.</li>
    <li><b>Рекомендовать на новое место</b>: обученного работника можно устроить к другому нанимателю; гильдия платит вам комиссию за подготовку. Работник переходит, только если сам согласен (настроение 40+).</li>
    <li><b>Рассчитать</b>: работник уходит с выходным пособием и доброй рекомендацией; растёт репутация.</li></ul>`],
  ['talk', 'Общение и забота', () => `<p>В карточке работника — раздел «Общение и забота»: <b>поговорить</b>, <b>похвалить</b>, выдать <b>премию</b>, дать <b>выходной</b>, сделать <b>подарок</b>, отправить на <b>обучение к мастеру</b>, <b>повысить</b>. Каждое действие можно делать раз в день.</p>
    <p>У многих работников есть <b>личная цель</b> — маленький квест: накопить на что-то, выучиться, съездить домой. Помогите — и получите лояльность и новую черту.</p>`],
  ['chances', 'Заказы и переговоры', () => `<p><b>Заказы:</b> 50% ± навыки против требований, Удача, усталость, настроение, стресс, здоровье, снаряжение (5–97%).</p><p><b>Переговоры:</b> чем больше просите, тем ниже шанс; помогают репутация и Обаяние лучшего переговорщика.</p>`],
];
function helpModal(sec) {
  showModal('Справка', `<div class="help">${HELP.map(([k, t, f]) => `<details class="help-s" ${k === sec ? 'open' : ''} id="help-${k}"><summary>${t}</summary>${f()}</details>`).join('')}</div>`, [{ label: 'Понятно', cls: 'btn-primary', act: 'close' }]);
  const el = sec && document.getElementById('help-' + sec); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30);
}

// ---------- новости ----------
function newsModal() {
  showModal('Новости Медового Лога', `<ul class="news-l">${(S.news || []).map(n => `<li>${esc(n)}</li>`).join('') || '<li>Тихо.</li>'}</ul>`,
    [{ label: 'Закрыть', act: 'close' }]);
}

// течка, беременность и прикосновения убраны в v16; заглушки для старого кода
function heatCapable(c) { return false; }
function inHeat(c, day) { return false; }
function heatInfo(c) { return null; }
function heatEndDay(lines) { }
function heatStartLines(lines) { }

// ---------- выражение лица по состоянию ----------
function exprOf(c) {
  if (c.fatigue >= 82 || c.sickDays) return 'sleepy';
  if (c.fatigue >= 70) return 'tired';
  if (c.stress >= 70) return 'angry';
  const m = mood(c);
  return m >= 75 ? 'happy' : m < 35 ? 'sad' : '';
}
function moodAnimKey(c) { return moodKey(c); }

// индивидуальная высота синтезированного голоса (0.88–1.12) — от uid персонажа
function voicePk(c) { let h = 0; const u = String(c && c.uid || ''); for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0; return 0.88 + (h % 25) / 100; }
function trustOf(c) { return Math.round(c.loyalty * 0.5 + (c.aff || 0) * 0.3 + mood(c) * 0.2); }
function touch() { } function pet() { } function placeZones() { } function closenessModal() { }
function touchChipsHtml() { return ''; } function refreshTouchChips() { }
// ---------- «почему так» для переговоров и заказов ----------
function haggleWhy(p, c) {
  const bestCha = Math.max(0, ...S.owned.map(x => eff(x, 'cha')));
  return whyHtml([['Основа', 1, ''], [`Запрос ${p}%`, -Math.pow(p / 30, 1.2) * 0.9, 'чем больше, тем рискованнее'], ['Репутация ' + S.rep, S.rep / 300, ''], ['Обаяние лучшего торговца ' + bestCha, bestCha / 600, '']], `<b>${Math.round(haggleChance(p, c) * 100)}%</b>`, 'Пределы 3–98%.');
}
function orderWhy(c, o) {
  const t = ORDER_TEMPLATES[o.tpl], score = eff(c, t.stat) + 0.5 * eff(c, t.stat2 || t.stat);
  const parts = [['Основа', 0.5, ''], [`Навыки ${Math.round(score)} против ${Math.round(t.min * 1.5)}`, (score - t.min * 1.5) / 70, `${statName(t.stat)} + ½ ${statName(t.stat2 || t.stat)}`], ['Удача', eff(c, 'luk') / 400, ''], ['Усталость', -c.fatigue / 300, ''], ['Настроение', (mood(c) - 50) / 400, '']];
  if (gb(c).order) parts.push(['Снаряжение', gb(c).order / 100, '']);
  if (has(c, 'lucky')) parts.push(['Везение', 0.1, 'черта']);
  if (c.stress > 70) parts.push(['Стресс 70+', -0.08, '']);
  if (c.health < 50) parts.push(['Здоровье ниже 50', -0.1, '']);
  return whyHtml(parts.map(p => [p[0], -p[1], p[2]]), `успех <b>${Math.round(orderChance(c, o) * 100)}%</b>`, 'Здесь «−» — хорошо: столько шанс прибавляет. Пределы 5–97%.');
}
// ---------- обработчики ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-plantask],[data-help],[data-news],[data-plan]');
  if (!t) return;
  const d = t.dataset;
  if (d.help != null) { e.preventDefault(); e.stopPropagation(); return helpModal(d.help); }
  if (d.news != null) return newsModal();
  if (d.plan != null) return dayPlanModal();
  if (d.plantask) { const c = findOwned(d.uid); if (c && c.status === 'home' && assignTask(c, d.plantask)) { save(); render(); dayPlanModal(); } }
});
