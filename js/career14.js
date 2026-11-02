'use strict';
// ===== v14: Карьера — путь от лавочника до главы Торговой гильдии; сюжет; испытания; тайна Основателя =====
const CAR_VER = 'v14.0';
const RIVAL = { n: 'Корнелий Ставрак', s: 'Ставрак', d: 'купец из Заречья: напомаженные усы, улыбка как у кота над сметаной и привычка называть всех «душенька»' };
const EXAM = { n: 'Ортензия Бук', s: 'госпожа Бук', d: 'гномка-экзаменатор гильдии с гроссбухом толщиной в кирпич и пером, которое скрипит строже любого судьи' };
const FOUNDER = { n: 'Ольгерд Медовар', s: 'Медовар' };
const PATH_N = { t: 'Торговый магнат', p: 'Меценат-покровитель', s: 'Тень гильдии' };
const PATH_I = { t: '⚖', p: '❀', s: '☾' };

// ---------- ступени карьеры ----------
// need: [ключ, порог] — ключи: cap (капитал), rep, res (жители), qual (редкие+), bld (постройки), lvs (сумма уровней), mood (среднее настроение), ch:<глава>, tr:<испытание>
const CSTAGES = [
  { n: 'Лавочник', t: 'Хозяин маленького поместья и большой мечты', bg: 'bg01', need: [] },
  { n: 'Торговец с вывеской', t: 'Теперь у вас есть вывеска. И даже гвоздь, на котором она висит.', bg: 'bg01',
    need: [['cap', 2500], ['rep', 8], ['res', 4], ['ch', 1]], gold: 500, repR: 2, un: ['trials', 'steward'],
    cs: ['Утром над воротами Медового Лога появляется новая вывеска. Плотник клянётся, что буквы ровные; соседи клянутся, что видят их впервые.', 'Ставрак проходит мимо, щурится на вывеску и говорит: «Мило, душенька. Очень… по-домашнему».', 'Вы делаете вид, что не слышали. Вывеска делает вид, что не покосилась.'] },
  { n: 'Член гильдии', t: 'Членский значок, взнос и право ворчать на собраниях', bg: 'bg06',
    need: [['cap', 5000], ['rep', 15], ['res', 5], ['bld', 2], ['ch', 2], ['tr', 't1']], gold: 900, repR: 3, un: ['loan', 'trial2'],
    cs: ['В зале гильдии пахнет сургучом и старым деревом. Госпожа Бук вручает вам медный значок так торжественно, будто это ключ от городской казны.', '«Носите с гордостью, — говорит она. — И не теряйте. Второй стоит вдвое дороже, а третий — вашей репутации».', 'На собрании вы впервые голосуете. За что — не совсем понятно, но все хлопают.'] },
  { n: 'Мастер-купец', t: 'Ваши цены обсуждают на рынке. Иногда даже вежливо.', bg: 'bg11',
    need: [['cap', 9000], ['rep', 28], ['res', 7], ['qual', 2], ['bld', 4], ['ch', 3], ['tr', 't2']], gold: 1500, repR: 4, un: ['auction'],
    cs: ['Гильдия присылает вам грамоту мастера: пергамент, лента и печать размером с блин.', 'Торговки на причале теперь здороваются первыми, а мальчишки спорят, сколько у вас сундуков. Цифры растут быстрее ваших доходов.', 'Ставрак присылает поздравительную открытку. На обороте — прайс-лист его лавки. Со скидкой «для коллег».'] },
  { n: 'Старшина торгового ряда', t: 'Вас слушают. Иногда даже не перебивая.', bg: 'bg02',
    need: [['cap', 15000], ['rep', 42], ['res', 8], ['lvs', 10], ['mood', 55], ['ch', 4], ['ch', 5]], gold: 2400, repR: 5, un: ['elder'],
    cs: ['Старшину ряда выбирают в таверне «Пьяный улей», под громкие тосты и тихие подсчёты.', 'Вам вручают дубовый молоток. Им полагается стучать по столу, когда спор заходит слишком далеко. Спорщики сразу становятся вежливее — молоток тяжёлый.', 'Где-то в углу Ставрак поднимает кружку в вашу честь. Улыбается. Слишком широко.'] },
  { n: 'Советник гильдии', t: 'Кресло в совете, мягкое — и немного горячее', bg: 'bg10',
    need: [['cap', 24000], ['rep', 60], ['res', 10], ['qual', 4], ['bld', 6], ['ch', 6], ['tr', 't3']], gold: 3500, repR: 6, un: ['council'],
    cs: ['Совет гильдии собирается в библиотеке ратуши, среди карт, весов и портретов давно умерших купцов. Все смотрят строго — особенно портреты.', 'Вам отводят кресло у окна. Госпожа Бук шепчет: «Предыдущий советник сидел здесь сорок лет. Не пугайтесь скрипа — это кресло, а не традиции».', 'На первой же сессии вы спасаете городской бюджет от закупки трёхсот бочек уксуса. Вас уже уважают.'] },
  { n: 'Глава Торговой гильдии', t: 'Вершина: печать, ключи и бесконечные просители у дверей', bg: 'bg06',
    need: [['cap', 35000], ['rep', 80], ['ch', 7]], gold: 5000, repR: 10, un: ['end'] },
];
const UNLOCK_N = {
  trials: 'Испытания гильдии: «Испытание прилавка»', steward: 'Управляющий из числа жителей', loan: 'Гильдейский кредит (до 3 займов)', trial2: '«Испытание порядка»',
  auction: 'Право первого голоса на аукционе: комиссия −2%', elder: 'Печать старшины: торговля +8%', council: 'Место в совете: недельный сбор −25%, «Испытание доверия»', end: 'Эпилог и очки наследия',
};
const NEED_N = { cap: 'Капитал', rep: 'Репутация', res: 'Жителей в поместье', qual: 'Редких и лучше', bld: 'Построек', lvs: 'Сумма уровней построек', mood: 'Среднее настроение' };

// ---------- состояние ----------
function carOf() {
  if (!S.car) S.car = { v: 1, num: 1, stage: 0, start: 1, diff: 'norm', path: { t: 0, p: 0, s: 0 }, done: {}, fl: {}, clues: [], rv: { heat: 10, sch: null, n: 0 }, tr: {}, last: 0, log: [], ended: null, scen: 'heir', ready: false };
  const C = S.car;
  C.path = C.path || { t: 0, p: 0, s: 0 }; C.done = C.done || {}; C.fl = C.fl || {}; C.clues = C.clues || []; C.rv = C.rv || { heat: 10, sch: null, n: 0 }; C.tr = C.tr || {}; C.log = C.log || [];
  return C;
}
const cFl = (k) => { const v = carOf().fl[k]; return v && (v === true || typeof v !== 'number' || v >= S.day) ? v : null; };
function cSetFl(k, v) { carOf().fl[k] = v == null ? true : v; }
function cPath(k, v) { const C = carOf(); C.path[k] = (C.path[k] || 0) + v; }
function cLeadPath() { const P = carOf().path; return ['t', 'p', 's'].sort((a, b) => (P[b] || 0) - (P[a] || 0))[0]; }
function cLog(t) { const C = carOf(); C.log.push({ d: S.day, t }); C.log = C.log.slice(-40); }
function capital() {
  let inv = 0; try { for (const [, b] of bList()) inv += b.inv || 0; } catch (e) { }
  const loans = typeof loanOwed === 'function' ? loanOwed() : 0;
  return Math.round(S.gold - (S.debt || 0) - loans + inv * 0.5);
}
function avgMood() { const h = S.owned.filter(c => c.status !== 'gone'); return h.length ? Math.round(h.reduce((a, c) => a + mood(c), 0) / h.length) : 0; }
function needCur(k, v) {
  switch (k) {
    case 'cap': return capital();
    case 'rep': return S.rep;
    case 'res': return S.owned.length;
    case 'qual': return S.owned.filter(c => (c.rarity || 0) >= 1).length;
    case 'bld': try { return bList().filter(([, b]) => b.lv > 0).length; } catch (e) { return 0; }
    case 'lvs': try { return bList().reduce((a, [, b]) => a + (b.lv || 0), 0); } catch (e) { return 0; }
    case 'mood': return avgMood();
    case 'ch': return chDone(v) ? 1 : 0;
    case 'tr': return (carOf().tr[v] || {}).st === 'ok' ? 1 : 0;
  }
  return 0;
}
function needOk(n) { const [k, v] = n; return k === 'ch' || k === 'tr' ? needCur(k, v) === 1 : needCur(k, v) >= v; }
function needLabel(n) {
  const [k, v] = n;
  if (k === 'ch') return `Глава ${ROMAN[v]}: «${CHAPTERS[v].n}»`;
  if (k === 'tr') return `Испытание: «${TRIALS[v].n}»`;
  return NEED_N[k];
}
function needProg(n) { const [k, v] = n; if (k === 'ch' || k === 'tr') return needOk(n) ? 1 : 0; return clamp(needCur(k, v) / v * 100, 0, 100) / 100; }
function nextStage() { return CSTAGES[carOf().stage + 1] || null; }
function stageReady() { const N = nextStage(); return !!N && N.need.every(needOk); }
function stageProg() { const N = nextStage(); if (!N) return 1; return N.need.reduce((a, n) => a + needProg(n), 0) / N.need.length; }
function careerProg() { const C = carOf(); return Math.min(1, (C.stage + (nextStage() ? stageProg() : 0)) / (CSTAGES.length - 1)); }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function hasUnlock(u) { const C = carOf(); for (let i = 1; i <= C.stage; i++) if ((CSTAGES[i].un || []).includes(u)) return true; return false; }

// ---------- испытания гильдии ----------
const TRIALS = {
  t1: { n: 'Испытание прилавка', u: 'trials', days: 7, fee: 100, d: 'За 7 дней заработать чистыми 1500 мон. (по итогам дней).', need: 1500, prog: T => T.sum || 0 },
  t2: { n: 'Испытание порядка', u: 'trial2', days: 7, fee: 200, d: 'Все 7 вечеров среднее настроение в поместье не ниже 55, никто не сбегает и не бунтует; жителей не меньше 6.', need: 7, prog: T => T.ok || 0, pre: () => S.owned.length >= 6 || 'нужно 6 жителей' },
  t3: { n: 'Испытание доверия', u: 'council', days: 10, fee: 400, d: 'За 10 дней поднять репутацию на 8 и закончить без просроченных долгов.', need: 8, prog: T => S.rep - (T.rep0 || S.rep) },
};
function trialState(id) { return carOf().tr[id] || null; }
function trialAvail(id) { const T = TRIALS[id], st = trialState(id); if (!hasUnlock(T.u)) return 'откроется со званием'; if (st && st.st === 'ok') return 'пройдено'; if (st && st.st === 'run') return 'идёт'; if (st && st.retry > S.day) return `повтор с дня ${st.retry}`; if (T.pre) { const p = T.pre(); if (p !== true) return p; } return S.gold >= T.fee || `нужно ${T.fee} мон.`; }
function trialStart(id) {
  const T = TRIALS[id], ok = trialAvail(id); if (ok !== true) return toast('Пока нельзя: ' + ok);
  S.gold -= T.fee; carOf().tr[id] = { st: 'run', start: S.day, end: S.day + T.days, sum: 0, ok: 0, rep0: S.rep, fail: null };
  addLog(`Начато «${T.n}» (взнос ${T.fee} мон.).`); cLog(`Начато «${T.n}»`);
  closeModal(true); csShow({ bg: 'bg06', kicker: 'Испытание гильдии', title: T.n, lines: [`${EXAM.s[0].toUpperCase() + EXAM.s.slice(1)} открывает гроссбух на чистой странице и обмакивает перо.`, `«${T.d}» — читает она вслух. — Время пошло. И, умоляю, никаких «ой, не успели».`] , chips: [[`−${T.fee} мон.`, false], [`${T.days} дней`, true]] });
  save(); render();
}
function trialsDayEnd(lines, dayNet) {
  const C = carOf();
  for (const id in C.tr) {
    const st = C.tr[id], T = TRIALS[id]; if (st.st !== 'run') continue;
    if (id === 't1') st.sum += dayNet;
    if (id === 't2') { if (S.owned.length < 6) st.fail = 'жителей меньше шести'; else if (avgMood() >= 55 && !st.fail) st.ok++; else if (!st.fail) st.fail = 'среднее настроение опустилось ниже 55'; }
    if (id === 't3' && S.debt > debtLimit()) st.fail = 'долг превысил лимит';
    const p = T.prog(st);
    if (!st.fail && p >= T.need) { trialPass(id, lines); continue; }
    if (st.fail || S.day >= st.end) { st.st = 'fail'; st.retry = S.day + 3; lines.push(`! «${T.n}» не пройдено${st.fail ? ': ' + st.fail : ''}. ${EXAM.s[0].toUpperCase() + EXAM.s.slice(1)} даёт пересдачу через 3 дня.`); cLog(`«${T.n}» провалено`); continue; }
    lines.push(`⚑ «${T.n}»: ${id === 't1' ? fmt(Math.max(0, Math.round(p))) + '/' + fmt(T.need) + ' мон.' : id === 't2' ? p + '/7 вечеров' : p + '/8 репутации'}, осталось ${dn(st.end - S.day)}.`);
  }
}
function trialPass(id, lines) {
  const st = carOf().tr[id], T = TRIALS[id]; st.st = 'ok'; st.at = S.day;
  const rw = { t1: 300, t2: 600, t3: 1200 }[id]; S.gold += rw; S.rep += 2;
  lines.push(`★ «${T.n}» пройдено! Гильдия возвращает взнос с прибавкой: +${rw} мон., репутация +2.`); addLog(`Пройдено «${T.n}».`); cLog(`Пройдено «${T.n}»`);
}

// ---------- главы сюжета ----------
// каждая глава — несколько сцен (событий XEV с id c14_*); after — условие появления
const CHAPTERS = {
  1: { n: 'Сосед с медовой улыбкой', parts: ['c14_1a', 'c14_1b'], when: () => S.day >= 2 },
  2: { n: 'Перо госпожи Бук', parts: ['c14_2a', 'c14_2b'], when: () => carOf().stage >= 1 },
  3: { n: 'Печать с пчелой', parts: ['c14_3a', 'c14_3b'], when: () => carOf().stage >= 2 },
  4: { n: 'Ярмарочная война', parts: ['c14_4a', 'c14_4b'], when: () => carOf().stage >= 3 },
  5: { n: 'Погреб Основателя', parts: ['c14_5a'], when: () => carOf().stage >= 3 && carOf().clues.length >= 4 },
  6: { n: 'Дым над причалом', parts: ['c14_6a', 'c14_6b'], when: () => carOf().stage >= 4 },
  7: { n: 'Выборы главы', parts: ['c14_7a'], when: () => carOf().stage >= 5 },
};
function chDone(n) { const Ch = CHAPTERS[n]; return !!Ch && Ch.parts.every(p => carOf().done[p]); }
function storyNext() {
  const C = carOf(); if (C.ended) return null;
  if (S.day - (C.last || 0) < 2) return null;
  for (const n of Object.keys(CHAPTERS).map(Number)) {
    const Ch = CHAPTERS[n]; if (chDone(n) || !Ch.when()) continue;
    const prevN = n === 5 ? 3 : n - 1; if (n > 1 && !chDone(prevN)) continue;
    const i = Ch.parts.findIndex(p => !C.done[p]); const id = Ch.parts[i];
    const e = XEV.find(z => z.id === id); if (!e) continue;
    if (i > 0 && S.day - (C.done[Ch.parts[i - 1]] || 0) < (e.gap || 2)) continue;
    if (e.cond2 && !e.cond2()) continue;
    return id;
  }
  return null;
}
function storyMark(id) { const C = carOf(); C.done[id] = S.day; C.last = S.day; const n = +id.match(/c14_(\d)/)[1]; if (chDone(n)) { cLog(`Глава ${ROMAN[n]} «${CHAPTERS[n].n}» завершена`); addLog(`Глава ${ROMAN[n]} «${CHAPTERS[n].n}» завершена.`); } }
const clueN = { key: 'латунный ключ с пчелой', ledger: 'гроссбух Основателя', stone: 'камень с клеймом-сотой', map: 'старая карта подземных ходов', recipe: 'рецепт медовухи «на три замка»', omen: 'гадание о «спящем улье»', cipher: 'расшифрованная записка О. М.' };
function addClue(k, lines) { const C = carOf(); if (C.clues.includes(k)) return false; C.clues.push(k); const t = `Улика о прошлом поместья: ${clueN[k]} (${C.clues.length}/7).`; if (lines) lines.push('★ ' + t); else toast(t); addLog(t); cLog('Улика: ' + clueN[k]); return true; }
const cE = (fn) => (x, e) => fn(x, e); // для читабельности
function rvHeat(v) { const R0 = carOf().rv; R0.heat = clamp((R0.heat || 0) + v); }
function rvScheme(k, days, txt) { const C = carOf(); C.rv.sch = { k, until: S.day + days, t: txt }; C.rv.n = (C.rv.n || 0) + 1; }
const rvOn = k => { const s = carOf().rv.sch; return s && s.k === k && s.until >= S.day; };

const CH_EV = [
  { id: 'c14_1a', bg: 'bg01', title: 'Глава I · Сосед с медовой улыбкой',
    text: () => `Напротив ваших ворот за одну ночь вырастает лавка «Ставрак и сыновья». Сыновей, как выясняется, нет — «но звучит солидно, душенька».<br><br>Сам ${RIVAL.n}, ${RIVAL.d}, заходит без стука и предлагает купить Медовый Лог «целиком, с курами и долгами» за 3000 мон. «Поместье странное, — подмигивает он. — Говорят, прежний хозяин просто вышел однажды за хлебом и не вернулся».`,
    ch: [{ l: 'Вежливо отказать: «Лог не продаётся»', go: (x, e) => { cPath('t', 2); rvHeat(10); cSetFl('ch1', 'refuse'); e.rep(1); return 'Ставрак щёлкает каблуками: «Восхищаюсь упрямством. Оно так дорого обходится!» — и уходит, насвистывая. Соседи, подслушивавшие у забора, одобрительно кивают.'; } },
      { l: 'Отказать — и угостить чаем с мёдом (20 мон.)', ok: () => xCan(20), go: (x, e) => { e.gold(-20); cPath('p', 2); rvHeat(-5); cSetFl('rv_tea'); return 'За чаем Ставрак рассказывает три анекдота, два из которых про вас. Уходя, он почти искренне говорит: «Вы мне нравитесь, душенька. Это будет неудобно».'; } },
      { l: 'Взять 300 мон. «задатка за раздумья»', go: (x, e) => { e.gold(300); cPath('s', 2); cSetFl('rv_deposit'); e.note('Ставрак запомнит этот задаток', false); return 'Ставрак отсчитывает монеты с таким удовольствием, будто это вы ему платите. «Думайте сколько угодно. Я терпелив. И проценты тоже».'; } }] },
  { id: 'c14_1b', bg: 'bg07', gap: 2, title: 'Глава I · Ключ на чердаке',
    text: 'Разбирая чердак, вы находите в балке тайник: латунный ключ с выгравированной пчелой и клочок бумаги: «Кто найдёт — не отдавай Ставракам. О. М.»<br><br>О. М. — это, видимо, Ольгерд Медовар, основатель Медового Лога, о котором в городе говорят шёпотом. А Ставраки… выходит, их семья здесь давно.',
    ch: [{ l: 'Спрятать ключ и расспросить старожилов', go: (x, e) => { addClue('key'); cPath('t', 1); e.note('улика: ключ с пчелой'); return 'Старая молочница вспоминает: «Медовар? Добрейший был человек. Пропал сорок лет назад, в тот же год, когда дед Ставрака разбогател. Совпадение, конечно». Она так выразительно говорит «конечно», что молоко сворачивается.'; } },
      { l: 'Показать ключ жителям за ужином', go: (x, e) => { addClue('key'); for (const c of xHome()) e.mood(c, 3); cPath('p', 1); e.note('улика: ключ с пчелой'); return 'Ужин превращается в клуб сыщиков. Версии: клад, привидение, «просто ключ от сарая». Последнюю отвергают единогласно как скучную.'; } },
      { l: 'Сделать слепок и продать ключ антиквару (+150)', go: (x, e) => { addClue('key'); e.gold(150); cPath('s', 1); cSetFl('key_sold'); e.note('ключ продан — слепок остался', false); return 'Антиквар долго разглядывает пчелу в лупу и платит подозрительно щедро. Слепок из воска вы прячете в шкатулку. На всякий случай.'; } }] },
  { id: 'c14_2a', bg: 'bg06', title: 'Глава II · Перо госпожи Бук',
    text: () => `Гильдия присылает экзаменатора: ${EXAM.n}, ${EXAM.d}. Она проверит ваши книги, прежде чем допустить к испытаниям.<br><br>«Долги, — говорит она, не здороваясь. — Настроение работников. Порядок в счетах. Если у вас есть что скрывать, сейчас самое время сделать это плохо».<div class="cs-note">Сейчас: долг ${fmt(S.debt || 0)} / лимит ${fmt(debtLimit())}, среднее настроение ${avgMood()}.</div>`,
    ch: [{ l: 'Показать книги как есть', go: (x, e) => { const good = (S.debt || 0) <= debtLimit() && avgMood() >= 45; cPath('t', 2); if (good) { e.rep(3); cSetFl('exam_honest'); e.note('Бук запомнит вашу честность'); return 'Госпожа Бук листает, хмыкает, снова листает. «Скучно, — выносит она вердикт. — Восхитительно скучно». В графе «замечания» она рисует аккуратный прочерк.'; } e.rep(-1); cSetFl('exam_strict', S.day + 21); e.note('три недели проверок построже', false); return '«Честно, но неряшливо», — говорит Бук и подчёркивает в книге три строчки так, что прорывает бумагу. Пересдавать не надо. Но она вернётся.'; } },
      { l: 'Угостить медовухой и показать лучшее (40 мон.)', ok: () => xCan(40), go: (x, e) => { e.gold(-40); cPath('p', 2); if (R() < 0.6) { e.rep(2); cSetFl('exam_warm'); return 'После второй кружки госпожа Бук признаётся, что в юности мечтала держать пасеку. После третьей — что гроссбух у неё вместо подушки. Расстаётесь почти друзьями.'; } e.rep(-1); cSetFl('exam_strict', S.day + 21); return '«Я на службе», — сухо говорит Бук и записывает медовуху в графу «попытки повлиять». Перо скрипит особенно мстительно.'; } },
      { l: 'Сунуть «на чернила» (200 мон.)', ok: () => xCan(200), go: (x, e) => { e.gold(-200); e.rep(1); cPath('s', 3); cSetFl('exam_bribe'); rvHeat(10); e.note('эта монета ещё всплывёт', false); return 'Монеты исчезают так ловко, будто их и не было. Бук ставит печать, не глядя. Только позже вы замечаете: в её гроссбухе появилась строчка «200 — на чернила, Медовый Лог». Почерк каллиграфический.'; } }] },
  { id: 'c14_2b', bg: 'bg01', gap: 3, title: 'Глава II · Ставрак сбивает цены',
    text: () => `${cFl('rv_deposit') ? '«Задаток, душенька, — это ведь не подарок», — напоминает Ставрак, а потом' : 'Ставрак'} вывешивает на своей лавке плакат: «Всё то же, что у соседей, — на треть дешевле!». Покупатели текут к нему рекой, а ваш прилавок скучает.<br><br>Похоже, это надолго: дней на десять, пока у него не кончатся запасы — или терпение.`,
    ch: [{ l: 'Ценовая война: сбить свои цены (торговля −10% на 5 дней)', go: (x, e) => { rvScheme('undercut', 5, 'ценовая война'); cSetFl('pricewar', S.day + 5); cPath('t', 2); rvHeat(10); return 'Две лавки напротив друг друга перекрикивают цены, как петухи на заборе. Покупатели в восторге. Ставрак — уже нет: «Душенька, вы же разоритесь!» — «Только после вас».'; } },
      { l: 'Договориться с соседями-ремесленниками (150 мон.)', ok: () => xCan(150), go: (x, e) => { e.gold(-150); rvScheme('undercut', 4, 'сбивает цены'); cPath('p', 2); e.rep(2); return 'Сапожник, бочар и пекарша вешают у себя таблички: «Мы покупаем у Медового Лога». Через четыре дня у Ставрака остаются только плакат и обида.'; } },
      { l: 'Пустить слух, что его товар — с подмоченных барж', go: (x, e) => { cPath('s', 2); rvHeat(20); if (R() < 0.7) { rvScheme('undercut', 3, 'сбивает цены'); return 'Слух разлетается быстрее голубей. Через три дня у лавки Ставрака нюхают каждый мешок, а сам он сидит на крыльце мрачнее тучи.'; } e.rep(-3); rvScheme('undercut', 10, 'сбивает цены'); return 'Слух возвращается к вам с подписью: «От Медового Лога, с любовью». Репутация страдает, а Ставрак сбивает цены с удвоенным азартом.'; } },
      { l: 'Переждать', go: (x, e) => { rvScheme('undercut', 10, 'сбивает цены'); return 'Вы решаете не опускаться до его уровня. Уровень Ставрака тем временем опускается до ваших покупателей.'; } }] },
  { id: 'c14_3a', bg: 'bg10', title: 'Глава III · Печать с пчелой',
    text: () => `В городе ползёт слух: Медовый Лог проклят, «потому прежний хозяин и сгинул». Слух пахнет напомаженными усами.<br><br>Тем временем в архиве гильдии ${EXAM.s} находит для вас старую папку: договор Основателя, скреплённый печатью с той же пчелой, что и на ключе.${cFl('exam_bribe') ? ' «Это вам не на чернила, — сухо замечает она. — Это бесплатно. Пока».' : ''}`,
    ch: [{ l: 'Изучить договор (улика) и опровергнуть слух делом', go: (x, e) => { addClue('ledger'); e.rep(2); cPath('t', 1); cPath('p', 1); return 'Договор любопытен: Медовар передавал «долю в общем погребе» какому-то Ставраку-старшему — и через месяц исчез. Пока вы читаете, ваши люди раздают на площади мёд «от проклятого поместья». Проклятие оказывается очень вкусным.'; } },
      { l: 'Заплатить сплетницам, чтобы болтали про Ставрака (120 мон.)', ok: () => xCan(120), go: (x, e) => { e.gold(-120); addClue('ledger'); cPath('s', 2); rvHeat(15); return 'К вечеру весь рынок знает, что Ставрак красит усы. К утру — что не только усы. Договор Основателя вы забираете домой под мышкой.'; } }] },
  { id: 'c14_3b', bg: 'bg04', gap: 3, title: 'Глава III · Камень за стеной', cond2: () => true,
    text: () => `${cFl('rv_deposit') ? 'Ставрак наконец приходит за своим задатком — уже 450 мон., «с учётом душевных переживаний». ' : ''}А ночью кто-то роется у вашего старого погреба: утром у стены валяется лопата, а за осыпавшейся штукатуркой видна кладка с клеймом-сотой.`,
    ch: [{ l: () => cFl('rv_deposit') ? 'Вернуть Ставраку 450 мон. и заделать стену' : 'Заделать стену и поставить сторожа (60 мон.)', ok: () => xCan(cFl('rv_deposit') ? 450 : 60), go: (x, e) => { const d = cFl('rv_deposit'); e.gold(d ? -450 : -60); if (d) { carOf().fl.rv_deposit = null; cSetFl('rv_paid'); } addClue('stone'); cPath('t', 1); return 'Стена снова цела, а клеймо вы перерисовали в тетрадь. Кто-то очень хочет попасть в ваш погреб раньше вас. Это даже льстит.'; } },
      { l: 'Устроить засаду', go: (x, e) => { addClue('stone'); if (R() < 0.5) { e.rep(2); cSetFl('rv_caught'); rvHeat(15); return 'Под утро в засаду попадается приказчик Ставрака с фонарём и картой. Карту он съесть не успевает. Ставрак клянётся, что впервые видит этого человека — и свою карту тоже.'; } return 'Ночь холодная, засада скучная, гости не пришли. Зато клеймо на камне вы разглядели как следует.'; } },
      { l: 'Продать Ставраку «право раскопок» (+400)', go: (x, e) => { e.gold(400); cPath('s', 2); cSetFl('dig_sold'); carOf().fl.rv_deposit = null; addClue('stone'); e.note('Ставрак теперь копает рядом с вашим погребом', false); return 'Ставрак платит, не торгуясь, — и это настораживает больше всего. Его люди копают с усердием кротов. Пока ничего не нашли. Пока.'; } }] },
];
const csBg = id => (CH_EV.find(e => e.id === id) || {}).bg;
for (const e of CH_EV) XEV.push(Object.assign({ w: 0, when: 'night', cond: () => false, story: true }, e));

// ---------- кат-сцены ----------
function csShow(o) {
  const body = `<div class="cs14" style="--csbg:url('assets/backgrounds/${o.bg || 'bg06'}.jpg')"><div class="cs14-art"><div class="cs14-k">${esc(o.kicker || '')}</div><div class="cs14-t">${esc(o.title)}</div></div>
    <div class="cs14-txt">${(o.lines || []).map((l, i) => `<p style="animation-delay:${0.2 + i * 0.55}s">${addr(l)}</p>`).join('')}</div>
    ${o.chips && o.chips.length ? `<div class="mchips">${o.chips.map(([s, good]) => `<span class="mchip ${good ? 'up' : 'down'}">${esc(s)}</span>`).join('')}</div>` : ''}${o.extra || ''}</div>`;
  showModal('', body, o.btns || [{ label: 'Дальше', cls: 'btn-primary', act: 'close' }]);
  const box = document.querySelector('#modal .modal-box'); if (box) box.classList.add('cs14-box');
  try { sfx('bell'); } catch (e) { }
}
function stagePromote() {
  if (!stageReady()) return toast('Не все условия выполнены.');
  const C = carOf(), i = C.stage + 1, St = CSTAGES[i];
  C.stage = i; S.gold += St.gold || 0; S.rep += St.repR || 0; C.at = C.at || {}; C.at[i] = S.day;
  addLog(`Новое звание: «${St.n}»! +${fmt(St.gold)} мон., репутация +${St.repR}.`); cLog(`Звание «${St.n}»`);
  const un = (St.un || []).filter(u => UNLOCK_N[u]).map(u => [UNLOCK_N[u], true]);
  if (i === CSTAGES.length - 1) { save(); render(); return typeof careerEnd === 'function' ? careerEnd('win') : csShow({ bg: St.bg, kicker: 'Вершина', title: St.n, lines: ['Вы — глава гильдии.'] }); }
  csShow({ bg: St.bg, kicker: `Звание ${i} из ${CSTAGES.length - 1}`, title: St.n, lines: St.cs || [St.t], chips: [[`+${fmt(St.gold)} мон.`, true], [`репутация +${St.repR}`, true]].concat(un) });
  save(); render();
}

// ---------- советы «Что дальше?» ----------
function needAdvice(n) {
  const [k, v] = n, cur = needCur(k, v);
  switch (k) {
    case 'cap': return `Капитал ${fmt(cur)} из ${fmt(v)}. Капитал — это касса минус долги плюс половина вложенного в постройки. Выгоднее всего — постройки с доходом, заказы в таверне и перепродажа на аукционе.`;
    case 'rep': return `Репутация ${cur} из ${v}. Её дают выполненные заказы в таверне (+2…3), цели дня, модная таверна, солидный район, главы сюжета и испытания гильдии.`;
    case 'res': return `Жителей ${cur} из ${v}. Купите кого-нибудь на рынке или аукционе; если тесно — расширьте дом или постройте жилые дома.`;
    case 'qual': return `Редких и лучше: ${cur} из ${v}. Ищите рамку редкости на рынке и аукционе; на Большом рынке их больше. Наследники от редких родителей тоже часто редкие.`;
    case 'bld': return `Построек ${cur} из ${v}. Во «Владениях» нажмите «+» на свободном участке; новые районы покупаются на карте.`;
    case 'lvs': return `Сумма уровней ${cur} из ${v}. Улучшайте постройки — с 3-го уровня нужны камень и инструменты.`;
    case 'mood': return `Среднее настроение ${cur} из ${v}. Отдых, похвала, подарки, угощения, купальни и сквер; меньше выговоров и переработок.`;
    case 'ch': return `Глава ${ROMAN[v]} «${CHAPTERS[v].n}» ещё не закончена. ${v === 5 ? `Нужно найти ещё ${Math.max(0, 4 - carOf().clues.length)} улик(и) о прошлом поместья — см. ниже.` : 'Сцены сюжета приходят между днями сами; просто живите дальше пару дней.'}`;
    case 'tr': { const a = trialAvail(v); return `«${TRIALS[v].n}»: ${TRIALS[v].d} ${a === true ? 'Можно начать прямо сейчас — кнопка ниже.' : 'Сейчас: ' + a + '.'}`; }
  }
  return '';
}
function clueHints() {
  const C = carOf(), have = new Set(C.clues), t = [];
  if (!have.has('stone')) t.push('камень с клеймом — откроется в главе III или при улучшении каменоломни/мастерской до 2-го уровня');
  if (!have.has('map')) t.push('карта — расспросите картографа, следопыта или лучницу');
  if (!have.has('recipe')) t.push('рецепт — пивовар, повариха или пекарша');
  if (!have.has('omen')) t.push('гадание — гадалка, лунная жрица или звездочёт');
  if (!have.has('cipher')) t.push('записка — учёная, ученица алхимика или писарь');
  return t;
}
function whatNextModal() {
  const C = carOf(), N = nextStage();
  const miss = N ? N.need.filter(n => !needOk(n)) : [];
  const ready = stageReady();
  let h = `<div class="wn14">`;
  if (C.ended) h += `<p>Карьера завершена: <b>${esc(C.ended.title || '')}</b>. Можно хозяйничать дальше или начать новую карьеру из меню.</p>`;
  else if (ready) h += `<p class="pos"><b>Все условия выполнены!</b> Примите звание «${esc(N.n)}» на панели карьеры — вас ждёт награда.</p>`;
  else h += `<p>Следующее звание — <b>«${esc(N.n)}»</b>. Осталось:</p><ol>${miss.slice(0, 4).map(n => `<li>${needAdvice(n)}</li>`).join('')}</ol>`;
  const run = Object.entries(C.tr).filter(([, s]) => s.st === 'run');
  if (run.length) h += `<p class="small">Идёт: ${run.map(([id, s]) => `«${TRIALS[id].n}» до дня ${s.end}`).join(', ')}.</p>`;
  if (C.stage >= 2 && C.clues.length < 7) h += `<details class="small"><summary>Тайна Основателя: улик ${C.clues.length}/7 (для погреба нужно 4)</summary><ul>${clueHints().map(x => `<li>${x}</li>`).join('')}</ul><p>Жители, знающие что-то о прошлом, — в карточке кнопка «Расспросить о прошлом» (нужна лояльность 35+).</p></details>`;
  const P = C.path; h += `<p class="small muted">Ваш путь: ${['t', 'p', 's'].map(k => `${PATH_I[k]} ${PATH_N[k]} ${P[k] || 0}`).join(' · ')}. От пути зависит финал.</p>`;
  if (typeof riskWarnings === 'function') { const w = riskWarnings(); if (w.length) h += `<p class="small neg">${w.map(esc).join('<br>')}</p>`; }
  h += `</div>`;
  const btns = [];
  if (ready) btns.push({ label: 'Принять звание', cls: 'btn-primary', act: () => { closeModal(true); stagePromote(); } });
  const tr = miss.find(n => n[0] === 'tr' && trialAvail(n[1]) === true);
  if (tr) btns.push({ label: `Начать «${TRIALS[tr[1]].n}» · ${TRIALS[tr[1]].fee}`, cls: ready ? '' : 'btn-primary', act: () => trialStart(tr[1]) });
  btns.push({ label: 'Все звания', act: () => careerModal() }, { label: 'Понятно', act: 'close' });
  showModal('Что дальше?', h, btns);
}
function careerModal() {
  const C = carOf();
  const rows = CSTAGES.map((St, i) => `<div class="cst14 ${i < C.stage + 1 ? 'done' : i === C.stage + 1 ? 'next' : ''}"><b>${i < C.stage + 1 ? '✓' : i}</b><div><div class="cst14-n">${esc(St.n)}${C.at && C.at[i] ? ` <span class="muted small">· день ${C.at[i]}</span>` : ''}</div><div class="small muted">${esc(St.t)}</div>
    ${i === C.stage + 1 ? `<ul class="cneed14">${St.need.map(n => `<li class="${needOk(n) ? 'ok' : ''}">${needOk(n) ? '✓' : '○'} ${esc(needLabel(n))}${n[0] !== 'ch' && n[0] !== 'tr' ? `: ${fmt(needCur(n[0], n[1]))}/${fmt(n[1])}` : ''}</li>`).join('')}</ul>` : ''}
    ${i > 0 && St.un ? `<div class="small">${St.gold ? `Награда: ${fmt(St.gold)} мон., репутация +${St.repR}. ` : ''}${St.un.filter(u => UNLOCK_N[u]).map(u => '🔓 ' + UNLOCK_N[u]).join('; ')}</div>` : ''}</div></div>`).join('');
  const chs = Object.keys(CHAPTERS).map(Number).map(n => `<li class="${chDone(n) ? 'ok' : ''}">${chDone(n) ? '✓' : '○'} Глава ${ROMAN[n]} «${esc(CHAPTERS[n].n)}»</li>`).join('');
  const log = C.log.slice(-8).reverse().map(l => `<li>д.${l.d}: ${esc(l.t)}</li>`).join('');
  showModal(`Карьера · день ${S.day - (C.start || 1) + 1}`, `<div class="car14m">${rows}<div class="panel-title">Сюжет</div><ul class="cneed14">${chs}</ul>${log ? `<div class="panel-title">Летопись</div><ul class="small">${log}</ul>` : ''}</div>`, [{ label: 'Что дальше?', cls: 'btn-primary', act: () => whatNextModal() }, { label: 'Закрыть', act: 'close' }]);
}
function careerPanel() {
  const C = carOf(), N = nextStage(), St = CSTAGES[C.stage];
  if (!N) return `<div class="panel parchment car14"><div class="car14-h"><span class="car14-st">${PATH_I[cLeadPath()]} ${esc(St.n)}</span><button class="btn small" data-c14="car">Карьера</button></div><div class="small">${C.ended ? esc(C.ended.title) : 'Вершина достигнута.'}</div></div>`;
  const ready = stageReady(), miss = N.need.filter(n => !needOk(n)), hint = ready ? 'Все условия выполнены — примите звание!' : needAdvice(miss[0]).split('. ')[0] + '.';
  const pct = Math.round(stageProg() * 100), tot = Math.round(careerProg() * 100);
  return `<div class="panel parchment car14 ${ready ? 'ready' : ''}">
    <div class="car14-h"><span class="car14-st" data-c14="car">${esc(St.n)} <i>→</i> ${esc(N.n)}</span><span class="car14-d">день ${S.day - (C.start || 1) + 1}</span></div>
    <div class="bar car14-bar"><i style="width:${pct}%"></i></div>
    <div class="car14-chips">${N.need.map(n => `<span class="cchip ${needOk(n) ? 'ok' : ''}" title="${esc(needLabel(n))}">${{ cap: '💰', rep: '★', res: '👥', qual: '◆', bld: '🏠', lvs: '⬆', mood: '☺', ch: '📜', tr: '⚑' }[n[0]]} ${n[0] === 'ch' ? 'гл. ' + ROMAN[n[1]] : n[0] === 'tr' ? TRIALS[n[1]].n.replace('Испытание ', '') : fmtS(needCur(n[0], n[1])) + '/' + fmtS(n[1])}</span>`).join('')}</div>
    <div class="car14-hint small">${esc(hint)}</div>
    <div class="car14-b">${ready ? `<button class="btn btn-primary small" data-c14="promote">Принять звание!</button>` : ''}<button class="btn small" data-c14="next">Что дальше?</button><button class="btn small" data-c14="car">Карьера · ${tot}%</button></div></div>`;
}
function fmtS(v) { v = Math.round(v); return Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + 'к' : Math.abs(v) >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'к' : String(v); }

// ---------- расспросы о прошлом ----------
const ASK14 = {
  map: { pre: ['f12', 'm03', 'f08'], t: c => `${fn1(c)} долго рассматривает план поместья и вдруг стучит пальцем: «Вот тут, под погребом, ход. На старых картах такие рисовали сотами. Медовар любил пчёл… и тайники».` },
  recipe: { pre: ['m08', 'f22', 'f19'], t: c => `${fn1(c)} вспоминает: «Моя бабка варила медовуху "на три замка" — по рецепту самого Медовара. Говорила, рецепт он держал не в голове, а в погребе. Под тремя замками, понимаете?»` },
  omen: { pre: ['f18', 'f10', 'm04'], t: c => `${fn1(c)} раскладывает карты (или звёзды — смотря у кого спросить) и шепчет: «Улей спит, но не умер. Хозяин его ждёт того, кто придёт с ключом и не с жадностью».` },
  cipher: { pre: ['f24', 'f07', 'm02'], t: c => `${fn1(c)} берёт записку О. М., хмурится, переворачивает вверх ногами — и расшифровывает: «Погреб открывают ключ, печать и камень. Ставракам — ни слова».` },
};
function askKey(c) { for (const k in ASK14) if (ASK14[k].pre.includes(c.preset) && !carOf().clues.includes(k)) return k; return null; }
function askPast(uid) {
  const c = findOwned(uid); if (!c) return;
  const k = askKey(c);
  if (!k) return showModal('Расспросить о прошлом', `<p>${esc(fn1(c))} пожимает плечами: «Про старого хозяина? Говорят, добрый был. Больше ничего не знаю, ${addr('{х}')}».</p>`);
  if (carOf().stage < 1 && !chDone(1)) return toast('Сначала стоит разобраться с главой I.');
  if (c.loyalty < 35) return showModal('Расспросить о прошлом', `<p>${esc(fn1(c))} отводит глаза: «Может, я что-то и знаю… но пока не готов${g(c, '', 'а')} рассказывать». <span class="muted small">(нужна лояльность 35+, сейчас ${Math.round(c.loyalty)})</span></p>`);
  addClue(k); loyaltyGain(c, 2); cPath('p', 1);
  csShow({ bg: 'bg10', kicker: 'Тайна Основателя', title: clueN[k][0].toUpperCase() + clueN[k].slice(1), lines: [ASK14[k].t(c)], chips: [[`улик ${carOf().clues.length}/7`, true], [`${fn1(c)}: лояльность +2`, true]] });
  save(); render();
}

// ---------- влияние сюжета на экономику ----------
(function () {
  const oInc = window.incomeInfo;
  window.incomeInfo = function (c, task) {
    const r = oInc.apply(this, arguments); task = task || (c && c.task);
    try {
      if (task === 'shop' && S.car) {
        let m = 1;
        if (rvOn('undercut')) m *= cFl('pricewar') ? 0.9 : 0.8;
        if (hasUnlock('elder')) m *= 1.08;
        if (m !== 1) { r.parts.push([rvOn('undercut') ? 'Ставрак сбивает цены' : 'печать старшины', m]); r.mult *= m; r.v = Math.round(r.base * r.mult); }
      }
    } catch (e) { }
    return r;
  };
  if (window.aucFee) { const oF = window.aucFee; window.aucFee = function () { const f = oF.apply(this, arguments); return S.car && hasUnlock('auction') ? Math.max(0.02, +(f - 0.02).toFixed(2)) : f; }; }
})();

// ---------- день ----------
let _c14lines = [];
(function () {
  const oEnd = window.endDay;
  window.endDay = function () {
    const g0 = S.gold, d0 = S.debt || 0, lv0 = {}; try { for (const [id, b] of bList()) lv0[id] = b.lv; } catch (e) { }
    const r = oEnd.apply(this, arguments);
    try {
      const C = carOf(), L = []; _c14lines = L;
      const net = (S.gold - g0) - ((S.debt || 0) - d0);
      trialsDayEnd(L, net);
      // улика при улучшении каменоломни/мастерской до 2-го уровня
      try { for (const [id, b] of bList()) if ((b.t === 'quarry' || b.t === 'workshop') && b.lv >= 2 && (lv0[id] || 0) < 2 && carOf().stage >= 1) addClue('stone', L); } catch (e) { }
      if (C.rv.sch && C.rv.sch.until < S.day) { L.push(`Ставрак свернул затею «${C.rv.sch.t}». Пока.`); C.rv.sch = null; }
      else if (C.rv.sch) L.push(`! Ставрак: ${C.rv.sch.t} — ещё ${dn(C.rv.sch.until - S.day + 1)}.`);
      if (typeof riskDayEnd === 'function') riskDayEnd(L);
      const N = nextStage();
      if (N && stageReady() && !C.ready) { L.push(`★ Все условия звания «${N.n}» выполнены — примите его на панели «Карьера».`); C.ready = true; }
      if (!stageReady()) C.ready = false;
      const sid = storyNext(); if (sid) { S.xev = { id: sid, when: 'night' }; }
      save();
    } catch (e) { console.warn('c14 end', e); }
    return r;
  };
  const oModal = window.showModal;
  window.showModal = function (title, html, btns) {
    try {
      if (/^Итоги дня/.test(title) && _c14lines.length && typeof html === 'string') {
        const li = _c14lines.map(l => `<li class="${l[0] === '!' ? 'warn' : l[0] === '★' ? 'star' : l[0] === '⚙' ? 'auto' : 'car'}">${esc(l)}</li>`).join('');
        html = html.replace('<div class="report-total">', `<div class="car14-rep"><div class="event-title">Карьера и заботы</div><ul class="report">${li}</ul></div><div class="report-total">`);
        _c14lines = [];
      }
    } catch (e) { }
    return oModal.call(this, title, html, btns);
  };
  // сцены сюжета выглядят как кат-сцены
  const oShow = window.xShow;
  window.xShow = function () {
    const r = oShow.apply(this, arguments);
    try { const q = S.xev; const e = q && XEV.find(z => z.id === q.id); if (e && e.story) { const box = document.querySelector('#modal .modal-box'); if (box && !box.classList.contains('cs14-box')) { box.classList.add('cs14-box', 'cs14-ev'); const b = box.querySelector('.modal-body'); if (b) b.insertAdjacentHTML('afterbegin', `<div class="cs14-art sm" style="--csbg:url('assets/backgrounds/${e.bg || 'bg06'}.jpg')"><div class="cs14-k">${esc(e.title.split(' · ')[0])}</div><div class="cs14-t">${esc(e.title.split(' · ')[1] || '')}</div></div>`); } } } catch (er) { }
    return r;
  };
  const oChoose = window.xChoose;
  window.xChoose = function (e, x, ch) { if (e && e.story) { storyMark(e.id); } return oChoose.apply(this, arguments); };
  // панель на главном экране
  const oRender = window.render;
  window.render = function () {
    const r = oRender.apply(this, arguments);
    try {
      if (UI.screen === 'manor') { const h = document.querySelector('#screen .screen-head'); if (h && !document.querySelector('#screen .car14')) h.insertAdjacentHTML('afterend', careerPanel()); }
      if (UI.screen === 'card') { const c = findOwned(UI.cardUid); const p = document.querySelector('#screen .act-grid'); if (c && p && !document.querySelector('[data-c14ask]') && (askKey(c) || carOf().stage >= 1)) p.insertAdjacentHTML('beforeend', `<button class="btn" data-c14ask="${c.uid}">Расспросить о прошлом<small>${askKey(c) ? 'кажется, что-то знает' : 'о старом хозяине'}</small></button>`); }
    } catch (e) { console.warn('c14 render', e); }
    return r;
  };
  const oMig = window.migrate;
  if (oMig) window.migrate = function () { const r = oMig.apply(this, arguments); try { if (S && !S.car) { carOf(); S.car.start = 1; S.car.old = true; } } catch (e) { } return r; };
  const oNew = window.newGame;
  window.newGame = function () { const r = oNew.apply(this, arguments); try { delete S.car; carOf(); S.car.start = S.day; } catch (e) { } return r; };
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-c14],[data-c14ask],[data-c14tr]'); if (!t) return;
    ev.preventDefault(); ev.stopPropagation();
    const d = t.dataset;
    if (d.c14ask) return askPast(d.c14ask);
    if (d.c14tr) return trialStart(d.c14tr);
    if (d.c14 === 'next') return whatNextModal();
    if (d.c14 === 'car') return careerModal();
    if (d.c14 === 'promote') return stagePromote();
  }, true);
  try {
    HELP.push(['career', 'Карьера и сюжет (v14)', () => `<p><b>Цель игры</b> — пройти путь от лавочника до <b>главы Торговой гильдии</b>: ${CSTAGES.slice(1).map(s => s.n).join(' → ')}. Панель «Карьера» на главном экране показывает, что нужно для следующего звания: капитал (касса − долги + половина вложений в постройки), репутацию, жителей, постройки, главы сюжета и испытания гильдии. Кнопка <b>«Что дальше?»</b> подскажет ближайший шаг.</p>
      <p>За каждое звание — сценка, награда и новая возможность. Хорошая карьера занимает 120–200 дней.</p>
      <p><b>Сюжет.</b> Сосед-соперник ${RIVAL.n}, экзаменатор гильдии ${EXAM.n} и тайна пропавшего Основателя Медового Лога. Сцены приходят между днями; выборы запоминаются надолго: меняют цены, репутацию, отношение героев и дальнейшие события.</p>
      <p><b>Путь.</b> Каждый выбор склоняет вас к одному из трёх финалов: ⚖ Торговый магнат, ❀ Меценат-покровитель, ☾ Тень гильдии.</p>
      <p><b>Испытания гильдии</b> — задания на 7–10 дней со взносом; при успехе взнос возвращается с прибавкой. Провал — пересдача через 3 дня.</p>
      <p><b>Тайна Основателя.</b> Улики дают сюжет, улучшения каменоломни или мастерской и расспросы знающих жителей (кнопка «Расспросить о прошлом» в карточке, лояльность 35+). Для главы V нужно 4 улики.</p>`]);
  } catch (e) { }
})();
