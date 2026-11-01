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
  clumsy: { name: 'Неуклюжесть', desc: 'Шанс ошибки +6%', mult: 0.9 },
  cheerful: { name: 'Весёлый нрав', desc: 'Стресс растёт на 30% медленнее', mult: 1.05 },
  sensitive: { name: 'Ранимость', desc: 'Стресс растёт на 30% быстрее', mult: 0.95 },
  loyal: { name: 'Верность', desc: 'Лояльность растёт в полтора раза быстрее', mult: 1.2 },
  lucky: { name: 'Везение', desc: 'Заказы в таверне удаются чаще', mult: 1.1 },
  gourmet: { name: 'Сладкоежка', desc: 'Угощения действуют вдвое сильнее', mult: 1.0 },
  hardy: { name: 'Крепкое здоровье', desc: 'Почти не болеет', mult: 1.1 },
};

// Аксессуары: иконки нарезаны из листа art_src/acc_sheet1.jpg -> assets/accessories/<id>.png.
// ov — наложение на полноростовой арт (только головные уборы): k — ширина в долях ширины головы,
// dx/dy — смещение центра от макушки в ширинах головы, r — поворот. Без ov аксессуар показывается иконкой.
const ACCESSORIES = {
  hat: { name: 'Шляпа с пером', slot: 'head', ov: { k: 1.75, dx: 0, dy: 0.12, r: 0 } },
  beret: { name: 'Берет', slot: 'head', ov: { k: 1.2, dx: 0.08, dy: 0.08, r: -8 } },
  circlet: { name: 'Обруч с камнем', slot: 'head', ov: { k: 0.95, dx: 0, dy: 0.32, r: 0 } },
  flower: { name: 'Цветок в волосах', slot: 'head', ov: { k: 0.42, dx: 0.36, dy: 0.28, r: 10 } },
  headband: { name: 'Повязка', slot: 'head' },
  bow: { name: 'Кружевной бант', slot: 'head', ov: { k: 0.5, dx: -0.34, dy: 0.12, r: -12 } },
  wreath: { name: 'Венок', slot: 'head', ov: { k: 1.15, dx: 0, dy: 0.1, r: 0 } },
  scarf: { name: 'Шарф', slot: 'neck' },
  pendant: { name: 'Кулон', slot: 'neck' },
  bell: { name: 'Колокольчик', slot: 'neck' },
  earrings: { name: 'Серьги', slot: 'ears' },
  glasses: { name: 'Очки', slot: 'face' },
  cloak: { name: 'Плащ', slot: 'back' },
  belt: { name: 'Пояс с сумкой', slot: 'waist' },
  bracelet: { name: 'Рунный браслет', slot: 'wrist' },
  gloves: { name: 'Перчатки', slot: 'hands' },
};

// Наряды: готовые варианты арта assets/outfits/<preset>_<outfit>.png (персонаж перерисован в одежде, поза та же).
// Пока сделаны не для всех пресетов; у остальных — базовый портрет в белье.
const OUTFITS = {
  peasant: { name: 'Крестьянский наряд' },
  noble: { name: 'Благородный наряд' },
  travel: { name: 'Походный костюм' },
  maid: { name: 'Наряд служанки' },
  robe: { name: 'Мантия чародея' },
  work: { name: 'Рабочий фартук' },
};
const OUTFIT_ART = {
  f01: ['peasant', 'noble', 'travel', 'maid'],
  f08: ['robe', 'travel', 'peasant'],
  f21: ['maid', 'robe', 'work'],
  m07: ['work', 'noble', 'travel'],
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
  gingerbread: { name: 'Медовый пряник', desc: 'Поднимает настроение (+15)', price: 25 },
  tea: { name: 'Травяной чай', desc: 'Снимает стресс (−20)', price: 30 },
  tonic: { name: 'Эликсир бодрости', desc: 'Снимает усталость (−35)', price: 45 },
  book: { name: 'Учебник', desc: '+3 к выбранному навыку обучения', price: 80 },
  cloak: { name: 'Тёплый плащ', desc: 'Дорогой подарок: лояльность +10', price: 90 },
  amulet: { name: 'Амулет удачи', desc: 'Удача +2, потенциал удачи +4', price: 150 },
};

const ORDER_TEMPLATES = [
  { title: 'Грузчики для обоза', desc: 'Купцу с юга нужны крепкие руки, чтобы разгрузить телеги с солью.', stat: 'str', min: 30, days: 1, reward: 140 },
  { title: 'Певец на свадьбу', desc: 'Дочь пекаря выходит замуж — нужен кто-то, кто споёт и не перепутает слова.', stat: 'cha', min: 35, days: 1, reward: 170 },
  { title: 'Переписать летопись', desc: 'Городской архив ищет аккуратного переписчика старых свитков.', stat: 'int', min: 40, days: 2, reward: 260 },
  { title: 'Починить мельничное колесо', desc: 'Колесо скрипит третью неделю. Мельник уже не спит.', stat: 'mas', min: 40, days: 2, reward: 280 },
  { title: 'Гонец до Ивового брода', desc: 'Срочное письмо нужно доставить до заката. Дорога петляет.', stat: 'agi', min: 35, days: 1, reward: 160 },
  { title: 'Ночная стража склада', desc: 'Три ночи подряд кто-то таскает яблоки. Нужен стойкий сторож.', stat: 'end', min: 35, days: 3, reward: 330 },
  { title: 'Спор с упрямым гоблином', desc: 'Гоблин-ростовщик не отдаёт залог. Требуется железная выдержка.', stat: 'wil', min: 40, days: 2, reward: 300 },
  { title: 'Розыгрыш в лотерее гильдии', desc: 'Купить билет и вытянуть счастливый жребий за заказчика. Говорят, удача заразна.', stat: 'luk', min: 30, days: 1, reward: 150 },
  { title: 'Охрана каравана', desc: 'Караван с шёлком идёт через Каменную Падь. Нужен боец.', stat: 'str', min: 50, days: 3, reward: 450 },
  { title: 'Учитель для купеческих детей', desc: 'Научить грамоте и счёту двух непосед.', stat: 'int', min: 50, days: 3, reward: 420 },
];
