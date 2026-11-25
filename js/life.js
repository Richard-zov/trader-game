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
  if (c.fatigue >= 82 || c.sickDays) e.push('zzz');
  else if (c.fatigue >= 55) e.push('sweat');
  if (c.stress >= 70 || (owned && c.loyalty < 15)) e.push('anger');
  else if (owned && mood(c) >= 82) e.push('hearts');
  return e.slice(0, 2);
}

// ---------- реплики при встрече: по настроению, чертам и расе ----------
// Обращение к игроку: {х}/{Х} — управляющий/управляющая, {г}/{Г} — сударь/сударыня (см. addr в game.js).
// Работники — вольные наёмные люди: вежливы, но говорят как взрослые, могут попросить, предложить или поторговаться.
const GREET = {
  market: {
    any: ['Здравствуйте, {г}. Ищете работников на сезон?', 'Я многое умею, {г}. Какие у вас условия?', 'Если жалованье честное, {г}, — работать буду на совесть.', 'Говорят, у вас хозяйство с садом, {г}. Расскажете, что за работа?'],
    elf: ['Эльфы работают долго и аккуратно, {г}, — если к ним относятся уважительно.', 'Я помню эти края ещё без ярмарки. Хотелось бы осесть здесь, {г}.'],
    beast: ['*принюхивается* От вашего двора пахнет мёдом, {г}. Хороший знак.', 'У меня чуткие уши, {г}. В ночной охране я незаменим{|а}.'],
    dwarf: ['Руки у меня крепкие, {г}. Только жалованье — день в день.', 'Поставьте меня к кузне, {г}, — не пожалеете. Но инструмент чтоб добрый.'],
    human: ['Я из соседней деревни, {г}. Урожай собран — ищу работу до весны.', 'Мне бы {пг:доброго нанимателя|добрую нанимательницу}, {г}. Говорят, вы платите честно.'],
  },
  happy: ['Доброе утро, {х}! С чего начнём?', 'Рад{|а} вас видеть, {х}! Дела идут отлично.', 'У меня сегодня всё спорится, {х}.', 'Вечером испеку пирог на всю артель, {х}, — заходите.'],
  calm: ['Доброго дня, {х}.', 'Всё идёт своим чередом, {х}. Какие на сегодня планы?', 'Есть новые поручения, {х}?', 'Я на месте, {х}. Скажите, если что-то нужно.'],
  sad: ['Тоскливо сегодня, {х}. Но работу сделаю.', 'Не обращайте внимания, {х}, пройдёт.', '{Х}, можно мне сегодня полегче? Сил маловато.', 'Простите, что я сегодня так{ой|ая} хмур{ый|ая}, {х}.'],
  tired: ['Глаза слипаются, {х}… Может, отдых завтра?', 'Справлюсь, {х}. Только дайте присесть на минутку.', '*зевает* Ох, простите, {х}!', 'Ноги гудят после смены, {х}… но я готов{|а}.'],
  // низкая лояльность или сильный стресс: сухо и коротко, работник недоволен условиями
  angry: ['…Слушаю, {х}.', 'Сделаю. Но нам бы поговорить об условиях, {х}.', 'Да, {х}. Как договаривались.', '*устало кивает*', 'Я подумываю, не поискать ли другое место, {х}.'],
  tone: {
    shy: ['Д-доброго дня, {х}… Я не помешаю?', 'Если можно, {х}, я спрошу кое-что про работу… потом.', '*выглядывает из-за двери* Вы звали, {х}?'],
    proud: ['Ваше поручение будет сделано лучше всех, {х}.', 'Я горжусь тем, что работаю в этом хозяйстве, {х}.', 'Дайте мне задачу посложнее, {х}, — я справлюсь.'],
    cheeky: ['Доброе утро, {х}! Я вчера почти ничего не разбил{|а}.', 'О, {х}! А я как раз думал{|а}, не пора ли мне прибавки… шучу. Наполовину.', 'Можно дерзость, {х}? Сегодня вы выглядите отдохнувш{им|ей}. Всё, за работу!'],
    drilled: ['Доброе утро, {х}! Смена готова.', 'Готов{|а} к работе, {х}. План на день?', 'Всё проверено с утра, {х}.'],
    meek: ['Доброе утро, {х}. Чем помочь?', 'Я здесь, {х}, если понадоблюсь.'],
  },
  trait: {
    diligent: ['Работа уже ждёт, {х}! Я всё успею.', 'Я уже всё разложил{|а} по полкам, {х}.'],
    lazy: ['{Х}, можно сегодня чуть помедленнее? Я всё сделаю, честно.', 'Я просто берегу силы к вечеру, {х}.'],
    charming: ['Покупатели сегодня снова улыбались, {х}. Хорошо для выручки!', 'Вам идёт этот плащ, {х}. Честно.'],
    stubborn: ['Сделаю, {х}. Может, по-своему… но хорошо.', 'У меня есть идея получше, {х}. Выслушаете?'],
    clever: ['Я прочитал{|а} ещё одну книгу из сундука, {х}. Есть мысли по делу.', 'Предложение, {х}: если переставить прилавок, торговля пойдёт быстрее.'],
    clumsy: ['{Х}, я совсем немножко разбил{|а} кувшин. Возмещу!', 'Ой! Простите, {х}, споткнул{ся|ась}!'],
    cheerful: ['Какая погода для работы, {х}!', 'Не грустите, {х}, — день будет хорошим!'],
    sensitive: ['Вы на меня не сердитесь, {х}?', 'Иногда всё кажется таким громким, {х}…'],
    loyal: ['Я с вами, {х}, что бы ни случилось.', 'Хорошее хозяйство, {х}. Отсюда я никуда не уйду.'],
    lucky: ['{Нашёл|Нашла} у колодца медную монетку — это на удачу хозяйству, {х}!', 'Мне сегодня везёт, {х}. Пусть и вам повезёт.'],
    gourmet: ['А что сегодня на обед, {х}? Я просто спросить.', 'Медовые пряники — моя слабость, {х}. Если вдруг будет премия…'],
    hardy: ['Холод мне не страшен, {х}. Пошлите куда угодно.', 'Я и не такое выдерживал{|а}, {х}.'],
  },
  race: {
    elf: ['Ветер пахнет дождём, {х}. Убрать сено под навес?', 'Сад просит заботы, {х}. Займусь?'],
    beast: ['Солнышко такое тёплое, {х}.', '*уши дёргаются* {Х}, кто-то идёт к воротам.'],
    dwarf: ['Крепкая кладка у вашего дома, {х}. Добрый дом.', 'Эль в таверне сегодня так себе, {х}.'],
    human: ['На рынке сегодня шумно, {х}.', 'Соседи опять спорят из-за забора, {х}.'],
  },
  friend: ['Спасибо, что выслушали вчера, {х}. Мне полегчало.', 'С вами приятно работать, {х}.', 'Если что-то нужно — говорите прямо, {х}, я помогу.', 'Хорошо, что я нанял{ся|ась} именно к вам, {х}.'],
};
// Тон речи: недовольный (низкая лояльность), робкий, гордый, лукавый, собранный (высокая дисциплина), спокойный
function toneOf(c) {
  if (c.loyalty < 25 || c.stress >= 70) return 'sullen';
  if ((c.discipline || 0) >= 70) return 'drilled';
  if (has(c, 'sensitive') || has(c, 'clumsy')) return 'shy';
  if (has(c, 'stubborn') || c.race === 'dwarf' || (c.race === 'elf' && has(c, 'clever'))) return 'proud';
  if ((has(c, 'cheerful') || has(c, 'charming') || has(c, 'lazy')) && c.loyalty >= 45) return 'cheeky';
  return 'meek';
}
function greetLine(c) {
  const owned = !!findOwned(c.uid);
  let pool;
  if (!owned) pool = GREET.market.any.concat(GREET.market[c.race] || []);
  else {
    const tn = toneOf(c);
    const k = tn === 'sullen' ? 'angry' : moodKey(c);
    pool = GREET[k].slice();
    if (k !== 'angry') {
      if (GREET.tone[tn]) pool.push(...GREET.tone[tn], ...GREET.tone[tn]);
      for (const t of c.traits) if (GREET.trait[t]) pool.push(...GREET.trait[t]);
      if (R() < 0.5) pool.push(...(GREET.race[c.race] || []));
      if ((c.aff || 0) >= 50 && mood(c) >= 50) pool.push(...GREET.friend);
    }
  }
  return gx(c, pick(pool));
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
