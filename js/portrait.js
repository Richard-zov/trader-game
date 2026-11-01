// ===== Портреты: векторная заглушка + слот для готового арта =====
// Если существует assets/portraits/<presetId>.png — он показывается вместо векторного лица.
// Аксессуары: если существует assets/accessories/<accId>.png — используется картинка, иначе SVG-слой.
'use strict';

const PORTRAIT_CFG = {
  artDir: 'assets/portraits/',
  accDir: 'assets/accessories/',
  ext: '.png',
  outfitDir: 'assets/outfits/',
  overlayAccessoriesOnArt: false, // поставить true, если арт рисуется без аксессуаров
  bgDir: 'assets/backgrounds/',
  bgCount: 12, // bg01..bg12.jpg — нарезка из sheet1/sheet2 (3×2)
};
// Рост фигуры относительно высоты рамки (полноростовой арт): гномы ниже, медведи крупнее
const FIG_H = { human: { f: .88, m: .93 }, elf: { f: .92, m: .95 }, beast: { f: .89, m: .93 }, dwarf: { f: .70, m: .72 } };
const FIG_OVERRIDE = { m06: .97, f19: .91, f17: .92, f07: .76, f16: .84, f14: .86 };
function figHeight(p) { return FIG_OVERRIDE[p.id] || (FIG_H[p.race] || FIG_H.human)[p.g] || .9; }
function _hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Фон: случайный, но стабильный для пары (персонаж, день)
function bgFor(ch) {
  const day = (typeof S !== 'undefined' && S && S.day) || 1;
  const key = (ch.uid || ch.preset) + ':' + day;
  const n = _hash(key) % PORTRAIT_CFG.bgCount + 1;
  return PORTRAIT_CFG.bgDir + 'bg' + String(n).padStart(2, '0') + '.jpg';
}
const _missing = new Set();

function shade(hex, amt) {
  let n = parseInt(hex.slice(1), 16);
  let r = Math.max(0, Math.min(255, (n >> 16) + amt));
  let g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  let b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const INK = '#3b2616';
const SW = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';

function hairBack(p) {
  const c = p.hairC, d = shade(c, -30);
  switch (p.hair) {
    case 1: return `<path d="M52 92 C48 150 50 200 62 228 L138 228 C150 200 152 150 148 92 C140 50 60 50 52 92Z" fill="${d}" ${SW}/>`;
    case 2: return `<path d="M54 95 C50 130 52 150 60 160 L140 160 C148 150 150 130 146 95 C140 50 60 50 54 95Z" fill="${d}" ${SW}/>`;
    case 3: return `<path d="M140 90 C170 110 168 170 150 205 C146 180 150 140 132 110Z" fill="${d}" ${SW}/>`;
    case 4: return `<circle cx="100" cy="52" r="20" fill="${d}" ${SW}/>`;
    default: return '';
  }
}

function hairFront(p) {
  const c = p.hairC;
  switch (p.hair) {
    case 0: return `<path d="M56 100 C52 60 80 48 102 50 C130 50 150 66 146 100 C140 86 132 80 126 74 C122 86 112 82 104 74 C98 86 84 84 80 76 C72 84 62 90 56 100Z" fill="${c}" ${SW}/>`;
    case 2: return `<path d="M55 110 C48 62 82 48 102 50 C128 50 154 64 146 110 C140 92 136 84 130 78 C118 90 92 92 72 80 C64 88 58 98 55 110Z" fill="${c}" ${SW}/>`;
    case 4: return `<path d="M58 98 C54 62 80 52 100 52 C124 52 148 62 142 98 C134 80 118 72 100 72 C84 72 66 80 58 98Z" fill="${c}" ${SW}/>`;
    default: return `<path d="M54 104 C50 60 80 48 102 50 C128 52 152 64 146 104 C140 84 128 76 118 72 C110 84 96 86 86 78 C80 88 64 92 54 104Z" fill="${c}" ${SW}/>`;
  }
}

function ears(p) {
  const s = p.skin, sd = shade(s, -25);
  if (p.race === 'elf') return `<path d="M60 104 L28 82 L62 122Z" fill="${s}" ${SW}/><path d="M140 104 L172 82 L138 122Z" fill="${s}" ${SW}/>`;
  if (p.race === 'beast') return '';
  return `<ellipse cx="58" cy="110" rx="7" ry="11" fill="${sd}" ${SW}/><ellipse cx="142" cy="110" rx="7" ry="11" fill="${sd}" ${SW}/>`;
}

function animalEars(p) {
  const c = p.hairC, inner = '#f0b8a8';
  switch (p.ears) {
    case 'cat': return `<path d="M62 74 L66 32 L92 58Z" fill="${c}" ${SW}/><path d="M138 74 L134 32 L108 58Z" fill="${c}" ${SW}/><path d="M68 66 L70 44 L84 58Z" fill="${inner}"/><path d="M132 66 L130 44 L116 58Z" fill="${inner}"/>`;
    case 'fox': return `<path d="M60 78 L58 26 L94 58Z" fill="${c}" ${SW}/><path d="M140 78 L142 26 L106 58Z" fill="${c}" ${SW}/><path d="M64 68 L63 38 L84 58Z" fill="#fff4e0"/><path d="M136 68 L137 38 L116 58Z" fill="#fff4e0"/>`;
    case 'wolf': return `<path d="M60 76 L60 34 L92 58Z" fill="${c}" ${SW}/><path d="M140 76 L140 34 L108 58Z" fill="${c}" ${SW}/><path d="M66 68 L66 46 L82 60Z" fill="${shade(c, 40)}"/><path d="M134 68 L134 46 L118 60Z" fill="${shade(c, 40)}"/>`;
    case 'rabbit': return `<path d="M76 60 C64 20 70 0 82 2 C94 6 92 34 90 58Z" fill="${c}" ${SW}/><path d="M124 60 C136 20 130 0 118 2 C106 6 108 34 110 58Z" fill="${c}" ${SW}/><path d="M80 52 C74 26 76 12 82 12 C88 14 88 34 86 52Z" fill="${inner}"/><path d="M120 52 C126 26 124 12 118 12 C112 14 112 34 114 52Z" fill="${inner}"/>`;
    case 'bear': return `<circle cx="66" cy="60" r="15" fill="${c}" ${SW}/><circle cx="134" cy="60" r="15" fill="${c}" ${SW}/><circle cx="66" cy="60" r="7" fill="${inner}"/><circle cx="134" cy="60" r="7" fill="${inner}"/>`;
    default: return '';
  }
}

function face(p) {
  const e = p.eyes, hc = shade(p.hairC, -20);
  const lash = p.g === 'f' ? `<path d="M74 104 L70 100 M126 104 L130 100" ${SW}/>` : '';
  return `
  <g class="eyes-open">
    <ellipse cx="84" cy="112" rx="8" ry="${p.g === 'f' ? 10 : 8.5}" fill="#fffaf0" ${SW}/>
    <ellipse cx="116" cy="112" rx="8" ry="${p.g === 'f' ? 10 : 8.5}" fill="#fffaf0" ${SW}/>
    <circle cx="85" cy="113" r="5.2" fill="${e}"/><circle cx="117" cy="113" r="5.2" fill="${e}"/>
    <circle cx="85" cy="114" r="2.4" fill="#1e140c"/><circle cx="117" cy="114" r="2.4" fill="#1e140c"/>
    <circle cx="87" cy="110" r="1.6" fill="#fff"/><circle cx="119" cy="110" r="1.6" fill="#fff"/>
    ${lash}
  </g>
  <g class="eyes-happy"><path d="M76 114 Q84 104 92 114" fill="none" ${SW}/><path d="M108 114 Q116 104 124 114" fill="none" ${SW}/></g>
  <g class="brows"><path class="brow-l" d="M74 98 Q84 93 93 97" fill="none" stroke="${hc}" stroke-width="3" stroke-linecap="round"/><path class="brow-r" d="M107 97 Q116 93 126 98" fill="none" stroke="${hc}" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M100 120 L98 128 L102 129" fill="none" stroke="${shade(p.skin, -60)}" stroke-width="1.8" stroke-linecap="round"/>
  <g class="blush"><ellipse cx="74" cy="128" rx="9" ry="5" fill="#e8707a" opacity=".55"/><ellipse cx="126" cy="128" rx="9" ry="5" fill="#e8707a" opacity=".55"/>
    <path d="M68 126 l4 -3 M74 127 l4 -3 M120 126 l4 -3 M126 127 l4 -3" stroke="#c04a5a" stroke-width="1.3"/></g>
  <path class="m-neutral" d="M92 138 Q100 141 108 138" fill="none" ${SW}/>
  <path class="m-smile" d="M88 136 Q100 148 112 136 Q100 141 88 136Z" fill="#a8443a" ${SW}/>
  <path class="m-shy" d="M92 139 q4 -3 8 0 q4 3 8 0" fill="none" ${SW}/>
  <ellipse class="m-o" cx="100" cy="140" rx="4.5" ry="5.5" fill="#7a2a2a" ${SW}/>
  <path class="m-frown" d="M91 141 Q100 135 109 141" fill="none" ${SW}/>`;
}

function beard(p) {
  if (!p.beard) return '';
  const c = p.hairC;
  return `<path d="M62 120 C62 160 80 182 100 184 C120 182 138 160 138 120 C130 136 120 142 112 138 C106 146 94 146 88 138 C80 142 70 136 62 120Z" fill="${c}" ${SW}/>
  <path d="M90 134 Q100 130 110 134" fill="none" stroke="${shade(c, -40)}" stroke-width="2"/>`;
}

// ---- аксессуары (векторные слои) ----
const ACC_SVG = {
  cloak: (c) => `<path d="M24 240 C26 180 54 166 72 166 L128 166 C146 166 174 180 176 240Z" fill="${c}" ${SW}/>`,
  scarf: (c) => `<path d="M68 168 C80 184 120 184 132 168 L136 182 C120 198 80 198 64 182Z" fill="${c}" ${SW}/><path d="M118 186 L128 226 L114 228 L108 190Z" fill="${shade(c, -20)}" ${SW}/>`,
  pendant: (c) => `<path d="M78 172 Q100 206 122 172" fill="none" stroke="#b8862f" stroke-width="2"/><path d="M100 196 L108 206 L100 218 L92 206Z" fill="${c}" ${SW}/>`,
  earrings: (c) => `<circle cx="58" cy="128" r="4" fill="#e0b040" ${SW}/><circle cx="142" cy="128" r="4" fill="#e0b040" ${SW}/><circle cx="58" cy="136" r="3" fill="${c}"/><circle cx="142" cy="136" r="3" fill="${c}"/>`,
  glasses: () => `<circle cx="84" cy="112" r="12" fill="#cfe8f0" fill-opacity=".25" stroke="#6a4a2a" stroke-width="2.6"/><circle cx="116" cy="112" r="12" fill="#cfe8f0" fill-opacity=".25" stroke="#6a4a2a" stroke-width="2.6"/><path d="M96 112 L104 112 M72 110 L60 106 M128 110 L140 106" stroke="#6a4a2a" stroke-width="2.6"/>`,
  hat: (c) => `<path d="M30 78 C40 66 160 66 170 78 C160 88 40 88 30 78Z" fill="${shade(c, -15)}" ${SW}/><path d="M60 76 C60 30 140 30 140 76Z" fill="${c}" ${SW}/><path d="M61 66 L139 66 L140 76 L60 76Z" fill="#d8b060" ${SW}/>`,
  beret: (c) => `<path d="M48 74 C40 44 150 34 156 66 C150 82 60 86 48 74Z" fill="${c}" ${SW}/><circle cx="104" cy="44" r="4" fill="${shade(c, -30)}" ${SW}/>`,
  circlet: () => `<path d="M58 84 Q100 70 142 84" fill="none" stroke="#c9a03a" stroke-width="4"/><path d="M100 70 L106 79 L100 88 L94 79Z" fill="#5aa0c0" ${SW}/>`,
  flower: (c) => `<g transform="translate(134 72)"><circle cx="0" cy="-8" r="6" fill="${c}" ${SW}/><circle cx="8" cy="0" r="6" fill="${c}" ${SW}/><circle cx="0" cy="8" r="6" fill="${c}" ${SW}/><circle cx="-8" cy="0" r="6" fill="${c}" ${SW}/><circle r="4" fill="#f0d060" ${SW}/></g>`,
  headband: (c) => `<path d="M56 84 Q100 70 144 84 L144 92 Q100 78 56 92Z" fill="${c}" ${SW}/><path d="M144 86 L160 98 L150 102 Z" fill="${c}" ${SW}/>`,
};

function accLayer(acc) {
  const fn = ACC_SVG[acc.id];
  if (!fn) return '';
  return `<g class="acc acc-${acc.id}" data-acc="${acc.id}">${fn(acc.color)}</g>`;
}

function portraitSVG(p, accs) {
  const back = accs.filter(a => ACCESSORIES[a.id].slot === 'back');
  const neck = accs.filter(a => ACCESSORIES[a.id].slot === 'neck');
  const ears_ = accs.filter(a => a.id === 'earrings');
  const facec = accs.filter(a => a.id === 'glasses');
  const head = accs.filter(a => ACCESSORIES[a.id].slot === 'head');
  const s = p.skin, o = p.outfit;
  const base = `
    <g class="base-layers">
      ${hairBack(p)}
      <path d="M34 240 C38 192 70 172 100 172 C130 172 162 192 166 240Z" fill="${o}" ${SW}/>
      <path d="M78 174 L100 206 L122 174" fill="${shade(o, 30)}" ${SW}/>
      <path d="M86 150 L86 178 Q100 190 114 178 L114 150Z" fill="${shade(s, -18)}" ${SW}/>
      ${ears(p)}
      <ellipse cx="100" cy="112" rx="44" ry="50" fill="${s}" ${SW}/>
      ${face(p)}
      ${beard(p)}
      ${hairFront(p)}
      ${p.race === 'beast' ? animalEars(p) : ''}
    </g>`;
  return {
    back: back.map(accLayer).join(''),
    base,
    front: [...neck, ...ears_, ...facec, ...head].map(accLayer).join(''),
  };
}

// Головные уборы поверх полноростового арта, по положению головы из ART_META
function headOverlays(ch, meta) {
  return (ch.acc || []).map(a => {
    const d = ACCESSORIES[a.id]; if (!d || !d.ov) return '';
    const o = d.ov, w = meta.hw * o.k;
    const x = meta.cx + o.dx * meta.hw;
    const y = meta.top + o.dy * meta.hw * meta.w / meta.h;
    return `<img class="acc-ov acc-ov-${a.id}" src="${PORTRAIT_CFG.accDir}${a.id}.png" alt="" style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${(w * 100).toFixed(2)}%;--r:${o.r}deg" onerror="this.remove()">`;
  }).join('');
}

// Возвращает HTML портрета. size: 'sm' (лицо крупно) | 'lg' (в полный рост на фоне)
function renderPortrait(ch, size, extraClass) {
  const p = presetById(ch.preset);
  const parts = portraitSVG(p, ch.acc);
  const hasOutfit = ch.outfit && OUTFIT_ART[p.id] && OUTFIT_ART[p.id].includes(ch.outfit);
  const key = hasOutfit ? p.id + '_' + ch.outfit : p.id;
  const art = (hasOutfit ? PORTRAIT_CFG.outfitDir : PORTRAIT_CFG.artDir) + key + (size === 'sm' ? '_face' : '') + PORTRAIT_CFG.ext;
  const fh = figHeight(p);
  const onl = `onload="this.closest('.portrait').classList.add('has-art')" onerror="_missing.add(this.getAttribute('src'));this.remove()"`;
  let artImg = '';
  if (!_missing.has(art)) {
    const meta = (typeof ART_META !== 'undefined') && ART_META[key];
    if (size === 'lg' && meta) {
      artImg = `<div class="portrait-art art-lg art-box" data-key="${key}" data-race="${p.race}" style="--fh:${fh};aspect-ratio:${meta.w}/${meta.h}">
        <img class="art-img" src="${art}" alt="" ${onl}>${headOverlays(ch, meta)}</div>`;
    } else {
      artImg = `<img class="portrait-art art-${size}" src="${art}" alt="" style="--fh:${fh}" ${onl}>`;
    }
  }
  const bgHue = { human: '#e9d3a8', elf: '#d6e0c0', beast: '#ecd0a6', dwarf: '#e6c8a8' }[p.race];
  const bg = bgFor(ch);
  return `<div class="portrait portrait-${size} expr-neutral ${extraClass || ''}" data-preset="${p.id}" style="--pbg:${bgHue};--fh:${fh}">
    <div class="portrait-bg" style="background-image:url('${bg}')"></div>
    <svg class="portrait-svg" viewBox="0 0 200 240" aria-hidden="true">
      <g class="sway">${parts.back}<g class="vec-base">${parts.base}</g>${parts.front}</g>
    </svg>${artImg}
  </div>`;
}
