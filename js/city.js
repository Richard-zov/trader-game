'use strict';
// ===== v11: город — районы, участки, стройка, соседства, события, «Шёлковая лента», Большой невольничий рынок =====
const CITY_VER = 'v14.2';
const DEF_SLOTS = [0, 1, 2, 2, 3, 4];
const BT = {
  market: { n: 'Рынок', cat: 'inc', d: 'Прилавки и навесы: торговля с горожанами.', st: ['cha', 'int'], tr: ['charming', 'clever'], base: 62, cost: 600, days: 2, max: 1, roof: '#b5523a' },
  quarry: { n: 'Каменоломня', cat: 'inc', d: 'Камень для всего Лога. Можно продавать или копить на стройки.', st: ['str', 'end'], tr: ['hardy', 'diligent'], base: 60, cost: 700, days: 2, max: 2, roof: '#7a7266', store: 'stone', ter: 'hill' },
  workshop: { n: 'Мастерская', cat: 'inc', d: 'Столярка и кузня. Даёт доход или инструменты для строек.', st: ['mas', 'agi'], tr: ['diligent', 'clever'], base: 66, cost: 800, days: 2, max: 2, roof: '#8a5a2e', store: 'tools' },
  farm: { n: 'Огород', cat: 'inc', d: 'Овощи и мёд: доход и дешевле еда в поместье.', st: ['end', 'wil'], tr: ['diligent', 'cheerful'], base: 48, cost: 450, days: 1, max: 3, roof: '#c9a23a', ter: 'garden' },
  tavern: { n: 'Таверна', cat: 'fun', d: 'Свой кабачок: песни, пироги, слухи. Иногда +репутация.', st: ['cha', 'luk'], tr: ['charming', 'cheerful'], base: 64, cost: 900, days: 2, max: 1, roof: '#9b3b2e', ter: 'river' },
  brothel: { n: 'Дом утех «Шёлковая лента»', short: '«Шёлковая лента»', cat: 'fun', d: 'Изысканный дом свиданий: музыка, вино, приятная компания и много слухов. Доходно, но гильдия косится, а работникам нужен отдых и лекарь.', st: ['cha', 'agi'], tr: ['charming', 'cheerful'], base: 88, cost: 1500, days: 3, max: 1, roof: '#a64d79', slots: [0, 3, 4, 6, 7, 8] },
  baths: { n: 'Купальни', cat: 'city', d: 'Тёплые купальни и лекарь: снимают стресс и лечат всех домашних.', st: ['wil', 'cha'], tr: ['loyal', 'hardy'], base: 34, cost: 1000, days: 2, max: 1, roof: '#3e7a8a', ter: 'river' },
  library: { n: 'Башня-библиотека', short: 'Библиотека', cat: 'city', d: 'Переписчики книг. Работники понемногу умнеют, район становится солиднее.', st: ['int', 'wil'], tr: ['clever', 'loyal'], base: 48, cost: 1100, days: 3, max: 1, roof: '#4a4f8a' },
  guard: { n: 'Караульня', cat: 'city', d: 'Стража района: меньше краж, пожары тушат быстрее.', st: ['str', 'wil'], tr: ['loyal', 'hardy'], base: 0, cost: 700, days: 2, max: 2, roof: '#5a6a7a', slots: [0, 1, 2, 2, 3, 3] },
  houses: { n: 'Жилища', cat: 'city', d: 'Уютные домики для ваших людей: +2 места в поместье за уровень и счастье.', noWork: true, cost: 500, days: 1, max: 3, roof: '#b07a3a' },
  park: { n: 'Сквер', cat: 'city', d: 'Липы, скамейки, фонтан. Счастье жителей и репутация района.', noWork: true, cost: 400, days: 1, max: 3, roof: '#5c8a3a', ter: 'garden' },
  slavemkt: { n: 'Большой невольничий рынок', short: 'Большой рынок', cat: 'special', d: 'Свой огромный рынок: больше выбор, редкие люди, меньше комиссия, загон для перепродажи и дни распродаж. Заменяет старый рынок.', st: ['cha', 'int'], tr: ['clever', 'charming'], base: 90, cost: 0, days: 0, max: 1, roof: '#7a3a2a', slots: [0, 2, 3, 4], maxLv: 3 },
};
const CATS = { inc: 'Доход и ремёсла', city: 'Город и жители', fun: 'Увеселения', special: 'Особое' };
const DISTRICTS = {
  center: { n: 'Центр', cost: 0, r: [94, 184, 172, 220] },
  craft: { n: 'Ремесленная слобода', cost: 1500, r: [8, 8, 168, 168] },
  hill: { n: 'Каменный холм', cost: 2500, r: [184, 8, 168, 168], ter: 'hill' },
  gardens: { n: 'Сады', cost: 5000, r: [8, 184, 78, 220], r2: [274, 184, 78, 220], ter: 'garden' },
  river: { n: 'Речной квартал', cost: 4000, r: [8, 412, 344, 200], ter: 'river' },
};
const PLOTS = {
  c1: { d: 'center', x: 130, y: 228 }, c2: { d: 'center', x: 230, y: 228 }, c3: { d: 'center', x: 130, y: 368 }, c4: { d: 'center', x: 230, y: 368 }, sq: { d: 'center', x: 180, y: 300, big: true },
  cr1: { d: 'craft', x: 52, y: 66 }, cr2: { d: 'craft', x: 132, y: 66 }, cr3: { d: 'craft', x: 52, y: 146 }, cr4: { d: 'craft', x: 132, y: 146 },
  h1: { d: 'hill', x: 228, y: 72 }, h2: { d: 'hill', x: 310, y: 66 }, h3: { d: 'hill', x: 268, y: 148 },
  g1: { d: 'gardens', x: 47, y: 240 }, g2: { d: 'gardens', x: 47, y: 352 }, g3: { d: 'gardens', x: 313, y: 240 }, g4: { d: 'gardens', x: 313, y: 352 },
  r1: { d: 'river', x: 58, y: 466 }, r2: { d: 'river', x: 140, y: 488 }, r3: { d: 'river', x: 222, y: 466 }, r4: { d: 'river', x: 306, y: 488 },
};
const TER_N = { hill: 'холм', river: 'у реки', garden: 'сады' };
const ADJ = [
  ['tavern', 'market', 1.12, 'рядом рынок — толпа'], ['market', 'tavern', 1.08, 'рядом таверна'], ['brothel', 'baths', 1.15, 'рядом купальни'],
  ['brothel', 'tavern', 1.10, 'рядом таверна'], ['workshop', 'quarry', 1.12, 'камень под рукой'], ['tavern', 'farm', 1.10, 'свежие продукты'],
  ['library', 'park', 1.12, 'тишина сквера'], ['market', 'slavemkt', 1.15, 'поток покупателей'], ['slavemkt', 'market', 1.10, 'рядом лавки'],
  ['library', 'brothel', 0.88, 'соседство с «Лентой» мешает учёным'], ['brothel', 'guard', 1.05, 'спокойнее под охраной'], ['tavern', 'guard', 1.05, 'меньше драк'],
  ['market', 'guard', 1.05, 'меньше краж'], ['baths', 'park', 1.10, 'зелень вокруг'], ['slavemkt', 'guard', 1.05, 'порядок на торгах'],
];
const POLICY = {
  salon: { n: 'Салон', d: 'Беседы, музыка, танцы — и только. Доход ×0.7, слухов мало, стресс +8, репутация района почти не страдает.', m: 0.7, st: 8, pr: 2, safe: 2 },
  std: { n: 'Обычный дом', d: 'Доход ×1.0, стресс +14, репутация района −4 за уровень.', m: 1, st: 14, pr: 4, safe: 4 },
  lavish: { n: 'Роскошь и тайные гости', d: 'Доход ×1.35, стресс +20, лояльность −1 в день, гильдия косится (риск −1 репутации), больше слухов и проверок.', m: 1.35, st: 20, pr: 7, safe: 6 },
};
const MKT = {
  buy: 25000, rank: 2,
  stages: [{ n: 'Фундамент и загоны', g: 2500, stone: 40, tools: 0, pts: 150 }, { n: 'Галереи и помост', g: 3000, stone: 40, tools: 30, pts: 200 }, { n: 'Крытые ряды и контора', g: 4000, stone: 20, tools: 40, pts: 250 }],
  up: [null, null, { g: 9000, stone: 30, tools: 20, pts: 120 }, { g: 16000, stone: 50, tools: 40, pts: 200 }],
  lots: [0, 4, 7, 10], disc: [0, 0.06, 0.10, 0.14], sell: [0, 0.04, 0.07, 0.10], stable: [0, 4, 8, 12], buyers: [0, 2, 3, 4], rare: [0, 0.15, 0.25, 0.35],
};
const MAT_N = { stone: 'камень', tools: 'инструменты' }, MAT_P = { stone: 18, tools: 35 };

// ---------- состояние и перенос сохранений ----------
function estOf() {
  if (!S.est) S.est = { b: {}, dem: {}, self: 0, last: null };
  const E = S.est;
  if (!E.v11) {
    const old = E.b || {}; E.b = {};
    const free = Object.keys(PLOTS).filter(p => PLOTS[p].d === 'center' && !PLOTS[p].big).concat(['cr1', 'cr2', 'cr3', 'cr4']);
    E.dist = { center: true };
    for (const [k, v] of Object.entries(old)) {
      if (!v || !v.lv || !BT[k]) continue;
      const plot = free.shift(); if (PLOTS[plot].d !== 'center') E.dist[PLOTS[plot].d] = true;
      E.b[k] = { t: k, lv: v.lv, plot, job: null, inv: bldCost(k, 1) * v.lv };
    }
    for (const c of S.owned) if (c.bld && !E.b[c.bld]) c.bld = null;
    Object.assign(E, { mat: { stone: 0, tools: 0 }, ev: null, auto: false, autoB: false, pol: 'std', mods: [], stable: [], saleDay: 0, saleLast: -99, freeRef: 0, sold: { d: 0, n: 0 }, capAdded: 0, v11: 1 });
    for (const c of S.owned) if (c.age < 19) c.age = 19;
  }
  for (const k in BT) if (!E.dem[k]) E.dem[k] = 1;
  if (!S.goals) S.goals = { day: 0, list: [], ms: {}, cnt: {} };
  if (!S.auc) S.auc = { next: S.day, lots: [], sell: [], won: 0 };
  return E;
}
const bOf = (id) => estOf().b[id];
const btOf = (id) => BT[bOf(id).t];
function bldLabel(id) { const b = id && S.est && S.est.b[String(id).replace(/^@/, '')]; return b ? (BT[b.t].short || BT[b.t].n) : 'постройка'; }
function bldCost(t, lv) { return Math.round(BT[t].cost * Math.pow(lv, 1.55) / 10) * 10; }
function bldMats(t, lv) { if (t === 'slavemkt') { const u = MKT.up[lv]; return u ? { stone: u.stone, tools: u.tools } : {}; } return lv >= 3 ? { stone: 10 * (lv - 2), tools: 6 * (lv - 2) } : {}; }
function bldDays(t, lv) { return BT[t].days + lv - 1; }
function bldSlots(id) { const b = bOf(id), B = BT[b.t]; return B.noWork ? 0 : (B.slots || DEF_SLOTS)[b.lv] || 0; }
function bldUpkeepB(b) { const lv = b.lv; if (!lv) return 0; const t = b.t; return t === 'slavemkt' ? 90 + 40 * lv : t === 'brothel' ? 15 + 10 * lv : t === 'guard' ? 10 + 6 * lv : t === 'park' ? 3 + 2 * lv : t === 'houses' ? 4 + 3 * lv : 6 + 5 * lv; }
function bldUpkeep(id) { return bldUpkeepB(bOf(id)); }
function bldWorkers(id) { return S.owned.filter(c => c.bld === id); }
function bldBuilders(id) { return S.owned.filter(c => c.bld === '@' + id); }
function bList(t) { return Object.entries(estOf().b).filter(([, b]) => !t || b.t === t); }
function lvSum(t) { return bList(t).reduce((a, [, b]) => a + b.lv, 0); }
function mktId() { const e = bList('slavemkt')[0]; return e ? e[0] : null; }
function mktLv() { try { const id = mktId(); return id ? S.est.b[id].lv : 0; } catch (e) { return 0; } }
function plotOf(id) { return PLOTS[bOf(id).plot]; }
function freePlots() { const E = estOf(), used = new Set(Object.values(E.b).map(b => b.plot)); return Object.keys(PLOTS).filter(p => E.dist[PLOTS[p].d] && !used.has(p) && !PLOTS[p].big); }
function neighbors(plot) { const P = PLOTS[plot], E = estOf(); return Object.entries(E.b).filter(([, b]) => b.plot !== plot && b.lv > 0 && Math.hypot(PLOTS[b.plot].x - P.x, PLOTS[b.plot].y - P.y) < 106).map(([id, b]) => [id, b]); }
function adjInfo(t, plot) {
  let m = 1; const why = [];
  const P = PLOTS[plot], terr = P.d && DISTRICTS[P.d].ter;
  if (terr && BT[t].ter === terr) { const v = terr === 'hill' ? 1.25 : 1.15; m *= v; why.push([`место: ${TER_N[terr]}`, v]); }
  const near = new Set(neighbors(plot).map(([, b]) => b.t));
  for (const [a, b, v, w] of ADJ) if (a === t && near.has(b)) { m *= v; why.push([w, v]); }
  return { m, why };
}
// ---------- показатели города ----------
function cityCore() {
  const E = estOf(), pr = [['основа', 35]], hp = [['основа', 50]], sf = [['основа', 55]];
  const lvOf = t => lvSum(t);
  const add = (arr, n, v) => { if (v) arr.push([n, Math.round(v)]); };
  add(pr, 'библиотека', 6 * lvOf('library')); add(pr, 'скверы', 5 * lvOf('park')); add(pr, 'купальни', 3 * lvOf('baths')); add(pr, 'рынок', 2 * lvOf('market'));
  add(pr, 'Большой рынок', 5 * lvOf('slavemkt')); add(pr, 'караульни', 2 * lvOf('guard')); add(pr, 'шум каменоломни', -2 * lvOf('quarry'));
  add(pr, '«Шёлковая лента»', -POLICY[E.pol].pr * lvOf('brothel'));
  const st = S.owned.length ? S.owned.reduce((a, c) => a + c.stress, 0) / S.owned.length : 30;
  add(hp, 'жилища', 4 * lvOf('houses')); add(hp, 'скверы', 4 * lvOf('park')); add(hp, 'купальни', 5 * lvOf('baths')); add(hp, 'таверна', 2 * lvOf('tavern'));
  add(hp, `средний стресс ${Math.round(st)}`, -(st - 40) / 3);
  const tight = S.owned.length - S.capacity + 1; if (tight > 0) add(hp, 'теснота', -4 * tight);
  add(sf, 'караульни', 10 * lvOf('guard')); add(sf, 'стражники', 3 * S.owned.filter(c => c.bld && E.b[c.bld] && E.b[c.bld].t === 'guard').length);
  add(sf, 'таверна', -3 * lvOf('tavern')); add(sf, '«Шёлковая лента»', -(POLICY[E.pol].safe / 2) * lvOf('brothel')); add(sf, 'Большой рынок', -5 * lvOf('slavemkt')); add(sf, 'рынок', -2 * lvOf('market'));
  { const g4 = bList().filter(([, b]) => b.t !== 'slavemkt' && b.lv === 4).length, g5 = bList().filter(([, b]) => b.t !== 'slavemkt' && b.lv >= 5).length;
    add(pr, 'парадные фасады (ур. 4–5)', 2 * g4 + 4 * g5); add(hp, 'имперская роскошь (ур. 5)', 2 * g5); }
  add(sf, 'размер города', -4 * (Object.keys(E.dist).length - 1));
  for (const md of E.mods || []) if (md.until >= S.day) add({ prest: pr, happy: hp, safe: sf }[md.k], md.n, md.v);
  const sum = a => clamp(Math.round(a.reduce((x, y) => x + y[1], 0)), 0, 100);
  return { prest: sum(pr), happy: sum(hp), safe: sum(sf), why: { prest: pr, happy: hp, safe: sf } };
}
function bldWorkerOut(c, id, core) {
  const b = bOf(id), B = BT[b.t], lv = Math.max(1, b.lv), why = [], E = estOf();
  core = core || cityCore();
  const sv = (eff(c, B.st[0]) + eff(c, B.st[1]) * 0.7) / 1.7, req = 12 + lv * 6;
  let m = clamp(sv / 28, 0.45, 2.4); why.push([`${statName(B.st[0])}+${statName(B.st[1])} ${Math.round(sv)}`, m]);
  if (sv < req) { why.push([`ниже требования ${req}`, 0.6]); m *= 0.6; }
  const lm = 1 + 0.4 * (lv - 1); why.push([`уровень ${lv}`, lm]); m *= lm;
  if (lv >= 3 && b.t !== 'slavemkt') { why.push([lv >= 5 ? 'имперская утварь' : 'добротная утварь', lv >= 5 ? 1.1 : 1.05]); m *= lv >= 5 ? 1.1 : 1.05; }
  for (const t of B.tr) if (has(c, t)) { why.push([TRAITS[t].name, 1.25]); m *= 1.25; }
  if (has(c, 'lazy')) { why.push(['Лень', 0.85]); m *= 0.85; }
  if (has(c, 'clumsy') && (b.t === 'workshop' || b.t === 'quarry')) { why.push(['Неуклюжесть', 0.85]); m *= 0.85; }
  if (b.t === 'brothel') {
    const rv = 1 + 0.12 * (c.rarity || 0); if (rv > 1) { why.push(['редкость и стать', rv]); m *= rv; }
    if ((c.gear || []).some(it => it.kind === 'outfit' && it.dur > 0)) { why.push(['наряд', 1.1]); m *= 1.1; }
    const P = POLICY[E.pol]; if (P.m !== 1) { why.push([P.n, P.m]); m *= P.m; }
  }
  if (c.fatigue >= 70) { why.push(['усталость', 0.6]); m *= 0.6; }
  const a = adjInfo(b.t, b.plot); for (const w of a.why) why.push(w); m *= a.m;
  const hm = 0.85 + 0.3 * core.happy / 100, pm = 0.9 + 0.2 * core.prest / 100;
  why.push([`счастье ${core.happy}`, hm]); why.push([`репутация района ${core.prest}`, pm]); m *= hm * pm;
  const dm = E.dem[b.t] || 1; why.push(['спрос', dm]); m *= dm;
  return { v: Math.round((B.base || 0) * m), why, req, sv: Math.round(sv) };
}
function bldPreview(id, core) { const b = bOf(id); if (!b.lv || b.closed === S.day) return 0; return bldWorkers(id).reduce((a, c) => a + bldWorkerOut(c, id, core).v, 0); }
function builderPts(c) { return Math.max(5, Math.round(2 + (eff(c, 'str') + eff(c, 'end')) / 8 + eff(c, 'mas') / 12 + (has(c, 'diligent') ? 3 : 0) - (has(c, 'lazy') ? 2 : 0))); }
function cityStats() {
  const core = cityCore(), E = estOf(); let inc = 0, upk = 0, mat = { stone: 0, tools: 0 };
  for (const [id, b] of bList()) {
    upk += bldUpkeepB(b); const v = bldPreview(id, core);
    if (b.mode === 'store' && BT[b.t].store) mat[BT[b.t].store] += matFrom(b.t, v); else inc += v;
  }
  upk += 8 * (E.stable || []).length;
  return { ...core, inc, upk, net: inc - upk, mat };
}
function matFrom(t, v) { return Math.max(1, Math.round(v / (t === 'quarry' ? 16 : 26))); }
function syncCap() { const E = estOf(), want = 2 * lvSum('houses'); if (want !== (E.capAdded || 0)) { S.capacity += want - (E.capAdded || 0); E.capAdded = want; } }

// ---------- действия ----------
function needMats(m) { const E = estOf(); let short = 0; const miss = {}; for (const k in m) { const d = (m[k] || 0) - E.mat[k]; if (d > 0) { miss[k] = d; short += d * MAT_P[k]; } } return { miss, short }; }
function matsTxt(m) { return Object.entries(m).filter(([, v]) => v).map(([k, v]) => `${MAT_N[k]} ${v}`).join(', '); }
function payBuild(g, m, buyMissing) {
  const E = estOf(), nm = needMats(m);
  if (nm.short && !buyMissing) return { err: `Не хватает материалов: ${matsTxt(nm.miss)}.`, nm };
  if (S.gold < g + nm.short) return { err: `Не хватает монет: нужно ${fmt(g + nm.short)}.` };
  S.gold -= g + nm.short; for (const k in m) E.mat[k] = Math.max(0, E.mat[k] - (m[k] || 0) + (nm.miss[k] || 0) - (nm.miss[k] || 0)) ;
  for (const k in m) if (nm.miss[k]) E.mat[k] = 0;
  return { ok: true, paid: g + nm.short };
}
function canBuild(t, plot) {
  const B = BT[t], E = estOf();
  if (t === 'slavemkt') return 'Только на центральной площади.';
  if (bList(t).length >= B.max) return `Не больше ${B.max}.`;
  if (t === 'brothel' && rankIdx() < 1) return 'Нужен ранг гильдии E.';
  if (!E.dist[PLOTS[plot].d]) return 'Район не куплен.';
  return '';
}
function cityBuild(t, plot, buyMissing) {
  const E = estOf(), why = canBuild(t, plot); if (why) return toast(why);
  if (Object.values(E.b).some(b => b.plot === plot)) return toast('Участок занят.');
  const cost = bldCost(t, 1), r = payBuild(cost, {}, buyMissing); if (r.err) return toast(r.err);
  const id = E.b[t] ? t + '_' + (S.nextId++) : t;
  E.b[id] = { t, lv: 0, plot, job: { to: 1, need: bldDays(t, 1) * 12, done: 0 }, inv: cost, mode: 'sell' };
  sfx('coin'); addLog(`Заложено: ${BT[t].n} (${DISTRICTS[PLOTS[plot].d].n}) за ${fmt(cost)} мон.`);
  toast(`Стройка началась: ${BT[t].n}. Строители ускорят дело.`); goalBump('build'); save(); closeModal(true); render(); bldModal(id);
}
function bldUpgrade(id, buyMissing) {
  const b = bOf(id), B = BT[b.t]; if (b.job) return toast('Уже строится.');
  if (b.lv >= (B.maxLv || 5)) return toast('Это высший уровень.');
  const to = b.lv + 1, g = b.t === 'slavemkt' ? MKT.up[to].g : bldCost(b.t, to), m = bldMats(b.t, to);
  const r = payBuild(g, m, buyMissing);
  if (r.err) { if (r.nm) return confirmModal('Докупить материалы?', `${r.err} Поставщик продаст недостающее за ${fmt(r.nm.short)} мон.`, `Докупить и строить · ${fmt(g + r.nm.short)}`, () => bldUpgrade(id, true)); return toast(r.err); }
  b.inv = (b.inv || 0) + r.paid;
  b.job = { to, need: b.t === 'slavemkt' ? MKT.up[to].pts : bldDays(b.t, to) * 12, done: 0 };
  sfx('coin'); addLog(`Начато улучшение: ${B.n} → ур. ${to}.`); toast(`${B.short || B.n}: улучшение до ${to} начато. Здание пока работает на старом уровне.`);
  goalBump('build'); save(); render(); bldModal(id);
}
function bldAssign(uid, id) {
  const c = findOwned(uid); if (!c) return;
  if (!id) { const was = c.bld; c.bld = null; toast(`${fn1(c)} ${was && was[0] === '@' ? 'больше не строит' : 'снят' + g(c, '', 'а') + ' с работы в постройке'}.`); save(); return; }
  if (c.status !== 'home') return toast('Сейчас занят' + g(c, '', 'а') + ' на заказе.');
  const b = bOf(id); if (!b || !b.lv) return toast('Здание ещё строится.');
  if (BT[b.t].noWork) return toast('Здесь работники не нужны.');
  if (bldWorkers(id).length >= bldSlots(id)) return toast('Все места заняты — улучшите здание.');
  if (b.t === 'brothel') {
    if (c.age < 19) return toast('Только взрослые.');
    if (c.preg) return toast(`${fn1(c)} сейчас в положении — не время.`);
    if (c.loyalty < 35) return toast(`${fn1(c)} отказывается: лояльность ниже 35. В «Ленте» работают только те, кто сам согласен.`);
  }
  c.bld = id; toast(`${fn1(c)} теперь работает: ${BT[b.t].short || BT[b.t].n}. Обычных дел у н${g(c, 'его', 'её')} не будет.`); goalBump('assign'); save();
}
function builderAssign(uid, id) {
  const c = findOwned(uid), b = bOf(id); if (!c || !b || !b.job) return;
  if (c.status !== 'home') return toast('Сейчас занят' + g(c, '', 'а') + ' на заказе.');
  if (c.preg) return toast('В положении на стройку не ставим.');
  c.bld = '@' + id; toast(`${fn1(c)} — на стройку: +${builderPts(c)} к работе в день.`); goalBump('builder'); save();
}
function bldDemolish(id) {
  const b = bOf(id), B = BT[b.t], back = Math.round((b.inv || 0) * 0.3);
  confirmModal('Снести «' + (B.short || B.n) + '»?', `Работники освободятся, вернётся 30% вложенного: ${fmt(back)} мон. Участок станет пустым.`, 'Снести', () => {
    for (const c of S.owned) if (c.bld === id || c.bld === '@' + id) c.bld = null;
    delete S.est.b[id]; S.gold += back; syncCap(); addLog(`Снесено: ${B.n}. Возвращено ${fmt(back)} мон.`); toast('Снесено.'); save(); closeModal(true); render();
  });
}
function bldMoveCost(id) { return Math.max(100, Math.round((bOf(id).inv || 0) * 0.2 / 10) * 10); }
function bldMove(id, plot) {
  const b = bOf(id), cost = bldMoveCost(id);
  if (!freePlots().includes(plot)) return toast('Участок недоступен.');
  if (S.gold < cost) return toast(`Нужно ${fmt(cost)} мон.`);
  S.gold -= cost; b.plot = plot; b.closed = S.day; addLog(`${BT[b.t].n} перенесено в район «${DISTRICTS[PLOTS[plot].d].n}» за ${fmt(cost)} мон. Сегодня закрыто.`);
  toast('Перенесено. Сегодня здание закрыто на переезд.'); save(); closeModal(true); render();
}
function buyDistrict(d) {
  const D = DISTRICTS[d], E = estOf(); if (E.dist[d]) return;
  if (S.gold < D.cost) return toast(`Район стоит ${fmt(D.cost)} мон.`);
  confirmModal(`Купить район «${D.n}»?`, `${fmt(D.cost)} мон. Новые участки${D.ter ? `, бонус места: ${TER_N[D.ter]}` : ''}. Город растёт — безопасность чуть ниже.`, `Купить · ${fmt(D.cost)}`, () => {
    S.gold -= D.cost; E.dist[d] = true; sfx('coin'); addLog(`Куплен район «${D.n}».`); goalBump('build'); save(); closeModal(true); render();
  });
}
function buyMats(k, n) { const c = MAT_P[k] * n; if (S.gold < c) return toast('Не хватает монет.'); S.gold -= c; estOf().mat[k] += n; toast(`Куплено: ${MAT_N[k]} +${n}.`); save(); render(); }
function setPolicy(p) { estOf().pol = p; toast('Порядки «Шёлковой ленты»: ' + POLICY[p].n); save(); render(); const id = bList('brothel')[0]; if (id) bldModal(id[0]); }
function setMode(id, m) { bOf(id).mode = m; save(); render(); bldModal(id); }
function bldSelf(id) {
  const E = estOf(), b = bOf(id); if (E.self === S.day) return toast('Сегодня вы уже поработали сами — завтра снова.');
  if (!b.lv) return toast('Здание ещё строится.');
  const B = BT[b.t], v = Math.round(Math.max(30, B.base || 30) * (0.6 + b.lv * 0.25) * (E.dem[b.t] || 1) * (0.85 + R() * 0.3));
  E.self = S.day; S.gold += v; S.totalEarned += v;
  const L = { market: 'Вы сами встали за прилавок и зазывали покупателей.', quarry: 'Вы взяли кирку и помогли с тяжёлыми глыбами.', workshop: 'Вы выточили пару ложек и починили сундук.', farm: 'Вы пропололи грядки и проверили ульи.', tavern: 'Вы сами разливали сидр и травили байки.', baths: 'Вы растопили печи и разнесли полотенца.', library: 'Вы переписали главу старой хроники.', brothel: 'Вы весь вечер встречали гостей у дверей «Ленты» и следили, чтобы все вели себя прилично. Почти все.', guard: 'Вы обошли район с дозором и выслушали жалобы лавочников.', houses: 'Вы починили крыльцо и поболтали с соседями.', park: 'Вы посадили липу и покормили уток.', slavemkt: 'Вы сами вели торги с помоста — голос сорвали, зато сделки шли бойко.' };
  let extra = '';
  if (b.t === 'tavern' && R() < 0.35) { S.rep += 1; extra = ' Гости довольны: репутация +1.'; }
  if (b.t === 'baths') { for (const c of homeChars()) c.stress = clamp(c.stress - 5); extra = ' Домашним полегчало: стресс −5.'; }
  if (b.t === 'park' || b.t === 'houses') { E.mods.push({ k: 'happy', n: 'ваша забота', v: 4, until: S.day + 1 }); extra = ' Счастье +4 на два дня.'; }
  if (b.t === 'guard') { E.mods.push({ k: 'safe', n: 'ваш дозор', v: 6, until: S.day + 1 }); extra = ' Безопасность +6 на два дня.'; }
  addLog(`${L[b.t]} +${v} мон.`); goalBump('self');
  showModal('Поработать самому', `<p>${L[b.t]}</p><p class="report-total">+${fmt(v)} мон.${extra}</p><p class="small muted">Раз в день. Доход растёт с уровнем постройки и спросом.</p>`, [{ label: 'Хорошо', cls: 'btn-primary', act: () => { closeModal(); render(); } }]);
  save();
}
// ---------- Большой невольничий рынок: выкуп или стройка ----------
function mktBuy() {
  const E = estOf(); if (mktLv()) return;
  if (rankIdx() < MKT.rank) return toast(`Гильдия продаст рынок только купцу ранга ${RANKS[MKT.rank].key} и выше.`);
  if (S.gold < MKT.buy) return toast(`Нужно ${fmt(MKT.buy)} мон.`);
  confirmModal('Выкупить Большой рынок?', `Гильдия работорговцев уступит вам свой рынок на площади за ${fmt(MKT.buy)} мон. Старый рынок закроется — вместо него будет ваш.`, `Выкупить · ${fmt(MKT.buy)}`, () => {
    const prev = mktId(); if (prev) { for (const c of S.owned) if (c.bld === '@' + prev) c.bld = null; delete E.b[prev]; }
    S.gold -= MKT.buy; E.b.slavemkt = { t: 'slavemkt', lv: 1, plot: 'sq', job: null, inv: MKT.buy, stage: 3 };
    mktOpened('выкуплен у гильдии');
  });
}
function mktOpened(how) { sfx('coin'); addLog(`Большой невольничий рынок ваш (${how})! Старый рынок теперь работает под вашей вывеской.`); toast('Большой невольничий рынок открыт! Вкладка «Рынок» теперь ваша.'); S.market.push(...Array.from({ length: MKT.lots[1] }, () => makeCharacter())); save(); closeModal(true); render(); }
function mktStage(buyMissing) {
  const E = estOf(); let b = E.b.slavemkt;
  if (rankIdx() < 1) return toast('Нужен ранг гильдии E.');
  if (b && b.lv) return; if (b && b.job) return toast('Этап уже строится.');
  const si = b ? b.stage : 0, St = MKT.stages[si];
  const r = payBuild(St.g, { stone: St.stone, tools: St.tools }, buyMissing);
  if (r.err) { if (r.nm) return confirmModal('Докупить материалы?', `${r.err} Поставщик продаст недостающее за ${fmt(r.nm.short)} мон.`, `Докупить и строить · ${fmt(St.g + r.nm.short)}`, () => mktStage(true)); return toast(r.err); }
  if (!b) b = E.b.slavemkt = { t: 'slavemkt', lv: 0, plot: 'sq', stage: 0, inv: 0 };
  b.inv += r.paid; b.job = { to: 1, need: St.pts, done: 0, stage: si };
  addLog(`Большой рынок: начат этап «${St.n}». Работают только ваши люди-строители.`); toast(`Этап «${St.n}» начат. Назначьте строителей!`); save(); render(); bldModal('slavemkt');
}
function sqModal() {
  const E = estOf(), b = E.b.slavemkt, rk = rankIdx();
  const st = MKT.stages.map((s, i) => `<div class="mk-stage ${b && b.stage > i ? 'done' : b && b.stage === i && b.job ? 'cur' : ''}"><b>${i + 1}. ${s.n}</b> — ${fmt(s.g)} мон., ${matsTxt({ stone: s.stone, tools: s.tools })}, работа ${s.pts} ед.${b && b.stage === i && b.job ? ` · сделано ${Math.round(b.job.done)}/${b.job.need}` : ''}</div>`).join('');
  showModal('Центральная площадь', `<p class="small">Здесь может стоять <b>Большой невольничий рынок</b> — ваш собственный. Больше лотов и редкостей, скидка на покупку, меньше потери при продаже, загон для перепродажи и дни распродаж. Он заменит старый рынок.</p>
    <div class="panel-title small">Путь 1 — выкупить сразу</div><div class="small">${fmt(MKT.buy)} мон. ${rk < MKT.rank ? `· нужен ранг ${RANKS[MKT.rank].key}` : ''}</div>
    <div class="panel-title small" style="margin-top:8px">Путь 2 — построить силами своих людей</div>${st}
    <div class="small muted">Всего ≈ 12 000 мон. + камень и инструменты (с каменоломни и мастерской или у поставщика). Работают только строители из ваших людей: Сила, Выносливость и Мастерство ускоряют. Склад: камень ${E.mat.stone}, инструменты ${E.mat.tools}.</div>`, [
    ...(!b || !b.job ? [{ label: `Строить этап ${(b ? b.stage : 0) + 1}`, cls: 'btn-primary', act: () => mktStage() }] : [{ label: 'Стройка', cls: 'btn-primary', act: () => bldModal('slavemkt') }]),
    { label: `Выкупить · ${fmt(MKT.buy)}`, act: () => mktBuy() }, { label: 'Закрыть', act: 'close' }]);
}
// ---------- загон и дни распродаж ----------
function stableCap() { return MKT.stable[mktLv()] || 0; }
function stableBuyersLeft() { const E = estOf(), lv = mktLv(); if (E.sold.d !== S.day) E.sold = { d: S.day, n: 0 }; const extra = mktId() ? bldWorkers(mktId()).length : 0; return (MKT.buyers[lv] + extra) * (E.saleDay === S.day ? 3 : 1) - E.sold.n; }
function stableBuy(uid) {
  const E = estOf(), c = S.market.find(x => x.uid === uid); if (!c || !mktLv()) return;
  if (E.stable.length >= stableCap()) return toast(`Загон полон (${stableCap()}).`);
  const cost = price(c); if (S.gold < cost) return toast(`Нужно ${fmt(cost)} мон.`);
  S.gold -= cost; S.market = S.market.filter(x => x !== c); c.stockDay = S.day; c.boughtFor = cost; E.stable.push(c); supplyShock(c.race, 0.02);
  addLog(`В загон для перепродажи: ${c.name} за ${fmt(cost)} мон.`); toast(`${fn1(c)} — в загоне. Продать можно со следующего дня.`); sfx('buy'); save(); go('market');
}
function stablePrice(c) { return Math.round(sellPrice(c) * (estOf().saleDay === S.day ? 1.15 : 1)); }
function stableSell(uid) {
  const E = estOf(), c = E.stable.find(x => x.uid === uid); if (!c) return;
  if (c.stockDay >= S.day) return toast('Покупатели придут завтра — дайте человеку освоиться.');
  if (stableBuyersLeft() <= 0) return toast('Сегодня покупателей больше нет. Завтра будут — или устройте день распродажи.');
  const p = stablePrice(c); S.gold += p; S.totalEarned += p; E.sold.n++; E.stable = E.stable.filter(x => x !== c); supplyShock(c.race, -0.03);
  addLog(`Из загона продан${g(c, '', 'а')} ${c.name} за ${fmt(p)} мон. (куплено за ${fmt(c.boughtFor || 0)}).`); toast(`Продано: +${fmt(p)} мон.`); goalBump('stable'); sfx('sell'); save(); render();
}
function stableTake(uid) {
  const E = estOf(), c = E.stable.find(x => x.uid === uid); if (!c) return;
  if (S.owned.length >= S.capacity) return toast('В поместье нет мест.');
  E.stable = E.stable.filter(x => x !== c); c.status = 'home'; c.task = 'rest'; delete c.stockDay; S.owned.push(c); toast(`${fn1(c)} теперь живёт в поместье.`); save(); render();
}
function saleSchedule() {
  const E = estOf(); if (S.day - E.saleLast < 7) return toast(`Следующую распродажу можно объявить с ${E.saleLast + 7}-го дня.`);
  if (S.gold < 300) return toast('Глашатаи стоят 300 мон.');
  S.gold -= 300; E.saleDay = S.day + 2; E.saleLast = S.day; addLog(`Объявлен день большой распродажи — день ${E.saleDay}.`); toast(`Глашатаи разнесли весть: распродажа в день ${E.saleDay}!`); save(); render();
}

// ---------- рисунки: тёплый «рисованный» стиль, растут с уровнем ----------
const CINK = '#5a3a20';
function win(x, y, s) { return `<rect x="${x}" y="${y}" width="${s || 5}" height="${s || 5}" rx="1" fill="#f6d77a" stroke="${CINK}" stroke-width=".8"/>`; }
function house(w, h, roof, lv, opt) {
  opt = opt || {};
  let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="${opt.wall || '#efdfb8'}" stroke="${CINK}" stroke-width="1.4"/>`;
  s += `<path d="M${-w / 2 - 4} ${-h / 2 + 1} Q0 ${-h / 2 - 15 - lv * 1.5} ${w / 2 + 4} ${-h / 2 + 1}Z" fill="${roof}" stroke="${CINK}" stroke-width="1.4"/>`;
  s += `<path d="M${-w / 2} ${-h / 2 + 1} Q0 ${-h / 2 - 9 - lv} ${w / 2} ${-h / 2 + 1}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>`;
  s += `<rect x="-3" y="${h / 2 - 8}" width="6" height="8" rx="2.5" fill="#7a4a2a" stroke="${CINK}" stroke-width=".8"/>` + win(-w / 2 + 3, -h / 2 + 3) + win(w / 2 - 8, -h / 2 + 3);
  return s;
}
function bldArt(t, lv, building) {
  const B = BT[t], R0 = B.roof, L = Math.max(1, lv);
  let g = `<ellipse cx="0" cy="13" rx="${24 + L * 2}" ry="6" fill="#3a2a10" opacity=".14"/>`;
  if (!lv && building) return g + `<rect x="-18" y="-2" width="36" height="14" fill="#c9a874" stroke="${CINK}"/><path d="M-20 12 V-16 M20 12 V-16 M-20 -10 H20 M-20 2 H20 M-20 -16 L20 2 M20 -16 L-20 2" stroke="#7a5a32" stroke-width="2" fill="none"/><rect x="6" y="5" width="9" height="6" fill="#a8a090" stroke="${CINK}"/><path d="M-12 -18 l6 -6 l2 2" stroke="${CINK}" stroke-width="1.5" fill="none"/>`;
  if (t === 'quarry') return g + `<ellipse cx="0" cy="10" rx="${20 + L * 3}" ry="8" fill="#9a8f80"/><path d="M-18 8 L-10 -6 L-2 2 L6 -10 L18 8 Z" fill="#b7ad9c" stroke="#5e564a" stroke-width="1.5"/>${L >= 2 ? '<rect x="8" y="2" width="9" height="6" fill="#8a6a42" stroke="#4a3520"/>' : ''}${L >= 3 ? '<path d="M-24 8 L-17 -3 L-10 8Z" fill="#a39886" stroke="#5e564a"/>' : ''}${L >= 4 ? '<path d="M14 -10 L22 -20 L28 -16" stroke="#4a3520" stroke-width="2" fill="none"/><path d="M28 -16 v8" stroke="#4a3520"/>' : ''}${L >= 5 ? '<circle cx="-6" cy="-2" r="2.5" fill="#f0c255"/><circle cx="3" cy="-1" r="1.8" fill="#f0c255"/>' : ''}`;
  if (t === 'farm') return g + `<rect x="-26" y="0" width="34" height="14" rx="2" fill="#7f9a4a"/>${[0, 1, 2, 3].map(i => `<path d="M-24 ${2 + i * 3.2} H6" stroke="#5c7a32" stroke-width="1.6"/>`).join('')}<rect x="9" y="-6" width="15" height="15" fill="#e8d6a8" stroke="${CINK}" stroke-width="1.4"/><path d="M7 -6 L16.5 -16 L26 -6Z" fill="${R0}" stroke="${CINK}"/>${L >= 2 ? '<rect x="-32" y="2" width="5" height="8" rx="2" fill="#e0b84a" stroke="#7a5a1a"/>' : ''}${L >= 3 ? '<circle cx="-14" cy="-5" r="5" fill="#5c8a3a"/><rect x="-15" y="-1" width="2" height="4" fill="#6b4a2a"/><circle cx="-16" cy="-6" r="1.2" fill="#d94a3a"/>' : ''}${L >= 4 ? '<rect x="-32" y="-7" width="5" height="7" rx="2" fill="#e0b84a" stroke="#7a5a1a"/>' : ''}${L >= 5 ? '<path d="M16.5 -16 V-24 L22 -22 L16.5 -20" fill="#f0c255" stroke="' + CINK + '"/>' : ''}`;
  if (t === 'park') return g + `<ellipse cx="0" cy="6" rx="${18 + L * 3}" ry="${8 + L}" fill="#8fbf5a" stroke="#5c8a3a"/><path d="M-20 8 Q0 0 20 8" stroke="#e3cf98" stroke-width="3" fill="none"/>${[[-14, -2], [14, -4], [0, -8], [-22, 4], [22, 2]].slice(0, 1 + L).map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-1.2" y="0" width="2.4" height="7" fill="#6b4a2a"/><circle r="6" fill="#5c8a3a"/><circle cx="-2" cy="-2" r="3.2" fill="#78a84e"/></g>`).join('')}${L >= 3 ? '<ellipse cx="0" cy="8" rx="6" ry="2.6" fill="#7fb3c9" stroke="#3e7a8a"/><path d="M0 6 v-6" stroke="#bfe3f0" stroke-width="1.5"/>' : ''}`;
  if (t === 'houses') return g + [[-12, 2], [12, 2], [0, -8]].slice(0, Math.min(3, L)).map(([x, y], i) => `<g transform="translate(${x} ${y}) scale(.62)">${house(26, 18, i % 2 ? '#c46a3a' : R0, 1)}</g>`).join('') + (L >= 4 ? '<path d="M-24 12 h48" stroke="#a87a4a" stroke-width="2" stroke-dasharray="3 2"/>' : '') + (L >= 5 ? '<circle cx="0" cy="-22" r="2" fill="#f6d77a"/>' : '');
  if (t === 'library') { const h = 22 + L * 3; return g + `<rect x="-8" y="${-h}" width="16" height="${h + 12}" fill="#e3d4b0" stroke="${CINK}" stroke-width="1.4"/><path d="M-11 ${-h} L0 ${-h - 14 - L * 2} L11 ${-h}Z" fill="${R0}" stroke="#2e2a4a" stroke-width="1.4"/>${win(-3, -h + 6, 6)}${L >= 2 ? win(-3, -h + 18, 6) : ''}<rect x="-3" y="4" width="6" height="8" rx="3" fill="#7a4a2a"/>${L >= 3 ? `<rect x="8" y="-6" width="14" height="18" fill="#e3d4b0" stroke="${CINK}"/><path d="M6 -6 L15 -14 L24 -6Z" fill="${R0}" stroke="${CINK}"/>` : ''}${L >= 4 ? `<path d="M0 ${-h - 14 - L * 2} v-10 l7 3 l-7 3" fill="#c0392b" stroke="${CINK}"/>` : ''}${L >= 5 ? `<circle cx="0" cy="${-h + 2}" r="9" fill="none" stroke="#f0c255" stroke-dasharray="2 2"/>` : ''}`; }
  if (t === 'guard') return g + `<rect x="-14" y="-10" width="28" height="22" fill="#cfc4ac" stroke="${CINK}" stroke-width="1.4"/>${[-14, -7, 0, 7].map(x => `<rect x="${x}" y="-14" width="5" height="5" fill="#cfc4ac" stroke="${CINK}"/>`).join('')}<rect x="-3" y="4" width="6" height="8" rx="3" fill="#5a4030"/>${L >= 2 ? `<rect x="10" y="-26" width="10" height="38" fill="#bfb49c" stroke="${CINK}"/><path d="M8 -26 L15 -34 L22 -26Z" fill="${R0}" stroke="${CINK}"/>` : ''}${L >= 3 ? `<path d="M15 -34 v-8 l7 2.5 l-7 2.5" fill="#2e5a8a" stroke="${CINK}"/>` : ''}${L >= 4 ? '<circle cx="-8" cy="0" r="2" fill="#f6d77a"/><circle cx="6" cy="0" r="2" fill="#f6d77a"/>' : ''}${L >= 5 ? `<rect x="-26" y="-4" width="10" height="16" fill="#bfb49c" stroke="${CINK}"/>` : ''}`;
  if (t === 'brothel') {
    const w = 30 + (L >= 3 ? 8 : 0), h = 20 + (L >= 3 ? 6 : 0);
    let s = g + house(w, h, R0, L, { wall: '#f3dcd0' });
    s += `<path d="M${-w / 2} ${-h / 2 + 10} Q${-w / 4} ${-h / 2 + 15} 0 ${-h / 2 + 10} Q${w / 4} ${-h / 2 + 15} ${w / 2} ${-h / 2 + 10}" stroke="#d94a7a" stroke-width="1.6" fill="none"/>`;
    s += `<circle cx="${-w / 2 - 3}" cy="0" r="3" fill="#e85a6a" stroke="${CINK}" stroke-width=".8"/><circle cx="${w / 2 + 3}" cy="0" r="3" fill="#e85a6a" stroke="${CINK}" stroke-width=".8"/>`;
    if (L >= 2) s += `<path d="M-6 ${-h / 2 - 13 - L} q6 -6 12 0 q-6 5 -12 0" fill="#f0a0c0" stroke="${CINK}" stroke-width=".8"/>`;
    if (L >= 4) s += `<rect x="${w / 2 + 2}" y="${-h / 2 - 2}" width="12" height="${h + 2}" fill="#f3dcd0" stroke="${CINK}"/><path d="M${w / 2} ${-h / 2 - 2} L${w / 2 + 8} ${-h / 2 - 12} L${w / 2 + 16} ${-h / 2 - 2}Z" fill="${R0}" stroke="${CINK}"/>` + win(w / 2 + 5, -h / 2 + 3, 5);
    if (L >= 5) s += `<path d="M${-w / 2 - 4} ${-h / 2 + 1} Q0 ${-h / 2 - 15 - L * 1.5} ${w / 2 + 4} ${-h / 2 + 1}" fill="none" stroke="#f0c255" stroke-width="2"/>`;
    return s;
  }
  if (t === 'slavemkt') {
    let s = `<ellipse cx="0" cy="18" rx="62" ry="12" fill="#3a2a10" opacity=".14"/><rect x="-56" y="-2" width="112" height="22" rx="3" fill="#d8c08a" stroke="${CINK}" stroke-width="1.4"/>`;
    s += `<rect x="-14" y="-12" width="28" height="12" fill="#a87a4a" stroke="${CINK}"/><path d="M-16 -12 h32" stroke="${CINK}" stroke-width="2"/>`;
    s += [-44, -28, 28, 44].map(x => `<path d="M${x - 7} 4 L${x} -6 L${x + 7} 4Z" fill="${['#c0392b', '#e9c46a', '#3e7a8a', '#7a3a2a'][(x + 44) % 4]}" stroke="${CINK}" stroke-width=".8"/><path d="M${x} 4 v10" stroke="${CINK}"/>`).join('');
    if (L >= 2) s += `<rect x="-52" y="-24" width="30" height="20" fill="#efdfb8" stroke="${CINK}" stroke-width="1.3"/><path d="M-55 -24 L-37 -36 L-19 -24Z" fill="${R0}" stroke="${CINK}"/>${win(-46, -19)}${win(-34, -19)}`;
    if (L >= 2) s += `<rect x="22" y="-24" width="30" height="20" fill="#efdfb8" stroke="${CINK}" stroke-width="1.3"/><path d="M19 -24 L37 -36 L55 -24Z" fill="${R0}" stroke="${CINK}"/>${win(28, -19)}${win(40, -19)}`;
    if (L >= 3) s += `<rect x="-10" y="-40" width="20" height="28" fill="#e3d4b0" stroke="${CINK}"/><path d="M-13 -40 L0 -54 L13 -40Z" fill="#c0392b" stroke="${CINK}"/><circle cx="0" cy="-30" r="4" fill="#fff8e6" stroke="${CINK}"/><path d="M0 -30 v-3 M0 -30 h2" stroke="${CINK}"/><path d="M0 -54 v-8 l8 3 l-8 3" fill="#f0c255" stroke="${CINK}"/>`;
    return s + `<text x="0" y="16" font-size="7" text-anchor="middle" fill="${CINK}" font-weight="700">БОЛЬШОЙ РЫНОК</text>`;
  }
  const w = 26 + (L >= 3 ? 8 : 0), h = 17 + (L >= 3 ? 7 : 0);
  let s = g + house(w, h, R0, L);
  if (t === 'market') s += `<path d="M${-w / 2 - 12} 2 h12 v-6 h-12z" fill="#e9c46a" stroke="${CINK}" stroke-width=".6"/>${[0, 1, 2].map(i => `<rect x="${-w / 2 - 12 + i * 4}" y="-4" width="2" height="6" fill="#b5523a"/>`).join('')}<circle cx="${-w / 2 - 6}" cy="6" r="2.5" fill="#d94a3a"/><circle cx="${-w / 2 - 2}" cy="7" r="2.5" fill="#e0b84a"/>`;
  if (t === 'tavern') s += `<rect x="${w / 2 + 1}" y="-5" width="8" height="7" rx="1" fill="#d8a84a" stroke="${CINK}"/><path d="M${w / 2 + 3} -5 v-3 h4" stroke="${CINK}" fill="none"/>`;
  if (t === 'baths') s += `<path d="M-6 ${-h / 2 - 16 - L} q3 -4 0 -8 M0 ${-h / 2 - 17 - L} q3 -4 0 -8 M6 ${-h / 2 - 16 - L} q3 -4 0 -8" stroke="#fff" stroke-width="1.5" fill="none" opacity=".9"/><ellipse cx="${w / 2 + 8}" cy="8" rx="7" ry="3" fill="#7fb3c9" stroke="#3e7a8a"/>`;
  if (t === 'workshop') s += `<rect x="${w / 2 - 7}" y="${-h / 2 - 18 - L}" width="4" height="10" fill="#6b5a4a"/><circle cx="${w / 2 - 5}" cy="${-h / 2 - 22 - L}" r="3" fill="#ccc" opacity=".7"/><circle cx="${-w / 2 - 6}" cy="6" r="4" fill="none" stroke="${CINK}" stroke-width="1.5"/>`;
  if (L >= 2) s += `<rect x="${-w / 2 + 2}" y="${-h / 2 - 11 - L}" width="4" height="7" fill="#8a6a4a"/>`;
  if (L >= 4) s += `<path d="M${w / 2 + 4} ${-h / 2} v-14 l8 3 l-8 3" fill="#c0392b" stroke="${CINK}"/>`;
  if (L >= 5) s += `<path d="M${-w / 2 - 4} ${-h / 2 + 1} Q0 ${-h / 2 - 15 - L * 1.5} ${w / 2 + 4} ${-h / 2 + 1}" fill="none" stroke="#f0c255" stroke-width="2"/>`;
  return s;
}
function bldNode(id, b) {
  const P = PLOTS[b.plot], sc = b.t === 'slavemkt' ? 0.95 : 0.78 + Math.min(b.lv, 5) * 0.05;
  const scaf = b.job && b.lv ? `<g opacity=".85"><path d="M-26 12 V-22 M26 12 V-22 M-26 -14 H26" stroke="#7a5a32" stroke-width="1.6"/></g>` : '';
  const prog = b.job ? `<rect x="-22" y="17" width="44" height="5" rx="2.5" fill="#fff8e6" stroke="${CINK}" stroke-width=".6"/><rect x="-22" y="17" width="${44 * Math.min(1, b.job.done / b.job.need)}" height="5" rx="2.5" fill="#e0a83a"/>` : '';
  const closed = b.closed === S.day ? '<text y="-26" font-size="10" text-anchor="middle">🔒</text>' : '';
  return `<g class="bld" data-cid="${id}" transform="translate(${P.x} ${P.y}) scale(${sc})">${bldArt(b.t, b.lv, !!b.job)}${scaf}${prog}${closed}<rect x="-32" y="-36" width="64" height="58" fill="transparent"/></g>`;
}
function bldTag(id, b) {
  const P = PLOTS[b.plot], nm = (BT[b.t].short || BT[b.t].n).replace('Дом утех ', ''), txt = `${nm}${b.lv ? ' · ' + b.lv : ''}${b.job ? ' ⚒' : ''}`, w = Math.max(44, txt.length * 5.1 + 10);
  const y = P.y + (b.t === 'slavemkt' ? 30 : 22);
  return `<g class="bld-lab" data-cid="${id}"><rect x="${P.x - w / 2}" y="${y}" width="${w}" height="13" rx="6.5" fill="#fff8e6" opacity=".92" stroke="#8a6438" stroke-width=".8"/><text x="${P.x}" y="${y + 9.5}" text-anchor="middle" font-size="8.4" fill="#3b2616">${esc(txt)}</text></g>`;
}
function mapSvg() {
  const E = estOf(), used = new Set(Object.values(E.b).map(b => b.plot));
  const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><rect x="-1.6" y="2" width="3.2" height="7" fill="#6b4a2a"/><circle r="8" fill="#5c8a3a"/><circle cx="-3" cy="-3" r="4.4" fill="#78a84e"/></g>`;
  let s = `<svg viewBox="0 0 360 620" class="est-svg city-svg"><defs><radialGradient id="cg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#d4e09a"/><stop offset="1" stop-color="#93b262"/></radialGradient><pattern id="fog" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="#e8dcc0"/><path d="M0 0 V8" stroke="#cbb88e" stroke-width="3"/></pattern></defs>`;
  s += `<rect width="360" height="620" rx="14" fill="url(#cg)"/>`;
  s += `<path d="M184 8 Q300 30 352 90 V176 H184Z" fill="#b8a888" opacity=".55"/><path d="M200 120 l20 -30 l18 22 l14 -16 l20 26" fill="none" stroke="#8a7a62" stroke-width="2" opacity=".7"/>`;
  s += `<path d="M-10 520 C80 470 140 560 220 520 S320 470 370 500 L370 630 L-10 630Z" fill="#7fb3c9" opacity=".9"/><path d="M20 560 q20 -6 40 0 M140 585 q20 -6 40 0 M260 560 q20 -6 40 0" stroke="#e8f4f8" stroke-width="1.5" fill="none" opacity=".8"/>`;
  s += `<path d="M180 0 V620 M0 300 H360" stroke="#d9c08a" stroke-width="12" fill="none" stroke-linecap="round" opacity=".9"/><path d="M90 176 H270 M90 412 H270" stroke="#d9c08a" stroke-width="7" opacity=".8"/>`;
  s += `<ellipse cx="180" cy="300" rx="70" ry="42" fill="#e3cf98" stroke="#b89a62" stroke-width="2"/>`;
  s += [[30, 196], [330, 196], [20, 420], [340, 420], [176, 170], [92, 300], [268, 300], [176, 430]].map(([x, y]) => tree(x, y, 0.8)).join('');
  s += `<text x="70" y="608" font-size="10" fill="#2e4a5a" font-style="italic">речка Медовка</text>`;
  for (const [k, D] of Object.entries(DISTRICTS)) {
    if (k === 'center') continue;
    const rs = [D.r, D.r2].filter(Boolean);
    if (!E.dist[k]) s += rs.map(r => `<g class="dist-lock" data-cdist="${k}"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="10" fill="url(#fog)" opacity=".88" stroke="#8a6438" stroke-dasharray="5 4"/></g>`).join('') + (() => { const r = rs[0], cx = k === 'gardens' ? 180 : r[0] + r[2] / 2, cy = k === 'gardens' ? 448 : r[1] + r[3] / 2; return k === 'gardens' ? rs.map(r2 => `<g data-cdist="${k}"><text x="${r2[0] + r2[2] / 2}" y="${r2[1] + r2[3] / 2 - 4}" text-anchor="middle" font-size="9" fill="#5a3a20" font-weight="700">Сады</text><text x="${r2[0] + r2[2] / 2}" y="${r2[1] + r2[3] / 2 + 9}" text-anchor="middle" font-size="8.5" fill="#5a3a20">🔒 ${fmt(D.cost)}</text></g>`).join('') : `<g data-cdist="${k}"><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="11" fill="#5a3a20" font-weight="700">${D.n}</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#5a3a20">🔒 купить · ${fmt(D.cost)}</text></g>`; })();
    else s += rs.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="10" fill="none" stroke="#fff8e6" stroke-opacity=".55" stroke-dasharray="3 5"/>`).join('');
  }
  for (const [p, P] of Object.entries(PLOTS)) {
    if (used.has(p) || !E.dist[P.d]) continue;
    if (P.big) s += `<g class="plot" data-csq="1"><ellipse cx="180" cy="300" rx="78" ry="34" fill="#000" fill-opacity="0"/><text x="180" y="296" text-anchor="middle" font-size="9.5" fill="#6b4a2a" font-weight="700">Центральная площадь</text><text x="180" y="310" text-anchor="middle" font-size="8.5" fill="#6b4a2a">${mktLv() ? '' : 'место для Большого рынка'}</text></g>`;
    else s += `<g class="plot" data-cplot="${p}" transform="translate(${P.x} ${P.y})"><ellipse rx="24" ry="13" fill="#fff8e6" opacity=".45" stroke="#8a6438" stroke-dasharray="4 3"/><text y="4" text-anchor="middle" font-size="13" fill="#8a6438">+</text></g>`;
  }
  const items = Object.entries(E.b).sort((a, b) => PLOTS[a[1].plot].y - PLOTS[b[1].plot].y);
  s += items.map(([id, b]) => bldNode(id, b)).join('') + items.map(([id, b]) => bldTag(id, b)).join('');
  return s + '</svg>';
}

// ---------- экраны ----------
const STAT_N = { prest: 'Репутация района', happy: 'Счастье', safe: 'Безопасность' };
function statChip(k, v) { return `<button class="cstat ${v >= 65 ? 'good' : v <= 35 ? 'bad' : ''}" data-cwhy="${k}"><span>${STAT_N[k]}</span><b>${v}</b></button>`; }
function evBanner() { const E = estOf(); if (!E.ev) return ''; const D = CEV[E.ev.k]; return `<button class="ev-banner" data-cev="1">⚑ <b>${esc(D.t(E.ev))}</b><span>Решите до конца дня — иначе «${esc(D.o[D.def][0])}».</span></button>`; }
function viewEstate() {
  const E = estOf(), st = cityStats(), core = st;
  const blds = Object.entries(E.b), free = homeChars().filter(c => !c.bld).length, jobs = blds.filter(([, b]) => b.job);
  const ent = blds.filter(([, b]) => b.lv).map(([id, b]) => { const P = bldPreview(id, core); return `<button class="est-row" data-cid="${id}"><b>${esc(BT[b.t].short || BT[b.t].n)} · ${b.lv}</b><span>${BT[b.t].noWork ? 'без работников' : `${bldWorkers(id).length}/${bldSlots(id)} раб.`}${b.job ? ' · ⚒ ' + Math.round(100 * b.job.done / b.job.need) + '%' : ''}</span><span class="${P ? 'pos' : 'muted'}">${b.mode === 'store' && BT[b.t].store ? `+${matFrom(b.t, P)} ${MAT_N[BT[b.t].store]}` : P ? '+' + fmt(P) : '—'} <span class="muted">/ −${bldUpkeepB(b)}</span></span></button>`; }).join('');
  const bj = jobs.map(([id, b]) => { const bs = bldBuilders(id), per = 12 * (b.t === 'slavemkt' ? 0 : 1) + bs.reduce((a, c) => a + builderPts(c), 0), left = Math.max(0, b.job.need - b.job.done); return `<button class="est-row" data-cid="${id}"><b>⚒ ${esc(BT[b.t].short || BT[b.t].n)} → ${b.job.stage != null ? 'этап ' + (b.job.stage + 1) : 'ур. ' + b.job.to}</b><span>строителей: ${bs.length}</span><span>${per ? `≈ ${Math.ceil(left / per)} дн.` : 'стоит — нужны строители'}</span></button>`; }).join('');
  return `<div class="screen-head"><h1>Владения</h1><div class="sub">Ваш городок у Медового Лога: районы, стройки, жители. Нажмите на участок или здание.</div></div>
  ${evBanner()}
  <div class="cstats">${statChip('prest', core.prest)}${statChip('happy', core.happy)}${statChip('safe', core.safe)}</div>
  <div class="est-map parchment">${mapSvg()}</div>
  <div class="panel parchment city-sum"><div class="panel-title">Обзор города <button class="chip" data-chelp="1">?</button></div>
    <div class="csum-grid">
      <div><span>Доход/день</span><b class="pos">+${fmt(st.inc)}</b></div><div><span>Содержание</span><b class="neg">−${fmt(st.upk)}</b></div>
      <div><span>Чистыми</span><b class="${st.net >= 0 ? 'pos' : 'neg'}">${st.net >= 0 ? '+' : ''}${fmt(st.net)}</b></div><div><span>Свободных рук</span><b>${free}</b></div>
      <div><span>Камень</span><b>${E.mat.stone}${st.mat.stone ? ` <small>+${st.mat.stone}</small>` : ''}</b></div><div><span>Инструменты</span><b>${E.mat.tools}${st.mat.tools ? ` <small>+${st.mat.tools}</small>` : ''}</b></div>
    </div>
    <button class="btn small" data-cwhy="net">Почему так?</button>
    <div class="ctoggles"><label><input type="checkbox" data-cauto="auto" ${E.auto ? 'checked' : ''}> Авто-управление (ставить работников и строителей, давать отдых)</label>
    ${bList('brothel').length ? `<label><input type="checkbox" data-cauto="autoB" ${E.autoB ? 'checked' : ''}> включая «Шёлковую ленту» (только согласных, лояльность 35+)</label>` : ''}</div>
    ${bj ? `<div class="panel-title small">Стройки</div><div class="est-list">${bj}</div>` : ''}
    <div class="panel-title small">Здания</div><div class="est-list">${ent || '<div class="small muted">Пока ничего не построено — нажмите «+» на карте.</div>'}</div>
    <div class="btn-row"><button class="btn btn-primary small" data-cbuild="1">Построить…</button><button class="btn small" data-cmats="1">Материалы</button>${!mktLv() ? '<button class="btn small" data-csq="1">Большой рынок</button>' : ''}</div>
    ${E.last ? `<div class="small muted">Вчера: город +${fmt(E.last.inc)}, содержание −${fmt(E.last.upk)}${E.last.tax ? `, сбор −${fmt(E.last.tax)}` : ''}.</div>` : ''}
    <div class="small muted">Работники и строители весь день заняты там — обычных дел у них нет. Спрос меняется каждый день.</div></div>`;
}
function whyModal(k) {
  const st = cityStats();
  if (k === 'net') {
    const E = estOf(), rows = bList().map(([id, b]) => { const v = bldPreview(id, st), store = b.mode === 'store' && BT[b.t].store; return `<tr><td>${esc(BT[b.t].short || BT[b.t].n)} ${b.lv || '⚒'}</td><td class="pos">${store ? `+${matFrom(b.t, v)} ${MAT_N[BT[b.t].store]}` : v ? '+' + v : '—'}</td><td class="neg">−${bldUpkeepB(b)}</td></tr>`; }).join('');
    return showModal('Почему так: деньги города', `<table class="why-t"><tr><th>Здание</th><th>Доход</th><th>Содерж.</th></tr>${rows}${E.stable.length ? `<tr><td>Загон (${E.stable.length})</td><td></td><td class="neg">−${8 * E.stable.length}</td></tr>` : ''}<tr><td><b>Итого</b></td><td class="pos"><b>+${fmt(st.inc)}</b></td><td class="neg"><b>−${fmt(st.upk)}</b></td></tr></table>
      <p class="small">Доход работника = база здания × навыки × уровень × черты × соседство × счастье (${st.happy}) × репутация района (${st.prest}) × спрос. Подробно — в карточке здания.</p><p class="small muted">Раз в неделю гильдия берёт сбор: 4% с запаса сверх 1500 + 12 за уровень построек${bList('brothel').length ? ' + 40 за уровень «Ленты»' : ''}${mktLv() ? ' + 60 за уровень Большого рынка' : ''}.</p>`);
  }
  const fx = { prest: `Влияет на доход всех зданий: ×${(0.9 + 0.2 * st.prest / 100).toFixed(2)}. От 70 — раз в неделю +1 к репутации гильдии, до 20 — −1.`, happy: `Влияет на выработку: ×${(0.85 + 0.3 * st.happy / 100).toFixed(2)}, и каждый день меняет стресс жителей на ${-Math.round((st.happy - 50) / 10)}.`, safe: `Чем ниже, тем чаще пожары и кражи. Сейчас риск: ${st.safe >= 70 ? 'низкий' : st.safe >= 45 ? 'средний' : 'высокий'}.` }[k];
  showModal('Почему так: ' + STAT_N[k], `<div class="big-num">${st[k]}</div><table class="why-t">${st.why[k].map(([n, v]) => `<tr><td>${esc(n)}</td><td class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v}</td></tr>`).join('')}</table><p class="small">${fx}</p>`);
}
function plotModal(p) {
  const P = PLOTS[p], D = DISTRICTS[P.d], E = estOf();
  const cats = {};
  for (const [t, B] of Object.entries(BT)) { if (t === 'slavemkt') continue; (cats[B.cat] = cats[B.cat] || []).push(t); }
  const near = neighbors(p).map(([, b]) => BT[b.t].short || BT[b.t].n);
  const body = Object.entries(cats).map(([c, ts]) => `<div class="panel-title small">${CATS[c]}</div>${ts.map(t => { const B = BT[t], why = canBuild(t, p), a = adjInfo(t, p), cost = bldCost(t, 1); return `<button class="bmenu ${why || S.gold < cost ? 'off' : ''}" data-cbt="${t}" data-p="${p}"><b>${esc(B.n)}</b><span>${fmt(cost)} мон. · ${bldDays(t, 1)} дн.${a.m !== 1 ? ` · <i class="${a.m > 1 ? 'pos' : 'neg'}">здесь ×${a.m.toFixed(2)}</i>` : ''}</span><small>${why ? '⚠ ' + why : esc(B.d)}</small></button>`; }).join('')}`).join('');
  showModal(`Участок · ${D.n}`, `<p class="small">${D.ter ? `Место: <b>${TER_N[D.ter]}</b> — подходящим зданиям бонус. ` : ''}Соседи: ${near.length ? near.join(', ') : 'никого'}. Срок стройки сокращают ваши люди-строители.</p>${body}`, [{ label: 'Закрыть', act: 'close' }]);
}
function buildMenu() { const fp = freePlots(); if (!fp.length) return showModal('Нет свободных участков', '<p>Купите новый район на карте (затуманенные области) или снесите что-нибудь.</p>'); plotModal(fp[0]); }
function matsModal() {
  const E = estOf();
  showModal('Материалы', `<p class="small">Камень и инструменты нужны для улучшений с 3-го уровня и для Большого рынка. Каменоломню и мастерскую можно переключить с продажи на склад.</p><div class="csum-grid"><div><span>Камень</span><b>${E.mat.stone}</b></div><div><span>Инструменты</span><b>${E.mat.tools}</b></div></div><p class="small">Поставщик: камень ${MAT_P.stone} мон., инструменты ${MAT_P.tools} мон. за единицу.</p>`,
    [{ label: `Камень +10 · ${MAT_P.stone * 10}`, act: () => { buyMats('stone', 10); matsModal(); } }, { label: `Инстр. +10 · ${MAT_P.tools * 10}`, act: () => { buyMats('tools', 10); matsModal(); } }, { label: 'Закрыть', act: 'close' }]);
}
function bldModal(id) {
  id = String(id || '').replace(/^@/, ''); const E = estOf(), b = E.b[id]; if (!b) return;
  if (b.t === 'slavemkt' && !b.lv && !b.job) return sqModal();
  const B = BT[b.t], lv = b.lv, ws = bldWorkers(id), bs = bldBuilders(id), core = cityCore(), maxLv = B.maxLv || 5, slots = bldSlots(id);
  const freeC = homeChars().filter(c => !c.bld);
  const cand = B.noWork || !lv ? [] : freeC.map(c => ({ c, o: bldWorkerOut(c, id, core) })).sort((a, b2) => b2.o.v - a.o.v);
  const a = adjInfo(b.t, b.plot);
  let h = `<div class="bld-pic"><svg viewBox="${b.t === 'slavemkt' ? '-66 -66 132 92' : '-40 -52 80 76'}" width="200" height="${b.t === 'slavemkt' ? 140 : 180}">${bldArt(b.t, lv, !!b.job)}</svg></div><p class="small">${esc(B.d)}</p>`;
  if (!B.noWork) h += `<div class="small">Нужны: <b>${B.st.map(statName).join(' и ')}</b> (требование ${12 + Math.max(1, lv) * 6}) · бонус черт: <b>${B.tr.map(t => TRAITS[t].name).join(', ')}</b> (+25%)</div>`;
  h += `<div class="small">Спрос: ${Math.round(E.dem[b.t] * 100)}% · содержание ${bldUpkeepB(b)} мон./день · место: ${DISTRICTS[PLOTS[b.plot].d].n}${a.why.length ? ' · ' + a.why.map(w => `${w[0]} ×${w[1].toFixed(2)}`).join(', ') : ''}</div>`;
  if (b.job) {
    const per = (b.t === 'slavemkt' ? 0 : 12) + bs.reduce((x, c) => x + builderPts(c), 0), left = Math.max(0, b.job.need - b.job.done);
    h += `<div class="panel-title small" style="margin-top:8px">⚒ Стройка: ${b.job.stage != null ? 'этап «' + MKT.stages[b.job.stage].n + '»' : 'уровень ' + b.job.to}</div><div class="pbar"><i style="width:${Math.round(100 * b.job.done / b.job.need)}%"></i></div>
      <div class="small">${Math.round(b.job.done)}/${b.job.need} ед. · ${b.t === 'slavemkt' ? 'наёмной артели нет — строят только ваши люди' : 'артель даёт 12 ед./день'} · в день ≈ ${per} ед. → ${per ? `осталось ≈ ${Math.ceil(left / per)} дн.` : '<b>без строителей стройка стоит</b>'}</div>
      ${bs.map(c => `<div class="bw-row"><b>${esc(fn1(c))}</b> +${builderPts(c)} ед./день <button class="btn small" data-bldun="${c.uid}">Снять</button><div class="why small muted">2 + (Сила ${eff(c, 'str')} + Выносл. ${eff(c, 'end')})/8 + Мастерство ${eff(c, 'mas')}/12${has(c, 'diligent') ? ' + трудолюбие 3' : ''}${has(c, 'lazy') ? ' − лень 2' : ''}</div></div>`).join('')}
      ${freeC.length ? `<div class="small" style="margin-top:4px">На стройку (сильные сверху):</div>${freeC.filter(c => !c.preg).sort((x, y) => builderPts(y) - builderPts(x)).slice(0, 6).map(c => `<button class="chip bw-cand" data-cbo="${c.uid}" data-id="${id}">${esc(fn1(c))} · +${builderPts(c)}</button>`).join(' ')}` : ''}`;
  }
  if (b.t === 'houses') h += `<div class="small">Даёт <b>+${2 * lv}</b> мест в поместье и +${4 * lv} к счастью.</div>`;
  if (b.t === 'park') h += `<div class="small">+${4 * lv} к счастью, +${5 * lv} к репутации района.</div>`;
  if (b.t === 'farm') h += `<div class="small">Еда в поместье дешевле на ${Math.min(45, 6 * lvSum('farm'))}% (все огороды вместе).</div>`;
  if (B.store) h += `<div class="small">Режим: <button class="chip ${b.mode !== 'store' ? 'on' : ''}" data-cmode="sell" data-id="${id}">продавать</button> <button class="chip ${b.mode === 'store' ? 'on' : ''}" data-cmode="store" data-id="${id}">на склад (${MAT_N[B.store]})</button></div>`;
  if (b.t === 'brothel') h += brothelPanel(id);
  if (b.t === 'slavemkt' && lv) h += `<div class="small">Уровень ${lv}: +${MKT.lots[lv]} лотов, скидка ${Math.round(MKT.disc[lv] * 100)}%, продажа +${Math.round(MKT.sell[lv] * 100)}%, загон ${stableCap()}, покупателей в день ${MKT.buyers[lv]} + работники, редкости +${Math.round(MKT.rare[lv] * 100)}%${lv >= 2 ? ', бесплатное обновление раз в день' : ''}. Комиссия аукциона ${Math.round(aucFee() * 100)}%.</div>`;
  if (lv && !B.noWork) {
    h += `<div class="panel-title small" style="margin-top:8px">Работники ${ws.length}/${slots}</div>
    ${ws.map(c => { const o = bldWorkerOut(c, id, core); return `<div class="bw-row"><b>${esc(fn1(c))}</b> +${o.v}${b.t === 'brothel' ? ` <span class="small muted">стресс ${Math.round(c.stress)} · лоял. ${Math.round(c.loyalty)}</span>` : ''} <button class="btn small" data-bldun="${c.uid}">Снять</button><div class="why small muted">Почему так: ${B.base} × ${o.why.map(w => `${esc(w[0])} ×${w[1].toFixed(2)}`).join(' · ')}</div></div>`; }).join('') || '<div class="small muted">Пока никого.</div>'}
    ${ws.length < slots && cand.length ? `<div class="small" style="margin-top:6px">Поставить (лучшие сверху):</div>${cand.slice(0, 6).map(({ c, o }) => `<button class="chip bw-cand ${b.t === 'brothel' && (c.loyalty < 35 || c.preg) ? 'off' : ''}" data-bldto="${c.uid}" data-k="${id}">${esc(fn1(c))} · +${o.v}${o.sv < o.req ? ' ⚠' : ''}${b.t === 'brothel' && c.loyalty < 35 ? ' ✋' : ''}</button>`).join(' ')}` : ''}`;
  }
  const btns = [];
  if (lv && !b.job && lv < maxLv) { const nx = lv + 1, gc = b.t === 'slavemkt' ? MKT.up[nx].g : bldCost(b.t, nx), m = bldMats(b.t, nx); btns.push({ label: `Улучшить → ${nx} · ${fmt(gc)}${matsTxt(m) ? ' + ' + matsTxt(m) : ''}`, cls: 'btn-primary', act: () => bldUpgrade(id) }); }
  if (b.t === 'slavemkt' && !lv && !b.job) btns.push({ label: 'Следующий этап', cls: 'btn-primary', act: () => sqModal() });
  if (lv && b.t !== 'houses' && b.t !== 'park') btns.push({ label: E.self === S.day ? 'Сами — уже сегодня' : 'Поработать самому', act: () => bldSelf(id) });
  if (b.t === 'slavemkt' && lv) btns.push({ label: 'К рынку', act: () => { closeModal(); go('market'); } });
  if (b.t !== 'slavemkt') { btns.push({ label: `Перенести · ${fmt(bldMoveCost(id))}`, act: () => moveModal(id) }); btns.push({ label: 'Снести', cls: 'btn-danger', act: () => bldDemolish(id) }); }
  btns.push({ label: 'Закрыть', act: 'close' });
  showModal(esc(B.n) + (lv ? ` · уровень ${lv}` : ' · стройка'), h, btns);
}
function moveModal(id) {
  const b = bOf(id), fp = freePlots();
  if (!fp.length) return toast('Нет свободных участков — купите район.');
  showModal('Куда перенести?', `<p class="small">Перенос стоит ${fmt(bldMoveCost(id))} мон. (20% вложенного); в день переезда здание закрыто. Работники и стройка сохраняются.</p>${fp.map(p => { const a = adjInfo(b.t, p); return `<button class="bmenu" data-cmv="${p}" data-id="${id}"><b>${DISTRICTS[PLOTS[p].d].n} · ${p}</b><span class="${a.m > 1 ? 'pos' : a.m < 1 ? 'neg' : ''}">выработка здесь ×${a.m.toFixed(2)}</span><small>${a.why.map(w => w[0]).join(', ') || 'без особенностей'}</small></button>`; }).join('')}`, [{ label: 'Отмена', act: 'close' }]);
}
function brothelPanel(id) {
  const E = estOf(), bath = lvSum('baths');
  return `<div class="panel-title small" style="margin-top:8px">Порядки дома</div>${Object.entries(POLICY).map(([k, P]) => `<button class="bmenu ${E.pol === k ? 'on' : ''}" data-cpol="${k}"><b>${P.n}${E.pol === k ? ' ✓' : ''}</b><small>${P.d}</small></button>`).join('')}
    <div class="small">Здоровье: ${bath ? `купальни ур. ${bath} — лекарь проверяет всех, риск хвори мал` : '<b>нет купален</b> — риск хвори выше, стресс снимается хуже'}. Гильдия: сбор +40 за уровень в неделю. Работают только взрослые (19+), согласные (лояльность 35+) и не в положении; при лояльности ниже 25 человек уходит из «Ленты».</div>
    <div class="small muted">Что происходит за дверями — остаётся за дверями. Здесь видно только деньги, настроение и слухи.</div>`;
}

// ---------- события города (с выбором) ----------
function pickBld(f) { const a = bList().filter(([, b]) => b.lv && (!f || f(b))); return a.length ? pick(a)[0] : null; }
const CEV = {
  fire: { w: s => 8 * (1.6 - s.safe / 100), need: () => pickBld(b => b.t !== 'park'), t: e => `Пожар: горит «${bldLabel(e.id)}»!`, d: e => `Над крышей «${bldLabel(e.id)}» дым. ${lvSum('guard') ? 'Караульные уже бегут с вёдрами.' : 'Своей стражи нет — решать вам.'}`, def: 2,
    o: [['Нанять пожарных · 250', e => { if (S.gold < 250) return 'Денег нет — огонь потушили соседи, но здание закрыто на день.' + closeB(e.id); S.gold -= 250; return 'Пожарные справились. Убыток только в монетах.'; }],
      ['Тушить своими силами', e => { homeChars().slice(0, 4).forEach(c => { c.health = clamp(c.health - 15); c.stress = clamp(c.stress + 8); }); return 'Ваши люди отстояли здание, но наглотались дыма: здоровье −15.' + closeB(e.id); }],
      ['Пусть догорает, лишь бы не дальше', e => { const b = bOf(e.id); if (!b) return ''; if (lvSum('guard') >= 2) return 'Караульня успела сбить пламя — здание закрыто на день.' + closeB(e.id); if (b.lv > 1) { b.lv--; syncCap(); return `Огонь съел верхний этаж: «${bldLabel(e.id)}» теперь уровня ${b.lv}.`; } return 'Здание обгорело и закрыто на день.' + closeB(e.id); }]] },
  insp: { w: () => 6 + (estOf().pol === 'lavish' ? 6 : 0), need: () => pickBld(), t: e => `Проверка гильдии в «${bldLabel(e.id)}»`, d: e => `Строгий писарь с печатью желает осмотреть «${bldLabel(e.id)}». Репутация района: ${cityCore().prest}.`, def: 0,
    o: [['Показать всё честно', e => { const p = cityCore().prest + (bOf(e.id) && bOf(e.id).t === 'brothel' && estOf().pol === 'lavish' ? -25 : 0); if (R() * 100 < p + 15) { S.rep += 1; return 'Писарь доволен: «Образцово!» Репутация +1.'; } S.gold -= 150; return 'Нашлись мелкие нарушения: штраф 150 мон.'; }],
      ['Сунуть «на чернила» · 200', e => { S.gold -= 200; if (R() < 0.2) { S.rep = Math.max(0, S.rep - 1); return 'Взятку взяли, но слух пошёл: репутация −1.'; } return 'Писарь подмигнул и ушёл обедать.'; }],
      ['Закрыть на день «на уборку»', e => 'Проверять было нечего: здание закрыто на день.' + closeB(e.id)]] },
  fest: { w: () => 6, need: () => 'x', t: () => 'Горожане хотят праздник', d: () => 'Цеха предлагают устроить ярмарку с музыкой на вашей площади. Нужны деньги на флажки и бочки.', def: 1,
    o: [['Вложить 300 в праздник', () => { if (S.gold < 300) return 'Денег не хватило — праздник вышел скромным.'; S.gold -= 300; const E = estOf(); for (const k of ['tavern', 'market', 'brothel', 'slavemkt']) E.dem[k] = Math.max(E.dem[k], 1.5); E.mods.push({ k: 'happy', n: 'праздник', v: 10, until: S.day + 2 }); E.mods.push({ k: 'prest', n: 'праздник', v: 5, until: S.day + 2 }); S.rep += 1; return 'Флажки, сидр, танцы до утра! Спрос ×1.5, счастье +10, репутация +1.'; }],
      ['Отказать', () => { estOf().mods.push({ k: 'happy', n: 'нет праздника', v: -4, until: S.day + 2 }); return 'Горожане ворчат: счастье −4 на пару дней.'; }]] },
  theft: { w: s => 7 * (1.5 - s.safe / 100), need: () => pickBld(b => ['market', 'tavern', 'workshop', 'brothel', 'slavemkt'].includes(b.t)), t: e => `Кража в «${bldLabel(e.id)}»`, d: e => { e.loss = e.loss || Math.round(80 + R() * 160 + 40 * (bOf(e.id) || { lv: 1 }).lv); return `Из кассы пропало ${e.loss} мон. Есть подозрение на шайку с пристани.`; }, def: 1,
    o: [['Устроить облаву', e => { const ch = 0.3 + 0.2 * lvSum('guard') + cityCore().safe / 300; if (R() < ch) { S.gold += Math.round(e.loss * 0.5); return 'Шайку взяли! Вернули половину и ещё немного сверху.'; } S.gold -= e.loss; return 'Воры ушли переулками. Потеря ' + e.loss + ' мон.'; }],
      ['Списать убыток', e => { S.gold -= e.loss; return `Минус ${e.loss} мон. Пожалуй, пора подумать о караульне.`; }]] },
  noble: { w: () => bList('brothel').some(([, b]) => b.lv) ? 7 : 0, need: () => pickBld(b => b.t === 'brothel'), t: () => 'Знатный гость в «Шёлковой ленте»', d: () => 'Под капюшоном — сам барон с Верхнего тракта. Просит, чтобы о его визите никто не узнал.', def: 0,
    o: [['Хранить тайну', () => { const v = 250 + 80 * lvSum('brothel'); S.gold += v; return `Барон оставил щедрые чаевые: +${v} мон. Дверь закрылась, свечи погасли.`; }],
      ['Похвастаться в городе', () => { S.rep += 2; estOf().mods.push({ k: 'prest', n: 'громкий слух', v: -8, until: S.day + 4 }); return 'Весь Лог судачит: репутация +2, но приличные соседи морщатся (репутация района −8 на 5 дней).'; }]] },
  rest: { w: () => bList('brothel').some(([id]) => bldWorkers(id).length) ? 6 + (estOf().pol === 'lavish' ? 5 : 0) : 0, need: () => pickBld(b => b.t === 'brothel'), t: () => 'Работники «Ленты» просят выходной', d: () => 'Говорят, что устали улыбаться, и просят день отдыха и пикник у реки.', def: 1,
    o: [['Дать выходной', e => { for (const c of bldWorkers(e.id)) { c.stress = clamp(c.stress - 20); c.loyalty = clamp(c.loyalty + 4); } return 'Пикник, венки, песни. Стресс −20, лояльность +4. Дом закрыт на день.' + closeB(e.id); }],
      ['Отказать', e => { for (const c of bldWorkers(e.id)) { c.stress = clamp(c.stress + 6); c.loyalty = clamp(c.loyalty - 5); } return 'Работают, но без огонька: лояльность −5, стресс +6.'; }]] },
  quarry: { w: () => lvSum('quarry') ? 4 : 0, need: () => pickBld(b => b.t === 'quarry'), t: () => 'Обвал на каменоломне', d: () => 'Часть забоя осыпалась. Можно укрепить стены или работать как есть.', def: 1,
    o: [['Укрепить · 200', () => { S.gold -= 200; estOf().mat.stone += 10; return 'Укрепили, а заодно разобрали завал: камень +10.'; }],
      ['Работать как есть', e => { const w = bldWorkers(e.id); if (w.length && R() < 0.5) { const c = pick(w); c.health = clamp(c.health - 25); return `${fn1(c)} ушиб${g(c, '', 'ла')}ся: здоровье −25.`; } return 'Обошлось. В этот раз.'; }]] },
};
function closeB(id) { const b = bOf(id); if (b) b.closed = S.day; return ''; }
function rollCityEv() {
  const E = estOf(); if (E.ev || !bList().some(([, b]) => b.lv) || R() > 0.27) return;
  const s = cityCore(), opts = Object.entries(CEV).map(([k, D]) => [k, Math.max(0, D.w(s))]).filter(([, w]) => w > 0);
  let x = R() * opts.reduce((a, o) => a + o[1], 0);
  for (const [k, w] of opts) { x -= w; if (x <= 0) { const id = CEV[k].need(); if (id) { E.ev = { k, id, day: S.day }; CEV[k].d(E.ev); } return; } }
}
function evResolve(i, auto) {
  const E = estOf(), e = E.ev; if (!e) return; const D = CEV[e.k];
  E.ev = null; const msg = D.o[i][1](e) || '';
  addLog(`${D.t(e)}: ${D.o[i][0]}. ${msg}`); goalBump('event');
  if (!auto) { save(); showModal(esc(D.t(e)), `<p>${esc(msg)}</p>`, [{ label: 'Хорошо', cls: 'btn-primary', act: () => { closeModal(); render(); } }]); }
  return msg;
}
function evModal() { const E = estOf(), e = E.ev; if (!e) return; const D = CEV[e.k]; showModal(esc(D.t(e)), `<p>${esc(D.d(e))}</p><p class="small muted">Если не решить до конца дня — «${esc(D.o[D.def][0])}».</p>`, [...D.o.map((o, i) => ({ label: esc(o[0]), cls: i === 0 ? 'btn-primary' : '', act: () => { closeModal(); evResolve(i); } })), { label: 'Позже', act: 'close' }]); }

// ---------- слухи «Ленты» (без подробностей, всё за кадром) ----------
const RUMORS = [
  '{n} так сыграл{a} на лютне, что купец забыл, зачем пришёл, — и оставил вдвое больше.',
  'Говорят, {n} умеет одним взглядом заставить гостя заказать лучшее вино. Дальше — занавес.',
  'Гость принёс {n} букет полевых ромашек и долго читал стихи. Стихи были ужасны, чаевые — прекрасны.',
  'Вдова мельника уверяет, что в «Ленте» лучший чай в Логе. Все кивают с серьёзными лицами.',
  '{n} весь вечер учил{a} капитана стражи танцевать. Капитан наступил на всё, что можно. Свечи погасли.',
  'Кто-то оставил у дверей «Ленты» корзину пирогов и записку «Спасибо за вечер». Подписи нет.',
  'Бард сложил о {n} балладу. Приличную. Почти.',
  'Молодой писарь краснел, заикался и ушёл счастливым. Подробности остались за бархатной шторой.',
];
function rumor(c) { return pick(RUMORS).replace(/\{n\}/g, fn1(c)).replace(/\{a\}/g, g(c, '', 'а')); }

// ---------- авто-управление ----------
function cityAuto() {
  const E = estOf(); if (!E.auto) return [];
  const out = [], core = cityCore();
  for (const c of S.owned) if (c.bld && E.b[c.bld] && c.fatigue >= 75 && c.status === 'home') { out.push(`${fn1(c)} отдыхает (усталость).`); c._autoRest = c.bld; c.bld = null; }
  const free = () => homeChars().filter(c => !c.bld && !c._autoRest && c.sickDays <= 0 && c.health >= 40 && c.fatigue < 60 && c.manualDay !== S.day);
  for (const [id, b] of bList()) {
    if (!b.job) continue;
    const need = (b.t === 'slavemkt' ? 3 : 2) - bldBuilders(id).length;
    for (let i = 0; i < need; i++) { const f = free().filter(c => !c.preg).sort((x, y) => builderPts(y) - builderPts(x))[0]; if (!f) break; f.bld = '@' + id; out.push(`${fn1(f)} — на стройку «${bldLabel(id)}».`); }
  }
  for (const [id, b] of bList().sort((x, y) => (BT[y[1].t].base || 0) - (BT[x[1].t].base || 0))) {
    if (!b.lv || BT[b.t].noWork || (b.t === 'brothel' && !E.autoB)) continue;
    while (bldWorkers(id).length < bldSlots(id)) {
      const pool = free().filter(c => b.t !== 'brothel' || (c.loyalty >= 38 && !c.preg && c.stress < 60)).map(c => ({ c, v: bldWorkerOut(c, id, core).v })).filter(o => o.v >= (BT[b.t].base || 20) * 0.6).sort((x, y) => y.v - x.v);
      if (!pool.length) break; pool[0].c.bld = id; out.push(`${fn1(pool[0].c)} → «${bldLabel(id)}».`);
    }
  }
  return out;
}

// ---------- день ----------
function workLoad(t) { return { quarry: [20, 7], guard: [14, 8], baths: [10, 5], library: [10, 6], tavern: [15, 10], market: [15, 10], brothel: [16, 0], slavemkt: [15, 10] }[t] || [15, 7]; }
function estDayStart() {
  const E = estOf(), lines = [];
  E.mods = (E.mods || []).filter(m => m.until >= S.day);
  if (E.ev) { const D = CEV[E.ev.k]; lines.push(`Не решено «${D.t(E.ev)}» → ${D.o[D.def][0]}. ${evResolve(D.def, true) || ''}`.trim()); }
  for (const c of S.owned) if (c.bld && !E.b[String(c.bld).replace(/^@/, '')]) c.bld = null;
  lines.push(...cityAuto());
  for (const c of S.owned) if (c._autoRest) { c._autoTask = c.task; c.task = 'rest'; c.manualDay = S.day; }
  const core = cityCore(); let inc = 0, upk = 0;
  const mat = { stone: 0, tools: 0 };
  for (const [id, b] of bList()) {
    upk += bldUpkeepB(b);
    const B = BT[b.t], nm = B.short || B.n;
    // стройка
    if (b.job) {
      let pts = b.t === 'slavemkt' ? 0 : 12;
      for (const c of bldBuilders(id)) {
        if (c.status !== 'home') { c.bld = null; continue; }
        if (c.sickDays > 0 || c.health < 30) { lines.push(`${fn1(c)} не вышл${g(c, 'и', 'а')} на стройку — нездоровится.`); continue; }
        const p = builderPts(c) * (c.fatigue >= 75 ? 0.6 : 1); pts += p;
        c._bp = { fatigue: c.fatigue, stress: c.stress, health: c.health, task: c.task, fa: 22, sa: 8 }; c.status = 'bld'; c.task = 'rest';
        if (R() < 0.2) { const s = pick(['str', 'end', 'mas']); if (c.stats[s] < c.pot[s]) c.stats[s]++; }
      }
      b.job.done += pts;
      if (b.job.done >= b.job.need) {
        if (b.job.stage != null) { b.stage = b.job.stage + 1; b.job = null; if (b.stage >= 3) { b.lv = 1; for (const c of S.owned) if (c.bld === '@' + id) c.bld = null; lines.push('🎉 Большой невольничий рынок достроен вашими людьми! Старый рынок теперь ваш.'); addLog('Большой невольничий рынок построен.'); } else lines.push(`Большой рынок: этап «${MKT.stages[b.stage - 1].n}» готов. Можно начинать следующий.`); }
        else { b.lv = b.job.to; b.job = null; lines.push(`⚒ Готово: «${nm}» — уровень ${b.lv}.`); addLog(`Достроено: ${B.n}, уровень ${b.lv}.`); syncCap(); }
        for (const c of S.owned) if (c.bld === '@' + id && !c._bp) c.bld = null;
      } else if (pts) lines.push(`⚒ «${nm}»: +${Math.round(pts)} ед. (${Math.round(b.job.done)}/${b.job.need}).`);
      else lines.push(`⚒ «${nm}» стоит — нет строителей.`);
    }
    if (!b.lv) continue;
    if (b.closed === S.day) { lines.push(`«${nm}» сегодня закрыто.`); continue; }
    let bi = 0;
    for (const c of bldWorkers(id)) {
      if (c.status !== 'home') { c.bld = null; continue; }
      if (c.sickDays > 0 || c.health < 30) { lines.push(`${fn1(c)} не вышл${g(c, 'и', 'а')} в «${nm}» — нездоровится.`); continue; }
      const o = bldWorkerOut(c, id, core); bi += o.v;
      const [fa, sa] = workLoad(b.t);
      c._bp = { fatigue: c.fatigue, stress: c.stress, health: c.health, task: c.task, fa, sa };
      c.status = 'bld'; c.task = 'rest';
      if (b.t === 'library') { const s = pick(['int', 'wil']); if (R() < 0.4 && c.stats[s] < c.pot[s]) c.stats[s]++; }
      if (R() < 0.25) { const s = pick(B.st); if (c.stats[s] < c.pot[s]) c.stats[s]++; }
      if (b.t === 'brothel') {
        const P = POLICY[E.pol], bath = lvSum('baths');
        let st = P.st * (has(c, 'sensitive') ? 1.4 : has(c, 'cheerful') ? 0.7 : 1) - (neighbors(b.plot).some(([, x]) => x.t === 'baths') ? 5 : 0);
        c._bp.sa = Math.max(2, st);
        if (E.pol === 'lavish') c.loyalty = clamp(c.loyalty - 1);
        if (R() < (bath ? 0.005 : 0.03)) { c.sickDays = Math.max(c.sickDays || 0, 2); c.health = clamp(c.health - 15); lines.push(`${fn1(c)} занемог${g(c, '', 'ла')} — ${bath ? 'лекарь купален уже рядом' : 'без купален лечиться дольше'}.`); }
        if (R() < (E.pol === 'lavish' ? 0.22 : E.pol === 'std' ? 0.14 : 0.07)) lines.push('Слух: ' + rumor(c));
      }
      lines.push(`${fn1(c)} — ${nm}: +${o.v}${b.mode === 'store' && B.store ? ' → склад' : ' мон.'}`);
    }
    if (b.mode === 'store' && B.store && bi) { const q = matFrom(b.t, bi); mat[B.store] += q; } else inc += bi;
    if (b.t === 'tavern' && R() < 0.12 * b.lv) { S.rep += 1; lines.push('Ваша таверна в моде: репутация +1.'); }
    if (b.t === 'baths') { for (const c of S.owned) { c.stress = clamp(c.stress - 3 * b.lv); c.health = clamp(c.health + 2 * b.lv); } lines.push(`Купальни: всем стресс −${3 * b.lv}, здоровье +${2 * b.lv}.`); }
    if (b.t === 'brothel' && E.pol === 'lavish' && R() < 0.12) { S.rep = Math.max(0, S.rep - 1); lines.push('Гильдия недовольна шумом «Ленты»: репутация −1.'); }
  }
  for (const k in mat) if (mat[k]) { E.mat[k] += mat[k]; lines.push(`На склад: ${MAT_N[k]} +${mat[k]}.`); }
  if (E.stable.length) { upk += 8 * E.stable.length; lines.push(`Загон: ${E.stable.length} чел., корм −${8 * E.stable.length}.`); }
  let tax = 0;
  if (S.day % 7 === 0) {
    const lvls = bList().reduce((a, [, b]) => a + b.lv, 0), guild = 40 * lvSum('brothel') + 60 * mktLv();
    tax = Math.round(Math.max(0, S.gold - 1500) * 0.04 + lvls * 12 + guild);
    if (tax) lines.push(`Недельный сбор гильдии: −${tax} мон. (4% с запаса сверх 1500, 12 за уровень построек${guild ? `, ${guild} за «Ленту» и Большой рынок` : ''}).`);
    if (core.prest >= 70) { S.rep += 1; lines.push('Солидный район: репутация +1.'); } else if (core.prest <= 20) { S.rep = Math.max(0, S.rep - 1); lines.push('О вашем районе дурная слава: репутация −1.'); }
  }
  S.gold += inc - upk - tax; S.totalEarned += inc;
  E.last = { inc, upk, tax, lines, day: S.day, happy: core.happy };
}
function estDayEnd() {
  const E = estOf();
  for (const c of S.owned) if (c._bp) {
    const p = c._bp; c.status = 'home'; c.task = p.task;
    c.fatigue = clamp(p.fatigue + p.fa * (has(c, 'lazy') ? 1.3 : 1)); c.stress = clamp(p.stress + p.sa * (has(c, 'cheerful') ? 0.7 : has(c, 'sensitive') ? 1.3 : 1));
    c.health = Math.min(c.health, p.health + 2);
    if (c.fatigue >= 90) c.health = clamp(c.health - 10);
    delete c._bp;
  }
  for (const c of S.owned) { if (c._autoRest) { c.bld = E.b[c._autoRest] ? c._autoRest : null; c.task = c._autoTask || c.task; delete c._autoRest; delete c._autoTask; } }
  for (const c of S.owned) if (c.bld && c.bld[0] === '@') { const b = E.b[c.bld.slice(1)]; if (!b || !b.job) c.bld = null; }
  for (const c of S.owned) if (c.bld && E.b[c.bld] && E.b[c.bld].t === 'brothel' && c.loyalty < 25) { c.bld = null; addLog(`${fn1(c)} больше не хочет работать в «Ленте» (лояльность ниже 25).`); if (E.last) E.last.lines.push(`${fn1(c)} ушл${g(c, 'и', 'а')} из «Ленты» — не хочет.`); }
  const hp = E.last ? E.last.happy : 50, ds = -Math.round((hp - 50) / 10);
  if (ds) for (const c of S.owned) c.stress = clamp(c.stress + ds);
  for (const k in BT) { const d = E.dem[k] + (R() - 0.5) * 0.16 + (1 - E.dem[k]) * 0.15; E.dem[k] = +clamp(d, 0.65, 1.45).toFixed(2); }
  if (S.mevent) { if (S.mevent.id === 'festival') { E.dem.tavern = 1.4; E.dem.market = 1.35; E.dem.brothel = 1.3; } if (S.mevent.id === 'drought') E.dem.farm = 1.45; if (S.mevent.id === 'caravan') E.dem.slavemkt = 1.4; }
  if (E.saleDay === S.day && mktLv()) { for (let i = 0; i < 4; i++) { const c = makeCharacter({ rarity: R() < 0.3 ? 3 : 2 }); c.exotic = true; S.market.unshift(c); } }
  if (E.last) { const net = E.last.inc - E.last.upk - (E.last.tax || 0), h = S.hist[S.hist.length - 1]; if (h && h.d === E.last.day && !h.city) { h.inc += net; h.city = net; } }
  rollCityEv();
  if (E.ev && E.last) E.last.lines.push(`Новое событие: ${CEV[E.ev.k].t(E.ev)} — решите во «Владениях».`);
}

// ---------- рынок: Большой рынок заменяет старый ----------
function aucFee() { return +(0.08 - 0.01 * mktLv()).toFixed(2); }
(function () {
  const oPrice = window.price; window.price = function (c) { const v = oPrice.apply(this, arguments); try { const lv = mktLv(); if (lv && S.market && S.market.includes(c)) return Math.round(v * (1 - MKT.disc[lv])); } catch (e) { } return v; };
  const oSP = window.sellPrice; window.sellPrice = function (c) { const v = oSP.apply(this, arguments); try { const lv = mktLv(); if (lv) return Math.round(v * (1 + MKT.sell[lv])); } catch (e) { } return v; };
  const oRoll = window.rollMarket; window.rollMarket = function () { const r = oRoll.apply(this, arguments); try { const lv = mktLv(); if (lv) for (let i = 0; i < MKT.lots[lv]; i++) S.market.push(makeCharacter({ rarBonus: MKT.rare[lv] })); } catch (e) { console.warn('v11 market', e); } return r; };
  const oRC = window.refreshCost; window.refreshCost = function () { try { if (mktLv() >= 2 && estOf().freeRef !== S.day) return 0; } catch (e) { } return oRC.apply(this, arguments); };
  const oRef = window.refreshMarket; window.refreshMarket = function () { const free = refreshCost() === 0; const r = oRef.apply(this, arguments); if (free) { estOf().freeRef = S.day; S.refreshN = Math.max(0, S.refreshN - 1); save(); render(); } return r; };
  const oUp = window.upkeep; window.upkeep = function () { const r = oUp.apply(this, arguments); try { const lv = lvSum('farm'); if (lv) { const cut = Math.round(r.food * Math.min(0.45, lv * 0.06)); r.food -= cut; r.total -= cut; } } catch (e) { } return r; };
  const oVM = window.viewMarket; window.viewMarket = function () {
    const lv = mktLv(); if (!lv) return oVM.apply(this, arguments).replace('</h1>', '</h1><div class="small muted">Рынок гильдии работорговцев. Свой Большой рынок — во «Владениях».</div>');
    const E = estOf(), all = S.market, rf = UI.mrar == null ? -1 : UI.mrar, so = UI.msort || 'new';
    let list = all.filter(c => rf < 0 || c.rarity === rf);
    if (so === 'cheap') list = list.slice().sort((a, b) => price(a) - price(b)); else if (so === 'dear') list = list.slice().sort((a, b) => price(b) - price(a)); else if (so === 'rare') list = list.slice().sort((a, b) => b.rarity - a.rarity);
    S.market = list; let h; try { h = oVM.apply(this, arguments); } finally { S.market = all; }
    const left = stableBuyersLeft(), sale = E.saleDay === S.day, soon = E.saleDay > S.day;
    const panel = `<div class="panel parchment bigmkt"><div class="panel-title">Ваш Большой рынок · ур. ${lv}${sale ? ' · <b class="pos">ДЕНЬ РАСПРОДАЖИ</b>' : ''}</div>
      <div class="small">Лотов: ${all.length} · скидка на покупку ${Math.round(MKT.disc[lv] * 100)}% · продажа +${Math.round(MKT.sell[lv] * 100)}% · аукцион ${Math.round(aucFee() * 100)}%${lv >= 2 ? ` · бесплатный привоз ${E.freeRef === S.day ? 'использован' : 'доступен'}` : ''}</div>
      <div class="m-tools">${[['new', 'Новые'], ['cheap', 'Дешевле'], ['dear', 'Дороже'], ['rare', 'Редкие']].map(([k, n]) => `<button class="fchip ${so === k ? 'on' : ''}" data-msort="${k}">${n}</button>`).join('')}</div>
      <div class="m-tools">${[[-1, 'Любая редкость'], [0, RARITIES[0].fname || RARITIES[0].name], [1, RARITIES[1].fname || RARITIES[1].name], [2, RARITIES[2].fname || RARITIES[2].name], [3, RARITIES[3].fname || RARITIES[3].name]].map(([k, n]) => `<button class="fchip ${rf === k ? 'on' : ''}" data-mrar="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="panel-title small">Загон для перепродажи ${E.stable.length}/${stableCap()} · покупателей сегодня: ${Math.max(0, left)}</div>
      ${E.stable.map(c => `<div class="bw-row stable-row"><b>${esc(fn1(c))}</b> <span class="small muted">${esc(rarityName(c))} · куплено за ${fmt(c.boughtFor || 0)}</span> <button class="btn small" data-csell="${c.uid}" ${c.stockDay >= S.day ? 'disabled' : ''}>Продать · ${fmt(stablePrice(c))}</button> <button class="btn small" data-ctake="${c.uid}">В поместье</button></div>`).join('') || '<div class="small muted">Пусто. Кнопка «В загон» на карточках рынка — купить для перепродажи (место в поместье не нужно, корм 8 мон./день).</div>'}
      <div class="btn-row"><button class="btn small" data-csale="1" ${soon ? 'disabled' : ''}>${soon ? `Распродажа в день ${E.saleDay}` : 'Объявить распродажу · 300'}</button></div>
      <div class="small muted">Распродажа: раз в неделю, через 2 дня после объявления — втрое больше покупателей, +15% к цене продажи из загона и 4 редких лота.</div></div>`;
    return h.replace('<h1>Рынок</h1>', '<h1>Большой невольничий рынок</h1>').replace('<div class="m-tools">', panel + '<div class="m-tools">').replace(/(Новый привоз · )0/, '$1бесплатно');
  };
})();

// ---------- цели и вехи ----------
GOAL_POOL.push(['builder', 'Поставить кого-то на стройку', 1, 80, 0, () => bList().some(([, b]) => b.job)], ['event', 'Решить городское событие', 1, 90, 0, () => !!estOf().ev], ['stable', 'Продать человека из загона', 1, 120, 1, () => mktLv() > 0 && estOf().stable.length > 0]);
MILESTONES.push(
  ['dist', 'Купить новый район', () => Object.keys(S.est.dist || {}).length >= 2, 600, 2],
  ['brot', 'Открыть «Шёлковую ленту»', () => bList('brothel').some(([, b]) => b.lv), 700, 1],
  ['b6', 'Шесть зданий в городе', () => bList().filter(([, b]) => b.lv).length >= 6, 1200, 3],
  ['hap70', 'Счастье города 70+', () => cityCore().happy >= 70, 900, 3], ['saf70', 'Безопасность 70+', () => cityCore().safe >= 70, 900, 3],
  ['mkt', 'Свой Большой невольничий рынок', () => mktLv() >= 1, 3000, 5], ['mkt3', 'Большой рынок 3-го уровня', () => mktLv() >= 3, 6000, 8]);

// ---------- проводка ----------
(function () {
  const oRender = window.render;
  window.render = function () {
    const r = oRender.apply(this, arguments);
    try {
      const lv = mktLv(), nb = document.querySelector('.nav-btn[data-go="market"]');
      if (nb) { const sp = nb.querySelector('span') || nb; if (lv && !/Б\. рынок/.test(sp.textContent)) { sp.childNodes.forEach(n => { if (n.nodeType === 3 && /Рынок/.test(n.textContent)) n.textContent = n.textContent.replace('Рынок', 'Б. рынок'); }); } }
      if (UI.screen === 'market' && lv) document.querySelectorAll('#screen .m-card[data-open]').forEach(el => { if (!el.querySelector('.stab-btn')) el.insertAdjacentHTML('beforeend', `<button class="stab-btn" data-cstab="${el.dataset.open}">В загон</button>`); });
      if (UI.screen === 'manor' && S.est && S.est.ev) { const h = document.querySelector('#screen .screen-head'); if (h) h.insertAdjacentHTML('afterend', evBanner()); }
    } catch (e) { console.warn('v11 render', e); }
    return r;
  };
  const oMenu = window.menuModal;
  window.menuModal = function () { const r = oMenu.apply(this, arguments); try { const b = document.querySelector('#modal .modal-body'); if (b && !b.querySelector('.ver-lab')) b.insertAdjacentHTML('beforeend', `<div class="ver-lab">Торговец из Медового Лога · ${CITY_VER}</div>`); } catch (e) { } return r; };
  const oBirth = window.makeCharacter;
  window.makeCharacter = function (opts) { const c = oBirth.apply(this, arguments); if (c && c.age < 19) c.age = 19; return c; };
  const uidOf = v => (S.owned.concat(S.market || [], (S.est && S.est.stable) || []).find(c => String(c.uid) === String(v)) || {}).uid;
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cid],[data-cplot],[data-cdist],[data-csq],[data-cwhy],[data-cbt],[data-cbo],[data-cmode],[data-cpol],[data-cauto],[data-cbuild],[data-cmats],[data-cev],[data-cmv],[data-chelp],[data-csell],[data-ctake],[data-cstab],[data-csale],[data-msort],[data-mrar]'); if (!t) return;
    const d = t.dataset;
    if (d.cauto != null) { estOf()[d.cauto] = t.checked; save(); toast(t.checked ? 'Авто-управление включено.' : 'Авто-управление выключено.'); return; }
    e.preventDefault(); e.stopPropagation();
    if (d.cid) return bldModal(d.cid);
    if (d.cplot) return plotModal(d.cplot);
    if (d.cdist) return buyDistrict(d.cdist);
    if (d.csq) { if (mktLv()) return bldModal(mktId()); const b = estOf().b.slavemkt; return b && b.job ? bldModal('slavemkt') : sqModal(); }
    if (d.cwhy) return whyModal(d.cwhy);
    if (d.cbt) { if (t.classList.contains('off')) { const w = canBuild(d.cbt, d.p); return toast(w || `Нужно ${fmt(bldCost(d.cbt, 1))} мон.`); } return cityBuild(d.cbt, d.p); }
    if (d.cbo) { builderAssign(uidOf(d.cbo), d.id); render(); return bldModal(d.id); }
    if (d.cmode) return setMode(d.id, d.cmode);
    if (d.cpol) return setPolicy(d.cpol);
    if (d.cbuild) return buildMenu();
    if (d.cmats) return matsModal();
    if (d.cev) return evModal();
    if (d.cmv) return bldMove(d.id, d.cmv);
    if (d.chelp) return helpModal('estate');
    if (d.csell) return stableSell(uidOf(d.csell));
    if (d.ctake) return stableTake(uidOf(d.ctake));
    if (d.cstab) return stableBuy(uidOf(d.cstab));
    if (d.csale) return saleSchedule();
    if (d.msort) { UI.msort = d.msort; return render(); }
    if (d.mrar) { UI.mrar = +d.mrar; return render(); }
  }, true);
  try {
    const i = HELP.findIndex(h => h[0] === 'estate'); if (i >= 0) HELP.splice(i, 1);
    HELP.push(['estate', 'Владения и город', () => `<p><b>Карта.</b> Центр с 4 участками и площадью бесплатно. Районы покупаются: Ремесленная слобода, Каменный холм (каменоломне ×1.25), Сады (огородам и скверам ×1.15), Речной квартал (купальням, таверне, огородам ×1.15). Нажмите «+» на участке — откроется меню стройки по категориям.</p>
      <p><b>Стройка</b> идёт днями: наёмная артель даёт 12 ед. в день, а ваши люди-строители — ещё 2 + (Сила + Выносливость)/8 + Мастерство/12 (не меньше 5). С 3-го уровня нужны камень и инструменты — со своей каменоломни и мастерской (режим «на склад») или у поставщика. Пока идёт улучшение, здание работает на старом уровне. Здания можно сносить (вернётся 30%) и переносить (20%, день простоя).</p>
      <p><b>Соседство.</b> Таверна у рынка, «Лента» у купален и таверны, мастерская у каменоломни, библиотека у сквера — бонусы; библиотека рядом с «Лентой» — минус. Караульня рядом помогает рынку, таверне и «Ленте».</p>
      <p><b>Показатели.</b> Репутация района влияет на доход всех зданий, счастье — на выработку и стресс жителей, безопасность — на пожары и кражи. Нажмите на показатель — «Почему так». Содержание платится каждый день, раз в неделю — сбор гильдии.</p>
      <p><b>События</b> (пожар, проверка, праздник, кража, знатный гость…) ждут вашего решения до конца дня, иначе выбирается вариант по умолчанию.</p>
      <p><b>«Шёлковая лента»</b> — дом утех, уровни 1–5, до 8 мест. Работают только взрослые, согласные (лояльность 35+) и не в положении; ниже 25 — уходят. Порядки: Салон (тихо, ×0.7), Обычный, Роскошь (×1.35, но стресс, лояльность и гильдия). Купальни рядом снимают стресс и защищают от хворей. Всё, что за дверью, — за кадром.</p>
      <p><b>Большой невольничий рынок</b> — выкупить у гильдии (${fmt(MKT.buy)} мон., ранг D+) или построить в 3 этапа силами своих людей (≈12 000 мон. + материалы). Заменяет старый рынок: больше лотов и редкостей, скидка 6–14%, продажа +4–10%, ниже комиссия аукциона, загон для перепродажи, сортировка и фильтры, дни распродаж.</p>
      <p><b>Авто-управление</b> ставит лучших свободных людей в здания и на стройки и даёт отдых уставшим (усталость 75+). «Ленту» трогает только с отдельной галочкой.</p>`]);
  } catch (e) { }
})();
