'use strict';
// ===== v16: наёмная артель — жалованье, договоры, общение и забота, должности, личные цели, праздники, цели хозяйства, перенос сохранений =====
// Все работники — вольные взрослые люди, нанятые по договору. Игрок — управляющий хозяйством.
const GAME_VER = '16.0';
const CONTRACT_DAYS = 14;
const STAFF_RANKS = [
  { n: 'Работник', f: 'Работница', inc: 0, wage: 0 },
  { n: 'Старший работник', f: 'Старшая работница', inc: 0.08, wage: 0.15, days: 6, loy: 55 },
  { n: 'Бригадир', f: 'Бригадир', inc: 0.16, wage: 0.3, days: 14, loy: 65 },
  { n: 'Мастер артели', f: 'Мастер артели', inc: 0.25, wage: 0.5, days: 24, loy: 75 },
];
const MASTER_COST = 120;
const S16_REMOVED = { outfit: ['swim', 'lace', 'night'], acc: ['silkst', 'lacest', 'fishnet', 'garter', 'seamed', 'thighhi', 'bell'] };
const S16_BAD = /хозя|господ|госпож|раб(?!от|оч)|наказ|плет|ласк|поцел|целу|обним|течк|берем|скрещ|поглад|постел|интим|флирт|наедине|близост|утех|бордел|невольн|ошейник|покорн/i;

// ---------- жалованье ----------
function baseWage(c) { return Math.round(clamp(6 + sumStats(c) / 25 + (c.rarity || 0) * 3 + (c.unique ? 6 : 0), 6, 45)); }
function wageOf(c) { if (!c) return 0; const w = c.wage || baseWage(c); return Math.round(w); }
function rankOf(c) { return STAFF_RANKS[c.rank || 0] || STAFF_RANKS[0]; }
function rankName(c) { const r = rankOf(c); return c.g === 'f' ? r.f : r.n; }
function daysWith(c) { return Math.max(0, S.day - (c.hiredDay || S.day)); }
function wageChip(c) {
  let s = ` · <span class="wage-chip">${wageOf(c)} мон./д</span>`;
  if (c.rank) s += ` · <span class="rank-chip">${esc(rankName(c))}</span>`;
  if (c.renewAsk) s += ' · <span class="warn-chip" title="Договор закончился — нужно обсудить продление">📜 договор</span>';
  else if (c.contractEnd && c.contractEnd - S.day <= 2) s += ` · <span class="warn-chip">📜 ${dn(Math.max(0, c.contractEnd - S.day))}</span>`;
  if ((c.quitWarn || 0) >= 1) s += ' · <span class="warn-chip neg" title="Недоволен условиями и думает уйти">⚠ думает уйти</span>';
  return s;
}
function staffInit(c, cost, opts) {
  opts = opts || {};
  if (!c.wage) c.wage = baseWage(c);
  if (c.hiredDay == null) c.hiredDay = opts.hiredDay != null ? opts.hiredDay : S.day;
  if (!c.contractEnd) c.contractEnd = S.day + (opts.left || CONTRACT_DAYS);
  if (c.rank == null) c.rank = 0;
  c.quitWarn = c.quitWarn || 0;
  c.qc = c.qc || {};
}
function staffHire(c, cost) {
  staffInit(c, cost);
  c.hiredDay = S.day; c.contractEnd = S.day + CONTRACT_DAYS; c.renewAsk = null;
  if (!c.q16 && R() < 0.5) c.q16Day = S.day + rint(2, 4);
  try { goalBump('hire'); } catch (e) { }
}
function hireTermsHtml(c) {
  const w = wageOf(c);
  const exp = has(c, 'gourmet') ? 'хочет хороший стол' : has(c, 'lazy') ? 'просит щадящий график' : has(c, 'diligent') ? 'готов' + g(c, '', 'а') + ' к сверхурочным' : has(c, 'loyal') ? 'ищет место надолго' : has(c, 'stubborn') ? 'любит работать по-своему' : 'обычные ожидания';
  return `<div class="hire-terms"><span>💰 Жалованье <b>${w}</b> мон./день</span><span>📜 Договор на ${CONTRACT_DAYS} дней</span><span>🧭 ${esc(exp)}</span></div>`;
}
function severanceOf(c) { return Math.round(wageOf(c) * 3 + Math.min(60, daysWith(c) * 2)); }
function placeBlock(c) {
  if (!c) return 'Работник не найден.';
  if (mood(c) < 40) return `${fn1(c)} сейчас не готов${g(c, '', 'а')} менять место: настроение ниже 40. Сначала поговорите, дайте отдых.`;
  if (daysWith(c) < 3) return `${fn1(c)} только недавно у вас — рекомендовать рано (нужно 3 дня).`;
  return '';
}

// ---------- расходы: жалованье в содержании ----------
(function () {
  const oUp = window.upkeep;
  window.upkeep = function () {
    const r = oUp.apply(this, arguments);
    try { const w = S.owned.reduce((a, c) => a + wageOf(c), 0); r.wage = w; r.total += w; } catch (e) { }
    return r;
  };
  // должность повышает доход
  const addRank = (f) => function (c) {
    const r = f.apply(this, arguments);
    try { const k = rankOf(c).inc; if (k && r && r.parts && r.base) { r.parts.push(['должность', 1 + k]); r.mult = r.parts.reduce((a, p) => a * p[1], 1); r.v = Math.round(r.base * r.mult); } } catch (e) { }
    return r;
  };
  window.incomeInfo = addRank(window.incomeInfo);
  if (window.salonIncome) window.salonIncome = addRank(window.salonIncome);
})();

// ---------- общение и забота ----------
const TALK16 = {
  any: ['Работа спорится, {х}. Если честно, приятно, когда спрашивают.', 'Знаете, {х}, я тут подумал{|а}: можно бы переставить полки, будет быстрее.', 'Спасибо, что выслушали, {х}. Не каждый наниматель так делает.', 'Сегодня на рынке говорили, что у нас самый честный товар. Это приятно, {х}.', 'Я хочу научиться чему-то новому, {х}. Есть у вас мысли?'],
  tired: ['Если честно, {х}, я выдохся{|лась}. Пару дней полегче — и снова в строй.', 'Смена была длинная, {х}. Спасибо, что спросили.'],
  sad: ['Тоскливо мне, {х}. Скучаю по дому.', 'Не знаю, {х}… всё валится из рук. Но поговорить — уже легче.'],
  happy: ['Отличный день, {х}! Я бы так работал{|а} хоть всю жизнь.', 'Мне здесь нравится, {х}. Хорошая команда.'],
  trait: {
    clever: ['Я посчитал{|а}: если покупать воск оптом, сэкономим треть. Хотите расчёт, {х}?'],
    cheerful: ['Ха, {х}, знаете анекдот про гнома и бочку? Ладно, потом расскажу!'],
    stubborn: ['Я всё ещё думаю, что мой способ быстрее, {х}. Но вас я выслушал{|а}.'],
    lazy: ['Работать надо с умом, а не до упаду, {х}. Я так считаю.'],
    diligent: ['Я уже придумал{|а}, чем займусь завтра, {х}. Можно начать пораньше?'],
    gourmet: ['А правда, что в «Шёлковой ленте» новый пирог с черникой, {х}?'],
    sensitive: ['Спасибо, что спросили, {х}. Для меня это важно.'],
    loyal: ['Хорошо, что я нанял{ся|ась} именно к вам, {х}.'],
  },
};
const ASK16 = ['{Х}, можно начистоту? Работы стало больше, а жалованье прежнее. Может, обсудим прибавку?', 'Я подумываю, {х}: у Ставрака платят больше. Но мне у вас нравится. Может, найдём середину?', '{Х}, мне бы прибавки. Хотя бы немного — тогда я спокойно останусь.'];
function staffFx(c, icon, cls) { setTimeout(() => staffFxNow(c, icon, cls), 60); }
function staffFxNow(c, icon, cls) {
  try {
    const cp = document.querySelector(`.card-portrait[data-uid="${c.uid}"]`);
    if (cp) {
      const n = document.createElement('div'); n.className = 'fx16 ' + (cls || ''); n.innerHTML = Array.from({ length: 5 }, (_, i) => `<i style="--i:${i};--x:${(Math.random() * 60 - 30).toFixed(0)}px">${icon}</i>`).join('');
      cp.appendChild(n); setTimeout(() => n.remove(), 2200);
      cp.classList.remove('pulse16'); void cp.offsetWidth; cp.classList.add('pulse16'); setTimeout(() => cp.classList.remove('pulse16'), 900);
    }
    const row = document.querySelector(`.row-card[data-open="${c.uid}"]`);
    if (row) { row.classList.remove('pulse16'); void row.offsetWidth; row.classList.add('pulse16'); }
  } catch (e) { }
  try { if (Anim.enabled()) Anim.play(cls === 'calm' ? 'nod' : 'bounce'); } catch (e) { }
}
function qBump(c, k) {
  c.qc = c.qc || {}; c.qc[k] = (c.qc[k] || 0) + 1;
  const Q = c.q16; if (!Q || Q.done) return;
  const st = Q.steps.find(s => s.k === k && s.h < s.n); if (!st) return;
  st.h++;
  if (Q.steps.every(s => s.h >= s.n)) questDone(c);
  else setTimeout(() => toast(`✦ ${fn1(c)}: шаг к цели «${Q.t}» (${Q.steps.map(s => `${s.h}/${s.n}`).join(' · ')})`), 900);
}
function staffDo(uid, k) {
  const c = findOwned(uid); if (!c) return;
  if (c.status !== 'home' && k !== 'renew' && k !== 'quest') return toast('Сейчас на заказе — вернётся, тогда и поговорите.');
  let msg = '';
  switch (k) {
    case 'talk': {
      if (c.talkDay === S.day) return toast('Сегодня уже поговорили по душам — завтра будет о чём.');
      c.talkDay = S.day;
      c.aff = clamp((c.aff || 0) + (has(c, 'sensitive') ? 5 : 3)); stressGain(c, -6); c.moodMod += 4;
      if (c.quitWarn) c.quitWarn = Math.max(0, c.quitWarn - 1);
      const m = mood(c);
      if (!c.q16 && !(c.q16Next > S.day)) { questStart(c); msg = `${fn1(c)} делится планами: «${c.q16.t}». Доверие +3, стресс −6.`; react(c, 'smile', gx(c, c.q16.say)); }
      else if ((c.loyalty < 45 || m < 40) && !(c.askDay > S.day - 7) && R() < 0.6) { c.askDay = S.day; react(c, 'neutral', gx(c, pick(ASK16))); setTimeout(() => raiseModal(c), 700); msg = `${fn1(c)} заводит разговор о жалованье.`; }
      else {
        const pool = (c.fatigue >= 60 ? TALK16.tired : m < 40 ? TALK16.sad : m >= 72 ? TALK16.happy : TALK16.any).slice();
        for (const t of c.traits) if (TALK16.trait[t]) pool.push(...TALK16.trait[t]);
        react(c, m >= 45 ? 'smile' : 'neutral', gx(c, pick(pool)));
        msg = `Поговорили по душам с ${fn1(c)}: доверие +3, стресс −6, настроение +4.`;
      }
      staffFx(c, '💬', 'calm'); sfx('pop'); qBump(c, 'talk'); try { goalBump('talk'); goalBump('talk16'); } catch (e) { }
      break;
    }
    case 'bonus': {
      const cost = Math.max(20, wageOf(c) * 3);
      if (c.bonusDay > S.day - 3) return toast(`Премию ${fn1(c)} уже выдавали недавно — следующая с ${c.bonusDay + 3}-го дня.`);
      if (S.gold < cost) { sfx('bad'); return toast(`На премию нужно ${cost} мон.`); }
      S.gold -= cost; c.bonusDay = S.day; c.moodMod += 12; stressGain(c, -5); const v = loyaltyGain(c, 4);
      msg = `Премия ${cost} мон.: ${fn1(c)} доволен${g(c, '', 'а')}. Лояльность +${v}, настроение +12.`;
      react(c, 'smile', gx(c, pick(['Ого! Спасибо, {х}! Не ожидал{|а}.', 'Премия? Вот это по-честному, {х}. Спасибо!', 'Спасибо, {х}. Отложу на свою мечту.'])));
      staffFx(c, '🪙', 'gold'); sfx('coin'); qBump(c, 'bonus'); try { goalBump('bonus'); } catch (e) { }
      break;
    }
    case 'dayoff': {
      if (c.offDay > S.day - 3) return toast(`${fn1(c)} недавно отдыхал${g(c, '', 'а')} — следующий выходной с ${c.offDay + 3}-го дня.`);
      c.offDay = S.day; c.fatigue = clamp(c.fatigue - 25); stressGain(c, -15); c.moodMod += 8; loyaltyGain(c, 2);
      c.task = 'rest'; c.manualDay = S.day; c.auto = false;
      msg = `${fn1(c)} получил${g(c, '', 'а')} выходной: усталость −25, стресс −15, завтра отдыхает.`;
      react(c, 'smile', gx(c, pick(['Спасибо, {х}! Схожу к родным.', 'Выходной? Как кстати, {х}. Вернусь с новыми силами.', 'Наконец-то высплюсь. Спасибо, {х}!'])));
      staffFx(c, '🌿', 'calm'); sfx('sparkle'); qBump(c, 'dayoff'); try { goalBump('bonus'); } catch (e) { }
      break;
    }
    case 'train': {
      const cost = MASTER_COST + 30 * (c.rank || 0);
      if (c.masterDay > S.day - 4) return toast(`К мастеру можно снова с ${c.masterDay + 4}-го дня.`);
      if (S.gold < cost) { sfx('bad'); return toast(`Мастер берёт ${cost} мон.`); }
      const keys = STATS.map(s => s.key).filter(k2 => c.pot[k2] > c.stats[k2]);
      if (!keys.length) return toast(`${fn1(c)} уже достиг${g(c, '', 'ла')} потолка во всех навыках.`);
      const k2 = keys.includes(c.trainStat) ? c.trainStat : keys.sort((a, b) => (c.pot[b] - c.stats[b]) - (c.pot[a] - c.stats[a]))[0];
      const gain = Math.min(c.pot[k2] - c.stats[k2], rint(2, 3) + (has(c, 'clever') ? 1 : 0));
      S.gold -= cost; c.masterDay = S.day; c.stats[k2] += gain; fatigueGain(c, 8); c.moodMod += 3;
      msg = `${fn1(c)} провёл${g(c, '', 'а')} день у мастера: ${statName(k2)} +${gain} (−${cost} мон.).`;
      react(c, 'smile', gx(c, 'Мастер строгий, но толковый. Я многому научил{ся|ась}, {х}!'));
      staffFx(c, '🎓', 'gold'); sfx('sparkle'); qBump(c, 'train');
      break;
    }
    case 'promote': {
      const nx = STAFF_RANKS[(c.rank || 0) + 1]; if (!nx) return toast('Выше должности нет.');
      const why = promoteBlock(c); if (why) return toast(why);
      c.rank = (c.rank || 0) + 1; c.wage = Math.round(wageOf(c) * (1 + nx.wage - rankOf({ rank: c.rank - 1 }).wage));
      loyaltyGain(c, 6); c.moodMod += 15; c.aff = clamp((c.aff || 0) + 4);
      msg = `${fn1(c)} — теперь ${rankName(c).toLowerCase()}! Доход +${Math.round(nx.inc * 100)}%, жалованье ${wageOf(c)} мон./день.`;
      addLog(`${c.name} повышен${g(c, '', 'а')}: ${rankName(c)}.`);
      react(c, 'smile', gx(c, pick(['Не подведу, {х}! Спасибо за доверие.', 'Вот это да… Спасибо, {х}. Я справлюсь.'])));
      staffFx(c, '⭐', 'gold'); sfx('bell'); qBump(c, 'promote'); try { goalBump('promote'); } catch (e) { }
      break;
    }
    case 'renew': return renewModal(c);
    case 'quest': return questModal(c);
  }
  if (msg) toast(msg);
  save(); render();
}
function promoteBlock(c) {
  const nx = STAFF_RANKS[(c.rank || 0) + 1]; if (!nx) return 'Высшая должность.';
  if (daysWith(c) < nx.days) return `Нужно проработать ${nx.days} дн. (сейчас ${daysWith(c)}).`;
  if (c.loyalty < nx.loy) return `Нужна лояльность ${nx.loy}+ (сейчас ${Math.round(c.loyalty)}).`;
  if (sumStats(c) < 60 + 25 * (c.rank || 0)) return 'Пока не хватает опыта: подучите у мастера.';
  return '';
}
// act() из game.js: учитываем шаги личных целей
(function () {
  const oAct = window.act;
  window.act = function (uid, kind) {
    const c = findOwned(uid); const before = c ? JSON.stringify([c.praisedDay, c.giftDay]) : '';
    const r = oAct.apply(this, arguments);
    try { if (c && JSON.stringify([c.praisedDay, c.giftDay]) !== before) { qBump(c, kind); staffFx(c, kind === 'gift' ? '🎁' : '🌟', 'gold'); } } catch (e) { }
    return r;
  };
})();

function raiseModal(c) {
  const add = Math.max(2, Math.round(wageOf(c) * 0.15));
  showModal('Разговор о жалованье', `<p>${esc(fn1(c))} просит прибавку: <b>${wageOf(c)} → ${wageOf(c) + add}</b> мон. в день.</p><p class="small muted">Лояльность ${Math.round(c.loyalty)}, настроение ${mood(c)}. Отказ без объяснений обидит, а обещание придётся выполнить при продлении договора.</p>`, [
    { label: `Согласиться (+${add})`, cls: 'btn-primary', act: () => { c.wage = wageOf(c) + add; loyaltyGain(c, 6); c.moodMod += 8; c.quitWarn = 0; addLog(`${c.name}: жалованье повышено до ${c.wage} мон.`); toast(`${fn1(c)}: «Спасибо, что пошли навстречу». Лояльность +6.`); closeModal(); save(); render(); } },
    { label: 'Обещать вернуться к этому при продлении', act: () => { c.promised = 1; loyaltyGain(c, 1); toast(`${fn1(c)}: «Хорошо, {х}. Я запомню».`.replace('{х}', addr('{х}'))); closeModal(); save(); render(); } },
    { label: 'Отказать', act: () => { loyaltyGain(c, -4); c.moodMod -= 6; c.quitWarn = (c.quitWarn || 0) + 1; toast(`${fn1(c)} молча кивает. Видно, что недоволен${g(c, '', 'а')}.`); closeModal(); save(); render(); } }]);
}

// ---------- договор: продление и переговоры ----------
function renewAskWage(c) {
  const w = wageOf(c), m = mood(c);
  if (c.loyalty >= 70 && m >= 60 && !c.promised) return w;
  return Math.round(w * (1 + (m >= 60 ? 0.06 : 0.12) + (c.rarity || 0) * 0.02 + (c.promised ? 0.05 : 0)));
}
function renewChance(c, extra) { return clamp(0.25 + c.loyalty / 150 + (c.aff || 0) / 300 + (mood(c) - 50) / 200 + (extra || 0), 0.08, 0.92); }
function renewDone(c, wage, note) {
  c.wage = wage; c.contractEnd = S.day + CONTRACT_DAYS; c.renewAsk = null; c.promised = 0; c.quitWarn = 0;
  addLog(`${c.name}: договор продлён до дня ${c.contractEnd}, жалованье ${wage} мон.${note ? ' ' + note : ''}`);
  try { goalBump('renew'); } catch (e) { }
}
function renewModal(c) {
  if (!c.renewAsk) c.renewAsk = { wage: renewAskWage(c), day: S.day };
  const A = c.renewAsk, w = wageOf(c), p = renewChance(c), sign = Math.max(30, w * 5), p2 = renewChance(c, 0.3);
  showModal('Продление договора', `<p>Договор с <b>${esc(c.name)}</b> ${c.contractEnd <= S.day ? 'закончился' : 'скоро закончится'}. ${A.wage > w ? `${esc(fn1(c))} хочет <b>${A.wage}</b> мон. в день (сейчас ${w}).` : `${esc(fn1(c))} готов${g(c, '', 'а')} остаться на прежних условиях — ${w} мон. в день.`}</p>
    <p class="small muted">Лояльность ${Math.round(c.loyalty)} · настроение ${mood(c)} · доверие ${Math.round(c.aff || 0)}. ${A.firm ? 'Торг уже был — теперь только на условиях работника.' : ''}</p>`, [
    { label: `Продлить · ${A.wage}/день`, cls: 'btn-primary', act: () => { renewDone(c, A.wage); loyaltyGain(c, 3); toast(`${fn1(c)} остаётся! Договор до дня ${c.contractEnd}.`); staffFx(c, '📜', 'gold'); sfx('sparkle'); closeModal(); save(); render(); } },
    ...(A.wage > w && !A.firm ? [
      { label: `Предложить ${w} · шанс ${Math.round(p * 100)}%`, act: () => { closeModal(); if (R() < p) { renewDone(c, w); loyaltyGain(c, -1); toast(`${fn1(c)}: «Ладно, {х}, остаюсь на прежних».`.replace('{х}', addr('{х}'))); } else { A.firm = 1; loyaltyGain(c, -3); toast(`${fn1(c)} не согласен${g(c, '', 'на')}: «Мне нужно ${A.wage}».`); } save(); render(); } },
      { label: `${w} + премия ${sign} · шанс ${Math.round(p2 * 100)}%`, act: () => { if (S.gold < sign) return toast('Не хватает монет на премию.'); closeModal(); S.gold -= sign; if (R() < p2) { renewDone(c, w, `(премия при подписании ${sign})`); c.moodMod += 8; toast(`${fn1(c)} подписывает договор с премией.`); } else { A.firm = 1; S.gold += Math.round(sign / 2); toast(`${fn1(c)} берёт время подумать и просит всё же ${A.wage}. Половина премии вернулась.`); } save(); render(); } },
    ] : []),
    { label: 'Не продлевать', cls: 'act-bad', act: () => { closeModal(); confirmModal('Не продлевать договор?', `${esc(c.name)} уйдёт с доброй рекомендацией (без выходного пособия).`, 'Не продлевать', () => { staffLeave(c, `${c.name} закончил${g(c, '', 'а')} работу по договору и ушл${g(c, 'ёл', 'а')} с рекомендацией.`); S.rep += 1; save(); go('manor'); }); } },
    { label: 'Позже', act: 'close' }]);
}
function staffLeave(c, text) {
  for (const it of c.gear || []) S.stash.push(it); c.gear = [];
  S.owned = S.owned.filter(x => x !== c);
  addLog(text); toast(text);
}

// ---------- личные цели ----------
const QUESTS16 = [
  { id: 'home', t: 'Съездить к родным', d: 'Давно не был{|а} дома: нужна премия на гостинцы и выходной.', say: 'Я бы так хотел{|а} съездить к родным, {х}. Гостинцы, дорога… Может, поможете?', steps: [['bonus', 1], ['dayoff', 1]] },
  { id: 'tools', t: 'Свой инструмент', d: 'Копит на собственный набор инструментов.', say: 'Мечтаю о своём наборе инструментов, {х}. Тогда и работа пойдёт веселее.', steps: [['bonus', 2]], trait: 'diligent' },
  { id: 'master', t: 'Учёба у мастера', d: 'Хочет освоить ремесло всерьёз — у настоящего мастера.', say: '{Х}, а можно мне поучиться у мастера? Я хочу расти.', steps: [['train', 1], ['praise', 2]], trait: 'clever' },
  { id: 'read', t: 'Научиться читать', d: 'Стесняется, что плохо читает. Нужны разговоры и терпение.', say: 'Только никому, {х}… я плохо читаю. Поможете разобраться?', steps: [['talk', 3]], stat: 'int' },
  { id: 'fair', t: 'Выступить на ярмарке', d: 'Мечтает спеть или сыграть перед всем городом.', say: 'Говорят, на ярмарке можно выступить. Я бы рискнул{|а}, {х}, если поддержите.', steps: [['praise', 2], ['gift', 1]], trait: 'cheerful' },
  { id: 'garden', t: 'Свой огородик', d: 'Хочет грядку у работницкого дома — для души.', say: 'Можно мне маленькую грядку, {х}? Для души.', steps: [['talk', 2], ['bonus', 1]], trait: 'hardy' },
  { id: 'career', t: 'Признание мастерства', d: 'Хочет, чтобы опыт признали должностью.', say: 'Я давно здесь, {х}. Мне бы хотелось расти — может, однажды стану старшим?', steps: [['promote', 1]], trait: 'loyal', need: c => STAFF_RANKS[(c.rank || 0) + 1] },
];
function questStart(c) {
  const pool = QUESTS16.filter(q => (!q.need || q.need(c)) && !(c.qDone || []).includes(q.id));
  const q = pick(pool.length ? pool : QUESTS16);
  c.q16 = { id: q.id, t: q.t, d: gx(c, q.d), say: q.say, start: S.day, until: S.day + 12, steps: q.steps.map(([k, n]) => ({ k, n, h: 0 })) };
  return c.q16;
}
const QSTEP_N = { talk: 'поговорить по душам', bonus: 'выдать премию', dayoff: 'дать выходной', train: 'отправить к мастеру', praise: 'похвалить', gift: 'сделать подарок', promote: 'повысить в должности' };
function questDone(c) {
  const Q = c.q16, def = QUESTS16.find(q => q.id === Q.id) || {};
  Q.done = true; c.qDone = (c.qDone || []).concat(Q.id).slice(-10);
  loyaltyGain(c, 10); c.aff = clamp((c.aff || 0) + 8); c.moodMod += 15;
  let extra = '';
  if (def.trait && !c.traits.includes(def.trait) && c.traits.length < 4) { c.traits.push(def.trait); extra = `, новая черта «${TRAITS[def.trait].name}»`; }
  else { const k = def.stat || pick(STATS.map(s => s.key)); c.pot[k] = clamp(c.pot[k] + 4); c.stats[k] = Math.min(c.pot[k], c.stats[k] + 2); extra = `, ${statName(k)} +2`; }
  const t = `★ ${c.name}: цель «${Q.t}» достигнута! Лояльность +10, доверие +8${extra}.`;
  addLog(t); setTimeout(() => { toast(t); staffFx(c, '✨', 'gold'); sfx('bell'); }, 700);
  c.q16 = null; c.q16Next = S.day + 5;
  try { goalBump('quest'); } catch (e) { }
}
function questPanelHtml(c) {
  const Q = c.q16;
  if (!Q) return `<div class="panel parchment quest16"><div class="panel-title">Личная цель</div><div class="small muted">${c.q16Next > S.day ? `Недавно ${esc(fn1(c))} исполнил${g(c, '', 'а')} свою цель. Новые планы появятся позже.` : `Пока ${esc(fn1(c))} не делил${g(c, 'ся', 'ась')} планами — <b>поговорите по душам</b>.`}</div></div>`;
  const left = Q.until - S.day;
  return `<div class="panel parchment quest16"><div class="panel-title">Личная цель: ${esc(Q.t)}</div>
    <div class="small">${esc(Q.d)}</div>
    <div class="q-steps">${Q.steps.map(s => `<div class="q-step ${s.h >= s.n ? 'ok' : ''}"><span>${s.h >= s.n ? '✓' : '○'} ${QSTEP_N[s.k] || s.k}</span><b>${Math.min(s.h, s.n)}/${s.n}</b></div>`).join('')}</div>
    <div class="small muted">${left > 0 ? `Осталось ${dn(left)}.` : 'Последний день!'} Награда: лояльность +10, доверие +8 и новая черта или навык.</div></div>`;
}
function questModal(c) { showModal('Личная цель', questPanelHtml(c), [{ label: 'Хорошо', act: 'close' }]); }

// ---------- панели карточки ----------
function staffPanelHtml(c) {
  const busy = c.status !== 'home';
  const bc = Math.max(20, wageOf(c) * 3), mc = MASTER_COST + 30 * (c.rank || 0), nx = STAFF_RANKS[(c.rank || 0) + 1], pb = nx ? promoteBlock(c) : 'высшая должность';
  const btn = (k, icon, label, sub, dis) => `<button class="care-b" data-s16="${k}" data-uid="${c.uid}" ${busy || dis ? 'disabled' : ''}><i>${icon}</i><b>${label}</b><small>${sub}</small></button>`;
  const act = (k, icon, label, sub, dis) => `<button class="care-b" data-act="${k}" data-uid="${c.uid}" ${busy || dis ? 'disabled' : ''}><i>${icon}</i><b>${label}</b><small>${sub}</small></button>`;
  const fault = typeof hasFault === 'function' && hasFault(c);
  return `<div class="panel parchment care16"><div class="panel-title">Общение и забота</div>
    <div class="care-grid">
      ${btn('talk', '💬', 'Поговорить', c.talkDay === S.day ? 'сегодня уже' : 'доверие, стресс', c.talkDay === S.day)}
      ${act('praise', '🌟', 'Похвалить', c.praisedDay === S.day ? 'сегодня уже' : 'лояльность', c.praisedDay === S.day)}
      ${btn('bonus', '🪙', 'Премия', c.bonusDay > S.day - 3 ? `с ${c.bonusDay + 3}-го дня` : `${bc} мон.`, c.bonusDay > S.day - 3)}
      ${btn('dayoff', '🌿', 'Выходной', c.offDay > S.day - 3 ? `с ${c.offDay + 3}-го дня` : 'отдых завтра', c.offDay > S.day - 3)}
      ${act('gift', '🎁', 'Подарок', c.giftDay === S.day ? 'сегодня уже' : '60 мон.', c.giftDay === S.day)}
      ${btn('train', '🎓', 'К мастеру', c.masterDay > S.day - 4 ? `с ${c.masterDay + 4}-го дня` : `${mc} мон. · навык +2–3`, c.masterDay > S.day - 4)}
      ${btn('promote', '⭐', nx ? 'Повысить' : 'Должность', nx ? (pb ? esc(pb) : (c.g === 'f' ? nx.f : nx.n)) : 'высшая', !!pb)}
      ${act('scold', '📋', 'О работе', fault ? 'есть что обсудить' : 'без повода обидит', c.disciplineDay === S.day)}
      ${act('healer', '🩺', 'Лекарь', `${HEALER_COST} мон.`, c.health >= 100 && !c.sickDays)}
    </div>
    ${typeof deserveHtml === 'function' && fault ? deserveHtml(c) : ''}
  </div>`;
}
function contractPanelHtml(c, priceBox) {
  const left = (c.contractEnd || S.day) - S.day, warn = (c.quitWarn || 0) >= 1;
  return `<div class="panel parchment contract16"><div class="panel-title">Договор и должность</div>
    <div class="ct-grid">
      <div><small>Должность</small><b>${esc(rankName(c))}</b></div>
      <div><small>Жалованье</small><b>${wageOf(c)} мон./день</b></div>
      <div><small>У вас</small><b>${dn(daysWith(c))}</b></div>
      <div><small>Договор</small><b class="${left <= 2 ? 'neg' : ''}">${c.renewAsk || left <= 0 ? 'закончился' : 'ещё ' + dn(left)}</b></div>
    </div>
    ${warn ? `<div class="deserve yes">⚠ ${esc(fn1(c))} недоволен${g(c, '', 'а')} условиями и подумывает уйти. Помогут разговор, выходной, премия или прибавка.</div>` : ''}
    <div class="btn-row">
      <button class="btn ${c.renewAsk || left <= 2 ? 'btn-primary' : ''}" data-s16="renew" data-uid="${c.uid}">${c.renewAsk || left <= 0 ? 'Обсудить продление' : 'Продлить заранее'}</button>
      <button class="btn" data-sell="${c.uid}">Рекомендовать на новое место · +${fmt(sellPrice(c))}</button>
      <button class="btn act-bad" data-free="${c.uid}">Рассчитать</button>
    </div>
    <details class="why small"><summary>Ценность работника на бирже</summary>${priceBox || ''}</details>
  </div>`;
}

// ---------- цели хозяйства (на экране «Хозяйство») ----------
function staffGoalsHtml() {
  const items = [];
  for (const c of S.owned) {
    if (c.renewAsk || (c.contractEnd && c.contractEnd <= S.day)) items.push(`<button class="todo16 warn" data-s16="renew" data-uid="${c.uid}">📜 ${esc(fn1(c))}: договор закончился — обсудить</button>`);
    else if (c.contractEnd && c.contractEnd - S.day <= 2) items.push(`<button class="todo16" data-s16="renew" data-uid="${c.uid}">📜 ${esc(fn1(c))}: договор через ${dn(c.contractEnd - S.day)}</button>`);
    if ((c.quitWarn || 0) >= 1) items.push(`<button class="todo16 warn" data-open="${c.uid}">⚠ ${esc(fn1(c))} думает уйти — поговорите</button>`);
    if (c.q16 && !c.q16.done && c.q16.until - S.day <= 3) items.push(`<button class="todo16" data-open="${c.uid}">✦ ${esc(fn1(c))}: цель «${esc(c.q16.t)}» — ${dn(Math.max(0, c.q16.until - S.day))}</button>`);
    else if (!c.q16 && c.q16Day && c.q16Day <= S.day) items.push(`<button class="todo16" data-open="${c.uid}">💬 ${esc(fn1(c))} хочет чем-то поделиться</button>`);
    if (STAFF_RANKS[(c.rank || 0) + 1] && !promoteBlock(c)) items.push(`<button class="todo16 good" data-open="${c.uid}">⭐ ${esc(fn1(c))} готов${g(c, '', 'а')} к повышению</button>`);
  }
  if ((S.unpaid || 0) >= 1) items.unshift(`<div class="todo16 warn">💰 Жалованье выдавали в долг ${dn(S.unpaid)} подряд — артель волнуется</div>`);
  const fest = fest16Next();
  return `<div class="panel parchment goals16"><div class="panel-title">Дела управляющего</div>
    ${items.length ? `<div class="todo-l">${items.slice(0, 6).join('')}</div>` : '<div class="small muted">Все довольны, договоры в порядке. Загляните на биржу найма или в город.</div>'}
    <div class="small muted">${fest}</div></div>`;
}

// ---------- день: жалованье, договоры, недовольство, цели ----------
(function () {
  const oRF = window.rollFaults;
  window.rollFaults = function (lines) {
    const r = oRF.apply(this, arguments);
    try { staffDay(lines); } catch (e) { console.warn('staff16 day', e); }
    return r;
  };
})();
function staffDay(lines) {
  // жалованье уже списано в содержании; если касса ушла в минус — выдано из займа
  if (S.owned.length && S.gold < 0) {
    S.unpaid = (S.unpaid || 0) + 1;
    for (const c of S.owned) { c.moodMod -= 6; loyaltyGain(c, -2); }
    lines.push(`! Денег в кассе не хватило: жалованье выдано в долг у ростовщика (${S.unpaid}-й день подряд). Работники волнуются: настроение −6, лояльность −2.`);
    if (S.unpaid >= 3) {
      const c = S.owned.filter(x => x.status === 'home' && !x.unique).sort((a, b) => a.loyalty - b.loyalty)[0];
      if (c && c.loyalty < 60) { staffLeave(c, `${c.name} уволил${g(c, 'ся', 'ась')}: «Простите, {х}, мне нужно кормить семью». Снаряжение вернулось в сундук.`.replace('{х}', addr('{х}'))); lines.push(`! ${c.name} уволил${g(c, 'ся', 'ась')} из-за задержек жалованья.`); S.unpaid = 1; }
    }
  } else S.unpaid = 0;
  for (const c of S.owned.slice()) {
    if (c.wage == null) staffInit(c);
    if (c.status !== 'home') continue;
    // договор
    if (c.contractEnd && c.contractEnd <= S.day && !c.renewAsk) { c.renewAsk = { wage: renewAskWage(c), day: S.day }; lines.push(`📜 ${fn1(c)}: договор закончился. ${c.renewAsk.wage > wageOf(c) ? `Просит ${c.renewAsk.wage} мон. в день.` : 'Готов' + g(c, '', 'а') + ' продлить на прежних условиях.'} Обсудите в карточке.`); }
    else if (c.renewAsk && S.day - c.renewAsk.day >= 2) {
      if (c.loyalty >= 45) { renewDone(c, c.renewAsk.wage, '(сам' + g(c, '', 'а') + ', не дождавшись разговора)'); lines.push(`📜 ${fn1(c)} не дождал${g(c, 'ся', 'ась')} разговора и продлил${g(c, '', 'а')} договор на своих условиях: ${wageOf(c)} мон./день.`); }
      else { staffLeave(c, `${c.name} не дождал${g(c, 'ся', 'ась')} продления договора и ушл${g(c, 'ёл', 'а')} к другому нанимателю.`); lines.push(`! ${c.name} ушл${g(c, 'ёл', 'а')}: договор так и не продлили.`); continue; }
    }
    // недовольство
    const m = mood(c);
    if ((m < 30 && c.loyalty < 35) || c.loyalty < 15) {
      c.quitWarn = (c.quitWarn || 0) + 1;
      if (c.quitWarn === 1) lines.push(`! ${fn1(c)} недоволен${g(c, '', 'а')} и подумывает уйти. Поговорите, дайте выходной или премию.`);
      if (c.quitWarn >= 4 && !c.unique) { staffLeave(c, `${c.name} уволил${g(c, 'ся', 'ась')} по собственному желанию. Снаряжение вернулось в сундук.`); lines.push(`! ${c.name} уволил${g(c, 'ся', 'ась')}: условия так и не стали лучше.`); continue; }
    } else if (c.quitWarn) c.quitWarn = Math.max(0, c.quitWarn - (m >= 55 ? 2 : 1));
    // личная цель
    if (c.q16 && !c.q16.done && c.q16.until <= S.day) { c.moodMod -= 6; lines.push(`${fn1(c)} отложил${g(c, '', 'а')} мечту «${c.q16.t}» — не сложилось. Настроение −6.`); c.q16 = null; c.q16Next = S.day + 4; }
    else if (!c.q16 && c.q16Day && c.q16Day <= S.day && R() < 0.5 && daysWith(c) >= 2) { questStart(c); c.q16Day = 0; lines.push(`✦ ${fn1(c)} поделил${g(c, 'ся', 'ась')} мечтой: «${c.q16.t}». Подробности — в карточке.`); }
    else if (!c.q16 && !c.q16Day && !(c.q16Next > S.day) && R() < 0.08) c.q16Day = S.day + 1;
  }
}

// ---------- сезонные праздники ----------
const FEST16 = {
  'Весна': { id: 'fest_spring', t: 'Праздник первой борозды', d: 'Соседи зовут всю артель на праздник первой борозды: хоровод, блины и состязание пахарей. Говорят, победителю — бочонок мёда и слава на весь Лог.' },
  'Лето': { id: 'fest_summer', t: 'Ночь светлячков', d: 'У реки ярмарка до рассвета: фонарики, песни, лодки со свечами. Лучшее время показать себя — и отдохнуть.' },
  'Осень': { id: 'fest_autumn', t: 'Праздник урожая и мёда', d: 'Медовый Лог празднует урожай: общие столы на площади, конкурс пирогов и танцы.' },
  'Зима': { id: 'fest_winter', t: 'Зимние гуляния', d: 'Снежная крепость на площади, горячий сбитень и сани с бубенцами. Вся артель смотрит на вас с надеждой.' },
};
function festKey() { return Math.floor((S.day - 1) / 7); }
function fest16Next() {
  const f = FEST16[season().name], left = seasonLeft();
  if ((S.fest16 || {})[festKey()]) return `🎉 «${f.t}» уже отпраздновали. Следующий праздник — в новом сезоне.`;
  return left >= 3 ? `🎉 Скоро «${f.t}» — ближе к середине сезона.` : `🎉 «${f.t}» вот-вот наступит.`;
}
(function () {
  if (typeof XEV === 'undefined') return;
  const done = () => { S.fest16 = S.fest16 || {}; S.fest16[festKey()] = S.day; };
  const all = (fn) => { for (const c of xHome()) fn(c); };
  const best = (k) => xHome().slice().sort((a, b) => eff(b, k) - eff(a, k))[0];
  for (const [sn, F] of Object.entries(FEST16)) {
    const ch = sn === 'Весна' ? [
      { l: 'Пойти всей артелью, угощение за счёт хозяйства (−80 мон.)', ok: () => xCan(80), go: (x, e) => { done(); e.gold(-80); all(c => { e.mood(c, 10); e.stress(c, -10); }); e.rep(1); return 'Блины, хоровод и смех до темноты. Артель вернулась счастливой.'; } },
      { l: () => { const c = best('str'); return `Выставить пахаря: ${c ? fn1(c) : '—'} (Сила)`; }, ok: () => xHome().length ? true : 'нет работников', go: (x, e) => { done(); const c = best('str'); if (R() < 0.25 + eff(c, 'str') / 80) { e.gold(150); e.rep(2); e.loy(c, 5); e.mood(c, 12); return `${fn1(c)} провёл${g(c, '', 'а')} самую ровную борозду! Бочонок мёда продали за 150 мон.`; } e.mood(c, 4); return `${fn1(c)} ${g(c, 'пришёл', 'пришла')} вторым — зато все хлопали.`; } },
      { l: 'Работа прежде всего', go: (x, e) => { done(); all(c => e.mood(c, -4)); return 'Артель вздыхает и работает, слушая музыку издалека.'; } }]
      : sn === 'Лето' ? [
      { l: 'Поставить прилавок с медовым квасом', go: (x, e) => { done(); const v = rint(120, 220) + 20 * xHome().length; e.gold(v); all(c => e.fat(c, 6)); return 'Квас разлетелся к полуночи. Устали, но довольны.'; } },
      { l: 'Отпустить всех на праздник', go: (x, e) => { done(); all(c => { e.mood(c, 12); e.stress(c, -12); e.loy(c, 2); }); return 'Фонарики на воде, песни у костра. Утром все улыбаются.'; } },
      { l: 'Пропустить', go: (x, e) => { done(); return 'Праздник прошёл стороной.'; } }]
      : sn === 'Осень' ? [
      { l: 'Общий стол для артели (−120 мон.)', ok: () => xCan(120), go: (x, e) => { done(); e.gold(-120); all(c => { e.mood(c, 12); e.loy(c, 3); }); e.rep(1); return 'Пироги, мёд, тосты за хороший год. Артель чувствует себя командой.'; } },
      { l: () => { const c = best('mas'); return `Конкурс пирогов: ${c ? fn1(c) : '—'} (Мастерство)`; }, ok: () => xHome().length ? true : 'нет работников', go: (x, e) => { done(); const c = best('mas'); if (R() < 0.3 + eff(c, 'mas') / 90) { e.gold(200); e.rep(2); e.loy(c, 5); e.mood(c, 12); return `Пирог ${fn1(c)} признан лучшим в Логе! Приз — 200 мон.`; } e.mood(c, 3); return 'Пирог хвалили, но первое место ушло к пекарне Ставрака.'; } },
      { l: 'Пропустить', go: (x, e) => { done(); all(c => e.mood(c, -3)); return 'Работаем, пока другие пляшут.'; } }]
      : [
      { l: () => `Подарки всем (−${25 * Math.max(1, xHome().length)} мон.)`, ok: () => xCan(25 * Math.max(1, xHome().length)), go: (x, e) => { done(); e.gold(-25 * Math.max(1, xHome().length)); all(c => { e.mood(c, 10); e.loy(c, 4); e.aff(c, 5); }); return 'Варежки, пряники и тёплые слова каждому. Зима стала теплее.'; } },
      { l: 'Снежная крепость и горячий сбитень (−40 мон.)', ok: () => xCan(40), go: (x, e) => { done(); e.gold(-40); all(c => { e.stress(c, -12); e.mood(c, 6); }); return 'Штурм крепости закончился ничьей и всеобщим хохотом.'; } },
      { l: 'Пропустить', go: (x, e) => { done(); all(c => e.mood(c, -4)); return 'Окна светятся у соседей. У вас — тихо.'; } }];
    XEV.push({ id: F.id, w: 40, when: 'night', cond: () => season().name === sn && seasonLeft() <= 5 && !(S.fest16 || {})[festKey()] && xHome().length > 0, title: '🎉 ' + F.t, text: F.d, ch });
  }
})();

// ---------- цели дня ----------
try {
  GOAL_POOL.push(['talk16', 'Поговорить с работником по душам', 2, 50, 0], ['quest', 'Помочь работнику с личной целью', 1, 120, 1, () => S.owned.some(c => c.q16)], ['promote', 'Повысить кого-нибудь', 1, 150, 1, () => S.owned.some(c => STAFF_RANKS[(c.rank || 0) + 1] && !promoteBlock(c))], ['renew', 'Продлить договор', 1, 80, 0, () => S.owned.some(c => c.renewAsk || c.contractEnd - S.day <= 2)]);
  MILESTONES.push(['rank1', 'Первое повышение в артели', () => S.owned.some(c => c.rank >= 1), 400, 2], ['q3', 'Три исполненные мечты работников', () => S.owned.reduce((a, c) => a + (c.qDone || []).length, 0) >= 3, 900, 3], ['master', 'Мастер артели', () => S.owned.some(c => c.rank >= 3), 1500, 4]);
} catch (e) { }

// ---------- клики ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-s16]');
  if (t) { if (t.disabled) return; e.preventDefault(); e.stopPropagation(); return staffDo(t.dataset.uid, t.dataset.s16); }
  // нажатие на портрет — короткая реплика
  const p = e.target.closest('.card-portrait .art-box, .card-portrait .portrait');
  if (p && !e.target.closest('button')) {
    const cp = p.closest('.card-portrait'); const c = cp && findAny(cp.dataset.uid); if (!c) return;
    if (cp._t16 && Date.now() - cp._t16 < 1200) return; cp._t16 = Date.now();
    react(c, mood(c) >= 45 ? 'smile' : 'neutral', greetLine(c)); try { if (Anim.enabled()) Anim.play('nod'); sfx('pop'); } catch (er) { }
  }
}, true);

// ---------- перенос сохранений (v4 → v5) ----------
const SAVE_VER16 = 5;
function s16Refund(it) { return [40, 80, 160, 320, 480][it && it.q || 0] || 40; }
function s16CleanChar(c, refund) {
  if (!c) return;
  for (const k of ['preg', 'breed', 'orient', 'heatOff', 'heatCare', 'touch', 'marks', 'pun', 'crave', 'closeDay', 'petDay', 'petN', 'mateDay', 'herbal', 'parents', 'memTouch', 'memPun', 'birthDay']) delete c[k];
  if (c.growth) c.growth = 0;
  if ((c.age || 0) < 18) c.age = 18;
  delete c.bio;
  const rm = (it) => it && ((it.kind === 'outfit' && S16_REMOVED.outfit.includes(it.base)) || (it.kind === 'acc' && S16_REMOVED.acc.includes(it.base)));
  if (Array.isArray(c.gear)) { for (const it of c.gear) if (rm(it)) refund.v += s16Refund(it); c.gear = c.gear.filter(it => !rm(it)); }
  if (Array.isArray(c.acc)) c.acc = c.acc.filter(a => !S16_REMOVED.acc.includes(a.id));
  if (S16_REMOVED.outfit.includes(c.outfit)) c.outfit = null;
  if (Array.isArray(c.mem)) c.mem = c.mem.filter(m => !S16_BAD.test(m.t || ''));
  if (Array.isArray(c.agr)) c.agr = c.agr.filter(a => !S16_BAD.test((a.t || '') + ' ' + (a.g || '')));
  if (Array.isArray(c.pfacts)) c.pfacts = c.pfacts.filter(f => !S16_BAD.test(f.t || ''));
  if (c.wish && S16_BAD.test(c.wish.t || '')) c.wish = null;
}
(function () {
  const oMig = window.migrate;
  window.migrate = function () {
    let refund = { v: 0 }, conv = false;
    try {
      if (!S.v || S.v < SAVE_VER16) {
        conv = true;
        const est = S.est || {}, auc = S.auc || {};
        const chars = (S.owned || []).concat(S.market || [], est.stable || [], (auc.lots || []).map(l => l.ch).filter(Boolean));
        for (const c of chars) s16CleanChar(c, refund);
        const rm = (it) => it && ((it.kind === 'outfit' && S16_REMOVED.outfit.includes(it.base)) || (it.kind === 'acc' && S16_REMOVED.acc.includes(it.base)));
        if (Array.isArray(S.stash)) { for (const it of S.stash) if (rm(it)) refund.v += s16Refund(it); S.stash = S.stash.filter(it => !rm(it)); }
        if (Array.isArray(S.gearShop)) S.gearShop = S.gearShop.filter(it => !rm(it));
        if (Array.isArray(auc.lots)) auc.lots = auc.lots.filter(l => !rm(l.it));
        if (Array.isArray(auc.sell)) { for (const l of auc.sell) if (l.k === 'gear' && rm(l.it)) refund.v += s16Refund(l.it); auc.sell = auc.sell.filter(l => l.k !== 'slave' && !(l.k === 'gear' && rm(l.it))); }
        S.births = [];
        delete S.liisOffer;
        S.gold = (S.gold || 0) + refund.v;
      }
    } catch (e) { console.warn('v16 migrate pre', e); }
    const r = oMig.apply(this, arguments);
    try {
      for (const c of S.owned) {
        if (c.wage == null) staffInit(c, 0, { hiredDay: S.day - 7, left: rint(4, CONTRACT_DAYS) });
        if (conv && !(c.gear || []).some(i => i.kind === 'outfit')) { const it = makeGear('outfit', 'peasant', 0); c.gear.push(it); syncLook(c); }
      }
      if (conv) {
        S.v = SAVE_VER16; S._migrated = 1; S.unpaid = 0;
        S._v16note = refund.v;
        addLog(`Хозяйство переведено на наёмный уклад (версия ${GAME_VER}): у всех работников теперь жалованье и договор${refund.v ? `; снятые с продажи вещи возмещены: +${fmt(refund.v)} мон.` : ''}.`);
        try { // старые чаты: убрать реплики из прежней версии
          const K = (typeof AI !== 'undefined' && AI.CHAT_K) || null;
          if (K) for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (!key || key.indexOf(K) !== 0) continue; try { const ch = JSON.parse(localStorage.getItem(key) || '{}'); ch.msgs = (ch.msgs || []).filter(m => !S16_BAD.test(m.t || '')); if (S16_BAD.test(ch.sum || '')) ch.sum = ''; localStorage.setItem(key, JSON.stringify(ch)); } catch (er) { } }
        } catch (er) { }
      }
    } catch (e) { console.warn('v16 migrate post', e); }
    return r;
  };
  const oNew = window.newGame;
  window.newGame = function () {
    const r = oNew.apply(this, arguments);
    try { S.v = SAVE_VER16; for (const c of S.owned) { staffInit(c, 0); c.hiredDay = S.day; c.contractEnd = S.day + CONTRACT_DAYS; c.q16Day = 2; } addLog('Совет: загляните в «Дела управляющего» — там договоры, мечты работников и праздники.'); save(); } catch (e) { console.warn('v16 new', e); }
    return r;
  };
  // версия в меню
  const oMenu = window.menuModal;
  window.menuModal = function () {
    const r = oMenu.apply(this, arguments);
    try { const s = document.querySelector('#modal .settings'); if (s && !document.getElementById('ver16')) s.insertAdjacentHTML('afterend', `<p class="small muted" id="ver16">Версия ${GAME_VER} · наёмная артель, жалованье и договоры</p>`); } catch (e) { }
    return r;
  };
})();

// ---------- справка ----------
try {
  HELP.push(['staff16', 'Должности, цели и праздники (v16)', () => `<p><b>Должности:</b> ${STAFF_RANKS.slice(1).map(r => `${r.n} — после ${r.days} дн. и при лояльности ${r.loy}+ (доход +${Math.round(r.inc * 100)}%)`).join('; ')}. Жалованье растёт вместе с должностью.</p>
    <p><b>Личные цели:</b> поговорите с работником по душам — он расскажет, о чём мечтает. Шаги цели — премия, выходной, похвала, учёба у мастера или повышение. Исполненная мечта даёт лояльность, доверие и новую черту.</p>
    <p><b>Договор</b> длится ${CONTRACT_DAYS} дней. В конце работник предложит продлить — иногда с прибавкой. Можно торговаться, предложить премию при подписании или расстаться. Если не ответить два дня — преданные продлят сами, остальные уйдут.</p>
    <p><b>Праздники:</b> раз в сезон — праздник первой борозды, ночь светлячков, праздник урожая и зимние гуляния. Решайте: отпустить артель, заработать на ярмарке или выставить своего чемпиона.</p>`]);
} catch (e) { }

// risk14: причина забастовки — задержка жалованья
function unpaidDays() { return S.unpaid || 0; }
