'use strict';
// ===== v12.4: Лиисбет — уникальная легендарная героиня =====
// Взрослая (28 лет) гномка-учёная: очень умная, слабая телом. Единственная в мире.
// Появляется редко (~5% за «повод»): предложение-событие ночью, лот на рынке, на Большом рынке, на торгах.
// Вне расовых правил (c.unique), цена ×1.8 (races12 priceParts).
const LIIS = { id: 'f24', chance: 0.05, age: 28, surname: 'Белокосая' };
function liisFind() {
  const seen = new Set(); let hit = null;
  const walk = (o, d) => {
    if (hit || !o || typeof o !== 'object' || d > 7 || seen.has(o)) return; seen.add(o);
    if (o.unique === 'liisbet') { hit = o; return; }
    if (Array.isArray(o)) { for (const v of o) walk(v, d + 1); return; }
    for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v, d + 1); }
  };
  try { walk(S, 0); } catch (e) { }
  return hit;
}
function liisCan() { return !!(S && !S.liisOwned && !liisFind()); }
function liisRoll(src) {
  if (!liisCan()) return false;
  const r = R() < LIIS.chance;
  S.liisRolls = S.liisRolls || {}; S.liisRolls[src] = (S.liisRolls[src] || 0) + 1;
  return r;
}
function makeLiisbet() {
  const c = makeCharacter({ preset: LIIS.id, rarity: 3, keepName: true, loyalty: 42 });
  c.unique = 'liisbet';
  c.name = 'Лиисбет ' + LIIS.surname; c.title = 'Легендарная учёная'; c.age = LIIS.age;
  const st = { str: 9, agi: 24, end: 15, int: 82, cha: 52, mas: 64, wil: 28, luk: 44 };
  const pt = { str: 30, agi: 48, end: 36, int: 100, cha: 82, mas: 92, wil: 60, luk: 70 };
  for (const s of STATS) { c.stats[s.key] = st[s.key] != null ? st[s.key] : c.stats[s.key]; c.pot[s.key] = Math.max(c.stats[s.key] + 5, pt[s.key] || c.pot[s.key]); }
  c.traits = ['clever', 'cheerful', 'diligent'];
  c.orient = c.orient || 'hetero';
  c.breed = { fert: 62, mat: 90 };
  c.stress = 18; c.discipline = 46; c.aff = 22; c.health = 92; c.fatigue = 8;
  c.fearCrit = 1; c.linApplied = 1; c.lin = null; c.linFx = {};
  c.exotic = true; c.appraised = true;
  return c;
}
function liisSpawnMarket(where) {
  const c = makeLiisbet(); c.liisSrc = where; S.market.unshift(c);
  addLog(`Слух на рынке: ${where === 'big' ? 'на Большом рынке' : 'на рынке'} выставлен договор легендарной учёной — Лиисбет Белокосой. Такое бывает раз в жизни.`);
  return c;
}
(function () {
  // --- рынок и Большой рынок: один «повод» в день у каждого, при обновлении она не пропадает ---
  const oRoll = window.rollMarket;
  window.rollMarket = function () {
    const keep = (S.market || []).find(c => c.unique === 'liisbet');
    const r = oRoll.apply(this, arguments);
    try {
      if (keep) { if (!S.market.includes(keep)) S.market.unshift(keep); }
      else if (S.liisDayM !== S.day) {
        S.liisDayM = S.day;
        if (liisRoll('market')) liisSpawnMarket('market');
        else if (typeof mktLv === 'function' && mktLv() && liisRoll('big')) liisSpawnMarket('big');
      }
    } catch (e) { console.warn('liis market', e); }
    return r;
  };
  // --- торги: при новом наборе лотов ---
  const oAuc = window.aucRoll;
  if (oAuc) window.aucRoll = function () {
    const before = S.auc && S.auc.next;
    const A = oAuc.apply(this, arguments);
    try {
      if (A && A.next !== before && A.lots && A.lots.length && liisRoll('auction')) {
        const lot = A.lots.find(l => l.t === 'slave') || A.lots[0];
        const c = makeLiisbet(); c.liisSrc = 'auction';
        Object.assign(lot, { t: 'slave', ch: c, item: undefined, it: undefined, q: undefined });
        lot.name = 'Лиисбет Белокосая (уникальная учёная)'; lot.val = Math.round(corePrice(c));
        lot.reserve = Math.round(lot.val * 0.6); lot.buyout = Math.round(lot.val * 1.35);
      }
    } catch (e) { console.warn('liis auc', e); }
    return A;
  };
  // --- событие-предложение (ночью) ---
  if (typeof XEV !== 'undefined') XEV.push({ id: 'liis_offer', w: 0, when: 'night', cond: () => false, title: 'Договор учёной',
    text: () => { const c = S.liisOffer; return `К воротам приходит усталый поверенный разорившейся академии Каменной Короны. С ним — невысокая девушка в круглых золотых очках, с белой косой и стопкой исписанных тетрадей. «Это Лиисбет, — вздыхает он, — лучший ум академии. Долги её покровителей выставлены на продажу; я бы хотел отдать договор в добрые руки». Лиисбет робко улыбается: «Я умею считать звёзды, составлять травники и… я очень постараюсь не мешать!»${c ? ` <br><span class="muted small">Цена договора: ${fmt(Math.round(price(c)))} мон. Такое предложение — раз в жизни.</span>` : ''}`; },
    ch: [
      { l: () => `Выкупить договор (${S.liisOffer ? fmt(Math.round(price(S.liisOffer))) : '?'} мон.)`, ok: () => { const c = S.liisOffer; if (!c) return 'предложение ушло'; if (S.owned.length >= S.capacity) return 'нет мест'; return xCan(Math.round(price(c))); },
        go: (x, e) => { const c = S.liisOffer; const cost = Math.round(price(c)); e.gold(-cost); S.liisOffer = null; c.status = 'home'; c.task = 'rest'; c.boughtFor = cost; S.owned.push(c); S.liisOwned = 1; e.note('Лиисбет теперь живёт в поместье'); return 'Лиисбет прижимает тетради к груди: «Спасибо! Я… я вас не подведу. Можно мне уголок у окна? Там хороший свет для записей».'; } },
      { l: 'Пусть выставит договор на рынке', go: (x, e) => { const c = S.liisOffer; S.liisOffer = null; c.liisSrc = 'event'; S.market.unshift(c); e.note('Лиисбет — на рынке до конца дня'); return 'Поверенный кивает: «Тогда до вечера она будет на рынке». Лиисбет машет вам на прощание.'; } },
      { l: 'Отказаться', go: (x, e) => { S.liisOffer = null; return 'Поверенный уводит Лиисбет дальше по тракту. Может быть, судьба ещё сведёт вас.'; } },
    ] });
  if (typeof xPick === 'function') {
    const oPick = window.xPick;
    window.xPick = function (when) {
      try {
        if (when === 'night' && !S.liisOffer && liisRoll('event')) { S.liisOffer = makeLiisbet(); S.liisOffer.liisSrc = 'event'; const e = XEV.find(z => z.id === 'liis_offer'); if (e) return [e, null, null]; }
      } catch (er) { console.warn('liis ev', er); }
      return oPick.apply(this, arguments);
    };
  }
  // предложение, которое так и не показали/закрыли, сгорает на следующий день
  const oEnd = window.endDay;
  if (oEnd) window.endDay = function () {
    const r = oEnd.apply(this, arguments);
    try { if (S.liisOffer && !(S.xev && S.xev.id === 'liis_offer')) S.liisOffer = null; } catch (e) { }
    return r;
  };
  // --- доброе отношение действует сильнее (лояльность +30%) ---
  const oLG = window.loyaltyGain;
  window.loyaltyGain = function (c, v) { if (c && c.fearCrit && v > 0) v *= 1.3; return oLG.call(this, c, v); };
  // --- покупка: запоминаем, что она уже была вашей (больше не выпадет) ---
  const oBuy = window.buy;
  window.buy = function (uid) { const r = oBuy.apply(this, arguments); try { if (S.owned.some(c => c.unique === 'liisbet')) S.liisOwned = 1; } catch (e) { } return r; };
  const oSave = window.save;
  if (oSave) window.save = function () { try { if (S && S.owned && S.owned.some(c => c.unique === 'liisbet')) S.liisOwned = 1; } catch (e) { } return oSave.apply(this, arguments); };
  // --- наказание: только не интимные зоны; боится упрёков — стресс сильнее, но дисциплина без «гномьего» упрямства ---
  const oPun = window.punish;
  if (oPun) window.punish = function (uid, zone) {
    const c = findOwned(uid);
    if (c && c.unique === 'liisbet') {
      if (zone === 'rear') { toast('Лиисбет: только ладони, руки, плечи или спина.'); return; }
      const d0 = c.discipline, s0 = c.stress;
      const r = oPun.apply(this, arguments);
      try { const dd = c.discipline - d0; if (dd > 0) c.discipline = clamp(c.discipline + Math.round(dd * 0.6)); const ds = c.stress - s0; if (ds > 0) c.stress = clamp(c.stress + Math.round(ds * 0.5)); } catch (e) { }
      return r;
    }
    return oPun.apply(this, arguments);
  };
  const strip = h => typeof h === 'string' ? h.replace(/<button[^>]*data-hit="rear"[^>]*>[^<]*<\/button>/g, '').replace(/<div class="tz tz-hit tz-rear"[^>]*><\/div>/g, '') : h;
  for (const fnN of ['punishPanelHtml', 'punishZonesHtml']) {
    const o = window[fnN]; if (!o) continue;
    window[fnN] = function (c) { const h = o.apply(this, arguments); return c && c.unique === 'liisbet' ? strip(h) : h; };
  }
  // --- наследники: похожи на отца или на «родственную» гномку f23, без копии внешности Лиисбет; ум передаётся ---
  const oHeir = window.makeHeir2;
  if (oHeir) window.makeHeir2 = function (mother, father) {
    const L = mother && mother.unique === 'liisbet' ? mother : father && father.unique === 'liisbet' ? father : null;
    if (!L) return oHeir.apply(this, arguments);
    const p0 = L.preset; L.preset = 'f23';
    let child;
    try { child = oHeir.apply(this, arguments); } finally { L.preset = p0; }
    try { if (child) { delete child.unique; child.liisKin = 1; if (child.g === 'm') child.name = child.name.replace('Белокосая', 'Белокосов'); child.pot.int = clamp(Math.max(child.pot.int, 70) + 10); child.stats.int = clamp(child.stats.int + 4, 3, 24); } } catch (e) { }
    return child;
  };
  // --- карточка: пометка ---
  const oCard = window.viewCard;
  if (oCard) window.viewCard = function () {
    let h = oCard.apply(this, arguments);
    try { const c = findAny(UI.cardUid); if (c && c.unique === 'liisbet' && typeof h === 'string' && h.includes('<div class="np-badges">'))
      h = h.replace('<div class="np-badges">', `<div class="liis-note small">✦ <b>Уникальная.</b> Единственная в мире. Очень умна и изобретательна, но слаба телом. Боится упрёков: наказание даёт больше дисциплины, но и больше стресса; доброе отношение поднимает лояльность на 30% быстрее.</div><div class="np-badges">`); } catch (e) { }
    return h;
  };
})();
