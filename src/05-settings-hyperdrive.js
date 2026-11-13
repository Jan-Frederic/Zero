  // ---- Setup: steering (touch or gyro) and screen orientation, chosen on the start screen and remembered.
  // Defaults: gyro steering in landscape. (v2 key: earlier builds saved touch/portrait implicitly.)
  const SETTINGS_KEY = 'morbid-settings-v2';
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const settings = { calm: reducedMotion, cb: false, subtitles: false, difficulty: 'normal', haptics: true, steering: window.matchMedia?.('(pointer: coarse)')?.matches ? 'gyro' : 'touch', screen: 'landscape' };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* defaults */ }
  const tilt = { x: 0, neutral: 0, live: false };
  // Difficulty: rival pace, damage taken, extra lives and credit payout.
  const DIFFICULTY = {
    easy: { name: 'EASY', pace: .9, dmg: .6, lives: 1, credits: .75 },
    normal: { name: 'NORMAL', pace: 1, dmg: 1, lives: 0, credits: 1 },
    hard: { name: 'HARD', pace: 1.08, dmg: 1.4, lives: -1, credits: 1.5 },
  };
  const diff = () => DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
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
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }
  function screenAngle() { return (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : Number(window.orientation) || 0) * Math.PI / 180; }
  // Roll angle of the device relative to the screen's horizontal axis, from the gravity direction in device coordinates.
  function onTilt(event) {
    if (event.beta == null || event.gamma == null) return;
    const b = event.beta * Math.PI / 180, g = event.gamma * Math.PI / 180, a = screenAngle();
    const dx = Math.sin(g) * Math.cos(b), dy = -Math.sin(b);
    tilt.x = Math.asin(clamp(dx * Math.cos(a) - dy * Math.sin(a), -1, 1)) * 180 / Math.PI; tilt.live = true;
  }
  // Touch steering stays available until the sensor actually delivers data.
  const gyroActive = () => settings.steering === 'gyro' && tilt.live;
  function calibrateTilt() { tilt.neutral = tilt.live ? tilt.x : 0; }
  const TILT_FULL = 20, TILT_DEAD = 2.5;
  function tiltSteer() {
    if (!tilt.live) return 0;
    const d = tilt.x - tilt.neutral;
    return Math.abs(d) < TILT_DEAD ? 0 : clamp((d - Math.sign(d) * TILT_DEAD) / (TILT_FULL - TILT_DEAD), -1, 1);
  }
  async function enableGyro() {
    if (!window.DeviceOrientationEvent) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') return false;
    } catch { return false; }
    if (!enableGyro.listening) { window.addEventListener('deviceorientation', onTilt); enableGyro.listening = true; }
    return true;
  }
  function setupNote(text) { $('setup-note').textContent = text; }
  function renderSettings() {
    document.querySelectorAll('[data-steer]').forEach(b => b.classList.toggle('selected', b.dataset.steer === settings.steering));
    document.querySelectorAll('[data-screen]').forEach(b => b.classList.toggle('selected', b.dataset.screen === settings.screen));
    document.querySelectorAll('[data-haptics]').forEach(b => b.classList.toggle('selected', (b.dataset.haptics === 'on') === settings.haptics));
    document.querySelectorAll('[data-setting]').forEach(b => { const v = b.dataset.value, cur = settings[b.dataset.setting]; b.classList.toggle('selected', String(cur) === (v === 'on' ? 'true' : v === 'off' ? 'false' : v)); });
    document.body.classList.toggle('calm', !!settings.calm); document.body.classList.toggle('cb', !!settings.cb);
    if ($('difficulty-badge')) $('difficulty-badge').textContent = diff().name;
    $('steer-hint').textContent = settings.steering === 'gyro' ? 'TILT ◀ ▶' : 'DRAG ◀ ▶';
    document.body.classList.toggle('gyro', settings.steering === 'gyro');
    checkOrientation();
  }
  function currentOrientation() { return window.matchMedia?.('(orientation: landscape)')?.matches ? 'landscape' : 'portrait'; }
  // Lock the orientation where the browser allows it (Android, installed app); everywhere else ask the player to rotate.
  async function applyScreenSetting(fromGesture) {
    if (!window.matchMedia?.('(pointer: coarse)').matches || !screen.orientation?.lock) { checkOrientation(); return; }
    try {
      if (fromGesture && !document.fullscreenElement && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) await document.documentElement.requestFullscreen?.();
      await screen.orientation.lock(settings.screen);
    } catch { /* Not allowed here (e.g. iOS): the rotate prompt takes over. */ }
    checkOrientation();
  }
  function checkOrientation() {
    const overlay = $('rotate-overlay');
    const wrong = !!window.matchMedia?.('(pointer: coarse)').matches && currentOrientation() !== settings.screen;
    overlay.classList.toggle('hidden', !wrong);
    if (wrong) {
      $('rotate-title').textContent = `ROTATE TO ${settings.screen.toUpperCase()}`; $('rotate-setting').textContent = settings.screen.toUpperCase();
      $('rotate-other').textContent = settings.screen === 'portrait' ? 'LANDSCAPE' : 'PORTRAIT';
      if (mode === 'racing' || mode === 'countdown') pauseRace();
    }
  }
  const hyper = () => hyperTime > 0 && mode === 'racing';
  const shieldText = amount => hyper() ? 'INVINCIBLE' : 'SHIELD -' + hullLoss(amount);
  function activateHyper() {
    unlockAchievement('hyper');
    const fresh = hyperTime <= 0;
    hyperTime = HYPER_TIME; if (fresh) hyperStarted = time;
    energy = 100; boostLocked = false; screenFlash = Math.max(screenFlash, 1); shake = Math.max(shake, 1.2);
    showCallout('HYPERDRIVE!', '#7dfcff'); showMessage('LIGHT SPEED  /  INVINCIBLE  /  MEGA LASER  /  ∞ BOOST', 2.4);
    robotSay('Hyperdrive initiated', 'hyperdrive-initiated');
    playNoiseBurst(2.2, .25, 120, 9000); playToneSweep(80, 1800, 1.6, 'sawtooth', .07); playToneSweep(1200, 4200, 1.2, 'sine', .035);
    [392, 523, 659, 784, 1047].forEach((f, i) => playToneSweepAt(f, i * .07));
  }
  function playToneSweepAt(freq, delay) {
    if (!audioContext || muted) return;
    setTimeout(() => playToneSweep(freq, freq * 2, .35, 'triangle', .04), delay * 1000);
  }
  function endHyper() {
    hyperTime = 0; showMessage('HYPERDRIVE OFFLINE', 1.3);
    playToneSweep(1400, 60, 1.1, 'sawtooth', .06); playNoiseBurst(.9, .12, 6000, 120);
  }
