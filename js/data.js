// ===== Данные игры: расы, пресеты, черты, предметы, события, заказы =====
'use strict';

const STATS = [
  { key: 'str', name: 'Сила' },
  { key: 'agi', name: 'Ловкость' },
  { key: 'end', name: 'Выносливость' },
  { key: 'int', name: 'Ум' },
  { key: 'cha', name: 'Обаяние' },
  { key: 'mas', name: 'Мастерство' },
  { key: 'wil', name: 'Воля' },
  { key: 'luk', name: 'Удача' },
];

const RACES = {
  human: {
    name: 'Человек', gen: 'людей', plural: 'Люди', base: 400,
    mods: { cha: 4, mas: 4 },
    bonus: 'Работа приносит на 10% больше монет',
    quirk: 'Без особых причуд — зато легко уживается с кем угодно',
  },
  elf: {
    name: 'Эльф', fname: 'Эльфийка', gen: 'эльфов', plural: 'Эльфы', base: 600,
    mods: { int: 8, agi: 6, str: -6 },
    bonus: 'Обучение даёт на 30% больше',
    quirk: 'На тяжёлой работе стресс растёт на 50% быстрее',
  },
  beast: {
    name: 'Зверолюд', fname: 'Зверолюдка', gen: 'зверолюдей', plural: 'Зверолюди', base: 450,
    mods: { str: 6, end: 8, int: -5 },
    bonus: 'Отдых снимает усталость вдвое быстрее',
    quirk: 'Плохо переносит выговоры: обида сильнее',
  },
  dwarf: {
    name: 'Гном', fname: 'Гномка', gen: 'гномов', plural: 'Гномы', base: 500,
    mods: { mas: 10, end: 5, agi: -6 },
    bonus: 'Ошибается на работе вдвое реже',
    quirk: 'Упрям: строгость действует вдвое слабее',
  },
};

const RARITIES = [
  { key: 'common', name: 'Обычный', fname: 'Обычная', mult: 1, chance: 0.60, bonus: 0, pot: 0 },
  { key: 'rare', name: 'Редкий', fname: 'Редкая', mult: 1.5, chance: 0.28, bonus: 6, pot: 8 },
  { key: 'epic', name: 'Эпический', fname: 'Эпическая', mult: 2.5, chance: 0.10, bonus: 12, pot: 16 },
  { key: 'legend', name: 'Легендарный', fname: 'Легендарная', mult: 4, chance: 0.02, bonus: 20, pot: 25 },
];

// Черты: mult — множитель цены
const TRAITS = {
  diligent: { name: 'Трудолюбие', desc: 'Работа приносит +20% монет', mult: 1.1 },
  lazy: { name: 'Лень', desc: 'Усталость от дел +30%', mult: 0.85 },
  charming: { name: 'Обаяние', desc: 'Покупатели в восторге: цена +15%', mult: 1.15 },
  stubborn: { name: 'Упрямство', desc: 'Строгость действует слабее', mult: 0.9 },
  clever: { name: 'Смекалка', desc: 'Обучение +50%', mult: 1.15 },
  clumsy: { name: 'Неуклюжесть', desc: 'Шанс ошибки +4%', mult: 0.9 },
  cheerful: { name: 'Весёлый нрав', desc: 'Стресс растёт на 30% медленнее', mult: 1.05 },
  sensitive: { name: 'Ранимость', desc: 'Стресс растёт на 30% быстрее', mult: 0.95 },
  loyal: { name: 'Верность', desc: 'Лояльность растёт в полтора раза быстрее', mult: 1.2 },
  lucky: { name: 'Везение', desc: 'Заказы в таверне удаются чаще', mult: 1.1 },
  gourmet: { name: 'Сладкоежка', desc: 'Угощения действуют вдвое сильнее', mult: 1.0 },
  hardy: { name: 'Крепкое здоровье', desc: 'Почти не болеет', mult: 1.1 },
};

// Аксессуары — настоящие предметы снаряжения. Иконки: assets/accessories/<id>.png.
// ov — наложение на полноростовой арт (только головные уборы). bon — базовые бонусы (умножаются на качество), val — базовая стоимость.
const ACCESSORIES = {
  hat: { name: 'Шляпа с пером', slot: 'head', ov: { k: 1.75, dx: 0, dy: 0.12, r: 0 }, bon: { cha: 3, price: 5 }, val: 70 },
  beret: { name: 'Берет', slot: 'head', ov: { k: 1.2, dx: 0.08, dy: 0.08, r: -8 }, bon: { int: 2, mas: 2 }, val: 55 },
  circlet: { name: 'Обруч с камнем', slot: 'head', ov: { k: 0.95, dx: 0, dy: 0.32, r: 0 }, bon: { int: 3, cha: 2, price: 6 }, val: 110 },
  flower: { name: 'Цветок в волосах', slot: 'head', ov: { k: 0.42, dx: 0.36, dy: 0.28, r: 10 }, bon: { mood: 5, cha: 1 }, val: 25 },
  headband: { name: 'Повязка', slot: 'head', bon: { str: 2, agi: 2 }, val: 40 },
  bow: { name: 'Кружевной бант', slot: 'head', ov: { k: 0.5, dx: -0.34, dy: 0.12, r: -12 }, bon: { cha: 3 }, val: 45 },
  wreath: { name: 'Венок', slot: 'head', ov: { k: 1.15, dx: 0, dy: 0.1, r: 0 }, bon: { calm: 3, mood: 3 }, val: 35 },
  scarf: { name: 'Шарф', slot: 'neck', bon: { end: 2, hp: 2 }, val: 40 },
  pendant: { name: 'Кулон', slot: 'neck', bon: { wil: 3, calm: 2 }, val: 75 },
  bell: { name: 'Колокольчик', slot: 'neck', bon: { loy: 25, mood: 2 }, val: 50 },
  earrings: { name: 'Серьги', slot: 'ears', bon: { cha: 2, price: 8 }, val: 90 },
  glasses: { name: 'Очки', slot: 'face', bon: { int: 4, train: 12 }, val: 85 },
  cloak: { name: 'Плащ', slot: 'back', bon: { end: 3, hp: 3 }, val: 70 },
  belt: { name: 'Пояс с сумкой', slot: 'waist', bon: { inc: 10, agi: 1 }, val: 80 },
  bracelet: { name: 'Рунный браслет', slot: 'wrist', bon: { luk: 4, order: 5 }, val: 95 },
  gloves: { name: 'Перчатки', slot: 'hands', bon: { mas: 3, inc: 5 }, val: 60 },
  // Чулки и колготки — отдельный слот «ноги». Видны на арте, если поверх нет платья (с бельём, комплектом или без наряда).
  silkst: { name: 'Шёлковые чулки', slot: 'legs', fem: 1, bon: { cha: 3, price: 5 }, val: 60 },
  lacest: { name: 'Кружевные чулки с бантиками', slot: 'legs', fem: 1, bon: { cha: 4, mood: 3 }, val: 85 },
  tights: { name: 'Тёплые колготки', slot: 'legs', fem: 1, bon: { end: 2, calm: 2 }, val: 45 },
  kneesox: { name: 'Гольфы в полоску', slot: 'legs', fem: 1, bon: { agi: 2, mood: 2 }, val: 35 },
};
const SLOT_NAMES = { head: 'голова', neck: 'шея', ears: 'уши', face: 'лицо', back: 'спина', waist: 'пояс', wrist: 'запястье', hands: 'руки', legs: 'ноги', body: 'наряд' };

// Наряды — тоже предметы (слот body). Арт в одежде (OUTFIT_ART) есть у всех пресетов — по 3–4 наряда; если нужного наряда нет, показывается базовый арт.
const OUTFITS = {
  peasant: { name: 'Крестьянский наряд', bon: { end: 2, hp: 2 }, val: 50 },
  noble: { name: 'Благородный наряд', bon: { cha: 5, price: 12 }, val: 220 },
  travel: { name: 'Походный костюм', bon: { agi: 3, order: 6 }, val: 120 },
  maid: { name: 'Наряд служанки', bon: { mas: 2, inc: 10 }, val: 110 },
  robe: { name: 'Мантия чародея', bon: { int: 4, train: 15 }, val: 160 },
  work: { name: 'Рабочий фартук', bon: { str: 3, mas: 2 }, val: 80 },
  swim: { name: 'Купальник', nameM: 'Купальные шорты', bon: { agi: 3, mood: 3 }, val: 70 },
  lace: { name: 'Кружевной комплект', bon: { cha: 4, loy: 15 }, val: 140, fem: 1 },
  dress: { name: 'Летнее платье', bon: { cha: 3, mood: 4 }, val: 90, fem: 1 },
  corset: { name: 'Корсетное платье', nameM: 'Жилет с корсетным поясом', bon: { cha: 4, end: 2, price: 8 }, val: 180 },
  night: { name: 'Шёлковая сорочка', nameM: 'Шёлковый халат', bon: { calm: 4, hp: 2 }, val: 110 },
};
// реакция на подаренную одежду
const OUTFIT_SHY = { swim: 1, lace: 1, night: 1, silkst: 1, lacest: 1 };
const OUTFIT_SHY_L = ['*краснеет до ушей* Это так… открыто, {х}. Но если вам нравится — я буду носить.', 'Ой… {х}, в этом я почти как без одежды… Простите. Спасибо.', '*прикрывается ладонями и тут же опускает руки* Как прикажете, {х}.'];
const OUTFIT_OK_L = ['Спасибо, {х}! Вам нравится, как я выгляжу?', 'Какая красота… Спасибо, {х}!', '*кружится* Я буду беречь эту вещь, {х}.'];
const OUTFITS_CLASSIC = ['peasant', 'noble', 'travel', 'maid', 'robe', 'work'];
// Если у персонажа нет арта именно этого наряда — показываем ближайший похожий (наряд всегда виден на портрете)
const OUTFIT_NEAR = {
  peasant: ['work', 'maid', 'dress', 'travel'], noble: ['corset', 'dress', 'robe', 'maid'], travel: ['work', 'peasant'],
  maid: ['peasant', 'dress', 'work'], robe: ['night', 'noble', 'dress'], work: ['peasant', 'travel', 'maid'],
  swim: ['lace'], lace: ['swim'], dress: ['night', 'corset', 'peasant', 'maid', 'noble'], corset: ['noble', 'dress', 'maid'],
  night: ['dress', 'robe', 'lace'],
};
// Качество предмета: множитель бонусов, прочность, стоимость
const GEAR_Q = [
  { key: 'q0', name: 'обычное', mult: 1, dur: 30, val: 1, chance: 0.62 },
  { key: 'q1', name: 'хорошее', mult: 1.5, dur: 45, val: 1.8, chance: 0.27 },
  { key: 'q2', name: 'отличное', mult: 2, dur: 60, val: 3, chance: 0.09 },
  { key: 'q3', name: 'мастерское', mult: 3, dur: 90, val: 5.5, chance: 0.02 },
];
const BON_NAMES = {
  str: 'Сила', agi: 'Ловкость', end: 'Выносливость', int: 'Ум', cha: 'Обаяние', mas: 'Мастерство', wil: 'Воля', luk: 'Удача',
  inc: '% к доходу', price: '% к цене', mood: ' к настроению', calm: ' стресса в день', train: '% к обучению',
  order: '% к успеху заказов', loy: '% к росту лояльности', hp: ' здоровья в день',
};
const OUTFIT_ART = {
  f01: ['maid', 'noble', 'peasant', 'travel', 'swim', 'stock', 'lace'],
  f02: ['peasant', 'robe', 'travel', 'dress', 'corset', 'night'],
  f03: ['maid', 'noble', 'peasant', 'swim', 'stock', 'lace'],
  f04: ['maid', 'noble', 'peasant', 'dress', 'corset', 'night'],
  f05: ['maid', 'noble', 'robe', 'swim', 'stock', 'lace'],
  f06: ['noble', 'travel', 'work'],
  f07: ['maid', 'peasant', 'robe'],
  f08: ['peasant', 'robe', 'travel', 'swim', 'stock', 'lace'],
  f09: ['peasant', 'robe', 'travel', 'dress', 'corset', 'night'],
  f10: ['maid', 'noble', 'robe', 'swim', 'stock', 'lace'],
  f11: ['noble', 'robe', 'travel'],
  f12: ['noble', 'robe', 'travel', 'swim', 'stock', 'lace'],
  f13: ['maid', 'peasant', 'work'],
  f14: ['maid', 'noble', 'travel', 'swim', 'stock', 'lace'],
  f15: ['noble', 'peasant', 'travel', 'swim', 'stock', 'lace'],
  f16: ['maid', 'peasant', 'travel', 'dress', 'corset', 'night'],
  f17: ['peasant', 'travel', 'work'],
  f18: ['maid', 'noble', 'robe', 'swim', 'stock', 'lace'],
  f19: ['maid', 'peasant', 'work'],
  f20: ['noble', 'robe', 'work', 'swim', 'stock', 'lace'],
  f21: ['maid', 'robe', 'work'],
  f22: ['maid', 'peasant', 'work'],
  f23: ['robe', 'travel', 'work'],
  m01: ['noble', 'travel', 'work', 'swim', 'night', 'corset'],
  m02: ['noble', 'peasant', 'robe'],
  m03: ['noble', 'robe', 'travel', 'swim', 'night', 'corset'],
  m04: ['noble', 'robe', 'travel'],
  m05: ['peasant', 'travel', 'work'],
  m06: ['noble', 'peasant', 'work'],
  m07: ['noble', 'travel', 'work'],
  m08: ['noble', 'peasant', 'work'],
};
const ACC_COLORS = ['#8a3b2e', '#4f6b3a', '#2f4f6b', '#7a5a2a', '#6b3f6b', '#b8862f', '#3e5c5a', '#9b4a3c'];

const SURNAMES = ['из Ольховки', 'с Мельничной улицы', 'из Медового Лога', 'с Ивового брода', 'из Каменной Пади',
  'с Южного тракта', 'из Тихой Заводи', 'с Рябинового холма', 'из Ветряного Края', 'с Овражьей улицы',
  'из Сосновки', 'с Янтарного берега', 'из Лисьей Норы', 'с Колокольной площади'];

// 8 мужских и 23 женских пресета.
// Портрет пресета можно заменить файлом assets/portraits/<id>.png — код менять не нужно.
// hair: 0 короткая, 1 длинная, 2 каре, 3 хвост, 4 пучок; ears — для зверолюдей.
const PRESETS = [
  // ---- мужские ----
  { id: 'm01', g: 'm', race: 'human', title: 'Бывший стражник', names: ['Ратмир', 'Бронислав', 'Всеволод'], skin: '#e8b98f', hairC: '#3a2618', hair: 0, eyes: '#4a6a3a', outfit: '#6b4a2e' },
  { id: 'm02', g: 'm', race: 'human', title: 'Писарь без места', names: ['Тихон', 'Елисей', 'Мирон'], skin: '#f0caa4', hairC: '#8a5a2b', hair: 2, eyes: '#5a4030', outfit: '#3e5c5a' },
  { id: 'm03', g: 'm', race: 'elf', title: 'Лесной следопыт', names: ['Эльвиан', 'Тайрен', 'Аэлис'], skin: '#f3d6b8', hairC: '#e8dcc0', hair: 1, eyes: '#3f7a5a', outfit: '#4f6b3a' },
  { id: 'm04', g: 'm', race: 'elf', title: 'Звездочёт', names: ['Сейрен', 'Иларион', 'Лаэрт'], skin: '#e6c4a6', hairC: '#2b2f4a', hair: 3, eyes: '#6a5aa0', outfit: '#2f4f6b' },
  { id: 'm05', g: 'm', race: 'beast', ears: 'wolf', title: 'Волчий дозорный', names: ['Буран', 'Серый Тур', 'Ярош'], skin: '#d9a47a', hairC: '#6e6e72', hair: 0, eyes: '#c9902a', outfit: '#5a3a2a' },
  { id: 'm06', g: 'm', race: 'beast', ears: 'bear', title: 'Медвежий кузнец', names: ['Потап', 'Годун', 'Бер'], skin: '#c98d62', hairC: '#5a3a22', hair: 0, eyes: '#5a3a22', outfit: '#7a5a2a' },
  { id: 'm07', g: 'm', race: 'dwarf', beard: true, title: 'Горный мастер', names: ['Борин', 'Дурни', 'Гримвальд'], skin: '#e0a882', hairC: '#9b4a2a', hair: 0, eyes: '#4a5a6a', outfit: '#8a3b2e' },
  { id: 'm08', g: 'm', race: 'dwarf', beard: true, title: 'Пивовар', names: ['Тордин', 'Бальдур', 'Хорст'], skin: '#d9a07a', hairC: '#c9b48a', hair: 4, eyes: '#3a5a4a', outfit: '#4f6b3a' },
  // ---- женские: люди ----
  { id: 'f01', g: 'f', race: 'human', title: 'Дочь мельника', names: ['Милава', 'Злата', 'Любава'], skin: '#f2cfae', hairC: '#c98a3a', hair: 3, eyes: '#4a7a8a', outfit: '#9b4a3c' },
  { id: 'f02', g: 'f', race: 'human', title: 'Травница', names: ['Агния', 'Веста', 'Дарина'], skin: '#e9bd96', hairC: '#3a2618', hair: 1, eyes: '#4f6b3a', outfit: '#4f6b3a' },
  { id: 'f03', g: 'f', race: 'human', title: 'Певица из таверны', names: ['Ярослава', 'Забава', 'Услада'], skin: '#f5d8bd', hairC: '#7a2a2a', hair: 1, eyes: '#6a3a2a', outfit: '#6b3f6b' },
  { id: 'f04', g: 'f', race: 'human', title: 'Ткачиха', names: ['Олеся', 'Ждана', 'Голуба'], skin: '#e0ad84', hairC: '#5a3a22', hair: 4, eyes: '#5a4030', outfit: '#2f4f6b' },
  { id: 'f05', g: 'f', race: 'human', title: 'Купеческая вдова', names: ['Василиса', 'Прасковья', 'Марфа'], skin: '#f0c8a0', hairC: '#1f1a18', hair: 2, eyes: '#3a3a5a', outfit: '#3a2a3a' },
  { id: 'f06', g: 'f', race: 'human', title: 'Наёмница', names: ['Рогнеда', 'Велена', 'Добрава'], skin: '#c88f68', hairC: '#2a1a12', hair: 3, eyes: '#6a4a2a', outfit: '#5a3a2a' },
  { id: 'f07', g: 'f', race: 'human', title: 'Ученица алхимика', names: ['Есения', 'Лада', 'Божена'], skin: '#f6dcc4', hairC: '#e0c080', hair: 2, eyes: '#4a7a5a', outfit: '#b8862f' },
  // ---- женские: эльфийки ----
  { id: 'f08', g: 'f', race: 'elf', title: 'Лучница', names: ['Лираэль', 'Сильвана', 'Аэрин'], skin: '#f5dfc8', hairC: '#efe6d0', hair: 1, eyes: '#3f7a5a', outfit: '#4f6b3a' },
  { id: 'f09', g: 'f', race: 'elf', title: 'Хранительница рощи', names: ['Мэйвис', 'Элария', 'Таэль'], skin: '#e8cdb0', hairC: '#5f8a4a', hair: 1, eyes: '#8aa04a', outfit: '#3e5c5a' },
  { id: 'f10', g: 'f', race: 'elf', title: 'Лунная жрица', names: ['Селина', 'Иннара', 'Лунэль'], skin: '#efe0d8', hairC: '#b8c4d8', hair: 4, eyes: '#6a7ac0', outfit: '#2f4f6b' },
  { id: 'f11', g: 'f', race: 'elf', title: 'Арфистка', names: ['Фаэлин', 'Ниэль', 'Арвен'], skin: '#f2d4b6', hairC: '#c9a03a', hair: 3, eyes: '#4a6a8a', outfit: '#8a3b2e' },
  { id: 'f12', g: 'f', race: 'elf', title: 'Тёмная эльфийка-картограф', names: ['Зарейна', 'Вейла', 'Морвэн'], skin: '#9a7a8a', hairC: '#e8e8f0', hair: 2, eyes: '#c04a4a', outfit: '#3a2a3a' },
  { id: 'f13', g: 'f', race: 'elf', title: 'Садовница', names: ['Эльвира', 'Илин', 'Тинуэль'], skin: '#f6e2cc', hairC: '#d87a4a', hair: 3, eyes: '#4a8a6a', outfit: '#6b8a4a' },
  // ---- женские: зверолюдки ----
  { id: 'f14', g: 'f', race: 'beast', ears: 'cat', title: 'Кошка-акробатка', names: ['Мурка', 'Тата', 'Мяуна'], skin: '#f0c8a0', hairC: '#e09a4a', hair: 2, eyes: '#c9a02a', outfit: '#9b4a3c' },
  { id: 'f15', g: 'f', race: 'beast', ears: 'fox', title: 'Лиса-торговка', names: ['Рыжинка', 'Алиса', 'Огнеслава'], skin: '#f2d0ae', hairC: '#d0602a', hair: 1, eyes: '#b8862f', outfit: '#4f6b3a' },
  { id: 'f16', g: 'f', race: 'beast', ears: 'rabbit', title: 'Зайчиха-почтальон', names: ['Пушинка', 'Ушана', 'Снежана'], skin: '#f6dcc4', hairC: '#f0ece0', hair: 2, eyes: '#c05a6a', outfit: '#2f4f6b' },
  { id: 'f17', g: 'f', race: 'beast', ears: 'wolf', title: 'Волчица-охотница', names: ['Вьюга', 'Ведана', 'Лютава'], skin: '#d9a47a', hairC: '#4a4a52', hair: 3, eyes: '#c9902a', outfit: '#5a3a2a' },
  { id: 'f18', g: 'f', race: 'beast', ears: 'cat', title: 'Чёрная кошка-гадалка', names: ['Ночка', 'Сажа', 'Багира'], skin: '#e6b890', hairC: '#1f1a22', hair: 1, eyes: '#8ac04a', outfit: '#6b3f6b' },
  { id: 'f19', g: 'f', race: 'beast', ears: 'bear', title: 'Медведица-пекарша', names: ['Медуница', 'Малина', 'Потапиха'], skin: '#e0a882', hairC: '#7a4a2a', hair: 4, eyes: '#5a3a22', outfit: '#b8862f' },
  // ---- женские: гномки ----
  { id: 'f20', g: 'f', race: 'dwarf', title: 'Рунная мастерица', names: ['Хильда', 'Грета', 'Брунгильда'], skin: '#e8b48c', hairC: '#b8482a', hair: 3, eyes: '#4a6a8a', outfit: '#8a3b2e' },
  { id: 'f21', g: 'f', race: 'dwarf', title: 'Ювелирша', names: ['Дагни', 'Ингрид', 'Сигрун'], skin: '#f0c8a0', hairC: '#e0c060', hair: 4, eyes: '#3a7a6a', outfit: '#3e5c5a' },
  { id: 'f22', g: 'f', race: 'dwarf', title: 'Шахтёрская повариха', names: ['Ольда', 'Фрея', 'Гудрун'], skin: '#d9a07a', hairC: '#4a2a1a', hair: 3, eyes: '#5a4030', outfit: '#5a3a2a' },
  { id: 'f23', g: 'f', race: 'dwarf', title: 'Изобретательница', names: ['Тильда', 'Бетти', 'Хельга'], skin: '#f2cfae', hairC: '#7a6a6a', hair: 2, eyes: '#c07a2a', outfit: '#2f4f6b' },
];

const ITEMS = {
  gingerbread: { name: 'Медовый пряник', desc: 'Настроение +15 (сладкоежкам и тем, кто в положении, — вдвое больше)', price: 25 },
  tea: { name: 'Травяной чай', desc: 'Стресс −20', price: 30 },
  tonic: { name: 'Эликсир бодрости', desc: 'Усталость −35', price: 45 },
  salve: { name: 'Целебная мазь', desc: 'Здоровье +30, лечит простуду', price: 55 },
  pie: { name: 'Ягодный пирог', desc: 'Настроение +20, стресс −10. Утоляет любую прихоть', price: 50 },
  book: { name: 'Учебник', desc: '+3 к навыку, который сейчас изучается', price: 80 },
  blanket: { name: 'Пуховое одеяло', desc: 'Дорогой подарок: лояльность +10, настроение +10', price: 90 },
  amulet: { name: 'Амулет удачи', desc: 'Удача +2, потенциал удачи +4 (навсегда)', price: 150 },
};

// rank — минимальный ранг гильдии (индекс в RANKS), stat2 — второй навык (половинный вес)
const ORDER_TEMPLATES = [
  { title: 'Грузчики для обоза', desc: 'Купцу с юга нужны крепкие руки, чтобы разгрузить телеги с солью.', stat: 'str', stat2: 'end', min: 30, days: 1, reward: 140, rank: 0 },
  { title: 'Певец на свадьбу', desc: 'Дочь пекаря выходит замуж — нужен кто-то, кто споёт и не перепутает слова.', stat: 'cha', stat2: 'wil', min: 35, days: 1, reward: 170, rank: 0 },
  { title: 'Переписать летопись', desc: 'Городской архив ищет аккуратного переписчика старых свитков.', stat: 'int', stat2: 'mas', min: 40, days: 2, reward: 260, rank: 0 },
  { title: 'Починить мельничное колесо', desc: 'Колесо скрипит третью неделю. Мельник уже не спит.', stat: 'mas', stat2: 'str', min: 40, days: 2, reward: 280, rank: 0 },
  { title: 'Гонец до Ивового брода', desc: 'Срочное письмо нужно доставить до заката. Дорога петляет.', stat: 'agi', stat2: 'end', min: 35, days: 1, reward: 160, rank: 0 },
  { title: 'Ночная стража склада', desc: 'Три ночи подряд кто-то таскает яблоки. Нужен стойкий сторож.', stat: 'end', stat2: 'wil', min: 35, days: 3, reward: 330, rank: 0 },
  { title: 'Спор с упрямым гоблином', desc: 'Гоблин-ростовщик не отдаёт залог. Требуется железная выдержка.', stat: 'wil', stat2: 'int', min: 40, days: 2, reward: 300, rank: 1 },
  { title: 'Розыгрыш в лотерее гильдии', desc: 'Купить билет и вытянуть счастливый жребий за заказчика. Говорят, удача заразна.', stat: 'luk', stat2: 'cha', min: 30, days: 1, reward: 150, rank: 0 },
  { title: 'Охрана каравана', desc: 'Караван с шёлком идёт через Каменную Падь. Нужен боец.', stat: 'str', stat2: 'agi', min: 50, days: 3, reward: 450, rank: 2, war: true },
  { title: 'Учитель для купеческих детей', desc: 'Научить грамоте и счёту двух непосед.', stat: 'int', stat2: 'cha', min: 50, days: 3, reward: 420, rank: 2 },
  { title: 'Хозяйка бала у бургомистра', desc: 'Встречать гостей, помнить имена и улыбаться до полуночи.', stat: 'cha', stat2: 'int', min: 55, days: 2, reward: 520, rank: 3, fest: true },
  { title: 'Ювелирный заказ графини', desc: 'Огранить три сапфира так, чтобы графиня перестала вздыхать.', stat: 'mas', stat2: 'agi', min: 60, days: 3, reward: 700, rank: 3 },
  { title: 'Разведка у границы', desc: 'Тихо пройти лесом и сосчитать чужие костры.', stat: 'agi', stat2: 'wil', min: 60, days: 3, reward: 680, rank: 4, war: true },
  { title: 'Переговоры с гномьим кланом', desc: 'Кланы спорят о шахте. Нужен тот, кто выдержит четыре часа упрёков.', stat: 'wil', stat2: 'cha', min: 65, days: 3, reward: 820, rank: 4 },
  { title: 'Лекарь в мор', desc: 'Помогать знахарке: варить отвары и не падать с ног.', stat: 'int', stat2: 'end', min: 50, days: 2, reward: 480, rank: 2, plague: true },
  { title: 'Чемпион турнира', desc: 'Выступить за цвета купеческой гильдии на осеннем турнире.', stat: 'str', stat2: 'end', min: 75, days: 3, reward: 1200, rank: 5, fest: true },
];

const RANKS = [
  { key: 'F', rep: 0 }, { key: 'E', rep: 5 }, { key: 'D', rep: 15 }, { key: 'C', rep: 30 },
  { key: 'B', rep: 50 }, { key: 'A', rep: 80 }, { key: 'S', rep: 120 },
];

// Что даёт каждый навык (показывается в карточке)
const STAT_EFF = {
  str: 'ремесло, силовые заказы', agi: 'меньше ошибок, заказы гонцов', end: 'меньше усталости, здоровье',
  int: 'скорость учёбы, торговля', cha: 'торговля, цена продажи', mas: 'ремесло, меньше ошибок',
  wil: 'меньше стресса, упрямство к строгости', luk: 'заказы, находки, удачные сделки',
};

const SEASONS = [
  { name: 'Весна', desc: 'Пора любви: шанс беременности +8%, настроение +3', fert: 0.08, mood: 3 },
  { name: 'Лето', desc: 'Много работы: доход +10%, но усталость +3', inc: 0.1, fat: 3 },
  { name: 'Осень', desc: 'Урожай: еда дешевле на 20%, спрос +10%', food: 0.8, dem: 0.1 },
  { name: 'Зима', desc: 'Холода: дрова +25 мон./день, стресс +2, награды за заказы +15%', heat: 25, stress: 2, ord: 0.15 },
];

// Рыночные события: длятся несколько дней, о них заранее ходят слухи
const MARKET_EVENTS = {
  festival: { name: 'Ярмарка', rumor: 'Скоморохи уже репетируют — говорят, скоро ярмарка.', start: 'Началась ярмарка! Спрос на всех +25%, торговля за прилавком приносит на 20% больше.', days: 3, dem: { all: 0.25 }, shop: 0.2 },
  war: { name: 'Война на границе', rumor: 'С севера тянутся телеги с ранеными. Пахнет войной.', start: 'На границе война. Сильных и выносливых раскупают: гномы и зверолюди в цене, еда дорожает на 30%.', days: 5, dem: { dwarf: 0.3, beast: 0.25, elf: -0.1 }, food: 1.3 },
  plague: { name: 'Мор', rumor: 'В соседней деревне закрыли колодец. Знахарки тревожатся.', start: 'В округе мор. Спрос упал на 20%, легко заболеть — следите за здоровьем.', days: 4, dem: { all: -0.2 }, sick: 0.08 },
  caravan: { name: 'Большой караван', rumor: 'Скоро прибудет караван с востока — готовьте кошельки.', start: 'Пришёл большой караван! На рынке больше предложений, эльфы в цене, покупатели щедрее (+10% при продаже).', days: 3, dem: { elf: 0.3, human: 0.1 }, extra: 4, sell: 0.1 },
  drought: { name: 'Засуха', rumor: 'Третью неделю ни облачка. Мельники хмурятся.', start: 'Засуха: еда дорожает на 60%, ремесло приносит на 15% меньше.', days: 4, food: 1.6, craft: -0.15 },
};
