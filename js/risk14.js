// v14.1 — давление и риск: банк гильдии (займы), ревизии, налог, хвори, ропот и бунт, кражи, козни Ставрака, сложность, мягкое банкротство.
const DIFF14 = { easy: { n: 'Уютная', m: 0.65, d: 'риски реже и мягче' }, norm: { n: 'Обычная', m: 1, d: 'как задумано' }, hard: { n: 'Суровая', m: 1.4, d: 'чаще ревизии, кражи и козни, выше налог' } };
function rkOf() {
  const C = carOf();
  if (!C.rk) C.rk = { loans: [], insp: null, unrest: 0, out: null, bk: 0, restr: 0, chest: 0, prep: 0, tax: 0, pend: null, hist: [] };
  const K = C.rk; K.loans = K.loans || []; K.hist = K.hist || [];
  if (!K.insp && S.day) K.insp = { day: S.day + 14 };
  return K;
}
// множитель риска: сложность × рост со званием
const rkM = () => (DIFF14[carOf().diff] || DIFF14.norm).m * (1 + 0.1 * carOf().stage);
const rkOn = () => S.day - (carOf().start || 1) >= 8 || carOf().stage >= 1;
function loanOwed() { try { return Math.round(rkOf().loans.reduce((a, l) => a + l.left, 0)); } catch (e) { return 0; } }
const LOANS14 = [
  { id: 'l1', n: 'Малый заём', sum: 2000, wk: 2, r: 0.08, st: 2 },
  { id: 'l2', n: 'Купеческий заём', sum: 5000, wk: 4, r: 0.14, st: 2 },
  { id: 'l3', n: 'Большой заём', sum: 10000, wk: 6, r: 0.22, st: 3 },
];
function loanTake(id) {
  const L = LOANS14.find(x => x.id === id), K = rkOf();
  if (!hasUnlock('loan')) return toast('Банк гильдии открыт только для членов гильдии.');
  if (carOf().stage < L.st) return toast('Такой заём — со звания «' + CSTAGES[L.st].n + '».');
  if (K.loans.length >= 2) return toast('Больше двух займов банк не даёт.');
  const tot = Math.round(L.sum * (1 + L.r)), inst = Math.ceil(tot / L.wk);
  K.loans.push({ id, n: L.n, left: tot, inst, next: S.day + 7, miss: 0, from: S.day });
  S.gold += L.sum; sfx('coin'); addLog(`Заём в банке гильдии: +${fmt(L.sum)} мон., вернуть ${fmt(tot)} за ${L.wk} нед.`); cLog(`Заём ${fmt(L.sum)}`);
  toast(`+${fmt(L.sum)} мон. Платёж ${fmt(inst)} раз в неделю.`); save(); render(); riskModal();
}
function loanRepay(i) {
  const K = rkOf(), l = K.loans[i]; if (!l) return;
  if (S.gold < l.left) return toast(`Нужно ${fmt(l.left)} мон.`);
  S.gold -= l.left; K.loans.splice(i, 1); sfx('coin'); toast('Заём погашен досрочно. Банкир даже улыбнулся.'); cLog('Заём погашен'); save(); render(); riskModal();
}
// ---------- ревизия ----------
function inspIssues() {
  const is = [], hs = S.owned.filter(c => c.status !== 'gone');
  if ((S.debt || 0) > debtLimit()) is.push(['долг ростовщику больше лимита', 2]);
  if (rkOf().loans.some(l => l.miss)) is.push(['просрочен платёж по займу', 2]);
  if (hs.length && avgMood() < 40) is.push(['жители несчастны (настроение < 40)', 1]);
  const disc = hs.length ? hs.reduce((a, c) => a + (c.discipline || 0), 0) / hs.length : 50;
  if (hs.length >= 3 && disc < 25) is.push(['в доме беспорядок (дисциплина < 25)', 1]);
  const sick = hs.filter(c => c.sickDays > 0 || c.health < 30).length;
  if (sick >= 2) is.push([`${sick} больных без присмотра`, 1]);
  if (hs.length > S.capacity) is.push(['тесно: жителей больше, чем мест', 1]);
  return is;
}
function inspRun(L) {
  const K = rkOf(), C = carOf(), is = inspIssues();
  let fine = 0, pts = is.reduce((a, x) => a + x[1], 0);
  if (K.prep) { pts = Math.max(0, pts - 1); K.prep = 0; }
  let mult = rkM() * (cFl('exam_strict') ? 1.5 : 1) * (cFl('exam_warm') ? 0.7 : 1);
  if (cFl('exam_bribe') && R() < 0.25) { pts += 2; L.push('! Ревизор нашёл в книгах ту самую «чернильную» запись. Госпожа Бук очень недовольна.'); }
  if (!pts) { S.rep += 2; L.push(`★ Ревизия гильдии: ${EXAM.n} ставит аккуратную галочку. Нарушений нет — репутация +2.`); cPath('t', 1); }
  else { fine = Math.round(120 * pts * (1 + C.stage * 0.5) * mult); S.gold -= fine; S.rep = Math.max(0, S.rep - pts); L.push(`! Ревизия гильдии: ${is.map(x => x[0]).join('; ') || 'мелкие придирки'}. Штраф ${fmt(fine)} мон., репутация −${pts}.`); }
  K.hist.push({ d: S.day, pts, fine }); K.hist = K.hist.slice(-10);
  K.insp = { day: S.day + Math.round(rint(11, 15) / Math.min(1.3, rkM())) };
  cLog(pts ? `Ревизия: штраф ${fmt(fine)}` : 'Ревизия без замечаний');
}
function inspPrep() {
  const K = rkOf(), cost = 80 + 40 * carOf().stage;
  if (K.prep) return toast('Уже готовитесь.');
  if (S.gold < cost) return toast(`Нужно ${cost} мон.`);
  S.gold -= cost; K.prep = 1;
  for (const c of S.owned) c.discipline = clamp((c.discipline || 0) + 8);
  toast('Книги переписаны набело, полы натёрты. Одно замечание ревизор не заметит.'); save(); render(); riskModal();
}
// ---------- налог гильдии ----------
function taxDue() { try { const lvls = bList().reduce((a, [, b]) => a + b.lv, 0), guild = 40 * lvSum('brothel') + 60 * mktLv(); return Math.round((Math.max(0, S.gold - 1500) * 0.04 + lvls * 12 + guild) * (hasUnlock('council') ? 0.75 : 1)); } catch (e) { return 0; } }
// ---------- хвори ----------
function outbreakCure() {
  const K = rkOf(), cost = 120 + 30 * S.owned.length;
  if (!K.out) return;
  if (S.gold < cost) return toast(`Лекарь берёт ${cost} мон.`);
  S.gold -= cost; K.out.cured = 1; for (const c of S.owned) if (c.sickDays > 0) { c.sickDays = Math.max(0, c.sickDays - 1); c.health = clamp(c.health + 10); }
  toast('Лекарь окурил дом можжевельником и раздал отвары. Заражаться почти перестали.'); save(); render(); riskModal();
}
// ---------- сундук ----------
function chestBuy() {
  const K = rkOf(), cost = K.chest ? 900 : 350;
  if (K.chest >= 2) return;
  if (S.gold < cost) return toast(`Нужно ${cost} мон.`);
  S.gold -= cost; K.chest++; toast(K.chest === 1 ? 'Окованный сундук с гномьим замком. Воры будут уходить ни с чем чаще.' : 'Сундук с секретом и колокольчиком. Теперь украсть почти невозможно.'); save(); render(); riskModal();
}
function theftChance() { const K = rkOf(); let p = 0.035 * rkM(); try { if (lvSum('guard')) p *= 0.45; } catch (e) { } p *= [1, 0.5, 0.2][K.chest || 0]; if (cFl('rv_caught')) p *= 0.7; return p; }
// риск-сцена важнее обычного бытового события, но не перебивает сюжет и другие риски
function rkFree() { if (!S.xev) return true; const e = XEV.find(z => z.id === S.xev.id); return !(e && (e.risk || e.story)); }
// ---------- ропот ----------
function unrestCause() {
  const hs = S.owned.filter(c => c.status !== 'gone'); if (hs.length < 4) return null;
  const m = avgMood(), d = hs.reduce((a, c) => a + (c.discipline || 0), 0) / hs.length;
  return m < 36 ? `настроение ${m}` : d < 18 ? `дисциплина ${Math.round(d)}` : null;
}
// ---------- события ----------
const RK_EV = [
  { id: 'rk_bunt', bg: 'bg06', title: 'Заботы · Бунт в поместье', text: () => `Утром жители не вышли на работу. На крыльце — делегация с самодельным плакатом «Мы тоже люди (и не только)». Причина: ${esc(rkOf().pend && rkOf().pend.why || 'всё накопилось')}. Требования скромные: отдых, нормальный ужин и чтобы вы хоть раз сказали «спасибо».`,
    ch: [{ l: 'Устроить выходной и пир (−' + '20% кассы, до 600)', go: (x, e) => { const v = Math.min(600, Math.round(S.gold * 0.2)); e.gold(-v); for (const c of S.owned) { c.moodMod = (c.moodMod || 0) + 18; c.fatigue = clamp(c.fatigue - 25); c.stress = clamp(c.stress - 15); } cPath('p', 2); rkOf().unrest = 0; return 'Пирог размером с телегу и песни до полуночи. К утру плакат пошёл на растопку, а настроение — вверх.'; } },
      { l: 'Поговорить с каждым по душам', go: (x, e) => { for (const c of S.owned) { c.moodMod = (c.moodMod || 0) + 8; loyaltyGain(c, 2); } rkOf().unrest = 1; cPath('p', 1); return 'Вы обходите всех, слушаете и кое-что записываете. Это помогает — но обещания придётся выполнять.'; } },
      { l: 'Строго: работа есть работа', go: (x, e) => { for (const c of S.owned) { c.discipline = clamp((c.discipline || 0) + 25); loyaltyGain(c, -6); c.stress = clamp(c.stress + 12); } e.rep(-2); cPath('s', 2); rkOf().unrest = 2; return 'Все расходятся по местам. Тихо. Слишком тихо. Соседи шепчутся, а Ставрак, кажется, записывает.'; } }] },
  { id: 'rk_cred', bg: 'bg04', title: 'Заботы · Коллектор гильдии', text: () => { const l = rkOf().loans.find(z => z.miss) || {}; return `К вам вежливо, но неотвратимо входит коллектор банка гильдии — тролль в очках. «Платёж ${fmt(l.inst || 0)} мон. просрочен (${l.miss || 1} раз). Банк ценит ваше обаяние, но предпочитает монеты».`; },
    ch: [{ l: () => { const l = rkOf().loans.find(z => z.miss) || {}; return `Заплатить сейчас с пеней (${fmt(Math.round((l.inst || 0) * 1.1))})`; }, ok: () => { const l = rkOf().loans.find(z => z.miss); return !l || xCan(Math.round(l.inst * 1.1)); }, go: (x, e) => { const l = rkOf().loans.find(z => z.miss); if (l) { const v = Math.round(l.inst * 1.1); e.gold(-v); l.left = Math.max(0, l.left - l.inst); l.miss = 0; if (l.left <= 0) rkOf().loans.splice(rkOf().loans.indexOf(l), 1); } return 'Тролль пересчитывает монеты дважды, кивает и уходит. Дверной косяк почти не пострадал.'; } },
      { l: 'Заложить доход построек (−40% на 10 дней)', go: (x, e) => { cSetFl('pledge', S.day + 10); const l = rkOf().loans.find(z => z.miss); if (l) { l.left = Math.max(0, l.left - l.inst); l.miss = 0; } return 'Банк будет забирать часть выручки построек десять дней. Неприятно, но долг не растёт.'; } },
      { l: 'Просить отсрочку у госпожи Бук', ok: () => cFl('exam_warm') || cFl('exam_honest') ? true : 'нужна её симпатия', go: (x, e) => { e.rep(-2); const l = rkOf().loans.find(z => z.miss); if (l) { l.next = S.day + 5; l.miss = 0; } return 'Ортензия вздыхает: «Пять дней. И это не дружба — это бухгалтерия». Но подмигивает.'; } },
      { l: 'Развести руками', go: (x, e) => { e.rep(-3); const l = rkOf().loans.find(z => z.miss); if (l) { l.left = Math.round(l.left * 1.05); l.miss++; } return 'Тролль записывает что-то в книжечку. Долг вырос на пеню, а репутация — наоборот.'; } }] },
  { id: 'rk_rumor', bg: 'bg02', title: 'Заботы · Слухи от Ставрака', text: () => `В таверне шепчутся, будто у вас в лавке «весы с хитростью», а мёд — «из сахара и надежды». Источник слухов носит бархатный жилет и называет всех «душенька».`,
    ch: [{ l: 'Публично взвесить товар при свидетелях (120 мон.)', ok: () => xCan(120), go: (x, e) => { e.gold(-120); e.rep(1); rvHeat(-10); return 'Весы честные, мёд настоящий, свидетели довольны и слегка липкие. Слух умер, не родившись.'; } },
      { l: 'Ответить слухом на слух', go: (x, e) => { cPath('s', 2); rvHeat(15); rvScheme('rumor', 2, 'распускает слухи'); return 'Теперь весь город уверен, что у Ставрака в подвале живёт обиженная гусыня. Война слухов — это навсегда.'; } },
      { l: 'Не обращать внимания', go: (x, e) => { rvScheme('rumor', 4, 'распускает слухи'); return 'Вы выше этого. Покупатели — не всегда. Несколько дней репутация будет подтаивать.'; } }] },
];
try { for (const e of RK_EV) XEV.push(Object.assign({ w: 0, when: 'night', cond: () => false, cs: true, risk: true }, e)); } catch (e) { }

// ---------- предупреждения ----------
function riskWarnings() {
  if (!S.car || !rkOn()) return [];
  const K = rkOf(), C = carOf(), w = [];
  if (C.stage >= 1 && K.insp) { const dd = K.insp.day - S.day; if (dd <= 3) w.push(`⚖ Ревизия гильдии ${dd <= 0 ? 'завтра утром' : 'через ' + dn(dd)}. Нарушений сейчас: ${inspIssues().length}${K.prep ? ' (готовы)' : ''}.`); }
  for (const l of K.loans) { const dd = l.next - S.day; if (dd <= 2 || l.miss) w.push(`🏦 ${l.n}: платёж ${fmt(l.inst)} мон. ${l.miss ? 'ПРОСРОЧЕН' : dd <= 0 ? 'сегодня вечером' : 'через ' + dn(dd)}${S.gold < l.inst ? ' — в кассе не хватает!' : ''}.`); }
  if (S.day % 7 === 0) { const t = taxDue(); if (t > 150) w.push(`🪙 Сегодня вечером недельный сбор гильдии: ≈${fmt(t)} мон. (4% кассы сверх 1 500 + за постройки).`); }
  if (K.out && !K.out.cured) w.push(`🤧 В доме простуда ещё ${dn(K.out.until - S.day + 1)}. Лекарь уймёт заразу.`);
  else if (K.out0) w.push('🤧 В городе кашляют — в доме может начаться простуда. Купальни и здоровье помогают.');
  if (K.unrest >= 2) w.push(`✊ ${K.unrest >= 3 ? 'Ропот перерастает в бунт' : 'В поместье ропот'} (${unrestCause() || 'недовольство'}). Поднимите настроение: отдых, угощения, похвала.`);
  if (K.rvWarn && K.rvWarn.day >= S.day) w.push(`🎭 Подручные Ставрака крутятся у ${K.rvWarn.t}. Караульня или сундук помогут.`);
  if (K.bk) w.push(`💀 Дела плохи: капитал ${fmt(capital())}. Ещё ${dn(Math.max(1, 5 - K.bk))} в таком духе — и гильдия объявит вас банкротом.`);
  if (S.gold > 2000 && theftChance() > 0.025 && C.stage >= 1) w.push(`🔒 Много монет в кассе и мало охраны — риск кражи ${Math.round(theftChance() * 100)}% в день.`);
  return w;
}
// ---------- день ----------
function riskDayEnd(L) {
  const K = rkOf(), C = carOf(); if (C.ended || !rkOn()) return;
  const M = rkM(), before = S.day - 1; // S.day уже следующий
  // займы
  for (const l of K.loans.slice()) {
    if (l.next > before) continue;
    if (S.gold >= l.inst) { S.gold -= l.inst; l.left = Math.max(0, l.left - l.inst); l.next += 7; L.push(`🏦 Платёж по займу «${l.n}»: −${fmt(l.inst)} мон. Осталось ${fmt(l.left)}.`); if (l.left <= 0) { K.loans.splice(K.loans.indexOf(l), 1); L.push('★ Заём погашен полностью. Банк гильдии вспоминает ваше имя с теплом.'); S.rep += 1; } }
    else { l.miss++; l.next += 7; l.left = Math.round(l.left * 1.05); S.rep = Math.max(0, S.rep - 2); L.push(`! Нечем заплатить по займу «${l.n}» (${fmt(l.inst)} мон.). Пеня 5%, репутация −2.`);
      if (l.miss >= 3) { // изъятие
        let took = null; try { const bb = bList().filter(([, b]) => b.lv > 1).sort((a, b) => b[1].lv - a[1].lv)[0]; if (bb) { bb[1].lv--; bb[1].inv = Math.round((bb[1].inv || 0) * 0.6); took = BT[bb[1].t].n; } } catch (e) { }
        l.left = Math.round(l.left * 0.6); l.miss = 0; S.rep = Math.max(0, S.rep - 4);
        L.push(`! Банк гильдии взыскал залог: ${took ? `«${took}» теряет уровень` : 'часть имущества описана'}, долг уменьшен на 40%. Репутация −4.`); cLog('Взыскание по займу');
      } else if (rkFree()) S.xev = { id: 'rk_cred', when: 'night' };
    }
  }
  // ревизия
  if (C.stage >= 1) { if (!K.insp) K.insp = { day: S.day + 12 }; if (K.insp.day <= before) inspRun(L); else if (K.insp.day - S.day === 1) L.push(`! Завтра — ревизия гильдии. Нарушений сейчас: ${inspIssues().length}. Можно подготовиться в «Заботах».`); }
  // хвори
  if (K.out) {
    if (K.out.until < S.day) { K.out = null; L.push('Простуда ушла из дома. Все снова чихают только от перца.'); }
    else { const p = K.out.cured ? 0.03 : 0.14; let n = 0; for (const c of S.owned) if (c.status === 'home' && !(c.sickDays > 0) && R() < p * (c.health < 50 ? 1.5 : 1)) { c.sickDays = 2; c.health = clamp(c.health - 10); n++; } if (n) L.push(`! Простуда: слегло ещё ${n}.`); }
  } else if (K.out0) { K.out0 = 0; let bath = 0; try { bath = lvSum('baths'); } catch (e) { } if (R() < (bath ? 0.3 : 0.75)) { K.out = { until: S.day + 4 }; L.push('! В доме простуда: дней пять будет косить людей. Лекарь в «Заботах» поможет.'); } else L.push('Городской кашель обошёл ваш дом стороной.'); }
  else if (S.day > 12 && R() < 0.012 * M + (S.mevent && S.mevent.id === 'plague' ? 0.15 : 0)) { K.out0 = 1; L.push('! В городе кашляют. Завтра простуда может добраться до вас.'); }
  // ропот → бунт
  const cause = unrestCause();
  if (cause) { K.unrest = Math.min(4, K.unrest + 1); if (K.unrest === 2) L.push(`! В поместье ропот: ${cause}. Если ничего не изменится — будет бунт.`); else if (K.unrest === 3) L.push(`! Ропот громче: ${cause}. Завтра могут не выйти на работу!`); else if (K.unrest >= 4 && rkFree() && !(K.bcd > S.day)) { K.pend = { why: cause }; S.xev = { id: 'rk_bunt', when: 'night' }; K.unrest = 3; K.bcd = S.day + 12; } }
  else K.unrest = Math.max(0, K.unrest - 1);
  // кражи
  if (C.stage >= 1 && S.gold > 800 && R() < theftChance()) { const v = Math.round(Math.min(S.gold * (0.03 + R() * 0.04), 400 + 300 * C.stage)); S.gold -= v; L.push(`! Ночью из кассы пропало ${fmt(v)} мон. ${K.chest ? 'Даже сундук не помог — ловкие пальцы.' : 'Окованный сундук бы не помешал.'}`); }
  // козни Ставрака (со звания 2)
  if (C.stage >= 2 && !C.rv.sch) {
    if (K.rvWarn && K.rvWarn.day === S.day - 1) {
      const k = K.rvWarn.k; K.rvWarn = null;
      let guard = 0; try { guard = lvSum('guard'); } catch (e) { }
      if (k === 'sab') { if (R() < (guard ? 0.25 : 0.7)) { const bb = bList().filter(([, b]) => b.lv > 0); if (bb.length) { const [id, b] = pick(bb); b.closed = S.day; L.push(`! Саботаж: в «${BT[b.t].short || BT[b.t].n}» кто-то насыпал соли в замки. Завтра постройка закрыта.`); rvHeat(5); } } else L.push('Караульные спугнули подозрительных типов в бархатных жилетах. Саботаж сорвался.'); }
      else if (k === 'rumor' && rkFree()) S.xev = { id: 'rk_rumor', when: 'night' };
      else if (k === 'auc') { rvScheme('auction', 5, 'перекупает лоты на аукционе'); L.push('! Ставрак перекупает лучшие лоты аукциона: сбор аукциона +3% на 5 дней.'); }
      else rvScheme('undercut', 4, 'сбивает цены');
    } else if (R() < 0.05 * M * (1 + (C.rv.heat || 0) / 100) * (cFl('rv_paid') ? 0.5 : 1)) {
      const k = pick(['sab', 'rumor', 'auc', 'cut']); K.rvWarn = { k, day: S.day, t: { sab: 'ваших построек', rumor: 'таверны, что-то шепчут', auc: 'аукционного дома', cut: 'вашей лавки с прейскурантом' }[k] };
      L.push(`! Подручные Ставрака крутятся у ${K.rvWarn.t}. Похоже, завтра будет пакость.`);
    }
  }
  if (rvOn('rumor')) { S.rep = Math.max(0, S.rep - 1); L.push('! Слухи Ставрака: репутация −1.'); }
  // мягкое банкротство
  const bad = capital() < -(1500 + 1000 * C.stage) && S.gold < 300;
  if (bad) { K.bk++; if (K.bk >= 5) { K.bk = 0; if (window._rkSync) bankruptModal(); else setTimeout(() => bankruptModal(), 600); } else L.push(`! Капитал ${fmt(capital())}: гильдия обеспокоена (${K.bk}/5). Продайте лишнее, верните долги.`); }
  else K.bk = Math.max(0, K.bk - 1);
}
function bankruptModal() {
  if (document.querySelector('#modal.open')) { setTimeout(bankruptModal, 800); return; }
  const C = carOf(), K = rkOf();
  const btns = [];
  if (K.restr < 2) btns.push({ label: K.restr ? 'Последняя реструктуризация (репутация −15)' : 'Реструктуризация (репутация −8)', cls: 'btn-primary', act: () => { closeModal(true); bankruptRestr(); } });
  if (typeof careerEnd === 'function') btns.push({ label: 'Закрыть дело → Наследие', cls: K.restr >= 2 ? 'btn-primary' : '', act: () => { closeModal(true); careerEnd('bankrupt'); } });
  if (!btns.length) btns.push({ label: 'Стиснуть зубы', cls: 'btn-primary', act: () => { closeModal(true); bankruptRestr(); } });
  csShow({ bg: 'bg04', kicker: 'Мягкое банкротство', title: 'Гильдия стучит в дверь', lines: [`${EXAM.n} кладёт на стол папку толщиной с кирпич: «Капитал ${fmt(capital())}. Это, дорогуша, уже не торговля, а кружок по интересам».`, K.restr < 2 ? 'Гильдия предлагает реструктуризацию: часть долгов спишут, но репутация пострадает. Или можно закрыть дело — опыт не пропадёт, он станет наследием для новой карьеры.' : 'Реструктуризаций больше не будет. Можно закрыть дело и начать заново с наследием — ничего из опыта не пропадёт.'], btns });
}
function bankruptRestr() {
  const C = carOf(), K = rkOf();
  K.restr++; S.rep = Math.max(0, S.rep - (K.restr > 1 ? 15 : 8));
  S.debt = Math.min(S.debt || 0, Math.round(debtLimit() * 0.4));
  for (const l of K.loans) { l.left = Math.round(l.left * 0.5); l.miss = 0; l.inst = Math.ceil(l.inst * 0.5); }
  if (S.gold < 300) S.gold = 300;
  cLog('Реструктуризация долгов'); addLog('Гильдия провела реструктуризацию долгов.');
  toast('Долги урезаны. Гильдия смотрит на вас с жалостью и подозрением.'); save(); render();
}
// ---------- окно «Заботы» ----------
function riskModal() {
  const K = rkOf(), C = carOf(), w = riskWarnings();
  let h = `<div class="rk14">`;
  h += w.length ? `<div class="rk14-w">${w.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : `<p class="pos small">Пока всё спокойно. Ставрак, правда, что-то затевает — он всегда что-то затевает.</p>`;
  // ревизия
  if (C.stage >= 1) { const is = inspIssues(); h += `<div class="panel-title">⚖ Ревизия гильдии</div><div class="small">Следующая — день ${K.insp ? K.insp.day : '?'}. Ревизор: ${EXAM.n}${cFl('exam_strict') ? ' (строга к вам)' : cFl('exam_warm') ? ' (к вам расположена)' : ''}. Сейчас: ${is.length ? is.map(x => esc(x[0])).join('; ') : 'нарушений нет'}.</div>
    <div class="btn-row"><button class="btn small" data-rk="prep" ${K.prep ? 'disabled' : ''}>${K.prep ? 'Готовы ✓' : `Навести порядок · ${80 + 40 * C.stage}`}</button></div>`; }
  else h += `<div class="small muted">Ревизии и налог начнутся со звания «${CSTAGES[1].n}».</div>`;
  // банк
  h += `<div class="panel-title">🏦 Банк гильдии</div>`;
  if (!hasUnlock('loan')) h += `<div class="small muted">Займы — с звания «${CSTAGES[2].n}». А пока есть гоблин-ростовщик (2% в день — лучше не надо).</div>`;
  else {
    h += K.loans.map((l, i) => `<div class="small">${esc(l.n)}: осталось <b>${fmt(l.left)}</b>, платёж ${fmt(l.inst)} в день ${l.next}${l.miss ? ' <span class="neg">просрочка</span>' : ''} <button class="btn small" data-rk="repay" data-i="${i}">Погасить</button></div>`).join('');
    h += `<div class="btn-row">${LOANS14.map(L => `<button class="btn small" data-rk="loan" data-id="${L.id}" ${C.stage < L.st || K.loans.length >= 2 ? 'disabled' : ''}>${L.n}: ${fmt(L.sum)} · ${L.wk} нед. · ${Math.round(L.r * 100)}%</button>`).join('')}</div>
      <div class="small muted">Платёж раз в неделю. Нечем платить — пеня 5%, репутация −2 и коллектор; три просрочки — банк заберёт уровень постройки.</div>`;
  }
  // охрана и здоровье
  h += `<div class="panel-title">🔒 Дом</div><div class="small">Риск кражи: ${Math.round(theftChance() * 100)}% в день (при кассе от 800). ${K.chest ? `Сундук: ${K.chest === 1 ? 'окованный' : 'с секретом'}.` : ''}</div>
    <div class="btn-row">${K.chest < 2 ? `<button class="btn small" data-rk="chest">${K.chest ? 'Сундук с секретом · 900' : 'Окованный сундук · 350'}</button>` : ''}${K.out && !K.out.cured ? `<button class="btn small btn-primary" data-rk="cure">Позвать лекаря · ${120 + 30 * S.owned.length}</button>` : ''}</div>`;
  if (K.unrest) h += `<div class="small">Ропот: ${'✊'.repeat(K.unrest)}${'·'.repeat(Math.max(0, 4 - K.unrest))} ${unrestCause() ? '(' + esc(unrestCause()) + ')' : '(стихает)'}</div>`;
  h += `<div class="panel-title">Сложность</div><div class="btn-row">${Object.entries(DIFF14).map(([k, d]) => `<button class="btn small ${C.diff === k ? 'btn-primary' : ''}" data-rk="diff" data-id="${k}" title="${esc(d.d)}">${d.n}</button>`).join('')}</div><div class="small muted">${esc((DIFF14[C.diff] || DIFF14.norm).d)}. Риски растут с каждым званием. Налогов уплачено: ${fmt(K.tax)} мон.</div>`;
  h += `</div>`;
  showModal('Заботы и риски', h, [{ label: 'Что дальше?', act: () => whatNextModal() }, { label: 'Закрыть', act: 'close' }]);
}
(function () {
  // панель: кнопка «Заботы» с числом предупреждений
  const oPanel = window.careerPanel;
  window.careerPanel = function () {
    let h = oPanel.apply(this, arguments);
    try { const n = riskWarnings().length; h = h.replace(/(<div class="car14-b">[\s\S]*?)(<\/div><\/div>\s*)$/, `$1<button class="btn small ${n ? 'rk14-alert' : ''}" data-rk="open">⚠ Заботы${n ? ' · ' + n : ''}</button>$2`); } catch (e) { }
    return h;
  };
  // залог выручки построек и козни на аукционе
  if (window.aucFee) { const oF = window.aucFee; window.aucFee = function () { const f = oF.apply(this, arguments); return S.car && rvOn('auction') ? +(f + 0.03).toFixed(2) : f; }; }
  if (window.estDayStart) { const oE = window.estDayStart; window.estDayStart = function () { const r = oE.apply(this, arguments); try { const E = estOf(), la = E.last; if (S.car && la && la.day === S.day) {
      if (cFl('pledge') && la.inc > 0) { const t = Math.round(la.inc * 0.4); S.gold -= t; la.lines.push(`🏦 Залог: банк гильдии забрал ${fmt(t)} мон. выручки.`); }
      if (la.tax && hasUnlock('council')) { const t = Math.round(la.tax * 0.25); S.gold += t; la.lines.push(`Льгота советника гильдии: сбор −25% (+${fmt(t)} мон.).`); }
      if (la.tax) rkOf().tax += la.tax; } } catch (e) { } return r; }; }
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-rk]'); if (!t) return;
    ev.preventDefault(); ev.stopPropagation(); const d = t.dataset;
    if (d.rk === 'open') return riskModal();
    if (d.rk === 'prep') return inspPrep();
    if (d.rk === 'loan') return loanTake(d.id);
    if (d.rk === 'repay') return loanRepay(+d.i);
    if (d.rk === 'chest') return chestBuy();
    if (d.rk === 'cure') return outbreakCure();
    if (d.rk === 'diff') { carOf().diff = d.id; save(); render(); return riskModal(); }
  }, true);
  // xShow: шапка-картинка и для забот
  try { const H = HELP.find(x => x[0] === 'career'); if (H) { const o = H[2]; H[2] = () => o() + `<p><b>Заботы и риски</b> (кнопка ⚠ на панели карьеры). Со звания «${CSTAGES[1].n}» каждые 11–15 дней — ревизия гильдии (за 1–3 дня предупреждение, можно навести порядок), раз в неделю — сбор гильдии (о нём напомнят утром). Банк гильдии даёт займы с еженедельными платежами (просрочка — пеня, коллектор, потом изъятие). В доме бывают простуды (лекарь), кражи (караульня, сундук), а при плохом настроении или дисциплине — ропот, который через пару дней становится бунтом. Со звания «${CSTAGES[2].n}» Ставрак строит козни — о них предупреждают за день. Сложность меняется в «Заботах». Если капитал глубоко в минусе 5 дней — мягкое банкротство: реструктуризация или Наследие.</p>`; } } catch (e) { }
})();
