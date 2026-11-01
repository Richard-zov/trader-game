// ===== «Живость»: эмоции, реплики, мелкие события дня, смена дня, сезонные частицы, тон времени суток =====
'use strict';

// ---------- настроение для анимации и значки над головой ----------
function moodKey(c) {
  if (c.fatigue >= 70 || c.sickDays) return 'tired';
  const m = mood(c);
  return m >= 75 ? 'happy' : m < 35 ? 'sad' : 'calm';
}
function emotesOf(c, owned) {
  const e = [];
  if (c.preg) e.push('preg');
  if (c.fatigue >= 82 || c.sickDays) e.push('zzz');
  else if (c.fatigue >= 55) e.push('sweat');
  if (c.stress >= 70 || (owned && c.loyalty < 15)) e.push('anger');
  else if (owned && mood(c) >= 82) e.push('hearts');
  return e.slice(0, 2);
}

// ---------- реплики при встрече: по настроению, чертам и расе ----------
const GREET = {
  market: {
    any: ['Здравствуйте… вы покупатель?', 'Посмотрите, я многое умею.', 'Только не торгуйтесь слишком долго, ладно?', 'Говорят, у вас поместье с садом. Правда?'],
    elf: ['Вы смотрите так, будто оцениваете лес на дрова.', 'Я помню времена, когда здесь не было рынка.'],
    beast: ['*принюхивается* От вас пахнет мёдом.', 'Уши у меня чуткие — шёпот продавца я слышу.'],
    dwarf: ['Руки у меня крепкие, а работу я люблю.', 'Покажите мне кузню — и не пожалеете.'],
    human: ['Я из соседней деревни. Здесь всё такое шумное.', 'Надеюсь, вы честный хозяин.'],
  },
  happy: ['Сегодня чудесный день, правда?', 'Я так рад(а) вас видеть!', 'У меня всё получается — даже самой не верится.', 'Может, испечём вечером пирог?'],
  calm: ['Доброго дня, хозяин.', 'Всё идёт своим чередом.', 'Есть поручения?', 'Я тут подумал(а)… нет, ничего.'],
  sad: ['Мне сегодня как-то тоскливо…', 'Не обращайте внимания, пройдёт.', 'Хоть бы кто-нибудь улыбнулся.', 'Можно мне немного отдохнуть?'],
  tired: ['Глаза слипаются…', 'Ещё одно дело — и я усну стоя.', '*зевает* Простите…', 'Ноги гудят после работы.'],
  angry: ['Не сейчас.', 'Я ещё не остыл(а).', 'Хмф.'],
  trait: {
    diligent: ['Работа сама себя не сделает!', 'Я уже всё разложил(а) по полкам.'],
    lazy: ['А может, сегодня без дел?', 'Я просто… экономлю силы.'],
    charming: ['Покупатели сегодня снова улыбались мне.', 'Вам идёт этот плащ, хозяин.'],
    stubborn: ['Я сделаю по-своему. Но хорошо!', 'Спорить не буду. Почти.'],
    clever: ['Я прочитал(а) ещё одну книгу из сундука.', 'Если переставить прилавок, торговля пойдёт быстрее.'],
    clumsy: ['Я… совсем немножко разбил(а) кувшин.', 'Ой! Простите, это я споткнул(ась).'],
    cheerful: ['Ха! Отличная погода для работы!', 'Не грустите, хозяин, всё наладится!'],
    sensitive: ['Вы на меня не сердитесь?', 'Иногда всё кажется таким громким…'],
    loyal: ['Я с вами, что бы ни случилось.', 'Скажите — и я сделаю.'],
    lucky: ['Нашёл(ла) у колодца медную монетку — к удаче!', 'Мне сегодня везёт, чувствую.'],
    gourmet: ['А на ужин будет что-нибудь сладкое?', 'Медовые пряники — моя слабость.'],
    hardy: ['Холод? Какой холод?', 'Я и не такое выдерживал(а).'],
  },
  race: {
    elf: ['Ветер сегодня пахнет дождём.', 'Ваш сад просит, чтобы с ним поговорили.'],
    beast: ['Мр… солнышко такое тёплое.', '*уши дёргаются* Кто-то идёт к воротам.'],
    dwarf: ['Хорошая кладка у вашего дома, крепкая.', 'Эль в таверне сегодня так себе.'],
    human: ['На рынке сегодня шумно.', 'Соседи опять спорят из-за забора.'],
  },
  preg: ['Малыш сегодня толкался.', 'Хочется солёных огурцов… и мёда.'],
};
function greetLine(c) {
  const owned = !!findOwned(c.uid);
  let pool;
  if (!owned) pool = GREET.market.any.concat(GREET.market[c.race] || []);
  else {
    const k = c.stress >= 70 || c.loyalty < 15 ? 'angry' : moodKey(c);
    pool = GREET[k].slice();
    if (k !== 'angry') {
      for (const t of c.traits) if (GREET.trait[t]) pool.push(...GREET.trait[t]);
      if (R() < 0.5) pool.push(...(GREET.race[c.race] || []));
      if (c.preg) pool.push(...GREET.preg, ...GREET.preg);
    }
  }
  return pick(pool).replace(/(\S+)\(а\)/g, (_, w) => g(c, w, w + 'а')).replace(/(\S+)\(ась\)/g, (_, w) => g(c, w + 'ся', w + 'ась')).replace(/(\S+)\(ла\)/g, (_, w) => g(c, w, w.replace(/ёл$/, '') + 'ла')).replace(/(\S+)\(а\)/g, '$1');
}

// ---------- мелкие события в течение дня (при переходах между экранами) ----------
const DAY_EVENTS = [
  { w: 3, run() { const v = rint(3, 12); S.gold += v; return `Под крыльцом блеснула монетка. +${v} мон.`; } },
  { w: 2, need: 1, run() { const c = pick(homeChars()); c.moodMod += 4; return `${fn1(c)} нашл${g(c, 'ёл', 'а')} в саду первую землянику и угостил${g(c, '', 'а')} всех. Настроение +4.`; } },
  { w: 2, need: 1, run() { const c = pick(homeChars()); c.stress = clamp(c.stress - 5); return `Соседский кот пришёл погреться к ${fn1(c)} на колени. Стресс −5.`; } },
  { w: 2, run() { S.rep += 1; return 'Прохожий купец похвалил вашу вывеску. Репутация +1.'; } },
  { w: 1, need: 1, run() { const c = pick(homeChars()); c.fatigue = clamp(c.fatigue - 6); return `${fn1(c)} вздремнул${g(c, '', 'а')} полчасика в тени яблони. Усталость −6.`; } },
  { w: 1, run() { const v = rint(5, 15); S.gold -= v; return `Ветер сорвал ставню — плотник взял ${v} мон.`; } },
  { w: 1, need: 2, run() { const [a, b] = shuffle(homeChars()); a.moodMod += 3; b.moodMod += 3; return `${fn1(a)} и ${fn1(b)} смеялись над чем-то на кухне. Настроение обоим +3.`; } },
];
function maybeDayEvent() {
  if (!S || (S.dayEv || 0) >= 2 || R() > 0.12) return;
  const pool = DAY_EVENTS.filter(e => !e.need || homeChars().length >= e.need); if (!pool.length) return;
  let x = R() * pool.reduce((a, e) => a + e.w, 0), ev = pool[0];
  for (const e of pool) { x -= e.w; if (x <= 0) { ev = e; break; } }
  S.dayEv = (S.dayEv || 0) + 1;
  const t = ev.run(); addLog(t); save();
  setTimeout(() => { toast('✦ ' + t); goldTo(S.gold); }, 350);
}

// ---------- эффекты сцены ----------
const FX = (() => {
  let layer = null, curSeason = null;
  const SEASON_FX = { 'Весна': 'petal', 'Лето': 'firefly', 'Осень': 'leaf', 'Зима': 'snow' };
  function ensure() {
    if (layer) return layer;
    layer = document.createElement('div'); layer.id = 'fx'; layer.setAttribute('aria-hidden', 'true');
    document.getElementById('app').prepend(layer); return layer;
  }
  function seasonFx(force) {
    if (typeof S === 'undefined' || !S) return;
    const name = season().name;
    if (!force && name === curSeason) return; curSeason = name;
    const l = ensure(); l.innerHTML = '';
    if (!Anim.enabled()) return;
    const kind = SEASON_FX[name] || 'dust';
    const n = kind === 'snow' ? 22 : kind === 'firefly' ? 14 : 12;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'pt pt-' + kind;
      p.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;--d:${(kind === 'firefly' ? 5 + Math.random() * 5 : 9 + Math.random() * 9).toFixed(1)}s;--dl:-${(Math.random() * 15).toFixed(1)}s;--sx:${(Math.random() * 80 - 40).toFixed(0)}px;--s:${(0.6 + Math.random() * 0.8).toFixed(2)};top:${kind === 'firefly' ? (20 + Math.random() * 70).toFixed(0) + '%' : '-5%'}`;
      l.appendChild(p);
    }
  }
  // тон времени суток по часам игрока: утро, день, вечер, ночь
  function tint() {
    seasonFx();
    const h = new Date().getHours();
    const tod = h >= 5 && h < 10 ? 'morning' : h < 17 && h >= 10 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night';
    document.body.dataset.tod = tod;
  }
  // смена дня: закат → ночь → рассвет и надпись с номером дня
  let pendingFin = null;
  function dayChange(day, sname, cb) {
    if (pendingFin) pendingFin();
    if (!Anim.enabled() || document.hidden) { cb(); return; }
    const o = document.createElement('div'); o.className = 'daychange';
    o.innerHTML = `<div class="dc-sky"></div><div class="dc-sun"></div><div class="dc-moon"></div><div class="dc-stars"></div><div class="dc-text"><small>Утро</small>День ${day}<small>${esc(sname)}</small></div>`;
    document.body.appendChild(o);
    let done = false; const fin = () => { if (done) return; done = true; pendingFin = null; cb(); o.classList.add('out'); setTimeout(() => o.remove(), 500); };
    pendingFin = fin; o.addEventListener('click', fin);
    setTimeout(fin, 2300);
  }
  // параллакс фона карточки при прокрутке и наклоне пальца
  document.addEventListener('scroll', (e) => {
    const cp = document.querySelector('.card-portrait .portrait-bg'); if (!cp || !Anim.enabled()) return;
    const y = (e.target.scrollTop || 0); cp.style.transform = `translateY(${Math.min(40, y * 0.18)}px) scale(1.08)`;
  }, true);
  return { season: seasonFx, tint, dayChange };
})();
