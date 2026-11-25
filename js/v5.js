// ===== v5: автораспорядок, чайная, промахи в работе, полноэкранный портрет =====
'use strict';

// ---------- чайная: гостевой зал при хозяйстве (чай, пироги, беседы, музыка) ----------
// Внутренний ключ дела остаётся 'salon' ради совместимости сохранений; в интерфейсе — «Чайная».
JOB_DIFF.salon = { d: 42, w: { cha: 0.5, mas: 0.3, int: 0.2 }, n: 'Чайная', sk: 'Обаяние, Мастерство, Ум', bad: 'провести скучный вечер' };
const SALON_NEED = 35, SALON_EAGER = 55;
function profOf(c) { return Math.round(c.prof || 0); }
function salonBlock(c) {
  if (c.sickDays > 0) return 'болеет';
  if (c.health < 40) return 'здоровье ниже 40';
  if (c.status !== 'home') return 'на заказе';
  return '';
}
function salonWill(c) {
  const parts = [], m = mood(c);
  parts.push(['Лояльность ' + Math.round(c.loyalty), c.loyalty * 0.35], ['Настроение ' + m, m * 0.35], ['Доверие ' + Math.round(c.aff || 0), (c.aff || 0) * 0.1]);
  if (c.prof) parts.push(['Опыт ' + profOf(c), c.prof * 0.2]);
  if (has(c, 'charming')) parts.push(['Обаяние (черта)', 12]);
  if (has(c, 'cheerful')) parts.push(['Весёлый нрав', 8]);
  if (has(c, 'gourmet')) parts.push(['Сладкоежка', 5]);
  if (has(c, 'sensitive')) parts.push(['Ранимость', -6]);
  if (c.stress > 60) parts.push(['Стресс ' + Math.round(c.stress), -10]);
  const v = Math.round(parts.reduce((a, p) => a + p[1], 0));
  return { v, parts };
}
function salonOk(c) {
  const block = salonBlock(c), w = salonWill(c);
  return { ok: !block && w.v >= SALON_NEED, reluct: w.v < SALON_EAGER, will: w.v, block, parts: w.parts };
}
function salonIncome(c) {
  const b = gb(c), parts = [], so = salonOk(c);
  const base = 28 + (eff(c, 'cha') * 0.5 + eff(c, 'mas') * 0.25 + eff(c, 'int') * 0.15 + eff(c, 'luk') * 0.1) * 1.55;
  parts.push(['опыт ' + profOf(c), 1 + (c.prof || 0) / 100 * 0.5]);
  parts.push(['настроение', moodF(c)], ['усталость', fatF(c)], ['здоровье', hpF(c)], ['лояльность', 0.85 + 0.3 * c.loyalty / 100]);
  if (has(c, 'charming')) parts.push(['обаяние', 1.2]);
  if (has(c, 'cheerful')) parts.push(['весёлый нрав', 1.1]);
  if (has(c, 'gourmet')) parts.push(['знает толк в пирогах', 1.05]);
  if (has(c, 'sensitive')) parts.push(['ранимость', 0.92]);
  if (b.inc) parts.push(['снаряжение', 1 + b.inc / 100]);
  if (season().inc) parts.push([season().name.toLowerCase(), 1 + season().inc]);
  if (season().name === 'Зима') parts.push(['зимой чай нарасхват', 1.15]);
  if (evNum('shop')) parts.push([mev().name.toLowerCase(), 1 + evNum('shop')]);
  parts.push(['спрос в городе', 0.8 + 0.2 * (S.econ.race[c.race] || 1)]);
  if (so.reluct) parts.push(['без охоты', 0.85]);
  const mult = parts.reduce((a, p) => a * p[1], 1);
  return { base, mult, parts, v: Math.round(base * mult) };
}
function salonRisk(c) {
  const parts = [];
  const add = (l, v, h) => { if (Math.abs(v) >= 0.0005) parts.push([l, v, h || '', 'r']); };
  add('База', 0.04, 'поздние вечера, горячий самовар, шумные гости');
  add('Опыт ' + profOf(c), -(c.prof || 0) / 100 * 0.03, 'опыт бережёт');
  add('Выносливость ' + eff(c, 'end'), -clamp((eff(c, 'end') - 30) / 100 * 0.03, -0.01, 0.02), '');
  if (c.fatigue > 50) add('Усталость ' + Math.round(c.fatigue), (c.fatigue - 50) / 400, '');
  if (c.health < 70) add('Здоровье ' + Math.round(c.health), (70 - c.health) / 500, '');
  if (c.stress > 60) add('Стресс ' + Math.round(c.stress), 0.02, '');
  if (salonOk(c).reluct) add('Без охоты', 0.02, '');
  if (has(c, 'hardy')) add('Крепкое здоровье', -0.02, 'черта');
  const raw = parts.reduce((a, p) => a + p[1], 0), p = clamp(raw, 0.01, 0.2);
  return { p, parts };
}
function salonPreg() { return { p: 0, parts: [], why: '' }; }
function salonPregWhy() { return ''; }
const SALON_OK = ['весь вечер разливал{|а} чай и смешил{|а} гостей байками', 'испёк{|ла} пирог, который разошёлся за час', 'играл{|а} на лютне — гости подпевали', 'помирил{|а} двух спорящих купцов за чашкой чая', 'рассказал{|а} гостям легенду Медового Лога — кое-кто прослезился', 'устроил{|а} вечер загадок, гости ушли довольные'];
const SALON_RISK = [['обжёг{ся|лась} о самовар', 0], ['простыл{|а} на сквозняке у дверей', 1], ['переутомил{ся|ась} за долгий вечер', 0], ['подвернул{|а} ногу, разнося подносы', 0]];
function salonWork(c, fail, failP, lines) {
  const n = fn1(c), inf = salonIncome(c), so = salonOk(c), rk = salonRisk(c);
  fatigueGain(c, 16 - Math.min(6, (c.prof || 0) / 20)); stressGain(c, 12 - Math.min(5, (c.prof || 0) / 25)); wearGear(c);
  let v;
  if (fail) { v = Math.round(inf.v * 0.3); stressGain(c, 4); lines.push(`− ${n}: ${JOB_DIFF.salon.bad} в чайной — гости ушли рано (шанс был ${Math.round(failP * 100)}%). +${v} мон.`); }
  else { v = inf.v; lines.push(`${n} ${gx(c, pick(SALON_OK))}. Чайная +${v} мон. (×${inf.mult.toFixed(2)})`); }
  S.gold += v;
  c.prof = Math.min(100, (c.prof || 0) + (fail ? 1 : 2 + (has(c, 'clever') ? 1 : 0)));
  if (R() < 0.15) c.stats.cha = Math.min(c.pot.cha, c.stats.cha + 1);
  if (so.reluct) { c.aff = clamp((c.aff || 0) - 2); stressGain(c, 5); lines.push(`! ${n} работал${g(c, '', 'а')} в чайной без охоты: доверие −2, стресс +5. Лучше поручить другое дело.`); }
  if (R() < rk.p) {
    const [t, sick] = pick(SALON_RISK), d = rint(6, 12);
    c.health = clamp(c.health - d); stressGain(c, 6);
    if (sick && !has(c, 'hardy')) c.sickDays = Math.max(c.sickDays || 0, 2);
    lines.push(`! ${n} ${gx(c, t)}: здоровье −${d}${sick && !has(c, 'hardy') ? ', хворь на 2 дня' : ''} (риск был ${Math.round(rk.p * 100)}%).`);
  }
  return v;
}
function salonWhy(c) {
  const w = salonOk(c), rk = salonRisk(c);
  return whyHtml(w.parts.map(p => [p[0], (p[1] >= 0 ? '+' : '−') + Math.abs(Math.round(p[1])), '']), `<b>${w.will}</b> (нужно ${SALON_NEED}, охотно — ${SALON_EAGER})`, 'Охота работать в чайной. Ниже порога работник вежливо откажется — это его право.')
    + whyHtml(rk.parts.map(p => [p[0], p[1], p[2]]), `<b>${Math.round(rk.p * 100)}%</b>`, 'Риск за вечер: здоровье −6…12, иногда простуда на 2 дня.');
}
function salonLine(c) {
  const inf = salonIncome(c), fi = failInfo(c, 'salon'), rk = salonRisk(c), so = salonOk(c);
  return { inf, fi, rk, so, sp: salonPreg(c), txt: `≈ <b>+${inf.v}</b> мон. · ошибка <b>${Math.round(fi.p * 100)}%</b> · риск <b class="${rk.p >= 0.1 ? 'neg' : ''}">${Math.round(rk.p * 100)}%</b> · охота ${so.will}${so.reluct ? ' <span class="neg">(без охоты)</span>' : ''}` };
}

// ---------- назначение дел (с проверкой согласия) ----------
const SALON_NO = ['Спасибо, {х}, но в чайную мне пока не хочется. Можно я лучше займусь своим делом?', 'Честно, {х}, гостей развлекать — не моё. Давайте я пригожусь иначе.', 'Сегодня не в настроении для гостей, {х}. Может, в другой раз.'];
function assignTask(c, task) {
  if (!c || c.status !== 'home' || !TASKS[task]) return false;
  if (task === 'salon') {
    const so = salonOk(c);
    if (!so.ok) {
      toast(`${fn1(c)}: чайная недоступна — ${so.block || `не по душе (охота ${so.will} из ${SALON_NEED})`}.`);
      if (!so.block) react(c, 'shy', gx(c, pick(SALON_NO)));
      return false;
    }
  }
  c.task = task;
  if (isAuto(c)) { c.manualDay = S.day; c.autoWhy = 'выбрано вручную на этот день'; }
  return true;
}

// ---------- автораспорядок ----------
function isAuto(c) { return !!(S.autoAll || c.auto); }
function evOf(v, p) { return v * (1 - p) + v * 0.3 * p; }
function autoPick(c) {
  if (c.status !== 'home') return null;
  if (c.manualDay === S.day) return { task: c.task, why: 'выбрано вручную на этот день' };
  if (c.sickDays > 0) return { task: 'rest', why: 'болеет' };
  if (c.health < 45) return { task: 'rest', why: `здоровье ${Math.round(c.health)} — надо восстановиться` };
  if (c.fatigue >= 65) return { task: 'rest', why: `усталость ${Math.round(c.fatigue)}` };
  if (c.stress >= 70) return { task: 'rest', why: `стресс ${Math.round(c.stress)}` };
  const opt = [];
  for (const t of ['craft', 'shop']) { const inf = incomeInfo(c, t), p = failChance(c, t); opt.push({ task: t, ev: evOf(inf.v, p), why: `≈ +${inf.v}, ошибка ${Math.round(p * 100)}%` }); }
  const so = salonOk(c);
  if (so.ok && !so.reluct) { const inf = salonIncome(c), p = failChance(c, 'salon'), rk = salonRisk(c); opt.push({ task: 'salon', ev: evOf(inf.v, p) - rk.p * 120, why: `≈ +${inf.v}, ошибка ${Math.round(p * 100)}%, риск ${Math.round(rk.p * 100)}%` }); }
  opt.sort((a, b) => b.ev - a.ev);
  const best = opt[0], k = c.trainStat, room = c.pot[k] - c.stats[k];
  if (best.ev < 55 && room >= 8 && S.gold >= TRAIN_COST * 6) return { task: 'train', why: `доход низкий (≈${Math.round(best.ev)}) — выгоднее подучить «${statName(k)}»` };
  const alt = opt[1];
  return { task: best.task, why: `${best.why}${alt ? ` — лучше, чем ${TASKS[alt.task].toLowerCase()} (≈${Math.round(alt.ev)})` : ''}` };
}
function applyAuto() {
  const out = [];
  for (const c of S.owned) {
    if (!isAuto(c) || c.status !== 'home') continue;
    const r = autoPick(c); if (!r) continue;
    c.task = r.task; c.autoWhy = r.why; out.push([c, r]);
  }
  return out;
}
function autoToggleHtml(c) { return `<button class="auto-t ${c.auto || S.autoAll ? 'on' : ''}" data-autot="${c.uid}" ${S.autoAll ? 'title="Включено «Авто для всех»"' : ''}><i></i>Авто</button>`; }
function autoAllHtml() { return `<button class="auto-t big ${S.autoAll ? 'on' : ''}" data-autoall><i></i>Авто для всех</button>`; }

// ---------- промахи в работе ----------
const FAULT_N = { rude: 'Резкость', lazy: 'Нерасторопность', work: 'Ошибка в работе', disobey: 'Самоуправство' };
const FAULT_T = {
  rude: ['резко ответил{|а} покупателю у ворот', 'поругал{ся|ась} с поваром из-за соли', 'вспылил{|а} на товарища по смене'],
  lazy: ['проспал{|а} утреннюю смену', 'надолго засидел{ся|ась} на обеде', 'полдня провозил{ся|ась} с пустяком'],
  disobey: ['{ушёл|ушла} в город, не предупредив', 'переделал{|а} поручение по-своему', 'поспорил{|а} с вами при гостях'],
};
function faultsOf(c) { return (c.faults || []).filter(f => !f.done && S.day - f.day <= 3); }
function hasFault(c) { return faultsOf(c).length > 0; }
function addFault(c, kind, text) {
  c.faults = (c.faults || []).concat({ day: S.day, kind, t: text || '' }).slice(-8);
  c.misdeed = true;
}
function resolveFault(c) { const f = faultsOf(c)[0]; if (f) f.done = true; c.misdeed = hasFault(c); return f; }
function rollFaults(lines) {
  for (const c of S.owned) {
    if (c.status !== 'home' || c.sickDays > 0) continue;
    let p = 0.03 + (c.stress > 60 ? 0.05 : 0) + (c.loyalty < 35 ? 0.05 : 0) + (mood(c) < 35 ? 0.04 : 0) + (has(c, 'stubborn') ? 0.03 : 0) + (has(c, 'lazy') ? 0.03 : 0) - c.discipline / 800;
    if (R() >= clamp(p, 0, 0.2)) continue;
    const kind = has(c, 'lazy') && R() < 0.6 ? 'lazy' : has(c, 'stubborn') && R() < 0.6 ? 'disobey' : pick(['rude', 'rude', 'lazy', 'disobey']);
    const t = gx(c, pick(FAULT_T[kind]));
    addFault(c, kind, t);
    lines.push(`! ${fn1(c)} ${t} (${FAULT_N[kind].toLowerCase()}) — стоит поговорить о работе.`);
  }
  for (const c of S.owned) c.misdeed = hasFault(c);
}
function faultListHtml(c) {
  const all = (c.faults || []).slice(-5).reverse();
  if (!all.length) return '<div class="small muted">Промахов не было.</div>';
  return `<ul class="fault-l">${all.map(f => { const act = !f.done && S.day - f.day <= 3; return `<li class="${act ? 'act' : 'old'}"><b>${FAULT_N[f.kind] || 'Промах'}</b> · день ${f.day}${f.t ? ': ' + esc(f.t) : ''}${f.done ? ' <span class="muted">(разобрали)</span>' : !act ? ' <span class="muted">(забылось)</span>' : ''}</li>`; }).join('')}</ul>`;
}
function deserveHtml(c) {
  const fs = faultsOf(c);
  return fs.length
    ? `<div class="deserve yes">Есть что обсудить: ${esc(FAULT_N[fs[0].kind].toLowerCase())}${fs[0].t ? ' — ' + esc(fs[0].t) : ''} (день ${fs[0].day}). Разговор о работе по делу поднимет собранность и не обидит.</div>`
    : `<div class="deserve no">Промахов за 3 дня не было — замечание без повода обидит.</div>`;
}
// наказания в v16 нет: заглушки для старого кода
function punishPanelHtml() { return ''; } function refreshPunish() { } function heroModesHtml() { return ''; } function setCardMode() { } function punish() { }
function marksOf() { return []; } function pruneMarks() { } function drawMarks() { } function punishZonesHtml() { return ''; }

// ---------- высота портрета = высота экрана между панелями ----------
function setHeroH() { const s = document.getElementById('screen'); if (s) document.documentElement.style.setProperty('--heroH', s.clientHeight + 'px'); }
window.addEventListener('resize', setHeroH);
window.addEventListener('DOMContentLoaded', setHeroH);

// ---------- справка ----------
HELP.push(
  ['auto', 'Автораспорядок', () => `<p>Отметьте «Авто» у работника (в хозяйстве, карточке или плане дня) или включите «Авто для всех». Тогда при составлении плана дня дело выбирается само:</p>
    <ul><li><b>Отдых</b>, если болеет, здоровье ниже 45, усталость 65+, стресс 70+.</li><li>Иначе — дело с наибольшим ожидаемым доходом (доход × шанс без ошибки). Чайная — только если работнику там нравится.</li><li>Учёба — если доход низкий, а потенциал навыка ещё большой.</li></ul>
    <p>Причина выбора видна в плане дня и в отчёте. Выбор можно поменять вручную — он сохранится до конца дня.</p>`],
  ['salon', 'Чайная', () => `<p>Чайная — гостевой зал при хозяйстве: работник заваривает чай, подаёт пироги, ведёт беседу, играет музыку. Это обычная работа с гостями, и идут туда <b>только по желанию</b>.</p>
    <p><b>Охота</b> = лояльность×0.35 + настроение×0.35 + доверие×0.1 + опыт×0.2, черты (обаяние +12, весёлый нрав +8, сладкоежка +5, ранимость −6), стресс 60+ −10. Ниже ${SALON_NEED} — откажет; ${SALON_NEED}–${SALON_EAGER - 1} — согласится без охоты (доход ниже, стресс выше).</p>
    <p><b>Доход</b> по Обаянию, Мастерству, Уму и Удаче × опыт × настроение × лояльность × черты × сезон (зимой чай нарасхват). Каждый вечер растёт <b>опыт</b> (до 100).</p>
    <p><b>Риск</b> 1–20% за вечер: обжечься, простыть, переутомиться. Снижают опыт, выносливость и крепкое здоровье.</p>`],
  ['punish', 'Промахи в работе', () => `<p>Работники иногда ошибаются: резкость, нерасторопность, самоуправство, ошибки в работе. Это видно в отчёте дня и в карточке. Промах «свежий» 3 дня.</p>
    <p>Кнопка <b>«Разговор о работе»</b> в карточке: по делу — собранность растёт, лояльность не страдает; без повода — работник обидится. Хорошая собранность снижает шанс ошибок.</p>`],
);

// ---------- обработчики ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-autot],[data-autoall]');
  if (!t || t.disabled) return;
  e.stopPropagation(); e.preventDefault();
  const d = t.dataset;
  if (d.autot) {
    const c = findOwned(d.autot); if (!c) return;
    if (S.autoAll) { toast('Включено «Авто для всех» — выключите его, чтобы управлять по одному.'); return; }
    c.auto = !c.auto; c.manualDay = 0;
    if (c.auto) { applyAuto(); toast(`${fn1(c)}: авто — ${TASKS[c.task]} (${c.autoWhy}).`); } else toast(`${fn1(c)}: ручной распорядок.`);
    save(); render(); if (document.querySelector('#modal.show .plan-row, #modal .plan-row')) dayPlanModal();
    return;
  }
  if (d.autoall != null) {
    S.autoAll = !S.autoAll; for (const c of S.owned) c.manualDay = 0;
    if (S.autoAll) applyAuto();
    toast(S.autoAll ? 'Авто для всех: распорядок будет выбираться сам.' : 'Авто для всех выключено.');
    save(); render(); if (document.querySelector('#modal .plan-row')) dayPlanModal();
    return;
  }
}, true);
