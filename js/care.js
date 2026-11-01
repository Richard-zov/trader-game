// care.js — шанс ошибки и план дня, справка, новости, течка, прикосновения, «сблизиться» с мини-игрой.
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
  if (inHeat(c)) add('heat', 'Течка', 0.03, 'мысли не о работе');
  if (c.preg) add('preg', 'В положении', 0.02, '');
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
    if (inHeat(c) && c.heatCare !== S.day) warn.push('течка: сегодня без внимания — стресс +8 (погладьте или похвалите)');
    if (c.stress >= 80) warn.push('стресс 80+: лояльность падает');
    let line = '';
    if (task === 'salon' && !salonOk(c).ok) { const so = salonOk(c); warn.push('салон: ' + (so.block || 'нет согласия (охота ' + so.will + '/' + SALON_NEED + ')') + ' — будет отдыхать'); task = 'rest'; }
    if (hasFault(c)) warn.push('провинил' + g(c, 'ся', 'ась') + ': ' + faultsOf(c)[0].t + ' — можно наказать по делу');
    if (task === 'salon') {
      const L = salonLine(c); exp += evOf(L.inf.v, L.fi.p);
      if (L.so.reluct) warn.push('работает без охоты: симпатия −2, стресс +5');
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
  showModal('План на завтра', `<div class="plan-auto">${autoAllHtml()}<span class="small muted">авто: отдых при усталости, стрессе, болезни, беременности и течке, иначе самое выгодное дело</span></div>${rows || '<p class="muted">В поместье никого нет.</p>'}
    <div class="plan-tot">Ожидаемый доход ≈ <b>+${Math.round(exp)}</b>${trainCost ? ` · учёба −${trainCost}` : ''} · содержание −${cash}${up.interest ? ` · проценты +${up.interest} к долгу` : ''}<br>Итог ≈ <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</b> мон. <span class="muted small">(с учётом шанса ошибок)</span></div>
    <div class="small muted">Ошибка — испорченная заготовка или просчёт у прилавка: остаётся 30% дохода. <a href="#" data-help="work">Как снизить шанс?</a></div>`,
    [{ label: 'Отмена', act: 'close' }, { label: 'Завершить день', cls: 'btn-primary', act: () => { closeModal(); endDay(); } }]);
  const nb = document.querySelector('#modal .modal-body'); if (nb) nb.scrollTop = keep;
}

// ---------- справка ----------
const HELP = [
  ['work', 'Ошибки в работе', () => `<p>В конце дня каждый работник может ошибиться: в ремесле — <b>испортить заготовку</b>, за прилавком — <b>обсчитаться</b>, на учёбе — <b>отвлечься</b>. При ошибке ремесло и торговля приносят лишь <b>30%</b> дохода, а учёба не даёт роста навыка.</p>
    <p>Шанс складывается из условий. Точный процент и разбор видны в <b>плане дня</b> (кнопка «Завершить день») и в карточке, раздел «Прогноз».</p>
    <table class="help-t"><tr><td>База</td><td>3%</td></tr><tr><td>Усталость выше 30</td><td>+1% за каждые 3.5</td></tr><tr><td>Стресс выше 30</td><td>+1% за каждые 4.5</td></tr>
    <tr><td>Настроение ниже 35 / 75+</td><td>+4…11% / −1%</td></tr><tr><td>Лояльность ниже 30 / 70+</td><td>до +5% / −1%</td></tr><tr><td>Дисциплина</td><td>−1% за каждые 10</td></tr>
    <tr><td>Навыки против сложности дела (40, учёба 35)</td><td>от −6% до +6%</td></tr><tr><td>Снаряжение с бонусом к навыкам</td><td>снижает</td></tr><tr><td>Здоровье ниже 50</td><td>+6%</td></tr>
    <tr><td>Неуклюжесть / лень / трудолюбие</td><td>+4% / +1% / −1%</td></tr><tr><td>Течка / беременность</td><td>+3% / +2%</td></tr><tr><td>Гномы</td><td>×0.6</td></tr><tr><td>Пределы</td><td>1–40%</td></tr></table>
    <p class="small">Навыки для дел: ремесло — Мастерство, Ловкость, Сила; торговля — Ум, Обаяние, Ловкость; учёба — Ум, Воля. Проще всего снизить риск: отдых при усталости, ласка и подарки при стрессе и плохом настроении.</p>`],
  ['income', 'Доход', () => `<p>Доход за день = база по навыкам × множители (настроение, усталость, здоровье, черты, снаряжение, сезон, спрос в городе). Разбор множителей — в карточке, раздел «Прогноз».</p><p>В течку доход ×0.8, в положении ×0.5.</p>`],
  ['state', 'Настроение, стресс, усталость', () => `<p><b>Настроение</b> поднимают ласка, подарки, угощения и похвала. Ниже 35 — работа хуже и ошибки чаще.</p><p><b>Стресс</b> растёт от работы и строгости, снимается отдыхом и прикосновениями. Выше 80 — падает лояльность.</p><p><b>Усталость</b> растёт от дел. С 90 — здоровье −10 за день. Отдых снимает 35 (зверолюдям — 60).</p><p><b>Симпатия</b> — насколько персонажу нравитесь лично вы. Растёт от прикосновений и близости, нужна, чтобы получить согласие.</p>`],
  ['heat', 'Течка у зверолюдей', () => `<p>У женщин-зверолюдей примерно раз в <b>12 дней</b> наступает течка на <b>3 дня</b> (значок розового пламени, щёки горят).</p><ul><li>Нужно внимание: погладить, похвалить, подарить подарок или провести время вместе. Если за день никто не уделил внимания — <b>стресс +8, настроение −6</b>; если уделили — настроение +4.</li><li>Доход ×0.8, шанс ошибки +3%.</li><li>Прикосновения принимаются охотнее, пороги для близости ниже, согласие на свидание +20%, шанс беременности +15%.</li></ul><p>В положении течки нет.</p>`],
  ['touch', 'Прикосновения', () => `<p>Коснитесь портрета: голова, уши (у зверолюдей и эльфов), щёки, волосы, плечи, руки, хвост (у зверолюдей). Спина — кнопкой под портретом. У каждой зоны свой эффект:</p>
    <table class="help-t">${Object.entries(ZONES).map(([k, z]) => `<tr><td>${z.n}</td><td>${fxText(z.fx, 1)}</td></tr>`).join('')}</table>
    <p>Примут ли прикосновение, зависит от <b>доверия</b> = лояльность×0.5 + симпатия×0.3 + настроение×0.2 (в течку +10). Хвост, щёки и уши — более личные зоны. Если доверия мало — персонаж отстранится (стресс +2).</p>
    <p>Эффект в течение дня слабеет: 100% → 60% → 35% → 15% → 0 для каждой зоны; после 8 прикосновений за день всё действует вдвое слабее.</p>`],
  ['close', 'Сблизиться', () => `<p>Провести вечер наедине с персонажем — только по его согласию и не чаще раза в день.</p><p>Нужно: <b>лояльность 55+, настроение 50+, симпатия 40+</b> (в течку −10/−10/−15). Если чего-то не хватает — персонаж мягко откажет, и ничего не случится.</p>
    <p>Перед этим — шуточная мини-игра «Кабачок и корзинка»: водите пальцем вверх-вниз, чтобы кабачок нырял в корзинку и выныривал; считаются ходы, глубина и ритм (сердечко-метроном). Чем лучше настроение и меньше стресс, тем шире горлышко и спокойнее качается корзинка. Очки умножают эффект (×0.5…×1.5): симпатия, лояльность и настроение растут, стресс снижается, усталость +5.</p>
    <p>Беременность возможна только у здоровых женщин, не в положении и если в поместье есть место (те же правила, что у свиданий; шанс по плодовитости, сезону и течке).</p>`],
  ['chances', 'Заказы, торг, свидания', () => `<p><b>Заказы:</b> 50% ± навыки против требований, Удача, усталость, настроение, стресс, здоровье, снаряжение (5–97%).</p><p><b>Торг:</b> чем больше просите, тем ниже шанс; помогают репутация и Обаяние лучшего торговца.</p><p><b>Свидания:</b> согласие — от взаимной симпатии, настроения и лояльности; беременность — от плодовитости, силы рода, здоровья, сезона и течки.</p><p>У каждого шанса есть разворот «Почему так» с разбором.</p>`],
];
function helpModal(sec) {
  showModal('Справка', `<div class="help">${HELP.map(([k, t, f]) => `<details class="help-s" ${k === sec ? 'open' : ''} id="help-${k}"><summary>${t}</summary>${f()}</details>`).join('')}</div>`, [{ label: 'Понятно', cls: 'btn-primary', act: 'close' }]);
  const el = sec && document.getElementById('help-' + sec); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30);
}

// ---------- новости ----------
function newsModal() {
  showModal('Новости Медового Лога', `<ul class="news-l">${(S.news || []).map(n => `<li>${esc(n)}</li>`).join('') || '<li>Тихо.</li>'}</ul>
    ${S.owned.filter(c => heatCapable(c) && !c.preg).length ? `<div class="small">${S.owned.filter(c => heatCapable(c) && !c.preg).map(c => { const h = heatInfo(c); return `${esc(fn1(c))}: ${h.on ? `<b class="heat-t">течка ещё ${dn(h.left)}</b>` : `течка через ${dn(h.next)}`}`; }).join(' · ')}</div>` : ''}`,
    [{ label: 'Закрыть', act: 'close' }]);
}

// ---------- течка ----------
const HEAT_CYCLE = 12, HEAT_LEN = 3;
function heatCapable(c) { return c && c.race === 'beast' && c.g === 'f'; }
function inHeat(c, day) {
  if (!heatCapable(c) || c.preg) return false;
  return (((day || S.day) + (c.heatOff || 0)) % HEAT_CYCLE) < HEAT_LEN;
}
function heatInfo(c) {
  if (!heatCapable(c)) return null;
  const ph = (S.day + (c.heatOff || 0)) % HEAT_CYCLE, on = inHeat(c);
  return { on, left: on ? HEAT_LEN - ph : 0, next: on ? 0 : HEAT_CYCLE - ph };
}
function heatEndDay(lines) {
  for (const c of S.owned) {
    if (!inHeat(c)) continue;
    if (c.heatCare === S.day) { c.moodMod += 4; }
    else { stressGain(c, 8); c.moodMod -= 6; lines.push(`! ${fn1(c)}: течка, а внимания весь день не было — стресс +8, настроение −6.`); }
  }
}
function heatStartLines(lines) {
  for (const c of S.owned) if (inHeat(c) && !inHeat(c, S.day - 1))
    lines.push(`♥ У ${fn1(c)} началась течка (3 дня): щёки горят, хвост не находит места. Нужно больше внимания; работа идёт хуже, а близость — легче.`);
}

// ---------- выражение лица по состоянию ----------
function exprOf(c) {
  if (inHeat(c)) return 'flushed';
  if (c.fatigue >= 82 || c.sickDays) return 'sleepy';
  if (c.fatigue >= 70) return 'tired';
  if (c.stress >= 70) return 'angry';
  const m = mood(c);
  return m >= 75 ? 'happy' : m < 35 ? 'sad' : '';
}
function moodAnimKey(c) { return inHeat(c) ? 'heat' : moodKey(c); }

// ---------- прикосновения ----------
const ZONES = {
  head: { n: 'Голова', fx: { mood: 8, stress: -6, loy: 2, aff: 2 }, shy: 0, snd: 'rustle' },
  ears: { n: 'Уши', fx: { mood: 9, stress: -4, loy: 1, aff: 3 }, shy: 5, snd: 'flick' },
  tail: { n: 'Хвост', fx: { mood: 6, stress: -2, aff: 4 }, shy: 10, snd: 'swish' },
  cheek: { n: 'Щёки', fx: { mood: 6, aff: 3 }, shy: 5, snd: 'squish' },
  hair: { n: 'Волосы', fx: { mood: 6, stress: -4, aff: 2 }, shy: 2, snd: 'rustle' },
  shoulder: { n: 'Плечи', fx: { stress: -8, fat: -4, loy: 1 }, shy: -5, snd: 'knead' },
  back: { n: 'Спина', fx: { mood: 4, stress: -5, loy: 2 }, shy: -5, snd: 'pat' },
  hand: { n: 'Рука', fx: { mood: 4, loy: 3, aff: 3 }, shy: 0, snd: 'warm' },
};
const FX_N = { mood: 'настроение', stress: 'стресс', fat: 'усталость', loy: 'лояльность', aff: 'симпатия' };
function fxText(fx, k) { return Object.entries(fx).map(([s, v]) => `${FX_N[s]} ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * k * 10) / 10)}`).join(', '); }
const TOUCH_F = [1, 0.6, 0.35, 0.15, 0];
function zonesFor(c) { return Object.keys(ZONES).filter(z => (z !== 'ears' || c.race === 'beast' || c.race === 'elf') && (z !== 'tail' || c.race === 'beast')); }
function trustOf(c) { return Math.round(c.loyalty * 0.5 + (c.aff || 0) * 0.3 + mood(c) * 0.2 + (inHeat(c) ? 10 : 0)); }
function touchTier(c, zone) {
  const T = trustOf(c) - ((ZONES[zone] || {}).shy || 0) + (zone === 'ears' && c.race === 'beast' ? -3 : 0);
  return { T, tier: T >= 55 ? 'hi' : T >= 35 ? 'mid' : 'lo', need: 35 + ((ZONES[zone] || {}).shy || 0) };
}
function touchState(c) { if (!c.touch || c.touch.day !== S.day) c.touch = { day: S.day, n: {}, total: 0 }; return c.touch; }
function touchLeft(c, zone) { const t = touchState(c); return TOUCH_F[Math.min(t.n[zone] || 0, TOUCH_F.length - 1)] * (t.total >= 8 ? 0.5 : 1); }

const TL = {
  head: {
    hi: ['М-м-м… спасибо, {х}.', 'Если вы будете так гладить каждый вечер, {х}, я стану совсем ручн{ым|ой}.', '*прикрывает глаза* Как вам угодно, {х}… мне очень хорошо.', 'Я ваш{|а}, {х}. Гладьте сколько пожелаете.', 'Вы знаете, где у меня кнопка «растаять», {х}.'],
    mid: ['Ой… как скажете, {х}.', '*замирает* Спасибо, {х}…', 'Я… не привык{|ла} к ласке, {х}. Простите.'],
    lo: ['*вздрагивает и опускает глаза* …Да, {х}.', '*застывает, не смея отстраниться*', 'Простите, {х}… я ещё боюсь.'] },
  ears: {
    hi: ['Ах! Уши… простите, {х}, я дрожу.', 'За ушком — самое чуткое место, {х}. Теперь вы знаете.', 'Мр-р-р… колени подкашиваются, {х}.', 'Ещё, {х}… если позволите попросить.'],
    mid: ['Ой, уши! Щекотно, {х}…', 'Простите, {х}, они сами дёргаются!', '*уши прижимаются, но лицо выдаёт с потрохами*'],
    lo: ['*уши прижимаются* Простите, {х}… я боюсь.', '*сжимается и терпит*'] },
  tail: {
    hi: ['Ах!.. Хвост — это очень лично, {х}. Но вам — можно.', '*хвост сам обвивается вокруг вашего запястья* Простите, {х}, он сам…', 'Медленно… пожалуйста, {х}.'],
    mid: ['Х-хвост? Как пожелаете, {х}…', '*хвост вырывается из рук и тут же виновато возвращается*', 'Простите, {х}, он непослушный.'],
    lo: ['*хвост поджат* Пожалуйста, {х}… только не хвост.', '*замирает, хвост дрожит*'] },
  cheek: {
    hi: ['Щёки горят, {х}… это из-за вас.', '*прижимается щекой к ладони* Тёплая… спасибо, {х}.', 'Можно… я поцелую вашу ладонь, {х}?'],
    mid: ['Н-ну что вы, {х}…', 'У меня что-то на лице, {х}? Простите!', 'Вы меня смущаете, {х}…'],
    lo: ['*отводит взгляд* Как прикажете, {х}.', '*не шевелится, только бледнеет*'] },
  hair: {
    hi: ['Перебирайте ещё, {х}… мурашки до самых пяток.', 'М-м… я теперь не усну от счастья, {х}.', '*тянется вслед за рукой*'],
    mid: ['Причёска… ничего, {х}, я переплету.', 'Как вам угодно, {х}. Только аккуратно, пожалуйста.'],
    lo: ['*съёживается* Простите, {х}…', '…Да, {х}.'] },
  shoulder: {
    hi: ['О-о… вот здесь, {х}. У вас волшебные руки.', 'После такого и работать не страшно, {х}. Спасибо.', 'Чуть ниже, если позволите, {х}… да-а.'],
    mid: ['Плечи и правда затекли… спасибо, {х}.', 'Вы так добры, {х}.', 'Ох, прямо в узелок попали, {х}.'],
    lo: ['*напрягается* Я слушаю, {х}.', 'Я что-то сделал{|а} не так, {х}?'] },
  back: {
    hi: ['Между лопаток… вы знаете, где у меня мурашки, {х}.', 'Спасибо, что бережёте меня, {х}.', '*выгибается, как кошка* Простите, {х}… приятно.'],
    mid: ['Ой! Уже бегу работать, {х}!', 'Спасибо, {х}… наверное, я заслужил{|а}.', 'Не волнуйтесь, {х}, я справлюсь!'],
    lo: ['*вздрагивает* Иду, {х}, иду.', '*молча кланяется*'] },
  hand: {
    hi: ['Ладонь у вас тёплая, {х}. Можно я подержу ещё?', '*переплетает пальцы и тут же краснеет* Простите, {х}… можно?', 'Куда прикажете, {х}, — туда и пойду.'],
    mid: ['Ой… руки у меня в муке, простите, {х}.', 'Как скажете, {х}.', '*осторожно сжимает ваши пальцы*'],
    lo: ['*руки дрожат* …Да, {х}.', 'Простите, {х}, я не смею.'] },
};
const TL_TRAIT = {
  charming: ['Вам нравится, {х}? Я так хотел{|а} вам понравиться.', 'Ласка ваших рук — лучшая награда, {х}.'],
  stubborn: ['Признаю, {х}… это приятно. Только никому не говорите, ладно?', '*сдаётся и улыбается* Вы победили, {х}.'],
  sensitive: ['Только понежнее, {х}… вот так.', 'У меня сердце сейчас выпрыгнет, {х}.'],
  cheerful: ['Хи-хи! Щекотно, {х}! Простите!', 'Ой, я сейчас захихикаю на всю лавку, {х}!'],
  lazy: ['Вот это служба, {х}, — лучшая на свете.', 'Ещё полчасика так, {х}, — и я усну у ваших ног.'],
  loyal: ['Ваши руки — единственные, которым я верю, {х}.', 'Я ваш{|а}, {х}. Целиком.'],
  clever: ['Я посчитал{|а}: вы гладите меня уже третий раз за час, {х}. Позвольте — пусть будет и четвёртый.', 'Вы же знаете, как на меня это действует, {х}…'],
  diligent: ['Ой, я разомлел{|а}, {х}… но работу всё равно доделаю!'],
  gourmet: ['Это почти так же хорошо, как медовый пряник, {х}. Почти.'],
};
const TL_HEAT = ['*жарко выдыхает* Не останавливайтесь, {х}… пожалуйста.', 'Простите, {х}… эти дни я сама не своя. Побудьте рядом?', 'От вас так пахнет, {х}… голова кружится.', 'Мр-р… простите, {х}, течка — ужасная штука.', 'Если вы уйдёте, {х}, я буду ждать у двери.'];
const TL_TIRED = ['Спасибо, {х}… на сегодня мне уже довольно ласки.', 'Я уже растаял{|а}, {х}. Совсем.', 'Ещё немного — и я весь день буду ходить с глупой улыбкой, {х}.'];
const TL_MARKET = {
  hi: ['*краснеет* Вы смелый покупатель, {г}…', 'Купите меня, {г}, — и сможете так каждый день.'],
  mid: ['Простите, {г}… продавец смотрит.', '*робко отступает* Сначала договоритесь с продавцом, {г}.'],
  lo: ['*отшатывается* Простите, {г}…', 'Пожалуйста, не надо, {г}.'],
};
const T_EXPR = {
  hi: { head: 'happy', ears: 'flushed', tail: 'flushed', cheek: 'shy', hair: 'happy', shoulder: 'sleepy', back: 'happy', hand: 'shy' },
  mid: { head: 'shy', ears: 'surprised', tail: 'surprised', cheek: 'shy', hair: 'surprised', shoulder: 'happy', back: 'surprised', hand: 'shy' },
};
function touch(uid, zone, side) {
  const c = findAny(uid); if (!c) return;
  const owned = !!findOwned(uid);
  if (zone === 'ears' && c.race !== 'beast' && c.race !== 'elf') zone = 'head';
  if (zone === 'tail' && c.race !== 'beast') zone = 'back';
  const Z = ZONES[zone] || ZONES.head;
  const { T, tier, need } = touchTier(c, zone);
  const cat = c.race === 'beast';
  const say = (line, expr, ms) => { react(c, expr, gx(c, line), ms || 2600); };
  const snd = () => { try { sfx(Z.snd); } catch (e) { } };
  if (!owned) {
    const t2 = c.loyalty >= 40 ? 'hi' : c.loyalty >= 22 ? 'mid' : 'lo';
    say(pick(TL_MARKET[t2]), t2 === 'lo' ? 'angry' : t2 === 'mid' ? 'surprised' : 'shy');
    Anim.touch(uid, zone, t2 === 'hi' ? 0.5 : 0.2, t2 !== 'lo', side); snd();
    try { Audio_.voice(t2 === 'lo' ? 'hmph' : t2 === 'mid' ? 'oh' : 'giggle', c.g, 0.25); } catch (e) { }
    return;
  }
  const ts = touchState(c);
  if (tier === 'lo') {
    stressGain(c, 2); c.aff = clamp((c.aff || 0) - 1);
    say(pick(TL[zone].lo), has(c, 'sensitive') ? 'sad' : 'angry');
    Anim.touch(uid, zone, 0, false, side); sfx('bad');
    try { Audio_.voice(pick(['grumble', 'hmph']), c.g, 0.15); } catch (e) { }
    toast(`${fn1(c)} отстраняется: доверие ${T} из ${need} нужных («${Z.n}»). Стресс +2.`);
    save(); setTimeout(() => refreshCardStats(c), 50); return;
  }
  const f = touchLeft(c, zone); ts.n[zone] = (ts.n[zone] || 0) + 1; ts.total++;
  if (f <= 0) { try { Audio_.voice('sigh', c.g, 0.2); } catch (e) { } say(pick(TL_TIRED), 'sleepy'); Anim.touch(uid, zone, 0.1, true, side); toast(`«${Z.n}»: на сегодня хватит — эффект иссяк. Попробуйте другую зону.`); save(); return; }
  const k = f * (tier === 'mid' ? 0.5 : 1), d = {};
  const fx = Z.fx;
  if (fx.mood) { d.mood = Math.round(fx.mood * k); c.moodMod += d.mood; }
  if (fx.stress) { d.stress = -Math.round(-fx.stress * k); c.stress = clamp(c.stress + d.stress); }
  if (fx.fat) { d.fat = -Math.round(-fx.fat * k); c.fatigue = clamp(c.fatigue + d.fat); }
  if (fx.loy) d.loy = loyaltyGain(c, fx.loy * k);
  if (fx.aff) { d.aff = Math.round(fx.aff * k * 10) / 10; c.aff = clamp((c.aff || 0) + d.aff); }
  c.heatCare = S.day;
  let pool = TL[zone][tier].slice();
  if (tier === 'hi') { for (const t of c.traits) if (TL_TRAIT[t] && R() < 0.5) pool.push(...TL_TRAIT[t]); if (inHeat(c)) pool = pool.concat(TL_HEAT, TL_HEAT); }
  let expr = (T_EXPR[tier] || T_EXPR.mid)[zone];
  if (inHeat(c) && tier === 'hi') expr = 'flushed';
  if (tier === 'hi' && (has(c, 'charming') || has(c, 'cheerful')) && R() < 0.3) expr = 'wink';
  say(pick(pool), expr);
  const strength = clamp(T / 100, 0, 1) * (0.5 + 0.5 * f);
  Anim.touch(uid, zone, strength, true, side); snd();
  try {
    if (tier === 'mid') Audio_.voice(pick(['oh', 'hum']), c.g, 0.35);
    else Audio_.voice(zone === 'cheek' || zone === 'tail' || zone === 'hand' ? pick(['giggle', 'content']) : zone === 'shoulder' || zone === 'back' ? pick(['sigh', 'hum']) : pick(['hum', 'content', 'sigh']), c.g, 0.4);
  } catch (e) { }
  if (tier === 'hi') { setTimeout(() => sfx(cat && (zone === 'head' || zone === 'ears' || zone === 'tail') ? 'heart' : zone === 'cheek' || zone === 'tail' ? 'giggle' : 'heart'), 380); if (zone === 'head' || zone === 'ears' || zone === 'hair' || zone === 'back') try { Audio_.purr(strength, cat); } catch (e) { } }
  const parts = Object.entries(d).filter(([, v]) => v).map(([s2, v]) => `${FX_N[s2]} ${v > 0 ? '+' : '−'}${Math.abs(v)}`);
  toast(`${Z.n}: ${parts.join(', ') || 'без эффекта'}${k < 1 ? ` (эффект ${Math.round(k * 100)}%${tier === 'mid' ? ', смущается' : ''})` : ''}.`);
  save(); setTimeout(() => { if (UI.screen === 'card' && UI.cardUid === uid) { refreshCardStats(c); refreshTouchChips(c); } }, 60);
}
function pet(uid) { return touch(uid, 'head'); }
function touchChipsHtml(c) {
  const owned = !!findOwned(c.uid);
  return `<div class="tz-chips" id="tz-chips">${zonesFor(c).map(z => {
    const L = owned ? touchLeft(c, z) : 1, tt = touchTier(c, z);
    return `<button class="tz-chip ${owned && tt.tier === 'lo' ? 'lo' : ''} ${L <= 0 ? 'done' : ''}" data-touch="${z}" data-uid="${c.uid}">${ZONES[z].n}${owned ? `<small>${tt.tier === 'lo' ? 'не доверяет' : L <= 0 ? 'хватит' : Math.round(L * (tt.tier === 'mid' ? 50 : 100)) + '%'}</small>` : ''}</button>`;
  }).join('')}<button class="tz-help" data-help="touch" aria-label="Справка">?</button></div>`;
}
function refreshTouchChips(c) { const el = document.getElementById('tz-chips'); if (el) el.outerHTML = touchChipsHtml(c); }
// зоны поверх рисунка (в процентах от .art-box)
function placeZones() {
  const cp = document.querySelector('.card-portrait'); if (!cp) return;
  const box = cp.querySelector('.art-box'); if (!box || box.querySelector('.tz')) return;
  const c = findAny(cp.dataset.uid); if (!c) return;
  const zg = Anim.zoneGeom(box.dataset.key, box.dataset.race); if (!zg) return;
  if (UI.cardMode === 'punish' && findOwned(c.uid)) { box.insertAdjacentHTML('beforeend', punishZonesHtml(c, zg)); const o2 = cp.querySelector('.zones'); if (o2) o2.remove(); return; }
  const order = [['shoulderL', 'shoulder', -1], ['shoulderR', 'shoulder', 1], ['handL', 'hand', -1], ['handR', 'hand', 1], ['tail', 'tail', 1], ['hairL', 'hair', -1], ['hairR', 'hair', 1], ['cheekL', 'cheek', -1], ['cheekR', 'cheek', 1], ['head', 'head', 0], ['earL', 'ears', -1], ['earR', 'ears', 1]];
  const html = order.filter(([k]) => zg[k]).map(([k, z, sd]) => { const b = zg[k]; return `<div class="tz tz-${z}" data-touch="${z}" data-uid="${c.uid}" data-side="${sd}" title="${ZONES[z].n}" style="left:${b.x.toFixed(1)}%;top:${b.y.toFixed(1)}%;width:${b.w.toFixed(1)}%;height:${b.h.toFixed(1)}%"></div>`; }).join('');
  box.insertAdjacentHTML('beforeend', html);
  const old = cp.querySelector('.zones'); if (old) old.remove();
}

// ---------- сблизиться ----------
function closeInfo(c) {
  const h = inHeat(c);
  const nL = h ? 45 : 55, nM = h ? 40 : 50, nA = h ? 25 : 40;
  const reqs = [['Лояльность', Math.round(c.loyalty), nL], ['Настроение', mood(c), nM], ['Симпатия', Math.round(c.aff || 0), nA]];
  const why = [];
  if (c.status !== 'home') why.push('сейчас на заказе');
  if (c.sickDays > 0 || c.health < 40) why.push('нездоровится');
  if (c.fatigue >= 85) why.push('валится с ног от усталости');
  if (c.closeDay === S.day) why.push('сегодня вы уже были вместе');
  const okReq = reqs.every(r => r[1] >= r[2]);
  return { ok: okReq && !why.length, okReq, reqs, why, heat: h };
}
const CLOSE_REFUSE = {
  any: ['Простите, {х}… я ещё не готов{|а}. Позвольте мне немного времени.', 'Вы мне нравитесь, {х}… но мне страшно. Простите.', 'Если позволите, {х}… может, сначала побудем рядом? Пряник, доброе слово…'],
  stubborn: ['*упрямо смотрит в пол* Простите, {х}. Не сегодня. Я и сам{|а} не знаю почему.'],
  sensitive: ['Простите… мне нужно больше времени, {х}. Не сердитесь, пожалуйста.'],
  charming: ['*смущённо улыбается* Ещё чуть-чуть ухаживаний, {х}… если позволите.'],
  loyal: ['Я вам верю, {х}. Но сердцу нужно ещё чуть-чуть. Простите.'],
  cheerful: ['Ой, {х}! Давайте не сегодня? Простите-простите!'],
  tired: ['Простите, {х}… я еле на ногах стою.'],
  sad: ['Простите, {х}… у меня совсем нет сил улыбаться. Не сегодня.'],
};
function closenessModal(uid) {
  const c = findOwned(uid); if (!c) return;
  const ci = closeInfo(c);
  const reqHtml = `<table class="req">${ci.reqs.map(([n, v, need]) => `<tr class="${v >= need ? 'ok' : 'no'}"><td>${v >= need ? '✓' : '✗'} ${n}</td><td><b>${v}</b> / ${need}</td></tr>`).join('')}</table>${ci.heat ? '<div class="small heat-t">Течка: пороги ниже.</div>' : ''}`;
  if (!ci.ok) {
    let pool = CLOSE_REFUSE.any.slice();
    for (const t of c.traits) if (CLOSE_REFUSE[t]) pool = CLOSE_REFUSE[t].concat(CLOSE_REFUSE[t], pool);
    if (c.fatigue >= 85) pool = CLOSE_REFUSE.tired; else if (mood(c) < 35) pool = CLOSE_REFUSE.sad;
    const line = ci.why.includes('сегодня вы уже были вместе') ? '{Х}… ещё раз? Простите, мне нужно прийти в себя до завтра.' : pick(pool);
    react(c, ci.why.length ? 'sleepy' : 'shy', gx(c, line), 3000);
    return showModal('Сблизиться', `<p class="quote">«${esc(gx(c, line))}»</p>${reqHtml}${ci.why.length ? `<p class="small">Сейчас нельзя: ${ci.why.join(', ')}.</p>` : `<p class="small">Ничего страшного — откажут мягко, без последствий. Поднимите недостающее: ласка и подарки — настроение и симпатию, похвала и забота — лояльность.</p>`}<p class="small"><a href="#" data-help="close">Как это работает</a></p>`, [{ label: 'Понятно', cls: 'btn-primary', act: 'close' }]);
  }
  showModal('Сблизиться', `<p>${esc(fn1(c))} ${gx(c, 'смущённо улыбается и не отводит глаз. Согласие есть.')}</p>${reqHtml}
    <p class="small">Сначала — шуточная разминка «Кабачок и корзинка»: водите пальцем вверх-вниз, чтобы кабачок нырял в горлышко нарядной корзинки с медальоном, на котором — ${esc(fn1(c))}, и выныривал обратно. Чем больше ходов, глубже и ритмичнее — тем больше очков. Чем лучше настроение и меньше стресс, тем шире горлышко и спокойнее качается корзинка. Очки усилят эффект вечера.</p>`,
    [{ label: 'Не сейчас', act: 'close' }, { label: 'Начать', cls: 'btn-primary', act: () => zucchiniGame(uid) }]);
}

// мини-игра: кабачок и корзинка — ритм и глубина
let _zg = null;
function zgFace(c, cb) {
  const p = presetById(c.preset); if (!p) return cb(null);
  const key = artKeyFor(c, p), dir = key !== p.id ? PORTRAIT_CFG.outfitDir : PORTRAIT_CFG.artDir;
  const tries = [dir + key + '_face' + PORTRAIT_CFG.ext, PORTRAIT_CFG.artDir + p.id + '_face' + PORTRAIT_CFG.ext];
  const go = (i) => { if (i >= tries.length) return cb(null); const im = new Image(); im.onload = () => cb(im); im.onerror = () => go(i + 1); im.src = tries[i]; };
  go(0);
}
function zucchiniGame(uid) {
  const c = findOwned(uid); if (!c) return;
  const diff = clamp((100 - mood(c)) / 110 + c.stress / 250 - (inHeat(c) ? 0.15 : 0), 0.12, 0.95);
  showModal('Кабачок и корзинка', `<div class="zg-wrap"><canvas id="zg" class="zg-cv"></canvas><div class="zg-hud"><span>Очки: <b id="zg-s">0</b></span><span id="zg-msg"></span><span><b id="zg-t">15</b> с</span></div></div><p class="small muted center">Водите пальцем вверх-вниз: кабачок ныряет в корзинку и выныривает. Глубже и в такт сердечку — больше очков. Корзинка качается — входите, когда горлышко под кабачком.</p>`,
    [{ label: 'Хватит', act: () => _zg && _zg.finish() }]);
  const cv = document.getElementById('zg'), wrap = cv.parentElement;
  const W = Math.min(340, wrap.clientWidth || 320), H = 330, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const x = cv.getContext('2d'); x.scale(dpr, dpr);
  const ZW = 22, ZL = 92, BY = H - 150, DMAX = ZL * 0.72;
  const TOP = BY - ZL / 2 - 70, BOT = BY - ZL / 2 + DMAX;
  const AMP = W * (0.05 + diff * 0.17), OM = 0.8 + diff * 1.4;
  const P = 0.85 - (1 - diff) * 0.2; // идеальный темп удара, с
  const G = { pts: 0, strokes: 0, deep: 0, bumps: 0, rhythm: 0.5, depth: 0, dmax: 0, zx: W / 2, zy: TOP + 20, ty: TOP + 20, drag: false, inside: false, blocked: false, lastStroke: 0, shake: 0, bounce: 0, msg: '', pops: [], t0: performance.now(), dur: 15000, done: false, mw: 40 + (1 - diff) * 26, face: null, ini: (fn1(c) || '?').slice(0, 1).toUpperCase() };
  zgFace(c, im => { G.face = im; });
  const lines = { deep: ['Глубоко!', 'До самого донышка!', 'Корзинка довольна.', 'Вот это сноровка!'], beat: ['В ритм!', 'Ровно в такт!', 'Как по нотам!'], fast: ['Слишком быстро!', 'Помедленнее…'], slow: ['Не засыпайте!', 'Живее!'], bump: ['Ой, мимо горлышка!', 'Бум! Край корзинки.', 'Корзинка хихикает.'] };
  const say = (t) => { G.msg = t; const m = document.getElementById('zg-msg'); if (m) m.textContent = t; };
  const pos = e => { const r = cv.getBoundingClientRect(); return (e.clientY - r.top) * H / r.height; };
  cv.addEventListener('pointerdown', e => { G.drag = true; G.py0 = pos(e); G.ty0 = G.ty; try { cv.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!G.drag) return; G.ty = clamp(G.ty0 + (pos(e) - G.py0) * 1.15, TOP, BOT); e.preventDefault(); });
  const up = () => { G.drag = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.style.touchAction = 'none';
  let last = performance.now();
  function frame(now) {
    if (G.done) return;
    if (!document.getElementById('zg')) { G.done = true; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const el = now - G.t0, left = Math.max(0, G.dur - el);
    const tEl = document.getElementById('zg-t'); if (tEl) tEl.textContent = Math.ceil(left / 1000);
    // корзинка качается: чем хуже настроение и больше стресс — тем сильнее
    const bx = W / 2 + AMP * Math.sin(el / 1000 * OM) + (diff > 0.5 ? AMP * 0.3 * Math.sin(el / 1000 * OM * 2.6) : 0);
    G.tilt = (AMP / W) * 0.5 * Math.cos(el / 1000 * OM);
    G.bx = bx;
    const k = 1 - Math.pow(0.00002, dt);
    let ny = G.zy + (G.ty - G.zy) * k;
    const tip = ny + ZL / 2, tol = (G.mw - ZW) / 2 + 4;
    if (!G.inside) {
      // снаружи кабачок тянется за корзинкой с запаздыванием
      G.zx += (bx - G.zx) * (1 - Math.pow(0.5, dt * (7 - diff * 5)));
      if (G.blocked && tip < BY - 18) G.blocked = false;
      if (tip >= BY) {
        if (!G.blocked && Math.abs(G.zx - bx) <= tol) { G.inside = true; G.dmax = 0; }
        else { if (!G.blocked) { G.bumps++; G.shake = 1; say(pick(lines.bump)); sfx('boing'); } G.blocked = true; ny = BY - ZL / 2 - 2; G.ty = Math.min(G.ty, ny); }
      }
    }
    G.zy = ny;
    if (G.inside) {
      G.zx = bx;
      G.depth = clamp((G.zy + ZL / 2 - BY) / DMAX, 0, 1); G.dmax = Math.max(G.dmax, G.depth);
      if (G.depth > 0.92 && !G.hitBottom) { G.hitBottom = true; G.bounce = 1; }
      if (G.depth < 0.8) G.hitBottom = false;
      if (G.zy + ZL / 2 < BY - 2) { // вынырнул — один «ход» засчитан
        G.inside = false;
        if (G.dmax > 0.18) {
          const per = G.lastStroke ? (now - G.lastStroke) / 1000 : P;
          G.lastStroke = now;
          const q = clamp(1 - Math.abs(per - P) / P, 0, 1);
          G.rhythm = G.rhythm * 0.6 + q * 0.4;
          const got = Math.round((2 + G.dmax * 8) * (0.5 + G.rhythm));
          G.pts += got; G.strokes++; if (G.dmax > 0.85) G.deep++;
          const s = document.getElementById('zg-s'); if (s) s.textContent = G.pts;
          G.pops.push({ x: bx, y: BY - 10, t: now, n: got });
          if (G.dmax > 0.85 && q > 0.6) { say(pick(lines.beat)); sfx('plop'); }
          else if (G.dmax > 0.85) { say(pick(lines.deep)); sfx('plop'); }
          else if (per < P * 0.55) say(pick(lines.fast));
          else if (per > P * 1.8) say(pick(lines.slow));
          else sfx('pop');
        }
      }
    } else G.depth = 0;
    G.shake = Math.max(0, G.shake - dt * 3); G.bounce = Math.max(0, G.bounce - dt * 4);
    drawZ(x, W, H, G, bx, BY, ZW, ZL, DMAX, P, now, Math.abs(G.zx - bx) <= tol);
    if (left <= 0) return G.finish();
    requestAnimationFrame(frame);
  }
  G.finish = () => { if (G.done) return; G.done = true; closeModal(); closenessResult(uid, Math.round(Math.min(6, G.pts / 30) * 10) / 10, G.bumps, G); };
  _zg = G; requestAnimationFrame(frame);
}
function zgBasket(x, G, bw, bh, mw, open) {
  // задняя кромка и тёмное горлышко
  x.fillStyle = '#e9b9a4'; x.strokeStyle = '#7a3f3a'; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(0, 0, bw / 2 + 5, 11, 0, Math.PI, Math.PI * 2); x.fill(); x.stroke();
  x.fillStyle = open ? '#3a1d22' : '#4a2328'; x.beginPath(); x.ellipse(0, 0, mw / 2, 7, 0, 0, Math.PI * 2); x.fill();
}
function zgBasketFront(x, G, bw, bh, mw, open, now) {
  // тело корзинки — плетёное, розово-кремовое
  const bodyPath = () => { x.beginPath(); x.moveTo(-bw / 2, 0); x.bezierCurveTo(-bw / 2 - 4, bh * 0.6, -bw / 2 + 14, bh, -bw / 2 + 26, bh); x.lineTo(bw / 2 - 26, bh); x.bezierCurveTo(bw / 2 - 14, bh, bw / 2 + 4, bh * 0.6, bw / 2, 0); x.closePath(); };
  const g = x.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, '#d99a86'); g.addColorStop(0.5, '#f4cdb9'); g.addColorStop(1, '#d4917e');
  x.fillStyle = g; x.strokeStyle = '#7a3f3a'; x.lineWidth = 2.5; bodyPath(); x.fill(); x.stroke();
  x.save(); bodyPath(); x.clip();
  x.strokeStyle = 'rgba(122,63,58,.35)'; x.lineWidth = 1.4;
  for (let r = 0; r < 9; r++) for (let i = -8; i <= 8; i++) { const yy = 8 + r * 11, xx = i * 14 + (r % 2) * 7; x.beginPath(); x.ellipse(xx, yy, 7, 4.5, 0, 0, Math.PI * 2); x.stroke(); }
  x.restore();
  // кружевная оборка по низу
  x.fillStyle = '#fffaf4'; x.strokeStyle = 'rgba(160,110,110,.6)'; x.lineWidth = 1;
  for (let i = -bw / 2 + 32; i <= bw / 2 - 30; i += 10) { x.beginPath(); x.arc(i, bh, 5, 0, Math.PI); x.fill(); x.stroke(); x.fillStyle = 'rgba(160,110,110,.5)'; x.beginPath(); x.arc(i, bh + 2, 1.2, 0, 7); x.fill(); x.fillStyle = '#fffaf4'; }
  // лента с бантом
  const ry = bh * 0.3;
  x.fillStyle = '#e46f8f'; x.fillRect(-bw / 2 + 2, ry, bw - 4, 9); x.strokeStyle = '#9c3555'; x.lineWidth = 1; x.strokeRect(-bw / 2 + 2, ry, bw - 4, 9);
  const bxw = -bw / 2 + 26;
  x.fillStyle = '#ef87a4'; x.strokeStyle = '#9c3555'; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(bxw, ry + 4); x.bezierCurveTo(bxw - 22, ry - 14, bxw - 24, ry + 22, bxw, ry + 4); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(bxw, ry + 4); x.bezierCurveTo(bxw + 22, ry - 14, bxw + 24, ry + 22, bxw, ry + 4); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(bxw - 2, ry + 6); x.lineTo(bxw - 9, ry + 24); x.lineTo(bxw - 3, ry + 21); x.moveTo(bxw + 2, ry + 6); x.lineTo(bxw + 8, ry + 25); x.lineTo(bxw + 3, ry + 21); x.stroke();
  x.fillStyle = '#c94d72'; x.beginPath(); x.arc(bxw, ry + 4, 3.5, 0, 7); x.fill();
  // медальон с лицом
  const my = bh * 0.58, mr = 25;
  x.fillStyle = '#f3d27a'; x.strokeStyle = '#8a6420'; x.lineWidth = 2;
  x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.arc(Math.cos(a) * (mr + 3), my + Math.sin(a) * (mr + 3), 4, 0, 7); } x.fill();
  x.beginPath(); x.arc(0, my, mr + 2, 0, 7); x.fill(); x.stroke();
  x.save(); x.beginPath(); x.arc(0, my, mr - 1, 0, 7); x.clip();
  x.fillStyle = '#fff1ea'; x.fillRect(-mr, my - mr, mr * 2, mr * 2);
  if (G.face) { const s = (mr * 2) * 1.35; x.drawImage(G.face, -s / 2, my - mr - s * 0.12, s, s); }
  else { x.fillStyle = '#c94d72'; x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(G.ini, 0, my + 1); x.textAlign = 'start'; x.textBaseline = 'alphabetic'; }
  x.restore();
  x.strokeStyle = '#8a6420'; x.lineWidth = 2; x.beginPath(); x.arc(0, my, mr - 1, 0, 7); x.stroke();
  // передняя кромка с кружевом и цветочками
  x.fillStyle = '#f0c6b4'; x.strokeStyle = '#7a3f3a'; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(0, 0, bw / 2 + 5, 11, 0, 0, Math.PI); x.fill(); x.stroke();
  x.fillStyle = '#fffaf4'; x.strokeStyle = 'rgba(160,110,110,.6)'; x.lineWidth = 1;
  for (let a = 0.12; a < Math.PI - 0.1; a += 0.22) { const px = Math.cos(a) * (bw / 2 + 5), py = Math.sin(a) * 11 + 3; x.beginPath(); x.arc(px, py, 4, 0, Math.PI); x.fill(); x.stroke(); }
  x.strokeStyle = open ? 'rgba(120,200,120,.9)' : 'rgba(255,255,255,.0)'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(0, 0, mw / 2 + 2, 8, 0, 0, Math.PI * 2); x.stroke();
  const flower = (fx, fy, col) => { x.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + now / 3000; x.beginPath(); x.arc(fx + Math.cos(a) * 4.5, fy + Math.sin(a) * 4.5, 3.6, 0, 7); x.fill(); } x.fillStyle = '#ffd95a'; x.beginPath(); x.arc(fx, fy, 2.6, 0, 7); x.fill(); };
  flower(bw / 2 - 6, 4, '#ffffff'); flower(bw / 2 - 20, 9, '#f7a8c0'); flower(-bw / 2 + 10, 6, '#f7a8c0'); flower(bw / 2 + 4, -4, '#c9a8f0');
}
function drawZ(x, W, H, G, bx, BY, ZW, ZL, DMAX, P, now, aligned) {
  x.clearRect(0, 0, W, H);
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fbe9df'); bg.addColorStop(1, '#efc9b8'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(122,63,58,.10)'; x.fillRect(0, H - 22, W, 22);
  const sx = G.shake ? Math.sin(now / 25) * 4 * G.shake : 0, sq = 1 - G.bounce * 0.05;
  const mw = G.mw, bw = mw + 104, bh = 122, X = bx + sx;
  // тень
  x.fillStyle = 'rgba(80,30,30,.15)'; x.beginPath(); x.ellipse(X, BY + bh + 6, bw / 2, 7, 0, 0, 7); x.fill();
  x.save(); x.translate(X, BY + bh); x.rotate(G.tilt || 0); x.scale(1 / sq, sq); x.translate(0, -bh);
  zgBasket(x, G, bw, bh, mw, aligned || G.inside);
  // кабачок — между задней и передней стенкой
  x.restore();
  x.save();
  const zx = G.zx, zy = G.zy;
  x.translate(zx, zy);
  const zg = x.createLinearGradient(-ZW / 2, 0, ZW / 2, 0); zg.addColorStop(0, '#2f6b26'); zg.addColorStop(0.45, '#6fae45'); zg.addColorStop(1, '#2a5a20');
  x.fillStyle = zg; x.strokeStyle = '#1d3d14'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(-ZW / 2 + 2, -ZL / 2 + 8); x.quadraticCurveTo(0, -ZL / 2 - 4, ZW / 2 - 2, -ZL / 2 + 8); x.lineTo(ZW / 2, ZL / 2 - 10); x.quadraticCurveTo(0, ZL / 2 + 6, -ZW / 2, ZL / 2 - 10); x.closePath(); x.fill(); x.stroke();
  x.strokeStyle = 'rgba(220,240,180,.5)'; x.lineWidth = 1.5; for (const o of [-5, 0, 5]) { x.beginPath(); x.moveTo(o, -ZL / 2 + 8); x.lineTo(o * 0.9, ZL / 2 - 8); x.stroke(); }
  x.fillStyle = '#7a5a2a'; x.fillRect(-3, -ZL / 2 - 9, 6, 9);
  x.restore();
  x.save(); x.translate(X, BY + bh); x.rotate(G.tilt || 0); x.scale(1 / sq, sq); x.translate(0, -bh);
  zgBasketFront(x, G, bw, bh, mw, aligned || G.inside, now);
  x.restore();
  // шкала глубины (справа)
  const mx = W - 18, mt = 40, mh = 150;
  x.fillStyle = 'rgba(255,255,255,.7)'; x.strokeStyle = '#7a3f3a'; x.lineWidth = 1.5; x.beginPath(); x.roundRect ? x.roundRect(mx - 6, mt, 12, mh, 6) : x.rect(mx - 6, mt, 12, mh); x.fill(); x.stroke();
  const dg = x.createLinearGradient(0, mt + mh, 0, mt); dg.addColorStop(0, '#f7a8c0'); dg.addColorStop(1, '#c94d72');
  x.fillStyle = dg; const dh = mh * G.depth; x.fillRect(mx - 4, mt + 2, 8, Math.max(0, dh - 2));
  if (G.dmax && G.inside) { x.fillStyle = '#7a3f3a'; x.fillRect(mx - 8, mt + mh * G.dmax - 1, 16, 2); }
  x.fillStyle = '#7a3f3a'; x.font = '10px sans-serif'; x.textAlign = 'center'; x.fillText('глуб.', mx, mt - 6);
  // шкала ритма (слева) и сердечко-метроном
  const lx = 18;
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.roundRect ? x.roundRect(lx - 6, mt, 12, mh, 6) : x.rect(lx - 6, mt, 12, mh); x.fill(); x.stroke();
  x.fillStyle = '#e46f8f'; const rh = mh * G.rhythm; x.fillRect(lx - 4, mt + mh - rh + 2, 8, Math.max(0, rh - 4));
  x.fillStyle = '#7a3f3a'; x.fillText('ритм', lx, mt - 6);
  const beat = ((now - G.t0) / 1000 / P) % 1, hs = 1 + Math.max(0, 1 - beat * 4) * 0.45;
  x.save(); x.translate(lx + 4, mt + mh + 26); x.scale(hs, hs); x.fillStyle = '#e46f8f'; x.font = '22px serif'; x.fillText('♥', 0, 8); x.restore();
  x.fillStyle = '#7a3f3a'; x.font = '11px sans-serif'; x.fillText(`ходов ${G.strokes}`, W / 2, H - 6);
  x.textAlign = 'start';
  for (const p of G.pops) { const a = (now - p.t) / 900; if (a > 1) continue; x.globalAlpha = 1 - a; x.fillStyle = '#c94d72'; x.font = 'bold 15px sans-serif'; x.fillText('+' + p.n, p.x + 30, p.y - a * 40); x.font = '16px serif'; x.fillText('♥', p.x - 40 + a * 10, p.y - 4 - a * 30); x.globalAlpha = 1; }
  G.pops = G.pops.filter(p => now - p.t < 900);
  if (!G.drag && !G.strokes && !G.bumps) { x.fillStyle = 'rgba(90,40,40,.75)'; x.font = '14px sans-serif'; x.textAlign = 'center'; x.fillText('↕ водите пальцем вверх-вниз', W / 2, 20); x.textAlign = 'start'; }
}
const CLOSE_SCENE = {
  any: ['{n} берёт вас за руку, робко заглядывает в глаза и ведёт в комнату. Дверь закрывается. Остальное знают только свечи.', 'Шёпот, смешок, шорох одеяла — и темнота. Луна деликатно уходит за тучу.', '«Только свечу не гасите сразу, {х}», — просит {n}. Свеча гаснет сама. Предательница.'],
  charming: ['{n} лукаво улыбается и шепчет: «Позвольте мне сегодня порадовать вас, {х}». Свеча гаснет.'],
  sensitive: ['{n} долго не решается, а потом прижимается к вам и шепчет: «Только не уходите до утра, {х}». Вы и не уходите.'],
  stubborn: ['«Позвольте, я сам{|а} задую свечу, {х}», — просит {n}. Вы позволяете. Темнота.'],
  cheerful: ['{n} хохочет, путаясь в рубашке, и шепчет «простите, {х}»… Дальше — занавес.'],
  loyal: ['{n} смотрит так, будто ждал{|а} этого всю жизнь. Дальше — темнота и очень тихое «наконец-то, {х}».'],
  lazy: ['{n} тянет вас к постели: «Можно сегодня я побуду ленив{ым|ой} рядом с вами, {х}?» Свет гаснет.'],
  clever: ['{n} шепчет: «Я всё продумал{|а}, {х}», — и задувает свечу.'],
  beast: ['Хвост {n} обвивает вашу ногу, уши прижаты, глаза светятся в полумраке. Мурлыканье не стихает до рассвета.'],
  elf: ['{n} напевает старую эльфийскую песню, и где-то на третьем куплете слова теряются. Звёзды краснеют.'],
  dwarf: ['{n} кашляет: «Ну, раз уж кабачок влез, {х}…» — и задувает лампу. Гномы во всём основательны.'],
  heat: ['Эти дни {n} сама не своя — и сегодня наконец не нужно сдерживаться. Дальше — только темнота.'],
};
const CLOSE_MORNING = ['Утром {n} напевает себе под нос и краснеет при каждом вашем взгляде.', 'Утром {n} подаёт вам завтрак и делает вид, что ничего не было. Уши/щёки выдают с головой.', 'Утром {n} подмигивает вам через всю кухню. Повар роняет половник.', 'Утром {n} ходит с такой улыбкой, что покупатели спрашивают, что сегодня в продаже.'];
function playerSnap(c) {
  const pot = {}; for (const s of STATS) pot[s.key] = 60;
  return { uid: 'player', name: 'Хозяин лавки (вы)', preset: c.preset, race: c.race, g: 'm', rarity: 1, pot, traits: [], breed: { line: 60, her: 60 }, kin: [] };
}
function closenessResult(uid, score, miss, G) {
  const c = findOwned(uid); if (!c) return;
  const k = 0.5 + Math.min(score, 6) * 0.17;
  c.closeDay = S.day; c.heatCare = S.day;
  const da = Math.round(10 * k), dm = Math.round(12 * k), ds = Math.round(10 * k);
  c.aff = clamp((c.aff || 0) + da); c.moodMod += dm; c.stress = clamp(c.stress - ds);
  const dl = loyaltyGain(c, 4 * k); fatigueGain(c, 5);
  const heat = inHeat(c);
  let pregTxt = '', yes = false, pc = 0;
  if (c.g === 'f' && !c.preg && !playerFem()) {
    const room = S.owned.length + S.owned.filter(x => x.preg).length < S.capacity;
    pc = clamp(0.06 + c.breed.fert / 100 * 0.22 + (season().fert || 0) + (heat ? 0.15 : 0) + (k - 1) * 0.05 + (c.health - 70) / 400, 0.03, 0.5);
    if (!room) pregTxt = '<div class="small muted">В поместье нет места для наследника — беременность сейчас невозможна.</div>';
    else if (c.health < 50) pregTxt = '<div class="small muted">Здоровье ниже 50 — беременность сейчас невозможна.</div>';
    else {
      yes = R() < pc;
      if (yes) c.preg = { due: S.day + 9, start: S.day, father: playerSnap(c) };
      pregTxt = `<div class="preg-res ${yes ? 'yes' : 'no'}">Беременность: <b>${yes ? 'да' : 'нет'}</b></div>${whyHtml([['Плодовитость ' + c.breed.fert, c.breed.fert / 100 * 0.22 + 0.06, ''], ...(season().fert ? [['Сезон', season().fert, '']] : []), ...(heat ? [['Течка', 0.15, '']] : []), ['Мини-игра ×' + k.toFixed(2), (k - 1) * 0.05, ''], ['Здоровье ' + Math.round(c.health), (c.health - 70) / 400, '']], `<b>${Math.round(pc * 100)}%</b>`)}
        ${yes ? `<p class="small">${esc(fn1(c))} будет в положении <b>9 дней</b>, потом в поместье появится взрослый наследник.</p>` : ''}`;
    }
  }
  let pool = CLOSE_SCENE.any.slice();
  for (const t of c.traits) if (CLOSE_SCENE[t]) pool.push(...CLOSE_SCENE[t], ...CLOSE_SCENE[t]);
  if (CLOSE_SCENE[c.race]) pool.push(...CLOSE_SCENE[c.race]);
  if (heat) pool = CLOSE_SCENE.heat.concat(CLOSE_SCENE.heat, pool);
  const nm = esc(fn1(c));
  const scene = gx(c, pick(pool)).replace(/\{n\}/g, nm), morn = gx(c, pick(CLOSE_MORNING)).replace(/\{n\}/g, nm).replace('Уши/щёки', c.race === 'beast' ? 'Уши' : 'Щёки');
  addLog(`Вечер наедине с ${fn1(c)}.${yes ? ' Беременность!' : ''}`);
  sfx(yes ? 'sparkle' : 'heart');
  showModal('Вечер вдвоём', `<div class="fade-scene"><p>${scene}</p><p class="muted">…</p><p>${morn}</p></div>
    <div class="small">${G ? `Ходов: <b>${G.strokes}</b>, до донышка: <b>${G.deep}</b>, ритм <b>${Math.round(G.rhythm * 100)}%</b>, очков ${G.pts}${miss ? `, мимо горлышка: ${miss}` : ''}` : `Оценка: <b>${score}</b>`} → эффект ×${k.toFixed(2)}</div>
    <div class="mchips"><span class="mchip up">симпатия +${da}</span><span class="mchip up">настроение +${dm}</span><span class="mchip up">стресс −${ds}</span>${dl ? `<span class="mchip up">лояльность +${dl}</span>` : ''}<span class="mchip down">усталость +5</span></div>${pregTxt}`,
    [{ label: 'Доброе утро', cls: 'btn-primary', act: 'close' }]);
  save(); render();
  setTimeout(() => { try { Anim.setExpr('flushed', 5000); } catch (e) { } }, 300);
}

// ---------- «почему так» для торга, заказов и свиданий ----------
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
function mateWhy(a, b) {
  const inf = mateInfo(a, b), f = inf.f, m = inf.m;
  const avgMood = (mood(a) + mood(b)) / 2, avgLoy = (a.loyalty + b.loyalty) / 2, avgHp = (a.health + b.health) / 2;
  const w = [['Основа', '30%'], ['Симпатия пары', `+${inf.h.lvl * 20}%`], ['Настроение', pp((avgMood - 50) / 120)], ['Лояльность', pp((avgLoy - 40) / 150)]];
  if (inHeat(f)) w.push(['Течка', '+20%']);
  const p = [['Основа', '15%'], ['Плодовитость', pp(f.breed.fert / 100 * 0.35)], ['Сила рода', pp(m.breed.line / 100 * 0.2)], ['Здоровье', pp((avgHp - 70) / 300)], ['Настроение', pp((avgMood - 50) / 250)], ['Симпатия пары', pp(inf.h.lvl * 0.05)]];
  if (season().fert) p.push(['Сезон', pp(season().fert)]);
  if (m.fatigue > 70) p.push(['Усталость мужчины', '−8%']);
  if (inHeat(f)) p.push(['Течка', '+15%']);
  return whyHtml([...w.map(x => ['Согласие: ' + x[0], x[1]]), ...p.map(x => ['Беременность: ' + x[0], x[1]])], `${Math.round(inf.willing * 100)}% / ${Math.round(inf.preg * 100)}%`);
}

// ---------- обработчики ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-plantask],[data-help],[data-news],[data-closeness],[data-plan]');
  if (!t) return;
  const d = t.dataset;
  if (d.help != null) { e.preventDefault(); e.stopPropagation(); return helpModal(d.help); }
  if (d.news != null) return newsModal();
  if (d.plan != null) return dayPlanModal();
  if (d.closeness) return closenessModal(d.closeness);
  if (d.plantask) { const c = findOwned(d.uid); if (c && c.status === 'home' && assignTask(c, d.plantask)) { save(); render(); dayPlanModal(); } }
});
