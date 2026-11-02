'use strict';
// v12.3: происхождение (раса и подвид) задаёт разброс навыков, характер и цену; база имён с уникальностью.
// Уникальная Лиисбет (c.unique) — вне этих правил.
const LIN12 = {
  human:  { n: 'Люди', f: 'Человек', mods: { cha: 4, mas: 4, luk: 3 }, lo: 16, hi: 38, loy: 0, price: 1.00,
            why: 'разносторонние: ровный разброс, без провалов, немного Обаяния, Мастерства и Удачи' },
  elf:    { n: 'Эльфы', f: 'Эльфийка', mods: { int: 9, agi: 7, cha: 4, str: -6, end: -6 }, loy: 0, price: 1.06,
            why: 'высокий Ум и грация, но хрупкое сложение' },
  drow:   { n: 'Тёмные эльфы', f: 'Тёмная эльфийка', mods: { int: 7, wil: 10, agi: 6, cha: 3, str: -2, end: -4 }, loy: -12, disc: -8, price: 1.12,
            why: 'хитрые и волевые: строгость действует слабее (Воля), доверие начинается ниже; редкий экзотический товар' },
  beast_wolf:   { n: 'Волчий народ', f: 'Волчица', mods: { str: 6, end: 6, agi: 5, wil: 4, int: -4, cha: -2 }, loy: 6, price: 1.00,
            why: 'выносливые и сильные, верны своей «стае» (лояльность выше)' },
  beast_bear:   { n: 'Медвежий народ', f: 'Медведица', mods: { str: 12, end: 12, agi: -4, int: -7, cha: -2 }, loy: 3, price: 0.98,
            why: 'очень сильные и крепкие, но не книжники' },
  beast_cat:    { n: 'Кошачий народ', f: 'Кошка', mods: { agi: 9, luk: 5, cha: 4, str: -4, wil: -2 }, loy: -3, price: 1.04,
            why: 'ловкие и удачливые, гуляют сами по себе' },
  beast_fox:    { n: 'Лисий народ', f: 'Лисица', mods: { cha: 6, luk: 6, int: 4, agi: 4, str: -4, end: -3 }, loy: 0, price: 1.05,
            why: 'обаятельные хитрецы с удачей на стороне' },
  beast_rabbit: { n: 'Заячий народ', f: 'Зайчиха', mods: { cha: 10, agi: 6, luk: 4, str: -8, end: -6, wil: -3 }, loy: 4, price: 1.08,
            why: 'очень обаятельные и проворные, но слабые и пугливые' },
  dwarf:  { n: 'Гномы', f: 'Гномка', mods: { mas: 11, end: 7, str: 4, agi: -6, cha: -3 }, loy: 0, price: 1.00,
            why: 'прирождённые мастера, выносливы, но неповоротливы' },
};
function linOf(c) {
  if (!c) return 'human';
  if (c.lin && LIN12[c.lin]) return c.lin;
  const p = typeof presetById === 'function' ? presetById(c.preset) : null;
  if (c.race === 'beast') return 'beast_' + ((p && p.ears) || 'wolf');
  if (c.race === 'elf' && (c.preset === 'f12' || (p && /тёмн/i.test(p.title || '')))) return 'drow';
  return LIN12[c.race] ? c.race : 'human';
}
function linName(c) { const L = LIN12[linOf(c)]; return c.g === 'f' ? L.f : L.n; }
function namePool(lin, g) {
  const base = lin.startsWith('beast') ? 'beast' : lin;
  return (NAMES12[base + '_' + g] || NAMES12['human_' + g] || []);
}
// все имена, занятые сейчас: свои, рынок, аукцион, загон, новорождённые — обход состояния
function takenNames() {
  const set = new Set(), seen = new Set();
  const walk = (o, d) => {
    if (!o || typeof o !== 'object' || d > 7 || seen.has(o)) return; seen.add(o);
    if (Array.isArray(o)) { for (const x of o) walk(x, d + 1); return; }
    if (typeof o.name === 'string' && o.stats && o.uid) set.add(o.name.split(' ')[0].toLowerCase());
    for (const k in o) if (k !== 'log' && k !== 'news' && k !== 'hist' && k !== 'nameHist') walk(o[k], d + 1);
  };
  try { walk(S, 0); } catch (e) {}
  for (const x of (window._newborn || [])) if (x && x.name) set.add(x.name.split(' ')[0].toLowerCase());
  return set;
}
const EPI12 = { f: ['Светлая', 'Тихая', 'Младшая', 'Ясная', 'Звонкая', 'Северная', 'Речная'], m: ['Светлый', 'Тихий', 'Младший', 'Ясный', 'Звонкий', 'Северный', 'Речной'] };
function uniqueGiven(lin, g, prefer) {
  const taken = takenNames(), hist = new Set((S.nameHist || []).map(n => n.toLowerCase()));
  const pool = namePool(lin, g);
  const ok = n => !taken.has(n.toLowerCase()) && !hist.has(n.toLowerCase());
  let cand = [];
  if (prefer && prefer.length) cand = prefer.filter(ok);
  if (!cand.length || R() < 0.4) { const c2 = pool.filter(ok); if (c2.length) cand = cand.length && R() < 0.5 ? cand : c2; }
  let n = cand.length ? pick(cand) : null;
  if (!n) { // пул иссяк — только не занятые, даже если недавно были
    const c3 = pool.filter(x => !taken.has(x.toLowerCase()));
    n = c3.length ? pick(c3) : null;
  }
  if (!n) { // совсем иссяк — имя с прозвищем
    for (let i = 0; i < 200 && !n; i++) { const t = pick(pool) + '-' + pick(EPI12[g] || EPI12.f); if (!taken.has(t.toLowerCase())) n = t; }
    if (!n) n = pick(pool) + '-' + (S.nextId || 1);
  }
  S.nameHist = (S.nameHist || []).concat(n).slice(-400);
  return n;
}
function subPrefer(lin, g) { const sub = lin.startsWith('beast_') ? lin.slice(6) : null; return sub && NAMES12_SUB[sub] ? NAMES12_SUB[sub][g] || null : null; }
// раса → навыки: заменяем общие расовые поправки на профиль происхождения
function applyLineage(c, heir) {
  if (!c || c.unique || c.linApplied) return c;
  const lin = linOf(c), L = LIN12[lin], rm = (RACES[c.race] && RACES[c.race].mods) || {};
  c.lin = lin; c.linFx = {};
  for (const s of STATS) {
    const k = s.key, want = (L.mods[k] || 0), had = rm[k] || 0;
    let d = heir ? Math.round((want - had) / 2) : want - had;
    if (!heir && L.lo != null) { // люди: ровный разброс — подтягиваем крайности
      const v = c.stats[k] + d; d += Math.round((clamp(v, L.lo + 6, L.hi + 30) - v) * 0.6);
    }
    const nv = clamp(c.stats[k] + d, heir ? 3 : 5, heir ? 24 : 90), real = nv - c.stats[k];
    c.stats[k] = nv; c.pot[k] = clamp(Math.max(nv + 5, c.pot[k] + real), 0, 100);
    if (want) c.linFx[k] = want;
  }
  if (L.loy) c.loyalty = clamp(c.loyalty + L.loy, 3, 100);
  if (L.disc) c.discipline = clamp(c.discipline + L.disc, 0, 100);
  c.linApplied = 1;
  return c;
}
(function () {
  const oMake = window.makeCharacter;
  window.makeCharacter = function (opts) {
    opts = opts || {};
    const c = oMake.apply(this, arguments);
    try {
      if (c && !c.unique) {
        applyLineage(c, false);
        if (!opts.keepName) c.name = uniqueGiven(c.lin, c.g, subPrefer(c.lin, c.g)) + ' ' + pick(SURNAMES);
      }
    } catch (e) { console.warn('lineage', e); }
    return c;
  };
  const oHeir = window.makeHeir2;
  if (oHeir) window.makeHeir2 = function (mother, father) {
    const child = oHeir.apply(this, arguments);
    try {
      if (child && !child.unique) {
        child.linApplied = 0; child.lin = null;
        child.lin = linOf(child); // по пресету похожего родителя
        // makeHeir2 уже перезаписал навыки слабыми; добавим половину профиля
        const L = LIN12[child.lin], rm = RACES[child.race].mods || {};
        child.linFx = {};
        for (const s of STATS) { const k = s.key, want = L.mods[k] || 0, d = Math.round((want - (rm[k] || 0)) / 2);
          child.stats[k] = clamp(child.stats[k] + d, 3, 24); if (want) child.linFx[k] = want; }
        child.linApplied = 1;
        // имя: в стиле рода родителя, но уникальное; фамилия — матери
        const sur = mother.name.split(' ').slice(1).join(' ');
        const look = child.look === 'father' ? father : mother;
        const plin = look && look.lin ? look.lin : child.lin;
        child.name = uniqueGiven(plin, child.g, subPrefer(plin, child.g)) + (sur ? ' ' + sur : '');
        if (window._newborn) { const i = window._newborn.indexOf(child); if (i < 0) window._newborn.push(child); }
      }
    } catch (e) { console.warn('heir lineage', e); }
    return child;
  };
  // цена: множитель происхождения
  const oPP = window.priceParts;
  window.priceParts = function (c) {
    const parts = oPP.apply(this, arguments);
    try {
      if (c && c.unique === 'liisbet') parts.push(['уникальная', 1.8]);
      else if (c && c.stats) { const L = LIN12[linOf(c)]; if (L && L.price !== 1) parts.push(['происхождение', L.price]); }
    } catch (e) {}
    return parts;
  };
  // карточка: блок «Почему так: происхождение»
  const oCard = window.viewCard;
  if (oCard) window.viewCard = function () {
    let h = oCard.apply(this, arguments);
    try {
      const c = findAny(UI.cardUid);
      if (c && typeof h === 'string' && h.includes('<div class="np-badges">')) h = h.replace('<div class="np-badges">', raceWhyHtml(c) + '<div class="np-badges">');
    } catch (e) {}
    return h;
  };
})();
function raceWhyHtml(c) {
  if (c.unique === 'liisbet') return `<details class="why race-why"><summary>Почему так: уникальная</summary><div class="small">Лиисбет единственная в мире: её навыки не зависят от расы, а цена ×1.8 к обычной с теми же навыками.</div></details>`;
  const lin = linOf(c), L = LIN12[lin];
  const fx = c.linFx || L.mods;
  const rows = STATS.filter(s => fx[s.key]).sort((a, b) => fx[b.key] - fx[a.key]).map(s =>
    `<tr><td>${s.name}</td><td class="${fx[s.key] > 0 ? 'good' : 'bad'}">${fx[s.key] > 0 ? '+' : '−'}${Math.abs(fx[s.key])}</td></tr>`).join('');
  const extra = [L.loy ? `<tr><td>Начальная лояльность</td><td class="${L.loy > 0 ? 'good' : 'bad'}">${L.loy > 0 ? '+' : '−'}${Math.abs(L.loy)}</td></tr>` : '',
    L.disc ? `<tr><td>Начальная дисциплина</td><td class="bad">−${Math.abs(L.disc)}</td></tr>` : '',
    L.price !== 1 ? `<tr><td>Цена (происхождение)</td><td>×${L.price.toFixed(2)}</td></tr>` : ''].join('');
  return `<details class="why race-why"><summary>Почему так: происхождение — ${esc(linName(c))}</summary><table>${rows}${extra}</table><div class="small muted">${esc(L.why)}${c.mix ? '. Полукровка: часть талантов от второго родителя.' : ''}</div></details>`;
}
