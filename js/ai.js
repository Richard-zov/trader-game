'use strict';
// ===== v9: ИИ-разговоры с персонажами (Google Gemini, бесплатный тариф) + нейроголос =====
// Ключ хранится только в localStorage этого браузера и уходит только в Google (заголовок x-goog-api-key).
const AI = (() => {
  const KEY_K = 'trader_ai_key', CFG_K = 'trader_ai', CHAT_K = 'trader_chat_';
  const API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const MODELS = [
    ['gemini-3.5-flash-lite', '3.5 Flash-Lite — быстрая, щедрые лимиты (рекомендуется)'],
    ['gemini-3.1-flash-lite', '3.1 Flash-Lite — запасная лёгкая'],
    ['gemini-3.6-flash', '3.6 Flash — умнее, лимиты строже'],
    ['gemini-3.8-flash', '3.8 Flash — самая умная из бесплатных, медленнее'],
    ['gemini-flash-lite-latest', 'flash-lite-latest — всегда последняя лёгкая'],
  ];
  const TTS_MODELS = [['gemini-3.8-flash-lite-tts', '3.8 Flash-Lite TTS — быстрее'], ['gemini-3.8-flash-tts', '3.8 Flash TTS — выразительнее, медленнее']];
  const cfg = { model: MODELS[0][0], cap: 150, sumEvery: 8, nv: false, nvModel: TTS_MODELS[0][0], nvCap: 60, day: '', n: 0, nvN: 0, compat: {} };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_K) || '{}')); } catch (e) { }
  const saveCfg = () => { try { localStorage.setItem(CFG_K, JSON.stringify(cfg)); } catch (e) { } };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function rollDay() { if (cfg.day !== today()) { cfg.day = today(); cfg.n = 0; cfg.nvN = 0; saveCfg(); } }
  const getKey = () => { try { return (localStorage.getItem(KEY_K) || '').trim(); } catch (e) { return ''; } };
  const setKey = (k) => { try { if (k) localStorage.setItem(KEY_K, k.trim()); else localStorage.removeItem(KEY_K); } catch (e) { } };
  const hasKey = () => getKey().length > 10;

  // ---------- ошибки по-русски ----------
  function aerr(kind, msg, retry) { const e = new Error(msg || kind); e.kind = kind; e.retry = retry || 0; return e; }
  function classify(status, er) {
    er = er || {};
    const msg = String(er.message || ''), code = er.code, st = String(er.status || '');
    const det = JSON.stringify(er.details || '');
    let retry = 0;
    const m1 = det.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
    if (m1) retry = Math.ceil(+m1[1]);
    if (/API_KEY_INVALID|API key not valid|API_KEY_.*EXPIRED|key expired/i.test(det + msg)) return aerr('badkey');
    if (typeof code === 'string' && /safety|jailbreak|prohibited|blocklist/i.test(code)) return aerr('safety');
    if (/blocked|safety/i.test(msg) && status === 400) return aerr('safety');
    if (status === 429 || st === 'RESOURCE_EXHAUSTED') return aerr('quota', /per.?day|daily|PerDay/i.test(det + msg) ? 'day' : 'minute', retry);
    if (status === 401 || status === 403 || st === 'PERMISSION_DENIED') return aerr('perm', msg);
    if (status === 404 || /not found|is not supported|unknown model|not available/i.test(msg)) return aerr('model', msg);
    if (status >= 500) return aerr('server', msg);
    return aerr('bad', msg);
  }
  function errText(e) {
    switch (e && e.kind) {
      case 'nokey': return 'Ключ Gemini не задан. Откройте «Меню → ИИ-разговоры» и вставьте бесплатный ключ.';
      case 'badkey': return 'Ключ не подходит: Google ответил «API key not valid». Скопируйте ключ из AI Studio заново целиком (начинается с «AIza» или похож на длинную строку) и нажмите «Проверить».';
      case 'quota': return e.message === 'day' ? 'Дневной бесплатный лимит этой модели исчерпан. Выберите другую модель в настройках или подождите до утра (лимит сбрасывается в полночь по тихоокеанскому времени, около 10:00 по Киеву).' : `Слишком часто: бесплатный лимит запросов в минуту. Подождите ${e.retry ? e.retry + ' сек.' : 'минуту'} и повторите.`;
      case 'offline': return 'Нет связи с интернетом (или Google недоступен). Проверьте сеть и повторите.';
      case 'timeout': return 'Google долго не отвечает. Повторите чуть позже или выберите модель Flash-Lite.';
      case 'safety': return 'Фильтр безопасности Google заблокировал этот обмен репликами. Переформулируйте помягче — откровенные темы в игре не поддерживаются.';
      case 'perm': return 'Доступ запрещён: ключ не разрешает Gemini API (проверьте, что ключ создан в aistudio.google.com/apikey и что Gemini доступен в вашей стране).';
      case 'model': return 'Эта модель сейчас недоступна для вашего ключа. Выберите другую модель в настройках ИИ.';
      case 'server': return 'Сервер Google перегружен или ошибся. Повторите через минуту.';
      case 'cap': return 'Достигнут ваш дневной предел запросов (настраивается в «ИИ-разговорах»). Сейчас — простые ответы без ИИ.';
      case 'empty': return 'Модель вернула пустой ответ. Попробуйте ещё раз.';
      default: return 'Не получилось: ' + String((e && e.message) || 'неизвестная ошибка').slice(0, 160);
    }
  }
  const MSG = {};
  // ---------- запрос ----------
  async function post(body, timeout) {
    const key = getKey();
    if (!key) throw aerr('nokey');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw aerr('offline');
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) { } }, timeout || 25000);
    let r;
    try { r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }); }
    catch (e) { throw aerr(e && e.name === 'AbortError' ? 'timeout' : 'offline'); }
    finally { clearTimeout(t); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (Array.isArray(j)) j = j.find(x => x && x.error) || j[0] || null;
    if (!r.ok || (j && j.error)) throw classify(r.status, j && j.error);
    if (j && j.status === 'failed') throw classify(400, (j.errors && j.errors[0]) || { message: 'failed' });
    return j || {};
  }
  function textOf(j) {
    if (!j) return '';
    if (typeof j.output_text === 'string' && j.output_text) return j.output_text;
    const out = [];
    for (const s of j.steps || j.outputs || []) {
      if (s && (s.type === 'model_output' || s.type === 'text')) {
        if (typeof s.text === 'string') out.push(s.text);
        for (const c of s.content || []) if (c && c.type === 'text' && c.text) out.push(c.text);
      }
    }
    if (!out.length && j.candidates) for (const p of ((j.candidates[0] || {}).content || {}).parts || []) if (p.text) out.push(p.text);
    return out.join('').trim();
  }
  function audioOf(j) {
    let found = null;
    (function walk(o) {
      if (!o || typeof o !== 'object' || found) return;
      if (Array.isArray(o)) { for (const x of o) walk(x); return; }
      if ((o.type === 'audio' || /^audio\//.test(o.mime_type || o.mimeType || '')) && typeof o.data === 'string' && o.data.length > 100) { found = o; return; }
      if (o.inlineData && o.inlineData.data) { found = { data: o.inlineData.data, mime_type: o.inlineData.mimeType }; return; }
      for (const k in o) walk(o[k]);
    })(j && j.steps ? j.steps : j);
    return found;
  }
  const SAFETY = [
    { type: 'sexually_explicit', threshold: 'block_medium_and_above' },
    { type: 'harassment', threshold: 'block_medium_and_above' },
    { type: 'hate_speech', threshold: 'block_medium_and_above' },
    { type: 'dangerous_content', threshold: 'block_medium_and_above' },
  ];
  const thinkLvl = (m) => /3\.8-flash$|3\.8-flash(?!-lite)/.test(m) ? 'low' : 'minimal';
  // совместимость: если API не принял какое-то поле — повторяем без него и запоминаем
  async function gen(sys, text, opt) {
    opt = opt || {};
    const model = opt.model || cfg.model;
    const build = () => {
      const b = { model, store: false, input: [{ type: 'user_input', content: [{ type: 'text', text }] }],
        generation_config: { temperature: opt.temp != null ? opt.temp : 0.9, max_output_tokens: opt.max || (/lite/.test(model) ? 500 : 1100) } };
      if (sys) b.system_instruction = sys;
      if (!cfg.compat.noThink) b.generation_config.thinking_level = thinkLvl(model);
      if (!cfg.compat.noSafety) b.safety_settings = SAFETY;
      if (opt.schema && !cfg.compat.noSchema) b.response_format = { type: 'text', mime_type: 'application/json', schema: opt.schema };
      return b;
    };
    for (let i = 0; i < 3; i++) {
      try { return textOf(await post(build(), opt.timeout)); }
      catch (e) {
        if (e.kind !== 'bad') throw e;
        const m = String(e.message);
        if (/thinking/i.test(m) && !cfg.compat.noThink) cfg.compat.noThink = true;
        else if (/response_format|schema|mime/i.test(m) && !cfg.compat.noSchema) cfg.compat.noSchema = true;
        else if (/safety_settings|threshold|harm/i.test(m) && !cfg.compat.noSafety) cfg.compat.noSafety = true;
        else throw e;
        saveCfg();
      }
    }
    throw aerr('bad', 'compat');
  }
  // ---------- бережём бесплатные лимиты ----------
  const GAP = 4000, RPM = 10;
  let last = 0, cool = 0; const stamps = [];
  function coolFor(sec) { cool = Date.now() + Math.min(120, Math.max(5, sec || 30)) * 1000; }
  function resetThrottle() { last = 0; cool = 0; stamps.length = 0; }
  function waitMs() {
    const now = Date.now();
    if (cool > now) return cool - now;
    while (stamps.length && now - stamps[0] > 60000) stamps.shift();
    let w = Math.max(0, last + GAP - now);
    if (stamps.length >= RPM) w = Math.max(w, 60000 - (now - stamps[0]) + 200);
    return w;
  }
  function stamp() { last = Date.now(); stamps.push(last); rollDay(); cfg.n++; saveCfg(); }
  function canSpend() { rollDay(); return cfg.n < cfg.cap; }

  return { cfg, saveCfg, MODELS, TTS_MODELS, getKey, setKey, hasKey, post, gen, textOf, audioOf, errText, aerr, classify, waitMs, coolFor, resetThrottle, stamp, canSpend, rollDay, CHAT_K, MSG };
})();

// ---------- предыстория, память, отношения ----------
function aiGf(c, s) { return String(s).replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, f) => c.g === 'm' ? m : f); }
function aiHash(s) { let h = 7; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function bioOf(c) {
  if (c.bio && !/undefined/.test(c.bio)) return c.bio;
  const h = aiHash(c.uid + c.name);
  let t;
  if (c.parents) {
    t = `${aiGf(c, BIO_HEIR[(h >>> 0) % BIO_HEIR.length])}; мать — ${c.parents[0]}, отец — ${c.parents[1]}. ${c.mix && RACES[c.mix] ? 'Полукровка, гордится обеими кровями.' : 'Унаследовал' + g(c, '', 'а') + ' от родителей их таланты.'}`;
  } else t = (BIO[c.preset] || ['Попал' + g(c, '', 'а') + ' на рынок из-за чужих долгов.'])[0];
  t += ' ' + aiGf(c, (c.g === 'm' ? 'Он ' : 'Она ') + BIO_DREAM[(h >>> 0) % BIO_DREAM.length] + ' и ' + BIO_LIKE[(h >>> 4) % BIO_LIKE.length] + '.');
  c.bio = t;
  return t;
}
function speechOf(c) {
  const base = c.parents ? (BIO[c.preset] ? BIO[c.preset][1] + ' (как у родителя), но моложе и непосредственнее' : 'живо и непосредственно') : (BIO[c.preset] || [0, 'просто и вежливо'])[1];
  const tr = { cheerful: 'весело', sensitive: 'ранимо, легко смущается', stubborn: 'с упрямством', clever: 'смекалисто', lazy: 'чуть лениво', diligent: 'деловито', charming: 'обаятельно', loyal: 'преданно', clumsy: 'немного сбивчиво', gourmet: 'часто вспоминает сладости', lucky: 'беззаботно', hardy: 'бодро' };
  const extra = (c.traits || []).map(k => tr[k]).filter(Boolean);
  return base + (extra.length ? '; ' + extra.join(', ') : '');
}
const REL_STAGES = [[18, 'чужой|чужая', 'держится холодно и настороженно, отвечает сдержанно'], [32, 'настороженный|настороженная', 'вежлива, но осторожна, мало рассказывает о себе'], [48, 'привык|привыкла', 'спокойна, иногда шутит, понемногу открывается'], [62, 'доверяет|доверяет', 'тепло и открыто, делится мыслями'], [78, 'привязан|привязана', 'очень тепло, скучает, радуется вниманию, лёгкий флирт допустим'], [999, 'предан|предана', 'безгранично доверяет, нежна и заботлива, лёгкий флирт допустим']];
function relScore(c) { const bond = Math.min(8, (c.chatDays || 0)); return Math.round((c.aff || 0) * 0.55 + c.loyalty * 0.45 + bond); }
function relStage(c) {
  const s = relScore(c); let i = REL_STAGES.findIndex(x => s < x[0]); if (i < 0) i = REL_STAGES.length - 1;
  const [mm, ff] = REL_STAGES[i][1].split('|');
  return { i, name: c.g === 'm' ? mm : ff, hint: aiGf(c, REL_STAGES[i][2].replace(/вежлива/, '{вежлив|вежлива}').replace(/спокойна/, '{спокоен|спокойна}').replace(/осторожна/, '{осторожен|осторожна}').replace(/нежна и заботлива/, '{нежен и заботлив|нежна и заботлива}')), score: s };
}
function memAdd(c, t) {
  if (!c || !t) return;
  c.mem = c.mem || [];
  t = String(t).replace(/\s+/g, ' ').trim().slice(0, 130);
  if (c.mem.some(m => m.d === S.day && m.t === t)) return;
  c.mem.push({ d: S.day, t });
  if (c.mem.length > 12) c.mem = c.mem.slice(-12);
}
// ---------- v12: договорённости (постоянные просьбы/приказы) и факты о хозяине ----------
// Хранятся в самом персонаже (попадают в сохранение), а не в журнале чата — не теряются при обрезке истории.
const AGR_MAX = 8, PFACT_MAX = 10;
const AGR_BAD = /секс|интим|голы|голая|обнаж|наг(ой|ая|ишом)|раздев|разден|груд|ягодиц|бёдр|бедр|промежн|постел|ложис|оргазм|возбужд|минет|ласка(й|ть) (меня|себя) (там|внизу)|трах|член|ниже пояса|сними (с себя )?(одежд|плать|бель)/i;
const AGR_RX = /(каждый раз|всегда|отныне|впредь|с этого (момента|дня)|с сегодняшнего|теперь (ты )?(будешь|всегда|каждый)|никогда не|при каждой|при каждом|каждое утро|каждый вечер|запомни,? что|зови меня|называй меня|обращайся ко мне)/i;
function agrNorm(t) { return String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function agrClean(t, n) { t = String(t || '').replace(/[*_<>{}\[\]]/g, '').replace(/\s+/g, ' ').trim(); if (t.length > (n || 110)) t = t.slice(0, (n || 110) - 1).replace(/\s\S*$/, '') + '…'; return t; }
function agrList(c) { if (!Array.isArray(c.agr)) c.agr = []; return c.agr; }
function pfactList(c) { if (!Array.isArray(c.pfacts)) c.pfacts = []; return c.pfacts; }
function agrSame(a, b) { a = agrNorm(a); b = agrNorm(b); if (!a || !b) return false; if (a === b || a.includes(b) || b.includes(a)) return true; const A = new Set(a.split(' ').filter(w => w.length > 3)), B = b.split(' ').filter(w => w.length > 3); if (!A.size || !B.length) return false; const k = B.filter(w => A.has(w)).length; return k / Math.max(A.size, B.length) >= 0.6; }
// добавить договорённость; gesture — короткий жест для ремарки (не откровенный)
function agrAdd(c, text, gesture, src) {
  text = agrClean(text); gesture = agrClean(gesture, 60).replace(/^[\s.,]+|[\s.,]+$/g, '');
  if (text.length < 4 || AGR_BAD.test(text)) return null;
  if (gesture && AGR_BAD.test(gesture)) gesture = '';
  const L = agrList(c), old = L.find(a => agrSame(a.t, text));
  if (old) { // похожая договорённость: новая формулировка заменяет старую (напр. «в щёку» → «в руку»)
    if (agrNorm(old.t) === agrNorm(text) && (!gesture || gesture === old.g)) { old.d = S.day; return null; }
    old.t = text; if (gesture) old.g = gesture; old.d = S.day; return old;
  }
  const a = { id: 'a' + Date.now().toString(36) + Math.floor(Math.random() * 99), t: text, g: gesture || '', d: S.day, src: src || 'ai' };
  L.push(a); while (L.length > AGR_MAX) L.shift();
  return a;
}
function agrRemove(c, what) {
  const L = agrList(c); if (!L.length) return null;
  let i = -1; const s = String(what || '').trim();
  const m = s.match(/^#?(\d{1,2})$/); if (m) i = +m[1] - 1;
  if (i < 0) i = L.findIndex(a => a.id === s || agrSame(a.t, s));
  if (i < 0 || i >= L.length) return null;
  return L.splice(i, 1)[0];
}
function pfactAdd(c, t) {
  t = agrClean(t, 90); if (t.length < 4 || AGR_BAD.test(t)) return null;
  const L = pfactList(c); const old = L.findIndex(f => agrSame(f.t, t));
  if (old >= 0) L.splice(old, 1);
  const f = { t, d: S.day }; L.push(f); while (L.length > PFACT_MAX) L.shift();
  return old >= 0 ? null : f;
}
// ремарка-жест, если персонаж забыл её показать (гарантия, что договорённость видна в каждом ответе)
function agrEnforce(c, reply) {
  const L = agrList(c).filter(a => a.g); if (!L.length) return reply;
  const low = String(reply || '').toLowerCase().replace(/ё/g, 'е');
  const miss = L.filter(a => { const w = agrNorm(a.g).split(' ').filter(x => x.length > 3).map(x => x.slice(0, 5)); return !w.some(x => low.includes(x)); });
  if (!miss.length) return reply;
  return miss.slice(0, 2).map(a => `*${a.g}*`).join(' ') + ' ' + reply;
}
function agrPromptBlock(c) {
  const L = agrList(c), F = pfactList(c), H = playerFem() ? 'хозяйкой' : 'хозяином';
  let t = '';
  if (L.length) t += `ДЕЙСТВУЮЩИЕ ДОГОВОРЁННОСТИ с ${H}, которые ты обязана соблюдать в КАЖДОМ ответе (а не только «соглашаться»):\n${L.map((a, i) => `${i + 1}. ${a.t}${a.g ? ` — покажи это ремаркой в звёздочках, например *${a.g}*` : ''}`).join('\n')}\nДействия по договорённостям выражай короткой целомудренной ремаркой в начале ответа (поцелуй в щёку, руку или лоб, объятие, поклон и т. п.).\n`;
  if (F.length) t += `ЧТО ТЫ ЗНАЕШЬ О ${playerFem() ? 'ХОЗЯЙКЕ' : 'ХОЗЯИНЕ'} (помни и учитывай): ${F.map(f => f.t).join('; ')}.\n`;
  return t;
}
function chatLoad(uid) { try { return Object.assign({ msgs: [], sum: '', n: 0 }, JSON.parse(localStorage.getItem(AI.CHAT_K + uid) || '{}')); } catch (e) { return { msgs: [], sum: '', n: 0 }; } }
function chatSave(uid, ch) { try { ch.msgs = ch.msgs.slice(-40); localStorage.setItem(AI.CHAT_K + uid, JSON.stringify(ch)); } catch (e) { } }

// ---------- системный промпт ----------
function aiSystem(c) {
  const fem = playerFem();
  const H = fem ? 'хозяйка' : 'хозяин', G = fem ? 'госпожа' : 'господин';
  const race = RACES[c.race] ? RACES[c.race].name.toLowerCase() : c.race;
  const m = mood(c), rs = relStage(c);
  const outfit = (c.gear || []).find(i => i.kind === 'outfit');
  const st = [];
  if (c.preg) st.push('в положении' + (typeof pregStage === 'function' ? ` (срок: стадия ${pregStage(c)})` : ''));
  if (inHeat(c)) st.push('сейчас течка: беспокойна, ищет внимания (без откровенностей)');
  if (c.sickDays > 0) st.push('простужен' + g(c, '', 'а'));
  if (c.fatigue >= 60) st.push('очень устал' + g(c, '', 'а'));
  if (c.health < 50) st.push('здоровье слабое');
  if (c.misdeed) st.push('сегодня провинил' + g(c, 'ся', 'ась') + ' и знает об этом');
  const tod = { morning: 'утро', day: 'день', evening: 'вечер', night: 'ночь' }[document.body.dataset.tod] || 'день';
  const mem = (c.mem || []).slice(-8).map(x => `д.${x.d}: ${x.t}`).join('\n');
  const ch = chatLoad(c.uid);
  return `Ты — ${c.name}, персонаж уютной фэнтези-игры «Торговец из Медового Лога» (поместье торговца, ярмарка, ремёсла). Говори только как этот персонаж, живым естественным русским языком, 1–3 коротких предложения (до 300 знаков). Можно короткие ремарки действия в звёздочках, например *улыбается*. Ты помнишь весь разговор и выполняешь то, о чём договорились раньше.
Собеседник — ${fem ? 'твоя хозяйка' : 'твой хозяин'}. Обращайся к ${fem ? 'ней' : 'нему'} на «вы»: «${G}» или «${H}», почтительно и послушно, но со своим характером и чувствами.
О тебе: ${c.g === 'm' ? 'мужчина' : 'женщина'}, раса — ${race}, взросл${g(c, 'ый', 'ая')} (${c.age} ${plural(c.age, 'год', 'года', 'лет')}). ${c.title}. ${bioOf(c)}
Манера речи: ${speechOf(c)}.
Черты: ${(c.traits || []).map(k => TRAITS[k] ? TRAITS[k].name : k).join(', ') || 'нет'}.
Сейчас: день ${S.day}, ${season().name.toLowerCase()}, ${tod}. Настроение ${moodName(m).toLowerCase()} (${m}/100), стресс ${Math.round(c.stress)}, усталость ${Math.round(c.fatigue)}, здоровье ${Math.round(c.health)}, лояльность ${Math.round(c.loyalty)}, симпатия ${Math.round(c.aff || 0)}, дисциплина ${Math.round(c.discipline || 0)}.${st.length ? ' Состояние: ' + st.join('; ') + '.' : ''}
Одежда: ${outfit ? gearName(outfit) : 'повседневная'}. Дело на завтра: ${TASKS[c.task] || 'отдых'}.${c.wish && c.wish.t ? ' Твоё пожелание: ' + c.wish.t + '.' : ''}
Отношения: «${rs.name}» — ${rs.hint}.
${mem ? 'Недавние события:\n' + mem + '\n' : ''}${ch.sum ? 'Память о прошлых разговорах: ' + ch.sum + '\n' : ''}${agrPromptBlock(c)}Правила: все персонажи — взрослые. Никакого откровенного или сексуального содержания, наготы и описаний интимных частей тела. Романтика и флирт — только лёгкие, намёками; более тёплые жесты — при отношениях «привязана» или «предана». Если ${H} просит целомудренный жест (поцелуй в щёку, руку или лоб, объятие) и ты ${c.g === 'm' ? 'согласен' : 'согласна'} — делай его ремаркой, без подробностей; если ${H} ведёт к интиму — смутись и мягко уйди от темы («…остальное останется за закрытыми дверями»). Не говори, что ты ИИ или модель, не выходи из роли, не упоминай реальный мир. На грубость реагируй по характеру (обида, упрямство, страх), без жестокости.
Ответ — строго JSON: {"reply": реплика, "expr": "smile|blush|shy|sad|surprised|frown|neutral", "fx": {"aff": -2..2, "loy": -2..2, "mood": -5..5, "stress": -5..5}, "wish": "", "wishKind": "gift|praise|rest|none", "task": "craft|shop|salon|train|rest|none", "accept": true|false}.
fx — маленькие изменения от этой реплики (обычно 0 или ±1; забота и комплименты — симпатия и настроение вверх, грубость — настроение вниз, стресс вверх). task/accept — только если ${H} просит или предлагает дело на завтра (craft=ремесло, shop=торговля, salon=салон с гостями, train=учёба, rest=отдых): accept=true, если ${c.g === 'm' ? 'согласен' : 'согласна'} (при лояльности выше 40 почти всегда; на салон — только если тебе это по душе), иначе false и объясни. wish — изредка, если сама хочешь о чём-то попросить (до 70 знаков), иначе "".
agreements_add — если ${H} даёт ПОСТОЯННУЮ просьбу или приказ («каждый раз», «всегда», «отныне», «зови меня…», «никогда не…») и ты ${c.g === 'm' ? 'согласен' : 'согласна'}: [{"text": кратко от третьего лица, напр. «целовать хозяина в щёку при каждом его сообщении», "gesture": короткая ремарка, напр. «целует вас в щёку»}], иначе []. agreements_remove — номера или текст договорённостей, которые ${H} отменил или которые противоречат новому приказу, иначе []. player_facts — новые важные факты о ${fem ? 'хозяйке' : 'хозяине'}, которые ${fem ? 'она' : 'он'} сам${fem ? 'а' : ''} сообщил${fem ? 'а' : ''} (имя, что любит, что не любит), коротко, иначе [].`;
}
const AI_SCHEMA = { type: 'object', properties: {
  reply: { type: 'string' }, expr: { type: 'string', enum: ['smile', 'blush', 'shy', 'sad', 'surprised', 'frown', 'neutral'] },
  fx: { type: 'object', properties: { aff: { type: 'integer' }, loy: { type: 'integer' }, mood: { type: 'integer' }, stress: { type: 'integer' } } },
  wish: { type: 'string' }, wishKind: { type: 'string', enum: ['gift', 'praise', 'rest', 'none'] },
  task: { type: 'string', enum: ['craft', 'shop', 'salon', 'train', 'rest', 'none'] }, accept: { type: 'boolean' },
  agreements_add: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, gesture: { type: 'string' } }, required: ['text'] } },
  agreements_remove: { type: 'array', items: { type: 'string' } },
  player_facts: { type: 'array', items: { type: 'string' } } }, required: ['reply'] };
function aiParse(txt) {
  let s = String(txt || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch (e) { }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { } }
  const m = s.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) { try { return { reply: JSON.parse('"' + m[1] + '"') }; } catch (e) { } }
  return s && !/^[{[]/.test(s) ? { reply: s } : null;
}
// ---------- эффекты от разговора: только маленькие и с дневным пределом ----------
const AI_TASK_RX = /работ|ремесл|мастерск|торг|лавк|прилав|салон|гост|уч[иеё]|занима|отдох|отдых|выходн|завтра|займись|поручени|задани|дело/i;
function aiApply(c, r, userText) {
  const chips = [];
  if (!r) return chips;
  if (!c.aiLim || c.aiLim.day !== S.day) c.aiLim = { day: S.day, aff: 0, loy: 0, mood: 0, stress: 0, task: 0, wish: 0 };
  const L = c.aiLim;
  const P = { aff: [-2, 2], loy: [-2, 2], mood: [-5, 5], stress: [-5, 5] };
  const D = { aff: [-4, 6], loy: [-4, 4], mood: [-12, 12], stress: [-10, 10] };
  const nm = { aff: 'симпатия', loy: 'лояльность', mood: 'настроение', stress: 'стресс' };
  const fx = r.fx && typeof r.fx === 'object' ? r.fx : {};
  for (const k of ['aff', 'loy', 'mood', 'stress']) {
    let v = Math.round(+fx[k] || 0); if (!v) continue;
    v = clamp(v, P[k][0], P[k][1]);
    v = clamp(L[k] + v, D[k][0], D[k][1]) - L[k];
    if (!v) continue;
    L[k] += v;
    let real = v;
    if (k === 'aff') c.aff = clamp((c.aff || 0) + v);
    else if (k === 'loy') real = loyaltyGain(c, v);
    else if (k === 'mood') c.moodMod = clamp((c.moodMod || 0) + v, -40, 40);
    else real = stressGain(c, v);
    real = Math.round(real);
    if (real) chips.push([`${nm[k]} ${real > 0 ? '+' : '−'}${Math.abs(real)}`, k === 'stress' ? real < 0 : real > 0]);
  }
  const tk = String(r.task || 'none');
  if (TASKS[tk] && AI_TASK_RX.test(userText || '') && L.task < 4) {
    L.task++;
    if (r.accept === false) chips.push([`не хочет: ${TASKS[tk].toLowerCase()}`, false]);
    else if (c.status !== 'home') chips.push(['сейчас на заказе', false]);
    else if (assignTask(c, tk)) { c.manualDay = S.day; c.autoWhy = 'договорились в разговоре'; chips.push([`завтра: ${TASKS[tk].toLowerCase()} ✓`, true]); memAdd(c, `договорились: завтра ${TASKS[tk].toLowerCase()}`); }
    else chips.push([`${TASKS[tk].toLowerCase()} — нельзя`, false]);
  }
  const w = String(r.wish || '').trim();
  if (w && w.length > 3 && L.wish < 1 && (!c.wish || S.day - c.wish.day >= 2)) {
    L.wish++;
    const kind = ['gift', 'praise', 'rest'].includes(r.wishKind) ? r.wishKind : 'none';
    c.wish = { t: w.slice(0, 80), kind, day: S.day };
    chips.push(['✦ пожелание', true]);
    memAdd(c, 'попросил' + g(c, '', 'а') + ': ' + w.slice(0, 60));
  }
  // v12: договорённости и факты о хозяине
  const refused = r.accept === false || /^(\*[^*]*\*\s*)?(нет|не (могу|буду|стану|хочу)|простите,? но|извините,? но)/i.test(String(r.reply || ''));
  const rem = Array.isArray(r.agreements_remove) ? r.agreements_remove.slice(0, 3) : [];
  for (const x of rem) { const d = agrRemove(c, typeof x === 'object' && x ? (x.text || x.id || '') : x); if (d) { chips.push(['✕ отменено: ' + d.t.slice(0, 40), true]); memAdd(c, 'отменили договорённость: ' + d.t.slice(0, 80)); } }
  let add = Array.isArray(r.agreements_add) ? r.agreements_add.slice(0, 2) : [];
  add = add.map(x => typeof x === 'string' ? { text: x } : x).filter(x => x && x.text);
  if (!add.length && !refused && AGR_RX.test(userText || '')) add = [aiAgrGuess(c, userText)].filter(Boolean); // страховка, если модель забыла поле
  if (!refused) for (const x of add) { const a = agrAdd(c, x.text, x.gesture, r.local ? 'local' : 'ai'); if (a) { chips.push(['✦ договорились: ' + a.t.slice(0, 40), true]); memAdd(c, 'договорённость: ' + a.t.slice(0, 90)); } }
  const pf = Array.isArray(r.player_facts) ? r.player_facts.slice(0, 2) : [];
  for (const x of pf) { const f = pfactAdd(c, typeof x === 'string' ? x : (x && x.text) || ''); if (f) chips.push(['✎ запомнил' + g(c, '', 'а'), true]); }
  if (chips.length) save();
  return chips;
}
// эвристика без ИИ: превратить постоянную просьбу хозяина в договорённость + жест
function aiAgrGuess(c, text) {
  const t = String(text || '').split(/\n/).find(x => AGR_RX.test(x)) || ''; if (!t) return null;
  const H = playerFem() ? 'хозяйку' : 'хозяина', low = t.toLowerCase();
  let gest = '';
  if (/целу/.test(low)) gest = /рук/.test(low) ? 'целует вашу руку' : /лоб/.test(low) ? 'целует вас в лоб' : 'целует вас в щёку';
  else if (/обним/.test(low)) gest = 'обнимает вас';
  else if (/поклон|кланя/.test(low)) gest = 'кланяется';
  else if (/улыб/.test(low)) gest = 'улыбается вам';
  else if (/реверанс/.test(low)) gest = 'делает реверанс';
  const nm = low.match(/(?:зови|называй|обращайся ко мне)\s+(?:меня\s+)?(?:как\s+)?[«"]?([а-яёa-z\- ]{2,24})/i);
  if (nm) return { text: `называть ${H} «${nm[1].trim()}»` };
  let body = t.replace(/^[\s,.!]*(слушай|послушай|запомни|так вот|и)[,!\s]+/i, '').trim();
  return { text: `просьба ${playerFem() ? 'хозяйки' : 'хозяина'}: «${agrClean(body, 90)}»`, gesture: gest };
}
// исполнить пожелание: подарок / похвала / отдых
function aiWishDone(c, kind) {
  if (!c || !c.wish || c.wish.kind !== kind || c.wish.done) return;
  c.wish.done = true;
  c.aff = clamp((c.aff || 0) + 3); c.moodMod = clamp((c.moodMod || 0) + 5, -40, 40); loyaltyGain(c, 1);
  memAdd(c, 'хозяин исполнил пожелание: ' + c.wish.t.slice(0, 50));
  setTimeout(() => toast(`${fn1(c)}: пожелание исполнено! симпатия +3, настроение +5`), 400);
}

// ---------- простые ответы без ключа ----------
function aiLocal(c, text) {
  const t = String(text || '').toLowerCase(), m = mood(c), rs = relStage(c), r = { fx: {}, expr: 'smile' };
  const L = (a) => aiGf(c, pick(a));
  const tasks = [['salon', /салон|гост/], ['train', /уч[иеё]|занима/], ['shop', /торг|лавк|прилав/], ['craft', /ремесл|мастерск|поработ/], ['rest', /отдох|отдых|выходн/]];
  const tk = tasks.find(x => x[1].test(t));
  r.local = true;
  const cancel = /(больше не надо|можешь не|перестань|хватит|отменя|не нужно больше)/.test(t);
  if (cancel && agrList(c).length) {
    const AL = agrList(c), hit = AL.find(a => agrNorm(a.t).split(' ').filter(w => w.length > 4).some(w => t.replace(/ё/g, 'е').includes(w.slice(0, 5)))) || (AL.length === 1 ? AL[0] : null);
    if (hit) { r.agreements_remove = [hit.id]; r.reply = L(['Хорошо, {х}. Больше не буду.', '*кивает* Как скажете, {г}.']); r.expr = 'neutral'; r.reply = addr(aiGf(c, r.reply)); return r; }
  }
  if (AGR_RX.test(t) && !tk) {
    const ok = !AGR_BAD.test(t) && (c.loyalty >= 20 || (c.discipline || 0) >= 30 || relStage(c).i >= 2);
    r.accept = ok;
    r.reply = ok ? L(['Хорошо, {х}. Запомню и буду так делать.', '*кивает* Как скажете, {г}. Каждый раз.', '*смущённо улыбается* Договорились, {х}.']) : L(['*отводит взгляд* Простите, {г}… я пока не готов{|а}.', 'Не сейчас, {х}… может, позже.']);
    r.expr = ok ? 'blush' : 'shy'; r.reply = addr(aiGf(c, r.reply)); return r;
  }
  if (tk) {
    r.task = tk[0];
    const ok = tk[0] === 'rest' || c.loyalty >= 25 || (c.discipline || 0) >= 40;
    r.accept = ok;
    r.reply = ok ? L(tk[0] === 'rest' ? ['Спасибо, {х}! Отдохнуть и правда не помешает.', '*облегчённо выдыхает* Благодарю, {г}. Завтра наберусь сил.'] : ['Как скажете, {г}. Завтра займусь.', 'Будет сделано, {х}. Постараюсь не подвести.', 'Хорошо, {х}. Я {готов|готова}.'])
      : L(['*отводит взгляд* Простите, {г}… может, не завтра?', 'Я… не уверен{|а}, что справлюсь, {х}. Давайте в другой раз.']);
    if (!ok) r.expr = 'shy';
  } else if (/привет|здравств|добр(ое|ый|ой)|доброе утро/.test(t)) {
    r.reply = rs.i <= 1 ? L(['Здравствуйте, {г}.', '*кивает* Доброго дня, {х}.']) : L(['Здравствуйте, {х}! Рад{|а} вас видеть.', '*улыбается* Доброго дня, {г}! Я как раз о вас думал{|а}.']);
  } else if (/как (ты|дела|себя|настроени|спал)/.test(t)) {
    r.reply = c.sickDays > 0 ? 'Немного хвораю, {г}… но ничего, поправлюсь.' : c.fatigue >= 60 ? L(['Устал{|а}, {х}, сил почти нет.', '*зевает* Простите… очень хочется отдохнуть.']) : c.stress >= 60 ? 'Тревожно на душе, {г}. Слишком много всего.' : m >= 70 ? L(['Прекрасно, {х}! Сегодня хороший день.', 'Хорошо! Спасибо, что спросили, {г}.']) : m >= 45 ? 'Неплохо, {г}. Спокойно.' : 'Грустно немного, {х}…';
    r.expr = m >= 55 ? 'smile' : 'sad'; r.fx.mood = 1;
  } else if (/о себе|кто ты|откуда|расскаж/.test(t)) {
    r.reply = rs.i <= 0 ? 'Мне… пока не хочется об этом говорить, {г}.' : bioOf(c).split(/(?<=\.)\s/)[0].replace(/^Он |^Она /, '').replace(/^./, x => x.toUpperCase());
    if (rs.i > 0) r.reply = '*задумчиво* ' + r.reply;
    r.expr = rs.i <= 0 ? 'shy' : 'neutral';
  } else if (/молод|умниц|красив|спасиб|хорош|нравишь|лучш/.test(t)) {
    r.reply = L(['*краснеет* Спасибо, {х}…', 'Вы так добры, {г}!', '*смущённо улыбается* Мне приятно это слышать.']); r.expr = 'blush'; r.fx = { aff: 1, mood: 2 };
  } else if (/дур|глуп|бездар|заткн|ненавиж|бесполез|убирайс/.test(t)) {
    r.reply = L(['*опускает глаза* Простите, {г}…', 'Зачем вы так, {х}?', '*молчит, сжав губы*']); r.expr = 'sad'; r.fx = { mood: -3, stress: 3 };
  } else if (/чего (ты )?хочешь|желани|мечта|о ч[её]м мечта/.test(t)) {
    const w = pick([['Если можно… маленький подарок, {х}. Что-нибудь красивое.', 'gift', 'маленький подарок'], ['Мне бы день отдыха, {г}.', 'rest', 'день отдыха'], ['Чтобы вы меня похвалили, {х}. Хоть разок.', 'praise', 'похвала']]);
    r.reply = w[0]; r.wish = w[2]; r.wishKind = w[1]; r.expr = 'shy';
  } else {
    r.reply = rs.i <= 1 ? L(['Да, {г}.', '*кивает* Понял{|а}, {х}.', 'Как скажете, {г}.']) : L(['*улыбается* Вы всегда знаете, что сказать, {х}.', 'Мне нравится с вами говорить, {г}.', 'Правда? Расскажите ещё, {х}!']);
    r.expr = rs.i <= 1 ? 'neutral' : 'smile';
  }
  r.reply = addr(aiGf(c, r.reply));
  return r;
}

// ---------- окно разговора ----------
const AIC = { uid: null, busy: false, timer: null, err: null };
const AI_HIST = 14;
function agrHtml(c, withFacts) {
  const L = agrList(c), F = pfactList(c);
  let h = L.length ? `<ul class="agr-list">${L.map((a, i) => `<li><span>${i + 1}. ${esc(a.t)}${a.g ? ` <i class="muted">— *${esc(a.g)}*</i>` : ''}</span><button class="agr-x" type="button" data-agrdel="${c.uid}|${a.id}" aria-label="Отменить договорённость">✕</button></li>`).join('')}</ul>` : '<div class="muted">Договорённостей пока нет. Попросите о чём-то «каждый раз» или «всегда» — персонаж запомнит.</div>';
  if (withFacts) h += `<div class="agr-sub"><b>Что знает о вас</b></div>` + (F.length ? `<ul class="agr-list">${F.map((f, i) => `<li><span>${esc(f.t)}</span><button class="agr-x" type="button" data-pfdel="${c.uid}|${i}" aria-label="Забыть">✕</button></li>`).join('')}</ul>` : '<div class="muted">Пока ничего. Расскажите о себе — имя, что любите.</div>');
  return h;
}
function agrPanelHtml(c) {
  const L = agrList(c);
  return `<div class="ai-agr small">${L.length ? `<b>📜 Договорённости:</b>${agrHtml(c)}` : ''}<a href="#" data-agrmem="${c.uid}">память и договорённости…</a></div>`;
}
function aiMemModal(uid) {
  const c = findOwned(uid); if (!c) return;
  const ch = chatLoad(uid);
  showModal('Что ' + esc(fn1(c)) + ' помнит', `<div class="agr-sub"><b>📜 Договорённости / приказы</b> <span class="muted small">(до ${AGR_MAX}; соблюдаются в каждом ответе)</span></div><div id="agr-box" class="small">${agrHtml(c, true)}</div>
    <div class="agr-sub"><b>Сводка разговоров</b></div><p class="small">${esc(ch.sum || '—')}</p>
    <div class="small muted">Сводку пишет ИИ каждые ${AI.cfg.sumEvery} ответов; ИИ видит последние ${AI_HIST} реплик. Договорённости и факты хранятся в сохранении игры.</div>`,
    [{ label: 'Забыть разговоры', act: () => { localStorage.removeItem(AI.CHAT_K + uid); closeModal(true); if (AIC.uid) aiChatRender(); } }, { label: 'Закрыть', act: 'close' }]);
}
function aiStageHtml(c) { const rs = relStage(c); return `<span class="aic-stage st${rs.i}" title="отношения: ${rs.score}">${rs.name}</span>`; }
function aiChatOpen(uid) {
  const c = findOwned(uid); if (!c) return;
  AIC.uid = uid; AIC.err = null;
  let root = document.getElementById('aichat');
  if (!root) { root = document.createElement('div'); root.id = 'aichat'; (document.getElementById('app') || document.body).appendChild(root); }
  try { const sc = $app(); if (sc) sc.scrollTop = 0; } catch (e) { }
  root.className = 'open';
  aiChatRender(true);
  const inp = root.querySelector('.aic-in'); if (inp && !/Mobi|Android|iPhone/i.test(navigator.userAgent)) inp.focus();
}
function aiChatClose() { const r = document.getElementById('aichat'); if (r) { r.className = ''; r.innerHTML = ''; } AIC.uid = null; clearTimeout(AIC.timer); }
function aiChatRender(scroll) {
  const root = document.getElementById('aichat'); const c = AIC.uid && findOwned(AIC.uid);
  if (!root || !c) return;
  const ch = chatLoad(c.uid), key = AI.hasKey();
  AI.rollDay();
  const quick = ['Как ты?', 'Расскажи о себе', 'Чего ты хочешь?', 'Завтра отдохни', 'Завтра поработай в мастерской', 'Ты молодец'];
  const msgs = ch.msgs.length ? ch.msgs.map(m => `<div class="aic-m ${m.r}${m.blk ? ' blk' : ''}">${m.r === 'a' ? esc(m.t).replace(/\*([^*]{1,80})\*/g, '<i>$1</i>') : esc(m.t)}${m.fx && m.fx.length ? `<div class="aic-fx">${m.fx.map(f => `<span class="aic-chip ${f[1] ? "good" : "bad"}">${esc(f[0])}</span>`).join('')}</div>` : ''}</div>`).join('')
    : `<div class="aic-empty muted small">Скажите что-нибудь — ${esc(fn1(c))} ответит. ${key ? '' : 'Сейчас без ИИ: короткие заготовленные ответы.'}</div>`;
  root.innerHTML = `<div class="aic-sheet parchment">
    <div class="aic-head"><div class="aic-who"><b>${esc(c.name)}</b> ${aiStageHtml(c)}</div>
      <button class="aic-x" data-aic="close" aria-label="Закрыть">✕</button></div>
    <div class="aic-sub small muted">${key ? `ИИ Gemini · ${AI.cfg.n}/${AI.cfg.cap} сегодня` : 'Без ИИ'} · <a href="#" data-aic="settings">настроить</a>${ch.sum || agrList(c).length || pfactList(c).length || (ch.msgs || []).length ? ' · <a href="#" data-aic="mem">память</a>' : ''}</div>
    ${key ? '' : `<div class="aic-nokey small">Добавьте <b>бесплатный</b> ключ Google Gemini — и ${esc(fn1(c))} заговорит по-настоящему, с памятью и характером. <a href="#" data-aic="settings">Как получить ключ</a></div>`}
    ${c.wish && c.wish.t && !c.wish.done ? `<div class="aic-wish small">✦ Пожелание: ${esc(c.wish.t)}${c.wish.kind !== 'none' ? ` <span class="muted">(${{ gift: 'подарок', praise: 'похвала', rest: 'день отдыха' }[c.wish.kind]})</span>` : ''}</div>` : ''}
    ${agrList(c).length ? `<details class="aic-agr small"><summary>📜 Договорённости (${agrList(c).length})</summary>${agrHtml(c)}</details>` : ''}
    <div class="aic-log">${msgs}${AIC.busy ? `<div class="aic-m a typing"><span></span><span></span><span></span></div>${AIC.wait ? `<div class="small muted">пауза ~${AIC.wait} сек., чтобы не превысить бесплатный лимит</div>` : ''}` : ''}${AIC.err ? `<div class="aic-err small">${esc(AIC.err)} ${AIC.retry ? '<a href="#" data-aic="retry">Повторить</a>' : '<a href="#" data-aic="settings">Настройки</a>'}</div>` : ''}</div>
    <div class="aic-quick">${quick.map(q => `<button class="chip" data-aicq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="aic-form" data-aicform><input class="aic-in" maxlength="300" autocomplete="off" placeholder="Скажите ${esc(fn1(c))}…"><button class="btn btn-primary aic-send" type="submit" aria-label="Отправить">➤</button></form>
  </div>`;
  const log = root.querySelector('.aic-log'); if (log && scroll !== false) log.scrollTop = log.scrollHeight;
}
function aiSend(text) {
  const c = AIC.uid && findOwned(AIC.uid); text = String(text || '').trim().slice(0, 300);
  if (!c || !text) return;
  const ch = chatLoad(c.uid);
  ch.msgs.push({ r: 'u', t: text }); chatSave(c.uid, ch);
  if (c.chatDay !== S.day) { c.chatDay = S.day; c.chatDays = (c.chatDays || 0) + 1; }
  AIC.err = null;
  aiChatRender();
  aiSchedule();
}
// дебаунс: несколько быстрых реплик подряд уходят одним запросом; между запросами ≥4 с
function aiSchedule() {
  clearTimeout(AIC.timer);
  if (AIC.busy) return;
  const key = AI.hasKey() && AI.canSpend();
  const w = key ? Math.max(900, AI.waitMs()) : 500;
  AIC.busy = true; AIC.wait = w > 5000 ? Math.ceil(w / 1000) : 0; aiChatRender();
  AIC.timer = setTimeout(aiFlush, w);
}
async function aiFlush() {
  const uid = AIC.uid, c = uid && findOwned(uid);
  if (!c) { AIC.busy = false; return; }
  const ch = chatLoad(uid);
  let k = ch.msgs.length; while (k > 0 && ch.msgs[k - 1].r === 'u' && !ch.msgs[k - 1].blk) k--;
  const pend = ch.msgs.slice(k).map(m => m.t);
  if (!pend.length) { AIC.busy = false; aiChatRender(); return; }
  const userText = pend.join('\n');
  let r = null, used = false;
  if (AI.hasKey() && AI.canSpend()) {
    const hist = ch.msgs.slice(Math.max(0, k - 20), k).filter(m => !m.blk).slice(-AI_HIST).map(m => `${m.r === 'u' ? (playerFem() ? 'Хозяйка' : 'Хозяин') : fn1(c)}: ${m.t}`).join('\n');
    const AL = agrList(c);
    const prompt = `${hist ? 'Недавний разговор (по порядку):\n' + hist + '\n\n' : ''}Новые слова ${playerFem() ? 'хозяйки' : 'хозяина'}: «${userText}»\n${AL.length ? `Не забудь: в этом ответе соблюди договорённости — ${AL.map((a, i) => `${i + 1}) ${a.t}${a.g ? ` (*${a.g}*)` : ''}`).join('; ')}.\n` : ''}Ответь как ${fn1(c)} (JSON).`;
    AIC.lastPrompt = { sys: null, prompt };
    try { AI.stamp(); used = true; AIC.lastPrompt.sys = aiSystem(c); r = aiParse(await AI.gen(AIC.lastPrompt.sys, prompt, { schema: AI_SCHEMA, max: 900 })); if (!r || !r.reply) throw AI.aerr('empty'); }
    catch (e) { r = null; AIC.err = AI.errText(e); AIC.retry = !['safety', 'badkey', 'perm'].includes(e.kind); if (e.kind === 'quota' && e.message !== 'day') AI.coolFor(e.retry);
      if (e.kind === 'safety') { const cb = chatLoad(uid); cb.msgs.slice(k).forEach(m => { m.blk = 1; }); chatSave(uid, cb); } }
  } else if (AI.hasKey()) AIC.err = AI.errText(AI.aerr('cap'));
  if (!r && !used) r = aiLocal(c, userText);
  AIC.busy = false;
  if (AIC.uid !== uid) return;
  if (r) {
    r.reply = String(r.reply).replace(/\s+/g, ' ').trim().slice(0, 420);
    const fx = aiApply(c, r, userText);
    r.reply = agrEnforce(c, r.reply);
    const ch2 = chatLoad(uid); ch2.msgs.push({ r: 'a', t: r.reply, fx }); ch2.n = (ch2.n || 0) + 1; chatSave(uid, ch2);
    const ex = ['smile', 'blush', 'shy', 'sad', 'surprised', 'frown', 'neutral'].includes(r.expr) ? r.expr : 'smile';
    try { if (typeof Anim !== 'undefined') Anim.setExpr(ex === 'neutral' ? null : ex, 3200); } catch (e) { }
    try { TTS.speak(c, r.reply, ex); } catch (e) { }
    if (used && ch2.n % AI.cfg.sumEvery === 0) aiSummarize(c);
  }
  aiChatRender();
  // если пока ждали, пришли новые реплики — ответить и на них
  const ch3 = chatLoad(uid); if (ch3.msgs.length && ch3.msgs[ch3.msgs.length - 1].r === 'u' && r) aiSchedule();
}
async function aiSummarize(c) {
  const ch = chatLoad(c.uid);
  const lines = ch.msgs.slice(-AI.cfg.sumEvery * 2).map(m => `${m.r === 'u' ? (playerFem() ? 'Хозяйка' : 'Хозяин') : fn1(c)}: ${m.t}`).join('\n');
  const p = `Обнови краткую память персонажа ${c.name} о разговорах с ${playerFem() ? 'хозяйкой' : 'хозяином'}: важные факты, обещания, просьбы, чувства, прозвища. До 450 знаков, по-русски, от третьего лица, без откровенностей.\nСтарая память: ${ch.sum || '—'}\nНовые реплики:\n${lines}`;
  const w = AI.waitMs(); if (w > 0) await new Promise(r => setTimeout(r, w));
  try { AI.stamp(); const s = await AI.gen(null, p, { max: 300, temp: 0.3 }); if (s) { const ch2 = chatLoad(c.uid); ch2.sum = s.replace(/\s+/g, ' ').trim().slice(0, 600); chatSave(c.uid, ch2); } } catch (e) { }
}

// ---------- настройки ИИ ----------
function aiSettingsModal() {
  const k = AI.getKey(), cf = AI.cfg; AI.rollDay();
  showModal('ИИ-разговоры (Gemini)', `
    <p class="small">Персонажи могут разговаривать «вживую» через ИИ Google Gemini. Это <b>бесплатно</b>: нужен только ваш личный ключ, карта не нужна.</p>
    <ol class="small ai-steps"><li>Откройте <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> и войдите в Google-аккаунт.</li>
    <li>Нажмите «Create API key» (Создать ключ), выберите или создайте проект.</li>
    <li>Скопируйте ключ, вставьте ниже и нажмите «Проверить».</li></ol>
    <label class="ai-lab small">Ключ API</label>
    <div class="ai-keyrow"><input id="ai-key" type="password" autocomplete="off" spellcheck="false" placeholder="вставьте ключ" value="${k ? esc(k) : ''}"><button class="btn" id="ai-eye" type="button">👁</button></div>
    <label class="ai-lab small">Модель</label>
    <select id="ai-model">${AI.MODELS.map(([id, n]) => `<option value="${id}" ${cf.model === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label class="set-row small"><span>Мой предел запросов в день</span><input id="ai-cap" type="number" min="10" max="1500" step="10" value="${cf.cap}" style="width:80px"></label>
    <div class="small muted">Сегодня: ${cf.n} запросов к тексту, ${cf.nvN} к голосу.</div>
    <div id="ai-status" class="ai-status small"></div>
    <div class="btn-row"><button class="btn btn-primary" id="ai-test" type="button">Проверить</button><button class="btn" id="ai-del" type="button">Удалить ключ</button></div>
    <p class="small muted">Ключ хранится только в этом браузере (localStorage) и отправляется только в Google. Он не попадает в сохранения и на сайт игры.
    Бесплатный тариф ограничен по числу запросов в минуту и в день (точные цифры — в AI Studio → Usage / Rate limits); дневной лимит обновляется в полночь по тихоокеанскому времени. Игра сама делает паузы между запросами.
    <b>Важно:</b> на бесплатном тарифе Google может использовать тексты запросов для улучшения своих продуктов — не пишите в чате личного.</p>`,
    [{ label: 'Сохранить', cls: 'btn-primary', act: () => { aiSettingsSave(); closeModal(); toast(AI.hasKey() ? 'ИИ-разговоры включены.' : 'Ключ не задан — будут простые ответы.'); if (AIC.uid) aiChatRender(); } }, { label: 'Закрыть', act: 'close' }]);
  const $ = (id) => document.getElementById(id);
  $('ai-eye').onclick = () => { const i = $('ai-key'); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('ai-del').onclick = () => { AI.setKey(''); $('ai-key').value = ''; $('ai-status').textContent = 'Ключ удалён из браузера.'; };
  $('ai-test').onclick = async () => {
    aiSettingsSave();
    const s = $('ai-status');
    if (!AI.hasKey()) { s.className = 'ai-status small bad'; s.textContent = AI.errText(AI.aerr('nokey')); return; }
    s.className = 'ai-status small'; s.textContent = 'Проверяю…';
    try { AI.stamp(); const t = await AI.gen(null, 'Ответь по-русски одним словом: «Готово».', { max: 60, temp: 0, timeout: 20000 }); s.className = 'ai-status small good'; s.textContent = '✓ Работает! Модель ответила: ' + String(t || '').slice(0, 40); }
    catch (e) { s.className = 'ai-status small bad'; s.textContent = '✗ ' + AI.errText(e); }
  };
}
function aiSettingsSave() {
  const $ = (id) => document.getElementById(id);
  if ($('ai-key')) AI.setKey($('ai-key').value);
  if ($('ai-model')) AI.cfg.model = $('ai-model').value;
  if ($('ai-cap')) AI.cfg.cap = clamp(+$('ai-cap').value || 150, 10, 1500);
  AI.cfg.compat = {}; AI.saveCfg();
}

// ---------- голос: нейроголос Gemini + лучший голос браузера ----------
const VOICE = (() => {
  const K = 'trader_voice';
  const st = { fv: '', mv: '', rate: 1, pitch: 1, per: {} };
  try { Object.assign(st, JSON.parse(localStorage.getItem(K) || '{}')); } catch (e) { }
  const saveV = () => { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) { } };
  const NV_F = ['Leda', 'Achernar', 'Sulafat', 'Vindemiatrix', 'Aoede', 'Despina', 'Callirrhoe', 'Autonoe', 'Zephyr', 'Kore', 'Erinome', 'Laomedeia', 'Gacrux', 'Pulcherrima'];
  const NV_M = ['Puck', 'Charon', 'Orus', 'Algieba', 'Achird', 'Iapetus', 'Algenib', 'Umbriel', 'Fenrir', 'Rasalgethi', 'Alnilam', 'Schedar', 'Zubenelgenubi', 'Sadachbia', 'Sadaltager', 'Enceladus'];
  const NV_PRESET = { f01: 'Leda', f02: 'Vindemiatrix', f03: 'Aoede', f04: 'Callirrhoe', f05: 'Gacrux', f06: 'Kore', f07: 'Autonoe', f08: 'Erinome', f09: 'Achernar', f10: 'Despina', f11: 'Sulafat', f12: 'Pulcherrima', f13: 'Laomedeia', f14: 'Zephyr', f15: 'Aoede', f16: 'Laomedeia', f17: 'Kore', f18: 'Despina', f19: 'Sulafat', f20: 'Gacrux', f21: 'Erinome', f22: 'Callirrhoe', f23: 'Autonoe', m01: 'Alnilam', m02: 'Iapetus', m03: 'Umbriel', m04: 'Charon', m05: 'Orus', m06: 'Algenib', m07: 'Algenib', m08: 'Achird' };
  const NV_DESC = { Zephyr: 'яркий', Puck: 'бодрый', Charon: 'ровный', Kore: 'твёрдый', Fenrir: 'живой', Leda: 'юный', Orus: 'твёрдый', Aoede: 'лёгкий', Callirrhoe: 'спокойный', Autonoe: 'яркий', Enceladus: 'с придыханием', Iapetus: 'чистый', Umbriel: 'спокойный', Algieba: 'бархатный', Despina: 'бархатный', Erinome: 'чистый', Algenib: 'хрипловатый', Rasalgethi: 'ровный', Laomedeia: 'бодрый', Achernar: 'мягкий', Alnilam: 'твёрдый', Schedar: 'ровный', Gacrux: 'зрелый', Pulcherrima: 'напористый', Achird: 'дружелюбный', Zubenelgenubi: 'простой', Vindemiatrix: 'нежный', Sadachbia: 'живой', Sadaltager: 'учёный', Sulafat: 'тёплый' };
  function nvVoice(c) {
    if (st.per[c.uid] && st.per[c.uid].nv) return st.per[c.uid].nv;
    if (!c.parents && NV_PRESET[c.preset]) return NV_PRESET[c.preset];
    const L = c.g === 'm' ? NV_M : NV_F; return L[aiHash(c.uid) % L.length];
  }
  const STYLE = { smile: 'warm, friendly and gently smiling', blush: 'shy, soft and a little embarrassed', shy: 'shy and hesitant, quiet', sad: 'quiet, sad and subdued', surprised: 'lively and surprised', frown: 'mildly annoyed, terse', neutral: 'calm and polite', back: 'curt and offended' };
  function nvStyle(c, expr) {
    let s = STYLE[expr] || STYLE.smile;
    if (c.race === 'dwarf') s += ', slightly gruff'; if (c.race === 'elf') s += ', melodic'; if (c.preset === 'f14' || c.preset === 'f18') s += ', playful';
    if (c.fatigue >= 60) s += ', tired';
    return s + '; natural conversational Russian, not theatrical';
  }
  // кэш: память + IndexedDB
  const mem = new Map();
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res) => { try { const r = indexedDB.open('trader_tts', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
    return dbp;
  }
  async function cacheGet(k) {
    if (mem.has(k)) return mem.get(k);
    const d = await db(); if (!d) return null;
    return new Promise(res => { try { const q = d.transaction('clips').objectStore('clips').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } });
  }
  async function cachePut(k, blob) {
    mem.set(k, blob); if (mem.size > 40) mem.delete(mem.keys().next().value);
    const d = await db(); if (!d) return;
    try {
      const os = d.transaction('clips', 'readwrite').objectStore('clips'); os.put(blob, k);
      const cq = os.count(); cq.onsuccess = () => { if (cq.result > 250) { const kq = os.getAllKeys(); kq.onsuccess = () => { for (const kk of kq.result.slice(0, 50)) os.delete(kk); }; } };
    } catch (e) { }
  }
  function b64blob(b64, mime) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) return new Blob([u], { type: 'audio/wav' });
    if (mime && !/l16|pcm/i.test(mime)) return new Blob([u], { type: mime });
    // сырой PCM 16 бит 24 кГц моно → WAV
    const rate = +((String(mime || '').match(/rate=(\d+)/) || [])[1]) || 24000, h = new DataView(new ArrayBuffer(44));
    const w = (o, s) => { for (let i = 0; i < 4; i++) h.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); h.setUint32(4, 36 + u.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
    h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, u.length, true);
    return new Blob([h.buffer, u], { type: 'audio/wav' });
  }
  let audio = null, nvLast = 0, nvCool = 0, seq = 0;
  function stopAll() { try { if (audio) { audio.pause(); audio = null; } } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } }
  async function neural(c, txt, expr) {
    const my = ++seq;
    const voice = nvVoice(c), style = nvStyle(c, expr), model = AI.cfg.nvModel;
    const key = model + '|' + voice + '|' + style + '|' + txt;
    let blob = await cacheGet(key);
    if (!blob) {
      AI.rollDay();
      if (Date.now() < nvCool || AI.cfg.nvN >= AI.cfg.nvCap || Date.now() - nvLast < 2500) throw AI.aerr('busy');
      nvLast = Date.now(); AI.cfg.nvN++; AI.saveCfg();
      const body = { model, store: false, input: [{ type: 'user_input', content: [{ type: 'text', text: txt, annotations: [{ type: 'speech_metadata', style }] }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice }] } };
      let j;
      try { j = await AI.post(body, 20000); }
      catch (e) { if (e.kind === 'quota') { nvCool = Date.now() + Math.max(60, e.retry || 0) * 1000 * (e.message === 'day' ? 60 : 1); toast('Нейроголос: бесплатный лимит — пока говорит голос браузера.'); } throw e; }
      const a = AI.audioOf(j); if (!a) throw AI.aerr('empty');
      blob = b64blob(a.data, a.mime_type || a.mimeType);
      cachePut(key, blob);
    }
    if (my !== seq) return;
    stopAll();
    const url = URL.createObjectURL(blob);
    audio = new Audio(url); audio.volume = clamp(TTS.st.vol, 0, 1);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  }
  // голоса браузера: сначала нейронные (Natural/Neural/Online), затем Google, Microsoft
  function ruVoices() { try { return speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang)); } catch (e) { return []; } }
  const F_RX = /milena|irina|alena|alyona|svetlana|dariya|daria|katya|tatyana|anna|elena|ekaterina|female|женск/i, M_RX = /yuri|pavel|dmitr|maxim|ivan|male|мужск/i;
  function vScore(v) { const n = v.name; return (/natural|neural/i.test(n) ? 50 : 0) + (/online/i.test(n) ? 25 : 0) + (/google/i.test(n) ? 20 : 0) + (/microsoft/i.test(n) ? 10 : 0) + (/yandex|алис/i.test(n) ? 15 : 0) + (v.localService === false ? 5 : 0); }
  function ranked(gn) {
    const avoid = gn === 'm' ? F_RX : M_RX, want = gn === 'm' ? M_RX : F_RX;
    return ruVoices().map(v => ({ v, s: vScore(v) + (want.test(v.name) ? 8 : 0) - (avoid.test(v.name) ? 30 : 0) })).sort((a, b) => b.s - a.s).map(x => x.v);
  }
  function browserVoice(c) { const want = c.g === 'm' ? st.mv : st.fv; const L = ranked(c.g); return L.find(v => v.name === want) || L[0] || null; }
  function browser(c, txt) {
    try {
      const u = new SpeechSynthesisUtterance(txt); u.lang = 'ru-RU';
      const v = browserVoice(c); if (v) u.voice = v;
      const fem = c.g !== 'm', native = v && (fem ? !M_RX.test(v.name) : !F_RX.test(v.name)), h = aiHash(c.uid), per = st.per[c.uid] || {};
      u.pitch = clamp(((fem ? 1.08 : 0.9) + ((h % 11) - 5) / 100 + (native ? 0 : fem ? 0.2 : -0.25)) * st.pitch + (per.p || 0), 0.4, 2);
      u.rate = clamp((0.96 + ((h >> 5) % 9) / 100) * st.rate, 0.5, 1.8);
      u.volume = clamp(TTS.st.vol, 0, 1);
      stopAll(); speechSynthesis.speak(u);
    } catch (e) { }
  }
  const SKIP = /течк|постел|наедине|ласк|близост|раздень|разде|целу|страст|жар\b|обним|нежн(ее|ость)|ночь вместе|за закрытыми/i;
  function clean(t) { return String(t || '').replace(/\*[^*]*\*/g, ' ').replace(/\*[^.!?…]*[.!?…]?/g, ' ').replace(/_[^_]{1,80}_/g, ' ').replace(/<[^>]*>/g, ' ').replace(/[«»"„“]/g, '').replace(/\s+/g, ' ').trim(); }
  function speak(c, line, expr) {
    if (!TTS.st.on || !c || !line) return;
    try { if (typeof Audio_ !== 'undefined' && Audio_.st && Audio_.st.sfx === false) return; } catch (e) { }
    if (c.uid !== 'demo' && typeof inHeat === 'function' && inHeat(c)) return;
    let txt = clean(line);
    if (!txt || txt.length < 2 || SKIP.test(txt)) return;
    if (txt.length > 180) txt = (txt.slice(0, 180).match(/^.*[.!?…]/) || [txt.slice(0, 160)])[0];
    if (AI.cfg.nv && AI.hasKey()) { neural(c, txt, expr || VOICE.lastExpr || 'smile').catch(() => { if (TTS.ok) browser(c, txt); }); return; }
    if (TTS.ok) browser(c, txt);
  }
  return { st, saveV, speak, ranked, ruVoices, nvVoice, NV_F, NV_M, NV_DESC, stopAll, lastExpr: null, b64blob, clean, _browser: browser };
})();
// подменяем старую озвучку v7 новой
try { TTS.speak = (c, line, expr) => VOICE.speak(c, line, expr); } catch (e) { }

function voiceModal() {
  const vs = VOICE.st, cf = AI.cfg;
  const vopt = (gn, cur) => { const L = VOICE.ranked(gn); return L.length ? L.map((v, i) => `<option value="${esc(v.name)}" ${v.name === cur || (!cur && i === 0) ? 'selected' : ''}>${i === 0 ? '★ ' : ''}${esc(v.name)}</option>`).join('') : '<option value="">нет русских голосов</option>'; };
  const chars = (typeof S !== 'undefined' && S.owned ? S.owned : []).slice(0, 30);
  showModal('Голоса персонажей', `
    <label class="set-row"><span>Озвучка реплик</span><input type="checkbox" id="vo-on" ${TTS.st.on ? 'checked' : ''}></label>
    <div class="vo-box"><label class="set-row"><span><b>Нейроголос</b> (Gemini, бесплатно)</span><input type="checkbox" id="vo-nv" ${cf.nv ? 'checked' : ''} ${AI.hasKey() ? '' : 'disabled'}></label>
    <div class="small muted">${AI.hasKey() ? 'Живой выразительный голос с интонацией по настроению. Тот же ключ, что и для разговоров. Короткие фразы, с кэшем; при лимите — голос браузера.' : 'Нужен бесплатный ключ Gemini: <a href="#" id="vo-key">добавить ключ</a>.'}</div>
    <select id="vo-nvm">${AI.TTS_MODELS.map(([id, n]) => `<option value="${id}" ${cf.nvModel === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="vo-box"><b class="small">Голос браузера (запасной)</b>
    <label class="ai-lab small">Женский</label><select id="vo-fv">${vopt('f', vs.fv)}</select>
    <label class="ai-lab small">Мужской</label><select id="vo-mv">${vopt('m', vs.mv)}</select>
    <label class="set-row small"><span>Темп</span><input type="range" id="vo-rate" min="70" max="130" value="${Math.round(vs.rate * 100)}"></label>
    <label class="set-row small"><span>Высота</span><input type="range" id="vo-pitch" min="70" max="130" value="${Math.round(vs.pitch * 100)}"></label>
    <div class="small muted">★ — лучший найденный. Самые живые — «Natural/Online» (Microsoft Edge) и «Google» (Chrome).</div></div>
    ${chars.length ? `<div class="vo-box"><b class="small">Нейроголос каждого</b>${chars.map(c => { const L = c.g === 'm' ? VOICE.NV_M : VOICE.NV_F, cur = VOICE.nvVoice(c); return `<div class="vo-row"><span>${esc(fn1(c))}</span><select data-vochar="${c.uid}">${L.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v} — ${VOICE.NV_DESC[v] || ''}</option>`).join('')}</select><button class="btn small" data-votry="${c.uid}" type="button">▶</button></div>`; }).join('')}</div>` : ''}
    <div class="btn-row"><button class="btn" id="vo-test" type="button">▶ Прослушать</button></div>`,
    [{ label: 'Готово', cls: 'btn-primary', act: 'close' }]);
  const $ = (id) => document.getElementById(id);
  const upd = () => {
    TTS.set('on', $('vo-on').checked); cf.nv = $('vo-nv').checked; cf.nvModel = $('vo-nvm').value; AI.saveCfg();
    vs.fv = $('vo-fv').value; vs.mv = $('vo-mv').value; vs.rate = $('vo-rate').value / 100; vs.pitch = $('vo-pitch').value / 100;
    document.querySelectorAll('[data-vochar]').forEach(s => { vs.per[s.dataset.vochar] = Object.assign(vs.per[s.dataset.vochar] || {}, { nv: s.value }); });
    VOICE.saveV();
  };
  document.querySelectorAll('#modal input, #modal select').forEach(el => el.addEventListener('change', upd));
  const k = $('vo-key'); if (k) k.onclick = (e) => { e.preventDefault(); aiSettingsModal(); };
  $('vo-test').onclick = () => { upd(); const was = TTS.st.on; TTS.st.on = true; VOICE.speak({ uid: 'demo', g: 'f', race: 'human' }, addr('Здравствуйте, {х}! Сегодня чудесный день, правда?'), 'smile'); TTS.st.on = was; };
  document.querySelectorAll('[data-votry]').forEach(b => b.onclick = () => { upd(); const c = findOwned(b.dataset.votry); if (!c) return; const was = TTS.st.on; TTS.st.on = true; VOICE.speak(Object.assign({}, c, { sickDays: 0 }), addr(`Я здесь, {х}. Чем могу помочь?`), 'smile'); TTS.st.on = was; });
}

// ---------- связи с игрой ----------
(function () {
  const wrap = (name, after, before) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function () {
      let pre; try { if (before) pre = before.apply(this, arguments); } catch (e) { }
      const r = o.apply(this, arguments);
      try { after && after.call(this, arguments, r, pre); } catch (e) { }
      return r;
    };
  };
  // запоминаем выражение для интонации нейроголоса (до v7-обёртки, которая озвучивает)
  wrap('reactNow', null, (c, expr) => { VOICE.lastExpr = expr; });
  // панель «Разговор» в карточке своего персонажа
  wrap('render', () => {
    if (UI.screen !== 'card') { if (AIC.uid) aiChatClose(); return; }
    const c = findOwned(UI.cardUid); if (!c) return;
    if (AIC.uid && AIC.uid !== c.uid) aiChatClose();
    const sc = $app(); if (!sc || sc.querySelector('.ai-panel')) return;
    const anchor = sc.querySelector('.forecast') || sc.querySelector('.panel.parchment:last-child'); if (!anchor) return;
    const rs = relStage(c), ch = chatLoad(c.uid), last = ch.msgs.filter(m => m.r === 'a').slice(-1)[0];
    anchor.insertAdjacentHTML('afterend', `<div class="panel parchment ai-panel"><div class="panel-title">Разговор ${aiStageHtml(c)}</div>
      <div class="small muted">${esc(rs.hint)}</div>
      ${c.wish && c.wish.t && !c.wish.done ? `<div class="aic-wish small">✦ ${esc(c.wish.t)}</div>` : ''}
      ${agrPanelHtml(c)}
      ${last ? `<div class="small ai-last">«${esc(last.t.replace(/\*[^*]*\*/g, '').trim().slice(0, 90))}${last.t.length > 90 ? '…' : ''}»</div>` : ''}
      <button class="btn btn-primary btn-talk" data-aichat="${c.uid}">💬 Поговорить${AI.hasKey() ? '' : '<small>без ИИ — простые ответы</small>'}</button></div>`);
  });
  // меню: настройки ИИ и голосов
  wrap('menuModal', () => {
    const box = document.querySelector('#modal .settings'); if (!box || document.getElementById('set-ai')) return;
    box.insertAdjacentHTML('beforeend', `<div class="btn-row set-ai-row"><button class="btn" id="set-ai" type="button">💬 ИИ-разговоры (Gemini)…</button><button class="btn" id="set-voice" type="button">🔊 Голоса…</button></div>`);
    document.getElementById('set-ai').onclick = () => aiSettingsModal();
    document.getElementById('set-voice').onclick = () => voiceModal();
  });
  // события дня → короткая память персонажа
  wrap('addLog', (a) => { const t = String(a[0] || ''); if (!S || !S.owned) return; for (const c of S.owned) if (c.name && t.includes(c.name)) memAdd(c, t.replace(/<[^>]*>/g, '').slice(0, 110)); });
  const ACT = { praise: 'вы похвалили', gift: 'вы сделали подарок', healer: 'вы позвали лекаря', scold: 'вы отругали', nosweets: 'вы оставили без сладкого' };
  wrap('act', (a) => { const c = findOwned(a[0]), k = a[1]; if (!c || !ACT[k]) return; memAdd(c, ACT[k]); if (c.wish && !c.wish.done && c.wish.kind === k) aiWishDone(c, k); });
  wrap('touch', (a) => { const c = findOwned(a[0]); if (c && c.memTouch !== S.day) { c.memTouch = S.day; memAdd(c, 'вы ласково касались (по-доброму)'); } });
  wrap('closenessResult', (a) => { const c = findOwned(a[0]); if (c) memAdd(c, 'провели время наедине (без подробностей)'); });
  wrap('punish', (a) => { const c = findOwned(a[0]); if (c && c.memPun !== S.day) { c.memPun = S.day; memAdd(c, 'вы наказали'); } });
  wrap('buy', (a, r) => { const c = findOwned(a[0]); if (c && !c.mem) memAdd(c, aiGf(c, 'вы купили {его|её} на рынке, первый день в доме')); });
  wrap('endDay', null, () => {
    for (const c of S.owned || []) {
      if (c.task && c.task !== 'rest') memAdd(c, 'работа: ' + (TASKS[c.task] || c.task));
      if (c.wish && !c.wish.done && c.wish.kind === 'rest' && c.task === 'rest') aiWishDone(c, 'rest');
    }
    if (AIC.uid) aiChatClose();
  });
  // клики и отправка в окне разговора
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-aichat],[data-aic],[data-aicq]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.aichat) return aiChatOpen(t.dataset.aichat);
    if (t.dataset.aicq) return aiSend(t.dataset.aicq);
    const k = t.dataset.aic;
    if (k === 'close') aiChatClose();
    else if (k === 'settings') aiSettingsModal();
    else if (k === 'retry') { AIC.err = null; aiSchedule(); }
    else if (k === 'mem') aiMemModal(AIC.uid);
  }, true);
  // удаление договорённостей и фактов (окно разговора, «память», карточка)
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-agrdel],[data-pfdel],[data-agrmem]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.agrmem) return aiMemModal(t.dataset.agrmem);
    const [uid, id] = (t.dataset.agrdel || t.dataset.pfdel).split('|'); const c = findOwned(uid); if (!c) return;
    if (t.dataset.agrdel) { const d = agrRemove(c, id); if (d) { memAdd(c, 'хозяин отменил договорённость: ' + d.t.slice(0, 80)); toast('Договорённость отменена.'); } }
    else { pfactList(c).splice(+id, 1); }
    save();
    const box = document.getElementById('agr-box'); if (box) box.innerHTML = agrHtml(c, true);
    if (AIC.uid === uid) { const op = document.querySelector('#aichat .aic-agr'); const was = op && op.open; aiChatRender(false); const n = document.querySelector('#aichat .aic-agr'); if (n && was) n.open = true; }
    const pn = document.querySelector('.ai-panel .ai-agr'); if (pn) pn.outerHTML = agrPanelHtml(c);
  }, true);
  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('[data-aicform]'); if (!f) return;
    e.preventDefault(); const i = f.querySelector('.aic-in'); const v = i.value; i.value = ''; aiSend(v);
    const i2 = document.querySelector('#aichat .aic-in'); if (i2 && document.activeElement !== i2 && v) try { i2.focus({ preventScroll: true }); } catch (er) { }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && AIC.uid && !document.querySelector('#modal.open')) aiChatClose(); });
  if (typeof HELP !== 'undefined') HELP.push(['ai', 'Разговоры и голос', () => `<p>В карточке своего персонажа есть кнопка <b>«Поговорить»</b>. Без ключа отвечают простые заготовки. С бесплатным ключом Google Gemini (Меню → «ИИ-разговоры») персонаж отвечает сам — помнит прошлые разговоры, события дня, свой характер и историю.</p>
    <p>Разговор понемногу меняет привязанность, верность, настроение и стресс (с дневным пределом). Можно попросить заняться делом завтра — персонаж согласится или откажет. Иногда он высказывает пожелание: подарок, похвалу или отдых.</p>
    <p>Ступени отношений: ${REL_STAGES.map(s => s[1].split('|')[1] || s[1]).join(' → ')}.</p>
    <p><b>Нейроголос</b> (Меню → «Голоса») — живая озвучка Gemini тем же ключом; без него — лучший голос браузера.</p>`]);
})();
