  // ==== Settings, difficulty, accessibility helpers, performance mode.
  // ---- Setup: steering (touch or gyro) and screen orientation, chosen on the start screen and remembered.
  // Defaults: gyro steering in landscape. (v2 key: earlier builds saved touch/portrait implicitly.)
  const SETTINGS_KEY = 'morbid-settings-v2';
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const settings = { lang: /^de\b/i.test((typeof navigator !== 'undefined' && navigator.language) || '') ? 'de' : 'en', perf: 'auto', perfAuto: false, calm: reducedMotion, cb: false, subtitles: false, difficulty: 'normal', haptics: true, steering: window.matchMedia?.('(pointer: coarse)')?.matches ? 'gyro' : 'touch', screen: 'landscape' };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* defaults */ }
  // Difficulty: rival pace, damage taken, extra lives and credit payout.
  const DIFFICULTY = {
    easy: { name: 'EASY', pace: .9, dmg: .6, lives: 1, credits: .75 },
    normal: { name: 'NORMAL', pace: 1, dmg: 1, lives: 0, credits: 1 },
    hard: { name: 'HARD', pace: 1.08, dmg: 1.4, lives: -1, credits: 1.5 },
  };
  const diff = () => DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  // Mutators: optional twists for a race, each one pays 15 % more credits.
  const MUTATORS = { mirror: '⇋ MIRROR', night: '☾ NIGHT', lowgrav: '⇡ LOW GRAVITY', reverse: '⟲ REVERSE' };
  const mutator = id => Array.isArray(settings.mutators) && settings.mutators.includes(id);
  const mutatorBonus = () => 1 + .15 * Object.keys(MUTATORS).filter(mutator).length;
  function toggleMutator(id) {
    if (!MUTATORS[id]) return;
    const list = new Set(Array.isArray(settings.mutators) ? settings.mutators : []);
    if (list.has(id)) list.delete(id); else list.add(id);
    settings.mutators = [...list]; saveSettings(); renderMutators();
    if ((id === 'mirror' || id === 'reverse') && mode === 'menu') buildTrack();
  }
  function renderMutators() {
    document.querySelectorAll('[data-mutator]').forEach(b => b.classList.toggle('selected', mutator(b.dataset.mutator)));
    const n = Object.keys(MUTATORS).filter(mutator).length;
    if ($('mutator-info')) $('mutator-info').textContent = n ? `${Object.keys(MUTATORS).filter(mutator).map(id => MUTATORS[id]).join(' · ')}  ·  +${n * 15}% CREDITS` : 'OPTIONAL TWISTS · EACH ONE +15% CREDITS';
  }
  // Generic option buttons: <button data-setting="key" data-value="value">. Hooks run after a change.
  const settingHooks = {};
  function setSetting(key, raw) {
    const value = raw === 'on' ? true : raw === 'off' ? false : raw;
    settings[key] = value; saveSettings(); renderSettings();
    if (settingHooks[key]) settingHooks[key](value);
  }
  // Accessibility helpers: calm mode tones down shake and flashes, colour-blind marks danger with a pattern.
  const shakeAmount = () => shake * (settings.calm ? .12 : 1);
  const flashAmount = v => v * (settings.calm ? .18 : 1);
  function cbMark(x, y, r) {
    if (!settings.cb) return;
    ctx.save(); ctx.setLineDash([r * .3, r * .2]); ctx.lineWidth = Math.max(2, r * .12); ctx.strokeStyle = '#ffe600';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `bold ${Math.max(12, r * .9)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText('⚠', x, y); ctx.fillStyle = '#ffe600'; ctx.fillText('⚠', x, y); ctx.restore();
  }
  // Performance mode: 'auto' switches to low effects by itself when the frame rate stays low during a race.
  const lowFx = () => settings.perf === 'low' || (settings.perf === 'auto' && settings.perfAuto);
  const fpsMeter = { frames: 0, sum: 0, slow: 0 };
  function measureFps(dt) {
    if (settings.perf !== 'auto' || settings.perfAuto || mode !== 'racing' || countdown > 0) { fpsMeter.frames = 0; fpsMeter.sum = 0; return; }
    fpsMeter.frames++; fpsMeter.sum += dt;
    if (fpsMeter.sum < 2) return;
    const fps = fpsMeter.frames / fpsMeter.sum; fpsMeter.frames = 0; fpsMeter.sum = 0;
    fpsMeter.slow = fps < 38 ? fpsMeter.slow + 1 : 0;
    if (fpsMeter.slow >= 2) { settings.perfAuto = true; saveSettings(); applyPerf(); showMessage('LOW FPS · PERFORMANCE MODE ON', 2.2); }
  }
  // Low effects: no canvas glow (shadowBlur is the big cost on phones), 1x resolution, fewer particles.
  function applyPerf() {
    const low = lowFx();
    try {
      if (low) Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get: () => 0, set: () => {} });
      else delete ctx.shadowBlur;
    } catch { /* context without configurable props */ }
    document.body.classList.toggle('lowfx', low);
    if (typeof resize === 'function' && W) resize();
  }
  settingHooks.perf = v => { if (v !== 'auto') settings.perfAuto = false; saveSettings(); applyPerf(); };
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }
  function setupNote(text) { $('setup-note').textContent = text; }
  function renderSettings() {
    document.querySelectorAll('[data-steer]').forEach(b => b.classList.toggle('selected', b.dataset.steer === settings.steering));
    document.querySelectorAll('[data-screen]').forEach(b => b.classList.toggle('selected', b.dataset.screen === settings.screen));
    document.querySelectorAll('[data-haptics]').forEach(b => b.classList.toggle('selected', (b.dataset.haptics === 'on') === settings.haptics));
    document.querySelectorAll('[data-setting]').forEach(b => { const v = b.dataset.value, cur = settings[b.dataset.setting]; b.classList.toggle('selected', String(cur) === (v === 'on' ? 'true' : v === 'off' ? 'false' : v)); });
    document.body.classList.toggle('calm', !!settings.calm); if ($('perf-note')) $('perf-note').textContent = settings.perf === 'auto' ? (settings.perfAuto ? 'AUTO · LOW FPS DETECTED' : 'AUTO · WATCHING FPS') : settings.perf === 'low' ? 'FEWER EFFECTS' : 'ALL EFFECTS'; document.body.classList.toggle('cb', !!settings.cb);
    if ($('difficulty-badge')) $('difficulty-badge').textContent = diff().name;
    $('steer-hint').textContent = settings.steering === 'gyro' ? 'TILT ◀ ▶' : 'DRAG ◀ ▶';
    document.body.classList.toggle('gyro', settings.steering === 'gyro');
    checkOrientation();
  }
