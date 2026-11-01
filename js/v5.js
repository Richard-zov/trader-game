// ===== v5: автораспорядок, салон, проступки и наказание, голос, полноэкранный портрет =====
'use strict';

// ---------- салон (абстрактная «работа с гостями», без откровенностей) ----------
JOB_DIFF.salon = { d: 42, w: { cha: 0.6, agi: 0.2, wil: 0.2 }, n: 'Салон', sk: 'Обаяние, Ловкость, Воля', bad: 'провести скучный вечер' };
const SALON_NEED = 40, SALON_EAGER = 58;
function profOf(c) { return Math.round(c.prof || 0); }
function salonBlock(c) {
  if (c.preg) return 'в положении — салон закрыт';
  if (c.sickDays > 0) return 'болеет';
  if (c.health < 40) return 'здоровье ниже 40';
  if (c.status !== 'home') return 'на заказе';
  return '';
}
function salonWill(c) {
  const parts = [], m = mood(c);
  parts.push(['Лояльность ' + Math.round(c.loyalty), c.loyalty * 0.4], ['Настроение ' + m, m * 0.3], ['Дисциплина ' + Math.round(c.discipline), c.discipline * 0.15], ['Симпатия к вам ' + Math.round(c.aff || 0), (c.aff || 0) * 0.1]);
  if (c.prof) parts.push(['Профессионализм ' + profOf(c), c.prof * 0.2]);
  if (has(c, 'charming')) parts.push(['Обаяние (черта)', 10]);
  if (has(c, 'cheerful')) parts.push(['Весёлый нрав', 5]);
  if (has(c, 'sensitive')) parts.push(['Ранимость', -10]);
  if (has(c, 'stubborn')) parts.push(['Упрямство', -8]);
  if (c.stress > 60) parts.push(['Стресс ' + Math.round(c.stress), -10]);
  if (inHeat(c)) parts.push(['Течка', 5]);
  const v = Math.round(parts.reduce((a, p) => a + p[1], 0));
  return { v, parts };
}
function salonOk(c) {
  const block = salonBlock(c), w = salonWill(c);
  return { ok: !block && w.v >= SALON_NEED, reluct: w.v < SALON_EAGER, will: w.v, block, parts: w.parts };
}
function youthF(c) {
  if (c.race === 'elf') return [1.15, 'эльфийская юность'];
  if (c.race === 'dwarf') return c.age <= 50 ? [1.1, 'молодость'] : c.age <= 80 ? [1, 'зрелость'] : [0.85, 'возраст'];
  const a = c.age;
  return a <= 22 ? [1.25, 'юность ' + a] : a <= 27 ? [1.15, 'молодость ' + a] : a <= 33 ? [1, 'возраст ' + a] : a <= 40 ? [0.88, 'возраст ' + a] : [0.75, 'возраст ' + a];
}
function salonIncome(c) {
  const b = gb(c), parts = [], so = salonOk(c);
  const base = 30 + (eff(c, 'cha') * 0.6 + eff(c, 'agi') * 0.15 + eff(c, 'end') * 0.15 + eff(c, 'luk') * 0.1) * 1.6;
  const y = youthF(c);
  parts.push(['красота (' + rarityName(c).toLowerCase() + ')', 1 + c.rarity * 0.12], [y[1], y[0]], ['профессионализм ' + profOf(c), 1 + (c.prof || 0) / 100 * 0.6]);
  parts.push(['настроение', moodF(c)], ['усталость', fatF(c)], ['здоровье', hpF(c)], ['лояльность', 0.85 + 0.3 * c.loyalty / 100]);
  if (has(c, 'charming')) parts.push(['обаяние', 1.25]);
  if (has(c, 'cheerful')) parts.push(['весёлый нрав', 1.1]);
  if (has(c, 'sensitive')) parts.push(['ранимость', 0.9]);
  if (b.inc) parts.push(['снаряжение', 1 + b.inc / 100]);
  if (season().inc) parts.push([season().name.toLowerCase(), 1 + season().inc]);
  if (evNum('shop')) parts.push([mev().name.toLowerCase(), 1 + evNum('shop')]);
  parts.push(['спрос в городе', 0.8 + 0.2 * (S.econ.race[c.race] || 1)]);
  if (inHeat(c)) parts.push(['течка: особое очарование', 1.1]);
  if (so.reluct) parts.push(['без охоты', 0.8]);
  const mult = parts.reduce((a, p) => a * p[1], 1);
  return { base, mult, parts, v: Math.round(base * mult) };
}
function salonRisk(c) {
  const parts = [];
  const add = (l, v, h) => { if (Math.abs(v) >= 0.0005) parts.push([l, v, h || '', 'r']); };
  add('База', 0.05, 'поздние вечера, сквозняки, шумные гости');
  add('Профессионализм ' + profOf(c), -(c.prof || 0) / 100 * 0.035, 'опыт бережёт');
  add('Выносливость ' + eff(c, 'end'), -clamp((eff(c, 'end') - 30) / 100 * 0.03, -0.01, 0.02), '');
  if (c.fatigue > 50) add('Усталость ' + Math.round(c.fatigue), (c.fatigue - 50) / 400, '');
  if (c.health < 70) add('Здоровье ' + Math.round(c.health), (70 - c.health) / 500, '');
  if (c.stress > 60) add('Стресс ' + Math.round(c.stress), 0.02, '');
  if (salonOk(c).reluct) add('Без охоты', 0.03, '');
  if (inHeat(c)) add('Течка', 0.02, '');
  if (has(c, 'hardy')) add('Крепкое здоровье', -0.02, 'черта');
  const raw = parts.reduce((a, p) => a + p[1], 0), p = clamp(raw, 0.01, 0.25);
  return { p, parts };
}
// ---------- v7: шанс беременности после вечера в салоне ----------
// Отец — случайный анонимный гость: его гены (потенциалы, черта, раса) случайны.
const HERBAL_COST = 3;
function salonPreg(c) {
  const parts = [];
  if (c.g !== 'f') return { p: 0, parts, why: 'мужчины не беременеют' };
  if (c.preg) return { p: 0, parts, why: 'уже в положении' };
  if (S.owned.length + S.owned.filter(x => x.preg).length >= S.capacity) return { p: 0, parts, why: 'в поместье нет места для наследника' };
  if (c.health < 50) return { p: 0, parts, why: 'здоровье ниже 50' };
  const add = (l, v, h) => parts.push([l, v, h || '']);
  add('База', 0.03);
  add('Плодовитость ' + c.breed.fert, c.breed.fert / 100 * 0.06, 'шанс растёт с плодовитостью');
  add('Здоровье ' + Math.round(c.health), (c.health - 75) / 2000, '');
  const yf = youthF(c); add('Возраст: ' + yf[1], (yf[0] - 1) * 0.04, '');
  if (season().fert) add('Сезон', season().fert * 0.3, '');
  if (inHeat(c)) add('Течка', 0.05, '');
  add('Профессионализм ' + profOf(c), -(c.prof || 0) / 100 * 0.025, 'опыт и осторожность');
  let raw = parts.reduce((a, p) => a + p[1], 0);
  raw = clamp(raw, 0.005, 0.12);
  if (c.herbal) { const r2 = raw * 0.25; add('Травяной отвар', r2 - raw, 'защита: шанс ×0.25, ' + HERBAL_COST + ' мон. за вечер'); raw = r2; }
  return { p: raw, parts };
}
function salonPregWhy(c) {
  const sp = salonPreg(c);
  if (c.g !== 'f') return '';
  if (!sp.parts.length) return `<div class="small muted">Беременность после салона: невозможна — ${sp.why}.</div>`;
  return whyHtml(sp.parts, `<b>${(sp.p * 100).toFixed(1)}%</b>`, `Шанс забеременеть за вечер в салоне. Отец — анонимный гость; наследник будет похож на мать, но гены случайны. Защита: <a href="#" data-herbal="${c.uid}">${c.herbal ? 'отменить отвар' : 'давать травяной отвар'}</a> (шанс ×0.25, −${HERBAL_COST} мон.).`);
}
const CLIENT_NAMES = ['заезжий купец', 'гость в маске', 'молчаливый путник', 'щедрый незнакомец', 'гость с севера'];
function salonClient() {
  const pr = pick(PRESETS.filter(p => p.g === 'm'));
  const race = R() < 0.6 ? pr.race : pick(Object.keys(RACES));
  const pot = {}; for (const s of STATS) pot[s.key] = rint(30, 95);
  return { uid: 'client', name: 'Неизвестный гость салона', alias: pick(CLIENT_NAMES), preset: pr.id, race, g: 'm', rarity: rint(0, 2), pot, traits: [pick(Object.keys(TRAITS))], breed: { line: rint(30, 95), her: rint(25, 90) }, kin: [], anon: 1 };
}
const SALON_OK = ['принимал{|а} гостей: музыка, вино и долгие беседы до полуночи', 'был{|а} нарасхват — гости уже записываются на завтра', 'очаровал{|а} заезжего купца, и тот не поскупился', 'пел{|а} и танцевал{|а} для гостей; салон гудел до утра', 'выслушал{|а} три исповеди и одну балладу — гости ушли счастливыми', 'провёл{|а} вечер при закрытых дверях с щедрым гостем'];
const SALON_RISK = [['простыл{|а} на сквозняке после долгого вечера', 1], ['подвернул{|а} ногу на лестнице, провожая гостя', 0], ['неприятный гость перебрал вина и устроил скандал — ушиб и испуг', 0], ['переутомил{ся|ась}: голова кругом, нужен отдых', 1]];
function salonWork(c, fail, failP, lines) {
  const n = fn1(c), so = salonOk(c), inf = salonIncome(c), rk = salonRisk(c);
  fatigueGain(c, 16); stressGain(c, Math.max(4, 12 - (c.prof || 0) / 12) + (inHeat(c) ? 3 : 0)); wearGear(c);
  let v;
  if (fail) { v = Math.round(inf.v * 0.3); stressGain(c, 4); lines.push(`− ${n}: ${JOB_DIFF.salon.bad} в салоне — гости ушли рано (шанс был ${Math.round(failP * 100)}%). +${v} мон.`); }
  else { v = inf.v; lines.push(`${n} ${gx(c, pick(SALON_OK))}. Салон +${v} мон. (×${inf.mult.toFixed(2)})`); }
  S.gold += v;
  const pg = Math.max(1, Math.round((2.5 + R() * 2) * (1 - (c.prof || 0) / 125) * (fail ? 0.5 : 1)));
  c.prof = Math.min(100, (c.prof || 0) + pg);
  let up = `Профессионализм +${pg} (${profOf(c)})`;
  if (R() < 0.35 && c.stats.cha < c.pot.cha) { c.stats.cha++; up += ', Обаяние +1'; }
  if (R() < 0.12) { const k = pick(['agi', 'end']); if (c.stats[k] < c.pot[k]) { c.stats[k]++; up += `, ${statName(k)} +1`; } }
  lines.push(`  ${up}.`);
  if (so.reluct) {
    c.aff = clamp((c.aff || 0) - 2); stressGain(c, 5); c.moodMod -= 4;
    const l = c.discipline >= 60 ? 0 : loyaltyGain(c, -1.5);
    lines.push(`! ${n} работал${g(c, '', 'а')} в салоне без охоты: симпатия −2, стресс +5${l ? ', лояльность ' + Math.round(l) : ''}.`);
  }
  if (c.g === 'f') {
    if (c.herbal && !c.preg) { S.gold -= HERBAL_COST; v -= HERBAL_COST; }
    const sp = salonPreg(c);
    if (sp.p > 0 && R() < sp.p) {
      c.preg = { due: S.day + 9, start: S.day, father: salonClient(), salon: 1 };
      lines.push(`★ ${n}: вскоре стало ясно — ${n} ждёт малыша. Отец — один из гостей салона, имени не знает никто (шанс был ${(sp.p * 100).toFixed(1)}%). Наследник будет похож на мать.`);
    }
  }
  if (R() < rk.p) {
    const [t, sick] = pick(SALON_RISK), d = rint(8, 15);
    c.health = clamp(c.health - d); stressGain(c, 8);
    if (sick && !has(c, 'hardy')) c.sickDays = Math.max(c.sickDays || 0, 2);
    lines.push(`! ${n} ${gx(c, t)}: здоровье −${d}${sick && !has(c, 'hardy') ? ', хворь на 2 дня' : ''} (риск был ${Math.round(rk.p * 100)}%).`);
  }
  return v;
}
function salonWhy(c) {
  const w = salonOk(c), rk = salonRisk(c);
  return whyHtml(w.parts.map(p => [p[0], (p[1] >= 0 ? '+' : '−') + Math.abs(Math.round(p[1])), '']), `<b>${w.will}</b> (нужно ${SALON_NEED}, охотно — ${SALON_EAGER})`, 'Согласие на салон. Ниже порога персонаж откажется — заставить нельзя. Между порогами работает без охоты: доход ×0.8, симпатия и лояльность падают.')
    + whyHtml(rk.parts.map(p => [p[0], p[1], p[2]]), `<b>${Math.round(rk.p * 100)}%</b>`, 'Риск для здоровья за вечер: здоровье −8…15, иногда хворь на 2 дня, стресс +8.')
    + salonPregWhy(c);
}
function salonLine(c) {
  const inf = salonIncome(c), fi = failInfo(c, 'salon'), rk = salonRisk(c), so = salonOk(c);
  const sp = salonPreg(c);
  return { inf, fi, rk, so, sp, txt: `≈ <b>+${inf.v}</b> мон. · ошибка <b>${Math.round(fi.p * 100)}%</b> · риск здоровью <b class="${rk.p >= 0.1 ? 'neg' : ''}">${Math.round(rk.p * 100)}%</b> · охота ${so.will}${so.reluct ? ' <span class="neg">(без охоты)</span>' : ''}${c.g === 'f' ? ` · беременность <b>${(sp.p * 100).toFixed(1)}%</b>${c.herbal ? ' (отвар)' : ''}` : ''}` };
}

// ---------- назначение дел (с проверкой согласия) ----------
const SALON_NO = ['Простите, {х}… в салон я не готов{|а}. Может быть, позже, когда больше освоюсь.', 'Простите, {х}, это не для меня. Позвольте мне служить иначе.', '*качает головой и кланяется* Можно я лучше поработаю в лавке, {х}?'];
function assignTask(c, task) {
  if (!c || c.status !== 'home' || !TASKS[task]) return false;
  if (task === 'salon') {
    const so = salonOk(c);
    if (!so.ok) {
      toast(`${fn1(c)}: салон недоступен — ${so.block || `нет согласия (охота ${so.will} из ${SALON_NEED})`}.`);
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
  if (c.preg && c.fatigue >= 40) return { task: 'rest', why: 'в положении и подустал' + g(c, '', 'а') };
  if (inHeat(c) && (c.stress >= 50 || c.fatigue >= 50)) return { task: 'rest', why: 'течка и усталость/стресс' };
  const opt = [];
  for (const t of ['craft', 'shop']) { const inf = incomeInfo(c, t), p = failChance(c, t); opt.push({ task: t, ev: evOf(inf.v, p), why: `≈ +${inf.v}, ошибка ${Math.round(p * 100)}%` }); }
  const so = salonOk(c);
  if (so.ok && !so.reluct) { const inf = salonIncome(c), p = failChance(c, 'salon'), rk = salonRisk(c); opt.push({ task: 'salon', ev: evOf(inf.v, p) - rk.p * 120, why: `≈ +${inf.v}, ошибка ${Math.round(p * 100)}%, риск ${Math.round(rk.p * 100)}%` }); }
  opt.sort((a, b) => b.ev - a.ev);
  const best = opt[0], k = c.trainStat, room = c.pot[k] - c.stats[k];
  if (best.ev < 55 && room >= 8 && S.gold >= TRAIN_COST * 6 && !c.preg) return { task: 'train', why: `доход низкий (≈${Math.round(best.ev)}) — выгоднее подучить «${statName(k)}»` };
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

// ---------- проступки ----------
const FAULT_N = { rude: 'Грубость', lazy: 'Лень', work: 'Ошибка в работе', disobey: 'Непослушание' };
const FAULT_T = {
  rude: ['нагрубил{|а} покупателю у ворот', 'нахамил{|а} повару', 'передразнивал{|а} вас за спиной', 'хлопнул{|а} дверью перед вашим носом'],
  lazy: ['проспал{|а} утреннюю перекличку', 'спрятал{ся|ась} от работы в сарае', 'полдня просидел{|а} на крыльце без дела'],
  disobey: ['{ушёл|ушла} в город без спроса', 'не выполнил{|а} ваше поручение', 'спорил{|а} с вами при гостях'],
};
function faultsOf(c) { return (c.faults || []).filter(f => !f.done && S.day - f.day <= 3); }
function hasFault(c) { return faultsOf(c).length > 0; }
function addFault(c, kind, text) {
  c.faults = (c.faults || []).concat({ day: S.day, kind, t: text || '' }).slice(-8);
  c.misdeed = true;
}
function resolveFault(c) { const f = faultsOf(c)[0]; if (f) f.done = true; c.misdeed = hasFault(c); return f; }
function rollFaults(lines) {
  pruneMarks(lines);
  for (const c of S.owned) {
    if (c.status !== 'home' || c.sickDays > 0) continue;
    let p = 0.03 + (c.stress > 60 ? 0.05 : 0) + (c.loyalty < 35 ? 0.05 : 0) + (mood(c) < 35 ? 0.04 : 0) + (has(c, 'stubborn') ? 0.03 : 0) + (has(c, 'lazy') ? 0.03 : 0) - c.discipline / 800;
    if (R() >= clamp(p, 0, 0.2)) continue;
    const kind = has(c, 'lazy') && R() < 0.6 ? 'lazy' : has(c, 'stubborn') && R() < 0.6 ? 'disobey' : pick(['rude', 'rude', 'lazy', 'disobey']);
    const t = gx(c, pick(FAULT_T[kind]));
    addFault(c, kind, t);
    lines.push(`! ${fn1(c)} ${t} (${FAULT_N[kind].toLowerCase()}) — есть повод для строгости.`);
  }
  for (const c of S.owned) c.misdeed = hasFault(c);
}
function faultListHtml(c) {
  const all = (c.faults || []).slice(-5).reverse();
  if (!all.length) return '<div class="small muted">Журнал проступков пуст.</div>';
  return `<ul class="fault-l">${all.map(f => { const act = !f.done && S.day - f.day <= 3; return `<li class="${act ? 'act' : 'old'}"><b>${FAULT_N[f.kind] || 'Проступок'}</b> · день ${f.day}${f.t ? ': ' + esc(f.t) : ''}${f.done ? ' <span class="muted">(разобрано)</span>' : !act ? ' <span class="muted">(давно)</span>' : ''}</li>`; }).join('')}</ul>`;
}
function deserveHtml(c) {
  const fs = faultsOf(c);
  return fs.length
    ? `<div class="deserve yes">Заслуживает наказания: <b>да</b> — ${esc(FAULT_N[fs[0].kind].toLowerCase())}${fs[0].t ? ': ' + esc(fs[0].t) : ''} (день ${fs[0].day}). Строгость будет справедливой: дисциплина растёт, привязанность и лояльность не страдают.</div>`
    : `<div class="deserve no">Заслуживает наказания: <b>нет</b> — проступков за 3 дня не было. Наказание будет несправедливым: лояльность и симпатия упадут, стресс вырастет.</div>`;
}

// ---------- наказание ----------
const TOOLS = {
  hand: { n: 'Ладонь', k: 0.8, st: 0.8, hp: 0, snd: 'slap' },
  ruler: { n: 'Линейка', k: 1, st: 1, hp: 0, snd: 'smack' },
  rod: { n: 'Розга', k: 1.3, st: 1.3, hp: 1, snd: 'swish2' },
  whip: { n: 'Плётка', k: 1.7, st: 1.7, hp: 2, snd: 'crack' },
};
const PZONES = { hand: { n: 'Ладони', m: 0.8 }, arm: { n: 'Руки выше локтя', m: 1 }, shoulder: { n: 'Плечи', m: 1 }, back: { n: 'Спина', m: 1.1 }, rear: { n: 'Пониже спины', m: 1.1 } };
const PUNISH_MAX = 5, PUN_DECAY = [1, 0.7, 0.5, 0.3, 0.15];
const PL = {
  just: ['Ай! Заслужил{|а}, {х}, признаю…', 'Ой-ой! Простите, {х}, больше не буду!', 'Ай! {Понял|Поняла}, {х}, {понял|поняла}!', '*шмыгает носом* Справедливо, {х}…', 'Уй! Я исправлюсь, {х}!'],
  unjust: ['За что, {х}?.. Я ведь ничего не сделал{|а}…', '*всхлипывает* Простите, {х}… я не понимаю, в чём вина.', '*смотрит с обидой и тут же опускает глаза*', 'Ай! Что я сделал{|а} не так, {х}?..'],
  rear: ['Ай! Как мне теперь сидеть за прилавком, {х}?..', 'Уй-уй! {Понял|Поняла}, {х}, {понял|поняла}!', '*подпрыгивает* Ой! Простите, простите!', 'Ай! Только не при всех, {х}, умоляю!'],
  hand: ['Ай, пальцы! Мне же ими работать на вас, {х}…', '*дует на ладони* Ой… простите, {х}.'],
  over: ['Пожалуйста, {х}… я уже всё {понял|поняла}.', '*сжимается* Умоляю, {х}, на сегодня достаточно…'],
};
function punishState(c) { if (!c.pun || c.pun.day !== S.day) c.pun = { day: S.day, n: 0, just: null }; return c.pun; }
function punishBlock(c) {
  if (c.status !== 'home') return 'на заказе';
  if (c.preg) return 'в положении — наказывать нельзя';
  if (c.health < 30 || c.sickDays > 0) return 'нездоровится — не время для строгости';
  if (punishState(c).n >= PUNISH_MAX) return `на сегодня хватит (${PUNISH_MAX} из ${PUNISH_MAX})`;
  return '';
}
const TOOL_SVG = {
  hand: `<svg viewBox="0 0 64 64"><path d="M14 40 C10 30 12 22 18 22 L20 24 L20 12 C20 8 26 8 26 12 L26 22 L27 8 C27 4 33 4 33 8 L33 22 L35 10 C35 6 41 6 41 10 L40 24 L43 16 C44 12 50 13 49 17 L46 34 C45 46 38 54 28 54 C21 54 17 48 14 40 Z" fill="#f6d2b0" stroke="#3b2616" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  ruler: `<svg viewBox="0 0 64 64"><g transform="rotate(-40 32 32)"><rect x="4" y="26" width="56" height="12" rx="2" fill="#e8c27a" stroke="#4a2e14" stroke-width="2"/><path d="M10 26v5M16 26v3M22 26v5M28 26v3M34 26v5M40 26v3M46 26v5M52 26v3" stroke="#4a2e14" stroke-width="1.5"/></g></svg>`,
  rod: `<svg viewBox="0 0 64 64"><path d="M8 58 Q28 36 58 6" stroke="#6b4a24" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M30 33 L40 30 M40 22 L47 24 M22 42 L18 34" stroke="#6b4a24" stroke-width="2" stroke-linecap="round"/><ellipse cx="42" cy="29" rx="4" ry="2" fill="#7da35a" transform="rotate(-20 42 29)"/><ellipse cx="48" cy="25" rx="4" ry="2" fill="#7da35a" transform="rotate(20 48 25)"/></svg>`,
  whip: `<svg viewBox="0 0 64 64"><rect x="6" y="44" width="16" height="7" rx="3" fill="#5a3416" stroke="#2e1a0a" stroke-width="1.6" transform="rotate(-40 14 47)"/><path d="M20 40 C30 30 26 18 38 14 C48 11 54 20 60 12" stroke="#3a2210" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`,
};
function zonePt(zg, zone, sd) {
  const S_ = sd < 0 ? 'L' : 'R', cen = b => [b.x + b.w / 2, b.y + b.h / 2];
  const sh = cen(zg['shoulder' + S_]), hd = cen(zg['hand' + S_]), mid = (cen(zg.shoulderL)[0] + cen(zg.shoulderR)[0]) / 2;
  if (zone === 'hand') return hd;
  if (zone === 'shoulder') return sh;
  if (zone === 'arm') return [(sh[0] + hd[0]) / 2, sh[1] + (hd[1] - sh[1]) * 0.38];
  if (zone === 'back') return [mid + (sh[0] - mid) * 0.55, sh[1] + 7];
  return [mid + (hd[0] - mid) * 0.92, hd[1] - 4];
}
// ---------- следы от розги и плётки: бледно-красные полосы, сходят за 3 дня ----------
const MARK_DAYS = 3;
function marksOf(c) { return (c.marks || []).filter(m => S.day - m.day < MARK_DAYS); }
function addMark(c, zone, side, tool) {
  if (tool !== 'rod' && tool !== 'whip') return false;
  c.marks = marksOf(c); c.marks.push({ z: zone, s: side || (R() < 0.5 ? -1 : 1), day: S.day, t: tool, r: rint(-25, 25) });
  if (c.marks.length > 10) c.marks.shift();
  return true;
}
function pruneMarks(lines) {
  for (const c of S.owned) { const n = (c.marks || []).length; c.marks = (c.marks || []).filter(m => S.day + 1 - m.day < MARK_DAYS); if (n && !c.marks.length && lines) lines.push(`${fn1(c)}: следы от наказания сошли.`); }
}
function markSvg(m) {
  const lines = m.t === 'whip' ? ['M4 14 Q20 6 36 10', 'M8 20 Q22 13 34 17'] : ['M6 10 L34 8', 'M5 16 L35 14', 'M7 22 L33 20'];
  return `<svg viewBox="0 0 40 30">${lines.map(d => `<path d="${d}" stroke="#d9534a" stroke-width="${m.t === 'whip' ? 2.6 : 2.1}" stroke-linecap="round" fill="none"/>`).join('')}</svg>`;
}
function drawMarks() {
  const cp = document.querySelector('.card-portrait'); if (!cp) return;
  const box = cp.querySelector('.art-box'); if (!box) return;
  box.querySelectorAll('.welts').forEach(e => e.remove());
  const c = findOwned(cp.dataset.uid); if (!c) return;
  const ms = marksOf(c); if (!ms.length) return;
  const zg = Anim.zoneGeom(box.dataset.key, box.dataset.race); if (!zg) return;
  const html = ms.map(m => { const [x, y] = zonePt(zg, m.z, m.s), age = S.day - m.day, op = (0.7 * (1 - age / MARK_DAYS) + 0.1).toFixed(2);
    return `<div class="welt" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;opacity:${op};transform:translate(-50%,-50%) rotate(${m.r}deg)">${markSvg(m)}</div>`; }).join('');
  box.insertAdjacentHTML('beforeend', `<div class="welts">${html}</div>`);
}
if (typeof placeZones === 'function') { const _pz = placeZones; placeZones = function () { _pz(); try { drawMarks(); } catch (e) { } }; }
function punishFx(c, zone, side) {
  const cp = document.querySelector(`.card-portrait[data-uid="${c.uid}"]`); if (!cp) return;
  const box = cp.querySelector('.art-box'); if (!box) return;
  const zg = Anim.zoneGeom(box.dataset.key, box.dataset.race); if (!zg) return;
  const sd = side || (R() < 0.5 ? -1 : 1), S_ = sd < 0 ? 'L' : 'R';
  const [x, y] = zonePt(zg, zone, sd);
  const fx = document.createElement('div'); fx.className = 'pun-fx';
  fx.innerHTML = `<div class="pun-tool t-${UI.tool || 'hand'} ${sd > 0 ? 'flip' : ''}" style="left:${x}%;top:${y}%">${TOOL_SVG[UI.tool || 'hand']}</div>
    <div class="pun-hit" style="left:${x}%;top:${y}%"></div><div class="pun-ex" style="left:${x + sd * 6}%;top:${y - 8}%">!</div>`;
  box.appendChild(fx); setTimeout(() => fx.remove(), 1100);
  try { Anim.play('flinch', { side: -sd, k: 1, dur: 0.8 }); if (zone === 'rear') setTimeout(() => Anim.play('bounce', { k: 0.9, dur: 0.6 }), 120); } catch (e) { }
  const p = cp.querySelector('.portrait'); if (p) { p.classList.add('flinch'); setTimeout(() => p.classList.remove('flinch'), 700); }
}
function punish(uid, zone, side) {
  const c = findOwned(uid); if (!c) return;
  const bl = punishBlock(c);
  if (bl) { toast(`${fn1(c)}: ${bl}.`); if (punishState(c).n >= PUNISH_MAX) react(c, 'sad', gx(c, pick(PL.over))); return; }
  const ps = punishState(c);
  if (ps.just === null) { ps.just = hasFault(c); if (ps.just) { const f = resolveFault(c); ps.why = f ? FAULT_N[f.kind] : ''; } }
  ps.n++;
  const T = TOOLS[UI.tool] || TOOLS.hand, Z = PZONES[zone] || PZONES.shoulder;
  const dec = PUN_DECAY[ps.n - 1] || 0.1;
  let dd = 6 * T.k * Z.m * dec * (1 - eff(c, 'wil') / 300);
  if (has(c, 'stubborn') || c.race === 'dwarf') dd *= 0.6;
  dd = Math.max(1, Math.round(dd));
  c.discipline = clamp(c.discipline + dd);
  const parts = [`дисциплина +${dd}`];
  const st = Math.round((ps.just ? 2 : 5) * T.st); stressGain(c, st); parts.push(`стресс +${st}`);
  if (T.hp) { c.health = clamp(c.health - T.hp); parts.push(`здоровье −${T.hp}`); }
  if (!ps.just) {
    const l = loyaltyGain(c, -2 * T.k), a = Math.round(2 * T.k); c.aff = clamp((c.aff || 0) - a); c.moodMod -= 4;
    parts.push(`лояльность ${Math.round(l)}`, `симпатия −${a}`);
  } else if (ps.n > 3) { c.aff = clamp((c.aff || 0) - 1); parts.push('симпатия −1 (перегнули палку)'); }
  try { sfx(T.snd); } catch (e) { }
  const sd = +side || (R() < 0.5 ? -1 : 1);
  if (addMark(c, zone, sd, UI.tool)) { parts.push('остались следы (сойдут за ' + MARK_DAYS + ' дн.)'); }
  try {
    const hard = UI.tool === 'rod' || UI.tool === 'whip';
    const k = c.g === 'm' ? (hard ? pick(['grunt', 'hiss', 'grunt']) : pick(['grunt', 'hmph'])) : (hard ? pick(['yelp', 'hiss', 'yelp', 'ow']) : pick(['yelp', 'ow', 'hiss']));
    Audio_.voice(k, c.g, 0.12, voicePk(c));
    if (!ps.just) Audio_.voice('grumble', c.g, 0.7, voicePk(c)); else if (ps.n >= 3) Audio_.voice(c.g === 'm' ? 'hiss' : 'whimper', c.g, 0.6, voicePk(c));
  } catch (e) { }
  punishFx(c, zone, sd); drawMarks();
  const pool = ps.n >= 4 ? PL.over : (zone === 'rear' && R() < 0.7) ? PL.rear : (zone === 'hand' && R() < 0.5) ? PL.hand : ps.just ? PL.just : PL.unjust;
  react(c, ps.just ? (ps.n >= 3 ? 'sad' : 'surprised') : 'sad', gx(c, pick(pool)), 2400);
  toast(`${T.n} · ${Z.n}: ${parts.join(', ')}${ps.just ? ' — по делу' : ' — без повода!'} (${ps.n}/${PUNISH_MAX}).`);
  if (ps.n === 1) addLog(`${fn1(c)}: наказание (${T.n.toLowerCase()})${ps.just ? ' по делу' + (ps.why ? ' — ' + ps.why.toLowerCase() : '') : ' без повода — обида'}.`);
  save();
  setTimeout(() => { if (UI.screen === 'card' && UI.cardUid === uid) { refreshCardStats(c); refreshPunish(c); } }, 60);
}
function punishPanelHtml(c) {
  const ps = punishState(c), bl = punishBlock(c), tool = UI.tool || 'hand';
  return `<div class="panel parchment pun-panel" id="pun-panel"><div class="panel-title">Наказание</div>
    ${ps.just !== null ? `<div class="deserve ${ps.just ? 'yes' : 'no'}">Сегодня уже наказан${g(c, '', 'а')} — ${ps.just ? 'по делу' : 'без повода'} (${ps.n}/${PUNISH_MAX}).</div>` : deserveHtml(c)}
    <div class="small"><b>Инструмент:</b></div>
    <div class="seg tools">${Object.entries(TOOLS).map(([k, t]) => `<button class="seg-b ${tool === k ? 'on' : ''}" data-tool="${k}">${t.n}</button>`).join('')}</div>
    <div class="small muted">${{ hand: 'Мягче всего: дисциплина ×0.8, стресс ×0.8.', ruler: 'Обычная строгость: дисциплина ×1.', rod: 'Строже: дисциплина ×1.3, стресс ×1.3, здоровье −1.', whip: 'Самое суровое: дисциплина ×1.7, стресс ×1.7, здоровье −2.' }[tool]}</div>
    <div class="tz-chips pun-chips">${Object.entries(PZONES).map(([k, z]) => `<button class="tz-chip hit" data-hit="${k}" data-uid="${c.uid}" ${bl ? 'disabled' : ''}>${z.n}</button>`).join('')}<button class="tz-help" data-help="punish" aria-label="Справка">?</button></div>
    ${bl ? `<div class="small neg">Нельзя: ${bl}.</div>` : `<div class="small muted">Включите режим «Наказать» на портрете и касайтесь рук и плеч прямо на рисунке. Ударов сегодня: ${ps.n}/${PUNISH_MAX}, каждый следующий слабее.</div>`}
    ${marksOf(c).length ? `<div class="small">Следы: ${marksOf(c).length} — ${[...new Set(marksOf(c).map(m => PZONES[m.z].n.toLowerCase()))].join(', ')}; бледнеют и сходят за ${MARK_DAYS} дн.</div>` : '<div class="small muted">Розга и плётка оставляют бледно-красные следы, они сходят за 3 дня.</div>'}
    <div class="small"><b>Журнал проступков</b></div>${faultListHtml(c)}
  </div>`;
}
function refreshPunish(c) { const el = document.getElementById('pun-panel'); if (el) el.outerHTML = punishPanelHtml(c); }

// ---------- режимы портрета: ласка / наказание ----------
function heroModesHtml(c) {
  const m = UI.cardMode === 'punish' ? 'punish' : 'pet';
  return `<div class="hero-modes"><button class="hm-b ${m === 'pet' ? 'on' : ''}" data-cmode="pet">♥ Ласка</button><button class="hm-b pun ${m === 'punish' ? 'on' : ''}" data-cmode="punish">Наказать</button></div>
    ${m === 'punish' ? `<div class="hero-tools">${Object.entries(TOOLS).map(([k, t]) => `<button class="ht-b ${(UI.tool || 'hand') === k ? 'on' : ''}" data-tool="${k}" title="${t.n}">${TOOL_SVG[k]}<small>${t.n}</small></button>`).join('')}</div>` : ''}`;
}
function setCardMode(m) {
  UI.cardMode = m;
  const cp = document.querySelector('.card-portrait'); if (!cp) return;
  cp.classList.toggle('mode-punish', m === 'punish');
  cp.querySelectorAll('.tz').forEach(z => z.remove());
  placeZones();
  const c = findAny(cp.dataset.uid), hm = document.querySelector('.hero-ui');
  if (c && hm) hm.innerHTML = heroModesHtml(c);
  const h = cp.querySelector('.touch-hint'); if (h) h.textContent = m === 'punish' ? 'Режим наказания: руки, плечи; спина и «пониже спины» — кнопками ниже' : 'Коснитесь: голова, уши, щёки, плечи, руки…';
}
function punishZonesHtml(c, zg) {
  const cen = b => [b.x + b.w / 2, b.y + b.h / 2];
  const out = [];
  const z = (k, b, sd) => out.push(`<div class="tz tz-hit tz-${k}" data-hit="${k}" data-uid="${c.uid}" data-side="${sd}" title="${PZONES[k].n}" style="left:${b.x.toFixed(1)}%;top:${b.y.toFixed(1)}%;width:${b.w.toFixed(1)}%;height:${b.h.toFixed(1)}%"></div>`);
  for (const [S_, sd] of [['L', -1], ['R', 1]]) {
    const s = zg['shoulder' + S_], h = zg['hand' + S_]; if (!s || !h) continue;
    z('shoulder', s, sd); z('hand', h, sd);
    const a = cen(s), b = cen(h), w = s.w * 0.75, hh = Math.max(4, (b[1] - a[1]) * 0.42);
    z('arm', { x: (a[0] + b[0]) / 2 - w / 2, y: a[1] + (b[1] - a[1]) * 0.38 - hh / 2, w, h: hh }, sd);
  }
  return out.join('');
}

// ---------- высота портрета = высота экрана между панелями ----------
function setHeroH() { const s = document.getElementById('screen'); if (s) document.documentElement.style.setProperty('--heroH', s.clientHeight + 'px'); }
window.addEventListener('resize', setHeroH);
window.addEventListener('DOMContentLoaded', setHeroH);

// ---------- справка ----------
HELP.push(
  ['auto', 'Автораспорядок', () => `<p>Отметьте «Авто» у персонажа (в поместье, карточке или плане дня) или включите «Авто для всех». Тогда при составлении плана дня дело выбирается само:</p>
    <ul><li><b>Отдых</b>, если болеет, здоровье ниже 45, усталость 65+, стресс 70+, в положении и устал(а), течка с усталостью или стрессом.</li><li>Иначе — дело с наибольшим ожидаемым доходом (доход × шанс без ошибки). Салон — только если персонаж согласен <b>охотно</b>, и с поправкой на риск для здоровья.</li><li>Если доход низкий, есть запас роста навыка и монеты — <b>учёба</b>.</li></ul>
    <p>Причина выбора видна в плане дня и в отчёте. Выбор можно поменять вручную — он сохранится до конца дня, а завтра авто снова решит само.</p>`],
  ['salon', 'Салон', () => `<p>Салон — заведение, где персонаж развлекает гостей: беседы, музыка, вино, танцы. Подробности остаются за закрытыми дверями. Только для взрослых персонажей и <b>только по согласию</b>.</p>
    <p><b>Охота</b> = лояльность×0.4 + настроение×0.3 + дисциплина×0.15 + симпатия×0.1 + профессионализм×0.2, черты (обаяние +10, весёлый нрав +5, ранимость −10, упрямство −8), стресс 60+ −10, течка +5. Ниже ${SALON_NEED} — откажет. ${SALON_NEED}–${SALON_EAGER - 1} — работает <b>без охоты</b>: доход ×0.8, симпатия −2, стресс +5, лояльность −1.5 (если дисциплина ниже 60).</p>
    <p><b>Доход</b> выше обычного у красивых (редкость), молодых, обаятельных, преданных и довольных: база по Обаянию, Ловкости, Выносливости и Удаче × красота × возраст × профессионализм × настроение × лояльность × черты × спрос.</p>
    <p><b>Риск</b> 1–25% за вечер: здоровье −8…15, иногда хворь, стресс +8. Снижают профессионализм, выносливость и крепкое здоровье. Усталость +16, стресс +12 (меньше с опытом).</p>
    <p>Каждый вечер растёт <b>Профессионализм</b> (до 100) и иногда Обаяние. В положении салон закрыт. В течку доход ×1.1, но риск и стресс выше.</p>
    <p><b>Беременность после салона</b> (только у женщин, если есть место в поместье и здоровье 50+): база 3% + плодовитость (до +6%) + здоровье + возраст + сезон + течка − профессионализм, пределы 0.5–12%. <b>Травяной отвар</b> (ссылка в разборе «Почему так») снижает шанс в 4 раза и стоит ${HERBAL_COST} мон. за вечер. Отец — анонимный гость салона: наследник похож на мать, но получает случайные гены — случайный потенциал, случайную черту и, возможно, кровь другой расы.</p>
    <p><b>Животик</b> растёт в три стадии (дни 1–3, 4–6, 7–9). У 10 героинь есть рисунки стадий, у остальных — значок на портрете.</p>`],
  ['punish', 'Проступки и наказание', () => `<p>Персонажи иногда провиниваются: <b>грубость, лень, непослушание, ошибки в работе</b>. Это видно в отчёте дня и в журнале проступков в карточке. Проступок «свежий» 3 дня.</p>
    <p>В карточке включите режим <b>«Наказать»</b> на портрете, выберите инструмент (ладонь, линейка, розга, плётка) и касайтесь рук и плеч на рисунке; спина и «пониже спины» — кнопками в разделе «Наказание».</p>
    <ul><li><b>По делу</b> (есть свежий проступок): дисциплина растёт, лояльность и симпатия <b>не падают</b>. Первое наказание за день «закрывает» один проступок.</li><li><b>Без повода</b>: лояльность −2 × инструмент, симпатия −2 × инструмент, стресс ×2.5, настроение −4.</li><li>Не больше ${PUNISH_MAX} ударов в день, каждый следующий слабее; после 3-го даже справедливое наказание немного снижает симпатию.</li><li><b>Розга и плётка</b> оставляют на месте удара бледно-красные полосы; они светлеют день ото дня и сходят за 3 дня.</li><li>Нельзя наказывать больных, ослабевших (здоровье ниже 30) и тех, кто в положении.</li></ul>
    <p>Высокая дисциплина снижает шанс ошибок и проступков. Отказ от салона проступком не считается.</p>`],
  ['voice', 'Звуки', () => `<p>Персонажи отзываются голосом: довольное «м-м», вздох, смешок или мурчание на приятные прикосновения; недовольное ворчание, если доверия мало; при наказании — «ай!», шипение или всхлип у героинь, кряхтение и шипение у героев. Женский голос мягкий: тёплое «м-м-м», мелодичное мурлыканье, лёгкий вздох и смешок — каждый раз немного другой. Звук отключается в меню.</p><p><b>Озвучка реплик</b> (в меню): приветствия и реакции читает русский голос браузера, у каждого персонажа своя высота и темп. Зависит от голосов, установленных на устройстве.</p>`],
);

// ---------- обработчики ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-autot],[data-autoall],[data-cmode],[data-tool],[data-hit]');
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
  if (d.cmode) { setCardMode(d.cmode); try { sfx('pop'); } catch (er) { } return; }
  if (d.tool) { UI.tool = d.tool; const c = findAny(UI.cardUid); if (c) { const hm = document.querySelector('.hero-ui'); if (hm) hm.innerHTML = heroModesHtml(c); if (findOwned(c.uid)) refreshPunish(c); } try { sfx('swish'); } catch (er) { } return; }
  if (d.hit) return punish(d.uid, d.hit, +d.side || 0);
}, true);
