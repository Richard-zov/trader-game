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
  if (typeof inHeat === 'function' && inHeat(c)) e.push('heat');
  if (c.fatigue >= 82 || c.sickDays) e.push('zzz');
  else if (c.fatigue >= 55) e.push('sweat');
  if (c.stress >= 70 || (owned && c.loyalty < 15)) e.push('anger');
  else if (owned && mood(c) >= 82) e.push('hearts');
  return e.slice(0, 2);
}

// ---------- реплики при встрече: по настроению, чертам и расе ----------
// Обращение к игроку: {х}/{Х} — хозяин/хозяйка, {г}/{Г} — господин/госпожа (см. addr в game.js).
// Рабы и рабыни знают своё место: тон зависит от черт, лояльности и дисциплины, но никогда не на равных.
const GREET = {
  market: {
    any: ['Здравствуйте, {г}… Вы присматриваете работника?', 'Я многое умею, {г}. Позвольте показать.', '*кланяется* Если купите меня, {г}, — не пожалеете.', 'Говорят, у вас поместье с садом, {г}. Я бы старал{ся|ась} изо всех сил.'],
    elf: ['*склоняет голову* Эльфы служат верно, {г}, если с ними обращаться бережно.', 'Я помню времена, когда здесь не было рынка… Простите, {г}, это неважно.'],
    beast: ['*принюхивается и тут же опускает глаза* Простите, {г}… от вас пахнет мёдом.', 'У меня чуткие уши, {г}. Я услышу любой ваш зов.'],
    dwarf: ['Руки у меня крепкие, {г}. Любую работу сделаю.', 'Поставьте меня к кузне, {г}, — не пожалеете.'],
    human: ['Я из соседней деревни, {г}. Буду служить честно.', 'Я мечтаю о {пг:добром хозяине|доброй хозяйке}… простите за дерзость, {г}.'],
  },
  happy: ['Доброе утро, {х}! Чем могу услужить?', 'Я так рад{|а} вас видеть, {х}!', 'У меня сегодня всё получается — это благодаря вам, {х}.', 'Позволите испечь вам вечером пирог, {х}?'],
  calm: ['Доброго дня, {х}.', 'Всё идёт своим чередом, {х}. Жду ваших распоряжений.', 'Есть для меня поручения, {х}?', '*кланяется* Я здесь, {х}.'],
  sad: ['Простите, {х}… мне сегодня тоскливо. Но работать я буду.', 'Не обращайте внимания, {х}, пройдёт.', 'Если позволите, {х}… можно мне немного отдохнуть?', '*тихо* Простите, что я сегодня так{ой|ая} хмур{ый|ая}…'],
  tired: ['Простите, {х}… глаза слипаются.', 'Я справлюсь, {х}. Только… можно присесть на минутку?', '*зевает и тут же прикрывает рот* Простите, {х}!', 'Ноги гудят после работы, {х}… но я готов{|а}.'],
  // низкая лояльность или сильный стресс: угрюмо и коротко, но покорно
  angry: ['…Слушаю, {х}.', '*не поднимает глаз* Что прикажете?', 'Да, {х}. Как скажете.', '*молча кланяется*', 'Я сделаю. Не беспокойтесь, {х}.'],
  tone: {
    shy: ['*краснеет и опускает глаза* Д-доброго дня, {х}…', 'Я… я не помешаю, {х}?', '*выглядывает из-за двери* Вы звали, {х}?'],
    proud: ['*выпрямляется* Ваше поручение будет исполнено безупречно, {х}.', 'Я горд{|а} служить в этом доме, {х}.', 'Скажите, что нужно, {х}, — я сделаю лучше всех.'],
    cheeky: ['*лукаво улыбается и тут же кланяется* Доброе утро, {х}! Я вчера вёл{|а} себя почти хорошо.', 'Ой, {х}! А я как раз о вас думал{|а}… то есть о работе, конечно.', 'Позволите маленькую дерзость, {х}? Вы сегодня чудесно выглядите. Всё, молчу!'],
    drilled: ['Слушаю, {г}!', 'Готов{|а} к работе, {г}. Жду распоряжений.', '*чётко кланяется* Доброе утро, {г}.'],
    meek: ['Доброе утро, {х}. Чем я могу быть полез{ен|на}?', 'Я к вашим услугам, {х}.'],
  },
  trait: {
    diligent: ['Работа уже ждёт, {х}! Я всё успею.', 'Я уже всё разложил{|а} по полкам, {х}.'],
    lazy: ['Простите, {х}… можно сегодня чуть помедленнее? Я всё сделаю, честно.', 'Я просто… берегу силы для вашей службы, {х}.'],
    charming: ['Покупатели сегодня снова улыбались мне, {х}. Это всё для вашей выручки.', 'Позвольте сказать, {х}: вам очень идёт этот плащ.'],
    stubborn: ['Я сделаю, {х}. Может, по-своему… но хорошо. Если позволите.', '*поджимает губы* Слушаюсь, {х}.'],
    clever: ['С вашего позволения, {х}, я прочитал{|а} ещё одну книгу из сундука.', 'Осмелюсь предложить, {х}: если переставить прилавок, торговля пойдёт быстрее.'],
    clumsy: ['Простите, {х}… я совсем немножко разбил{|а} кувшин. Я отработаю!', 'Ой! Простите, {х}, я споткнул{ся|ась}!'],
    cheerful: ['Какая погода для работы, {х}!', 'Не грустите, {х}, — я сделаю всё, чтобы день был хорошим!'],
    sensitive: ['Вы на меня не сердитесь, {х}?', 'Простите, {х}… иногда всё кажется таким громким.'],
    loyal: ['Я с вами, {х}, что бы ни случилось.', 'Только скажите, {х}, — и я сделаю.'],
    lucky: ['{Нашёл|Нашла} у колодца медную монетку — это вам, {х}, на удачу!', 'Мне сегодня везёт, {х}. Пусть и вам повезёт.'],
    gourmet: ['А на ужин… простите, {х}, я просто хотел{|а} спросить.', 'Медовые пряники — моя слабость, {х}. Если вдруг заслужу…'],
    hardy: ['Холод мне не страшен, {х}. Пошлите куда угодно.', 'Я и не такое выдерживал{|а}, {х}.'],
  },
  race: {
    elf: ['Ветер сегодня пахнет дождём, {х}. Принести вам плащ?', 'Ваш сад просит заботы, {х}. Позволите мне?'],
    beast: ['Мр… солнышко такое тёплое, {х}.', '*уши дёргаются* {Х}, кто-то идёт к воротам.'],
    dwarf: ['Крепкая кладка у вашего дома, {х}. Добрый дом.', 'Эль в таверне сегодня так себе, {х}. Простите, что болтаю.'],
    human: ['На рынке сегодня шумно, {х}.', 'Соседи опять спорят из-за забора, {х}.'],
  },
  preg: ['Малыш сегодня толкался, {х}.', 'Простите, {х}… так хочется солёных огурцов. И мёда.'],
  flirt: ['*робко* Вы сегодня опять так смотрите, {х}… Мне нравится.', 'Если позовёте вечером, {х}, — я приду. Только позовите.', 'У вас такие тёплые руки, {х}… Простите, я забыл{ся|ась}.', '{Х}, вы краснеете… или это свечи?', 'Я всё утро думал{|а} о вас, {х}. Простите мою дерзость.'],
  heat: ['*тяжело дышит* Простите, {х}… эти дни я сама не своя.', 'Не отходите далеко, {х}… пожалуйста.', 'Мне жарко, хотя на дворе прохладно, {х}…', 'Хвост сегодня не слушается, {х}. Простите.', 'Погладьте меня, {х}… пожалуйста. Так мне легче.'],
};
// Тон речи: угрюмый (низкая лояльность), робкий, гордый-но-послушный, лукавый (смиренно), вышколенный (высокая дисциплина), кроткий
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
      if (c.preg) pool.push(...GREET.preg, ...GREET.preg);
      if ((c.aff || 0) >= 50 && mood(c) >= 50) pool.push(...GREET.flirt);
      if (typeof inHeat === 'function' && inHeat(c)) pool = GREET.heat.slice();
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
