'use strict';
// ===== v7: озвучка реплик (speechSynthesis), переключатель отвара =====
const TTS = (() => {
  const KEY = 'trader_tts';
  let st = { on: false, vol: 0.8 };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const F_NAMES = /milena|irina|alena|alyona|svetlana|dariya|daria|katya|tatyana|anna|elena|female|женск/i;
  const M_NAMES = /yuri|pavel|dmitr|maxim|ivan|male|мужск/i;
  let voices = [];
  function loadVoices() { if (!ok) return; try { voices = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang)); } catch (e) { voices = []; } }
  if (ok) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) { } }
  function pickVoice(gn) {
    if (!voices.length) loadVoices();
    if (!voices.length) return null;
    const want = gn === 'm' ? M_NAMES : F_NAMES, avoid = gn === 'm' ? F_NAMES : M_NAMES;
    return voices.find(v => want.test(v.name)) || voices.find(v => /google/i.test(v.name) && !avoid.test(v.name)) || voices.find(v => !avoid.test(v.name)) || voices[0];
  }
  function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  // фразы о близости/течке не озвучиваем — только приветствия и реакции
  const SKIP = /течк|постел|наедине|ласк|близост|раздень|целу|страст|жар\b/i;
  function clean(t) { return String(t || '').replace(/\*[^*]*\*/g, ' ').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim(); }
  function speak(c, line) {
    if (!ok || !st.on || !c || !line) return;
    try { if (typeof Audio_ !== 'undefined' && Audio_.st && Audio_.st.sfx === false) return; } catch (e) { }
    if (typeof inHeat === 'function' && inHeat(c)) return;
    const txt = clean(line);
    if (!txt || txt.length < 2 || SKIP.test(txt)) return;
    try {
      const u = new SpeechSynthesisUtterance(txt.slice(0, 160));
      u.lang = 'ru-RU';
      const v = pickVoice(c.g); if (v) u.voice = v;
      const h = hash(c.uid);
      const fem = c.g !== 'm', native = v && (fem ? F_NAMES.test(v.name) : M_NAMES.test(v.name));
      // своя высота и темп у каждого; если голос «чужого» пола — сдвигаем высоту
      u.pitch = clamp((fem ? 1.15 : 0.85) + ((h % 21) - 10) / 100 + (native ? 0 : fem ? 0.2 : -0.25), 0.5, 1.8);
      u.rate = 0.92 + ((h >> 5) % 15) / 100;
      u.volume = clamp(st.vol, 0, 1);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  function set(k, v) { st[k] = v; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } if (k === 'on' && !v && ok) try { speechSynthesis.cancel(); } catch (e) { } }
  return { st, ok, speak, set, voices: () => voices };
})();

(function () {
  if (typeof reactNow === 'function') {
    const orig = reactNow;
    window.reactNow = function (c, expr, line, ms) {
      const r = orig.apply(this, arguments);
      try { if (line) TTS.speak(c, addr(line)); } catch (e) { }
      return r;
    };
  }
  if (typeof menuModal === 'function') {
    const origM = menuModal;
    window.menuModal = function () {
      const r = origM.apply(this, arguments);
      try {
        const box = document.querySelector('#modal .settings');
        if (box && !document.getElementById('set-tts')) {
          box.insertAdjacentHTML('beforeend', `<label class="set-row"><span>Озвучка реплик${TTS.ok ? '' : ' <small class="muted">(нет в браузере)</small>'}</span><input type="checkbox" id="set-tts" ${TTS.st.on ? 'checked' : ''} ${TTS.ok ? '' : 'disabled'}></label>
            <label class="set-row"><span>Громкость голоса</span><input type="range" id="set-ttsvol" min="0" max="100" value="${Math.round(TTS.st.vol * 100)}" ${TTS.ok ? '' : 'disabled'}></label>`);
          document.getElementById('set-tts').addEventListener('change', e => { TTS.set('on', e.target.checked); if (e.target.checked) TTS.speak({ uid: 'demo', g: 'f' }, 'Здравствуйте! Рада вас видеть.'); });
          document.getElementById('set-ttsvol').addEventListener('change', e => TTS.set('vol', e.target.value / 100));
        }
      } catch (e) { }
      return r;
    };
  }
  // защита «травяной отвар» для работы в салоне
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-herbal]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const c = findOwned(a.dataset.herbal); if (!c) return;
    c.herbal = !c.herbal;
    sfx('pop');
    toast(c.herbal ? `${fn1(c)} будет пить травяной отвар перед салоном (−${HERBAL_COST} мон. за вечер).` : `${fn1(c)} больше не пьёт отвар.`);
    save();
    if (document.getElementById('plan-go')) dayPlanModal(); else render();
  }, true);
})();
