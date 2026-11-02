// ===== «Торговец из Медового Лога» — логика игры (версия сохранений 2) =====
'use strict';

const SAVE_KEY = 'trader_rpg_autosave_v1';
const MANUAL_KEY = 'trader_rpg_manual_v1';
const SAVE_VER = 4;
const TRAIN_COST = 30;
const PET_F = [1, 0.6, 0.35, 0.15, 0];
const HEALER_COST = 60;
const EXPAND = [{ cap: 10, rank: 2, cost: 1500 }, { cap: 12, rank: 4, cost: 3500 }];

// ---------- утилиты ----------
const R = Math.random;
const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const presetById = (id) => PRESETS.find(p => p.id === id);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const pct = (m) => (m >= 1 ? '+' : '−') + Math.abs(Math.round((m - 1) * 100)) + '%';
const xf = (m) => '×' + m.toFixed(2);
function plural(n, one, few, many) {
  n = Math.abs(Math.round(n)) % 100; const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}
const dn = (n) => n + ' ' + plural(n, 'день', 'дня', 'дней');
const g = (c, m, f) => (c.g === 'f' ? f : m);
// обращение к игроку по выбранному полу: {Х}/{х} хозяин(ка), {Г}/{г} господин/госпожа, {пг:муж|жен}
const playerFem = () => typeof S !== 'undefined' && S && S.playerG === 'f';
function addr(s) {
  if (!s || s.indexOf('{') < 0) return s;
  const f = playerFem();
  return s.replace(/\{([ХхГг])\}/g, (_, k) => ({ Х: f ? 'Хозяйка' : 'Хозяин', х: f ? 'хозяйка' : 'хозяин', Г: f ? 'Госпожа' : 'Господин', г: f ? 'госпожа' : 'господин' })[k])
    .replace(/\{пг:([^|}]*)\|([^}]*)\}/g, (_, m, w) => (f ? w : m));
}
const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fn1 = (c) => c.name.split(' ')[0];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sfx = (n) => { try { Audio_.sfx(n); } catch (e) { } };

let S = null; // состояние
const UI = { screen: 'manor', cardUid: null, cardFrom: null, filter: 'all' };

// ---------- снаряжение ----------
function rollQ(bonus = 0) {
  const x = R() - bonus; let acc = 0;
  for (let i = 3; i >= 0; i--) { acc += GEAR_Q[i].chance; if (x < acc) return i; }
  return 0;
}
function makeGear(kind, base, q, color) {
  const Q = GEAR_Q[q];
  return { iid: 'g' + (S.nextId++), kind, base, q, dur: Q.dur, maxDur: Q.dur, color: color || pick(ACC_COLORS) };
}
const gearDef = (it) => it.kind === 'outfit' ? OUTFITS[it.base] : ACCESSORIES[it.base];
const gearSlot = (it) => it.kind === 'outfit' ? 'body' : ACCESSORIES[it.base].slot;
function gearBon(it) {
  const out = {}; if (it.dur <= 0) return out;
  const m = GEAR_Q[it.q].mult, b = gearDef(it).bon || {};
  for (const k in b) out[k] = Math.round(b[k] * m);
  return out;
}
function gearBonText(it, raw) {
  const m = GEAR_Q[it.q].mult, b = gearDef(it).bon || {};
  return Object.entries(b).map(([k, v]) => {
    const n = Math.round(v * m), lbl = BON_NAMES[k];
    if (k === 'calm') return `−${n}${lbl}`;
    return (lbl.startsWith('%') || lbl.startsWith(' ')) ? `+${n}${lbl}` : `${lbl} +${n}`;
  }).join(', ');
}
function gearName(it, c) { const d = gearDef(it); return (c && c.g === 'm' && d.nameM ? d.nameM : d.name) + (it.q > 0 ? ' · ' + GEAR_Q[it.q].name : ''); }
const gearFem = (it) => !!(gearDef(it) || {}).fem;
// Будет ли вещь видна на портрете этого персонажа (для подсказки при выборе)
function gearShows(c, it) {
  const p = presetById(c.preset), cur = artKeyFor(c, p);
  const t = { preset: c.preset, outfit: c.outfit, acc: (c.acc || []).slice() };
  if (it.kind === 'outfit') t.outfit = it.base;
  else { if (gearSlot(it) !== 'legs') return !!(ACCESSORIES[it.base] || {}).ov; t.acc = t.acc.filter(a => !ACCESSORIES[a.id] || ACCESSORIES[a.id].slot !== 'legs').concat([{ id: it.base }]); }
  const k = artKeyFor(t, p);
  return k !== p.id && (k !== cur || (it.kind === 'outfit' && c.outfit === it.base));
}
function gearVal(it) { return Math.round(gearDef(it).val * GEAR_Q[it.q].val * (0.45 + 0.55 * it.dur / it.maxDur)); }
function repairCost(it) { return it.dur >= it.maxDur ? 0 : Math.round(gearDef(it).val * GEAR_Q[it.q].val * 0.35 * (1 - it.dur / it.maxDur)) + 5; }
function gearIcon(it) {
  if (it.kind === 'outfit') return `<span class="g-ico g-outfit" style="--c:${it.color}"><svg viewBox="0 0 24 24"><path d="M8 3 L4 6 L6 10 L8 9 V21 H16 V9 L18 10 L20 6 L16 3 C15 5 9 5 8 3Z" fill="currentColor" stroke="#3b2616" stroke-width="1.4" stroke-linejoin="round"/></svg></span>`;
  if (gearSlot(it) === 'legs') return `<span class="g-ico g-outfit" style="--c:${it.color}"><svg viewBox="0 0 24 24"><path d="M7 2 H12 V14 L15 19 C16 21 14 23 12 22 L8 19 C7 18 7 17 7 16Z M14 2 H18 V13 L20 17 C21 19 19 21 17 20 L15 18" fill="currentColor" stroke="#3b2616" stroke-width="1.3" stroke-linejoin="round"/><path d="M7 5 H12 M14 5 H18" stroke="#3b2616" stroke-width="1.2"/></svg></span>`;
  return `<span class="g-ico"><img src="${PORTRAIT_CFG.accDir}${it.base}.png" alt=""></span>`;
}
// Сумма бонусов надетого
function gb(c) {
  const out = {};
  for (const it of c.gear || []) { const b = gearBon(it); for (const k in b) out[k] = (out[k] || 0) + b[k]; }
  return out;
}
// Внешний вид из снаряжения: портрету нужны c.acc и c.outfit
function syncLook(c) {
  c.acc = (c.gear || []).filter(i => i.kind === 'acc').map(i => ({ id: i.base, color: i.color }));
  const o = (c.gear || []).find(i => i.kind === 'outfit');
  c.outfit = o ? o.base : null;
}
function equip(c, it) {
  const slot = gearSlot(it);
  const old = c.gear.find(x => gearSlot(x) === slot);
  if (old) { c.gear = c.gear.filter(x => x !== old); S.stash.push(old); }
  c.gear.push(it); syncLook(c);
  return old;
}

// ---------- генерация персонажей ----------
function rollRarity(bonus = 0) {
  const x = R() - bonus; let acc = 0;
  for (const i of [3, 2, 1, 0]) { acc += RARITIES[i].chance; if (x < acc) return i; }
  return 0;
}
function rollOrientation() { const x = R(); return x < 0.80 ? 'hetero' : x < 0.95 ? 'bi' : 'homo'; }
function rollGear(presetId, rarity) {
  const n = R() < 0.15 ? 0 : R() < 0.6 ? 1 : R() < 0.85 ? 2 : 3;
  const used = new Set(), out = [], fem = (presetById(presetId) || {}).g === 'f';
  for (const id of shuffle(Object.keys(ACCESSORIES))) {
    if (out.length >= n) break;
    const slot = ACCESSORIES[id].slot; if (used.has(slot)) continue;
    if (ACCESSORIES[id].fem && (!fem || R() < 0.6)) continue;
    used.add(slot); out.push(makeGear('acc', id, rollQ(rarity * 0.04)));
  }
  const all = (OUTFIT_ART[presetId] || []).filter(o => OUTFITS[o] && (fem || !OUTFITS[o].fem));
  const classic = all.filter(o => OUTFITS_CLASSIC.includes(o)), extra = all.filter(o => !OUTFITS_CLASSIC.includes(o));
  const arts = (extra.length && (!classic.length || R() < 0.15)) ? extra : classic.length ? classic : null;
  const r = R();
  if (arts && r < 0.8) out.push(makeGear('outfit', pick(arts), rollQ(rarity * 0.04)));
  else if (!arts && r < 0.45) out.push(makeGear('outfit', pick(OUTFITS_CLASSIC), rollQ(rarity * 0.04)));
  // небольшой износ у товара с рынка
  for (const it of out) it.dur = Math.max(1, it.maxDur - rint(0, Math.round(it.maxDur * 0.4)));
  return out;
}
function rollAge(race) {
  if (race === 'elf') return rint(60, 240);
  if (race === 'dwarf') return rint(30, 110);
  return rint(19, 46);
}
function makeCharacter(opts = {}) {
  const p = opts.preset ? presetById(opts.preset) : pick(PRESETS.filter(p => !p.unique && p.g === (opts.g || (R() < 0.35 ? 'm' : 'f')) && (!opts.race || p.race === opts.race)));
  const gender = p.g;
  const race = RACES[p.race];
  const rarity = opts.rarity != null ? opts.rarity : rollRarity(opts.rarBonus || 0);
  const rr = RARITIES[rarity];
  const stats = {}, pot = {};
  for (const s of STATS) {
    const base = rint(12, 42) + rr.bonus + (race.mods[s.key] || 0);
    stats[s.key] = clamp(base, 5, 90);
    pot[s.key] = clamp(stats[s.key] + rint(12, 40) + rr.pot, stats[s.key] + 5, 100);
  }
  const traits = shuffle(Object.keys(TRAITS)).slice(0, rint(1, rarity >= 2 ? 3 : 2));
  if (traits.includes('cheerful') && traits.includes('sensitive')) traits.splice(traits.indexOf('sensitive'), 1);
  if (traits.includes('diligent') && traits.includes('lazy')) traits.splice(traits.indexOf('lazy'), 1);
  const breed = gender === 'f' ? { fert: rint(30, 95), mat: rint(30, 95) } : { line: rint(30, 95), her: rint(30, 95) };
  const c = {
    uid: 'c' + (S.nextId++),
    preset: p.id, g: gender, race: p.race, rarity,
    name: pick(p.names) + ' ' + pick(SURNAMES), title: p.title, age: rollAge(p.race),
    stats, pot, traits, orient: rollOrientation(), breed,
    loyalty: opts.loyalty != null ? opts.loyalty : rint(15, 45),
    stress: rint(5, 35), fatigue: rint(0, 30), health: rint(80, 100),
    moodMod: 0, discipline: rint(10, 40),
    task: 'rest', trainStat: 'int', status: 'home', orderId: null,
    misdeed: false, goodDeed: false, praisedDay: 0, giftDay: 0, disciplineDay: 0,
    gear: [], appraised: false, inherited: [],
    haggleLock: false, priceAdj: 1, sellLockDay: 0,
    petDay: 0, petN: 0, mateDay: 0, preg: null, growth: 0, crave: null, sickDays: 0, boughtFor: 0,
    aff: rint(5, 25), heatOff: rint(0, 11), heatCare: 0, closeDay: 0, touch: null,
  };
  c.gear = opts.noGear ? [] : rollGear(p.id, rarity);
  if (p.unique) c.unique = p.unique;
  syncLook(c);
  return c;
}

// ---------- сезоны, события, спрос ----------
const season = () => SEASONS[Math.floor((S.day - 1) / 7) % 4];
const seasonLeft = () => 7 - ((S.day - 1) % 7);
const mev = () => S.mevent ? MARKET_EVENTS[S.mevent.id] : null;
function evNum(key, def = 0) { const e = mev(); return e && e[key] != null ? e[key] : def; }
function rankIdx() { let i = 0; RANKS.forEach((r, k) => { if (S.rep >= r.rep) i = k; }); return i; }
const repRank = () => RANKS[rankIdx()].key;

function demandF(c) {
  let d = S.econ.race[c.race] || 1;
  const e = mev();
  if (e && e.dem) d *= 1 + (e.dem.all || 0) + (e.dem[c.race] || 0);
  d *= 1 + (season().dem || 0);
  if (S.flags.fair) d *= 1.2;
  if (S.flags.rain) d *= 0.85;
  if (S.econ.hot && c.traits.includes(S.econ.hot)) d *= 1.15;
  return d;
}
function tickEconomy() {
  const E = S.econ;
  for (const k of Object.keys(RACES)) {
    E.trend[k] = clamp((E.trend[k] || 0) + (R() - 0.5) * 0.035, -0.06, 0.06);
    E.race[k] = +clamp(E.race[k] + E.trend[k] + (1 - E.race[k]) * 0.08 + (R() - 0.5) * 0.04, 0.6, 1.6).toFixed(3);
  }
  if (--E.hotDays <= 0) { E.hot = pick(Object.keys(TRAITS)); E.hotDays = rint(3, 5); }
}
// Продажа и покупка двигают спрос: рынок насыщается
function supplyShock(race, v) { S.econ.race[race] = +clamp(S.econ.race[race] + v, 0.6, 1.6).toFixed(3); }

// ---------- расчёты ----------
function eff(c, k) { return clamp(c.stats[k] + (gb(c)[k] || 0), 0, 130); }
function sumStats(c) { return STATS.reduce((a, s) => a + c.stats[s.key], 0); }
function traitMult(c) { return c.traits.reduce((a, t) => a * TRAITS[t].mult, 1); }
const has = (c, t) => c.traits.includes(t);
function mood(c) {
  const b = gb(c);
  return Math.round(clamp(62 + c.moodMod - c.stress * 0.45 - c.fatigue * 0.3 + (c.loyalty - 50) * 0.3 + (c.health - 100) * 0.3
    + (b.mood || 0) + (season().mood || 0) - (c.crave ? 8 : 0)));
}
function moodName(m) { return m >= 75 ? 'Радостное' : m >= 55 ? 'Спокойное' : m >= 35 ? 'Унылое' : 'Мрачное'; }
const moodF = (c) => 0.7 + 0.6 * mood(c) / 100;
const fatF = (c) => 1 - Math.max(0, c.fatigue - 40) / 150;
const hpF = (c) => 0.6 + 0.4 * c.health / 100;
const loyF = (c) => 0.75 + 0.5 * c.loyalty / 100;
const condF = (c) => (0.6 + 0.4 * c.health / 100) * (0.85 + 0.3 * mood(c) / 100);

function skillF(c) { return 0.5 + Math.pow(sumStats(c) / 320, 1.5); }
function gearWorth(c) { return (c.gear || []).reduce((a, it) => a + gearVal(it), 0); }
function priceParts(c) {
  const b = gb(c);
  return [
    ['раса', RACES[c.race].base], ['навыки', skillF(c)], ['редкость', RARITIES[c.rarity].mult],
    ['лояльность', loyF(c)], ['черты', traitMult(c)], ['спрос', demandF(c)], ['состояние', condF(c)],
    ['украшения', 1 + (b.price || 0) / 100],
  ];
}
function corePrice(c) { return priceParts(c).reduce((a, p) => a * p[1], 1) + gearWorth(c) * 0.8; }
function price(c) { return Math.round(corePrice(c) * (c.priceAdj || 1) * (1 - (c.discount || 0))); }
function sellPrice(c) { return Math.round(corePrice(c) * 0.9 * (1 + evNum('sell'))); }

// Доход за день: база по навыкам × множители. Возвращает и разбор множителей для подсказок.
function incomeInfo(c, task) {
  task = task || c.task;
  const b = gb(c), parts = [];
  let base = 0;
  if (task === 'craft') base = 27 + (eff(c, 'mas') * 0.5 + eff(c, 'str') * 0.3 + eff(c, 'end') * 0.2) * 1.4;
  else if (task === 'shop') base = 23 + (eff(c, 'cha') * 0.5 + eff(c, 'int') * 0.3 + eff(c, 'luk') * 0.2) * 1.5;
  else return { base: 0, mult: 1, parts, v: 0 };
  parts.push(['настроение', moodF(c)], ['усталость', fatF(c)], ['здоровье', hpF(c)]);
  if (c.race === 'human') parts.push(['человек', 1.1]);
  if (has(c, 'diligent')) parts.push(['трудолюбие', 1.2]);
  if (task === 'shop' && has(c, 'charming')) parts.push(['обаяние', 1.15]);
  if (b.inc) parts.push(['снаряжение', 1 + b.inc / 100]);
  if (season().inc) parts.push([season().name.toLowerCase(), 1 + season().inc]);
  if (task === 'shop' && evNum('shop')) parts.push([mev().name.toLowerCase(), 1 + evNum('shop')]);
  if (task === 'craft' && evNum('craft')) parts.push([mev().name.toLowerCase(), 1 + evNum('craft')]);
  if (task === 'shop') parts.push(['спрос в городе', 0.85 + 0.15 * (S.econ.race[c.race] || 1)]);
  if (c.preg) parts.push(['в положении', 0.5]);
  if (inHeat(c)) parts.push(['течка', 0.8]);
  const mult = parts.reduce((a, p) => a * p[1], 1);
  return { base, mult, parts, v: Math.round(base * mult) };
}
function trainInfo(c) {
  const b = gb(c), parts = [];
  parts.push(['ум', 0.7 + eff(c, 'int') / 100], ['настроение', 0.8 + 0.4 * mood(c) / 100]);
  if (c.stress > 70) parts.push(['стресс', 0.7]);
  if (c.race === 'elf') parts.push(['эльф', 1.3]);
  if (has(c, 'clever')) parts.push(['смекалка', 1.5]);
  if (b.train) parts.push(['снаряжение', 1 + b.train / 100]);
  if (c.growth > 0) parts.push(['юный дар', 1.8]);
  return { mult: parts.reduce((a, p) => a * p[1], 1), parts };
}
function fatigueGain(c, v) {
  v *= 1 - eff(c, 'end') / 300;
  if (has(c, 'lazy')) v *= 1.3;
  if (c.preg) v *= 1.2;
  v += season().fat || 0;
  c.fatigue = clamp(c.fatigue + v);
  return Math.round(v);
}
function loyaltyGain(c, v) {
  if (v > 0) { if (has(c, 'loyal')) v *= 1.5; v *= 1 + (gb(c).loy || 0) / 100; }
  c.loyalty = clamp(c.loyalty + v); return Math.round(v);
}
function stressGain(c, v) {
  if (v > 0) { if (has(c, 'cheerful')) v *= 0.7; if (has(c, 'sensitive')) v *= 1.3; v *= 1 - eff(c, 'wil') / 250; }
  c.stress = clamp(c.stress + v); return Math.round(v);
}
function foodCost(c) {
  let f = 10;
  if (c.race === 'dwarf') f = 12;
  if (c.preset === 'm06' || c.preset === 'f19') f = 18;
  if (c.preg) f += 8;
  return f * (season().food || 1) * evNum('food', 1);
}
function upkeep() {
  const food = Math.round(S.owned.reduce((a, c) => a + foodCost(c), 0));
  const house = S.owned.length ? 15 + 5 * S.owned.length : 0;
  const heat = S.owned.length ? (season().heat || 0) : 0;
  const interest = Math.round(S.debt * 0.02);
  return { food, house, heat, interest, total: food + house + heat + interest };
}
function raceName(c) { const r = RACES[c.race]; return c.g === 'f' && r.fname ? r.fname : r.name; }
function rarityName(c) { const r = RARITIES[c.rarity]; return c.g === 'f' ? r.fname : r.name; }
function statName(k) { return STATS.find(s => s.key === k).name; }
function attracted(a, b) { if (a.orient === 'bi') return true; if (a.orient === 'hetero') return a.g !== b.g; return a.g === b.g; }
function compatHint(a, b) {
  const ab = attracted(a, b), ba = attracted(b, a);
  if (ab && ba) return { lvl: 2, text: 'Между ними явно проскакивает искра' };
  if (ab || ba) return { lvl: 1, text: 'Интерес, похоже, не взаимный' };
  return { lvl: 0, text: 'Вежливы друг с другом — и только' };
}
function prefHint(c) {
  return { hetero: 'Мечтает о встрече «как в старых сказках»', bi: g(c, 'Влюбчив', 'Влюбчива') + ': симпатии не делит по правилам', homo: 'Сердце тянется к родственной душе особого склада' }[c.orient];
}

// ---------- состояние ----------
function freshEcon() {
  const race = {}, trend = {};
  for (const k of Object.keys(RACES)) { race[k] = +(0.85 + R() * 0.35).toFixed(3); trend[k] = (R() - 0.5) * 0.04; }
  return { race, trend, hot: pick(Object.keys(TRAITS)), hotDays: rint(3, 5) };
}
function newGame() {
  S = {
    v: SAVE_VER, day: 1, gold: 2000, rep: 5, nextId: 1,
    owned: [], market: [], orders: [], stash: [], gearShop: [],
    inv: { gingerbread: 2, tea: 1 }, births: [], log: [],
    flags: {}, appraiseCost: 40, totalEarned: 0,
    econ: freshEcon(), mevent: null, nextEv: null, visitor: null,
    debt: 0, capacity: 8, refreshN: 0, news: [], hist: [],
  };
  const friend = makeCharacter({ rarity: 0, loyalty: 55 });
  friend.task = 'craft';
  S.owned.push(friend);
  rollMarket(); topUpOrders(); rollGearShop(); makeNews();
  addLog('Вы открыли лавку в Медовом Логе. ' + fn1(friend) + ' — ваш первый помощник.');
  save();
}
// Перенос старых сохранений (v1) на новую версию
function migrateChar(c) {
  if (!c.gear) {
    c.gear = (c.acc || []).filter(a => ACCESSORIES[a.id]).map(a => ({ iid: 'g' + (S.nextId++), kind: 'acc', base: a.id, q: 0, dur: 30, maxDur: 30, color: a.color || pick(ACC_COLORS) }));
    if (c.outfit && OUTFITS[c.outfit]) c.gear.push({ iid: 'g' + (S.nextId++), kind: 'outfit', base: c.outfit, q: 0, dur: 30, maxDur: 30, color: pick(ACC_COLORS) });
  }
  c.gear = c.gear.filter(it => gearDef(it));
  if (c.task === 'work') c.task = 'craft';
  for (const [k, v] of Object.entries({ petDay: 0, petN: 0, mateDay: 0, preg: null, growth: 0, crave: null, sickDays: 0, boughtFor: 0, discount: 0 }))
    if (c[k] === undefined) c[k] = v;
  if (c.aff === undefined) c.aff = Math.round(clamp(c.loyalty * 0.4, 5, 40));
  if (c.heatOff === undefined) c.heatOff = rint(0, 11);
  for (const [k, v] of Object.entries({ heatCare: 0, closeDay: 0, touch: null, prof: 0, auto: false, manualDay: 0, autoWhy: '', pun: null, marks: [] })) if (c[k] === undefined) c[k] = v;
  if (!c.faults) { c.faults = []; if (c.misdeed) c.faults.push({ day: S.day, kind: 'disobey', t: 'провинность из прошлых дней' }); }
  if (!TASKS[c.task]) c.task = 'rest';
  syncLook(c);
}
function migrate() {
  if (!S.v || S.v < 2) {
    if (S.inv && S.inv.cloak) { S.inv.blanket = (S.inv.blanket || 0) + S.inv.cloak; delete S.inv.cloak; }
    const econ = freshEcon();
    if (S.demand) for (const k in S.demand) econ.race[k] = S.demand[k];
    S.econ = econ; delete S.demand;
    S.v = SAVE_VER;
    S._migrated = 1;
  }
  if (S.v < 3) { S.v = 3; S._migrated = 1; }
  if (S.v < 4) { S.v = 4; S._migrated = 1; }
  if (S.autoAll === undefined) S.autoAll = false;
  const def = { stash: [], gearShop: [], mevent: null, nextEv: null, visitor: null, debt: 0, capacity: 8, refreshN: 0, news: [], hist: [], births: [], flags: {}, inv: {}, log: [], orders: [], market: [], totalEarned: 0, appraiseCost: 40 };
  for (const k in def) if (S[k] === undefined) S[k] = def[k];
  if (!S.econ) S.econ = freshEcon();
  for (const k in S.inv) if (!ITEMS[k]) delete S.inv[k];
  for (const c of S.owned.concat(S.market)) migrateChar(c);
  S.orders = S.orders.filter(o => ORDER_TEMPLATES[o.tpl]);
  if (!S.news.length) makeNews();
  if (!S.gearShop.length) rollGearShop();
}
function addLog(t) { S.log.unshift({ day: S.day, t }); S.log = S.log.slice(0, 40); }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load(key = SAVE_KEY) {
  try { const raw = localStorage.getItem(key); if (!raw) return false; S = JSON.parse(raw); migrate(); return true; } catch (e) { console.warn('save load failed', e); return false; }
}
const findOwned = (uid) => S.owned.find(c => c.uid === uid);
const findAny = (uid) => findOwned(uid) || S.market.find(c => c.uid === uid);
function homeChars() { return S.owned.filter(c => c.status === 'home'); }

// ---------- рынок ----------
function marketSize() { return Math.min(16, 8 + Math.floor(rankIdx() * 0.7) + evNum('extra')); }
function rollMarket() {
  const n = marketSize();
  S.market = [];
  for (let i = 0; i < n; i++) S.market.push(makeCharacter());
  S.visitor = null;
  if (R() < 0.14) {
    const kind = pick(['merchant', 'appraiser', 'bargain']);
    S.visitor = { kind };
    if (kind === 'merchant') for (let i = 0; i < 2; i++) { const c = makeCharacter({ rarity: R() < 0.25 ? 3 : 2 }); c.exotic = true; S.market.unshift(c); }
    if (kind === 'appraiser') S.market.forEach(c => c.appraised = true);
    if (kind === 'bargain') { const c = pick(S.market); c.discount = 0.4; c.bargain = true; }
  }
}
function refreshCost() { return 60 + 20 * S.refreshN; }
function refreshMarket() {
  const cost = refreshCost();
  if (S.gold < cost) { sfx('bad'); return toast('Новый привоз стоит ' + cost + ' мон.'); }
  S.gold -= cost; S.refreshN++;
  rollMarket(); makeNews();
  sfx('coin'); toast('Перекупщики привели новых людей.'); save(); render();
}
function rollGearShop() {
  S.gearShop = [];
  const qb = 0.05 + rankIdx() * 0.03;
  const ids = shuffle(Object.keys(ACCESSORIES).filter(id => ACCESSORIES[id].slot !== 'legs')).slice(0, 4);
  for (const id of ids) S.gearShop.push(makeGear('acc', id, rollQ(qb)));
  S.gearShop.push(makeGear('acc', pick(Object.keys(ACCESSORIES).filter(id => ACCESSORIES[id].slot === 'legs')), rollQ(qb)));
  // два наряда: один из новых (купальник, кружево, платье, корсет, сорочка), один классический
  S.gearShop.push(makeGear('outfit', pick(Object.keys(OUTFITS).filter(o => !OUTFITS_CLASSIC.includes(o))), rollQ(qb)));
  S.gearShop.push(makeGear('outfit', pick(OUTFITS_CLASSIC), rollQ(qb)));
}
function topUpOrders() {
  S.orders = S.orders.filter(o => o.assigned || o.expires >= S.day);
  const used = new Set(S.orders.map(o => o.tpl));
  const want = Math.min(6, 3 + Math.floor(rankIdx() / 2) + 1);
  const ri = rankIdx(), e = S.mevent && S.mevent.id;
  while (S.orders.filter(o => !o.assigned).length < want) {
    const avail = ORDER_TEMPLATES.map((t, i) => i).filter(i => !used.has(i) && ORDER_TEMPLATES[i].rank <= ri && (!ORDER_TEMPLATES[i].plague || e === 'plague'));
    if (!avail.length) break;
    // заказы, связанные с текущим событием, всплывают чаще
    const w = avail.map(i => { const t = ORDER_TEMPLATES[i]; return (t.war && e === 'war') || (t.fest && e === 'festival') || t.plague ? 4 : 1; });
    let x = R() * w.reduce((a, b) => a + b, 0), k = 0;
    for (; k < avail.length; k++) { x -= w[k]; if (x <= 0) break; }
    const i = avail[Math.min(k, avail.length - 1)]; used.add(i);
    const t = ORDER_TEMPLATES[i];
    let mult = (0.9 + R() * 0.3) * (1 + (season().ord || 0));
    if ((t.war && e === 'war') || (t.fest && e === 'festival') || (t.plague && e === 'plague')) mult *= 1.3;
    S.orders.push({ id: 'o' + (S.nextId++), tpl: i, expires: S.day + rint(2, 4), assigned: null, daysLeft: 0, reward: Math.round(t.reward * mult) });
  }
}

// ---------- новости ----------
function makeNews() {
  const n = [], E = S.econ;
  const races = Object.keys(RACES).sort((a, b) => E.trend[b] - E.trend[a]);
  const up = races[0], dn_ = races[races.length - 1];
  if (E.trend[up] > 0.015) n.push(`${RACES[up].plural} дорожают: спрос ×${E.race[up].toFixed(2)} и растёт ↑`);
  if (E.trend[dn_] < -0.015) n.push(`${RACES[dn_].plural} дешевеют: спрос ×${E.race[dn_].toFixed(2)} ↓ — время покупать`);
  n.push(`Покупатели ищут черту «${TRAITS[E.hot].name}»: +15% к цене ещё ${dn(E.hotDays)}`);
  const s = season();
  n.push(`${s.name}: ${s.desc}. До смены сезона ${dn(seasonLeft())}`);
  if (S.mevent) n.push(`${mev().name}: ещё ${dn(S.mevent.left)}`);
  if (S.nextEv) n.push('Слухи: ' + MARKET_EVENTS[S.nextEv.id].rumor);
  if (S.visitor) n.push({ merchant: 'На рынке заморский купец с редким товаром!', appraiser: 'Странствующий оценщик сегодня смотрит всех бесплатно', bargain: 'Кто-то распродаёт товар со скидкой 40%' }[S.visitor.kind]);
  if (S.debt > 0) n.push(`Долг гоблину-ростовщику: ${fmt(S.debt)} мон. (2% в день)`);
  const tips = ['Совет: уставшие работают хуже — отдых тоже доход', 'Совет: высокая лояльность поднимает цену на 25%', 'Совет: Воля снижает стресс, Выносливость — усталость',
    'Совет: снаряжение изнашивается на работе — чините в таверне', 'Совет: перед продажей поднимите настроение — покупатель это видит', 'Совет: наследники учатся почти вдвое быстрее, пока юный дар не угас'];
  n.push(pick(tips));
  S.news = n;
}

// ---------- действия: рынок ----------
function buy(uid, discountPct = 0) {
  const c = S.market.find(x => x.uid === uid); if (!c) return;
  if (S.owned.length >= S.capacity) { sfx('bad'); return toast('В поместье нет свободных мест (' + S.capacity + ').'); }
  const cost = Math.round(price(c) * (1 - discountPct / 100));
  if (S.gold < cost) { sfx('bad'); return toast('Не хватает монет: нужно ' + fmt(cost) + '.'); }
  S.gold -= cost;
  S.market = S.market.filter(x => x !== c);
  c.priceAdj = 1; c.haggleLock = false; c.discount = 0; c.bargain = false; c.task = 'rest'; c.boughtFor = cost;
  S.owned.push(c); supplyShock(c.race, 0.02);
  addLog(`Куплен${g(c, '', 'а')} ${c.name} за ${fmt(cost)} мон.`);
  toast(`${fn1(c)} теперь живёт в вашем поместье.`); sfx('buy');
  save(); openCard(c.uid, 'owned');
}
function sell(uid, markupPct = 0) {
  const c = findOwned(uid); if (!c) return;
  if (c.status !== 'home') return toast('Сначала дождитесь, пока закончится заказ.');
  if (c.preg) return toast('Её никто не купит, пока она в положении — да и вы бы не стали.');
  const got = Math.round(sellPrice(c) * (1 + markupPct / 100));
  S.gold += got; S.totalEarned += got;
  S.owned = S.owned.filter(x => x !== c); supplyShock(c.race, -0.03);
  addLog(`Продан${g(c, '', 'а')} ${c.name} за ${fmt(got)} мон.`);
  toast(`Сделка закрыта: +${fmt(got)} мон.`); sfx('sell');
  save(); go('manor');
}
function haggleChance(p, c) {
  if (p <= 0) return 1;
  // торг легче при высокой репутации и при высоком Обаянии лучшего торговца в поместье
  const bestCha = Math.max(0, ...S.owned.map(x => eff(x, 'cha')));
  return clamp(1 - Math.pow(p / 30, 1.2) * 0.9 + S.rep / 300 + bestCha / 600, 0.03, 0.98);
}
function chanceWord(p) { return p >= 0.85 ? 'почти наверняка' : p >= 0.6 ? 'скорее да' : p >= 0.35 ? 'рискованно' : 'вряд ли'; }
function appraise(uid) {
  const c = findAny(uid); if (!c || c.appraised) return;
  if (S.gold < S.appraiseCost) { sfx('bad'); return toast('Оценщику нужно ' + S.appraiseCost + ' мон.'); }
  S.gold -= S.appraiseCost; c.appraised = true; sfx('coin');
  toast('Оценщик раскрыл скрытый потенциал.'); save(); render();
}

// ---------- забота и строгость ----------
function act(uid, kind) {
  const c = findOwned(uid); if (!c) return;
  let msg = '';
  const m = mood(c);
  switch (kind) {
    case 'praise': {
      if (c.praisedDay === S.day) return toast('Сегодня уже хвалили — второй раз прозвучит неискренне.');
      c.praisedDay = S.day;
      const base = (c.goodDeed ? 5 : 2) * (m >= 50 ? 1 : 0.6);
      const v = loyaltyGain(c, base); c.moodMod += 6; c.stress = clamp(c.stress - 3);
      msg = c.goodDeed ? `${fn1(c)} сияет: похвала заслуженная. Лояльность +${v}.` : `${fn1(c)} улыбается. Лояльность +${v}${m < 50 ? ' (в плохом настроении похвала действует слабее)' : ''}.`;
      react(c, 'smile', gx(c, c.goodDeed ? 'Спасибо, {х}! Я так старал{ся|ась}!' : toneOf(c) === 'sullen' ? '*кланяется* Благодарю, {х}.' : 'Благодарю, {х}! Я буду стараться ещё больше.'));
      c.goodDeed = false; sfx('sparkle');
      break;
    }
    case 'gift': {
      if (S.gold < 60) { sfx('bad'); return toast('На подарок нужно 60 мон.'); }
      if (c.giftDay === S.day) return toast('Подарки каждый час обесценивают подарки. Завтра.');
      S.gold -= 60; c.giftDay = S.day;
      const v = loyaltyGain(c, c.loyalty < 30 ? 8 : 6); c.moodMod += 15;
      msg = `Подарок пришёлся по душе. Лояльность +${v}, настроение +15.`;
      react(c, 'blush', gx(c, toneOf(c) === 'sullen' ? '*удивлённо поднимает глаза* Это мне, {х}?.. Спасибо.' : 'Это… мне, {х}? Спасибо! Я не подведу.')); sfx('coin');
      break;
    }
    case 'scold': {
      if (c.disciplineDay === S.day) return toast('На сегодня строгости достаточно.');
      c.disciplineDay = S.day; c.misdeed = hasFault(c);
      let d = c.misdeed ? 20 : 12, l = c.misdeed ? 0 : -8;
      if (c.race === 'dwarf' || has(c, 'stubborn')) d /= 2;
      d = Math.round(d * (1 - eff(c, 'wil') / 250));
      if (c.race === 'beast') l -= 3;
      if (c.loyalty >= 70 && c.misdeed) l += 1;
      c.discipline = clamp(c.discipline + d); const st = stressGain(c, 10); loyaltyGain(c, l);
      msg = c.misdeed ? `Выговор по делу. Дисциплина +${d}, стресс +${st}.` : `Выговор без повода: дисциплина +${d}, но лояльность ${l}. Обидно.`;
      react(c, 'back', gx(c, c.misdeed ? '{Понял|Поняла}, {х}. Простите, я исправлюсь…' : '*опускает голову* Простите, {х}… я не понимаю, в чём провинил{ся|ась}.')); sfx('bad');
      resolveFault(c);
      break;
    }
    case 'nosweets': {
      if (c.disciplineDay === S.day) return toast('На сегодня строгости достаточно.');
      c.disciplineDay = S.day; c.misdeed = hasFault(c);
      let d = 8; if (c.race === 'dwarf' || has(c, 'stubborn')) d = 4;
      const l = c.misdeed ? -1 : -5;
      c.discipline = clamp(c.discipline + d); c.moodMod -= has(c, 'gourmet') ? 25 : 12; loyaltyGain(c, l);
      msg = `Без десерта на ужин. Дисциплина +${d}, настроение снизилось, лояльность ${l}.`;
      react(c, 'frown', gx(c, '*вздыхает* Как скажете, {х}…')); sfx('bad');
      resolveFault(c);
      break;
    }
    case 'healer': {
      if (S.gold < HEALER_COST) { sfx('bad'); return toast('Лекарю нужно ' + HEALER_COST + ' мон.'); }
      if (c.health >= 100 && !c.sickDays) return toast(fn1(c) + ' и так здоров' + g(c, '', 'а') + '.');
      const wasSick = c.sickDays > 0;
      S.gold -= HEALER_COST; c.health = clamp(c.health + 40); c.sickDays = 0;
      msg = `Лекарь осмотрел ${fn1(c)}: здоровье +40${wasSick ? ', хворь прошла' : ''}.`;
      react(c, 'smile', gx(c, 'Мне уже лучше. Спасибо, {х}!')); sfx('coin');
      break;
    }
  }
  toast(msg); save(); render();
}

// Погладить по голове: приятно, если есть доверие. С каждым разом за день эффект слабее.
const PET_LINES = {
  beast: ['Мр-р-р… спасибо, {х}…', 'Мрр… ещё, пожалуйста, {х}…', 'Мур-р… вот тут, за ушком, {х}…', '*довольно жмурится*'],
  other: ['М-м… как спокойно, {х}…', 'Спасибо, {х}.', '*прикрывает глаза*'],
  tired: ['Спасибо, {х}… на сегодня довольно, если позволите.', 'Причёска растреплется, {х}… но как скажете.'],
  shy: ['*съёживается* Простите, {х}…', '…Да, {х}.', 'Как прикажете, {х}.'],
};
function setTask(uid, task) {
  const c = findOwned(uid); if (!c || c.status !== 'home') return;
  if (assignTask(c, task)) { save(); render(); }
}
function setTrainStat(uid, k) { const c = findOwned(uid); if (c) { c.trainStat = k; save(); render(); } }
function freeChar(uid, ransom) {
  const c = findOwned(uid); if (!c) return;
  if (c.status !== 'home') return toast('Сначала дождитесь, пока закончится заказ.');
  let txt;
  for (const it of c.gear) S.stash.push(it); c.gear = [];
  if (ransom) {
    const r = Math.round(price(c) * 0.4); S.gold += r; S.rep += 4;
    txt = `${c.name} внес${g(c, '', 'ла')} выкуп ${fmt(r)} мон. и уш${g(c, 'ёл', 'ла')} вольным человеком. Репутация +4. Снаряжение вернулось в сундук.`;
  } else {
    const rp = 8 + Math.round(c.loyalty / 20); S.rep += rp;
    txt = `${c.name} получил${g(c, '', 'а')} вольную. В городе о вас говорят с теплом. Репутация +${rp}. Снаряжение вернулось в сундук.`;
  }
  S.owned = S.owned.filter(x => x !== c);
  addLog(txt); toast(txt); save(); go('manor');
}

// ---------- снаряжение: действия ----------
function findGear(iid) {
  for (const c of S.owned) { const it = c.gear.find(x => x.iid === iid); if (it) return { it, c }; }
  const it = S.stash.find(x => x.iid === iid); if (it) return { it, c: null };
  return null;
}
function unequip(iid) {
  const f = findGear(iid); if (!f || !f.c) return;
  f.c.gear = f.c.gear.filter(x => x !== f.it); S.stash.push(f.it); syncLook(f.c);
  toast(`${gearName(f.it)} — в сундуке.`); sfx('pop'); save(); render();
}
function giveGear(iid, uid) {
  const f = findGear(iid), to = findOwned(uid); if (!f || !to) return;
  if (gearFem(f.it) && to.g === 'm') { sfx('bad'); return toast('Это женская вещь — ' + fn1(to) + ' её не наденет.'); }
  if (f.c) { f.c.gear = f.c.gear.filter(x => x !== f.it); syncLook(f.c); } else S.stash = S.stash.filter(x => x !== f.it);
  const old = equip(to, f.it);
  closeModal();
  toast(`${fn1(to)}: надет${f.it.kind === 'outfit' ? '' : 'о'} «${gearName(f.it, to)}»${old ? `, «${gearName(old, to)}» — в сундук` : ''}.${gearShows(to, f.it) || (f.it.kind === 'acc' && !gearSlot(f.it).match(/legs/)) ? '' : ' (на портрете не видно — только бонусы)'}`);
  react(to, OUTFIT_SHY[f.it.base] ? 'blush' : 'smile', gx(to, pick(OUTFIT_SHY[f.it.base] ? OUTFIT_SHY_L : OUTFIT_OK_L)), 2600); sfx('sparkle');
  save(); render();
}
function repairGear(iid) {
  const f = findGear(iid); if (!f) return;
  const cost = repairCost(f.it); if (!cost) return;
  if (S.gold < cost) { sfx('bad'); return toast('Починка стоит ' + cost + ' мон.'); }
  S.gold -= cost; f.it.dur = f.it.maxDur; sfx('coin');
  toast(`Починено: ${gearName(f.it)} (−${cost} мон.).`); save(); render();
}
function sellGear(iid) {
  const it = S.stash.find(x => x.iid === iid); if (!it) return;
  const v = Math.round(gearVal(it) * 0.6);
  S.stash = S.stash.filter(x => x !== it); S.gold += v; sfx('sell');
  toast(`Старьёвщик забрал «${gearName(it)}» за ${v} мон.`); save(); render();
}
function buyGear(iid) {
  const it = S.gearShop.find(x => x.iid === iid); if (!it) return;
  const cost = Math.round(gearVal(it) * 1.3);
  if (S.gold < cost) { sfx('bad'); return toast('Не хватает монет.'); }
  S.gold -= cost; S.gearShop = S.gearShop.filter(x => x !== it); S.stash.push(it); sfx('buy');
  toast(`Куплено: ${gearName(it)}. Лежит в сундуке — выберите, кому надеть.`); save(); render();
  if (S.owned.length) setTimeout(() => gearToCharModal(it.iid), 250);
}

// ---------- предметы ----------
function buyItem(id) {
  const it = ITEMS[id];
  if (S.gold < it.price) { sfx('bad'); return toast('Не хватает монет.'); }
  S.gold -= it.price; S.inv[id] = (S.inv[id] || 0) + 1; sfx('coin');
  toast(`Куплено: ${it.name}.`); save(); render();
}
function useItem(id, uid) {
  const c = findOwned(uid); if (!c || !(S.inv[id] > 0)) return;
  let msg = '';
  const sweet = has(c, 'gourmet') || c.preg ? 2 : 1;
  switch (id) {
    case 'gingerbread': c.moodMod += 15 * sweet; msg = 'Пряник съеден с явным удовольствием.'; react(c, 'smile', addr('М-м, медовый! Спасибо, {х}!')); break;
    case 'tea': c.stress = clamp(c.stress - 20); msg = 'Чай с мятой — стресс −20.'; react(c, 'smile', addr('Сразу легче… спасибо, {х}.')); break;
    case 'tonic': c.fatigue = clamp(c.fatigue - 35); msg = 'Эликсир бодрости — усталость −35.'; react(c, 'surprised', gx(c, 'Ух! Бодрит! Я готов{|а} работать, {х}!')); break;
    case 'salve': c.health = clamp(c.health + 30); c.sickDays = 0; msg = 'Целебная мазь: здоровье +30.'; react(c, 'smile', addr('Уже не болит. Спасибо, {х}.')); break;
    case 'pie': c.moodMod += 20 * (c.preg ? 1.5 : 1); c.stress = clamp(c.stress - 10); msg = 'Ягодный пирог — настроение +20, стресс −10.'; react(c, 'smile', addr('Как у бабушки! Спасибо, {х}!')); break;
    case 'book': c.stats[c.trainStat] = Math.min(c.pot[c.trainStat], c.stats[c.trainStat] + 3); msg = `Учебник: ${statName(c.trainStat)} +3 (до предела потенциала).`; react(c, 'neutral', addr('Я всё выучу, {х}.')); break;
    case 'blanket': { const v = loyaltyGain(c, 10); c.moodMod += 10; msg = `Пуховое одеяло — лояльность +${v}.`; react(c, 'blush', addr('Оно такое мягкое… Спасибо, {х}!')); break; }
    case 'amulet': c.pot.luk = clamp(c.pot.luk + 4); c.stats.luk = Math.min(c.pot.luk, c.stats.luk + 2); msg = 'Амулет удачи: Удача +2, потенциал +4.'; react(c, 'smile', addr('Буду беречь его, {х}!')); break;
  }
  if (c.crave && (c.crave === id || id === 'pie')) { c.moodMod += 10; msg += ' Прихоть утолена!'; c.crave = null; }
  S.inv[id]--; if (!S.inv[id]) delete S.inv[id];
  sfx('sparkle'); closeModal(); toast(msg); save(); render();
}

// ---------- деньги: займы и расширение ----------
function borrow(sum) {
  const limit = debtLimit();
  if (S.debt + sum > limit) { sfx('bad'); return toast(`Гоблин качает головой: больше ${fmt(limit)} мон. долга он не даст.`); }
  S.debt += sum; S.gold += sum; sfx('coin');
  addLog(`Взят заём ${fmt(sum)} мон. у гоблина-ростовщика.`);
  toast(`+${fmt(sum)} мон. Проценты: 2% в день от долга.`); save(); render();
}
const debtLimit = () => 1500 + 1000 * rankIdx();
function repay(sum) {
  sum = Math.min(sum, S.debt, Math.max(0, S.gold));
  if (sum <= 0) return toast('Нечем гасить.');
  S.debt -= sum; S.gold -= sum; sfx('coin');
  toast(S.debt ? `Погашено ${fmt(sum)} мон. Осталось ${fmt(S.debt)}.` : 'Долг погашен полностью!'); save(); render();
}
function expand() {
  const e = EXPAND.find(x => x.cap > S.capacity); if (!e) return;
  if (rankIdx() < e.rank) return toast(`Нужен ранг гильдии ${RANKS[e.rank].key}.`);
  if (S.gold < e.cost) { sfx('bad'); return toast(`Нужно ${fmt(e.cost)} мон.`); }
  S.gold -= e.cost; S.capacity = e.cap; sfx('buy');
  addLog(`Поместье расширено до ${e.cap} мест.`); toast(`Плотники пристроили флигель: теперь ${e.cap} мест.`); save(); render();
}

// ---------- «Спарить»: свидание пары и беременность ----------
function isKin(a, b) {
  return (a.kin || []).includes(b.uid) || (b.kin || []).includes(a.uid) || !!(a.kin && b.kin && a.kin.some(u => b.kin.includes(u)));
}
function mateCheck(a, b) {
  if (a.g === b.g) return { ok: false, why: 'Нужна пара мужчины и женщины.' };
  const f = a.g === 'f' ? a : b;
  if (a.status !== 'home' || b.status !== 'home') return { ok: false, why: 'Кто-то из пары сейчас на заказе.' };
  if (isKin(a, b)) return { ok: false, why: 'Они родня — это невозможно.' };
  if (f.preg) return { ok: false, why: `${fn1(f)} уже в положении.` };
  if (f.mateDay === S.day) return { ok: false, why: `${fn1(f)} сегодня уже была на свидании — только раз в день.` };
  if (S.owned.length + S.owned.filter(x => x.preg).length >= S.capacity) return { ok: false, why: 'В поместье нет места для будущего наследника — сначала расширьте дом.' };
  return { ok: true };
}
function mateInfo(a, b) {
  const f = a.g === 'f' ? a : b, m = a.g === 'm' ? a : b;
  const h = compatHint(a, b);
  const avgMood = (mood(a) + mood(b)) / 2, avgLoy = (a.loyalty + b.loyalty) / 2, avgHp = (a.health + b.health) / 2;
  const willing = clamp(0.3 + h.lvl * 0.2 + (avgMood - 50) / 120 + (avgLoy - 40) / 150, 0.1, 0.98);
  const preg = clamp(0.15 + f.breed.fert / 100 * 0.35 + m.breed.line / 100 * 0.2 + (avgHp - 70) / 300 + (avgMood - 50) / 250 + h.lvl * 0.05 + (season().fert || 0) - (m.fatigue > 70 ? 0.08 : 0), 0.05, 0.9);
  const hw = inHeat(f) ? 0.2 : 0, hp = inHeat(f) ? 0.15 : 0;
  return { f, m, h, willing: clamp(willing + hw, 0.1, 0.98), preg: clamp(preg + hp, 0.05, 0.9) };
}
function snapOf(c) { return JSON.parse(JSON.stringify({ uid: c.uid, name: c.name, preset: c.preset, race: c.race, g: c.g, rarity: c.rarity, pot: c.pot, traits: c.traits, breed: c.breed, kin: c.kin || [] })); }
function mate(aUid, bUid) {
  const a = findOwned(aUid), b = findOwned(bUid);
  const chk = mateCheck(a, b); if (!chk.ok) return toast(chk.why);
  const { f, m, willing, preg } = mateInfo(a, b);
  closeModal();
  f.mateDay = S.day;
  if (R() > willing) {
    loyaltyGain(a, -1); loyaltyGain(b, -1); stressGain(a, 4); stressGain(b, 4);
    addLog(`${fn1(f)} и ${fn1(m)}: свидание не сложилось.`);
    sfx('bad');
    showModal('Не сложилось', `<p>Вечер не задался: ${esc(fn1(f))} и ${esc(fn1(m))} поговорили о погоде и разошлись по комнатам.</p><p class="muted small">Шанс согласия был ${Math.round(willing * 100)}%: его поднимают взаимная симпатия, настроение и доверие к вам. ${esc(fn1(f))} сможет попробовать снова завтра.</p>`);
    save(); render(); return;
  }
  fatigueGain(m, 10); fatigueGain(f, 6); f.heatCare = S.day;
  a.moodMod += 8; b.moodMod += 8; a.stress = clamp(a.stress - 5); b.stress = clamp(b.stress - 5);
  const yes = R() < preg;
  if (yes) f.preg = { due: S.day + 9, start: S.day, father: snapOf(m) };
  addLog(`${fn1(f)} и ${fn1(m)} провели вечер вместе. ${yes ? 'Беременность!' : 'Без беременности.'}`);
  sfx(yes ? 'sparkle' : 'pop');
  showModal('Вечер вдвоём', `<div class="fade-scene"><p>Свечи догорают, ${esc(fn1(m))} тихо закрывает дверь…</p><p class="muted">…</p><p>Утром оба выглядят отдохнувшими и немного смущёнными.</p></div>
    <div class="preg-res ${yes ? 'yes' : 'no'}">Беременность: <b>${yes ? 'да' : 'нет'}</b></div>
    <p class="small">${yes ? `${esc(fn1(f))} будет в положении <b>9 дней</b>: работает вполсилы, не ходит на заказы, ест больше и иногда просит сладкого. Потом в поместье появится взрослый наследник.` : `Шанс был ${Math.round(preg * 100)}%. ${esc(fn1(f))} сможет попробовать снова завтра, ${esc(fn1(m))} — хоть сегодня.`}</p>`);
  save(); render();
}

// Наследник: взрослый, похож на одного из родителей (тот же пресет), начинает со слабыми навыками
function makeHeir2(mother, father) {
  // от анонимного гостя салона — всегда похож на мать
  const look = father.anon || father.uid === 'client' ? mother : R() < 0.5 ? mother : father;
  const rarity = clamp(Math.max(mother.rarity, father.rarity) - (R() < 0.6 ? 1 : 0) + (R() < 0.08 ? 1 : 0), 0, 3);
  const child = makeCharacter({ preset: look.preset, rarity, loyalty: 70, noGear: true });
  const p = presetById(look.preset);
  const parentFirst = look.name.split(' ')[0];
  const usedN = new Set([...S.owned, ...S.market].map(x => x.name.split(' ')[0]));
  let names = p.names.filter(n => n !== parentFirst && n !== mother.name.split(' ')[0] && !usedN.has(n));
  if (!names.length) names = p.names.filter(n => n !== parentFirst);
  child.name = pick(names.length ? names : p.names) + ' ' + mother.name.split(' ').slice(1).join(' ');
  { const base = child.name; let k = 2; const taken = n => [...S.owned, ...(window._newborn || [])].some(x => x.name === n); while (taken(child.name)) child.name = base + ' ' + ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.min(k++, 7)]; (window._newborn = window._newborn || []).push(child); }
  for (const s of STATS) child.stats[s.key] = clamp(rint(4, 12) + Math.round((RACES[child.race].mods[s.key] || 0) / 2), 3, 20);
  const pool = [];
  for (const s of STATS) { pool.push({ k: s.key, v: mother.pot[s.key] }); pool.push({ k: s.key, v: father.pot[s.key] }); }
  const quality = ((mother.breed.mat || 50) + (father.breed.her || 50)) / 200;
  pool.sort((x, y) => y.v - x.v);
  const taken = new Set(); child.inherited = [];
  while (child.inherited.length < 3) {
    const left = pool.filter(p => !taken.has(p.k));
    const cand = R() < quality ? left[0] : pick(left);
    taken.add(cand.k); child.pot[cand.k] = Math.max(child.pot[cand.k], cand.v); child.inherited.push(cand.k);
  }
  // полукровка: если раса отца другая — половина его расовых бонусов к потенциалу
  if (father.race && father.race !== child.race && RACES[father.race]) {
    child.mix = father.race;
    for (const [k, v] of Object.entries(RACES[father.race].mods || {})) if (v > 0) child.pot[k] = clamp(child.pot[k] + Math.round(v / 2), 0, 100);
  }
  // гены анонимного отца: ещё один случайный потенциал повыше и случайная черта
  if (father.anon) { const k = pick(STATS).key; child.pot[k] = clamp(child.pot[k] + rint(4, 12), 0, 100); }
  const pTraits = shuffle([...new Set([...mother.traits, ...father.traits])]).slice(0, rint(1, 2));
  child.traits = [...new Set([...pTraits, ...child.traits])].slice(0, 3);
  if (child.traits.includes('cheerful') && child.traits.includes('sensitive')) child.traits.splice(child.traits.indexOf('sensitive'), 1);
  if (child.traits.includes('diligent') && child.traits.includes('lazy')) child.traits.splice(child.traits.indexOf('lazy'), 1);
  child.title = g(child, 'Наследник рода', 'Наследница рода');
  child.parents = [mother.name, father.name];
  child.kin = [mother.uid, father.uid, ...(mother.kin || []), ...(father.kin || [])];
  child.age = child.race === 'elf' ? rint(60, 70) : child.race === 'dwarf' ? rint(30, 34) : rint(19, 21);
  child.appraised = true; child.growth = 12; child.stress = 5; child.fatigue = 0; child.health = 100; child.discipline = 25;
  child.look = look === mother ? 'mother' : 'father';
  // одежда — от родителя, но другая, чем у него сейчас
  const arts = OUTFIT_ART[child.preset];
  const parentOutfit = (look.gear || []).find(i => i.kind === 'outfit');
  // наследники никогда не появляются раздетыми: всегда есть повседневный наряд
  let choices = (arts || []).filter(o => OUTFITS_CLASSIC.includes(o) && (!parentOutfit || o !== parentOutfit.base));
  if (!choices.length) choices = (arts || []).filter(o => OUTFITS_CLASSIC.includes(o));
  if (!choices.length) choices = OUTFITS_CLASSIC.filter(o => OUTFITS[o] && !OUTFITS[o].fem && !OUTFIT_SHY[o]);
  child.gear.push(makeGear('outfit', pick(choices), 0));
  child.gear.push(makeGear('acc', pick(['flower', 'bow', 'scarf', 'wreath']), 0));
  syncLook(child);
  return child;
}
function makeHeirLegacy(birth) {
  const [f, m] = birth.snap;
  return makeHeir2(f, m);
}

// ---------- заказы ----------
function orderChance(c, o) {
  const t = ORDER_TEMPLATES[o.tpl];
  const score = eff(c, t.stat) + 0.5 * eff(c, t.stat2 || t.stat);
  let p = 0.5 + (score - t.min * 1.5) / 70 + eff(c, 'luk') / 400 - c.fatigue / 300 + (mood(c) - 50) / 400 + (gb(c).order || 0) / 100;
  if (has(c, 'lucky')) p += 0.1;
  if (c.stress > 70) p -= 0.08;
  if (c.health < 50) p -= 0.1;
  return clamp(p, 0.05, 0.97);
}
function critChance(c) { return clamp(eff(c, 'luk') / 250 + (has(c, 'lucky') ? 0.08 : 0), 0, 0.5); }
function assignOrder(oid, uid) {
  const o = S.orders.find(x => x.id === oid), c = findOwned(uid);
  if (!o || !c || c.status !== 'home') return;
  if (c.preg) return toast('В положении на заказы не ходят.');
  o.assigned = uid; o.daysLeft = ORDER_TEMPLATES[o.tpl].days;
  c.status = 'order'; c.orderId = oid;
  closeModal();
  toast(`${fn1(c)} отправил${g(c, 'ся', 'ась')} выполнять заказ.`);
  save(); render();
}

// ---------- события дня ----------
const EVENTS = [
  { id: 'fair', w: 1, run() { S.flags.fair = true; return 'Завтра в Медовом Логе базарный день! Спрос на рынке вырастет на 20%.'; } },
  { id: 'tax', w: 1, run() { const t = Math.max(50, Math.round(Math.max(0, S.gold) * 0.05)); S.gold -= t; return `Заглянул сборщик податей с толстой книгой. Пришлось отдать ${fmt(t)} мон.`; } },
  { id: 'scholar', w: 1, need: 1, run() { const c = pick(homeChars()); const v = eff(c, 'int') > 40 ? 4 : 2; c.stats.int = Math.min(c.pot.int, c.stats.int + v); return `Странствующий учёный полдня спорил с ${fn1(c)} о звёздах. Ум +${v} (смышлёные усваивают больше).`; } },
  { id: 'quarrel', w: 1, need: 2, run() { const [a, b] = shuffle(homeChars()); if (mood(a) > 70 && mood(b) > 70) return `${fn1(a)} и ${fn1(b)} чуть не поругались из-за булочки, но в хорошем настроении — рассмеялись и поделили.`; const x = stressGain(a, 15), y = stressGain(b, 15); return `${fn1(a)} и ${fn1(b)} поругались из-за последней булочки. Стресс +${x} и +${y} (Воля смягчает).`; } },
  { id: 'song', w: 1, need: 1, run() { homeChars().forEach(c => c.stress = clamp(c.stress - 10)); return 'Вечером все собрались у камина и пели старые песни. Стресс у всех −10.'; } },
  { id: 'cold', w: 1, need: 1, run() { const c = pick(homeChars()); if (has(c, 'hardy') || R() < eff(c, 'end') / 120) return `${fn1(c)} промок${g(c, '', 'ла')} под дождём, но крепкое здоровье выручило.`; c.health = clamp(c.health - 20); c.sickDays = 2; return `${fn1(c)} простудил${g(c, 'ся', 'ась')}: здоровье −20, два дня постельного режима. Лекарь или мазь помогут быстрее.`; } },
  { id: 'wallet', w: 1, need: 1, run() { const c = pick(homeChars()); const v = rint(50, 150) + eff(c, 'luk'); if (c.loyalty >= 55) { S.gold += v; c.goodDeed = true; return `${fn1(c)} наш${g(c, 'ёл', 'ла')} на дороге кошелёк и честно принес${g(c, '', 'ла')} вам. +${v} мон.`; } return 'Кто-то в поместье нашёл кошелёк… но вам о нём, кажется, не рассказали (лояльность ниже 55).'; } },
  { id: 'escape', w: 2, need: 1, cond: () => homeChars().some(c => c.loyalty < 20 && !c.preg), run() { const c = homeChars().filter(c => c.loyalty < 20 && !c.preg)[0]; if (c.discipline > 50 || R() < eff(c, 'wil') / 200) { addFault(c, 'disobey', 'пытал' + g(c, 'ся', 'ась') + ' сбежать ночью'); return `${fn1(c)} собрал${g(c, '', 'а')} узелок и почти ${g(c, 'ушёл', 'ушла')} ночью, но передумал${g(c, '', 'а')} у ворот. Есть повод поговорить.`; } S.owned = S.owned.filter(x => x !== c); return `${c.name} сбежал${g(c, '', 'а')} ночью вместе со всем снаряжением. Низкая лояльность — тревожный знак.`; } },
  { id: 'admirer', w: 1, need: 1, run() { const c = pick(homeChars()); c.moodMod += 20; return `${fn1(c)} получил${g(c, '', 'а')} анонимную записку с ромашкой. Настроение +20.`; } },
  { id: 'rain', w: 1, run() { S.flags.rain = true; return 'Над городом зарядили ливни. Завтра покупателей будет меньше: спрос −15%.'; } },
  { id: 'peddler', w: 1, run() { if (R() < 0.5) { const it = makeGear('acc', pick(Object.keys(ACCESSORIES)), rollQ(0.1)); it.dur = Math.round(it.maxDur * 0.6); S.stash.push(it); return `Бродячий торговец расплатился за ночлег: ${gearName(it)} (в сундуке).`; } const id = pick(Object.keys(ITEMS)); S.inv[id] = (S.inv[id] || 0) + 1; return `Бродячий торговец расплатился за ночлег: ${ITEMS[id].name}.`; } },
  { id: 'guild', w: 1, run() { S.rep += 3; return 'Гильдия купцов отметила вашу лавку в ежемесячном листке. Репутация +3.'; } },
  { id: 'mouse', w: 1, run() { if (S.inv.gingerbread) { S.inv.gingerbread--; if (!S.inv.gingerbread) delete S.inv.gingerbread; return 'В кладовой завелась мышь и утащила медовый пряник.'; } return 'В кладовой завелась мышь, но, не найдя пряников, обиженно ушла.'; } },
  { id: 'thanks', w: 1, need: 1, cond: () => homeChars().some(c => c.loyalty >= 75), run() { const c = homeChars().filter(c => c.loyalty >= 75)[0]; const v = rint(40, 120); S.gold += v; return `${fn1(c)} отложил${g(c, '', 'а')} чаевые с работы и отдал${g(c, '', 'а')} их в общую кассу. +${v} мон.`; } },
  { id: 'stars', w: 1, need: 1, run() { const c = pick(homeChars()); c.pot.luk = clamp(c.pot.luk + 5); return `${fn1(c)} загадал${g(c, '', 'а')} желание на падающую звезду. Потенциал удачи +5.`; } },
  { id: 'regular', w: 1, need: 1, cond: () => homeChars().some(c => c.task === 'shop'), run() { const c = homeChars().filter(c => c.task === 'shop').sort((a, b) => eff(b, 'cha') - eff(a, 'cha'))[0]; const v = 20 + eff(c, 'cha'); S.gold += v; return `У прилавка ${fn1(c)} появился постоянный покупатель — очарован${g(c, '', '')} обаянием. +${v} мон.`; } },
  { id: 'tear', w: 1, need: 1, cond: () => S.owned.some(c => c.gear.length), run() { const c = pick(S.owned.filter(c => c.gear.length)); const it = pick(c.gear); it.dur = Math.max(0, it.dur - 10); return `${fn1(c)} зацепил${g(c, 'ся', 'ась')} за гвоздь: «${gearName(it)}» сильно износилось (прочность −10).`; } },
];
function rollEvent() {
  const pool = EVENTS.filter(e => (!e.need || homeChars().length >= e.need) && (!e.cond || e.cond()));
  const total = pool.reduce((a, e) => a + e.w, 0);
  let x = R() * total;
  for (const e of pool) { x -= e.w; if (x <= 0) return e; }
  return pool[0];
}
function wearGear(c) {
  for (const it of c.gear) if (it.dur > 0) { it.dur--; if (it.dur === 0) addLog(`${fn1(c)}: «${gearName(it)}» износилось — бонусы пропали, нужна починка.`); }
}

// ---------- завершение дня ----------
function endDay() {
  window._newborn = [];
  const lines = [];
  let income = 0;
  const before = S.gold;
  const ev0 = mev();
  S.flags = {};
  for (const [c, r] of applyAuto()) lines.push(`⚙ Авто: ${fn1(c)} — ${TASKS[r.task].toLowerCase()} (${r.why}).`);
  for (const c of S.owned.slice()) {
    const n = fn1(c);
    const b = gb(c);
    if (c.status === 'order') {
      const o = S.orders.find(x => x.id === c.orderId);
      fatigueGain(c, 12); stressGain(c, 6); wearGear(c);
      if (!o) { c.status = 'home'; continue; }
      o.daysLeft--;
      if (o.daysLeft > 0) lines.push(`${n} выполняет заказ «${ORDER_TEMPLATES[o.tpl].title}», осталось ${dn(o.daysLeft)}.`);
      if (o.daysLeft <= 0) {
        const t = ORDER_TEMPLATES[o.tpl];
        if (R() < orderChance(c, o)) {
          const crit = R() < critChance(c);
          const rw = Math.round(o.reward * (crit ? 1.5 : 1));
          S.gold += rw; income += rw; S.rep += crit ? 3 : 2; c.goodDeed = true; loyaltyGain(c, 2);
          c.stats[t.stat] = Math.min(c.pot[t.stat], c.stats[t.stat] + 2);
          lines.push(`+ ${n}: заказ «${t.title}» выполнен${crit ? ' блестяще (Удача!)' : ''}. +${fmt(rw)} мон., репутация +${crit ? 3 : 2}.`);
        } else {
          const half = Math.round(o.reward * 0.25); S.gold += half; income += half; addFault(c, 'work', 'провалил' + g(c, '', 'а') + ' заказ «' + t.title + '»'); stressGain(c, 10);
          lines.push(`− ${n}: заказ «${t.title}» провален. Заказчик заплатил только ${half} мон.`);
        }
        S.orders = S.orders.filter(x => x !== o);
        c.status = 'home'; c.orderId = null;
      }
      continue;
    }
    let task = c.task;
    if (c.sickDays > 0) { c.sickDays--; task = 'rest'; lines.push(`${n} болеет и сегодня отдыхает.`); }
    else if (c.health < 30 && task !== 'rest') { task = 'rest'; lines.push(`${n} слишком плохо себя чувствует — сегодня вместо дел отдых.`); }
    if (task === 'salon') { const so = salonOk(c); if (!so.ok) { task = 'rest'; lines.push(`${n} не пош${g(c, 'ёл', 'ла')} в салон (${so.block || 'нет согласия: охота ' + so.will + ' из ' + SALON_NEED}) — сегодня отдых.`); } }
    const failP = failChance(c, task), fail = R() < failP;
    if (task === 'salon') { income += salonWork(c, fail, failP, lines); }
    else if (task === 'craft' || task === 'shop') {
      const inf = incomeInfo(c, task);
      if (task === 'craft') { fatigueGain(c, 18); stressGain(c, c.race === 'elf' ? 15 : 10); }
      else { fatigueGain(c, 14); stressGain(c, 12); }
      wearGear(c);
      if (fail) { const pv = Math.round(inf.v * 0.3); S.gold += pv; income += pv; addFault(c, 'work', task === 'craft' ? 'испортил' + g(c, '', 'а') + ' заготовку' : 'обсчитал' + g(c, 'ся', 'ась') + ' у прилавка'); stressGain(c, 5); lines.push(`− ${n} ${task === 'craft' ? 'испортил' + g(c, '', 'а') + ' заготовку' : 'обсчитал' + g(c, 'ся', 'ась') + ' у прилавка'} (шанс был ${Math.round(failP * 100)}%). Спасли лишь +${pv} мон.`); }
      else {
        let v = inf.v;
        if (task === 'shop' && R() < eff(c, 'luk') / 300) { v = Math.round(v * 1.6); lines.push(`${n} провёл${g(c, '', 'а')} удачную сделку!`); }
        S.gold += v; income += v;
        const k = task === 'craft' ? pick(['mas', 'str']) : pick(['cha', 'int']);
        if (R() < 0.3) c.stats[k] = Math.min(c.pot[k], c.stats[k] + 1);
        lines.push(`${n}: ${task === 'craft' ? 'ремесло' : 'торговля'} +${v} мон. (×${inf.mult.toFixed(2)})`);
      }
    } else if (task === 'train') {
      if (S.gold < TRAIN_COST) { lines.push(`На учёбу ${n} не хватило монет — сегодня отдых.`); c.fatigue = clamp(c.fatigue - 35); c.stress = clamp(c.stress - 20); }
      else {
        S.gold -= TRAIN_COST; income -= TRAIN_COST;
        fatigueGain(c, 15); stressGain(c, 8);
        if (fail) { addFault(c, 'lazy', 'отвлекал' + g(c, 'ся', 'ась') + ' на уроке'); lines.push(`− ${n} отвлекал${g(c, 'ся', 'ась')} на уроке (шанс был ${Math.round(failP * 100)}%). Навык не вырос (−${TRAIN_COST} мон.).`); }
        else {
          const k = c.trainStat, room = c.pot[k] - c.stats[k];
          let gain = room <= 0 ? 0 : Math.max(1, Math.round(rint(2, 5) * Math.min(1, room / 15) * trainInfo(c).mult));
          gain = Math.min(gain, room);
          c.stats[k] += gain;
          lines.push(gain > 0 ? `${n} учил${g(c, 'ся', 'ась')}: ${statName(k)} +${gain} (−${TRAIN_COST} мон.).` : `${n} упёрся в предел потенциала по навыку «${statName(k)}».`);
        }
      }
    } else {
      c.fatigue = clamp(c.fatigue - (c.race === 'beast' ? 60 : 35)); c.stress = clamp(c.stress - 20);
      c.health = clamp(c.health + 10);
    }
    if (c.fatigue >= 90) { c.health = clamp(c.health - 10); lines.push(`! ${n} валится с ног от усталости: здоровье −10.`); }
  }
  // ежедневные эффекты: снаряжение, сезон, беременность, рост наследников, болезни
  for (const c of S.owned) {
    const b = gb(c);
    if (b.hp) c.health = clamp(c.health + b.hp);
    if (b.calm) c.stress = clamp(c.stress - b.calm);
    if (season().stress) stressGain(c, season().stress);
    if (evNum('sick') && !has(c, 'hardy') && R() < evNum('sick') * (1.5 - c.health / 100)) { c.sickDays = 2; c.health = clamp(c.health - 15); lines.push(`! ${fn1(c)} подхватил${g(c, '', 'а')} хворь: здоровье −15.`); }
    if (c.growth > 0) {
      c.growth--;
      const k = pick(STATS).key; if (c.stats[k] < c.pot[k]) c.stats[k]++;
    }
    if (c.preg) {
      if (!c.crave && R() < 0.35) { c.crave = pick(['pie', 'gingerbread']); lines.push(`${fn1(c)} просит ${c.crave === 'pie' ? 'ягодного пирога' : 'медового пряника'} — без него настроение хуже.`); }
    }
  }
  // содержание (проценты по долгу не списываются из кассы, а прибавляются к долгу)
  const up = upkeep();
  const cash = up.total - up.interest;
  if (cash) { S.gold -= cash; income -= cash; }
  if (cash || up.interest)
    lines.push(`Содержание: еда ${up.food}, жильё ${up.house}${up.heat ? `, дрова ${up.heat}` : ''} — итого −${cash} мон.${up.interest ? ` Проценты по долгу: +${up.interest} к долгу.` : ''}`);
  S.debt += up.interest;
  // настроение и лояльность
  for (const c of S.owned) {
    c.moodMod = Math.round(c.moodMod * 0.6);
    const m = mood(c);
    if (m >= 70) loyaltyGain(c, 1); else if (m < 35) loyaltyGain(c, -2);
    if (c.stress > 80) loyaltyGain(c, -1);
    c.discipline = clamp(c.discipline - 2);
    if ((c.aff || 0) > 30 && (!c.touch || c.touch.day !== S.day) && c.closeDay !== S.day) c.aff = clamp(c.aff - 1);
  }
  rollFaults(lines);
  heatEndDay(lines);
  // рождения
  for (const c of S.owned.slice()) {
    if (c.preg && c.preg.due <= S.day + 1) {
      const child = makeHeir2(c, c.preg.father);
      const fatherName = c.preg.father.uid === 'player' ? 'вас' : c.preg.father.anon ? 'неизвестного гостя салона' : c.preg.father.name.split(' ')[0];
      c.preg = null; c.crave = null; c.moodMod += 20; loyaltyGain(c, 5);
      S.owned.push(child);
      lines.push(`★ Феи Приюта Ростков сдержали слово: в поместье пришл${g(child, 'ёл', 'а')} ${child.name} — взросл${g(child, 'ый наследник', 'ая наследница')} ${fn1(c)} и ${fatherName}. Похож${g(child, '', 'а')} на ${child.look === 'mother' ? 'мать' : 'отца'}.${child.mix ? ` Кровь отца — ${RACES[child.mix].name.toLowerCase()}: бонус к потенциалу.` : ''}`);
      if (S.owned.length > S.capacity) lines.push('! В поместье тесно: мест больше, чем положено. Расширьте дом или продайте кого-то.');
    }
  }
  for (const b of S.births.filter(b => b.due <= S.day + 1)) {
    const child = makeHeirLegacy(b);
    S.owned.push(child);
    lines.push(`★ Из Приюта Ростков пришл${g(child, 'ёл', 'а')} ${child.name} — взросл${g(child, 'ый наследник', 'ая наследница')} ${b.snap[0].name.split(' ')[0]} и ${b.snap[1].name.split(' ')[0]}.`);
  }
  S.births = S.births.filter(b => b.due > S.day + 1);
  // событие
  let ev = null;
  if (R() < 0.7) { const e = rollEvent(); if (e) ev = e.run(); }
  // долг: если касса ушла в минус — разницу забирает ростовщик под проценты
  if (S.gold < 0) {
    const d = -S.gold; S.debt += d; S.gold = 0; S.rep = Math.max(0, S.rep - 1);
    lines.push(`! Касса ушла в минус: гоблин-ростовщик покрыл ${fmt(d)} мон. и записал в долг. Репутация −1.`);
  }
  if (S.debt > debtLimit()) { S.rep = Math.max(0, S.rep - 2); lines.push(`! Долг больше ${fmt(debtLimit())} мон.: в гильдии шепчутся. Репутация −2.`); }
  // рыночные события и сезон
  let evMsg = null;
  const oldSeason = season().name;
  S.day++;
  if (season().name !== oldSeason) evMsg = `Наступила ${season().name.toLowerCase()}: ${season().desc}.`;
  if (S.mevent) { if (--S.mevent.left <= 0) { evMsg = (evMsg ? evMsg + ' ' : '') + `${MARKET_EVENTS[S.mevent.id].name} закончил${S.mevent.id === 'festival' || S.mevent.id === 'war' || S.mevent.id === 'drought' ? 'ась' : 'ся'}.`; S.mevent = null; } }
  if (S.nextEv) { if (--S.nextEv.in <= 0) { const id = S.nextEv.id; S.mevent = { id, left: MARKET_EVENTS[id].days }; S.nextEv = null; evMsg = (evMsg ? evMsg + ' ' : '') + MARKET_EVENTS[id].start; } }
  else if (!S.mevent && R() < 0.13) { S.nextEv = { id: pick(Object.keys(MARKET_EVENTS)), in: rint(2, 3) }; }
  tickEconomy(); rollMarket(); topUpOrders(); rollGearShop(); S.refreshN = 0;
  makeNews();
  heatStartLines(lines);
  S.hist.push({ d: S.day - 1, inc: income, gold: S.gold, debt: S.debt, n: S.owned.length });
  S.hist = S.hist.slice(-60);
  addLog(`День ${S.day - 1}: итог ${income >= 0 ? '+' : ''}${fmt(income)} мон.`);
  if (ev) addLog(ev);
  if (evMsg) addLog(evMsg);
  save();
  FX.dayChange(S.day, season().name, () => { render(); showDayReport(); });
  S.dayEv = 0;
  function showDayReport() {
  sfx('bell'); if (income > 0) setTimeout(() => sfx('coin'), 400);
  showModal(`Итоги дня ${S.day - 1}`,
    `<ul class="report">${lines.map(l => `<li class="${l[0] === '!' ? 'warn' : l[0] === '★' ? 'star' : l[0] === '♥' ? 'heat' : l[0] === '⚙' ? 'auto' : l.startsWith('  ') ? 'sub' : ''}">${esc(l)}</li>`).join('') || '<li>Тихий день.</li>'}</ul>
     <div class="report-total">Итог дня: <b class="${income >= 0 ? 'pos' : 'neg'}">${income >= 0 ? '+' : ''}${fmt(income)}</b> мон.</div>
     ${ev ? `<div class="event-box"><div class="event-title">Событие</div>${esc(ev)}</div>` : ''}
     ${evMsg ? `<div class="event-box ev-market"><div class="event-title">Город</div>${esc(evMsg)}</div>` : ''}
     ${(S.news || []).length ? `<details class="event-box ev-news"><summary class="event-title">Новости города (${S.news.length})</summary><ul class="news-l">${S.news.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
     <p class="muted">На рынке ${S.market.length} ${plural(S.market.length, 'предложение', 'предложения', 'предложений')}${S.visitor ? ' — и необычный гость!' : '.'}</p>`,
    [{ label: 'Новый день!', cls: 'btn-primary', act: 'close' }]);
  }
}

// ---------- реакции (прикосновения — в care.js) ----------
let reactTimer = null;
function react(c, expr, line, ms) { setTimeout(() => reactNow(c, expr, line, ms), 0); }
function reactNow(c, expr, line, ms) {
  const el = document.querySelector(`.card-portrait[data-uid="${c.uid}"] .portrait`);
  const bub = document.querySelector(`.card-portrait[data-uid="${c.uid}"] .bubble`);
  if (!el) return;
  try { Anim.setExpr(expr === 'neutral' ? null : expr, ms || 1800); } catch (e) { }
  el.className = el.className.replace(/expr-\w+/g, '').trim() + ' expr-' + expr;
  if (expr === 'back') el.classList.add('expr-frown');
  if (bub && line) { bub.textContent = addr(line); bub.classList.add('show'); }
  clearTimeout(reactTimer);
  reactTimer = setTimeout(() => {
    el.className = el.className.replace(/expr-\w+/g, '').trim() + ' expr-neutral';
    if (bub) bub.classList.remove('show');
  }, ms || 1800);
}

// ---------- рендер ----------
const $app = () => document.getElementById('screen');
function go(screen) { UI.screen = screen; UI.cardUid = null; render(); $app().scrollTop = 0; }
function openCard(uid, from) { UI.screen = 'card'; UI.cardUid = uid; UI.cardFrom = from; render(); $app().scrollTop = 0; }
let _shownGold = null, _lastScreen = null, _lastCard = null;
function render() {
  goldTo(S.gold);
  document.getElementById('gold').classList.toggle('neg', S.gold < 0);
  document.getElementById('day').textContent = 'День ' + S.day + ' · ' + season().name;
  document.getElementById('rep').textContent = repRank() + ' · ' + S.rep + (S.debt ? ' · долг ' + fmt(S.debt) : '');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === (UI.screen === 'card' ? (UI.cardFrom === 'market' ? 'market' : 'manor') : UI.screen)));
  const map = { manor: viewManor, market: viewMarket, card: viewCard, tavern: viewTavern, bag: viewBag };
  try { Anim.stop(); } catch (e) { }
  $app().innerHTML = (map[UI.screen] || viewManor)();
  if (UI.screen === 'card') { try { placeZones(); Anim.mount(); } catch (e) { console.warn(e); } }
  const sk = UI.screen + ':' + (UI.cardUid || '');
  if (sk !== _lastScreen) {
    const scr = $app(); scr.classList.remove('scr-in'); void scr.offsetWidth; scr.classList.add('scr-in');
    if (UI.screen === 'card' && UI.cardUid !== _lastCard) { const c = findAny(UI.cardUid); if (c) setTimeout(() => { if (UI.cardUid === c.uid) reactNow(c, 'neutral', greetLine(c), 2600); }, 450); }
    if (_lastScreen && UI.screen !== 'card') maybeDayEvent();
    _lastScreen = sk; _lastCard = UI.cardUid;
  }
  FX.tint();
}
// счётчик монет: плавно докручивается, рядом всплывает «+N»
let _goldRaf = 0;
function goldTo(v) {
  const el = document.getElementById('gold');
  el.classList.toggle('neg', v < 0);
  if (_shownGold === null || !Anim.enabled()) { _shownGold = v; el.textContent = fmt(v); return; }
  const from = _shownGold, d = v - from; if (!d) { el.textContent = fmt(v); return; }
  _shownGold = v;
  const fly = document.createElement('span'); fly.className = 'gold-fly ' + (d > 0 ? 'up' : 'down'); fly.textContent = (d > 0 ? '+' : '−') + fmt(Math.abs(d));
  el.closest('.gold-pill').appendChild(fly); setTimeout(() => fly.remove(), 1400);
  if (d > 0) for (let i = 0; i < Math.min(6, 2 + Math.floor(Math.log10(d + 1))); i++) {
    const cn = document.createElement('i'); cn.className = 'coin-fly'; cn.style.setProperty('--x', (Math.random() * 40 - 20).toFixed(0) + 'px'); cn.style.animationDelay = (i * 0.07) + 's';
    el.closest('.gold-pill').appendChild(cn); setTimeout(() => cn.remove(), 1300);
  }
  el.closest('.gold-pill').classList.remove('pulse'); void el.offsetWidth; el.closest('.gold-pill').classList.add('pulse');
  cancelAnimationFrame(_goldRaf); const t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + d * e); if (k < 1) _goldRaf = requestAnimationFrame(step); };
  _goldRaf = requestAnimationFrame(step);
}
function bar(label, v, cls, title) {
  return `<div class="mbar ${cls || ''}" title="${esc(title || '')}"><span class="mbar-l">${label}</span><span class="mbar-t"><i style="width:${clamp(v)}%"></i></span><span class="mbar-v">${Math.round(v)}</span></div>`;
}
const TASKS = { craft: 'Ремесло', shop: 'Торговля', salon: 'Салон', train: 'Учёба', rest: 'Отдых' };
const sg = (v) => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));

function charBadges(c) {
  let s = '';
  if (c.preg) s += `<span class="badge b-preg" title="Беременность">в положении · ${dn(Math.max(0, c.preg.due - S.day))}</span>`;
  if (c.growth > 0) s += `<span class="badge b-grow" title="Учится почти вдвое быстрее">юный дар · ${dn(c.growth)}</span>`;
  if (c.sickDays > 0) s += `<span class="badge b-sick">болеет</span>`;
  if (c.crave) s += `<span class="badge b-crave">хочет ${c.crave === 'pie' ? 'пирога' : 'пряника'}</span>`;
  if (c.gear.some(i => i.dur <= 0)) s += `<span class="badge b-broken">износ!</span>`;
  return s;
}
function sparkline() {
  const h = (S.hist || []).slice(-14); if (h.length < 2) return '';
  const max = Math.max(1, ...h.map(x => Math.abs(x.inc)));
  return `<div class="spark" title="Итог дня за последние ${h.length} дн.">${h.map(x => `<i class="${x.inc >= 0 ? 'pos' : 'neg'}" style="height:${Math.max(4, Math.abs(x.inc) / max * 100)}%" title="д.${x.d}: ${sg(x.inc)}"></i>`).join('')}</div>`;
}
function viewManor() {
  applyAuto();
  const up = upkeep();
  const rows = S.owned.map(c => {
    const busy = c.status === 'order';
    const o = busy && S.orders.find(x => x.id === c.orderId);
    const inf = c.task === 'craft' || c.task === 'shop' ? incomeInfo(c) : c.task === 'salon' ? salonIncome(c) : null;
    return `<div class="row-card rarity-${RARITIES[c.rarity].key}" data-open="${c.uid}">
      <div class="row-portrait">${renderPortrait(c, 'sm')}</div>
      <div class="row-body">
        <div class="row-name">${esc(fn1(c))} <span class="chip chip-r">${rarityName(c)}</span>${charBadges(c)}${busy ? '' : autoToggleHtml(c)}</div>
        <div class="row-sub">${raceName(c)} · ${esc(c.title)} · настроение ${mood(c)}</div>
        ${bar('Лояльн.', c.loyalty, 'b-loy')}${bar('Устал.', c.fatigue, 'b-fat')}
        ${busy && o ? `<div class="busy">На заказе: «${esc(ORDER_TEMPLATES[o.tpl].title)}», ещё ${dn(o.daysLeft)}.</div>` :
        `<div class="seg" data-stop>${Object.entries(TASKS).map(([k, n]) => `<button class="seg-b ${c.task === k ? 'on' : ''}" data-task="${k}" data-uid="${c.uid}">${n}</button>`).join('')}</div>
         <div class="row-fc">${isAuto(c) && c.autoWhy ? `<span class="auto-why">⚙ ${esc(c.autoWhy)}</span><br>` : ''}${inf ? `Завтра ≈ <b>+${inf.v}</b> мон. · ошибка ${Math.round(failChance(c) * 100)}%${c.task === 'salon' ? ` · риск ${Math.round(salonRisk(c).p * 100)}%` : ''}${hasFault(c) ? ' · <span class="neg">провинил' + g(c, 'ся', 'ась') + '</span>' : ''}${inHeat(c) ? ' · <span class="heat-t">течка</span>' : ''}` : c.task === 'train' ? `Учёба: «${statName(c.trainStat)}» ×${trainInfo(c).mult.toFixed(2)} · −${TRAIN_COST} мон.` : 'Отдых: усталость и стресс снизятся'}</div>`}
      </div></div>`;
  }).join('');
  const next = EXPAND.find(x => x.cap > S.capacity);
  const legacy = S.births.map(b => `<div class="note">Наследник ${esc(b.snap[0].name.split(' ')[0])} и ${esc(b.snap[1].name.split(' ')[0])} придёт на ${b.due} день.</div>`).join('');
  return `<div class="screen-head"><h1>Поместье</h1>
      <div class="sub">Мест: ${S.owned.length}/${S.capacity} · ${season().name}, до смены ${dn(seasonLeft())}${S.mevent ? ' · ' + mev().name : ''}</div>
      <div class="head-tools">${autoAllHtml()}<button class="btn tiny" data-plan>План дня</button><button class="btn tiny" data-news>Новости · ${(S.news || []).length}</button><button class="btn tiny" data-help="work">Справка</button></div></div>
    <div class="panel parchment upkeep">
      <div class="panel-title">Расходы на завтра: −${up.total - up.interest} мон.</div>
      <div class="small">Еда ${up.food} · жильё ${up.house}${up.heat ? ` · дрова ${up.heat}` : ''}${up.interest ? ` · <span class="neg">проценты ${up.interest} (к долгу)</span>` : ''}</div>
      <div class="small muted">Еда дороже ${season().food && season().food < 1 ? 'не сейчас — осенью дешевле' : evNum('food', 1) > 1 ? 'сейчас: ' + mev().name.toLowerCase() : 'для гномов и в положении'}. Жильё растёт с числом жильцов.</div>
      ${sparkline()}
      ${next ? `<button class="btn small-btn" data-expand ${rankIdx() < next.rank ? 'disabled' : ''}>Пристроить флигель: ${next.cap} мест · ${fmt(next.cost)} мон.${rankIdx() < next.rank ? ` (нужен ранг ${RANKS[next.rank].key})` : ''}</button>` : ''}
    </div>
    ${legacy}
    ${rows || `<div class="empty parchment">В поместье тихо и пусто. Загляните на рынок — сегодня там ${S.market.length} ${plural(S.market.length, 'предложение', 'предложения', 'предложений')}.</div>`}
    <div class="log parchment"><div class="panel-title">Дневник торговца</div>${S.log.slice(0, 8).map(l => `<div class="log-l"><b>д.${l.day}</b> ${esc(l.t)}</div>`).join('')}</div>`;
}

function viewMarket() {
  const E = S.econ;
  const dem = Object.keys(RACES).map(k => { const v = E.race[k], t = E.trend[k]; return `<span class="chip ${v >= 1.1 ? 'chip-up' : v <= 0.9 ? 'chip-down' : ''}" title="Тренд ${t > 0 ? 'вверх' : 'вниз'}">${RACES[k].plural} ×${v.toFixed(2)} ${t > 0.01 ? '↑' : t < -0.01 ? '↓' : '→'}</span>`; }).join('');
  const list = S.market.filter(c => UI.filter === 'all' || c.g === UI.filter);
  const cards = list.map(c => `<div class="m-card rarity-${RARITIES[c.rarity].key} ${c.bargain ? 'bargain' : ''} ${c.exotic ? 'exotic' : ''}" data-open="${c.uid}" data-from="market">
      <div class="m-portrait">${renderPortrait(c, 'sm')}<span class="m-rar">${rarityName(c)}</span>${c.bargain ? '<span class="m-tag">−40%</span>' : c.exotic ? '<span class="m-tag">купец</span>' : ''}</div>
      <div class="m-name">${esc(fn1(c))} <span class="m-g">${c.g === 'f' ? '♀' : '♂'}</span></div>
      <div class="m-title">${raceName(c)}</div>
      <div class="m-price"><span class="coin"></span>${fmt(price(c))}</div>
    </div>`).join('');
  const vis = S.visitor ? `<div class="visitor parchment">${{ merchant: '<b>Заморский купец</b> привёз редких людей — они в начале списка.', appraiser: '<b>Странствующий оценщик</b> сегодня бесплатно раскрыл потенциал у всех на рынке.', bargain: '<b>Распродажа!</b> Один из продавцов торопится и отдаёт товар на 40% дешевле.' }[S.visitor.kind]}</div>` : '';
  const f = (k, n) => `<button class="fchip ${UI.filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`;
  return `<div class="bunting" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}<b class="lantern l1"></b><b class="lantern l2"></b></div><div class="screen-head market-head"><div class="keeper">${renderPortrait({ preset: 'm08', acc: [{ id: 'hat', color: '#4f6b3a' }] }, 'sm')}</div>
    <div><h1>Рынок</h1><div class="sub">${S.market.length} ${plural(S.market.length, 'предложение', 'предложения', 'предложений')} (больше с рангом гильдии). Спрос:</div><div class="chips">${dem}</div>
    <div class="small muted">Модно: «${TRAITS[E.hot].name}» +15% к цене · ${season().name}${season().dem ? ' +' + Math.round(season().dem * 100) + '% спроса' : ''}${S.mevent ? ' · ' + mev().name : ''}</div></div></div>
    ${vis}
    <div class="m-tools">${f('all', 'Все')}${f('f', 'Женщины')}${f('m', 'Мужчины')}<button class="btn small-btn" data-refresh>Новый привоз · ${refreshCost()}</button></div>
    <div class="m-grid">${cards || '<div class="empty parchment">Сегодня всё раскупили. Завтра будет новый привоз.</div>'}</div>`;
}

// «влияет на:» — что делает каждый показатель прямо сейчас
function effLines(c) {
  const m = mood(c);
  return {
    loy: `влияет на: цену ${xf(loyF(c))}, честность в событиях${c.loyalty < 20 ? ', <b class="neg">может сбежать</b>' : ''}${c.loyalty < 30 ? ', ошибки в работе' : ''}`,
    mood: `влияет на: доход ${xf(moodF(c))}, учёбу ×${(0.8 + 0.4 * m / 100).toFixed(2)}, заказы ${sg((m - 50) / 4)}%, цену (вид)`,
    str: `влияет на: ошибки ${pp(failPart(c, 'str'))}, ${c.stress > 70 ? 'учёбу ×0.70, заказы −8%, ' : ''}лояльность${c.stress > 80 ? ' <b class="neg">падает</b>' : ''}`,
    fat: `влияет на: доход ${xf(fatF(c))}, ошибки ${pp(failPart(c, 'fat'))}, заказы −${Math.round(c.fatigue / 3)}%${c.fatigue >= 90 ? ', <b class="neg">здоровье −10/день</b>' : ''}`,
    hp: `влияет на: доход ${xf(hpF(c))}, цену ${xf(0.6 + 0.4 * c.health / 100)}${c.health < 50 ? ', ошибки +6%' : ''}${c.health < 30 ? ', <b class="neg">не может работать</b>' : ''}`,
    dis: `влияет на: ошибки ${pp(failPart(c, 'dis'))}, побеги`,
    aff: `влияет на: согласие на близость, как принимает прикосновения (доверие ${trustOf(c)})`,
  };
}
function stateHtml(c) {
  const m = mood(c), E = effLines(c);
  const row = (bh, t) => `${bh}<div class="eff">${t}</div>`;
  return `<div class="panel parchment" id="state-panel">
      <div class="panel-title">Состояние</div>
      ${row(bar('Лояльность', c.loyalty, 'b-loy'), E.loy)}
      ${row(bar('Настроение', m, 'b-mood', moodName(m)), E.mood)}
      ${row(bar('Стресс', c.stress, 'b-str'), E.str)}
      ${row(bar('Усталость', c.fatigue, 'b-fat'), E.fat)}
      ${row(bar('Здоровье', c.health, 'b-hp'), E.hp)}
      ${row(bar('Дисциплина', c.discipline, 'b-dis'), E.dis)}
      ${row(bar('Симпатия', c.aff || 0, 'b-aff', 'Как вы нравитесь лично'), E.aff)}
      <div class="muted small">Настроение: <b>${moodName(m)}</b>. ${c.loyalty >= 75 ? 'Предан' + g(c, '', 'а') + ' вам всей душой.' : c.loyalty < 20 ? 'Может сбежать, если так пойдёт и дальше.' : ''}${c.crave ? ` Просит ${c.crave === 'pie' ? 'ягодного пирога' : 'медового пряника'} (настроение −8, пока не получит).` : ''}</div>
    </div>`;
}
function refreshCardStats(c) {
  const el = document.getElementById('state-panel'); if (el) el.outerHTML = stateHtml(c);
  const gEl = document.getElementById('gold'); if (gEl) gEl.textContent = fmt(S.gold);
}
function partsHtml(parts) { return parts.map(([n, v]) => `<span class="mchip ${v > 1.001 ? 'up' : v < 0.999 ? 'down' : ''}">${n} ${xf(v)}</span>`).join(''); }
function forecastHtml(c) {
  if (c.status !== 'home') return '';
  const cr = incomeInfo(c, 'craft'), sh = incomeInfo(c, 'shop'), tr = trainInfo(c);
  const sl = salonIncome(c), so = salonOk(c);
  const cur = c.task === 'craft' ? cr : c.task === 'shop' ? sh : c.task === 'salon' ? sl : null;
  return `<div class="panel parchment forecast"><div class="panel-title">Прогноз на завтра</div>
    <div class="fc-grid">
      <div class="fc ${c.task === 'craft' ? 'on' : ''}"><b>Ремесло</b><span>+${cr.v}</span><small>Мастерство, Сила, Выносливость</small></div>
      <div class="fc ${c.task === 'shop' ? 'on' : ''}"><b>Торговля</b><span>+${sh.v}</span><small>Обаяние, Ум, Удача</small></div>
      <div class="fc ${c.task === 'salon' ? 'on' : ''} ${so.ok ? '' : 'off'}"><b>Салон</b><span>${so.ok ? '+' + sl.v : '—'}</span><small>${so.block ? esc(so.block) : so.ok ? 'Обаяние, красота, молодость' : 'нет согласия (' + so.will + '/' + SALON_NEED + ')'}</small></div>
      <div class="fc ${c.task === 'train' ? 'on' : ''}"><b>Учёба</b><span>×${tr.mult.toFixed(2)}</span><small>−${TRAIN_COST} мон., «${statName(c.trainStat)}»</small></div>
    </div>
    ${cur ? `<div class="small">База ${Math.round(cur.base)} × множители:</div><div class="mchips">${partsHtml(cur.parts)}</div>` : c.task === 'train' ? `<div class="mchips">${partsHtml(tr.parts)}</div>` : '<div class="small muted">Отдых: усталость −35, стресс −20, здоровье +10.</div>'}
    ${c.task !== 'rest' ? (() => { const fi = failInfo(c); const top = failTop(fi, 3); return `<div class="small">Шанс ${c.task === 'train' ? 'сорвать урок' : 'ошибки (' + JOB_DIFF[fi.task].bad + ')'}: <b class="${fi.p >= 0.15 ? 'neg' : fi.p <= 0.06 ? 'pos' : ''}">${Math.round(fi.p * 100)}%</b> <button class="q-btn" data-help="work">?</button>${top.length ? `<div class="small muted">Больше всего мешает: ${top.map(x => x[0].toLowerCase() + ' ' + pp(x[1])).join(', ')}</div>` : '<div class="small muted">Условия отличные.</div>'}</div>${failWhy(c)}`; })() : ''}
    ${c.task === 'salon' || c.prof ? `<div class="small">Профессионализм: <b>${profOf(c)}</b>/100 · охота ${so.will} (порог ${SALON_NEED}, охотно ${SALON_EAGER}) · риск здоровью ${Math.round(salonRisk(c).p * 100)}% <button class="q-btn" data-help="salon">?</button></div>${salonWhy(c)}` : ''}
    ${inHeat(c) ? `<div class="small heat-t">Течка ещё ${dn(heatInfo(c).left)}: доход ×0.8, ошибки +3%, нужно внимание.</div>` : ''}
    ${c.preg ? '<div class="small neg">В положении: доход ×0.5, заказы недоступны.</div>' : ''}
  </div>`;
}
function gearHtml(c, owned) {
  const rows = c.gear.map(it => {
    const broken = it.dur <= 0;
    return `<div class="gear-row q${it.q} ${broken ? 'broken' : ''}">${gearIcon(it)}
      <div class="gear-b"><div class="gear-n">${esc(gearName(it, c))} <small>${SLOT_NAMES[gearSlot(it)]}</small></div>
        <div class="gear-bon">${broken ? '<span class="neg">Износилось — бонусов нет</span>' : esc(gearBonText(it))}</div>
        <div class="dur" title="Прочность ${it.dur}/${it.maxDur}"><i style="width:${it.dur / it.maxDur * 100}%"></i></div></div>
      ${owned ? `<div class="gear-a"><button class="btn tiny" data-unequip="${it.iid}">Снять</button><button class="btn tiny" data-givegear="${it.iid}">Передать</button>${repairCost(it) ? `<button class="btn tiny" data-repair="${it.iid}">Чинить ${repairCost(it)}</button>` : ''}</div>` : ''}
    </div>`;
  }).join('');
  const b = gb(c);
  const sum = Object.entries(b).map(([k, v]) => { const l = BON_NAMES[k]; return k === 'calm' ? `−${v}${l}` : (l.startsWith('%') || l.startsWith(' ')) ? `+${v}${l}` : `${l} +${v}`; }).join(', ');
  return `<div class="panel parchment"><div class="panel-title">Снаряжение</div>
    ${rows || '<div class="muted small">Ничего не надето.</div>'}
    ${sum ? `<div class="small">Итого: <b>${esc(sum)}</b></div>` : ''}
    <div class="small muted">${owned ? 'Прочность падает на 1 за каждый рабочий день и день заказа.' : `Снаряжение входит в цену (≈${fmt(gearWorth(c) * 0.8)} мон.).`}</div>
    ${owned ? `<button class="btn" data-wearfrom="${c.uid}" ${S.stash.length ? '' : 'disabled'}>Надеть из сундука (${S.stash.length})</button>` : ''}
  </div>`;
}
function viewCard() {
  const c = findAny(UI.cardUid);
  if (!c) { UI.screen = 'manor'; return viewManor(); }
  const owned = !!findOwned(c.uid);
  const statsHtml = STATS.map(s => {
    const v = c.stats[s.key], pv = c.pot[s.key], bv = gb(c)[s.key] || 0;
    const inh = c.inherited && c.inherited.includes(s.key);
    return `<div class="stat ${owned && c.trainStat === s.key ? 'training' : ''}" ${owned ? `data-trainstat="${s.key}" data-uid="${c.uid}"` : ''} title="${esc(STAT_EFF[s.key])}">
      <span class="stat-ico"><svg><use href="#i-${s.key}"/></svg></span>
      <div class="stat-body"><div class="stat-n">${s.name}${inh ? ' <span class="inh" title="Унаследовано">★</span>' : ''}<small>${STAT_EFF[s.key]}</small></div>
      <div class="stat-bar"><i style="width:${v}%"></i>${bv ? `<i class="sb-gear" style="left:${v}%;width:${Math.min(bv, 100 - v)}%"></i>` : ''}${c.appraised ? `<b class="pot" style="left:${pv}%"></b>` : ''}</div></div>
      <span class="stat-v">${v}${bv ? `<em>+${bv}</em>` : ''}${c.appraised ? `<small>/${pv}</small>` : ''}</span></div>`;
  }).join('');
  const breed = c.g === 'f'
    ? `${bar('Плодовитость', c.breed.fert, 'b-br')}${bar('Матер. стать', c.breed.mat, 'b-br')}<div class="eff">влияет на: шанс беременности, качество наследства</div>`
    : `${bar('Сила рода', c.breed.line, 'b-br')}${bar('Наследств.', c.breed.her, 'b-br')}<div class="eff">влияет на: шанс беременности, передачу лучших навыков</div>`;
  const traits = c.traits.map(t => `<span class="chip chip-t ${S.econ.hot === t ? 'hot' : ''}" title="${TRAITS[t].desc}">${TRAITS[t].name}${S.econ.hot === t ? ' 🔥' : ''}<small>${TRAITS[t].desc}; цена ×${TRAITS[t].mult}</small></span>`).join('');
  const r = RACES[c.race];
  const busy = c.status === 'order';
  const pp = priceParts(c);
  const priceBox = `<div class="mchips">${pp.map(([n, v], i) => i === 0 ? `<span class="mchip">${n} ${v}</span>` : `<span class="mchip ${v > 1.001 ? 'up' : v < 0.999 ? 'down' : ''}">${n} ${xf(v)}</span>`).join('')}${gearWorth(c) ? `<span class="mchip up">+снаряжение ${fmt(gearWorth(c) * 0.8)}</span>` : ''}</div>`;
  let actions = '';
  if (!owned) {
    actions = `<div class="price-box parchment"><div>Цена: <b><span class="coin"></span>${fmt(price(c))}</b>${c.discount ? ` <span class="pos">(скидка ${Math.round(c.discount * 100)}%)</span>` : ''}${c.priceAdj > 1 ? ' <span class="neg">(продавец обижен: +10%)</span>' : ''}</div>
      ${priceBox}
      <div class="btn-row">
        <button class="btn btn-primary" data-buy="${c.uid}">Купить</button>
        <button class="btn" data-haggle="${c.uid}" ${c.haggleLock ? 'disabled' : ''}>${c.haggleLock ? 'Продавец обижен' : 'Торговаться'}</button>
        ${c.appraised ? '' : `<button class="btn" data-appraise="${c.uid}">Оценщик (${S.appraiseCost})</button>`}
      </div></div>`;
  } else {
    const ci = closeInfo(c), hi = heatInfo(c);
    actions = `
      <div class="panel parchment"><div class="panel-title">Распорядок на завтра</div>
        ${busy ? `<div class="busy">Сейчас на заказе — распорядок недоступен.</div>` :
        `<div class="auto-row">${autoToggleHtml(c)}<span class="small muted">${isAuto(c) ? (c.autoWhy ? '⚙ ' + esc(c.autoWhy) : 'дело выбирается само') : 'вручную'}</span></div>
        <div class="seg big">${Object.entries(TASKS).map(([k, n]) => `<button class="seg-b ${c.task === k ? 'on' : ''} ${k === 'salon' && !salonOk(c).ok ? 'off' : ''}" data-task="${k}" data-uid="${c.uid}">${n}</button>`).join('')}</div>
        <div class="muted small">${{ salon: 'Салон: вечер с гостями — беседы, музыка, вино; остальное за закрытыми дверями. Доход по Обаянию, красоте, молодости и профессионализму. Риск для здоровья, усталость +16, стресс +12.', craft: 'Ремесло: монеты по Мастерству, Силе и Выносливости. Усталость +18, стресс +10.', shop: 'Торговля за прилавком: монеты по Обаянию, Уму и Удаче. Усталость +14, стресс +12.', train: `Учит навык «${statName(c.trainStat)}» (нажмите на навык выше, чтобы сменить). ${TRAIN_COST} мон./день, усталость +15.`, rest: 'Усталость и стресс снижаются, здоровье восстанавливается.' }[c.task]}</div>`}
      </div>
      ${forecastHtml(c)}
      <div class="panel parchment"><div class="panel-title">Прикосновения <span class="muted small">доверие ${trustOf(c)}</span></div>
        ${touchChipsHtml(c)}
        <div class="small muted">Касайтесь прямо рисунка или кнопок. Каждая зона действует по-своему и за день слабеет.</div>
        ${hi && hi.on ? `<div class="note heat-note">♥ Течка ещё ${dn(hi.left)}. ${c.heatCare === S.day ? 'Сегодня внимание уже было — ей спокойнее.' : 'Сегодня без внимания: к вечеру стресс +8. Погладьте, похвалите или подарите что-нибудь.'} <a href="#" data-help="heat">Подробнее</a></div>` : hi ? `<div class="small muted">Следующая течка через ${dn(hi.next)}.</div>` : ''}
        <button class="btn btn-close ${ci.ok ? '' : 'soft'}" data-closeness="${c.uid}">Сблизиться<small>${c.closeDay === S.day ? 'уже сегодня — завтра снова' : ci.ok ? 'согласие есть · мини-игра' : 'пока откажет: ' + ci.reqs.filter(r => r[1] < r[2]).map(r => r[0].toLowerCase() + ' ' + r[1] + '/' + r[2]).concat(ci.why).join(', ')}</small></button>
      </div>
      <div class="panel parchment"><div class="panel-title">Забота и строгость</div>
        <div class="act-grid">
          <button class="btn act-good" data-act="praise" data-uid="${c.uid}" ${c.praisedDay !== S.day ? '' : 'disabled'}>Похвалить<small>${c.goodDeed ? 'есть за что: лояльность +5' : 'лояльность +2'}</small></button>
          <button class="btn act-good" data-act="gift" data-uid="${c.uid}">Подарок · 60<small>лояльность +6, настроение +15</small></button>
          <button class="btn act-good" data-act="healer" data-uid="${c.uid}">Лекарь · ${HEALER_COST}<small>здоровье +40, лечит хворь</small></button>
          <button class="btn act-bad" data-act="scold" data-uid="${c.uid}">Выговор<small>${hasFault(c) ? 'по делу: дисциплина +20' : 'без повода: лояльность −8'}</small></button>
          <button class="btn act-bad" data-act="nosweets" data-uid="${c.uid}">Без десерта<small>дисциплина +8, настроение −12</small></button>
        </div>
        ${deserveHtml(c)}
        <div class="btn-row"><button class="btn" data-useitem-for="${c.uid}">Дать предмет</button>
        <button class="btn btn-mate" data-mate="${c.uid}" ${busy ? 'disabled' : ''}>Спарить${c.g === 'f' && c.mateDay === S.day ? ' (завтра)' : ''}</button>
        ${c.appraised ? '' : `<button class="btn" data-appraise="${c.uid}">Оценщик (${S.appraiseCost})</button>`}</div>
      </div>
      ${punishPanelHtml(c)}
      <div class="panel parchment"><div class="panel-title">Сделки</div>
        <div class="small">Скупщик даст ≈ <b>${fmt(sellPrice(c))}</b> мон. (рынок берёт 10%${evNum('sell') ? `, караван +${Math.round(evNum('sell') * 100)}%` : ''}). ${c.boughtFor ? `Куплен${g(c, '', 'а')} за ${fmt(c.boughtFor)}.` : ''}</div>
        ${priceBox}
        <div class="small muted">Цену поднимают навыки (учёба), лояльность, здоровье и настроение, наряд и украшения, спрос на расу.</div>
        <div class="btn-row">
          <button class="btn" data-sell="${c.uid}" ${busy || c.preg || c.sellLockDay === S.day ? 'disabled' : ''}>${c.sellLockDay === S.day ? 'Покупатель ушёл' : 'Продать'}</button>
          <button class="btn act-good" data-free="${c.uid}" ${busy ? 'disabled' : ''}>Отпустить на волю</button>
          <button class="btn" data-ransom="${c.uid}" ${busy ? 'disabled' : ''}>Принять выкуп</button>
        </div></div>`;
  }
  const pm = owned && UI.cardMode === 'punish';
  return `<div class="card-hero">
      <div class="card-portrait rarity-${RARITIES[c.rarity].key} ${pm ? 'mode-punish' : ''}" data-uid="${c.uid}" data-mood="${moodAnimKey(c)}" data-expr="${exprOf(c)}" data-emote="${emotesOf(c, owned).join(',')}" style="--fh:${figHeight(presetById(c.preset))}">
        ${renderPortrait(c, 'lg')}
        <div class="bubble"></div>
        <span class="touch-hint">${pm ? 'Режим наказания: руки, плечи; спина и «пониже спины» — кнопками ниже' : owned ? 'Коснитесь: голова, уши, щёки, плечи, руки…' : 'Коснитесь портрета'}</span>
      </div>
      <div class="hero-top">
        <button class="back-btn" data-back="${UI.cardFrom === 'market' ? 'market' : 'manor'}" aria-label="Назад"></button>
        <div class="hero-name"><b>${esc(c.name)}</b><small>${owned ? '' : 'На продажу · '}${raceName(c)} · ${c.age} ${plural(c.age, 'год', 'года', 'лет')}</small></div>
        <span class="np-rar rar-${RARITIES[c.rarity].key}">${rarityName(c)}</span>
      </div>
      ${owned ? `<div class="hero-ui">${heroModesHtml(c)}</div>` : ''}
      <div class="hero-scroll">листайте вниз ↓</div>
    </div>
    <div class="name-plate parchment">
      <div class="np-name">${esc(c.name)}</div>
      <div class="np-sub">${raceName(c)} · ${c.age} ${plural(c.age, 'год', 'года', 'лет')} · ${esc(c.title)}</div>
      <div class="np-rar rar-${RARITIES[c.rarity].key}">${rarityName(c)}${c.prof ? ` · Профессионализм ${profOf(c)}` : ''}</div>
      <div class="np-badges">${charBadges(c)}</div>
    </div>
    <div class="card-grid one">
      <div class="card-right parchment">
        <div class="panel-title">Навыки</div>
        ${statsHtml}
        ${c.appraised ? '' : '<div class="muted small center">Потенциал скрыт. Его раскроет оценщик.</div>'}
      </div>
    </div>
    ${owned ? '' : actions}
    ${stateHtml(c)}
    ${gearHtml(c, owned)}
    <div class="panel parchment">
      <div class="panel-title">Черты и происхождение</div>
      <div class="chips">${traits}</div>
      <div class="race-box"><b>${r.plural}:</b> ${r.bonus}. <i>${r.quirk}.</i></div>
      ${c.parents ? `<div class="muted small">Родители: ${esc(c.parents.join(' и '))}. Унаследованные навыки отмечены ★.${c.mix && RACES[c.mix] ? ` Полукровка: кровь отца — ${esc(RACES[c.mix].name.toLowerCase())}.` : ''}</div>` : ''}
    </div>
    <div class="panel parchment">
      <div class="panel-title">Род и сердце</div>
      ${breed}
      <div class="hint">${esc(prefHint(c))}</div>
      ${c.preg ? `<div class="note">В положении: наследник придёт через ${dn(Math.max(0, c.preg.due - S.day))} (отец — ${c.preg.father.anon ? 'анонимный гость салона' : esc(c.preg.father.name)}). Стадия ${pregStage(c)}/3.</div>` : ''}
    </div>
    ${owned ? actions : ''}`;
}

function viewTavern() {
  const orders = S.orders.map(o => {
    const t = ORDER_TEMPLATES[o.tpl];
    const ass = o.assigned && findOwned(o.assigned);
    const tag = (t.war && S.mevent && S.mevent.id === 'war') || (t.fest && S.mevent && S.mevent.id === 'festival') || t.plague ? '<span class="chip chip-up">к событию ×1.3</span>' : '';
    return `<div class="order parchment">
      <div class="order-h"><b>${esc(t.title)}</b><span class="order-r"><span class="coin"></span>${fmt(o.reward)}</span></div>
      <div class="order-d">${esc(t.desc)}</div>
      <div class="order-m"><span class="chip">${statName(t.stat)} ≥ ${t.min}</span><span class="chip">+ ${statName(t.stat2)} (½)</span><span class="chip">${dn(t.days)}</span>${tag}
      ${ass ? `<span class="chip chip-up">Выполняет: ${esc(fn1(ass))}, ещё ${dn(o.daysLeft)}</span>` : `<span class="chip">Висит до ${o.expires} дня</span>`}</div>
      ${ass ? '' : `<button class="btn btn-primary" data-assign="${o.id}">Назначить</button>`}
    </div>`;
  }).join('');
  const shop = Object.entries(ITEMS).map(([id, it]) => `<div class="shop-i"><div><b>${it.name}</b>${S.inv[id] ? ` <small>(есть ${S.inv[id]})</small>` : ''}<div class="muted small">${it.desc}</div></div><button class="btn" data-buyitem="${id}"><span class="coin"></span>${it.price}</button></div>`).join('');
  const gear = S.gearShop.map(it => `<div class="shop-i gear-row q${it.q}">${gearIcon(it)}<div class="gear-b"><b>${esc(gearName(it))}</b> <small>${SLOT_NAMES[gearSlot(it)]}${gearFem(it) ? ' · для девушек' : ''}</small><div class="muted small">${esc(gearBonText(it))} · прочность ${it.maxDur}</div></div><button class="btn" data-buygear="${it.iid}"><span class="coin"></span>${fmt(gearVal(it) * 1.3)}</button></div>`).join('');
  const lim = debtLimit();
  return `<div class="screen-head"><h1>Таверна «Сытый Грифон»</h1><div class="sub">Доска заказов, слухи и лавки · ранг гильдии ${repRank()}: открыты заказы до ранга ${repRank()}</div></div>
    <div class="rumor parchment">${S.nextEv ? 'Трактирщица шепчет: «' + esc(MARKET_EVENTS[S.nextEv.id].rumor) + '»' : `Трактирщица шепчет: «Говорят, сейчас лучше всех платят за ${RACES[Object.entries(S.econ.race).sort((a, b) => b[1] - a[1])[0][0]].gen}».`}</div>
    <div class="panel-title light">Доска заказов</div>
    ${orders || '<div class="empty parchment">Заказов пока нет — загляните завтра.</div>'}
    <div class="panel parchment"><div class="panel-title">Лавка трактирщика</div>${shop}</div>
    <div class="panel parchment"><div class="panel-title">Старьёвщик: снаряжение</div><div class="small muted">Каждый день новый товар. Купленное кладётся в сундук.</div>${gear}</div>
    <div class="panel parchment"><div class="panel-title">Гоблин-ростовщик</div>
      <div class="small">Долг: <b>${fmt(S.debt)}</b> мон. · лимит ${fmt(lim)} · 2% в день прибавляется к долгу. Если касса уйдёт в минус, ростовщик сам покроет разницу (репутация −1).</div>
      <div class="btn-row">${[500, 1000, 2000].map(v => `<button class="btn" data-borrow="${v}" ${S.debt + v > lim ? 'disabled' : ''}>Взять ${fmt(v)}</button>`).join('')}</div>
      ${S.debt ? `<div class="btn-row"><button class="btn" data-repay="500">Вернуть 500</button><button class="btn btn-primary" data-repay="${S.debt}">Вернуть всё</button></div>` : ''}
    </div>`;
}

function viewBag() {
  const items = Object.entries(S.inv).map(([id, n]) => `<div class="shop-i"><div><b>${ITEMS[id].name}</b> ×${n}<div class="muted small">${ITEMS[id].desc}</div></div><button class="btn" data-useitem="${id}">Использовать</button></div>`).join('');
  const stash = S.stash.map(it => `<div class="gear-row q${it.q} ${it.dur <= 0 ? 'broken' : ''}">${gearIcon(it)}<div class="gear-b"><div class="gear-n">${esc(gearName(it))} <small>${SLOT_NAMES[gearSlot(it)]}</small></div><div class="gear-bon">${esc(gearBonText(it))}</div><div class="dur"><i style="width:${it.dur / it.maxDur * 100}%"></i></div></div>
    <div class="gear-a"><button class="btn tiny" data-givegear="${it.iid}">Надеть на…</button>${repairCost(it) ? `<button class="btn tiny" data-repair="${it.iid}">Чинить ${repairCost(it)}</button>` : ''}<button class="btn tiny" data-sellgear="${it.iid}">Продать ${Math.round(gearVal(it) * 0.6)}</button></div></div>`).join('');
  const worn = S.owned.reduce((a, c) => a + c.gear.length, 0);
  return `<div class="screen-head"><h1>Сумка</h1><div class="sub">Угощения — в таверне, снаряжение — у старьёвщика</div></div>
    <div class="panel parchment"><div class="panel-title">Припасы</div>${items || '<div class="muted">Сумка пуста.</div>'}</div>
    <div class="panel parchment"><div class="panel-title">Сундук со снаряжением (${S.stash.length})</div>${stash || '<div class="muted small">Пусто. Снятое снаряжение попадает сюда.</div>'}<div class="small muted">На жильцах надето ещё ${worn} ${plural(worn, 'предмет', 'предмета', 'предметов')}.</div></div>
    <div class="panel parchment"><div class="panel-title">Сводка</div>
      <div>Заработано продажами: <b>${fmt(S.totalEarned)}</b> мон.</div>
      <div>Ранг гильдии: <b>${repRank()}</b> (репутация ${S.rep}). Ранг открывает заказы, места на рынке и пристройки, облегчает торг.</div>
      ${sparkline()}
    </div>`;
}

// ---------- модальные окна ----------
function showModal(title, html, buttons) {
  const b = (buttons || [{ label: 'Хорошо', cls: 'btn-primary', act: 'close' }])
    .map((x, i) => `<button class="btn ${x.cls || ''}" data-mbtn="${i}">${x.label}</button>`).join('');
  const root = document.getElementById('modal');
  root.innerHTML = `<div class="modal-back"></div><div class="modal-box parchment"><div class="modal-title">${title}</div><div class="modal-body">${html}</div><div class="btn-row">${b}</div></div>`;
  root.classList.add('open');
  root._buttons = buttons || [{ act: 'close' }];
}
function closeModal() { const r = document.getElementById('modal'); r.classList.remove('open'); r.innerHTML = ''; }

function haggleModal(uid, mode) {
  const c = findAny(uid);
  const baseP = mode === 'buy' ? price(c) : sellPrice(c);
  const word = mode === 'buy' ? 'Скидка' : 'Наценка';
  showModal(mode === 'buy' ? 'Торг с продавцом' : 'Торг с покупателем', `
    <p>${mode === 'buy' ? 'Сколько попробуем сбить?' : 'Сколько накинем сверху?'} Чем наглее — тем выше риск ${mode === 'buy' ? 'обидеть продавца (цена +10%)' : 'спугнуть покупателя до завтра'}.</p>
    <input type="range" id="hg" min="0" max="30" value="10" step="1">
    <div class="hg-info"><span>${word}: <b id="hgp">10</b>%</span><span>Итог: <b id="hgv"></b></span></div>
    <div class="hg-chance">Шанс: <b id="hgc"></b></div>
    <div class="small muted">Помогают репутация и Обаяние вашего лучшего торговца.</div><div id="hgwhy"></div>`,
    [{ label: 'Отмена', act: 'close' }, { label: mode === 'buy' ? 'Предложить цену' : 'Назвать цену', cls: 'btn-primary', act: () => doHaggle(uid, mode, +document.getElementById('hg').value) }]);
  const upd = () => {
    const v = +document.getElementById('hg').value, p = haggleChance(v, c);
    document.getElementById('hgp').textContent = v;
    document.getElementById('hgv').textContent = fmt(baseP * (mode === 'buy' ? 1 - v / 100 : 1 + v / 100)) + ' мон.';
    document.getElementById('hgc').textContent = Math.round(p * 100) + '% — ' + chanceWord(p);
    const w = document.getElementById('hgwhy'), op = w.querySelector('details') && w.querySelector('details').open; w.innerHTML = haggleWhy(v, c); if (op) w.querySelector('details').open = true;
  };
  document.getElementById('hg').addEventListener('input', upd); upd();
}
function doHaggle(uid, mode, pct) {
  closeModal();
  const c = findAny(uid);
  if (R() < haggleChance(pct, c)) {
    if (mode === 'buy') { toast(`Продавец вздохнул и согласился на −${pct}%.`); buy(uid, pct); }
    else { toast(`Покупатель кивнул: +${pct}% сверху.`); sell(uid, pct); }
  } else {
    sfx('bad');
    if (mode === 'buy') { c.haggleLock = true; c.priceAdj = 1.1; showModal('Продавец обиделся', '<p>«За такие деньги торгуйтесь с кем-нибудь другим!» Цена выросла на 10%, торговаться сегодня больше не выйдет.</p>'); }
    else { c.sellLockDay = S.day; showModal('Покупатель ушёл', '<p>Покупатель хмыкнул и ушёл к соседней лавке. Завтра придут другие.</p>'); }
    save(); render();
  }
}
function mateModal(uid) {
  const a = findOwned(uid);
  const cands = S.owned.filter(b => b !== a && b.g !== a.g);
  const list = cands.map(b => {
    const chk = mateCheck(a, b), inf = mateInfo(a, b);
    return `<div class="pick ${chk.ok ? '' : 'dis'}" ${chk.ok ? `data-mateto="${b.uid}"` : ''}>
      <div class="pick-p">${renderPortrait(b, 'sm')}</div>
      <div><b>${esc(fn1(b))}</b> · ${raceName(b)}<div class="small hint-l${inf.h.lvl}">${inf.h.text}</div>
      ${chk.ok ? `<div class="small">Согласие ≈ <b>${Math.round(inf.willing * 100)}%</b> · беременность ≈ <b>${Math.round(inf.preg * 100)}%</b>${inHeat(inf.f) ? ' <span class="heat-t">течка</span>' : ''}</div>` : `<div class="small muted">${chk.why}</div>`}</div></div>${chk.ok ? mateWhy(a, b) : ''}`;
  }).join('');
  showModal('Спарить', `<p class="small">Устроить паре вечер наедине. Мужчина может ходить на свидания сколько угодно (но устаёт), женщина — раз в день. Родню сводить нельзя. Шанс беременности растёт от плодовитости, силы рода, здоровья, настроения и симпатии; весной — выше. Беременность длится 9 дней, затем приходит взрослый наследник.</p>${list || '<p class="muted">В поместье нет никого противоположного пола.</p>'}`, [{ label: 'Закрыть', act: 'close' }]);
  document.getElementById('modal')._mateA = uid;
}
function assignModal(oid) {
  const o = S.orders.find(x => x.id === oid), t = ORDER_TEMPLATES[o.tpl];
  const list = homeChars().map(c => `<div class="pick ${c.preg ? 'dis' : ''}" ${c.preg ? '' : `data-assignto="${c.uid}" data-order="${oid}"`}>
    <div class="pick-p">${renderPortrait(c, 'sm')}</div>
    <div><b>${esc(fn1(c))}</b> · ${statName(t.stat)} ${eff(c, t.stat)}, ${statName(t.stat2)} ${eff(c, t.stat2)}<div class="small">${c.preg ? 'В положении — нельзя' : `Успех: <b>${Math.round(orderChance(c, o) * 100)}%</b> · блестяще: ${Math.round(critChance(c) * 100)}% · усталость ${Math.round(c.fatigue)}`}</div></div></div>${c.preg ? '' : orderWhy(c, o)}`).join('');
  showModal('Кого отправить?', `<p class="small">«${esc(t.title)}»: ${dn(t.days)}. На успех влияют оба навыка, Удача, усталость, настроение, стресс, здоровье и снаряжение.</p>${list || '<p class="muted">Все заняты или поместье пусто.</p>'}`, [{ label: 'Закрыть', act: 'close' }]);
}
function itemForCharModal(uid) {
  const items = Object.entries(S.inv);
  showModal('Какой предмет дать?', items.length ? items.map(([id, n]) => `<div class="pick" data-give="${id}" data-uid="${uid}"><div><b>${ITEMS[id].name}</b> ×${n}<div class="small muted">${ITEMS[id].desc}</div></div></div>`).join('') : '<p class="muted">Сумка пуста. Предметы продаются в таверне.</p>', [{ label: 'Закрыть', act: 'close' }]);
}
function charForItemModal(id) {
  showModal(ITEMS[id].name + ': кому?', S.owned.map(c => `<div class="pick" data-give="${id}" data-uid="${c.uid}"><div class="pick-p">${renderPortrait(c, 'sm')}</div><div><b>${esc(fn1(c))}</b><div class="small muted">настроение ${mood(c)}, стресс ${Math.round(c.stress)}, усталость ${Math.round(c.fatigue)}, здоровье ${Math.round(c.health)}${c.crave ? ' · просит ' + (c.crave === 'pie' ? 'пирога' : 'пряника') : ''}</div></div></div>`).join('') || '<p class="muted">Некому.</p>', [{ label: 'Закрыть', act: 'close' }]);
}
function gearToCharModal(iid) {
  const f = findGear(iid); if (!f) return;
  const it = f.it, slot = gearSlot(it);
  const list = S.owned.filter(c => c !== f.c && !(gearFem(it) && c.g === 'm')).map(c => {
    const cur = c.gear.find(x => gearSlot(x) === slot);
    const vis = (it.kind === 'outfit' || slot === 'legs') ? (gearShows(c, it) ? ' · <span class="pos">видно на портрете</span>' : ' · только бонусы') : '';
    return `<div class="pick" data-gearto="${c.uid}" data-iid="${iid}"><div class="pick-p">${renderPortrait(c, 'sm')}</div><div><b>${esc(fn1(c))}</b><div class="small muted">${cur ? `сейчас: ${esc(gearName(cur, c))} — уйдёт в сундук` : `слот «${SLOT_NAMES[slot]}» свободен`}${vis}</div></div></div>`;
  }).join('');
  showModal(esc(gearName(it)) + ': кому?', `<p class="small">${esc(gearBonText(it))} · прочность ${it.dur}/${it.maxDur}</p>${list || '<p class="muted">Больше некому.</p>'}`, [{ label: 'Закрыть', act: 'close' }]);
}
function stashToCharModal(uid) {
  const c = findOwned(uid);
  showModal('Надеть из сундука', S.stash.filter(it => !(gearFem(it) && c.g === 'm')).map(it => {
    const cur = c.gear.find(x => gearSlot(x) === gearSlot(it));
    const vis = (it.kind === 'outfit' || gearSlot(it) === 'legs') ? (gearShows(c, it) ? ' · <span class="pos">видно на портрете</span>' : ' · только бонусы') : '';
    return `<div class="pick gear-row q${it.q}" data-gearto="${uid}" data-iid="${it.iid}">${gearIcon(it)}<div><b>${esc(gearName(it, c))}</b> <small>${SLOT_NAMES[gearSlot(it)]}</small><div class="small muted">${esc(gearBonText(it))} · прочность ${it.dur}/${it.maxDur}${cur ? ` · заменит «${esc(gearName(cur, c))}»` : ''}${vis}</div></div></div>`;
  }).join('') || '<p class="muted">Сундук пуст.</p>', [{ label: 'Закрыть', act: 'close' }]);
}
function confirmModal(title, text, label, fn) {
  showModal(title, `<p>${text}</p>`, [{ label: 'Отмена', act: 'close' }, { label, cls: 'btn-primary', act: () => { closeModal(); fn(); } }]);
}
function menuModal() {
  const st = Audio_.st;
  showModal('Меню', `
    <div class="settings">
      <label class="set-row"><span>Музыка</span><input type="checkbox" id="set-music" ${st.music ? 'checked' : ''}></label>
      <label class="set-row"><span>Звуки</span><input type="checkbox" id="set-sfx" ${st.sfx ? 'checked' : ''}></label>
      <label class="set-row"><span>Громкость</span><input type="range" id="set-vol" min="0" max="100" value="${Math.round(st.vol * 100)}"></label>
      <label class="set-row"><span>Обращаться ко мне</span><select id="set-pg"><option value="m" ${playerFem() ? '' : 'selected'}>хозяин, господин</option><option value="f" ${playerFem() ? 'selected' : ''}>хозяйка, госпожа</option></select></label>
      <label class="set-row"><span>Анимации</span><input type="checkbox" id="set-anim" ${Anim.enabled() ? 'checked' : ''}></label>
    </div>
    <p class="small">Игра сохраняется автоматически после каждого действия. Ручное сохранение — отдельный слот.</p>`,
    [{ label: 'Сохранить в слот', act: () => { localStorage.setItem(MANUAL_KEY, JSON.stringify(S)); closeModal(); toast('Сохранено в ручной слот.'); } },
    { label: 'Загрузить слот', act: () => { if (load(MANUAL_KEY)) { save(); closeModal(); go('manor'); toast('Загружено.'); } else toast('Ручной слот пуст.'); } },
    { label: 'Справка', act: () => helpModal('work') },
    { label: 'Новости', act: () => newsModal() },
    { label: 'Новая игра', cls: 'act-bad', act: () => confirmModal('Новая игра?', 'Автосохранение будет перезаписано.', 'Начать заново', () => { newGame(); go('manor'); }) },
    { label: 'Закрыть', act: 'close' }]);
  document.getElementById('set-music').addEventListener('change', e => Audio_.setMusic(e.target.checked));
  document.getElementById('set-sfx').addEventListener('change', e => Audio_.setSfx(e.target.checked));
  document.getElementById('set-vol').addEventListener('input', e => Audio_.setVol(e.target.value / 100));
  document.getElementById('set-pg').addEventListener('change', e => { S.playerG = e.target.value; save(); toast('Слуги будут обращаться к вам: «' + addr('{х}') + '», «' + addr('{г}') + '».'); });
  document.getElementById('set-anim').addEventListener('change', e => { Anim.setEnabled(e.target.checked); FX.season(true); _lastScreen = null; render(); });
}

let toastT = null;
function toast(t) {
  if (!t) return;
  const el = document.getElementById('toast'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2800);
}

// ---------- обработчики ----------
const CLICK_SEL = '[data-mbtn],[data-go],[data-open],[data-task],[data-trainstat],[data-touch],[data-buy],[data-haggle],[data-appraise],[data-act],[data-sell],[data-free],[data-ransom],[data-mate],[data-mateto],[data-assign],[data-assignto],[data-buyitem],[data-useitem],[data-useitem-for],[data-give],[data-back],[data-pet],[data-unequip],[data-givegear],[data-gearto],[data-repair],[data-sellgear],[data-buygear],[data-wearfrom],[data-borrow],[data-repay],[data-expand],[data-refresh],[data-filter],#endday,#menu-btn,.modal-back';
document.addEventListener('click', (e) => {
  const t = e.target.closest(CLICK_SEL);
  if (!t) return;
  const d = t.dataset;
  if (t.disabled) return;
  if (d.mbtn != null) { const b = document.getElementById('modal')._buttons[+d.mbtn]; if (b.act === 'close') closeModal(); else b.act(); return; }
  if (t.classList.contains('modal-back')) return closeModal();
  if (t.id === 'endday') return dayPlanModal();
  if (t.id === 'menu-btn') return menuModal();
  if (d.go) return go(d.go);
  if (d.back) return go(d.back);
  if (d.task) { e.stopPropagation(); return setTask(d.uid, d.task); }
  if (d.trainstat) return setTrainStat(d.uid, d.trainstat);
  if (d.touch) return touch(d.uid, d.touch, +d.side || 0);
  if (d.pet) return pet(d.pet);
  if (d.buy) { const c = S.market.find(x => x.uid === d.buy); return confirmModal('Покупка', `Купить ${esc(c.name)} за ${fmt(price(c))} мон.?`, 'Купить', () => buy(d.buy)); }
  if (d.haggle) return haggleModal(d.haggle, 'buy');
  if (d.appraise) return appraise(d.appraise);
  if (d.act) return act(d.uid, d.act);
  if (d.sell) { const c = findOwned(d.sell); return showModal('Продажа', `<p>Скупщик предлагает <b>${fmt(sellPrice(c))}</b> мон. за ${esc(c.name)}.</p>`, [{ label: 'Отмена', act: 'close' }, { label: 'Торговаться', act: () => haggleModal(d.sell, 'sell') }, { label: 'Продать', cls: 'btn-primary', act: () => { closeModal(); sell(d.sell); } }]); }
  if (d.free) return confirmModal('Отпустить на волю', `${esc(findOwned(d.free).name)} уйдёт свободным. Вы ничего не получите, кроме доброй славы (репутация растёт).`, 'Отпустить', () => freeChar(d.free, false));
  if (d.ransom) return confirmModal('Принять выкуп', `${esc(findOwned(d.ransom).name)} заплатит ${fmt(price(findOwned(d.ransom)) * 0.4)} мон. и станет свободным.`, 'Принять', () => freeChar(d.ransom, true));
  if (d.mate) return mateModal(d.mate);
  if (d.mateto) return mate(document.getElementById('modal')._mateA, d.mateto);
  if (d.assign) return assignModal(d.assign);
  if (d.assignto) return assignOrder(d.order, d.assignto);
  if (d.buyitem) return buyItem(d.buyitem);
  if (d.useitem) return charForItemModal(d.useitem);
  if (d.useitemFor) return itemForCharModal(d.useitemFor);
  if (d.give) return useItem(d.give, d.uid);
  if (d.unequip) return unequip(d.unequip);
  if (d.givegear) return gearToCharModal(d.givegear);
  if (d.gearto) return giveGear(d.iid, d.gearto);
  if (d.wearfrom) return stashToCharModal(d.wearfrom);
  if (d.repair) return repairGear(d.repair);
  if (d.sellgear) return sellGear(d.sellgear);
  if (d.buygear) return buyGear(d.buygear);
  if (d.borrow) return borrow(+d.borrow);
  if (d.repay) return repay(+d.repay);
  if (d.expand != null) return expand();
  if (d.refresh != null) return refreshMarket();
  if (d.filter) { UI.filter = d.filter; return render(); }
  if (d.open) return openCard(d.open, d.from || 'owned');
});

// ---------- старт ----------
window.addEventListener('DOMContentLoaded', () => {
  if (!load()) newGame();
  else save();
  render();
  if (S._migrated) { delete S._migrated; if (S.market.length < marketSize()) { rollMarket(); makeNews(); } save(); render(); toast('Сохранение перенесено на новую версию игры.'); }
});
