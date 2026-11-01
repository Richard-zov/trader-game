'use strict';
// ===== v10: Владения (мини-карта построек), цели, налоги и спрос, аукцион =====
const BLD = {
  market: { n: 'Рынок', d: 'Прилавки и навесы. Торговля с горожанами.', st: ['cha', 'int'], tr: ['charming', 'clever'], base: 42, cost: 600, roof: '#b5523a', x: 18, y: 30 },
  quarry: { n: 'Каменоломня', d: 'Камень для всего Лога. Тяжёлая работа.', st: ['str', 'end'], tr: ['hardy', 'diligent'], base: 46, cost: 700, roof: '#7a7266', x: 78, y: 18 },
  workshop: { n: 'Мастерская', d: 'Столярка и кузня: заказы на поделки.', st: ['mas', 'agi'], tr: ['diligent', 'clever'], base: 50, cost: 800, roof: '#8a5a2e', x: 50, y: 22 },
  farm: { n: 'Огород', d: 'Овощи и мёд: доход и дешевле еда в поместье.', st: ['end', 'wil'], tr: ['diligent', 'cheerful'], base: 32, cost: 450, roof: '#c9a23a', x: 20, y: 72 },
  tavern: { n: 'Таверна', d: 'Свой кабачок: песни, пироги, слухи. Иногда +репутация.', st: ['cha', 'luk'], tr: ['charming', 'cheerful'], base: 44, cost: 900, roof: '#9b3b2e', x: 50, y: 56 },
  baths: { n: 'Купальни', d: 'Тёплые купальни и лекарь: снимают стресс и лечат всех домашних.', st: ['wil', 'cha'], tr: ['loyal', 'hardy'], base: 24, cost: 1000, roof: '#3e7a8a', x: 80, y: 74 },
  library: { n: 'Башня-библиотека', d: 'Переписчики книг. Работники понемногу умнеют.', st: ['int', 'wil'], tr: ['clever', 'loyal'], base: 34, cost: 1100, roof: '#4a4f8a', x: 80, y: 46 },
};
const BLD_SLOTS = [0, 1, 2, 2, 3, 4];
function estOf() {
  if (!S.est) S.est = { b: {}, dem: {}, self: 0, last: null };
  for (const k in BLD) { if (!S.est.b[k]) S.est.b[k] = { lv: 0 }; if (!S.est.dem[k]) S.est.dem[k] = 1; }
  if (!S.goals) S.goals = { day: 0, list: [], ms: {}, cnt: {} };
  if (!S.auc) S.auc = { next: S.day, lots: [], sell: [], won: 0 };
  return S.est;
}
function bldCost(k, lv) { return Math.round(BLD[k].cost * Math.pow(lv, 1.55) / 10) * 10; }
function bldUpkeep(k) { const lv = estOf().b[k].lv; return lv ? 6 + lv * 5 : 0; }
function bldWorkers(k) { return S.owned.filter(c => c.bld === k); }
function bldWorkerOut(c, k) {
  const B = BLD[k], lv = S.est.b[k].lv, why = [];
  const sv = (eff(c, B.st[0]) + eff(c, B.st[1]) * 0.7) / 1.7, req = 12 + lv * 6;
  let m = clamp(sv / 40, 0.35, 2.2); why.push([`${statName(B.st[0])}+${statName(B.st[1])} ${Math.round(sv)}`, m]);
  if (sv < req) { why.push([`ниже требования ${req}`, 0.6]); m *= 0.6; }
  const lm = 1 + 0.35 * (lv - 1); why.push([`уровень ${lv}`, lm]); m *= lm;
  for (const t of B.tr) if (has(c, t)) { why.push([TRAITS[t].name, 1.25]); m *= 1.25; }
  if (has(c, 'lazy')) { why.push(['Лень', 0.85]); m *= 0.85; }
  if (has(c, 'clumsy') && (k === 'workshop' || k === 'quarry')) { why.push(['Неуклюжесть', 0.85]); m *= 0.85; }
  if (c.fatigue >= 70) { why.push(['усталость', 0.6]); m *= 0.6; }
  const dm = S.est.dem[k]; why.push([`спрос`, dm]); m *= dm;
  return { v: Math.round(B.base * m), why, req, sv: Math.round(sv) };
}
function bldPreview(k) { return bldWorkers(k).reduce((a, c) => a + bldWorkerOut(c, k).v, 0); }
function bldAssign(uid, k) {
  const c = findOwned(uid); if (!c) return;
  if (!k) { c.bld = null; toast(`${fn1(c)} снят${g(c, '', 'а')} с работы в постройке.`); save(); return; }
  if (c.status !== 'home') return toast('Сейчас занят' + g(c, '', 'а') + ' на заказе.');
  const lv = estOf().b[k].lv; if (!lv) return toast('Сначала постройте здание.');
  if (bldWorkers(k).length >= BLD_SLOTS[lv]) return toast('Все места заняты — улучшите здание.');
  c.bld = k; toast(`${fn1(c)} теперь работает: ${BLD[k].n}. Обычных дел у н${g(c, 'его', 'её')} не будет.`); goalBump('assign'); save();
}
function bldUpgrade(k) {
  const b = estOf().b[k]; if (b.lv >= 5) return;
  const cost = bldCost(k, b.lv + 1);
  if (S.gold < cost) return toast(`Не хватает монет: нужно ${fmt(cost)}.`);
  S.gold -= cost; b.lv++; sfx('coin');
  addLog(`${b.lv === 1 ? 'Построено' : 'Улучшено'}: ${BLD[k].n} (ур. ${b.lv}) за ${fmt(cost)} мон.`);
  toast(`${BLD[k].n}: уровень ${b.lv}!`); goalBump('build'); save(); render(); bldModal(k);
}
function bldSelf(k) {
  const E = estOf(); if (E.self === S.day) return toast('Сегодня вы уже поработали сами — завтра снова.');
  const lv = E.b[k].lv, v = Math.round(BLD[k].base * (0.6 + lv * 0.25) * E.dem[k] * (0.85 + R() * 0.3));
  E.self = S.day; S.gold += v; S.totalEarned += v;
  const L = { market: 'Вы сами встали за прилавок и зазывали покупателей.', quarry: 'Вы взяли кирку и помогли с тяжёлыми глыбами.', workshop: 'Вы выточили пару ложек и починили сундук.', farm: 'Вы пропололи грядки и проверили ульи.', tavern: 'Вы сами разливали сидр и травили байки.', baths: 'Вы растопили печи и разнесли полотенца.', library: 'Вы переписали главу старой хроники.' };
  let extra = '';
  if (k === 'tavern' && R() < 0.35) { S.rep += 1; extra = ' Гости довольны: репутация +1.'; }
  if (k === 'baths') { for (const c of homeChars()) c.stress = clamp(c.stress - 5); extra = ' Домашним полегчало: стресс −5.'; }
  addLog(`${L[k]} +${v} мон.`); goalBump('self');
  showModal('Поработать самому', `<p>${L[k]}</p><p class="report-total">+${fmt(v)} мон.${extra}</p><p class="small muted">Раз в день. Доход растёт с уровнем постройки и спросом.</p>`, [{ label: 'Хорошо', cls: 'btn-primary', act: () => { closeModal(); render(); } }]);
  save();
}
// --- рисунок постройки (SVG, тёплая «рисованная» палитра) ---
function bldSvg(k, lv, sel) {
  const B = BLD[k], s = lv ? 0.62 + lv * 0.1 : 0.55, R0 = B.roof;
  let g = '';
  if (!lv) g = `<ellipse cx="0" cy="8" rx="20" ry="7" fill="#b89a62" opacity=".55"/><path d="M-10 6 L-10 -6 M-10 -6 L4 -6 L4 0 L-10 0" stroke="#6b4a2a" stroke-width="2" fill="#e8d6a8"/><text x="-3" y="-1" font-size="6" text-anchor="middle" fill="#6b4a2a">+</text>`;
  else if (k === 'quarry') {
    g = `<ellipse cx="0" cy="10" rx="${20 + lv * 3}" ry="8" fill="#9a8f80"/><path d="M-18 8 L-10 -6 L-2 2 L6 -10 L18 8 Z" fill="#b7ad9c" stroke="#5e564a" stroke-width="1.5"/>${lv >= 2 ? '<rect x="8" y="2" width="9" height="6" fill="#8a6a42" stroke="#4a3520"/>' : ''}${lv >= 3 ? '<path d="M-20 8 L-14 -2 L-8 8Z" fill="#a39886" stroke="#5e564a"/>' : ''}${lv >= 4 ? '<path d="M14 -10 L22 -18 M22 -18 L26 -14" stroke="#4a3520" stroke-width="2"/>' : ''}${lv >= 5 ? '<circle cx="-6" cy="-2" r="2.5" fill="#f0c255"/>' : ''}`;
  } else if (k === 'farm') {
    g = `<rect x="-24" y="0" width="34" height="14" rx="2" fill="#7f9a4a"/>${[0, 1, 2, 3].map(i => `<path d="M-22 ${2 + i * 3.2} H8" stroke="#5c7a32" stroke-width="1.6"/>`).join('')}<rect x="10" y="-6" width="14" height="14" fill="#e8d6a8" stroke="#6b4a2a" stroke-width="1.5"/><path d="M8 -6 L17 -15 L26 -6Z" fill="${R0}" stroke="#6b4a2a"/>${lv >= 2 ? '<rect x="-30" y="2" width="5" height="8" rx="2" fill="#e0b84a" stroke="#7a5a1a"/>' : ''}${lv >= 3 ? '<circle cx="-14" cy="-4" r="4" fill="#5c8a3a"/><rect x="-15" y="-1" width="2" height="4" fill="#6b4a2a"/>' : ''}${lv >= 4 ? '<rect x="-30" y="-6" width="5" height="7" rx="2" fill="#e0b84a" stroke="#7a5a1a"/>' : ''}${lv >= 5 ? '<path d="M17 -15 V-22 L22 -20 L17 -18" fill="#f0c255" stroke="#6b4a2a"/>' : ''}`;
  } else {
    const w = 26 + (lv >= 3 ? 8 : 0), h = 16 + (lv >= 3 ? 8 : 0), tower = k === 'library';
    g = `<ellipse cx="0" cy="${h / 2 + 2}" rx="${w / 2 + 6}" ry="5" fill="#000" opacity=".12"/>`;
    if (tower) g += `<rect x="-8" y="${-h - 10}" width="16" height="${2 * h + 10}" fill="#e3d4b0" stroke="#5a4a3a" stroke-width="1.5" transform="translate(0 ${-h / 2 + 4})"/><path d="M-11 ${-h * 1.5 - 6} L0 ${-h * 1.5 - 22 - lv * 2} L11 ${-h * 1.5 - 6}Z" fill="${R0}" stroke="#3a2a4a"/><rect x="-3" y="${-h}" width="6" height="7" rx="3" fill="#f6d77a"/>`;
    else {
      g += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#efdfb8" stroke="#6b4a2a" stroke-width="1.5"/><path d="M${-w / 2 - 4} ${-h / 2} L0 ${-h / 2 - 13 - lv} L${w / 2 + 4} ${-h / 2}Z" fill="${R0}" stroke="#5a3a20" stroke-width="1.5"/><rect x="-3" y="${h / 2 - 8}" width="6" height="8" fill="#7a4a2a"/><rect x="${-w / 2 + 3}" y="${-h / 2 + 3}" width="5" height="5" fill="#f6d77a" stroke="#6b4a2a"/><rect x="${w / 2 - 8}" y="${-h / 2 + 3}" width="5" height="5" fill="#f6d77a" stroke="#6b4a2a"/>`;
      if (k === 'market') g += `<path d="M${-w / 2 - 10} 0 h10 v-5 h-10z" fill="#e9c46a"/>${[0, 1, 2].map(i => `<rect x="${-w / 2 - 10 + i * 3.4}" y="-5" width="1.7" height="5" fill="#b5523a"/>`).join('')}`;
      if (k === 'tavern') g += `<rect x="${w / 2 + 1}" y="-4" width="7" height="6" rx="1" fill="#d8a84a" stroke="#5a3a20"/>`;
      if (k === 'baths') g += `<path d="M-6 ${-h / 2 - 16 - lv} q3 -4 0 -8 M0 ${-h / 2 - 17 - lv} q3 -4 0 -8 M6 ${-h / 2 - 16 - lv} q3 -4 0 -8" stroke="#fff" stroke-width="1.5" fill="none" opacity=".85"/>`;
      if (k === 'workshop') g += `<rect x="${w / 2 - 7}" y="${-h / 2 - 18 - lv}" width="4" height="10" fill="#6b5a4a"/><circle cx="${w / 2 - 5}" cy="${-h / 2 - 22 - lv}" r="3" fill="#ccc" opacity=".6"/>`;
    }
    if (lv >= 2 && !tower) g += `<rect x="${-w / 2 + 2}" y="${-h / 2 - 11 - lv}" width="4" height="7" fill="#8a6a4a"/>`;
    if (lv >= 4) g += `<path d="M${tower ? 0 : w / 2 + 4} ${tower ? -h * 1.5 - 22 - lv * 2 : -h / 2} v-14 l8 3 l-8 3" fill="#c0392b" stroke="#5a3a20"/>`;
    if (lv >= 5) g += `<path d="M${-w / 2 - 4} ${-h / 2} L0 ${-h / 2 - 13 - lv} L${w / 2 + 4} ${-h / 2}" fill="none" stroke="#f0c255" stroke-width="2"/>`;
  }
  return `<g class="bld ${sel ? 'sel' : ''}" data-bld="${k}" transform="translate(${B.x * 3.6} ${B.y * 4.6}) scale(${s * 1.25})">${g}<rect x="-30" y="-34" width="60" height="52" fill="transparent"/></g>`;
}
function viewEstate() {
  const E = estOf();
  const blds = Object.keys(BLD), tot = blds.reduce((a, k) => a + bldPreview(k), 0), upk = blds.reduce((a, k) => a + bldUpkeep(k), 0);
  const free = homeChars().filter(c => !c.bld).length;
  return `<div class="screen-head"><h1>Владения</h1><div class="sub">Стройте и улучшайте предприятия, ставьте работников. Нажмите на участок.</div></div>
  <div class="est-map parchment"><svg viewBox="0 0 360 460" class="est-svg">
    <defs><radialGradient id="estg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#c9d98f"/><stop offset="1" stop-color="#8fae5e"/></radialGradient></defs>
    <rect width="360" height="460" rx="14" fill="url(#estg)"/>
    <path d="M-10 380 C80 340 120 420 200 380 S320 330 370 360 L370 470 L-10 470Z" fill="#7fb3c9" opacity=".85"/>
    <path d="M180 0 C170 90 200 160 180 250 S150 360 175 460" stroke="#d9c08a" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M0 200 C90 210 140 240 180 250 S300 230 360 215" stroke="#d9c08a" stroke-width="11" fill="none"/>
    ${[[30, 150], [330, 140], [120, 420], [250, 180], [320, 300], [40, 420], [140, 110]].map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-2" y="2" width="4" height="8" fill="#6b4a2a"/><circle r="9" fill="#5c8a3a"/><circle cx="-4" cy="-3" r="5" fill="#6f9e48"/></g>`).join('')}
    <text x="180" y="448" text-anchor="middle" font-size="11" fill="#2e4a5a" font-style="italic">речка Медовка</text>
    ${blds.map(k => bldSvg(k, E.b[k].lv)).join('')}
    ${blds.map(k => { const B = BLD[k], lv = E.b[k].lv; return `<g class="bld-lab" data-bld="${k}"><rect x="${B.x * 3.6 - 34}" y="${B.y * 4.6 + 22}" width="68" height="15" rx="7" fill="#fff8e6" opacity=".9" stroke="#8a6438"/><text x="${B.x * 3.6}" y="${B.y * 4.6 + 33}" text-anchor="middle" font-size="9.5" fill="#3b2616">${B.n.replace('Башня-библиотека', 'Библиотека')}${lv ? ' · ' + lv : ''}</text></g>`; }).join('')}
  </svg></div>
  <div class="panel parchment"><div class="panel-title">Сводка владений</div>
    <div class="small">Доход за день (прогноз): <b>+${fmt(tot)}</b> · содержание построек: <b>−${upk}</b> · свободных рук: ${free}</div>
    <div class="est-list">${blds.map(k => { const lv = E.b[k].lv, d = E.dem[k]; return `<button class="est-row" data-bld="${k}"><b>${BLD[k].n}</b><span>${lv ? `ур. ${lv} · ${bldWorkers(k).length}/${BLD_SLOTS[lv]} раб. · +${bldPreview(k)}` : `участок · ${fmt(bldCost(k, 1))} мон.`}</span><span class="dem ${d >= 1.1 ? 'up' : d <= 0.9 ? 'down' : ''}">спрос ${d >= 1.1 ? '▲' : d <= 0.9 ? '▼' : '•'} ${Math.round(d * 100)}%</span></button>`; }).join('')}</div>
    ${E.last ? `<div class="small muted">Вчера постройки принесли ${fmt(E.last.inc)} мон. (содержание −${E.last.upk}).</div>` : ''}
    <div class="small muted">Работник постройки весь день там — обычных дел (ремесло, торговля, салон, учёба) у него нет. Спрос меняется каждый день.</div></div>`;
}
function bldModal(k) {
  const E = estOf(), B = BLD[k], lv = E.b[k].lv, ws = bldWorkers(k);
  const cand = homeChars().filter(c => !c.bld).map(c => ({ c, o: bldWorkerOut(c, k) })).sort((a, b) => b.o.v - a.o.v);
  const statN = B.st.map(statName).join(' и '), trN = B.tr.map(t => TRAITS[t].name).join(', ');
  const nextC = lv < 5 ? bldCost(k, lv + 1) : 0;
  showModal(B.n + (lv ? ` · уровень ${lv}` : ' · участок'), `
    <div class="bld-pic"><svg viewBox="-38 -48 76 66" width="190" height="165">${bldSvg(k, lv).replace(/transform="[^"]*"/, '')}</svg></div>
    <p class="small">${B.d}</p>
    <div class="small">Нужны: <b>${statN}</b> (требование ${12 + Math.max(1, lv) * 6}) · бонус черт: <b>${trN}</b> (+25%)</div>
    <div class="small">Спрос сегодня: ${Math.round(E.dem[k] * 100)}% · содержание: ${bldUpkeep(k) || (6 + 5)} мон./день</div>
    ${lv ? `<div class="panel-title small" style="margin-top:8px">Работники ${ws.length}/${BLD_SLOTS[lv]}</div>
    ${ws.map(c => { const o = bldWorkerOut(c, k); return `<div class="bw-row"><b>${esc(fn1(c))}</b> +${o.v} <button class="btn small" data-bldun="${c.uid}">Снять</button><div class="why small muted">Почему так: ${B.base} × ${o.why.map(w => `${w[0]} ×${w[1].toFixed(2)}`).join(' · ')}</div></div>`; }).join('') || '<div class="small muted">Пока никого.</div>'}
    ${ws.length < BLD_SLOTS[lv] && cand.length ? `<div class="small" style="margin-top:6px">Поставить (лучшие сверху):</div>${cand.slice(0, 6).map(({ c, o }) => `<button class="chip bw-cand" data-bldto="${c.uid}" data-k="${k}">${esc(fn1(c))} · +${o.v}${o.sv < o.req ? ' ⚠' : ''}</button>`).join(' ')}` : ''}` : ''}
  `, [
    ...(lv < 5 ? [{ label: `${lv ? 'Улучшить' : 'Построить'} · ${fmt(nextC)}`, cls: 'btn-primary', act: () => bldUpgrade(k) }] : []),
    ...(lv ? [{ label: E.self === S.day ? 'Сами — уже сегодня' : 'Поработать самому', act: () => bldSelf(k) }] : []),
    { label: 'Закрыть', act: 'close' }]);
}
// день: выработка построек (до основного подсчёта)
function estDayStart() {
  const E = estOf(); let inc = 0, upk = 0; const lines = [];
  for (const k in BLD) {
    const lv = E.b[k].lv; if (!lv) continue;
    upk += bldUpkeep(k);
    for (const c of bldWorkers(k)) {
      if (c.status !== 'home') { c.bld = null; continue; }
      if (c.sickDays > 0 || c.health < 30) { lines.push(`${fn1(c)} не вышл${g(c, 'и', 'а')} в «${BLD[k].n}» — нездоровится.`); continue; }
      const o = bldWorkerOut(c, k); inc += o.v;
      c._bp = { fatigue: c.fatigue, stress: c.stress, health: c.health, task: c.task, fa: k === 'quarry' ? 20 : k === 'baths' || k === 'library' ? 10 : 15, sa: k === 'tavern' || k === 'market' ? 10 : 7 };
      c.status = 'bld'; c.task = 'rest';
      lines.push(`${fn1(c)} — ${BLD[k].n}: +${o.v} мон.`);
      if (k === 'library') { const s = pick(['int', 'wil']); if (R() < 0.4 && c.stats[s] < c.pot[s]) c.stats[s]++; }
      if (R() < 0.25) { const s = pick(BLD[k].st); if (c.stats[s] < c.pot[s]) c.stats[s]++; }
    }
    if (k === 'tavern' && R() < 0.12 * lv) { S.rep += 1; lines.push('Ваша таверна в моде: репутация +1.'); }
    if (k === 'baths') { for (const c of S.owned) { c.stress = clamp(c.stress - 3 * lv); c.health = clamp(c.health + 2 * lv); } lines.push(`Купальни: всем стресс −${3 * lv}, здоровье +${2 * lv}.`); }
  }
  // налог гильдии раз в неделю — чтобы монеты не копились без дела
  let tax = 0;
  if (S.day % 7 === 0) { const lvls = Object.values(E.b).reduce((a, b) => a + b.lv, 0); tax = Math.round(Math.max(0, S.gold - 1500) * 0.04 + lvls * 12); if (tax) lines.push(`Недельный сбор гильдии: −${tax} мон. (4% с запаса сверх 1500 и по 12 за уровень построек).`); }
  S.gold += inc - upk - tax; S.totalEarned += inc;
  E.last = { inc, upk, tax, lines, day: S.day };
}
function estDayEnd() {
  for (const c of S.owned) if (c._bp) {
    const p = c._bp; c.status = 'home'; c.task = p.task;
    c.fatigue = clamp(p.fatigue + p.fa * (has(c, 'lazy') ? 1.3 : 1)); c.stress = clamp(Math.max(c.stress - 0, p.stress + p.sa * (has(c, 'cheerful') ? 0.7 : has(c, 'sensitive') ? 1.3 : 1)));
    c.health = Math.min(c.health, p.health + 2);
    if (c.fatigue >= 90) c.health = clamp(c.health - 10);
    delete c._bp;
  }
  const E = estOf();
  for (const k in BLD) { const d = E.dem[k] + (R() - 0.5) * 0.16 + (1 - E.dem[k]) * 0.15; E.dem[k] = +clamp(d, 0.65, 1.45).toFixed(2); }
  const fe = mev(); if (fe && S.mevent) { if (S.mevent.id === 'festival') { E.dem.tavern = 1.4; E.dem.market = 1.35; } if (S.mevent.id === 'drought') E.dem.farm = 1.45; }
  if (E.b.farm.lv) S._farmDisc = E.b.farm.lv * 0.05;
}
// огород удешевляет еду
(function () { const o = window.upkeep; if (typeof o !== 'function') return; window.upkeep = function () { const r = o.apply(this, arguments); try { const lv = S.est && S.est.b.farm ? S.est.b.farm.lv : 0; if (lv) { const cut = Math.round(r.food * lv * 0.06); r.food -= cut; r.total -= cut; } } catch (e) { } return r; }; })();

// ===== Цели =====
const GOAL_POOL = [
  ['praise', 'Похвалить кого-нибудь', 1, 60, 0], ['talk', 'Поговорить с персонажем', 2, 50, 0], ['self', 'Поработать самому во Владениях', 1, 80, 0],
  ['assign', 'Поставить работника в постройку', 1, 60, 0], ['build', 'Построить или улучшить здание', 1, 150, 1], ['bid', 'Сделать ставку на аукционе', 1, 70, 0],
  ['touch', 'Приласкать (по-доброму)', 2, 40, 0], ['gift', 'Сделать подарок', 1, 70, 0], ['order', 'Отправить кого-то на заказ в таверне', 1, 90, 1],
];
const MILESTONES = [
  ['b1', 'Первая постройка', () => Object.values(S.est.b).some(b => b.lv), 300, 2],
  ['w3', 'Три работника во Владениях', () => S.owned.filter(c => c.bld).length >= 3, 400, 2],
  ['b3', 'Три разных постройки', () => Object.values(S.est.b).filter(b => b.lv).length >= 3, 600, 3],
  ['lv3', 'Здание 3-го уровня', () => Object.values(S.est.b).some(b => b.lv >= 3), 800, 3],
  ['rD', 'Ранг гильдии D', () => S.rep >= 15, 500, 0], ['own6', 'Шесть жителей в поместье', () => S.owned.length >= 6, 500, 2],
  ['auc', 'Выиграть лот на аукционе', () => S.auc.won >= 1, 300, 2], ['rC', 'Ранг гильдии C', () => S.rep >= 30, 1200, 0],
  ['lv5', 'Здание 5-го уровня', () => Object.values(S.est.b).some(b => b.lv >= 5), 2500, 5], ['g20', '20 000 монет в кассе', () => S.gold >= 20000, 1500, 5],
];
function goalsRoll() {
  const G = estOf() && S.goals;
  if (G.day === S.day) return G;
  const pool = GOAL_POOL.slice().sort(() => R() - 0.5).slice(0, 3);
  G.day = S.day; G.cnt = {}; G.list = pool.map(p => ({ id: p[0], t: p[1], need: p[2], rw: p[3] + S.day * 3, rep: p[4], done: false }));
  return G;
}
function goalBump(id) { try { const G = goalsRoll(); G.cnt[id] = (G.cnt[id] || 0) + 1; } catch (e) { } }
function goalClaim(i) {
  const G = goalsRoll(), q = G.list[i]; if (!q || q.done || (G.cnt[q.id] || 0) < q.need) return;
  q.done = true; S.gold += q.rw; S.rep += q.rep; sfx('coin'); toast(`Цель выполнена: +${q.rw} мон.${q.rep ? `, репутация +${q.rep}` : ''}`);
  if (G.list.every(x => x.done)) { S.gold += 150; S.rep += 1; toast('Все цели дня! Бонус +150 мон., репутация +1'); }
  save(); render();
}
function msClaim(id) {
  const m = MILESTONES.find(x => x[0] === id); if (!m || S.goals.ms[id] || !m[2]()) return;
  S.goals.ms[id] = S.day; S.gold += m[3]; S.rep += m[4]; sfx('coin'); toast(`Веха «${m[1]}»: +${fmt(m[3])} мон.${m[4] ? `, репутация +${m[4]}` : ''}`); save(); render();
}
function goalsPanel() {
  const G = goalsRoll(), ri = rankIdx(), nx = RANKS[ri + 1];
  const pr = nx ? Math.round((S.rep - RANKS[ri].rep) / (nx.rep - RANKS[ri].rep) * 100) : 100;
  const ms = MILESTONES.filter(m => !S.goals.ms[m[0]]).slice(0, 2);
  return `<div class="panel parchment goals-panel"><div class="panel-title">Цели</div>
    <div class="rank-bar small"><span>Ранг ${RANKS[ri].key}${nx ? ` → ${nx.key}: репутация ${S.rep}/${nx.rep}` : ' — высший'}</span><div class="bar"><i style="width:${clamp(pr, 0, 100)}%"></i></div></div>
    <div class="small muted">На сегодня (обновятся завтра):</div>
    ${G.list.map((q, i) => { const h = Math.min(q.need, G.cnt[q.id] || 0), ok = h >= q.need; return `<div class="goal ${q.done ? 'done' : ''}"><span>${q.done ? '✓' : ok ? '★' : '○'} ${q.t} ${q.need > 1 ? `(${h}/${q.need})` : ''}</span>${q.done ? '<small>получено</small>' : ok ? `<button class="btn small btn-primary" data-goal="${i}">+${q.rw}</button>` : `<small>+${q.rw}</small>`}</div>`; }).join('')}
    <div class="small muted" style="margin-top:4px">Вехи:</div>
    ${ms.map(m => { const ok = m[2](); return `<div class="goal"><span>${ok ? '★' : '◇'} ${m[1]}</span>${ok ? `<button class="btn small btn-primary" data-ms="${m[0]}">+${fmt(m[3])}</button>` : `<small>+${fmt(m[3])}${m[4] ? ` · реп. +${m[4]}` : ''}</small>`}</div>`; }).join('')}
  </div>`;
}

// ===== Аукцион =====
const BIDDERS = [
  { n: 'Скряга Мортимер', p: 'жадный: торгуется по монетке, сдаётся рано', lo: 0.75, hi: 1.05, agg: 0.55, say: ['Ещё монетка — и ни медяком больше!', 'Хм... ладно, накину.'] },
  { n: 'Вдова Ильза', p: 'азартная: перебивает почти всегда', lo: 0.95, hi: 1.45, agg: 0.9, say: ['Ха! Моё!', 'Не отдам, голубчик.'] },
  { n: 'Гном Бруни', p: 'расчётливый: знает цену и выше не идёт', lo: 1.0, hi: 1.15, agg: 0.8, say: ['По справедливости — столько.', 'Посчитано.'] },
  { n: 'Барон фон Штрудель', p: 'тщеславный: любит редкое, ненавидит проигрывать', lo: 0.9, hi: 1.6, agg: 0.7, say: ['Это украсит мой зал!', 'Барон не уступает!'] },
  { n: 'Тётушка Мэйбл', p: 'осторожная: ставит редко', lo: 0.7, hi: 1.0, agg: 0.4, say: ['Ох, ну разве что чуть-чуть...', 'Попробую.'] },
];
function aucRoll() {
  const A = estOf() && S.auc; if (A.next > S.day && A.lots.length) return A;
  A.next = S.day + 2; A.lots = [];
  const n = 3 + (rankIdx() >= 2 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const t = i === 0 ? 'slave' : pick(['gear', 'gear', 'item', 'rare']);
    let lot = { id: 'L' + (S.nextId++), t };
    if (t === 'slave') { const c = makeCharacter({ rarity: R() < 0.3 ? 3 : 2 }); lot.ch = c; lot.name = fn1(c) + ` (${c.race ? (RACES[c.race] ? RACES[c.race].name : c.race) : ''})`; lot.val = Math.round(corePrice(c)); }
    else if (t === 'gear') { const isO = R() < 0.4, base = pick(Object.keys(isO ? OUTFITS : ACCESSORIES)), q = R() < 0.4 ? 2 : 1, it = makeGear(isO ? 'outfit' : 'acc', base, Math.min(q, GEAR_Q.length - 1)); lot.it = it; lot.name = gearDef(it).name + ' · ' + GEAR_Q[it.q].name; lot.val = Math.round(gearVal(it) * 1.1); }
    else if (t === 'item') { const id = pick(Object.keys(ITEMS)), q = rint(3, 6); lot.item = id; lot.q = q; lot.name = `${ITEMS[id].name} ×${q}`; lot.val = ITEMS[id].price * q; }
    else { lot.item = 'amulet'; lot.q = 2; lot.name = 'Редкость: 2 амулета удачи с юга'; lot.val = 300; }
    lot.reserve = Math.round(lot.val * 0.6); lot.buyout = Math.round(lot.val * 1.35); lot.bid = 0; lot.done = false;
    S.auc.lots.push(lot);
  }
  return A;
}
let AUCS = null; // текущие торги
function aucOpen(id) {
  const lot = S.auc.lots.find(l => l.id === id); if (!lot || lot.done) return;
  const bs = BIDDERS.slice().sort(() => R() - 0.5).slice(0, 3).map(b => ({ ...b, max: Math.round(lot.val * (b.lo + R() * (b.hi - b.lo))) }));
  AUCS = { lot, bs, cur: lot.reserve, lead: null, log: [`Стартовая цена (резерв) — ${fmt(lot.reserve)} мон. Торгуются: ${bs.map(b => b.n).join(', ')}.`] };
  aucRender();
}
function aucStep() { return Math.max(5, Math.round(AUCS.lot.val * 0.06 / 5) * 5); }
function aucRender() {
  const A = AUCS; if (!A) return; const st = aucStep(), my = A.lead === 'you';
  showModal('Торги: ' + A.lot.name, `<div class="auc-cur">Ставка: <b>${fmt(A.cur)}</b> мон. · лидер: <b>${A.lead ? (my ? 'вы' : A.lead) : '—'}</b></div>
    <div class="small muted">Рыночная оценка ≈ ${fmt(A.lot.val)} · выкуп сразу: ${fmt(A.lot.buyout)} · у вас ${fmt(S.gold)}</div>
    <div class="auc-bs">${A.bs.map(b => `<div class="small"><b>${b.n}</b> — ${b.p}${b.out ? ' · <i>выбыл</i>' : ''}</div>`).join('')}</div>
    <div class="auc-log">${A.log.slice(-6).map(l => `<div>${l}</div>`).join('')}</div>`, [
    { label: `Ставка ${fmt(A.lead ? A.cur + st : A.cur)}`, cls: 'btn-primary', act: () => aucBid() },
    { label: `Выкуп ${fmt(A.lot.buyout)}`, act: () => aucWin(A.lot.buyout, true) },
    { label: my ? 'Ждать (молоток)' : 'Пас', act: () => my ? aucHammer() : aucPass() }]);
}
function aucBid() {
  const A = AUCS, amt = A.lead ? A.cur + aucStep() : A.cur;
  if (amt > S.gold) return toast('Столько монет у вас нет.');
  if (A.lot.t === 'slave' && S.owned.length >= S.capacity) return toast('В поместье нет места для нового жителя.');
  A.cur = amt; A.lead = 'you'; A.log.push(`Вы: ${fmt(amt)}.`); goalBump('bid');
  // ответы соперников
  const alive = A.bs.filter(b => !b.out && b.max >= A.cur + aucStep());
  A.bs.forEach(b => { if (b.max < A.cur + aucStep() && !b.out) { b.out = true; A.log.push(`${b.n} качает головой и выходит из торгов.`); } });
  const r = alive.sort(() => R() - 0.5).find(b => R() < b.agg);
  if (r) { A.cur += aucStep(); A.lead = r.n; A.log.push(`${r.n}: «${pick(r.say)}» — ${fmt(A.cur)}.`); }
  else if (!alive.length) return aucHammer();
  else A.log.push('Зал затих...');
  aucRender();
}
function aucHammer() {
  const A = AUCS;
  if (A.lead === 'you') { const r = A.bs.filter(b => !b.out && b.max >= A.cur + aucStep()).find(b => R() < b.agg * 0.6); if (r) { A.cur += aucStep(); A.lead = r.n; A.log.push(`В последний миг ${r.n} поднимает руку — ${fmt(A.cur)}!`); return aucRender(); } return aucWin(A.cur); }
  aucPass();
}
function aucPass() { const A = AUCS; A.lot.done = true; A.lot.who = A.lead || 'никто'; addLog(`Аукцион: «${A.lot.name}» ушёл к ${A.lead || 'никому'}${A.lead ? ' за ' + fmt(A.cur) : ''}.`); AUCS = null; closeModal(); save(); render(); }
function aucWin(price, buyout) {
  const A = AUCS, lot = A.lot;
  if (price > S.gold) return toast('Столько монет у вас нет.');
  if (lot.t === 'slave' && S.owned.length >= S.capacity) return toast('В поместье нет места для нового жителя.');
  S.gold -= price; lot.done = true; lot.who = 'вы'; S.auc.won++;
  if (lot.ch) { const c = lot.ch; c.status = 'home'; c.boughtFor = price; c.task = 'rest'; S.owned.push(c); if (typeof migrateChar === 'function') try { migrateChar(c); } catch (e) { } }
  if (lot.it) S.stash.push(lot.it);
  if (lot.item) S.inv[lot.item] = (S.inv[lot.item] || 0) + lot.q;
  sfx('coin'); addLog(`Аукцион: вы ${buyout ? 'выкупили' : 'выиграли'} «${lot.name}» за ${fmt(price)} мон.`);
  AUCS = null; closeModal(); toast(`Молоток! «${lot.name}» ваш за ${fmt(price)} мон.`); save(); render();
}
function aucSellList(kind, ref) {
  const A = aucRoll(); if (A.sell.length >= 3) return toast('Не больше трёх своих лотов за раз.');
  let lot = null;
  if (kind === 'slave') { const c = findOwned(ref); if (!c || c.status !== 'home' || c.preg) return toast('Сейчас выставить нельзя.'); if (A.sell.some(s => s.uid === ref)) return; lot = { k: 'slave', uid: ref, name: fn1(c), val: sellPrice(c) }; }
  if (kind === 'gear') { const it = S.stash.find(x => x.iid === ref); if (!it) return; S.stash = S.stash.filter(x => x !== it); lot = { k: 'gear', it, name: gearDef(it).name, val: Math.round(gearVal(it) * 0.6) }; }
  if (kind === 'item') { if (!(S.inv[ref] > 0)) return; S.inv[ref]--; lot = { k: 'item', item: ref, name: ITEMS[ref].name, val: Math.round(ITEMS[ref].price * 0.6) }; }
  if (!lot) return;
  lot.reserve = Math.round(lot.val * 0.9); A.sell.push(lot); toast(`Выставлено: ${lot.name}. Итог — в конце дня.`); save(); render();
}
function aucResolveSells() {
  const A = estOf() && S.auc, out = []; if (!A.sell.length) return out;
  const keep = [];
  for (const l of A.sell) {
    const c = l.k === 'slave' ? findOwned(l.uid) : null;
    if (l.k === 'slave' && (!c || c.status !== 'home')) { if (c) keep.push(l); continue; }
    const price = Math.round(l.val * (0.75 + R() * 0.75)), fee = Math.round(Math.max(price, l.val) * 0.08);
    if (price < l.reserve) { const lf = Math.round(l.val * 0.02); S.gold -= lf; out.push(`Аукцион: «${l.name}» не продан (лучшая ставка ${fmt(price)} < резерва ${fmt(l.reserve)}). Сбор за лот −${lf}.`); if (l.k === 'gear') S.stash.push(l.it); if (l.k === 'item') S.inv[l.item] = (S.inv[l.item] || 0) + 1; continue; }
    S.gold += price - fee; S.totalEarned += price - fee;
    if (c) { S.owned = S.owned.filter(x => x !== c); }
    out.push(`Аукцион: «${l.name}» продан${c ? g(c, '', 'а') : ''} за ${fmt(price)} (на рынке ≈${fmt(l.val)}), комиссия −${fee}.`);
  }
  A.sell = keep; return out;
}
function viewAuction() {
  const A = aucRoll();
  const mine = homeChars().filter(c => !c.preg && !A.sell.some(s => s.uid === c.uid));
  const inv = Object.entries(S.inv).filter(([k, v]) => v > 0 && ITEMS[k]);
  return `<div class="screen-head"><h1>Аукцион «Молоток и мёд»</h1><div class="sub">Новые лоты раз в два дня (следующие — день ${A.next}). Торгуйтесь против купцов с характером.</div></div>
  <div class="panel parchment"><div class="panel-title">Лоты</div>
  ${A.lots.map(l => `<div class="auc-lot ${l.done ? 'done' : ''}"><div><b>${esc(l.name)}</b><div class="small muted">оценка ≈${fmt(l.val)} · старт ${fmt(l.reserve)} · выкуп ${fmt(l.buyout)}</div></div>${l.done ? `<small>ушло: ${esc(l.who)}</small>` : `<button class="btn btn-primary small" data-auc="${l.id}">Торговаться</button>`}</div>`).join('')}
  </div>
  <div class="panel parchment"><div class="panel-title">Продать через аукцион</div>
  <div class="small muted">Цена может выйти выше рынка (до +50%), но есть резерв 90% оценки и комиссия 8%. Не продано — сбор 2% и вещь возвращается. Итог в конце дня.</div>
  ${A.sell.length ? `<div class="small" style="margin:6px 0">Выставлено: ${A.sell.map(s => `<b>${esc(s.name)}</b> (≈${fmt(s.val)})`).join(', ')}</div>` : ''}
  <div class="auc-sell">${mine.map(c => `<button class="chip" data-aucsell="slave:${c.uid}">${esc(fn1(c))} ≈${fmt(sellPrice(c))}</button>`).join('')}
  ${S.stash.slice(0, 8).map(it => `<button class="chip" data-aucsell="gear:${it.iid}">${esc(gearDef(it).name)}</button>`).join('')}
  ${inv.map(([k, v]) => `<button class="chip" data-aucsell="item:${k}">${ITEMS[k].name} (${v})</button>`).join('')}</div></div>`;
}

// ===== подключение =====
(function () {
  const oEnd = window.endDay;
  window.endDay = function () {
    estOf(); let aucLines = [];
    try { estDayStart(); aucLines = aucResolveSells(); } catch (e) { console.warn('v10 day', e); }
    try { return oEnd.apply(this, arguments); }
    finally { try { estDayEnd(); if (S.est.last) S.est.last.lines.push(...aucLines); save(); } catch (e) { console.warn('v10 end', e); } }
  };
  const oModal = window.showModal;
  window.showModal = function (title, html, btns) {
    try {
      const L = S.est && S.est.last;
      if (L && L.day === S.day - 1 && !L.shown && /report|Итог/i.test(html + title) && /report-total/.test(html)) {
        L.shown = true;
        if (L.lines.length || L.inc || L.upk) html = html.replace(/(<[^>]*class="[^"]*report-total)/, `<div class="est-rep"><div class="panel-title small">Владения и аукцион</div>${L.lines.map(l => `<div class="small">${esc(l)}</div>`).join('')}<div class="small"><b>Постройки: +${fmt(L.inc)} − содержание ${L.upk}${L.tax ? ` − сбор ${L.tax}` : ''} = ${L.inc - L.upk - L.tax >= 0 ? '+' : ''}${fmt(L.inc - L.upk - L.tax)} мон.</b> <span class="muted">(уже в кассе, сверх итога ниже)</span></div></div>$1`);
      }
    } catch (e) { }
    return oModal.call(this, title, html, btns);
  };
  const oRender = window.render;
  window.render = function () {
    const r = oRender.apply(this, arguments);
    try {
      estOf();
      if (UI.screen === 'estate') $app().innerHTML = viewEstate();
      else if (UI.screen === 'auction') $app().innerHTML = viewAuction();
      else if (UI.screen === 'manor') { const h = document.querySelector('#screen .screen-head'); if (h) h.insertAdjacentHTML('afterend', goalsPanel()); }
      else if (UI.screen === 'card') { const c = findOwned(UI.cardUid); if (c && c.bld) { const h = document.querySelector('#screen .screen-head') || document.querySelector('#screen > *'); if (h) h.insertAdjacentHTML('afterend', `<div class="panel parchment est-note small">Работает во Владениях: <b>${BLD[c.bld].n}</b> — обычные дела не выполняет. <button class="btn small" data-bldun="${c.uid}">Снять</button></div>`); } }
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === UI.screen));
    } catch (e) { console.warn('v10 render', e); }
    return r;
  };
  const oAct = window.act; window.act = function (uid, kind) { if (kind === 'praise') { const c = findOwned(uid); if (c && c.praisedDay !== S.day) goalBump('praise'); } return oAct.apply(this, arguments); };
  const oTouch = window.touch; if (oTouch) window.touch = function () { goalBump('touch'); return oTouch.apply(this, arguments); };
  const oUse = window.useItem; window.useItem = function () { goalBump('gift'); return oUse.apply(this, arguments); };
  const oAO = window.assignOrder; window.assignOrder = function (oid, uid) { const c = findOwned(uid); if (c && c.bld) c.bld = null; const n = S.owned.filter(x => x.status === 'order').length; const r = oAO.apply(this, arguments); if (S.owned.filter(x => x.status === 'order').length > n) goalBump('order'); return r; };
  if (window.aiSend) { const oS = window.aiSend; window.aiSend = function () { goalBump('talk'); return oS.apply(this, arguments); }; }
  const oSell = window.sell; window.sell = function (uid) { if (S.auc && S.auc.sell.some(s => s.uid === uid)) S.auc.sell = S.auc.sell.filter(s => s.uid !== uid); return oSell.apply(this, arguments); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-bld],[data-bldto],[data-bldun],[data-goal],[data-ms],[data-auc],[data-aucsell]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.bldto) { bldAssign(+t.dataset.bldto || t.dataset.bldto, t.dataset.k); render(); return bldModal(t.dataset.k); }
    if (t.dataset.bldun) { const c = findOwned(+t.dataset.bldun || t.dataset.bldun); const k = c && c.bld; bldAssign(c && c.uid, null); render(); if (k && document.getElementById('modal') && document.getElementById('modal').classList.contains('open')) bldModal(k); return; }
    if (t.dataset.bld) return bldModal(t.dataset.bld);
    if (t.dataset.goal) return goalClaim(+t.dataset.goal);
    if (t.dataset.ms) return msClaim(t.dataset.ms);
    if (t.dataset.auc) return aucOpen(t.dataset.auc);
    if (t.dataset.aucsell) { const [k, ...r] = t.dataset.aucsell.split(':'); const ref = r.join(':'); return aucSellList(k, k === 'slave' ? (+ref || ref) : ref); }
  }, true);
  try {
    HELP.push(['estate', 'Владения', () => `<p>Карта поместья: 7 участков. Постройте здание и улучшайте до 5-го уровня — оно растёт и меняет вид. Каждое здание даёт доход от работников, но требует содержания.</p><p>Работникам нужны свои навыки (например, каменоломне — Сила и Выносливость), а черты дают +25% (Трудолюбие, Выносливость, Обаяние...). Ниже требования — выработка ×0.6. В окне здания строка «Почему так» раскладывает доход по множителям.</p><p>Работник постройки весь день там и не берёт обычные дела. «Поработать самому» — раз в день, небольшой доход. Спрос на каждую постройку меняется ежедневно. Огород удешевляет еду, купальни лечат всех, библиотека учит, таверна иногда даёт репутацию. Раз в неделю гильдия берёт сбор.</p>`]);
    HELP.push(['auction', 'Аукцион и цели', () => `<p>Аукцион: раз в два дня новые лоты (житель, наряды, припасы, редкости). Соперники с характером: скряга сдаётся рано, азартная вдова перебивает. «Ставка» поднимает цену, «Ждать» — ударить молотком, «Выкуп» — забрать сразу.</p><p>Можно выставить своё: цена бывает выше рынка, но есть резерв и комиссия 8%. Итог в конце дня.</p><p>Цели: три задания на день с наградой, бонус за все три, вехи с крупными наградами и полоса до следующего ранга гильдии.</p>`]);
  } catch (e) { }
})();
