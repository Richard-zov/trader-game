// ===== «Торговец из Медового Лога» — логика прототипа =====
'use strict';

const SAVE_KEY = 'trader_rpg_autosave_v1';
const MANUAL_KEY = 'trader_rpg_manual_v1';
const CAPACITY = 8;
const UPKEEP = 15;

// ---------- утилиты ----------
const R = Math.random;
const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const presetById = (id) => PRESETS.find(p => p.id === id);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
function plural(n, one, few, many) {
  n = Math.abs(Math.round(n)) % 100; const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}
const g = (c, m, f) => (c.g === 'f' ? f : m);
const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let S = null; // состояние
const UI = { screen: 'manor', cardUid: null, cardFrom: null };

// ---------- генерация персонажей ----------
function rollRarity(bonus = 0) {
  const x = R() - bonus;
  let acc = 0;
  const order = [3, 2, 1, 0];
  for (const i of order) { acc += RARITIES[i].chance; if (x < acc) return i; }
  return 0;
}

function rollOrientation() {
  const x = R();
  return x < 0.80 ? 'hetero' : x < 0.95 ? 'bi' : 'homo';
}

function rollAccessories() {
  const n = R() < 0.15 ? 0 : R() < 0.6 ? 1 : R() < 0.85 ? 2 : 3;
  const ids = shuffle(Object.keys(ACCESSORIES));
  const used = new Set(), out = [];
  for (const id of ids) {
    if (out.length >= n) break;
    const slot = ACCESSORIES[id].slot;
    if (used.has(slot)) continue;
    used.add(slot);
    out.push({ id, color: pick(ACC_COLORS) });
  }
  return out;
}

function rollOutfit(presetId) {
  const list = OUTFIT_ART[presetId];
  if (!list || R() < 0.2) return null; // иногда — только бельё
  return pick(list);
}

function rollAge(race) {
  if (race === 'elf') return rint(60, 240);
  if (race === 'dwarf') return rint(30, 110);
  return rint(19, 46);
}

function makeCharacter(opts = {}) {
  const gender = opts.g || (R() < 0.35 ? 'm' : 'f');
  const pool = PRESETS.filter(p => p.g === gender && (!opts.race || p.race === opts.race));
  const p = opts.preset ? presetById(opts.preset) : pick(pool);
  const race = RACES[p.race];
  const rarity = opts.rarity != null ? opts.rarity : rollRarity();
  const rr = RARITIES[rarity];
  const stats = {}, pot = {};
  for (const s of STATS) {
    const base = rint(12, 42) + rr.bonus + (race.mods[s.key] || 0);
    stats[s.key] = clamp(base, 5, 90);
    pot[s.key] = clamp(stats[s.key] + rint(12, 40) + rr.pot, stats[s.key] + 5, 100);
  }
  const nTraits = rint(1, rarity >= 2 ? 3 : 2);
  const traits = shuffle(Object.keys(TRAITS)).slice(0, nTraits);
  // убираем взаимоисключающие
  if (traits.includes('cheerful') && traits.includes('sensitive')) traits.splice(traits.indexOf('sensitive'), 1);
  if (traits.includes('diligent') && traits.includes('lazy')) traits.splice(traits.indexOf('lazy'), 1);
  const breed = gender === 'f'
    ? { fert: rint(30, 95), mat: rint(30, 95) }
    : { line: rint(30, 95), her: rint(30, 95) };
  const c = {
    uid: 'c' + (S.nextId++),
    preset: p.id, g: gender, race: p.race, rarity,
    name: pick(p.names) + ' ' + pick(SURNAMES),
    title: p.title,
    age: rollAge(p.race),
    stats, pot, traits, orient: rollOrientation(), breed,
    loyalty: opts.loyalty != null ? opts.loyalty : rint(15, 45),
    stress: rint(5, 35), fatigue: rint(0, 30), health: rint(80, 100),
    moodMod: 0, discipline: rint(10, 40),
    task: 'rest', trainStat: 'int', status: 'home', orderId: null,
    cooldown: 0, misdeed: false, goodDeed: false, praisedDay: 0, giftDay: 0, disciplineDay: 0,
    acc: rollAccessories(), outfit: rollOutfit(p.id), appraised: false, inherited: [],
    haggleLock: false, priceAdj: 1, sellLockDay: 0,
  };
  return c;
}

// ---------- расчёты ----------
function sumStats(c) { return STATS.reduce((a, s) => a + c.stats[s.key], 0); }
function traitMult(c) { return c.traits.reduce((a, t) => a * TRAITS[t].mult, 1); }
function price(c) {
  const base = RACES[c.race].base;
  return Math.round(base * (1 + sumStats(c) / 400) * RARITIES[c.rarity].mult *
    (0.7 + 0.6 * c.loyalty / 100) * traitMult(c) * (S.demand[c.race] || 1) * (c.priceAdj || 1));
}
const sellPrice = (c) => Math.round(price(c) * 0.9);
function mood(c) {
  return Math.round(clamp(62 + c.moodMod - c.stress * 0.45 - c.fatigue * 0.3 + (c.loyalty - 50) * 0.3 + (c.health - 100) * 0.3));
}
function moodName(m) { return m >= 75 ? 'Радостное' : m >= 55 ? 'Спокойное' : m >= 35 ? 'Унылое' : 'Мрачное'; }
function failChance(c) {
  let f = 0.05 + c.fatigue / 250 + c.stress / 300 - c.discipline / 500;
  if (c.traits.includes('clumsy')) f += 0.06;
  if (c.race === 'dwarf') f /= 2;
  if (c.health < 50) f += 0.1;
  return clamp(f, 0.02, 0.8);
}
function has(c, t) { return c.traits.includes(t); }
function raceName(c) { const r = RACES[c.race]; return c.g === 'f' && r.fname ? r.fname : r.name; }
function rarityName(c) { const r = RARITIES[c.rarity]; return c.g === 'f' ? r.fname : r.name; }
function statName(k) { return STATS.find(s => s.key === k).name; }

function attracted(a, b) {
  if (a.orient === 'bi') return true;
  if (a.orient === 'hetero') return a.g !== b.g;
  return a.g === b.g;
}
function compatHint(a, b) {
  const ab = attracted(a, b), ba = attracted(b, a);
  if (ab && ba) return { lvl: 2, text: 'Между ними явно проскакивает искра' };
  if (ab || ba) return { lvl: 1, text: 'Интерес, похоже, не взаимный' };
  return { lvl: 0, text: 'Вежливы друг с другом — и только' };
}
function prefHint(c) {
  // Ориентация не показывается напрямую — только намёк
  const flavor = {
    hetero: 'Мечтает о встрече «как в старых сказках»',
    bi: g(c, 'Влюбчив', 'Влюбчива') + ': симпатии не делит по правилам',
    homo: 'Сердце тянется к родственной душе особого склада',
  };
  return flavor[c.orient];
}

// ---------- состояние ----------
function newGame() {
  S = {
    v: 1, day: 1, gold: 2000, rep: 5, nextId: 1,
    owned: [], market: [], demand: {}, orders: [],
    inv: { gingerbread: 2, tea: 1 }, births: [], log: [],
    flags: {}, appraiseCost: 40, totalEarned: 0,
  };
  rollDemand();
  const friend = makeCharacter({ rarity: 0, loyalty: 55 });
  friend.task = 'work';
  S.owned.push(friend);
  rollMarket();
  topUpOrders();
  addLog('Вы открыли лавку в Медовом Логе. ' + friend.name.split(' ')[0] + ' — ваш первый помощник.');
  save();
}

function rollDemand() {
  for (const k of Object.keys(RACES)) S.demand[k] = +(0.8 + R() * 0.5).toFixed(2);
  if (S.flags.fair) for (const k in S.demand) S.demand[k] = +(S.demand[k] * 1.2).toFixed(2);
  if (S.flags.rain) for (const k in S.demand) S.demand[k] = +(S.demand[k] * 0.85).toFixed(2);
}
function rollMarket() {
  const n = rint(6, 8);
  S.market = [];
  for (let i = 0; i < n; i++) S.market.push(makeCharacter());
}
function topUpOrders() {
  S.orders = S.orders.filter(o => o.assigned || o.expires >= S.day);
  const used = new Set(S.orders.map(o => o.tpl));
  while (S.orders.filter(o => !o.assigned).length < 4) {
    const avail = ORDER_TEMPLATES.map((t, i) => i).filter(i => !used.has(i));
    if (!avail.length) break;
    const i = pick(avail); used.add(i);
    const t = ORDER_TEMPLATES[i];
    S.orders.push({ id: 'o' + (S.nextId++), tpl: i, expires: S.day + rint(2, 4), assigned: null, daysLeft: 0,
      reward: Math.round(t.reward * (0.9 + R() * 0.3)) });
  }
}
function addLog(t) { S.log.unshift({ day: S.day, t }); S.log = S.log.slice(0, 40); }

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load(key = SAVE_KEY) {
  try { const raw = localStorage.getItem(key); if (!raw) return false; S = JSON.parse(raw); return true; } catch (e) { return false; }
}

const findOwned = (uid) => S.owned.find(c => c.uid === uid);
const findAny = (uid) => findOwned(uid) || S.market.find(c => c.uid === uid);

// ---------- действия: рынок ----------
function buy(uid, discountPct = 0) {
  const c = S.market.find(x => x.uid === uid); if (!c) return;
  if (S.owned.length >= CAPACITY) return toast('В поместье нет свободных мест (' + CAPACITY + ').');
  const cost = Math.round(price(c) * (1 - discountPct / 100));
  if (S.gold < cost) return toast('Не хватает монет: нужно ' + fmt(cost) + '.');
  S.gold -= cost;
  S.market = S.market.filter(x => x !== c);
  c.priceAdj = 1; c.haggleLock = false;
  c.task = 'rest';
  S.owned.push(c);
  addLog(`Куплен${g(c, '', 'а')} ${c.name} за ${fmt(cost)} мон.`);
  toast(`${c.name.split(' ')[0]} теперь живёт в вашем поместье.`);
  save(); openCard(c.uid, 'owned');
}
function sell(uid, markupPct = 0) {
  const c = findOwned(uid); if (!c) return;
  if (c.status !== 'home') return toast('Сначала дождитесь, пока закончится заказ.');
  const got = Math.round(sellPrice(c) * (1 + markupPct / 100));
  S.gold += got; S.totalEarned += got;
  S.owned = S.owned.filter(x => x !== c);
  addLog(`Продан${g(c, '', 'а')} ${c.name} за ${fmt(got)} мон.`);
  toast(`Сделка закрыта: +${fmt(got)} мон.`);
  save(); go('manor');
}
function haggleChance(pct) {
  if (pct <= 0) return 1;
  return clamp(1 - Math.pow(pct / 30, 1.2) * 0.9 + S.rep / 300, 0.03, 0.98);
}
function chanceWord(p) { return p >= 0.85 ? 'почти наверняка' : p >= 0.6 ? 'скорее да' : p >= 0.35 ? 'рискованно' : 'вряд ли'; }

function appraise(uid) {
  const c = findAny(uid); if (!c || c.appraised) return;
  if (S.gold < S.appraiseCost) return toast('Оценщику нужно ' + S.appraiseCost + ' мон.');
  S.gold -= S.appraiseCost; c.appraised = true;
  toast('Оценщик раскрыл скрытый потенциал.');
  save(); render();
}

// ---------- действия: забота и строгость ----------
function loyaltyGain(c, v) { if (v > 0 && has(c, 'loyal')) v *= 1.5; c.loyalty = clamp(c.loyalty + v); return Math.round(v); }
function stressGain(c, v) {
  if (v > 0) { if (has(c, 'cheerful')) v *= 0.7; if (has(c, 'sensitive')) v *= 1.3; }
  c.stress = clamp(c.stress + v);
}

function act(uid, kind) {
  const c = findOwned(uid); if (!c) return;
  let msg = '';
  switch (kind) {
    case 'praise': {
      if (c.praisedDay === S.day) return toast('Сегодня уже хвалили — второй раз прозвучит неискренне.');
      c.praisedDay = S.day;
      const v = loyaltyGain(c, c.goodDeed ? 5 : 2); c.moodMod += 6;
      msg = c.goodDeed ? `${c.name.split(' ')[0]} сияет: похвала заслуженная. Лояльность +${v}.` : `${c.name.split(' ')[0]} улыбается. Лояльность +${v}.`;
      react(c, 'smile', c.goodDeed ? 'Спасибо! Я старал' + g(c, 'ся', 'ась') + '!' : 'Приятно слышать!');
      c.goodDeed = false;
      break;
    }
    case 'gift': {
      if (S.gold < 60) return toast('На подарок нужно 60 мон.');
      if (c.giftDay === S.day) return toast('Подарки каждый час обесценивают подарки. Завтра.');
      S.gold -= 60; c.giftDay = S.day;
      const v = loyaltyGain(c, 6); c.moodMod += 15;
      msg = `Подарок пришёлся по душе. Лояльность +${v}, настроение +15.`;
      react(c, 'blush', 'Это… мне? Спасибо!');
      break;
    }
    case 'scold': {
      if (c.disciplineDay === S.day) return toast('На сегодня строгости достаточно.');
      c.disciplineDay = S.day;
      let d = c.misdeed ? 20 : 12, l = c.misdeed ? 0 : -8;
      if (c.race === 'dwarf' || has(c, 'stubborn')) d = Math.round(d / 2);
      if (c.race === 'beast') l -= 3;
      c.discipline = clamp(c.discipline + d); stressGain(c, 10); loyaltyGain(c, l);
      msg = c.misdeed ? `Выговор по делу. Дисциплина +${d}, стресс +10.` : `Выговор без повода: дисциплина +${d}, но лояльность ${l}. Обидно.`;
      react(c, 'back', c.misdeed ? g(c, 'Понял', 'Поняла') + ', исправлюсь…' : 'За что?..');
      c.misdeed = false;
      break;
    }
    case 'nosweets': {
      if (c.disciplineDay === S.day) return toast('На сегодня строгости достаточно.');
      c.disciplineDay = S.day;
      let d = 8; if (c.race === 'dwarf' || has(c, 'stubborn')) d = 4;
      const l = c.misdeed ? -1 : -5;
      c.discipline = clamp(c.discipline + d); c.moodMod -= has(c, 'gourmet') ? 25 : 12; loyaltyGain(c, l);
      msg = `Без десерта на ужин. Дисциплина +${d}, настроение снизилось, лояльность ${l}.`;
      react(c, 'frown', 'Ну и ладно…');
      c.misdeed = false;
      break;
    }
  }
  toast(msg); save(); render();
}

function setTask(uid, task) {
  const c = findOwned(uid); if (!c || c.status !== 'home') return;
  c.task = task; save(); render();
}
function setTrainStat(uid, k) { const c = findOwned(uid); if (c) { c.trainStat = k; save(); render(); } }

function freeChar(uid, ransom) {
  const c = findOwned(uid); if (!c) return;
  if (c.status !== 'home') return toast('Сначала дождитесь, пока закончится заказ.');
  let txt;
  if (ransom) {
    const r = Math.round(price(c) * 0.4);
    S.gold += r; S.rep += 4;
    txt = `${c.name} внес${g(c, '', 'ла')} выкуп ${fmt(r)} мон. и уш${g(c, 'ёл', 'ла')} вольным человеком. Репутация +4.`;
  } else {
    S.rep += 8 + Math.round(c.loyalty / 20);
    txt = `${c.name} получил${g(c, '', 'а')} вольную. В городе о вас говорят с теплом. Репутация +${8 + Math.round(c.loyalty / 20)}.`;
  }
  S.owned = S.owned.filter(x => x !== c);
  addLog(txt); toast(txt); save(); go('manor');
}

// ---------- союз и наследники ----------
function pairCheck(a, b) {
  if (a.g === b.g) return { ok: false, why: 'Наследник в этом мире бывает только у пары мужчины и женщины.' };
  if (a.status !== 'home' || b.status !== 'home') return { ok: false, why: 'Кто-то из пары сейчас на заказе.' };
  if ((a.kin || []).includes(b.uid) || (b.kin || []).includes(a.uid) || (a.kin && b.kin && a.kin.some(u => b.kin.includes(u))))
    return { ok: false, why: 'Они родня — союз между ними невозможен.' };
  if (a.cooldown > S.day || b.cooldown > S.day) return { ok: false, why: 'Кому-то из пары нужно время (перерыв после прошлого союза).' };
  return { ok: true };
}
function proposeUnion(aUid, bUid) {
  const a = findOwned(aUid), b = findOwned(bUid);
  const chk = pairCheck(a, b); if (!chk.ok) return toast(chk.why);
  const hint = compatHint(a, b);
  const agree = hint.lvl === 2 && mood(a) >= 40 && mood(b) >= 40 && a.loyalty >= 30 && b.loyalty >= 30;
  closeModal();
  if (!agree) {
    a.cooldown = b.cooldown = S.day + 2;
    loyaltyGain(a, -1); loyaltyGain(b, -1);
    const why = hint.lvl < 2 ? 'Сердцу не прикажешь — им не до романтики.' : 'Кому-то из них сейчас не до этого: плохое настроение или мало доверия.';
    addLog(`${a.name.split(' ')[0]} и ${b.name.split(' ')[0]} вежливо отказались от союза.`);
    return showModal('Не сложилось', `<p>${esc(a.name.split(' ')[0])} и ${esc(b.name.split(' ')[0])} вежливо отказываются. ${why}</p><p class="muted">Попробовать снова можно через 2 дня.</p>`);
  }
  const f = a.g === 'f' ? a : b, m = a.g === 'm' ? a : b;
  const chance = clamp((f.breed.fert * 0.55 + m.breed.line * 0.45) / 100 + 0.1, 0.2, 0.95);
  a.cooldown = b.cooldown = S.day + 10;
  if (R() < chance) {
    S.births.push({ due: S.day + 5, a: a.uid, b: b.uid, snap: [JSON.parse(JSON.stringify(f)), JSON.parse(JSON.stringify(m))] });
    loyaltyGain(a, 5); loyaltyGain(b, 5); a.moodMod += 15; b.moodMod += 15;
    addLog(`${f.name.split(' ')[0]} и ${m.name.split(' ')[0]} заключили союз. Ждём наследника через 5 дней.`);
    showModal('Союз заключён', `<p>${esc(f.name.split(' ')[0])} и ${esc(m.name.split(' ')[0])} счастливы. По доброй традиции Медового Лога наследники растут в <b>Приюте Ростков</b>, где феи ускоряют время.</p><p>Через <b>5 дней</b> в поместье придёт их взрослый наследник и унаследует часть потенциала родителей.</p><p class="muted">Следующий союз для них — через 10 дней.</p>`);
  } else {
    a.cooldown = b.cooldown = S.day + 4;
    addLog(`${f.name.split(' ')[0]} и ${m.name.split(' ')[0]}: в этот раз без наследника.`);
    showModal('Союз заключён', `<p>Пара провела чудесный вечер, но феи Приюта Ростков в этот раз не прислали весточку.</p><p class="muted">Шанс был ${Math.round(chance * 100)}%. Можно попробовать через 4 дня.</p>`);
  }
  save(); render();
}

function makeHeir(birth) {
  const [f, m] = birth.snap;
  const race = R() < 0.5 ? f.race : m.race;
  const child = makeCharacter({ race, rarity: clamp(Math.max(f.rarity, m.rarity) - (R() < 0.6 ? 1 : 0) + (R() < 0.08 ? 1 : 0), 0, 3), loyalty: 60 });
  // 3 потенциала из 16 родительских
  const pool = [];
  for (const s of STATS) { pool.push({ k: s.key, v: f.pot[s.key] }); pool.push({ k: s.key, v: m.pot[s.key] }); }
  const quality = (f.breed.mat + m.breed.her) / 200; // насколько удачно наследуются лучшие
  pool.sort((x, y) => y.v - x.v);
  const taken = new Set(); child.inherited = [];
  while (child.inherited.length < 3) {
    const cand = R() < quality ? pool.find(p => !taken.has(p.k)) : pick(pool.filter(p => !taken.has(p.k)));
    taken.add(cand.k);
    child.pot[cand.k] = Math.max(child.pot[cand.k], cand.v);
    child.stats[cand.k] = Math.min(child.stats[cand.k], child.pot[cand.k] - 5);
    child.inherited.push(cand.k);
  }
  const pTraits = [...f.traits, ...m.traits];
  const t = pick(pTraits);
  if (t && !child.traits.includes(t)) child.traits[0] = t;
  child.traits = [...new Set(child.traits)];
  child.title = g(child, 'Наследник рода', 'Наследница рода');
  child.parents = [f.name, m.name];
  child.kin = [f.uid, m.uid, ...(f.kin || []), ...(m.kin || [])];
  child.appraised = true;
  return child;
}

// ---------- заказы ----------
function orderChance(c, o) {
  const t = ORDER_TEMPLATES[o.tpl];
  let p = 0.55 + (c.stats[t.stat] - t.min) / 50 + c.stats.luk / 400 - c.fatigue / 300;
  if (has(c, 'lucky')) p += 0.1;
  return clamp(p, 0.05, 0.97);
}
function assignOrder(oid, uid) {
  const o = S.orders.find(x => x.id === oid), c = findOwned(uid);
  if (!o || !c || c.status !== 'home') return;
  o.assigned = uid; o.daysLeft = ORDER_TEMPLATES[o.tpl].days;
  c.status = 'order'; c.orderId = oid;
  closeModal();
  toast(`${c.name.split(' ')[0]} отправил${g(c, 'ся', 'ась')} выполнять заказ.`);
  save(); render();
}

// ---------- предметы ----------
function buyItem(id) {
  const it = ITEMS[id];
  if (S.gold < it.price) return toast('Не хватает монет.');
  S.gold -= it.price; S.inv[id] = (S.inv[id] || 0) + 1;
  toast(`Куплено: ${it.name}.`); save(); render();
}
function useItem(id, uid) {
  const c = findOwned(uid); if (!c || !(S.inv[id] > 0)) return;
  let msg = '';
  switch (id) {
    case 'gingerbread': c.moodMod += has(c, 'gourmet') ? 30 : 15; msg = 'Пряник съеден с явным удовольствием.'; react(c, 'smile', 'М-м, медовый!'); break;
    case 'tea': c.stress = clamp(c.stress - 20); msg = 'Чай с мятой — стресс −20.'; react(c, 'smile', 'Сразу легче…'); break;
    case 'tonic': c.fatigue = clamp(c.fatigue - 35); msg = 'Эликсир бодрости — усталость −35.'; react(c, 'surprised', 'Ух! Бодрит!'); break;
    case 'book': c.stats[c.trainStat] = Math.min(c.pot[c.trainStat], c.stats[c.trainStat] + 3); msg = `Учебник: ${statName(c.trainStat)} +3 (до предела потенциала).`; react(c, 'neutral', 'Интересно…'); break;
    case 'cloak': { const v = loyaltyGain(c, 10); c.moodMod += 10; msg = `Тёплый плащ — лояльность +${v}.`; react(c, 'blush', 'Он такой мягкий!'); break; }
    case 'amulet': c.pot.luk = clamp(c.pot.luk + 4); c.stats.luk = Math.min(c.pot.luk, c.stats.luk + 2); msg = 'Амулет удачи: Удача +2, потенциал +4.'; react(c, 'smile', 'Чувствую, повезёт!'); break;
  }
  S.inv[id]--; if (!S.inv[id]) delete S.inv[id];
  closeModal(); toast(msg); save(); render();
}

// ---------- события ----------
const EVENTS = [
  { id: 'fair', w: 1, run() { S.flags.fair = true; return 'Завтра в Медовом Логе ярмарка! Спрос на рынке вырастет на 20%.'; } },
  { id: 'tax', w: 1, run() { const t = Math.max(50, Math.round(S.gold * 0.05)); S.gold -= t; return `Заглянул сборщик податей с толстой книгой. Пришлось отдать ${fmt(t)} мон.`; } },
  { id: 'scholar', w: 1, need: 1, run() { const c = pick(homeChars()); c.stats.int = Math.min(c.pot.int, c.stats.int + 3); return `Странствующий учёный полдня спорил с ${c.name.split(' ')[0]} о звёздах. Ум +3.`; } },
  { id: 'quarrel', w: 1, need: 2, run() { const [a, b] = shuffle(homeChars()); stressGain(a, 15); stressGain(b, 15); return `${a.name.split(' ')[0]} и ${b.name.split(' ')[0]} поругались из-за последней булочки. У обоих стресс +15.`; } },
  { id: 'song', w: 1, need: 1, run() { homeChars().forEach(c => c.stress = clamp(c.stress - 10)); return 'Вечером все собрались у камина и пели старые песни. Стресс у всех −10.'; } },
  { id: 'cold', w: 1, need: 1, run() { const c = pick(homeChars()); if (has(c, 'hardy')) return `${c.name.split(' ')[0]} промок${g(c, '', 'ла')} под дождём, но крепкое здоровье выручило.`; c.health = clamp(c.health - 20); c.sickDays = 2; return `${c.name.split(' ')[0]} простудил${g(c, 'ся', 'ась')}: здоровье −20, два дня постельного режима.`; } },
  { id: 'wallet', w: 1, need: 1, run() { const c = pick(homeChars()); const v = rint(50, 150); if (c.loyalty >= 55) { S.gold += v; c.goodDeed = true; return `${c.name.split(' ')[0]} наш${g(c, 'ёл', 'ла')} на дороге кошелёк и честно принес${g(c, '', 'ла')} вам. +${v} мон.`; } return `Кто-то в поместье нашёл кошелёк… но вам о нём, кажется, не рассказали.`; } },
  { id: 'escape', w: 2, need: 1, cond: () => homeChars().some(c => c.loyalty < 20), run() { const c = homeChars().filter(c => c.loyalty < 20)[0]; if (c.discipline > 50) { c.misdeed = true; return `${c.name.split(' ')[0]} собрал${g(c, '', 'а')} узелок и почти ${g(c, 'ушёл', 'ушла')} ночью, но передумал${g(c, '', 'а')} у ворот. Есть повод поговорить.`; } S.owned = S.owned.filter(x => x !== c); return `${c.name} сбежал${g(c, '', 'а')} ночью, прихватив пару яблок. Низкая лояльность — тревожный знак.`; } },
  { id: 'admirer', w: 1, need: 1, run() { const c = pick(homeChars()); c.moodMod += 20; return `${c.name.split(' ')[0]} получил${g(c, '', 'а')} анонимную записку с ромашкой. Настроение +20.`; } },
  { id: 'rain', w: 1, run() { S.flags.rain = true; return 'Над городом зарядили ливни. Завтра покупателей будет меньше: спрос −15%.'; } },
  { id: 'peddler', w: 1, run() { const id = pick(Object.keys(ITEMS)); S.inv[id] = (S.inv[id] || 0) + 1; return `Бродячий торговец расплатился за ночлег: ${ITEMS[id].name}.`; } },
  { id: 'guild', w: 1, run() { S.rep += 3; return 'Гильдия купцов отметила вашу лавку в ежемесячном листке. Репутация +3.'; } },
  { id: 'mouse', w: 1, run() { if (S.inv.gingerbread) { S.inv.gingerbread--; if (!S.inv.gingerbread) delete S.inv.gingerbread; return 'В кладовой завелась мышь и утащила медовый пряник.'; } return 'В кладовой завелась мышь, но, не найдя пряников, обиженно ушла.'; } },
  { id: 'thanks', w: 1, need: 1, cond: () => homeChars().some(c => c.loyalty >= 75), run() { const c = homeChars().filter(c => c.loyalty >= 75)[0]; const v = rint(40, 120); S.gold += v; return `${c.name.split(' ')[0]} отложил${g(c, '', 'а')} чаевые с работы и отдал${g(c, '', 'а')} их в общую кассу. +${v} мон.`; } },
  { id: 'stars', w: 1, need: 1, run() { const c = pick(homeChars()); c.pot.luk = clamp(c.pot.luk + 5); return `${c.name.split(' ')[0]} загадал${g(c, '', 'а')} желание на падающую звезду. Потенциал удачи +5.`; } },
];
function homeChars() { return S.owned.filter(c => c.status === 'home'); }
function rollEvent() {
  const pool = EVENTS.filter(e => (!e.need || homeChars().length >= e.need) && (!e.cond || e.cond()));
  const total = pool.reduce((a, e) => a + e.w, 0);
  let x = R() * total;
  for (const e of pool) { x -= e.w; if (x <= 0) return e; }
  return pool[0];
}

// ---------- завершение дня ----------
function endDay() {
  const lines = [];
  let income = 0;
  S.flags = {};
  for (const c of S.owned.slice()) {
    const n = c.name.split(' ')[0];
    if (c.status === 'order') {
      const o = S.orders.find(x => x.id === c.orderId);
      c.fatigue = clamp(c.fatigue + 12); stressGain(c, 6);
      if (!o) { c.status = 'home'; continue; }
      o.daysLeft--;
      if (o.daysLeft > 0) lines.push(`${n} выполняет заказ «${ORDER_TEMPLATES[o.tpl].title}», осталось ${o.daysLeft} дн.`);
      if (o.daysLeft <= 0) {
        const t = ORDER_TEMPLATES[o.tpl];
        if (R() < orderChance(c, o)) {
          S.gold += o.reward; income += o.reward; S.rep += 2; c.goodDeed = true; loyaltyGain(c, 2);
          c.stats[t.stat] = Math.min(c.pot[t.stat], c.stats[t.stat] + 2);
          lines.push(`+ ${n}: заказ «${t.title}» выполнен. +${fmt(o.reward)} мон., репутация +2.`);
        } else {
          const half = Math.round(o.reward * 0.25); S.gold += half; income += half; c.misdeed = true; stressGain(c, 10);
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
    const fail = R() < failChance(c);
    if (task === 'work') {
      let f = 20; if (has(c, 'lazy')) f *= 1.3;
      c.fatigue = clamp(c.fatigue + f); stressGain(c, c.race === 'elf' ? 15 : 10);
      if (fail) { c.misdeed = true; stressGain(c, 8); lines.push(`− ${n} на работе всё перепутал${g(c, '', 'а')}. Дохода нет.`); }
      else {
        let v = 25 + (c.stats.mas + c.stats.str + c.stats.cha) / 5;
        if (c.race === 'human') v *= 1.1; if (has(c, 'diligent')) v *= 1.2;
        v = Math.round(v); S.gold += v; income += v;
        if (R() < 0.3) c.stats.mas = Math.min(c.pot.mas, c.stats.mas + 1);
        lines.push(`${n} поработал${g(c, '', 'а')}: +${v} мон.`);
      }
    } else if (task === 'train') {
      const cost = 30;
      if (S.gold < cost) { lines.push(`На обучение ${n} не хватило монет — сегодня отдых.`); c.fatigue = clamp(c.fatigue - 35); c.stress = clamp(c.stress - 20); }
      else {
        S.gold -= cost; income -= cost;
        c.fatigue = clamp(c.fatigue + (has(c, 'lazy') ? 20 : 15)); stressGain(c, 8);
        if (fail) { c.misdeed = true; lines.push(`− ${n} отвлекал${g(c, 'ся', 'ась')} на уроке. Навык не вырос (−${cost} мон.).`); }
        else {
          const k = c.trainStat, room = c.pot[k] - c.stats[k];
          let gain = room <= 0 ? 0 : Math.max(1, Math.round(rint(2, 5) * Math.min(1, room / 15)));
          if (c.race === 'elf') gain = Math.round(gain * 1.3); if (has(c, 'clever')) gain = Math.round(gain * 1.5);
          gain = Math.min(gain, room);
          c.stats[k] += gain;
          lines.push(gain > 0 ? `${n} учил${g(c, 'ся', 'ась')}: ${statName(k)} +${gain} (−${cost} мон.).` : `${n} упёрся в предел потенциала по навыку «${statName(k)}».`);
        }
      }
    } else {
      c.fatigue = clamp(c.fatigue - (c.race === 'beast' ? 60 : 35)); c.stress = clamp(c.stress - 20);
      c.health = clamp(c.health + 10);
    }
    if (c.fatigue >= 90) { c.health = clamp(c.health - 10); lines.push(`! ${n} валится с ног от усталости: здоровье −10.`); }
  }
  // содержание
  const up = S.owned.length * UPKEEP; S.gold -= up; income -= up;
  if (up) lines.push(`Еда и постель для обитателей поместья: −${up} мон.`);
  // настроение и лояльность
  for (const c of S.owned) {
    c.moodMod = Math.round(c.moodMod * 0.6);
    const m = mood(c);
    if (m >= 70) loyaltyGain(c, 1); else if (m < 35) loyaltyGain(c, -2);
    if (c.stress > 80) loyaltyGain(c, -1);
    c.discipline = clamp(c.discipline - 2);
  }
  // наследники
  for (const b of S.births.filter(b => b.due <= S.day + 1)) {
    const child = makeHeir(b);
    S.owned.push(child);
    lines.push(`Из Приюта Ростков ${g(child, 'пришёл', 'пришла')} ${child.name} — взросл${g(child, 'ый наследник', 'ая наследница')} ${b.snap[0].name.split(' ')[0]} и ${b.snap[1].name.split(' ')[0]}.`);
  }
  S.births = S.births.filter(b => b.due > S.day + 1);
  // событие
  let ev = null;
  if (R() < 0.75) { const e = rollEvent(); if (e) ev = e.run(); }
  if (S.gold < 0) lines.push('! Касса ушла в минус! Пока долги не закрыты, покупать нельзя.');
  S.day++;
  rollDemand(); rollMarket(); topUpOrders();
  addLog(`День ${S.day - 1}: итог ${income >= 0 ? '+' : ''}${fmt(income)} мон.`);
  if (ev) addLog(ev);
  save(); render();
  showModal(`Итоги дня ${S.day - 1}`,
    `<ul class="report">${lines.map(l => `<li>${esc(l)}</li>`).join('') || '<li>Тихий день.</li>'}</ul>
     <div class="report-total">Итог по делам: <b class="${income >= 0 ? 'pos' : 'neg'}">${income >= 0 ? '+' : ''}${fmt(income)}</b> мон.</div>
     ${ev ? `<div class="event-box"><div class="event-title">Событие</div>${esc(ev)}</div>` : ''}
     <p class="muted">На рынке новый товар: ${S.market.length} ${plural(S.market.length, 'предложение', 'предложения', 'предложений')}.</p>`,
    [{ label: 'Новый день!', cls: 'btn-primary', act: 'close' }]);
}

// ---------- реакции портрета ----------
const TOUCH_LINES = {
  head: { hi: ['Хи-хи, щекотно!', 'Это приятно…', 'Ещё чуть-чуть, ладно?'], mid: ['Э-э… я же не котёнок.', 'Причёску помнёте!'], lo: ['Не надо, пожалуйста.', 'Я… лучше отойду.'] },
  cheek: { hi: ['Ой… вы меня смущаете!', 'Щёки горят…'], mid: ['Н-ну что вы…', 'У меня что-то на лице?'], lo: ['Держите дистанцию.', 'Не трогайте.'] },
  shoulder: { hi: ['Я справлюсь, не волнуйтесь!', 'Рад(а) стараться!'], mid: ['Да? Что-то нужно?', 'Я слушаю.'], lo: ['Я слушаю… только не так близко.', 'Что опять?'] },
  hand: { hi: ['Пойдёмте, покажу, что я сегодня сделал(а)!', 'Ладонь у вас тёплая.'], mid: ['Ой… рукопожатие? Ладно.', 'Договорились!'], lo: ['Я сам(а) справлюсь.', 'Не нужно.'] },
};
const TOUCH_EXPR = {
  head: { hi: 'smile', mid: 'blush', lo: 'back' },
  cheek: { hi: 'blush', mid: 'blush', lo: 'back' },
  shoulder: { hi: 'smile', mid: 'neutral', lo: 'back' },
  hand: { hi: 'smile', mid: 'blush', lo: 'back' },
};
function touch(uid, zone) {
  const c = findAny(uid); if (!c) return;
  const tier = c.loyalty >= 65 ? 'hi' : c.loyalty >= 35 ? 'mid' : 'lo';
  let line = pick(TOUCH_LINES[zone][tier]);
  line = line.replace('Рад(а)', g(c, 'Рад', 'Рада')).replace('сделал(а)', g(c, 'сделал', 'сделала')).replace('сам(а)', g(c, 'сам', 'сама'));
  react(c, TOUCH_EXPR[zone][tier], line);
}
let reactTimer = null;
function react(c, expr, line) { setTimeout(() => reactNow(c, expr, line), 0); }
function reactNow(c, expr, line) {
  const el = document.querySelector(`.card-portrait[data-uid="${c.uid}"] .portrait`);
  const bub = document.querySelector(`.card-portrait[data-uid="${c.uid}"] .bubble`);
  if (!el) return;
  el.className = el.className.replace(/expr-\w+/g, '').trim() + ' expr-' + expr;
  if (expr === 'back') el.classList.add('expr-frown');
  if (bub && line) { bub.textContent = line; bub.classList.add('show'); }
  clearTimeout(reactTimer);
  reactTimer = setTimeout(() => {
    el.className = el.className.replace(/expr-\w+/g, '').trim() + ' expr-neutral';
    if (bub) bub.classList.remove('show');
  }, 1800);
}

// ---------- рендер ----------
const $app = () => document.getElementById('screen');
function go(screen) { UI.screen = screen; UI.cardUid = null; render(); $app().scrollTop = 0; }
function openCard(uid, from) { UI.screen = 'card'; UI.cardUid = uid; UI.cardFrom = from; render(); document.getElementById('screen').scrollTop = 0; }

function render() {
  document.getElementById('gold').textContent = fmt(S.gold);
  document.getElementById('gold').classList.toggle('neg', S.gold < 0);
  document.getElementById('day').textContent = 'День ' + S.day;
  document.getElementById('rep').textContent = repRank() + ' · ' + S.rep;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === (UI.screen === 'card' ? (UI.cardFrom === 'market' ? 'market' : 'manor') : UI.screen)));
  const map = { manor: viewManor, market: viewMarket, card: viewCard, tavern: viewTavern, bag: viewBag };
  $app().innerHTML = (map[UI.screen] || viewManor)();
}
function repRank() { const r = S.rep; return r >= 120 ? 'S' : r >= 80 ? 'A' : r >= 50 ? 'B' : r >= 30 ? 'C' : r >= 15 ? 'D' : r >= 5 ? 'E' : 'F'; }

function bar(label, v, cls, title) {
  return `<div class="mbar ${cls || ''}" title="${title || ''}"><span class="mbar-l">${label}</span><span class="mbar-t"><i style="width:${clamp(v)}%"></i></span><span class="mbar-v">${Math.round(v)}</span></div>`;
}
const TASKS = { work: 'Работа', train: 'Обучение', rest: 'Отдых' };

function viewManor() {
  const rows = S.owned.map(c => {
    const busy = c.status === 'order';
    const o = busy && S.orders.find(x => x.id === c.orderId);
    return `<div class="row-card rarity-${RARITIES[c.rarity].key}" data-open="${c.uid}">
      <div class="row-portrait">${renderPortrait(c, 'sm')}</div>
      <div class="row-body">
        <div class="row-name">${esc(c.name.split(' ')[0])} <span class="chip chip-r">${rarityName(c)}</span></div>
        <div class="row-sub">${raceName(c)} · ${esc(c.title)}</div>
        ${bar('Лояльн.', c.loyalty, 'b-loy')}${bar('Устал.', c.fatigue, 'b-fat')}
        ${busy ? `<div class="busy">На заказе: «${esc(ORDER_TEMPLATES[o.tpl].title)}», ещё ${o.daysLeft} дн.</div>` :
        `<div class="seg" data-stop>${Object.entries(TASKS).map(([k, n]) => `<button class="seg-b ${c.task === k ? 'on' : ''}" data-task="${k}" data-uid="${c.uid}">${n}</button>`).join('')}</div>`}
      </div></div>`;
  }).join('');
  const births = S.births.map(b => `<div class="note">Наследник ${esc(b.snap[0].name.split(' ')[0])} и ${esc(b.snap[1].name.split(' ')[0])} придёт на ${b.due} день.</div>`).join('');
  return `<div class="screen-head"><h1>Поместье</h1><div class="sub">Мест: ${S.owned.length}/${CAPACITY} · содержание ${S.owned.length * UPKEEP} мон./день</div></div>
    ${births}
    ${rows || `<div class="empty parchment">В поместье тихо и пусто. Загляните на рынок — сегодня там ${S.market.length} ${plural(S.market.length, 'предложение', 'предложения', 'предложений')}.</div>`}
    <div class="log parchment"><div class="panel-title">Дневник торговца</div>${S.log.slice(0, 6).map(l => `<div class="log-l"><b>д.${l.day}</b> ${esc(l.t)}</div>`).join('')}</div>`;
}

function viewMarket() {
  const dem = Object.entries(S.demand).map(([k, v]) => `<span class="chip ${v >= 1.1 ? 'chip-up' : v <= 0.9 ? 'chip-down' : ''}">${RACES[k].plural} ×${v.toFixed(2)}</span>`).join('');
  const cards = S.market.map(c => `<div class="m-card rarity-${RARITIES[c.rarity].key}" data-open="${c.uid}" data-from="market">
      <div class="m-portrait">${renderPortrait(c, 'sm')}<span class="m-rar">${rarityName(c)}</span></div>
      <div class="m-name">${esc(c.name.split(' ')[0])}</div>
      <div class="m-title">${raceName(c)} · ${esc(c.title)}</div>
      <div class="m-price"><span class="coin"></span>${fmt(price(c))}</div>
    </div>`).join('');
  return `<div class="screen-head market-head"><div class="keeper">${renderPortrait({ preset: 'm08', acc: [{ id: 'hat', color: '#4f6b3a' }] }, 'sm')}</div>
    <div><h1>Рынок</h1><div class="sub">Каждый день — новые лица. Спрос сегодня:</div><div class="chips">${dem}</div></div></div>
    <div class="m-grid">${cards || '<div class="empty parchment">Сегодня всё раскупили. Завтра будет новый привоз.</div>'}</div>`;
}

function viewCard() {
  const c = findAny(UI.cardUid);
  if (!c) { UI.screen = 'manor'; return viewManor(); }
  const owned = !!findOwned(c.uid);
  const p = presetById(c.preset);
  const m = mood(c);
  const statsHtml = STATS.map(s => {
    const v = c.stats[s.key], pv = c.pot[s.key];
    const inh = c.inherited && c.inherited.includes(s.key);
    return `<div class="stat ${owned && c.trainStat === s.key ? 'training' : ''}" ${owned ? `data-trainstat="${s.key}" data-uid="${c.uid}"` : ''}>
      <span class="stat-ico"><svg><use href="#i-${s.key}"/></svg></span>
      <div class="stat-body"><div class="stat-n">${s.name}${inh ? ' <span class="inh" title="Унаследовано">★</span>' : ''}</div>
      <div class="stat-bar"><i style="width:${v}%"></i>${c.appraised ? `<b class="pot" style="left:${pv}%"></b>` : ''}</div></div>
      <span class="stat-v">${v}${c.appraised ? `<small>/${pv}</small>` : ''}</span></div>`;
  }).join('');
  const breed = c.g === 'f'
    ? `${bar('Плодовитость', c.breed.fert, 'b-br')}${bar('Матер. стать', c.breed.mat, 'b-br')}`
    : `${bar('Сила рода', c.breed.line, 'b-br')}${bar('Наследств.', c.breed.her, 'b-br')}`;
  const traits = c.traits.map(t => `<span class="chip chip-t" title="${TRAITS[t].desc}">${TRAITS[t].name}<small>${TRAITS[t].desc}</small></span>`).join('');
  const r = RACES[c.race];
  const busy = c.status === 'order';
  const fc = Math.round(failChance(c) * 100);
  let actions = '';
  if (!owned) {
    actions = `<div class="price-box"><div>Цена: <b><span class="coin"></span>${fmt(price(c))}</b></div>
      <div class="muted small">раса ${r.base} × навыки ${(1 + sumStats(c) / 400).toFixed(2)} × редкость ${RARITIES[c.rarity].mult} × лояльность ${(0.7 + 0.6 * c.loyalty / 100).toFixed(2)} × черты ${traitMult(c).toFixed(2)} × спрос ${S.demand[c.race].toFixed(2)}${c.priceAdj > 1 ? ' × обида продавца 1.10' : ''}</div></div>
      <div class="btn-row">
        <button class="btn btn-primary" data-buy="${c.uid}">Купить</button>
        <button class="btn" data-haggle="${c.uid}" ${c.haggleLock ? 'disabled' : ''}>${c.haggleLock ? 'Продавец обижен' : 'Торговаться'}</button>
        ${c.appraised ? '' : `<button class="btn" data-appraise="${c.uid}">Оценщик (${S.appraiseCost})</button>`}
      </div>`;
  } else {
    const praiseReady = c.praisedDay !== S.day;
    actions = `
      <div class="panel parchment"><div class="panel-title">Распорядок на завтра</div>
        ${busy ? `<div class="busy">Сейчас на заказе — распорядок недоступен.</div>` :
        `<div class="seg big">${Object.entries(TASKS).map(([k, n]) => `<button class="seg-b ${c.task === k ? 'on' : ''}" data-task="${k}" data-uid="${c.uid}">${n}</button>`).join('')}</div>
        <div class="muted small">${c.task === 'work' ? 'Монеты по Мастерству, Силе и Обаянию. Усталость +20, стресс +10.' :
          c.task === 'train' ? `Учит навык «${statName(c.trainStat)}» (нажмите на навык выше, чтобы сменить). 30 мон./день, усталость +15.` :
            'Усталость и стресс снижаются, здоровье восстанавливается.'} Шанс ошибки: <b>${fc}%</b>.</div>`}
      </div>
      <div class="panel parchment"><div class="panel-title">Забота и строгость</div>
        <div class="act-grid">
          <button class="btn act-good" data-act="praise" data-uid="${c.uid}" ${praiseReady ? '' : 'disabled'}>Похвалить<small>${c.goodDeed ? 'есть за что: лояльность +5' : 'лояльность +2'}</small></button>
          <button class="btn act-good" data-act="gift" data-uid="${c.uid}">Подарок · 60<small>лояльность +6, настроение +15</small></button>
          <button class="btn act-bad" data-act="scold" data-uid="${c.uid}">Выговор<small>${c.misdeed ? 'по делу: дисциплина +20' : 'без повода: лояльность −8'}</small></button>
          <button class="btn act-bad" data-act="nosweets" data-uid="${c.uid}">Без десерта<small>дисциплина +8, настроение −12</small></button>
        </div>
        ${c.misdeed ? `<div class="note warn">Недавно провинил${g(c, 'ся', 'ась')}: строгость сейчас будет воспринята как справедливая.</div>` : ''}
        <div class="btn-row"><button class="btn" data-useitem-for="${c.uid}">Дать предмет</button>
        <button class="btn" data-pair="${c.uid}" ${busy || c.cooldown > S.day ? 'disabled' : ''}>Союз${c.cooldown > S.day ? ` (через ${c.cooldown - S.day} дн.)` : ''}</button>
        ${c.appraised ? '' : `<button class="btn" data-appraise="${c.uid}">Оценщик (${S.appraiseCost})</button>`}</div>
      </div>
      <div class="panel parchment"><div class="panel-title">Сделки</div>
        <div class="muted small">Скупщик даст ≈ <b>${fmt(sellPrice(c))}</b> мон. (рынок берёт 10%). Выкуп: ${fmt(price(c) * 0.4)} мон.</div>
        <div class="btn-row">
          <button class="btn" data-sell="${c.uid}" ${busy || c.sellLockDay === S.day ? 'disabled' : ''}>${c.sellLockDay === S.day ? 'Покупатель ушёл' : 'Продать'}</button>
          <button class="btn act-good" data-free="${c.uid}" ${busy ? 'disabled' : ''}>Отпустить на волю</button>
          <button class="btn" data-ransom="${c.uid}" ${busy ? 'disabled' : ''}>Принять выкуп</button>
        </div></div>`;
  }
  return `<div class="card-top">
    <button class="back-btn" data-back="${UI.cardFrom === 'market' ? 'market' : 'manor'}" aria-label="Назад"></button>
    <h1>${owned ? 'Карточка' : 'На продажу'}</h1></div>
    <div class="card-grid">
      <div class="card-left">
        <div class="card-portrait rarity-${RARITIES[c.rarity].key}" data-uid="${c.uid}" style="--fh:${figHeight(presetById(c.preset))}">
          ${renderPortrait(c, 'lg')}
          <div class="zones">
            <div class="zone z-head" data-touch="head" data-uid="${c.uid}"></div>
            <div class="zone z-cheek z-cl" data-touch="cheek" data-uid="${c.uid}"></div>
            <div class="zone z-cheek z-cr" data-touch="cheek" data-uid="${c.uid}"></div>
            <div class="zone z-shoulder z-sl" data-touch="shoulder" data-uid="${c.uid}"></div>
            <div class="zone z-shoulder z-sr" data-touch="shoulder" data-uid="${c.uid}"></div>
            <div class="zone z-hand" data-touch="hand" data-uid="${c.uid}"></div>
          </div>
          <div class="bubble"></div>
          <span class="touch-hint">Коснитесь портрета</span>
        </div>
        <div class="name-plate parchment">
          <div class="np-name">${esc(c.name)}</div>
          <div class="np-sub">${raceName(c)} · ${c.age} ${plural(c.age, 'год', 'года', 'лет')}</div>
          <div class="np-sub">${esc(c.title)}</div>
          <div class="np-rar rar-${RARITIES[c.rarity].key}">${rarityName(c)}</div>
          ${wearHtml(c)}
        </div>
      </div>
      <div class="card-right parchment">
        <div class="panel-title">Навыки</div>
        ${statsHtml}
        ${c.appraised ? '' : '<div class="muted small center">Потенциал скрыт. Его раскроет оценщик.</div>'}
      </div>
    </div>
    ${owned ? '' : actions}
    <div class="panel parchment">
      <div class="panel-title">Состояние</div>
      ${bar('Лояльность', c.loyalty, 'b-loy')}${bar('Настроение', m, 'b-mood', moodName(m))}
      ${bar('Стресс', c.stress, 'b-str')}${bar('Усталость', c.fatigue, 'b-fat')}
      ${bar('Здоровье', c.health, 'b-hp')}${bar('Дисциплина', c.discipline, 'b-dis')}
      <div class="muted small">Настроение: <b>${moodName(m)}</b>. ${c.loyalty >= 75 ? 'Предан' + g(c, '', 'а') + ' вам всей душой.' : c.loyalty < 20 ? 'Может сбежать, если так пойдёт и дальше.' : ''}</div>
    </div>
    <div class="panel parchment">
      <div class="panel-title">Черты и происхождение</div>
      <div class="chips">${traits}</div>
      <div class="race-box"><b>${r.plural}:</b> ${r.bonus}. <i>${r.quirk}.</i></div>
      ${c.parents ? `<div class="muted small">Родители: ${esc(c.parents.join(' и '))}. Унаследованные навыки отмечены ★.</div>` : ''}
    </div>
    <div class="panel parchment">
      <div class="panel-title">Род и сердце</div>
      ${breed}
      <div class="hint">${esc(prefHint(c))}</div>
    </div>
    ${owned ? actions : ''}`;
}

function wearHtml(c) {
  const o = c.outfit && OUTFITS[c.outfit] ? OUTFITS[c.outfit].name : 'Только бельё';
  const icons = (c.acc || []).filter(a => ACCESSORIES[a.id]).map(a =>
    `<span class="acc-ico" title="${ACCESSORIES[a.id].name}"><img src="${PORTRAIT_CFG.accDir}${a.id}.png" alt="${ACCESSORIES[a.id].name}"></span>`).join('');
  return `<div class="wear"><div class="np-sub">Наряд: <b>${o}</b></div>${icons ? `<div class="acc-row">${icons}</div><div class="acc-names">${(c.acc || []).filter(a => ACCESSORIES[a.id]).map(a => ACCESSORIES[a.id].name).join(', ')}</div>` : ''}</div>`;
}

function viewTavern() {
  const orders = S.orders.map(o => {
    const t = ORDER_TEMPLATES[o.tpl];
    const ass = o.assigned && findOwned(o.assigned);
    return `<div class="order parchment">
      <div class="order-h"><b>${esc(t.title)}</b><span class="order-r"><span class="coin"></span>${fmt(o.reward)}</span></div>
      <div class="order-d">${esc(t.desc)}</div>
      <div class="order-m"><span class="chip">${statName(t.stat)} ≥ ${t.min}</span><span class="chip">${t.days} ${plural(t.days, 'день', 'дня', 'дней')}</span>
      ${ass ? `<span class="chip chip-up">Выполняет: ${esc(ass.name.split(' ')[0])}, ещё ${o.daysLeft} дн.</span>` : `<span class="chip">Висит до ${o.expires} дня</span>`}</div>
      ${ass ? '' : `<button class="btn btn-primary" data-assign="${o.id}">Назначить</button>`}
    </div>`;
  }).join('');
  const hot = Object.entries(S.demand).sort((a, b) => b[1] - a[1])[0];
  const shop = Object.entries(ITEMS).map(([id, it]) => `<div class="shop-i"><div><b>${it.name}</b><div class="muted small">${it.desc}</div></div><button class="btn" data-buyitem="${id}"><span class="coin"></span>${it.price}</button></div>`).join('');
  return `<div class="screen-head"><h1>Таверна «Сытый Грифон»</h1><div class="sub">Доска заказов, слухи и лавка трактирщика</div></div>
    <div class="rumor parchment">Трактирщица шепчет: «Говорят, сегодня больше всего платят за ${RACES[hot[0]].gen}».</div>
    <div class="panel-title light">Доска заказов</div>
    ${orders || '<div class="empty parchment">Заказов пока нет — загляните завтра.</div>'}
    <div class="panel parchment"><div class="panel-title">Лавка трактирщика</div>${shop}</div>`;
}

function viewBag() {
  const items = Object.entries(S.inv).map(([id, n]) => `<div class="shop-i"><div><b>${ITEMS[id].name}</b> ×${n}<div class="muted small">${ITEMS[id].desc}</div></div><button class="btn" data-useitem="${id}">Использовать</button></div>`).join('');
  return `<div class="screen-head"><h1>Сумка</h1><div class="sub">Предметы покупаются в таверне</div></div>
    <div class="panel parchment">${items || '<div class="muted">Сумка пуста.</div>'}</div>
    <div class="panel parchment"><div class="panel-title">Сводка</div>
      <div>Заработано продажами: <b>${fmt(S.totalEarned)}</b> мон.</div>
      <div>Ранг гильдии: <b>${repRank()}</b> (репутация ${S.rep}). Чем выше репутация, тем легче торговаться.</div>
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
    <div class="hg-chance">Шанс: <b id="hgc"></b></div>`,
    [{ label: 'Отмена', act: 'close' }, { label: mode === 'buy' ? 'Предложить цену' : 'Назвать цену', cls: 'btn-primary', act: () => doHaggle(uid, mode, +document.getElementById('hg').value) }]);
  const upd = () => {
    const v = +document.getElementById('hg').value, p = haggleChance(v);
    document.getElementById('hgp').textContent = v;
    document.getElementById('hgv').textContent = fmt(baseP * (mode === 'buy' ? 1 - v / 100 : 1 + v / 100)) + ' мон.';
    document.getElementById('hgc').textContent = Math.round(p * 100) + '% — ' + chanceWord(p);
  };
  document.getElementById('hg').addEventListener('input', upd); upd();
}
function doHaggle(uid, mode, pct) {
  closeModal();
  const c = findAny(uid);
  if (R() < haggleChance(pct)) {
    if (mode === 'buy') { if (S.owned.length >= CAPACITY) return toast('Нет свободных мест в поместье.'); toast(`Продавец вздохнул и согласился на −${pct}%.`); buy(uid, pct); }
    else { toast(`Покупатель кивнул: +${pct}% сверху.`); sell(uid, pct); }
  } else {
    if (mode === 'buy') { c.haggleLock = true; c.priceAdj = 1.1; showModal('Продавец обиделся', '<p>«За такие деньги торгуйтесь с кем-нибудь другим!» Цена выросла на 10%, торговаться сегодня больше не выйдет.</p>'); }
    else { c.sellLockDay = S.day; showModal('Покупатель ушёл', '<p>Покупатель хмыкнул и ушёл к соседней лавке. Завтра придут другие.</p>'); }
    save(); render();
  }
}

function pairModal(uid) {
  const a = findOwned(uid);
  const cands = S.owned.filter(b => b !== a && b.g !== a.g);
  const list = cands.map(b => {
    const h = compatHint(a, b), chk = pairCheck(a, b);
    return `<div class="pick ${chk.ok ? '' : 'dis'}" ${chk.ok ? `data-union="${b.uid}"` : ''}>
      <div class="pick-p">${renderPortrait(b, 'sm')}</div>
      <div><b>${esc(b.name.split(' ')[0])}</b> · ${raceName(b)}<div class="small hint-l${h.lvl}">${h.text}</div>
      ${chk.ok ? '' : `<div class="small muted">${chk.why}</div>`}</div></div>`;
  }).join('');
  showModal('Предложить союз', `<p class="small">Союз заключается только по взаимному согласию: важны симпатия, настроение (≥40) и доверие к вам (лояльность ≥30). Наследник придёт взрослым через 5 дней.</p>${list || '<p class="muted">В поместье нет подходящей пары.</p>'}`, [{ label: 'Закрыть', act: 'close' }]);
  document.getElementById('modal')._pairA = uid;
}
function assignModal(oid) {
  const o = S.orders.find(x => x.id === oid), t = ORDER_TEMPLATES[o.tpl];
  const list = homeChars().map(c => `<div class="pick" data-assignto="${c.uid}" data-order="${oid}">
    <div class="pick-p">${renderPortrait(c, 'sm')}</div>
    <div><b>${esc(c.name.split(' ')[0])}</b> · ${statName(t.stat)} ${c.stats[t.stat]}<div class="small">Шанс успеха: <b>${Math.round(orderChance(c, o) * 100)}%</b> · усталость ${c.fatigue}</div></div></div>`).join('');
  showModal('Кого отправить?', `<p class="small">«${esc(t.title)}»: ${t.days} ${plural(t.days, 'день', 'дня', 'дней')}. Пока идёт заказ, распорядок не действует.</p>${list || '<p class="muted">Все заняты или поместье пусто.</p>'}`, [{ label: 'Закрыть', act: 'close' }]);
}
function itemForCharModal(uid) {
  const items = Object.entries(S.inv);
  showModal('Какой предмет дать?', items.length ? items.map(([id, n]) => `<div class="pick" data-give="${id}" data-uid="${uid}"><div><b>${ITEMS[id].name}</b> ×${n}<div class="small muted">${ITEMS[id].desc}</div></div></div>`).join('') : '<p class="muted">Сумка пуста. Предметы продаются в таверне.</p>', [{ label: 'Закрыть', act: 'close' }]);
}
function charForItemModal(id) {
  showModal(ITEMS[id].name + ': кому?', S.owned.map(c => `<div class="pick" data-give="${id}" data-uid="${c.uid}"><div class="pick-p">${renderPortrait(c, 'sm')}</div><div><b>${esc(c.name.split(' ')[0])}</b><div class="small muted">настроение ${mood(c)}, стресс ${c.stress}, усталость ${c.fatigue}</div></div></div>`).join('') || '<p class="muted">Некому.</p>', [{ label: 'Закрыть', act: 'close' }]);
}
function confirmModal(title, text, label, fn) {
  showModal(title, `<p>${text}</p>`, [{ label: 'Отмена', act: 'close' }, { label, cls: 'btn-primary', act: () => { closeModal(); fn(); } }]);
}
function menuModal() {
  showModal('Меню', `<p class="small">Игра сохраняется автоматически после каждого действия. Ручное сохранение — отдельный слот.</p>
    <p class="small muted">Для художника: полноростовой арт — <code>assets/portraits/&lt;id&gt;.png</code> (прозрачный фон), лицо для мини-карточек — <code>&lt;id&gt;_face.png</code>, фоны — <code>assets/backgrounds/bg01–bg12.jpg</code> (id пресета: m01–m08, f01–f23).</p>`,
    [{ label: 'Сохранить в слот', act: () => { localStorage.setItem(MANUAL_KEY, JSON.stringify(S)); closeModal(); toast('Сохранено в ручной слот.'); } },
    { label: 'Загрузить слот', act: () => { if (load(MANUAL_KEY)) { save(); closeModal(); go('manor'); toast('Загружено.'); } else toast('Ручной слот пуст.'); } },
    { label: 'Новая игра', cls: 'act-bad', act: () => confirmModal('Новая игра?', 'Автосохранение будет перезаписано.', 'Начать заново', () => { newGame(); go('manor'); }) },
    { label: 'Закрыть', act: 'close' }]);
}

let toastT = null;
function toast(t) {
  if (!t) return;
  const el = document.getElementById('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- обработчики ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-mbtn],[data-go],[data-open],[data-task],[data-trainstat],[data-touch],[data-buy],[data-haggle],[data-appraise],[data-act],[data-sell],[data-free],[data-ransom],[data-pair],[data-union],[data-assign],[data-assignto],[data-buyitem],[data-useitem],[data-useitem-for],[data-give],[data-back],#endday,#menu-btn,.modal-back');
  if (!t) return;
  const d = t.dataset;
  if (t.disabled) return;
  if (d.mbtn != null) { const b = document.getElementById('modal')._buttons[+d.mbtn]; if (b.act === 'close') closeModal(); else b.act(); return; }
  if (t.classList.contains('modal-back')) return closeModal();
  if (t.id === 'endday') return confirmModal('Завершить день?', `Расписание выполнится, рынок обновится. Содержание: ${S.owned.length * UPKEEP} мон.`, 'Завершить день', endDay);
  if (t.id === 'menu-btn') return menuModal();
  if (d.go) return go(d.go);
  if (d.back) return go(d.back);
  if (d.task) { e.stopPropagation(); return setTask(d.uid, d.task); }
  if (d.trainstat) return setTrainStat(d.uid, d.trainstat);
  if (d.touch) return touch(d.uid, d.touch);
  if (d.buy) { const c = S.market.find(x => x.uid === d.buy); if (S.gold < 0) return toast('Сначала закройте долги.'); return confirmModal('Покупка', `Купить ${esc(c.name)} за ${fmt(price(c))} мон.?`, 'Купить', () => buy(d.buy)); }
  if (d.haggle) { if (S.gold < 0) return toast('Сначала закройте долги.'); return haggleModal(d.haggle, 'buy'); }
  if (d.appraise) return appraise(d.appraise);
  if (d.act) return act(d.uid, d.act);
  if (d.sell) { const c = findOwned(d.sell); return showModal('Продажа', `<p>Скупщик предлагает <b>${fmt(sellPrice(c))}</b> мон. за ${esc(c.name)}.</p>`, [{ label: 'Отмена', act: 'close' }, { label: 'Торговаться', act: () => haggleModal(d.sell, 'sell') }, { label: 'Продать', cls: 'btn-primary', act: () => { closeModal(); sell(d.sell); } }]); }
  if (d.free) return confirmModal('Отпустить на волю', `${esc(findOwned(d.free).name)} уйдёт свободным. Вы ничего не получите, кроме доброй славы (репутация растёт).`, 'Отпустить', () => freeChar(d.free, false));
  if (d.ransom) return confirmModal('Принять выкуп', `${esc(findOwned(d.ransom).name)} заплатит ${fmt(price(findOwned(d.ransom)) * 0.4)} мон. и станет свободным.`, 'Принять', () => freeChar(d.ransom, true));
  if (d.pair) return pairModal(d.pair);
  if (d.union) return proposeUnion(document.getElementById('modal')._pairA, d.union);
  if (d.assign) return assignModal(d.assign);
  if (d.assignto) return assignOrder(d.order, d.assignto);
  if (d.buyitem) return buyItem(d.buyitem);
  if (d.useitem) return charForItemModal(d.useitem);
  if (d.useitemFor) return itemForCharModal(d.useitemFor);
  if (d.give) return useItem(d.give, d.uid);
  if (d.open) return openCard(d.open, d.from || 'owned');
});

// ---------- старт ----------
window.addEventListener('DOMContentLoaded', () => {
  if (!load()) newGame();
  render();
});
