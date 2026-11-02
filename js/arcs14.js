'use strict';
// ===== v14.3: личные арки жильцов — мечта, страх, три шага; данные в arcs14_data.js =====
const ARC_COST = [40, 120, 250], ARC_LOY = [0, 30, 45], ARC_GAP = 6;
const arcDef = c => c && ARC14[c.preset] ? ARC14[c.preset] : null;
function arcOf(c) { if (!c || !arcDef(c)) return null; if (!c.arc) c.arc = { s: 0, ig: 0, last: S.day, br: false }; return c.arc; }
function arcReady(c, k) {
  const A = arcOf(c); if (!A || A.br || A.s !== k || A.s >= 3) return false;
  if (S.day - (A.last || 0) < ARC_GAP + k * 2) return false;
  if ((c.loyalty || 0) < ARC_LOY[k]) return false;
  return c.status === 'home' || c.status === undefined;
}
const arcActive = () => (S.owned || []).filter(c => c.arc && !c.arc.br && c.arc.s > 0 && c.arc.s < 3).length;
const arcCool = () => { const C = S.car || {}; return S.day - (C.arcLast || 0) >= 3; };
function arcStatus(c) {
  const A = arcOf(c), D = arcDef(c); if (!A) return '';
  if (A.s >= 3) return `мечта сбылась — «${D[3]}»`;
  if (A.br) return gx(c, '{обижен|обижена}') + ': вы не поддержали в важный момент';
  return `шаг ${A.s + 1} из 3` + (A.ig ? ` · отказов: ${A.ig}` : '');
}
// генерация событий
(function () {
  const mk = (pid, k) => {
    const D = ARC14[pid], st = D[4][k], cost = ARC_COST[k];
    return {
      id: `arc_${pid}_${k}`, w: k ? 12 : 4, when: k === 1 ? 'day' : 'night', arc: true,
      cond: arcCool, who: c => c.preset === pid && arcReady(c, k) && (k > 0 || arcActive() < 2),
      title: `${st[0]}`, text: `<i>Мечта: ${D[0]}.</i><br>${st[1]}`,
      ch: [
        { l: `${st[2]} (${cost} мон.)`, ok: () => xCan(cost), go: (x, e) => {
          const c = x.c, A = arcOf(c); e.gold(-cost); A.s = k + 1; A.last = S.day; A.ig = 0; S.car.arcLast = S.day;
          e.loy(c, 4 + k * 2); e.aff(c, 3 + k); e.mood(c, 10);
          if (k === 1) e.stat(c, D[2], 3);
          if (k === 2) { e.pot(c, D[2], 6); e.stat(c, D[2], 5); e.rep(2); A.perk = D[3]; e.note(`${c.name}: «${D[3]}» — мечта сбылась`, true); try { addLog(`Мечта сбылась: ${c.name} — ${D[0]}.`); } catch (er) { } }
          return st[3];
        } },
        { l: 'Не сейчас', go: (x, e) => {
          const c = x.c, A = arcOf(c); A.ig++; A.last = S.day; S.car.arcLast = S.day; e.mood(c, -8); e.stress(c, 8);
          if (A.ig >= 2) { A.br = true; e.loy(c, -12); e.stress(c, 12); e.note(`${c.name}: страх сбылся — «${D[1]}»`, false); return `{n} больше не заговаривает об этом. Кажется, вы подтвердили то, чего {он|она} {боялся|боялась} больше всего: ${D[1]}.`; }
          return '{n} кивает: «Конечно, потом». Улыбка вышла не очень.';
        } }],
    };
  };
  try { for (const pid of Object.keys(ARC14)) for (let k = 0; k < 3; k++) XEV.push(mk(pid, k)); } catch (e) { console.warn('arc ev', e); }
  // примирение после обиды
  XEV.push({ id: 'arc_fix', w: 6, when: 'day', arc: true, cond: arcCool, who: c => { const A = arcOf(c); return !!(A && A.br && S.day - A.last >= 12 && c.status === 'home'); },
    title: 'Старая обида', text: '{n} снова молча смотрит в сторону, где когда-то была {его|её} мечта. Может, ещё не поздно?',
    ch: [{ l: 'Извиниться и предложить помощь (150 мон.)', ok: () => xCan(150), go: (x, e) => { const A = arcOf(x.c); e.gold(-150); A.br = false; A.ig = 0; A.last = S.day - ARC_GAP; S.car.arcLast = S.day; e.loy(x.c, 8); e.stress(x.c, -10); return '{n} долго молчит, потом кивает: «Ладно. Попробуем ещё раз».'; } },
      { l: 'Оставить как есть', go: (x, e) => { const A = arcOf(x.c); A.last = S.day; S.car.arcLast = S.day; e.mood(x.c, -4); return 'Всё остаётся как есть. Холодок тоже.'; } }] });
})();
// блок в промпт ИИ
(function () {
  const o = window.agrPromptBlock;
  if (o) window.agrPromptBlock = function (c) {
    let t = o.apply(this, arguments) || '';
    try {
      const D = arcDef(c), A = arcOf(c); if (!D) return t;
      const H = playerFem() ? 'хозяйка' : 'хозяин';
      t += `ТВОЯ ЛИЧНАЯ ИСТОРИЯ: мечта — ${D[0]}; главный страх — ${D[1]}. `;
      if (A.s >= 3) t += `Мечта сбылась благодаря тому, что ${H} поддержал${playerFem() ? 'а' : ''} тебя на всех шагах (${D[4].map(s => s[0]).join(' → ')}). Ты ${g(c, 'благодарен', 'благодарна')} и иногда вспоминаешь об этом с теплом.\n`;
      else if (A.br) t += `${H[0].toUpperCase() + H.slice(1)} дважды отмахнулся${playerFem() ? '(ась)' : ''} от твоей мечты — ты ${g(c, 'обижен', 'обижена')}, говоришь об этом сдержанно и не веришь обещаниям на слово.\n`;
      else if (A.s > 0) t += `Уже пройдено: ${D[4].slice(0, A.s).map(s => s[0]).join(', ')}. Следующий шаг: «${D[4][A.s][0]}». Можешь ненавязчиво заговорить о нём.\n`;
      else t += `Ты пока стесняешься говорить о мечте прямо, но иногда проговариваешься.\n`;
      if (A.ig && !A.br) t += `Однажды тебе уже ответили «не сейчас» — это задело.\n`;
    } catch (e) { }
    return t;
  };
})();
// карточка жильца, справка
(function () {
  const oR = window.render;
  window.render = function () {
    const r = oR.apply(this, arguments);
    try {
      if (UI.screen === 'card' && !document.querySelector('#screen .arc14')) {
        const c = findOwned(UI.cardUid), D = arcDef(c), p = document.querySelector('#screen .act-grid');
        if (c && D && p) { const A = arcOf(c); const dots = [0, 1, 2].map(i => `<i class="${i < A.s ? 'on' : A.br && i === A.s ? 'br' : ''}"></i>`).join('');
          p.insertAdjacentHTML('beforebegin', `<div class="arc14 ${A.s >= 3 ? 'done' : A.br ? 'br' : ''}"><div class="arc14-h"><b>Мечта</b><span class="arc14-dots">${dots}</span></div><div>${esc(D[0])}</div><div class="arc14-f"><b>Страх:</b> ${esc(D[1])}</div><div class="arc14-s">${esc(arcStatus(c))}</div></div>`); }
      }
    } catch (e) { console.warn('arc render', e); }
    return r;
  };
  try { HELP.push(['arcs', 'Мечты жильцов (v14)', () => `<p>У каждого жильца есть <b>мечта</b> и <b>страх</b> — они видны в карточке. Время от времени жилец сам заговаривает о мечте: это сцена из трёх шагов (${ARC_COST.join(' / ')} мон.; для 2-го и 3-го нужна лояльность ${ARC_LOY[1]} и ${ARC_LOY[2]}).</p><p>Поддержка: лояльность, симпатия, рост навыка, а на последнем шаге — особая черта и потенциал. Два «не сейчас» подряд — обида: страх сбывается, лояльность падает. Через время можно извиниться.</p><p>Собеседник в чате помнит, на каком шаге мечта и обижен ли он(а).</p><p>Управляющий такие сцены не решает и останавливает пропуск дней.</p>`]); } catch (e) { }
})();
