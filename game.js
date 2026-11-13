// GENERATED FILE — edit the parts in src/ and run `npm run build` (see src/README.md).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const map = $('minimap').getContext('2d');
  const audio = $('soundtrack');
  const TAU = Math.PI * 2, SEG = 200, COUNT = 1200, LENGTH = SEG * COUNT, ROAD = 1700, DEPTH = .88, PILOT_COUNT = 30, BASE_LASER_CAPACITY = 10;
  // One laser cell recharges every laserRecharge() seconds; hullStrength() > 1 makes the shield last that many times longer.
  const BASE_LASER_RECHARGE = 2.5, BASE_HULL_STRENGTH = 2;
  const realTime = () => frameClock;
  // Cyan pads refill shield and laser cells in proportion to each track's boost recharge rate.
  const PAD_SHIELD = .45, PAD_LASER = .1;
  let trackIndex = 0, shipIndex = 0, W = 0, H = 0, dpr = 1, time = 0;
  let mode = 'menu', position = 0, playerX = 0, speed = 0, energy = 100, shield = 100, elapsed = 0, lap = 1, lapStart = 0;
  let laps = [], rivals = [], ufos = [], bombs = [], segments = [], countdown = 3.6, messageTime = 0, collisionCooldown = 0, wallCooldown = 0, boosting = false;
  let jumpHeight = 0, jumpVelocity = 0, jumpBoostTimer = 0;
  // Shot-down UFOs fly wild screen-space crash paths; new UFOs warp in to replace them.
  let musicHold = 0, lostLifeThisRace = false;
  let frameClock = 0;
  // Extra lives: one per difficulty step, shared by the race and the boss fights that follow it.
  let lives = 0, raceRespawnAt = 0, raceInvulnUntil = 0;
  let hyperTime = 0, hyperStarted = 0, hitGates = new Set();
  // Mothership boss: appears after every 10 UFO kills. Races run LAP_COUNT laps.
  const BOSS_EVERY = 10, BOSS_HP = 40, LAP_COUNT = 6;
  let ufoKills = 0, boss = null, bossAttacks = [];
  let crashingUfos = [], ufoRespawns = [], smoke = [], megaBlasts = [], confetti = [], callout = null;
  const UFO_CRASH_TIME = 2.6, UFO_SLOTS_SPACING = 4300;
  let shake = 0, steerVisual = 0, distance = 0, bestLap = 0, previousTime = 0, muted = false, beat = 0;
  let audioContext, analyser, frequency, engineGain, engineOsc, musicSource, musicGain, sfxBus;
  let particles = [], explosions = [], laserShots = [], enemyShots = [], hitHazards = new Set(), hitRamps = new Set(), rank = 20, lastPad = -1, launchGoTime = 0, boostLocked = false;
  let laserAmmo = BASE_LASER_CAPACITY, laserCharge = 0, laserCooldown = 0, screenFlash = 0, wreckedAt = 0, wreckRank = PILOT_COUNT, wreckBurst = null;
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;
  // ==== Saved pilot profile: credits, upgrades, paint jobs, lifetime stats.
  // ---- Pilot profile (saved on the device): credits, ship upgrades, unlocked circuits, achievements, stats.
  const PROFILE_KEY = 'morbid-profile-v1';
  const profile = { credits: 0, upgrades: {}, unlocked: 1, achievements: {}, stats: {} };
  try { Object.assign(profile, JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')); } catch { /* fresh pilot */ }
  profile.upgrades = Object.assign({ armor: 0, laser: 0, boost: 0 }, profile.upgrades);
  if (profile.tutorialDone === undefined && (profile.credits > 0 || Object.keys(profile.achievements || {}).length)) profile.tutorialDone = true;
  // Existing pilots keep every circuit they already raced (from saved lap records).
  try { for (let i = 7; i > 0; i--) if (Number(localStorage.getItem(`chroma-best-${i}`)) > 0) { profile.unlocked = Math.max(profile.unlocked || 1, i + 1); break; } } catch { /* ignore */ }
  function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ } }
  const UPGRADES = {
    armor: { name: 'HULL ARMOR', icon: '🛡', info: lvl => `takes ${Math.round(100 - 100 / (1 + lvl * .25))}% less damage` },
    laser: { name: 'LASER BANK', icon: '◎', info: lvl => `${BASE_LASER_CAPACITY + lvl * 2} cells, recharge ${Math.round(lvl * 15)}% faster` },
    boost: { name: 'BOOST CORE', icon: 'ϟ', info: lvl => `${Math.round(lvl * 20)}% less drain, +${lvl * 3}% top speed` },
  };
  const UPGRADE_COST = [150, 350, 700], UPGRADE_MAX = 3;
  // Paint jobs for the player's ship: bought with credits or unlocked by a trophy.
  const PAINTS = [
    { id: 'factory', name: 'FACTORY', cost: 0 },
    { id: 'stealth', name: 'STEALTH', cost: 250, color: '#5b5f70', dark: '#14141c', accent: '#ff2a4a' },
    { id: 'chrome', name: 'CHROME', cost: 400, color: '#e8eef6', dark: '#5d6b80', accent: '#9fe8ff' },
    { id: 'flames', name: 'HOT RODS', cost: 600, color: '#ff4a1c', dark: '#3a0a04', accent: '#ffd35a', pattern: 'flames' },
    { id: 'stripes', name: 'RACING STRIPES', cost: 500, color: '#2f6bff', dark: '#0c1a4a', accent: '#ffffff', pattern: 'stripes' },
    { id: 'gold', name: '24K GOLD', trophy: 'win', color: '#ffd35a', dark: '#6a4a08', accent: '#fff6c8' },
    { id: 'kitty', name: 'NEON KITTY', trophy: 'cats10', color: '#ff9bf2', dark: '#4a1a46', accent: '#80faff', pattern: 'spots' },
    { id: 'rainbow', name: 'HYPER RAINBOW', trophy: 'galaxy', pattern: 'rainbow', accent: '#ffffff' },
  ];
  profile.paints = profile.paints || ['factory'];
  const paintOwned = p => p.cost === 0 || profile.paints.includes(p.id) || (p.trophy && profile.achievements && profile.achievements[p.trophy]);
  // drawShip appends alpha digits to colours ('#rrggbb' + '60'), so paints must be 6-digit hex.
  function hslHex(h, sat, l) {
    const k = n => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  function playerPaint(machine) {
    const p = PAINTS.find(x => x.id === profile.paint) || PAINTS[0];
    if (!paintOwned(p) || p.id === 'factory') return { color: machine.color, dark: machine.dark };
    if (p.pattern === 'rainbow') { const h = (time * 90) % 360; return { color: hslHex(h, 1, .62), dark: hslHex((h + 180) % 360, .8, .22), accent: p.accent, pattern: p.pattern }; }
    return { color: p.color, dark: p.dark, accent: p.accent, pattern: p.pattern };
  }
  const hullStrength = () => BASE_HULL_STRENGTH * (1 + profile.upgrades.armor * .25);
  const laserCap = () => BASE_LASER_CAPACITY + profile.upgrades.laser * 2;
  const laserRecharge = () => BASE_LASER_RECHARGE * (1 - profile.upgrades.laser * .15);
  const boostDrain = () => 1 - profile.upgrades.boost * .2;
  const topSpeed = () => 1 + profile.upgrades.boost * .03;
  let raceEarned = 0, creditPopAt = -9;
  function stat(key, add = 1) { profile.stats[key] = (profile.stats[key] || 0) + add; saveProfile(); return profile.stats[key]; }
  function addCredits(amount, why) {
    amount = Math.round(amount * diff().credits); if (!amount) return;
    profile.credits += amount; raceEarned += amount; saveProfile();
    $('credit-pop').textContent = `+${amount} CR  ${why}`; creditPopAt = time; $('credit-pop').classList.add('visible');
  }
  // ==== Trophy cabinet and unlock pop-ups.
  // ---- Achievements (trophy cabinet).
  const ACHIEVEMENTS = [
    { id: 'first-race', icon: '🏁', name: 'LIGHTS OUT', info: 'Finish your first race.' },
    { id: 'podium', icon: '🥉', name: 'PODIUM PILOT', info: 'Finish in the top 3.' },
    { id: 'win', icon: '🏆', name: 'PURE OVERDRIVE', info: 'Win a race.' },
    { id: 'flawless', icon: '💎', name: 'NOT A SCRATCH', info: 'Win a race without losing a life.' },
    { id: 'cats10', icon: '🐱', name: 'CRAZY CAT PILOT', info: 'Pixel-poof 10 cats.' },
    { id: 'ufo25', icon: '🛸', name: 'ALIEN KILLER', info: 'Shoot down 25 UFOs.' },
    { id: 'rivals50', icon: '💥', name: 'DEMOLITION DERBY', info: 'Destroy 50 rivals.' },
    { id: 'mothership', icon: '🌌', name: 'MOTHERSHIP DOWN', info: 'Destroy a mothership.' },
    { id: 'hyper', icon: '✦', name: 'LIGHT SPEED', info: 'Fly through a star gate.' },
    { id: 'collector', icon: '🧲', name: 'GADGETEER', info: 'Collect all four power-up types.' },
    { id: 'galaxy', icon: '🪩', name: 'DISCO SAVIOUR', info: 'Defeat the final boss and reach the disco.' },
    { id: 'galaxy6', icon: '👑', name: 'SINGULARITY SLAYER', info: 'Beat all six bosses of Singularity Run.' },
    { id: 'upgrade', icon: '🛠', name: 'GREASE MONKEY', info: 'Buy your first upgrade.' },
    { id: 'maxed', icon: '⚙', name: 'FULLY LOADED', info: 'Max out every upgrade.' },
    { id: 'unlock-all', icon: '🗺', name: 'GRAND TOURER', info: 'Unlock every circuit.' },
    { id: 'egg', icon: '🥚', name: 'EGG HUNTER', info: 'Find the secret on the title screen.' },
    { id: 'share', icon: '📣', name: 'BRAGGING RIGHTS', info: 'Share a race result.' },
    { id: 'nemesis', icon: '☠', name: 'NEMESIS HUNTER', info: 'Destroy all three nemeses in one race.' },
  ];
  profile.achievements = profile.achievements || {}; profile.stats = Object.assign({ cats: 0, ufos: 0, rivals: 0, powerTypes: [] }, profile.stats);
  const achQueue = []; let achShownAt = -9;
  function unlockAchievement(id) {
    if (profile.achievements[id]) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    profile.achievements[id] = Date.now(); saveProfile(); achQueue.push(a); showNextAchievement(); renderTrophyButton();
  }
  function showNextAchievement() {
    const el = $('achievement'); if (!el || el.classList.contains('visible') || !achQueue.length) return;
    const a = achQueue.shift();
    el.innerHTML = `<i>${a.icon}</i><span><small>ACHIEVEMENT UNLOCKED</small><b>${a.name}</b><em>${a.info}</em></span>`;
    el.classList.add('visible'); achShownAt = realTime(); playToneSweep(660, 1980, .45, 'triangle', .06);
  }
  // Driven by the frame loop (wall clock, so it also runs in menus and pauses).
  function tickAchievement() {
    const el = $('achievement'); if (!el) return;
    if (el.classList.contains('visible') && realTime() - achShownAt > 3.2) { el.classList.remove('visible'); achShownAt = realTime(); }
    else if (!el.classList.contains('visible') && achQueue.length && realTime() - achShownAt > .45) showNextAchievement();
  }
  function renderTrophyButton() { const b = $('open-trophies'); if (b) b.textContent = `🏆 TROPHIES ${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`; }
  function renderTrophies() {
    $('trophy-count').textContent = `${Object.keys(profile.achievements).length} / ${ACHIEVEMENTS.length}`;
    $('trophy-list').innerHTML = ACHIEVEMENTS.map(a => {
      const got = profile.achievements[a.id];
      return `<div class="trophy ${got ? 'got' : ''}"><i>${got ? a.icon : '🔒'}</i><span><b>${a.name}</b><em>${a.info}</em>${got ? `<small>${new Date(got).toLocaleDateString()}</small>` : ''}</span></div>`;
    }).join('');
  }
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
  // ==== Gyro steering and screen orientation.
  const tilt = { x: 0, neutral: 0, live: false };
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
  // ==== English → German translation (DOM and canvas text).
  // ---- Language: English (source text) or German. DOM text is swapped by a MutationObserver, canvas text in fillText,
  // so game code keeps writing English. Exact phrases first, then patterns for text with numbers, then " / " and " · " pieces.
  const DE = {
    // Home, modes, garage
    'ANTI-GRAVITY RACING SYSTEM': 'ANTI-GRAVITATIONS-RENNSYSTEM', 'THE FUTURE HAS NO SPEED LIMIT': 'DIE ZUKUNFT KENNT KEIN TEMPOLIMIT',
    'Zero gravity. Full throttle.': 'Null Schwerkraft. Vollgas.', 'Leave the ordinary in another dimension.': 'Lass das Gewöhnliche in einer anderen Dimension zurück.',
    'ENTER THE RACE': 'ZUM RENNEN', 'ENTER': 'ENTER', 'TO LAUNCH': 'ZUM STARTEN', 'TAP TO LAUNCH': 'TIPPEN ZUM STARTEN', 'LOCKED CIRCUIT': 'STRECKE GESPERRT',
    'GAME MODE': 'SPIELMODUS', '🏁 GRAND PRIX': '🏁 GRAND PRIX', '⏱ TIME TRIAL': '⏱ ZEITFAHREN', '☣ ENDLESS': '☣ ENDLOS', 'TIME TRIAL': 'ZEITFAHREN', 'GRAND PRIX': 'GRAND PRIX',
    'YOUR MACHINE': 'DEIN GLEITER', 'SELECT LEVEL': 'STRECKE WÄHLEN', 'CLASS': 'KLASSE', 'DISTANCE': 'DISTANZ', 'DIFFICULTY': 'SCHWIERIGKEIT',
    'BALANCED / PRECISION HANDLING': 'AUSGEWOGEN / PRÄZISES HANDLING', 'AGGRESSIVE / HIGH TOP SPEED': 'AGGRESSIV / HOHE SPITZE', 'AGILE / EXTENDED OVERDRIVE': 'WENDIG / LANGER OVERDRIVE',
    'THE ELECTRIC METROPOLIS': 'DIE ELEKTRISCHE METROPOLE', 'BURN THROUGH THE AFTERGLOW': 'BRENN DURCH DAS ABENDROT', 'DIVE INTO THE ULTRAVIOLET': 'TAUCH INS ULTRAVIOLETT',
    'THREAD THE FRACTURED SKYLINE': 'DURCH DIE ZERBROCHENE SKYLINE', 'LOW GRIP / ZERO MARGIN': 'WENIG GRIP / NULL SPIELRAUM', 'RIDE THE GRAVITY SHEAR': 'REITE DIE SCHWERKRAFTSCHERE',
    'LASER GATES / NO BRAKES': 'LASERTORE / KEINE BREMSEN', 'THE FINAL IMPOSSIBLE LINE': 'DIE LETZTE UNMÖGLICHE LINIE',
    '📅 DAILY CHALLENGE': '📅 TAGES-CHALLENGE', 'DAILY CHALLENGE': 'TAGES-CHALLENGE', 'GO ›': 'LOS ›', 'COME BACK TOMORROW': 'KOMM MORGEN WIEDER',
    '📊 STATS': '📊 STATISTIK', '⚙ SETTINGS': '⚙ EINSTELLUNGEN', '☰ CHANGELOG': '☰ NEUIGKEITEN', 'LIVE CIRCUIT FEED': 'LIVE-STRECKENBILD',
    'NO RIVALS, NO UFOS': 'KEINE RIVALEN, KEINE UFOS',
    // HUD
    'POSITION': 'PLATZ', 'LIVES': 'LEBEN', 'LIFE': 'LEBEN', 'LAP': 'RUNDE', 'PAUSE': 'PAUSE', 'CIRCUIT TELEMETRY': 'STRECKEN-TELEMETRIE', '✦ HYPERDRIVE': '✦ HYPERANTRIEB',
    'ANTI-GRAVITY DRIVE ONLINE': 'ANTI-GRAVITATIONSANTRIEB AKTIV', 'LOW ENERGY / RECHARGING': 'WENIG ENERGIE / LÄDT', 'HULL SHIELD': 'RUMPFSCHILD', 'BOOST ENERGY': 'BOOST-ENERGIE',
    'LASER CELLS': 'LASERZELLEN', 'UFO KILLS → MOTHERSHIP': 'UFO-ABSCHÜSSE → MUTTERSCHIFF', 'SPACE': 'LEER', 'BOOST': 'BOOST', 'LASER': 'LASER', '↟ CYAN PADS': '↟ CYAN-PADS',
    'TUTORIAL': 'TUTORIAL', 'SKIP ›': 'ÜBERSPRINGEN ›', 'DRAG ◀ ▶': 'ZIEHEN ◀ ▶', 'TILT ◀ ▶': 'KIPPEN ◀ ▶', 'STEER': 'LENKEN', 'SLIDE ▲': 'WISCHEN ▲', 'SLIDE ▼': 'WISCHEN ▼',
    'BRAKE': 'BREMSE', 'TAP': 'TIPPEN', 'ACCELERATE': 'GAS', 'ESC': 'ESC', 'BEST — —:—': 'BESTZEIT — —:—',
    // Health warning
    '⚠ PLEASE READ BEFORE PLAYING': '⚠ BITTE VOR DEM SPIELEN LESEN', 'HEALTH WARNING': 'GESUNDHEITSHINWEIS', 'Photosensitive seizures.': 'Lichtempfindliche Anfälle.',
    'This game contains flashing lights, rapidly changing colours, strobe-like explosions and fast-moving patterns. A very small percentage of people may experience seizures or blackouts when exposed to such images, even without any history of epilepsy.':
      'Dieses Spiel enthält Blitzlichter, schnell wechselnde Farben, stroboskopartige Explosionen und schnelle Muster. Bei einem sehr kleinen Teil der Menschen können solche Bilder Anfälle oder Bewusstseinsverlust auslösen, auch ohne bekannte Epilepsie.',
    'Stop playing immediately and consult a doctor': 'Hör sofort auf zu spielen und suche einen Arzt auf,',
    'if you or anyone watching experiences dizziness, altered vision, eye or muscle twitching, disorientation, involuntary movements or convulsions. Parents should supervise children while they play.':
      'wenn du oder jemand, der zusieht, Schwindel, Sehstörungen, Augen- oder Muskelzucken, Orientierungslosigkeit, unwillkürliche Bewegungen oder Krämpfe bemerkt. Eltern sollten Kinder beim Spielen beaufsichtigen.',
    'Play safely:': 'Sicher spielen:',
    'sit at a distance from the screen, play in a well-lit room, take a 10–15 minute break every hour and do not play when tired. Motion steering (gyro) and the speed effects can cause motion sickness — switch to touch steering in Settings if you feel unwell. Keep the volume at a comfortable level, especially with headphones.':
      'halte Abstand zum Bildschirm, spiele in einem hellen Raum, mach jede Stunde 10–15 Minuten Pause und spiele nicht, wenn du müde bist. Bewegungssteuerung (Gyro) und die Geschwindigkeitseffekte können Übelkeit verursachen — wechsle in den Einstellungen zur Touch-Steuerung, wenn dir unwohl ist. Halte die Lautstärke angenehm, besonders mit Kopfhörern.',
    'I UNDERSTAND': 'VERSTANDEN',
    // Shop, paints, trophies, stats
    'GARAGE / SHIP UPGRADES': 'GARAGE / SCHIFFS-UPGRADES', 'UPGRADES': 'UPGRADES', 'CREDITS': 'CREDITS',
    'Earn credits for finishing positions, podiums, rival and UFO kills, motherships and bosses.': 'Credits gibt es für Platzierungen, Podien, Abschüsse von Rivalen und UFOs, Mutterschiffe und Bosse.',
    '🛡 HULL ARMOR': '🛡 RUMPFPANZER', '◎ LASER BANK': '◎ LASERSPEICHER', 'ϟ BOOST CORE': 'ϟ BOOST-KERN', 'MAX': 'MAX',
    'PAINT SHOP': 'LACKIEREREI', 'Change the look of your ship. Trophy paint jobs unlock with the named trophy.': 'Ändere das Aussehen deines Schiffs. Trophäen-Lackierungen schaltest du mit der genannten Trophäe frei.',
    'FACTORY': 'WERKSLACK', 'EQUIPPED': 'AUSGERÜSTET', 'STEALTH': 'TARNKAPPE', 'CHROME': 'CHROM', 'HOT RODS': 'FLAMMEN', 'RACING STRIPES': 'RENNSTREIFEN', '24K GOLD': '24K GOLD',
    'NEON KITTY': 'NEON-KÄTZCHEN', 'HYPER RAINBOW': 'HYPER-REGENBOGEN', 'BACK TO THE GARAGE': 'ZURÜCK IN DIE GARAGE',
    'HALL OF FAME': 'RUHMESHALLE', 'TROPHIES': 'TROPHÄEN', 'UNLOCKED': 'FREIGESCHALTET', 'ACHIEVEMENT UNLOCKED': 'ERFOLG FREIGESCHALTET',
    'Finish your first race.': 'Beende dein erstes Rennen.', 'Finish in the top 3.': 'Komm unter die Top 3.', 'Win a race.': 'Gewinne ein Rennen.',
    'Win a race without losing a life.': 'Gewinne ein Rennen, ohne ein Leben zu verlieren.', 'Pixel-poof 10 cats.': 'Pixel-poffe 10 Katzen.', 'Shoot down 25 UFOs.': 'Schieß 25 UFOs ab.',
    'Destroy 50 rivals.': 'Zerstöre 50 Rivalen.', 'Destroy a mothership.': 'Zerstöre ein Mutterschiff.', 'Fly through a star gate.': 'Flieg durch ein Sternentor.',
    'Collect all four power-up types.': 'Sammle alle vier Power-up-Arten.', 'Defeat the final boss and reach the disco.': 'Besiege den Endboss und erreiche die Disco.',
    'Beat all six bosses of Singularity Run.': 'Besiege alle sechs Bosse von Singularity Run.', 'Buy your first upgrade.': 'Kauf dein erstes Upgrade.',
    'Max out every upgrade.': 'Bau jedes Upgrade voll aus.', 'Unlock every circuit.': 'Schalte jede Strecke frei.', 'Find the secret on the title screen.': 'Finde das Geheimnis auf dem Startbildschirm.',
    'Share a race result.': 'Teile ein Rennergebnis.', 'Destroy all three nemeses in one race.': 'Zerstöre alle drei Erzfeinde in einem Rennen.',
    'PILOT RECORD': 'PILOTENAKTE', 'STATS': 'STATISTIK', 'RACES': 'RENNEN', 'WINS': 'SIEGE', 'PODIUMS': 'PODIEN', 'PLAY TIME': 'SPIELZEIT', 'FAVOURITE': 'LIEBLINGSSTRECKE',
    'RIVALS DESTROYED': 'RIVALEN ZERSTÖRT', 'UFOs SHOT DOWN': 'UFOS ABGESCHOSSEN', 'CATS POPPED': 'KATZEN GEPOFFT', 'BOSSES DEFEATED': 'BOSSE BESIEGT',
    'ENDLESS RECORD': 'ENDLOS-REKORD', 'DAILY STREAK': 'TAGESSERIE', 'MOVE YOUR PROGRESS': 'FORTSCHRITT ÜBERTRAGEN',
    'Export a code on this device and import it on another one — credits, upgrades, paints, trophies, circuits, records and settings come along.':
      'Exportiere auf diesem Gerät einen Code und importiere ihn auf einem anderen — Credits, Upgrades, Lackierungen, Trophäen, Strecken, Rekorde und Einstellungen kommen mit.',
    '⤴ EXPORT CODE': '⤴ CODE EXPORTIEREN', '⤵ IMPORT CODE': '⤵ CODE IMPORTIEREN',
    'CODE COPIED — PASTE IT ON YOUR OTHER DEVICE.': 'CODE KOPIERT — FÜGE IHN AUF DEINEM ANDEREN GERÄT EIN.', 'COPY THE CODE BELOW AND PASTE IT ON YOUR OTHER DEVICE.': 'KOPIERE DEN CODE UNTEN UND FÜGE IHN AUF DEINEM ANDEREN GERÄT EIN.',
    'PASTE A PROFILE CODE INTO THE BOX FIRST.': 'FÜGE ZUERST EINEN PROFILCODE IN DAS FELD EIN.', 'THAT CODE DOES NOT LOOK RIGHT. CHECK IT AND TRY AGAIN.': 'DER CODE SIEHT NICHT RICHTIG AUS. PRÜFE IHN UND VERSUCH ES NOCHMAL.',
    // Settings
    'CONTROLS & DISPLAY': 'STEUERUNG & ANZEIGE', 'SETTINGS': 'EINSTELLUNGEN', 'STEERING': 'LENKUNG', '⟲ GYRO': '⟲ GYRO', '☝ TOUCH / KEYS': '☝ TOUCH / TASTEN',
    'EASY': 'LEICHT', 'NORMAL': 'NORMAL', 'HARD': 'SCHWER', 'VIBRATION': 'VIBRATION', '〰 ON': '〰 AN', '∅ OFF': '∅ AUS', 'ON': 'AN', 'OFF': 'AUS',
    'CALM MODE': 'RUHIGER MODUS', 'LESS SHAKE & FLASHING': 'WENIGER WACKELN & BLITZE', 'COLOUR-BLIND': 'FARBENBLIND', '⚠ DANGER MARKS': '⚠ GEFAHRENMARKER',
    'PERFORMANCE': 'LEISTUNG', 'AUTO · WATCHING FPS': 'AUTO · BEOBACHTET FPS', 'AUTO · LOW FPS DETECTED': 'AUTO · NIEDRIGE FPS ERKANNT', 'FEWER EFFECTS': 'WENIGER EFFEKTE', 'ALL EFFECTS': 'ALLE EFFEKTE',
    'AUTO': 'AUTO', 'LOW FX': 'WENIG FX', 'FULL': 'VOLL', 'SUBTITLES': 'UNTERTITEL', 'FOR VOICES': 'FÜR STIMMEN', '↺ PLAY IT AGAIN': '↺ NOCHMAL SPIELEN',
    'SCREEN': 'BILDSCHIRM', '▭ LANDSCAPE': '▭ QUER', '▯ PORTRAIT': '▯ HOCH', 'LANDSCAPE': 'QUERFORMAT', 'PORTRAIT': 'HOCHFORMAT', 'DONE': 'FERTIG', 'LANGUAGE': 'SPRACHE',
    "WHAT'S NEW": 'WAS IST NEU', 'CHANGELOG': 'NEUIGKEITEN', 'CLOSE': 'SCHLIESSEN',
    'ASKING FOR MOTION SENSOR ACCESS…': 'FRAGE NACH ZUGRIFF AUF DEN BEWEGUNGSSENSOR…', 'GYRO NOT AVAILABLE — USING TOUCH': 'GYRO NICHT VERFÜGBAR — TOUCH WIRD GENUTZT',
    'GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS': 'GYRO AN — HALTE DEIN GERÄT BEIM START NEUTRAL', 'DRAG ON THE TRACK TO STEER': 'ZUM LENKEN AUF DER STRECKE ZIEHEN',
    'VIBRATION ON': 'VIBRATION AN', 'VIBRATION OFF': 'VIBRATION AUS', 'THIS DEVICE CANNOT VIBRATE FROM THE WEB': 'DIESES GERÄT KANN IM BROWSER NICHT VIBRIEREN',
    'THE TUTORIAL RUNS IN YOUR NEXT GRAND PRIX': 'DAS TUTORIAL LÄUFT IN DEINEM NÄCHSTEN GRAND PRIX', 'LOW FPS · PERFORMANCE MODE ON': 'NIEDRIGE FPS · LEISTUNGSMODUS AN',
    // Pause, results, soundtrack, rotate
    'TAKE A BREATH, PILOT': 'DURCHATMEN, PILOT', 'RACE PAUSED': 'RENNEN PAUSIERT', 'The future can wait a moment.': 'Die Zukunft kann einen Moment warten.',
    'BACK TO OVERDRIVE': 'ZURÜCK IN DEN OVERDRIVE', 'RETURN TO GARAGE': 'ZURÜCK IN DIE GARAGE', 'NEON GRAND PRIX / RACE COMPLETE': 'NEON GRAND PRIX / RENNEN BEENDET',
    'PODIUM FINISH.': 'PODIUMSPLATZ.', 'PODIUM FINISH': 'PODIUMSPLATZ', 'LIMITS REDEFINED.': 'GRENZEN NEU DEFINIERT.', 'PURE OVERDRIVE.': 'PURER OVERDRIVE.', 'SHIELDS DOWN.': 'SCHILDE WEG.',
    'RACE TIME': 'RENNZEIT', 'BEST LAP': 'BESTE RUNDE', 'RACE AGAIN': 'NOCHMAL FAHREN', '⤴ SHARE RESULT': '⤴ ERGEBNIS TEILEN', 'NEW BEST TIME!': 'NEUE BESTZEIT!', 'TIME TRIAL DONE.': 'ZEITFAHREN BEENDET.',
    'GALAXY SAVED.': 'GALAXIE GERETTET.', 'ABDUCTED.': 'ENTFÜHRT.', 'GALAXY SAVED': 'GALAXIE GERETTET', 'GALAXY SAVED · INVASION REPELLED': 'GALAXIE GERETTET · INVASION ABGEWEHRT',
    'INTERGALACTIC CHAMPION / INVASION REPELLED': 'INTERGALAKTISCHER CHAMPION / INVASION ABGEWEHRT', 'GAME OVER / THE INVASION WON': 'GAME OVER / DIE INVASION HAT GESIEGT',
    'ENDLESS BOSS RUSH / GAME OVER': 'ENDLOSER BOSS-ANSTURM / GAME OVER', 'TARGET ACQUIRED.': 'ZIEL ERFASST.',
    'SOUNDTRACK / PRESS PLAY': 'SOUNDTRACK / PLAY DRÜCKEN', 'NOW PLAYING / LOCAL SOUNDTRACK': 'LÄUFT GERADE / LOKALER SOUNDTRACK', 'SOUNDTRACK / FILE UNAVAILABLE': 'SOUNDTRACK / DATEI FEHLT',
    'SOUNDTRACK / MUTED': 'SOUNDTRACK / STUMM', 'SOUNDTRACK / TAP TO PLAY': 'SOUNDTRACK / TIPPEN ZUM ABSPIELEN',
    'SYSTEM READY · SINGULARITY STABLE · GO RACE!': 'SYSTEM BEREIT · SINGULARITÄT STABIL · AB INS RENNEN!',
    'ROTATE TO LANDSCAPE': 'INS QUERFORMAT DREHEN', 'ROTATE TO PORTRAIT': 'INS HOCHFORMAT DREHEN', 'Your screen setting is': 'Deine Bildschirm-Einstellung ist', '. Turn your device to play.': '. Dreh dein Gerät zum Spielen.',
    'SWITCH TO': 'WECHSELN ZU', 'INSTEAD': '', 'CONGRATULATIONS!': 'GLÜCKWUNSCH!',
    // Race messages
    'BACK IN THE FIGHT!': 'ZURÜCK IM KAMPF!', 'BACK IN THE RACE!': 'ZURÜCK IM RENNEN!', 'BARRIER CONTACT': 'BANDENKONTAKT', 'BOMB DODGED!': 'BOMBE AUSGEWICHEN!',
    'BOOST DEPLETED': 'BOOST LEER', 'BOOST RAM': 'BOOST-RAMME', 'RIVAL DESTROYED': 'RIVALE ZERSTÖRT', 'HULL CONTACT': 'RUMPFKONTAKT', 'HYPERDRIVE OFFLINE': 'HYPERANTRIEB AUS',
    'HYPERDRIVE!': 'HYPERANTRIEB!', 'LASER CELLS RECHARGING': 'LASERZELLEN LADEN', 'LEGENDARY!  SHIELD + LASER RESTORED': 'LEGENDÄR!  SCHILD + LASER WIEDERHERGESTELLT',
    'LIGHT SPEED': 'LICHTGESCHWINDIGKEIT', 'INVINCIBLE': 'UNVERWUNDBAR', 'MEGA LASER': 'MEGA-LASER', '∞ BOOST': '∞ BOOST', 'MEGA BLAST!': 'MEGA-EXPLOSION!',
    'MOTHERSHIP DESTROYED!': 'MUTTERSCHIFF ZERSTÖRT!', 'NEW UFO INBOUND!': 'NEUES UFO IM ANFLUG!', 'RECHARGE': 'AUFLADEN', 'BOOST + SHIELD + LASER': 'BOOST + SCHILD + LASER',
    'RIVAL LASER LOCK!  BREAK LINE OF SIGHT': 'RIVALE HAT DICH IM VISIER!  RAUS AUS DER SCHUSSLINIE', 'WARNING': 'WARNUNG', 'RIVAL LASER LOCK': 'RIVALE ZIELT',
    'SHIELDS DOWN': 'SCHILDE WEG', 'TOTAL CHAIN REACTION': 'TOTALE KETTENREAKTION', 'SHIP DESTROYED!': 'SCHIFF ZERSTÖRT!', 'SMASHED THROUGH!': 'DURCHGEBROCHEN!',
    'TARGET MISSED': 'DANEBEN', 'LASERS LOW': 'LASER FAST LEER', 'THE MOTHERSHIP HAS ARRIVED': 'DAS MUTTERSCHIFF IST DA', 'SHOOT IT DOWN!': 'SCHIESS ES AB!',
    'THE SKY CLEARS': 'DER HIMMEL KLART AUF', 'TRAMPOLINE!  JUMP + BOOST!': 'TRAMPOLIN!  SPRUNG + BOOST!', 'UFO BOMB RUN!  DODGE OR JUMP!': 'UFO-BOMBENANGRIFF!  AUSWEICHEN ODER SPRINGEN!',
    'UFO BOMB RUN': 'UFO-BOMBENANGRIFF', 'DODGE!': 'AUSWEICHEN!', 'UFO HIT': 'UFO GETROFFEN', 'IT IS GOING DOWN!': 'ES STÜRZT AB!', 'WARNING: MOTHERSHIP!': 'WARNUNG: MUTTERSCHIFF!',
    'WEBBED!  SLOWED DOWN': 'EINGESPONNEN!  VERLANGSAMT', '🎮 GAMEPAD CONNECTED': '🎮 GAMEPAD VERBUNDEN', 'AIRBORNE': 'IN DER LUFT', 'TRAMPOLINE BOOST': 'TRAMPOLIN-BOOST',
    'BUBBLE POPPED!': 'BLASE GEPLATZT!', 'CATASTROPHIC FAILURE / SHIELDS OFFLINE': 'TOTALAUSFALL / SCHILDE OFFLINE', 'CAT PIXEL-POOF!  LASER +1': 'KATZEN-PIXEL-POFF!  LASER +1',
    'CAT PIXEL-POOF!  LASER FULL': 'KATZEN-PIXEL-POFF!  LASER VOLL', 'DRONE COLLISION': 'DROHNEN-KOLLISION', 'ENEMY LASER HIT': 'FEINDLICHER LASERTREFFER',
    'FINAL LAP — MAKE IT COUNT': 'LETZTE RUNDE — JETZT ZÄHLT ES', 'FINISH TOP 3 TO UNLOCK THE NEXT CIRCUIT  ·  WIN TO FACE THE INVASION!': 'TOP 3 SCHALTET DIE NÄCHSTE STRECKE FREI  ·  SIEG FÜHRT ZUR INVASION!',
    'HULL LOST / THE WHOLE PACK WENT NOVA': 'RUMPF VERLOREN / DAS GANZE FELD GING HOCH', 'LASER GATE HIT': 'LASERTOR GETROFFEN', 'MINE STRIKE': 'MINENTREFFER',
    'MOTHERSHIP LASER': 'MUTTERSCHIFF-LASER', 'LIGHTNING STRIKE': 'BLITZEINSCHLAG', 'METEOR STRIKE!': 'METEORTREFFER!', 'UFO BOMB HIT!': 'UFO-BOMBENTREFFER!',
    'RIVAL DESTROYED  /  +1 PLACE': 'RIVALE ZERSTÖRT  /  +1 PLATZ', 'BOSS DOWN': 'BOSS BESIEGT', 'RIVAL DOWN': 'RIVALE ERLEDIGT', 'UFO DOWN': 'UFO ERLEDIGT',
    'MOTHERSHIP DOWN': 'MUTTERSCHIFF ERLEDIGT', 'NEMESIS DOWN': 'ERZFEIND ERLEDIGT', 'DAILY STREAK BONUS': 'TAGESSERIEN-BONUS',
    'WATCH THE IMPACT MARKERS!': 'ACHTE AUF DIE EINSCHLAGMARKER!', 'VISIBILITY DROPPING': 'SICHT SINKT', 'THE TRACK PULLS YOU SIDEWAYS': 'DIE STRECKE ZIEHT DICH ZUR SEITE',
    '☄ METEOR SHOWER': '☄ METEORSCHAUER', '🌪 SANDSTORM': '🌪 SANDSTURM', '〰 GRAVITY WAVES': '〰 SCHWERKRAFTWELLEN',
    'MAGNET': 'MAGNET', 'SHIELD BUBBLE': 'SCHUTZBLASE', 'TIME WARP': 'ZEITLUPE', 'MULTI-LASER': 'MULTI-LASER',
    'PULLS IN PADS, CATS, GATES AND POWER-UPS': 'ZIEHT PADS, KATZEN, TORE UND POWER-UPS AN', 'ABSORBS THE NEXT 3 HITS': 'FÄNGT DIE NÄCHSTEN 3 TREFFER AB',
    'EVERYONE ELSE MOVES IN SLOW MOTION': 'ALLE ANDEREN FAHREN IN ZEITLUPE', 'EVERY SHOT HITS UP TO 3 TARGETS': 'JEDER SCHUSS TRIFFT BIS ZU 3 ZIELE',
    'HOMING MISSILE': 'ZIELSUCH-RAKETE', 'MINE LAYER': 'MINENLEGER', 'EMP BLAST': 'EMP-STOSS', 'LOCKS ON TO THE NEXT RIVAL AHEAD': 'ERFASST DEN NÄCHSTEN RIVALEN VOR DIR',
    'THREE MINES DROPPED BEHIND YOU': 'DREI MINEN HINTER DIR ABGEWORFEN', 'RIVALS AHEAD LOSE BOOST AND LASERS': 'RIVALEN VOR DIR VERLIEREN BOOST UND LASER',
    'MISSILE HIT': 'RAKETENTREFFER', 'RIVAL HIT YOUR MINE!': 'RIVALE AUF DEINE MINE GEFAHREN!', 'SLIPSTREAM': 'WINDSCHATTEN', 'BOOST CHARGING': 'BOOST LÄDT',
    // Tutorial
    'TILT YOUR DEVICE TO STEER': 'KIPPE DEIN GERÄT ZUM LENKEN', 'DRAG LEFT / RIGHT ON THE TRACK TO STEER': 'ZIEH AUF DER STRECKE NACH LINKS / RECHTS ZUM LENKEN',
    'STEER WITH  A / D  OR  ◀ ▶': 'LENKEN MIT  A / D  ODER  ◀ ▶', 'SLIDE UP (OR TAP ϟ) TO BOOST': 'NACH OBEN WISCHEN (ODER ϟ TIPPEN) FÜR BOOST', 'HOLD  SPACE  TO BOOST': 'HALTE  LEERTASTE  FÜR BOOST',
    'TAP THE TRACK (OR ◎) TO FIRE YOUR LASER': 'TIPP AUF DIE STRECKE (ODER ◎) FÜR DEN LASER', 'PRESS  X  TO FIRE YOUR LASER': 'DRÜCKE  X  FÜR DEN LASER',
    'CYAN PADS RECHARGE BOOST, SHIELD AND LASER': 'CYAN-PADS LADEN BOOST, SCHILD UND LASER', 'GRAB POWER-UP BOXES  ·  FLY THROUGH ✦ STAR GATES FOR HYPERDRIVE': 'SCHNAPP DIR POWER-UP-BOXEN  ·  FLIEG DURCH ✦ STERNENTORE FÜR DEN HYPERANTRIEB',
    // Finale
    '⚠ INVASION INCOMING ⚠': '⚠ INVASION IM ANMARSCH ⚠', '◀ ▶ MOVE  ·  FIRE: BLAST A HOLE IN THE WALL, THEN HIT THE OVERLORD': '◀ ▶ BEWEGEN  ·  FEUER: SPRENG EIN LOCH IN DIE WAND, DANN TRIFF DEN OBERHERRN',
    '⚠ WORMHOLE — MOVE!': '⚠ WURMLOCH — WEG DA!', 'FINAL BOSS!': 'ENDBOSS!', 'OVERLORD SPLATTERED!': 'OBERHERR ZERMATSCHT!', 'ENDLESS BOSS RUSH — WAVE 1!': 'ENDLOSER BOSS-ANSTURM — WELLE 1!',
    'HULL SHIELD ': 'RUMPFSCHILD ', 'SLIMED!': 'EINGESCHLEIMT!', 'ACID BURN!': 'SÄUREVERÄTZUNG!', 'MISSILE HIT!': 'RAKETENTREFFER!', 'CRYSTAL SHARD!': 'KRISTALLSPLITTER!', 'ZAPPED!': 'GEGRILLT!',
    'CHOMP!': 'HAPPS!', 'DEATH RAY!': 'TODESSTRAHL!', 'NEXT ONE INCOMING': 'DER NÄCHSTE KOMMT', 'SHARK SPLATTERED!': 'HAI ZERMATSCHT!', 'SPIDER SHATTERED!': 'SPINNE ZERSPLITTERT!',
    'MAGGOT SQUASHED!': 'MADE ZERQUETSCHT!', 'ROBOT SCRAPPED!': 'ROBOTER VERSCHROTTET!', 'CYCLOPS POPPED!': 'ZYKLOP GEPLATZT!',
  };
  const DE_RULES = [
    [/^(\d+) LAPS · (\d+) PILOTS · NO LIMITS$/, '$1 RUNDEN · $2 PILOTEN · OHNE LIMIT'],
    [/^(\d+) PILOTS · (\d+) LAPS · WIN TO FACE THE INVASION$/, '$1 PILOTEN · $2 RUNDEN · GEWINNE UND STELL DICH DER INVASION'],
    [/^CIRCUITS UNLOCKED: (.+)$/, 'STRECKEN FREI: $1'], [/^REWARD (\d+) CR$/, 'BELOHNUNG $1 CR'], [/^🔥 STREAK (\d+)$/, '🔥 SERIE $1'],
    [/^DESTROY (\d+) RIVALS ON (.+)$/, 'ZERSTÖRE $1 RIVALEN AUF $2'], [/^SHOOT DOWN (\d+) UFOs ON (.+)$/, 'SCHIESS $1 UFOS AB AUF $2'], [/^POP (\d+) CATS ON (.+)$/, 'POFFE $1 KATZEN AUF $2'],
    [/^FINISH (.+) WITHOUT LOSING A LIFE$/, 'BEENDE $1 OHNE LEBENSVERLUST'], [/^TOP 3 ON (.+) WITHOUT BOOSTING$/, 'TOP 3 AUF $1 OHNE BOOST'], [/^PODIUM ON (.+) ON HARD$/, 'PODIUM AUF $1 AUF SCHWER'], [/^WIN (.+)$/, 'GEWINNE $1'],
    [/^✓ DONE — (.+)$/, (m, a) => `✓ GESCHAFFT — ${tr(a)}`], [/^📅 DAILY CHALLENGE COMPLETE!  🔥 (\d+)-DAY STREAK$/, '📅 TAGES-CHALLENGE GESCHAFFT!  🔥 $1-TAGE-SERIE'],
    [/^🛠 UPGRADES · (\d+) CR$/, '🛠 UPGRADES · $1 CR'], [/^🏆 TROPHIES (.+)$/, '🏆 TROPHÄEN $1'], [/^NOW: (.+)$/, (m, a) => `JETZT: ${tr(a)}`], [/^NEXT: (.+)$/, (m, a) => `NÄCHSTE: ${tr(a)}`],
    [/^MAXED OUT — (.+)$/, (m, a) => `VOLL AUSGEBAUT — ${tr(a)}`], [/^takes (\d+)% less damage$/, 'nimmt $1 % weniger Schaden'], [/^(\d+) cells, recharge (\d+)% faster$/, '$1 Zellen, lädt $2 % schneller'],
    [/^(\d+)% less drain, \+(\d+)% top speed$/, '$1 % weniger Verbrauch, +$2 % Spitze'], [/^UPGRADE · (\d+) CR$/, 'UPGRADE · $1 CR'], [/^BUY · (\d+) CR$/, 'KAUFEN · $1 CR'],
    [/^(\d+) WAVES?\.?$/, (m, a) => `${a} ${a === '1' ? 'WELLE' : 'WELLEN'}${m.endsWith('.') ? '.' : ''}`], [/^(\d+) DAYS$/, '$1 TAGE'], [/^(\d+)H (\d+)M$/, '$1 STD $2 MIN'],
    [/^BEST (.+)$/, 'BESTZEIT $1'], [/^LAP (\d+) \/ (\d+) — KEEP PUSHING$/, 'RUNDE $1 / $2 — WEITER SO'], [/^P(\d+) FINISH$/, 'PLATZ $1'], [/^TIME TRIAL \/ (.+)$/, 'ZEITFAHREN / $1'],
    [/^\+(\d+) CR EARNED  ·  (\d+) CR TOTAL$/, '+$1 CR VERDIENT  ·  $2 CR GESAMT'], [/^DIFFICULTY: (\w+) · (.*?)(\d+)% CREDITS$/, (m, d, l, c) => `SCHWIERIGKEIT: ${tr(d)} · ${l.replace('+1 LIFE', '+1 LEBEN').replace('-1 LIFE', '-1 LEBEN')}${c} % CREDITS`],
    [/^SHIP DESTROYED  \/  (\d+) LI(?:VES|FE) LEFT$/, 'SCHIFF ZERSTÖRT  /  NOCH $1 LEBEN'], [/^SHIP DESTROYED!  (\d+) LI(?:VES|FE) LEFT$/, 'SCHIFF ZERSTÖRT!  NOCH $1 LEBEN'],
    [/^MOTHERSHIP HIT  \/  (\d+)%$/, 'MUTTERSCHIFF GETROFFEN  /  $1 %'], [/^RIVAL HIT  \/  HULL (.+)$/, 'RIVALE GETROFFEN  /  RUMPF $1'], [/^(.+) HIT  \/  HULL (\d\/6)$/, '$1 GETROFFEN  /  RUMPF $2'],
    [/^EMP  \/  (\d+) RIVALS STALLED$/, 'EMP  /  $1 RIVALEN LAHMGELEGT'], [/^MISSILE GOT (.+)!$/, 'RAKETE ERWISCHT $1!'],
    [/^NEMESIS (.+) DESTROYED!$/, 'ERZFEIND $1 ZERSTÖRT!'], [/^(.+) IS OUT!$/, '$1 IST RAUS!'], [/^(.+) HIT YOU$/, '$1 HAT DICH ERWISCHT'], [/^BUBBLE ABSORBED IT  \/  (\d+) LEFT$/, 'DIE BLASE HAT ES ABGEFANGEN  /  NOCH $1'],
    [/^([^/·]+)  SHIELD -(\d+)$/, (m, a, n) => `${tr(a)}  SCHILD -${n}`], [/^SHIELD -(\d+)$/, 'SCHILD -$1'], [/^([A-Z-]+) HIT  \/  (\d+) TO GO$/, '$1 GETROFFEN  /  NOCH $2'],
    [/^BOSS (\d+)\/(\d+) DOWN  \/  NEXT ONE INCOMING$/, 'BOSS $1/$2 BESIEGT  /  DER NÄCHSTE KOMMT'], [/^WAVE (\d+) CLEARED  \/  NEXT ONE INCOMING$/, 'WELLE $1 GESCHAFFT  /  DIE NÄCHSTE KOMMT'],
    [/^WAVE (\d+): (.+)$/, 'WELLE $1: $2'], [/^FINAL BOSS (\d+)\/(\d+)!$/, 'ENDBOSS $1/$2!'], [/^ALIEN WALL (.+)$/, 'ALIEN-WAND $1'], [/^LIVES (.*)$/, 'LEBEN $1'],
    [/^(\d+)% CREDITS$/, '$1 % CREDITS'], [/^LOADING MUSIC (\d+)%$/, 'MUSIK LÄDT $1 %'], [/^SOUNDTRACK \/ LOADING (\d+)%$/, 'SOUNDTRACK / LÄDT $1 %'],
    [/^ROTATE TO (\w+)$/, (m, a) => `INS ${a === 'LANDSCAPE' ? 'QUERFORMAT' : 'HOCHFORMAT'} DREHEN`], [/^SCREEN: (\w+)$/, (m, a) => `BILDSCHIRM: ${tr(a)}`],
    [/^TUTORIAL (\d+)\/(\d+)$/, 'TUTORIAL $1/$2'], [/^🔒 LOCKED — FINISH TOP 3 ON (.+) TO UNLOCK$/, '🔒 GESPERRT — KOMM AUF $1 UNTER DIE TOP 3'], [/^🔓 NEW CIRCUIT UNLOCKED: (.+)!$/, '🔓 NEUE STRECKE FREI: $1!'],
    [/^✦ NEW ENDLESS RECORD! \(previous best: (\d+)\)$/, '✦ NEUER ENDLOS-REKORD! (bisher: $1)'], [/^BOSS AFTER BOSS UNTIL YOU FALL · RECORD (\d+) WAVES$/, 'BOSS UM BOSS, BIS DU FÄLLST · REKORD $1 WELLEN'],
    [/^(\d+) BOSS(?:ES)? SPLATTERED · (\d+) UFOs$/, '$1 BOSS(E) ZERMATSCHT · $2 UFOS'], [/^(\d+) UFOs SHOT DOWN · (\d+) TROPHIES$/, '$1 UFOS ABGESCHOSSEN · $2 TROPHÄEN'],
    [/^TIME (.+)   BEST LAP (.+)$/, 'ZEIT $1   BESTE RUNDE $2'], [/^(.+)  \/  HYPER VELOCITY$/, '$1  /  HYPERTEMPO'], [/^(\d[\d.,]*) KM$/, '$1 KM'],
    [/^☠ MOTHERSHIP  (\d+)%$/, '☠ MUTTERSCHIFF  $1 %'], [/^(.+) — UPGRADE$/, '$1 — UPGRADE'],
  ];
  const trCache = new Map();
  function trCore(core) {
    if (Object.prototype.hasOwnProperty.call(DE, core)) return DE[core];
    for (const [re, rep] of DE_RULES) if (re.test(core)) return core.replace(re, rep);
    return null;
  }
  function tr(text) {
    if (settings.lang !== 'de' || typeof text !== 'string' || !/[A-Za-z]{2}/.test(text)) return text;
    const hit = trCache.get(text); if (hit !== undefined) return hit;
    const lead = text.match(/^\s*/)[0], core = text.trim(), trail = core ? text.slice(lead.length + core.length) : '';
    let out = trCore(core);
    // Composite messages: translate each piece between " / " and " · " separators.
    if (out === null) out = /\s[\/·]\s/.test(core) ? core.split(/(\s+[\/·]\s+)/).map(p => /[\/·]/.test(p) && !p.trim().replace(/[\/·]/, '') ? p : (trCore(p.trim()) ?? p)).join('') : core;
    out = lead + out + trail; if (trCache.size > 1500) trCache.clear(); trCache.set(text, out); return out;
  }
  // DOM: remember each text node's English source so switching back and forth works, and re-translate whenever code writes text.
  const i18nNodes = new WeakMap();
  function trNode(n) {
    const rec = i18nNodes.get(n), cur = n.nodeValue, en = rec && cur === rec.out ? rec.en : cur, out = tr(en);
    i18nNodes.set(n, { en, out }); if (cur !== out) n.nodeValue = out;
  }
  function trTree(root) {
    if (!root || typeof document.createTreeWalker !== 'function') return;
    if (root.nodeType === 3) { trNode(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.nodeName) || root.closest?.('[data-no-i18n]')) return;
    const walker = document.createTreeWalker(root, 4); let n;
    while ((n = walker.nextNode())) if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) && !n.parentNode.closest?.('[data-no-i18n]')) trNode(n);
  }
  function applyLanguage() {
    trCache.clear();
    try { document.documentElement.lang = settings.lang === 'de' ? 'de' : 'en'; } catch { /* ignore */ }
    trTree(document.body);
  }
  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(list => { for (const m of list) { if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trTree); } })
      .observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  // Canvas text (callouts, finale, HUD on canvas) goes through the same table.
  try {
    const fill = ctx.fillText, stroke = ctx.strokeText;
    if (typeof fill === 'function') { ctx.fillText = function (t, ...a) { return fill.call(this, tr(t), ...a); }; ctx.strokeText = function (t, ...a) { return stroke.call(this, tr(t), ...a); }; }
  } catch { /* fixed context */ }
  settingHooks.lang = applyLanguage;
  window.morbidI18n = { tr, apply: applyLanguage };
  // ==== Circuits, machines, track building and resizing.
  const tracks = [
    { name: 'NEON HORIZON', type: 'THE ELECTRIC METROPOLIS', feed: 'NIGHT CITY // 2097', sector: 'SECTOR 07 / NIGHTFALL', class: 'HYPER', difficulty: 3, sky: ['#090c32', '#442085', '#ed398f'], fog: '#743190', road: '#151033', edge: '#ff45ca', second: '#40f6ff', sun: '#ffb334', curve: 1, hill: 1, width: 1, grip: 1, bends: [[3, .75], [7, .32]], padEvery: 240, padStart: 155, padLength: 16, recharge: 90, hazards: 0, rivalPace: 1 },
    { name: 'SOLAR RIOT', type: 'BURN THROUGH THE AFTERGLOW', feed: 'SOLAR FIELDS // 2097', sector: 'SECTOR 12 / SOLAR STORM', class: 'INFERNO', difficulty: 4, sky: ['#23092d', '#9c1b61', '#ff8542'], fog: '#ba3b6a', road: '#291039', edge: '#ffb52e', second: '#eaff4d', sun: '#ffef82', curve: 1.3, hill: 1.3, width: .97, grip: .98, bends: [[2, .55], [5, .34], [9, .16]], padEvery: 260, padStart: 167, padLength: 14, recharge: 82, hazards: 2, hazardTypes: ['mine'], rivalPace: 1.02 },
    { name: 'ION DREAM', type: 'DIVE INTO THE ULTRAVIOLET', feed: 'ION EXPANSE // 2097', sector: 'SECTOR 03 / ION SQUALL', class: 'PHANTOM', difficulty: 5, sky: ['#070c30', '#153c80', '#30acae'], fog: '#295c88', road: '#101c38', edge: '#ac64ff', second: '#65ffca', sun: '#a29aff', curve: 1.65, hill: 1.6, width: .94, grip: .95, bends: [[3, .56], [6, .3], [11, .15]], padEvery: 280, padStart: 174, padLength: 13, recharge: 75, hazards: 4, hazardTypes: ['mine', 'drone'], rivalPace: 1.04 },
    { name: 'GLITCH SPIRE', type: 'THREAD THE FRACTURED SKYLINE', feed: 'SPIRE DISTRICT // 2097', sector: 'SECTOR 19 / GLITCH SPIRE', class: 'GLITCH', difficulty: 6, sky: ['#16042b', '#5220a6', '#f44ab7'], fog: '#61309b', road: '#1b1234', edge: '#f43cff', second: '#e6ff54', sun: '#ff65bc', curve: 1.9, hill: 1.75, width: .9, grip: .91, bends: [[2, .5], [6, .3], [11, .18]], padEvery: 300, padStart: 184, padLength: 12, recharge: 68, hazards: 6, hazardTypes: ['mine', 'drone'], rivalPace: 1.06 },
    { name: 'CRYO CANYON', type: 'LOW GRIP / ZERO MARGIN', feed: 'CRYO DEEP // 2097', sector: 'SECTOR 22 / FROSTBITE', class: 'CRYO', difficulty: 6, sky: ['#04172b', '#126c93', '#6de4e8'], fog: '#297e99', road: '#102a40', edge: '#7cf8ff', second: '#99ffdb', sun: '#e6ffff', curve: 2.05, hill: 2.15, width: .86, grip: .67, bends: [[2, .48], [7, .31], [13, .14]], padEvery: 330, padStart: 202, padLength: 11, recharge: 61, hazards: 8, hazardTypes: ['mine', 'drone'], rivalPace: 1.08, hazardPenalty: .28 },
    { name: 'VOID CIRCUIT', type: 'RIDE THE GRAVITY SHEAR', feed: 'DARK MATTER // 2097', sector: 'SECTOR 31 / EVENT HORIZON', class: 'VOID', difficulty: 7, sky: ['#07031b', '#23105b', '#5430a6'], fog: '#382365', road: '#12102b', edge: '#ab5bff', second: '#ff4fd8', sun: '#ffb752', curve: 2.3, hill: 2.35, width: .82, grip: .86, bends: [[2, .48], [5, .29], [10, .17], [15, .08]], padEvery: 360, padStart: 228, padLength: 10, recharge: 55, hazards: 10, hazardTypes: ['drone', 'mine'], rivalPace: 1.1, hazardPenalty: .31 },
    { name: 'PLASMA MAELSTROM', type: 'LASER GATES / NO BRAKES', feed: 'PLASMA BELT // 2097', sector: 'SECTOR 44 / REDLINE', class: 'CHAOS', difficulty: 7, sky: ['#250521', '#76184e', '#ff4c36'], fog: '#b33562', road: '#291026', edge: '#ff364f', second: '#ffdd35', sun: '#ffdf67', curve: 2.5, hill: 2.2, width: .78, grip: .79, bends: [[3, .43], [7, .3], [12, .2], [17, .09]], padEvery: 400, padStart: 257, padLength: 9, recharge: 49, hazards: 12, hazardTypes: ['gate', 'drone'], rivalPace: 1.13, hazardPenalty: .34 },
    { name: 'SINGULARITY RUN', type: 'THE FINAL IMPOSSIBLE LINE', feed: 'SINGULARITY // 2097', sector: 'SECTOR 99 / POINT OF NO RETURN', class: 'OMEGA', difficulty: 8, sky: ['#030611', '#121a42', '#43227d'], fog: '#311d69', road: '#0e1028', edge: '#f03bff', second: '#54fbff', sun: '#e1ff57', curve: 2.75, hill: 2.8, width: .74, grip: .73, bends: [[2, .47], [5, .3], [9, .19], [14, .1]], padEvery: 480, padStart: 316, padLength: 8, recharge: 43, hazards: 15, hazardTypes: ['gate', 'mine', 'drone'], rivalPace: 1.16, hazardPenalty: .38 }
  ];
  const machines = [
    { color: '#44f7ff', dark: '#09627d', name: 'PHANTOM', info: 'BALANCED / PRECISION HANDLING', handling: 1, top: 1, drain: 22 },
    { color: '#ff4aa8', dark: '#851657', name: 'VIPER', info: 'AGGRESSIVE / HIGH TOP SPEED', handling: .88, top: 1.06, drain: 25 },
    { color: '#ddff46', dark: '#56751b', name: 'PULSE', info: 'AGILE / EXTENDED OVERDRIVE', handling: 1.2, top: .96, drain: 17 }
  ];
  function resize() {
    W = innerWidth; H = innerHeight; dpr = lowFx() ? 1 : Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function buildTrack() {
    const t = tracks[trackIndex];
    segments = Array.from({ length: COUNT }, (_, i) => {
      const angle = i / COUNT * TAU;
      const intro = Math.min(1, i / 90);
      const curve = t.bends.reduce((sum, [frequency, amplitude], bend) => sum + Math.sin(angle * frequency + bend * .7) * amplitude, 0);
      const padPosition = i % t.padEvery;
      return { index: i, curve: curve * t.curve * intro,
        y: (Math.sin(angle * 2) * 1900 + Math.sin(angle * 5) * 700 + Math.sin(angle * 9) * 260) * t.hill,
        pad: padPosition >= t.padStart && padPosition < t.padStart + t.padLength, padLane: Math.floor(i / t.padEvery) % 2 === 0 ? -.48 : .48,
        arch: i % Math.max(90, 150 - trackIndex * 6) === 30, tower: i % 9 === 0, p1: {}, p2: {} };
    });
    const placed = [];
    for (let i = 0; i < (t.hazards || 0); i++) {
      let index = Math.floor((i + 1) * COUNT / (t.hazards + 1));
      while (segments[index].pad || placed.some(other => Math.abs(other - index) < 20)) index = (index + 29) % COUNT;
      placed.push(index);
      const lane = [-.59, 0, .59][Math.floor(random(index + trackIndex * 101 + i) * 3)];
      segments[index].hazard = { type: t.hazardTypes[i % t.hazardTypes.length], lane, phase: random(index + 7) * TAU,
        radius: .14 + trackIndex * .008, index };
    }
    const catCount = 2 + Math.floor(trackIndex / 2);
    for (let i = 0; i < catCount; i++) {
      let index = Math.floor((i + 1) * COUNT / (catCount + 1));
      while (segments[index].pad || segments[index].hazard || placed.some(other => Math.abs(other - index) < 18)) index = (index + 29) % COUNT;
      placed.push(index);
      segments[index].hazard = { type: 'cat', lane: 0, phase: random(index + 500) * TAU, radius: .115, index,
        color: ['#ff9bf2', '#80faff', '#e4ff61'][i % 3] };
    }
    const trampolineCount = 3 + Math.floor(trackIndex / 3), trampolineLanes = [-.46, .46, 0, .46, -.46];
    for (let i = 0; i < trampolineCount; i++) {
      let index = Math.floor((i + 1) * COUNT / (trampolineCount + 1)) + 27;
      index = mod(index, COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || placed.some(other => Math.abs(other - index) < 22)) index = mod(index + 31, COUNT);
      placed.push(index);
      segments[index].trampoline = { index, lane: trampolineLanes[i % trampolineLanes.length] };
    }
    // Star gates: rare lane-specific portals that trigger the 15-second hyperdrive.
    const gateLanes = [.4, -.4, 0];
    for (let i = 0; i < 2; i++) {
      let index = mod(Math.floor((i + .62) * COUNT / 2), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || placed.some(other => Math.abs(other - index) < 24)) index = mod(index + 37, COUNT);
      placed.push(index);
      segments[index].stargate = { index, lane: gateLanes[(i + trackIndex) % gateLanes.length] };
    }
    const powerLanes = [-.42, .42, 0, .3, -.3, 0];
    for (let i = 0; i < 6; i++) {
      let index = mod(Math.floor((i + .38) * COUNT / 6), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || segments[index].stargate || placed.some(other => Math.abs(other - index) < 16)) index = mod(index + 23, COUNT);
      placed.push(index);
      segments[index].powerup = { index, lane: powerLanes[i], type: POWERUP_ORDER[(i + trackIndex) % POWERUP_ORDER.length] };
    }
    // Attack boxes: one of each per lap, in the second half of the field.
    for (let i = 0; i < ATTACK_ORDER.length; i++) {
      let index = mod(Math.floor((i + .7) * COUNT / 3), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || segments[index].stargate || segments[index].powerup || placed.some(other => Math.abs(other - index) < 14)) index = mod(index + 19, COUNT);
      placed.push(index);
      segments[index].powerup = { index, lane: [.35, -.35, 0][(i + trackIndex) % 3], type: ATTACK_ORDER[(i + trackIndex) % ATTACK_ORDER.length] };
    }
    try { bestLap = Number(localStorage.getItem(`chroma-best-${trackIndex}`)) || 0; } catch { bestLap = 0; }
  }
  function selectTrack(delta) {
    trackIndex = mod(trackIndex + delta, tracks.length); buildTrack();
    const t = tracks[trackIndex];
    $('track-name').textContent = t.name; $('track-type').textContent = t.type;
    $('track-class').textContent = t.class; $('feed-label').textContent = t.feed;
    document.querySelector('.map-caption').textContent = t.sector;
    document.querySelector('.pill').textContent = `${String(trackIndex + 1).padStart(2, '0')} — ${String(tracks.length).padStart(2, '0')}`;
    renderGameMode();
    $('difficulty').innerHTML = '▰'.repeat(t.difficulty) + '<em>' + '▰'.repeat(8 - t.difficulty) + '</em>';
    const points = Array.from({ length: 96 }, (_, i) => {
      const angle = i / 96 * TAU, wobble = Math.sin(angle * (trackIndex + 2)) * (3 + t.curve * 1.4);
      return [165 + Math.cos(angle) * (96 + wobble), 70 + Math.sin(angle) * (42 + Math.cos(angle * (trackIndex + 1)) * (4 + t.hill * 1.5))];
    });
    const path = `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
    document.querySelector('.map-line').setAttribute('d', path);
    document.querySelector('.map-glow').setAttribute('d', path);
    document.querySelector('.map-line').style.stroke = t.second;
    document.querySelector('.map-glow').style.stroke = t.second;
  }
  // ==== Named nemesis rivals (data is used by the voice clip list).
  const NEMESES = [
    { id: 'vex', name: 'VEX', title: 'THE VIPER QUEEN', color: '#ff2a8a', dark: '#4a0420' },
    { id: 'kronos', name: 'KRONOS', title: 'THE IRON TITAN', color: '#ffb347', dark: '#4a2a04' },
    { id: 'null9', name: 'NULL-9', title: 'THE ROGUE AI', color: '#7dfcff', dark: '#06343a' },
    { id: 'blaze', name: 'BLAZE', title: 'THE SHOW-OFF', color: '#ff5a1c', dark: '#3a0e02' },
  ];
  function nemesisTaunt(r) {
    if (time - (r.tauntAt || 0) < 8) return; r.tauntAt = time;
    const lines = { vex: 'YOU ARE GOING DOWN, ROOKIE!', kronos: 'KRONOS OWNS THIS TRACK!', null9: 'TARGET ACQUIRED.', blaze: 'EAT MY EXHAUST!' };
    showCallout(`${r.nemesis.name}: “${lines[r.nemesis.id]}”`, r.nemesis.color); robotSay(lines[r.nemesis.id], `taunt-${r.nemesis.id}`);
  }
  // ==== Audio graph, soundtrack preloading, sound effects, robot voice, jets.
  let jetSource, jetFilter, jetGain, jetWhine, jetWhineGain;
  // Each kill call has a pre-rendered retro robot clip in voice/ (made by tools/make-voice.sh).
  const KILL_CALLS = [['ALIEN KILLER!', 'alien-killer'], ['FATALITY!', 'fatality'], ['UFO OBLITERATED!', 'ufo-obliterated'], ['ABDUCT THIS!', 'abduct-this'],
    ['INVASION CANCELLED!', 'invasion-cancelled'], ['CLOSE ENCOUNTER OF THE FATAL KIND!', 'close-encounter'], ['SAUCER SMASHED!', 'saucer-smashed'],
    ['GREEN MEN DOWN!', 'green-men-down'], ['PROBE DENIED!', 'probe-denied'], ['AREA 51 SAYS THANK YOU!', 'area-51'], ['TOASTED SAUCER!', 'toasted-saucer'],
    ['MOTHERSHIP WILL HEAR ABOUT THIS!', 'mothership'], ['ULTRA KILL!', 'ultra-kill'], ['GALACTIC HUMILIATION!', 'galactic-humiliation'],
    ['NO PARKING IN MY SKY!', 'no-parking'], ['RETURN TO SENDER!', 'return-to-sender']];
  const VOICE_CLIPS = [...KILL_CALLS.map(call => call[1]), 'hyperdrive-initiated', 'first-place', 'mothership-warning', 'mothership-down', 'invasion-incoming', 'congratulations', 'next-boss', 'scream-overlord', 'scream-cyclops', 'scream-maggot', 'scream-robot', ...NEMESES.flatMap(n => [`taunt-${n.id}`, `down-${n.id}`])];
  const voiceBuffers = new Map();
  let voiceSource = null;
  let subtitleAt = -9;
  function setupAudio() {
    if (audioContext) { audioContext.resume().catch(() => {}); return; }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser(); analyser.fftSize = 128;
      musicGain = audioContext.createGain(); musicGain.gain.value = .92;
      sfxBus = audioContext.createGain(); sfxBus.gain.value = 1.55;
      musicSource = audioContext.createMediaElementSource(audio); musicSource.connect(analyser); analyser.connect(musicGain); musicGain.connect(audioContext.destination);
      sfxBus.connect(audioContext.destination);
      frequency = new Uint8Array(analyser.frequencyBinCount);
      engineOsc = audioContext.createOscillator(); engineOsc.type = 'sawtooth';
      const filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220;
      engineGain = audioContext.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(sfxBus); engineOsc.start();
      setupJet(); loadVoices();
    } catch { /* The soundtrack still plays if Web Audio is unavailable. */ }
  }
  // ---- Soundtrack preloading: the whole MP3 is downloaded into memory as soon as the page opens and played
  // from a local blob, so playback can never run dry mid-race. Races wait (briefly) until it is ready.
  const SOUNDTRACK_URL = (audio.getAttribute && audio.getAttribute('src')) || audio.src;
  let soundtrackReady = false, soundtrackProgress = 0, soundtrackPromise = null, musicWanted = false;
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='; // 0.1 s of silence

  function preloadSoundtrack() {
    if (soundtrackPromise) return soundtrackPromise;
    if (typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL || typeof Blob === 'undefined') {
      soundtrackReady = true; audio.preload = 'auto'; return (soundtrackPromise = Promise.resolve());
    }
    soundtrackPromise = (async () => {
      updateMusic();
      try {
        const response = await fetch(SOUNDTRACK_URL);
        if (!response.ok) throw new Error(String(response.status));
        const total = Number(response.headers.get('content-length')) || 0;
        let blob;
        if (response.body && response.body.getReader && total) {
          const reader = response.body.getReader(), chunks = []; let received = 0;
          for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); received += value.length; soundtrackProgress = Math.min(.99, received / total); updateMusic(); }
          blob = new Blob(chunks, { type: 'audio/mpeg' });
        } else blob = await response.blob();
        const resume = !audio.paused && !String(audio.src || '').startsWith('data:'), at = String(audio.src || '').startsWith('data:') ? 0 : audio.currentTime || 0;
        audio.src = URL.createObjectURL(blob); audio.preload = 'auto'; audio.load();
        await new Promise(done => { audio.addEventListener('canplaythrough', done, { once: true }); audio.addEventListener('error', done, { once: true }); setTimeout(done, 4000); });
        if (at) try { audio.currentTime = at; } catch { /* keep the start */ }
        if (resume || musicWanted) audio.play().catch(() => {});
      } catch {
        // Offline without a cached copy or a failed download: fall back to normal streaming.
        audio.src = SOUNDTRACK_URL; audio.preload = 'auto'; try { audio.load(); } catch { /* ignore */ }
        if (musicWanted) audio.play().catch(() => {});
      }
      soundtrackReady = true; soundtrackProgress = 1; updateMusic();
    })();
    return soundtrackPromise;
  }
  function playMusic() {
    setupAudio(); audio.volume = .24; musicWanted = true;
    if (!soundtrackReady) {
      // Unlock the audio element inside the user's tap (needed on iOS), but don't stream it twice:
      // it starts for real as soon as the preloaded copy is ready.
      if (!String(audio.src || '').startsWith('blob:')) audio.src = SILENCE;
      const unlock = audio.play(); if (unlock && unlock.then) unlock.then(() => { if (!soundtrackReady) audio.pause(); }).catch(() => {});
      updateMusic(); return;
    }
    audio.play().then(updateMusic).catch(() => { $('music-status').textContent = 'SOUNDTRACK / TAP TO PLAY'; });
  }
  function updateMusic() {
    const playing = !audio.paused && !muted;
    document.body.classList.toggle('playing', playing);
    $('music-status').textContent = !soundtrackReady ? `SOUNDTRACK / LOADING ${Math.round(soundtrackProgress * 100)}%` : muted ? 'SOUNDTRACK / MUTED' : playing ? 'NOW PLAYING / LOCAL SOUNDTRACK' : 'SOUNDTRACK / PRESS PLAY';
    $('music-toggle').setAttribute('aria-label', audio.paused ? 'Play soundtrack' : 'Pause soundtrack');
    $('sound').textContent = muted ? '♪̸' : '♫';
    $('sound').setAttribute('aria-label', muted ? 'Unmute soundtrack' : 'Mute soundtrack');
  }
  function toggleMute() { muted = !muted; audio.muted = muted; updateMusic(); }
  function soundEffect(freq, duration, type = 'sine') {
    if (!audioContext || muted) return;
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * .5, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(.06, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    osc.connect(gain); gain.connect(sfxBus || audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function playToneSweep(from, to, duration, type, volume) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(sfxBus || audioContext.destination); oscillator.start(now); oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Synth effects are optional on browsers with limited Web Audio support. */ }
  }
  function playNoiseBurst(duration, volume, cutoffFrom, cutoffTo) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime, length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
      const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate), samples = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoffFrom, now); filter.frequency.exponentialRampToValueAtTime(cutoffTo, now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(sfxBus || audioContext.destination); source.start(now); source.stop(now + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch { /* Keep gameplay running if a browser cannot synthesize noise. */ }
  }
  // Haptics: short buzzes for hits and boosts, long rumbles for explosions (Android; iOS has no web vibration).
  let lastBuzz = 0;
  function buzz(pattern, minGap = .06) {
    if (!settings.haptics || mode === 'menu' || typeof navigator === 'undefined' || !navigator.vibrate) return;
    if (time - lastBuzz < minGap) return; lastBuzz = time;
    try { navigator.vibrate(pattern); } catch { /* unsupported */ }
  }
  function playBoostSound(power = 1) {
    buzz(Math.round(25 * power));
    playToneSweep(95, 560, .3, 'sawtooth', .055 * power);
    playNoiseBurst(.24, .055 * power, 3400, 260);
  }
  function playLaserSound() {
    playToneSweep(1750, 180, .13, 'square', .048);
    playToneSweep(510, 95, .17, 'sawtooth', .035);
  }
  function playImpactSound(power = 1) {
    buzz(Math.round(35 + 45 * Math.min(power, 1.5)));
    playToneSweep(118, 29, .4, 'sawtooth', .095 * power);
    playToneSweep(980, 165, .11, 'square', .045 * power);
    playNoiseBurst(.3, .12 * power, 2400, 115);
  }
  function playExplosionSound(power = 1) {
    buzz(power >= 2 ? [120, 40, 90, 40, 260] : Math.round(60 + power * 60), .02);
    playToneSweep(148, 27, .56, 'sawtooth', .12 * power);
    playToneSweep(740, 82, .28, 'triangle', .045 * power);
    playNoiseBurst(.5, .16 * power, 2800, 72);
  }
  function playCatPopSound() {
    playToneSweep(480, 1120, .1, 'triangle', .06);
    playToneSweep(950, 530, .17, 'sine', .04);
  }
  // Robot announcer: Web Speech with a low, flat pitch. Silently skipped where unsupported.
  // Voice clips are downloaded right away (no audio context needed) and decoded once audio is unlocked.
  const voiceData = new Map();
  let voicesLoaded = 0;
  function prefetchVoices() {
    if (typeof fetch !== 'function') { voicesLoaded = VOICE_CLIPS.length; return; }
    for (const clip of VOICE_CLIPS) fetch(`voice/${clip}.mp3`).then(r => r.ok ? r.arrayBuffer() : null)
      .then(data => { if (data) voiceData.set(clip, data); }).catch(() => {}).finally(() => { voicesLoaded++; });
  }
  function loadVoices() {
    if (!audioContext || loadVoices.started || typeof fetch !== 'function') return;
    loadVoices.started = true;
    for (const clip of VOICE_CLIPS) (voiceData.has(clip) ? Promise.resolve(voiceData.get(clip).slice(0)) : fetch(`voice/${clip}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()))
      .then(data => new Promise((ok, fail) => audioContext.decodeAudioData(data, ok, fail))).then(buffer => voiceBuffers.set(clip, buffer)).catch(() => {});
  }
  // Retro robot announcer: plays the pre-rendered clip; falls back to the system voice if it is not loaded.
  function robotSay(text, clip) {
    if (settings.subtitles && text && $('subtitle')) { $('subtitle').textContent = `🔊 ${String(text).replace(/[!.]+$/, '').toUpperCase()}`; $('subtitle').classList.add('visible'); subtitleAt = frameClock; }
    if (muted) return;
    const buffer = clip && voiceBuffers.get(clip);
    if (buffer && audioContext) {
      try {
        if (voiceSource) try { voiceSource.stop(); } catch { /* already ended */ }
        const source = audioContext.createBufferSource(), gain = audioContext.createGain();
        source.buffer = buffer; gain.gain.value = 1.15; source.connect(gain); gain.connect(sfxBus || audioContext.destination);
        source.onended = () => { source.disconnect(); gain.disconnect(); if (voiceSource === source) voiceSource = null; };
        source.start(); voiceSource = source;
        for (let i = 0; i < 4; i++) setTimeout(() => playToneSweep(900 + Math.random() * 1600, 400 + Math.random() * 2000, .04, 'square', .014), i * 40);
        return;
      } catch { /* fall through to speech */ }
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      // Staccato word-by-word delivery, the lowest pitch and a novelty robot voice where the OS has one.
      const words = text.replace(/[!.,]/g, '').trim().split(/\s+/);
      const voice = new SpeechSynthesisUtterance(words.join('. '));
      const voices = speechSynthesis.getVoices(), english = voices.filter(v => /^en/i.test(v.lang));
      voice.voice = english.find(v => /zarvox|trinoids|ralph|robot/i.test(v.name)) || english.find(v => /fred|albert|male|daniel|david/i.test(v.name)) || english[0] || null;
      voice.pitch = 0; voice.rate = .72; voice.volume = 1;
      speechSynthesis.speak(voice);
      playRobotCarrier(words.length * .42 + .3);
    } catch { /* Speech is a bonus. */ }
  }
  // Vocoder-style bed under the speech: a ring-modulated buzz gated like syllables, plus data chirps.
  function playRobotCarrier(duration) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime + .05;
      const carrier = audioContext.createOscillator(), mod = audioContext.createOscillator(), ring = audioContext.createGain(), out = audioContext.createGain(), filter = audioContext.createBiquadFilter();
      carrier.type = 'square'; carrier.frequency.value = 82; mod.type = 'sine'; mod.frequency.value = 31;
      ring.gain.value = 0; mod.connect(ring.gain); carrier.connect(ring); ring.connect(filter); filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 1.4; filter.connect(out); out.connect(sfxBus);
      out.gain.setValueAtTime(0, now);
      for (let t = 0; t < duration; t += .14) { out.gain.setValueAtTime(.05, now + t); out.gain.setValueAtTime(.012, now + t + .09); }
      out.gain.setValueAtTime(0, now + duration);
      carrier.start(now); mod.start(now); carrier.stop(now + duration + .05); mod.stop(now + duration + .05);
      carrier.onended = () => { carrier.disconnect(); mod.disconnect(); ring.disconnect(); filter.disconnect(); out.disconnect(); };
      for (let i = 0; i < 6; i++) setTimeout(() => playToneSweep(600 + Math.random() * 1800, 300 + Math.random() * 2400, .05, 'square', .018), i * 45);
    } catch { /* optional */ }
  }
  function primeSpeech() {
    // iOS only allows speech after it was started inside a user gesture once.
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || primeSpeech.done) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); primeSpeech.done = true; } catch { /* ignore */ }
  }
  function playFanfare() {
    if (!audioContext || muted) return;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playToneSweep(f, f * 1.01, i > 4 ? .5 : .18, 'square', .045), i * 130));
  }
  // Jet engine: looping filtered noise plus a turbine whine, swelled for boosts and ramp jumps.
  function setupJet() {
    const length = audioContext.sampleRate * 2, buffer = audioContext.createBuffer(1, length, audioContext.sampleRate), data = buffer.getChannelData(0);
    let brown = 0; for (let i = 0; i < length; i++) { const white = Math.random() * 2 - 1; brown = (brown + .02 * white) / 1.02; data[i] = white * .6 + brown * 3; }
    jetSource = audioContext.createBufferSource(); jetSource.buffer = buffer; jetSource.loop = true;
    jetFilter = audioContext.createBiquadFilter(); jetFilter.type = 'bandpass'; jetFilter.frequency.value = 700; jetFilter.Q.value = .6;
    jetGain = audioContext.createGain(); jetGain.gain.value = 0;
    jetSource.connect(jetFilter); jetFilter.connect(jetGain); jetGain.connect(sfxBus); jetSource.start();
    jetWhine = audioContext.createOscillator(); jetWhine.type = 'sawtooth'; jetWhine.frequency.value = 900;
    const whineFilter = audioContext.createBiquadFilter(); whineFilter.type = 'highpass'; whineFilter.frequency.value = 600;
    jetWhineGain = audioContext.createGain(); jetWhineGain.gain.value = 0;
    jetWhine.connect(whineFilter); whineFilter.connect(jetWhineGain); jetWhineGain.connect(sfxBus); jetWhine.start();
  }
  function playJetBlast(power = 1) {
    buzz([30, 30, Math.round(60 * power)]);
    // Ignition: a roaring whoosh that tears upward, a deep rumble and a screaming turbine.
    const v = power * .38;
    playNoiseBurst(1.1 * power, .32 * v, 300, 6500);
    playNoiseBurst(1.4 * power, .22 * v, 5200, 140);
    playToneSweep(48, 160, .9 * power, 'sawtooth', .16 * v);
    playToneSweep(700, 3200, .8 * power, 'sawtooth', .03 * v);
  }
  // ==== Race messages, callouts, explosions, confetti.
  function showCallout(text, color = '#ddff46') { callout = { text, color, started: time }; }
  // Confetti runs on its own overlay canvas so it rains over the results screen too.
  const confettiCanvas = $('confetti'), confettiCtx = confettiCanvas && confettiCanvas.getContext('2d');
  function launchConfetti() {
    const colors = ['#ddff46', '#ff4eb8', '#4df8ff', '#fff16b', '#a88aff', '#ff8a3d', '#ffffff'];
    for (let i = 0, n = lowFx() ? 110 : 360; i < n; i++) {
      const cannon = i % 3, fromSide = cannon < 2;
      confetti.push({ x: fromSide ? (cannon ? W + 10 : -10) : Math.random() * W, y: fromSide ? H * (.55 + Math.random() * .3) : -20 - Math.random() * H * .6,
        vx: fromSide ? (cannon ? -1 : 1) * (380 + Math.random() * 620) : (Math.random() - .5) * 120, vy: fromSide ? -(620 + Math.random() * 700) : 60 + Math.random() * 160,
        w: 6 + Math.random() * 8, h: 3 + Math.random() * 6, rot: Math.random() * TAU, spin: (Math.random() - .5) * 14, flutter: Math.random() * TAU,
        color: colors[i % colors.length], life: 5 + Math.random() * 3 });
    }
  }
  function updateConfetti(dt) {
    if (!confettiCtx) return;
    if (confettiCanvas.width !== Math.floor(W * dpr) || confettiCanvas.height !== Math.floor(H * dpr)) { confettiCanvas.width = Math.floor(W * dpr); confettiCanvas.height = Math.floor(H * dpr); }
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0); confettiCtx.clearRect(0, 0, W, H);
    if (!confetti.length) return;
    for (const c of confetti) {
      c.vy += 520 * dt; c.vx *= Math.pow(.35, dt); c.vy = Math.min(c.vy, 170 + Math.sin(c.flutter) * 40); c.flutter += dt * 6;
      c.x += (c.vx + Math.sin(c.flutter) * 45) * dt; c.y += c.vy * dt; c.rot += c.spin * dt; c.life -= dt;
      confettiCtx.save(); confettiCtx.translate(c.x, c.y); confettiCtx.rotate(c.rot); confettiCtx.scale(1, Math.cos(c.flutter * 1.3));
      confettiCtx.globalAlpha = clamp(c.life, 0, 1); confettiCtx.fillStyle = c.color; confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); confettiCtx.restore();
    }
    confetti = confetti.filter(c => c.life > 0 && c.y < H + 40);
  }
  function showMessage(text, duration = 1.5) { $('race-message').textContent = text; $('race-message').classList.add('visible'); messageTime = duration; }
  function createExplosion(worldDistance, lane, color, size = 1, cartoon = false) {
    explosions.push({ distance: worldDistance, lane, color, started: time, duration: cartoon ? .65 : .8, size, cartoon, seed: Math.floor(time * 1000) + explosions.length * 19 });
    shake = Math.max(shake, .55 * size); screenFlash = Math.max(screenFlash, .26 * size);
  }
  // ==== Power-ups: magnet, shield bubble, time warp, multi-laser.
  // Power-ups picked up on the track: magnet, shield bubble, time warp, multi-laser.
  const POWERUPS = {
    magnet: { name: 'MAGNET', icon: '🧲', color: '#ff5a5a', time: 10, info: 'PULLS IN PADS, CATS, GATES AND POWER-UPS' },
    bubble: { name: 'SHIELD BUBBLE', icon: '◯', color: '#4df8ff', time: 15, info: 'ABSORBS THE NEXT 3 HITS' },
    warp: { name: 'TIME WARP', icon: '⧗', color: '#a88aff', time: 7, info: 'EVERYONE ELSE MOVES IN SLOW MOTION' },
    multi: { name: 'MULTI-LASER', icon: '⁂', color: '#ff4eb8', time: 10, info: 'EVERY SHOT HITS UP TO 3 TARGETS' },
    // Attack items fire at once when picked up.
    missile: { name: 'HOMING MISSILE', icon: '🚀', color: '#ff8a2e', attack: true, info: 'LOCKS ON TO THE NEXT RIVAL AHEAD' },
    mine: { name: 'MINE LAYER', icon: '✹', color: '#ffe600', attack: true, info: 'THREE MINES DROPPED BEHIND YOU' },
    emp: { name: 'EMP BLAST', icon: '⌁', color: '#7db8ff', attack: true, info: 'RIVALS AHEAD LOSE BOOST AND LASERS' },
  };
  const ATTACK_ORDER = ['missile', 'mine', 'emp'];
  let missiles = [], mines = [];
  const POWERUP_ORDER = ['magnet', 'bubble', 'warp', 'multi'];
  let power = {}, bubbleHits = 0, hitPowerups = new Set();
  const powerOn = type => (power[type] || 0) > time && (mode === 'racing' || mode === 'respawning');
  const magnetReach = () => powerOn('magnet') ? 2.6 : 1;
  const worldPace = () => powerOn('warp') ? .45 : 1;
  function collectPowerup(type) {
    const p = POWERUPS[type];
    if (p.attack) { launchAttack(type); return; }
    if (!profile.stats.powerTypes.includes(type)) { profile.stats.powerTypes.push(type); saveProfile(); }
    if (POWERUP_ORDER.every(t => profile.stats.powerTypes.includes(t))) unlockAchievement('collector');
    power[type] = time + p.time; if (type === 'bubble') bubbleHits = 3;
    showCallout(`${p.icon} ${p.name}!`, p.color); showMessage(p.info, 1.6);
    playToneSweep(600, 1800, .25, 'square', .05); playToneSweep(900, 2400, .3, 'sine', .05); buzz([20, 30, 20]);
    screenFlash = Math.max(screenFlash, .2);
  }
  function drawPowerupPickup(s) {
    const a = s.p1, b = s.p2, pu = s.powerup, def = POWERUPS[pu.type], width = lerp(a.w, b.w, .5), x = lerp(a.x, b.x, .5) + width * pu.lane, y = lerp(a.y, b.y, .5);
    const r = width * .07; if (r < 2) return;
    const cy = y - r * 1.6 - Math.sin(time * 4 + pu.index) * r * .3;
    ctx.save(); ctx.translate(x, cy);
    ctx.globalAlpha = .35; ctx.fillStyle = def.color; ctx.beginPath(); ctx.ellipse(0, r * 1.6, r * 1.1, r * .3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.rotate(Math.sin(time * 2 + pu.index) * .25);
    ctx.shadowColor = def.color; ctx.shadowBlur = 20; ctx.fillStyle = '#12102a'; ctx.strokeStyle = def.color; ctx.lineWidth = Math.max(1.5, r * .14);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r, -r, r * 2, r * 2, r * .45) : ctx.rect(-r, -r, r * 2, r * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = def.color; ctx.font = `bold ${r * 1.25}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.icon, 0, r * .06);
    ctx.restore();
  }
  function drawPowerupAura(x, y, size) {
    if (powerOn('bubble')) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y - size * .3, size * .4, x, y - size * .3, size * 1.4);
      g.addColorStop(0, 'rgba(77,248,255,0)'); g.addColorStop(.8, `rgba(77,248,255,${.18 + .06 * Math.sin(time * 6)})`); g.addColorStop(1, 'rgba(77,248,255,.5)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - size * .3, size * 1.35, size * .95, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (powerOn('magnet')) {
      ctx.save(); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const k = mod(time * 1.5 + i / 3, 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, y - size * .2, size * (1.6 - k), size * (.5 - k * .3), 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    if (powerOn('warp')) { ctx.save(); ctx.fillStyle = 'rgba(120,90,255,.12)'; ctx.fillRect(-60, -60, W + 120, H + 120); ctx.restore(); }
  }
  // ---- Attack items: homing missile, mine layer, EMP.
  function launchAttack(type) {
    const p = POWERUPS[type], track = tracks[trackIndex];
    showCallout(`${p.icon} ${p.name}!`, p.color); showMessage(p.info, 1.4); buzz([30, 20, 30]); raceStats.attacks = (raceStats.attacks || 0) + 1;
    if (type === 'missile') {
      const target = rivals.filter(r => r.alive && !r.dying && r.distance > distance + 1050).sort((a, b) => a.distance - b.distance)[0] || null;
      missiles.push({ distance: distance + 1300, lane: playerX / track.width, target, started: time, speed: Math.max(speed, 8000) + 9000 });
      playJetBlast(.9); playToneSweep(300, 1600, .5, 'sawtooth', .05);
    } else if (type === 'mine') {
      for (let k = 0; k < 3; k++) mines.push({ distance: distance + 1050 - 300 - k * 420, lane: clamp(playerX / track.width + (k - 1) * .28, -.85, .85), armedAt: time + .3, expires: time + 25 });
      playToneSweep(500, 200, .3, 'square', .04);
    } else if (type === 'emp') {
      let hit = 0;
      for (const r of rivals) if (r.alive && !r.dying && r.distance > distance && r.distance < distance + 14000) { r.empUntil = time + 4.5; r.boosting = false; hit++; }
      screenFlash = Math.max(screenFlash, .35); playToneSweep(1800, 90, .7, 'sawtooth', .06); playNoiseBurst(.5, .08, 3200, 600);
      if (hit) showMessage(`EMP  /  ${hit} RIVALS STALLED`, 1.4);
    }
  }
  const empSlow = r => r.empUntil > time ? .55 : 1;
  function updateAttacks(dt, track) {
    for (const m of missiles) {
      const t = m.target && m.target.alive && !m.target.dying ? m.target : null;
      m.distance += m.speed * dt;
      if (t) m.lane = lerp(m.lane, t.x, Math.min(1, dt * 5));
      if (t && m.distance >= t.distance - 120) {
        m.done = true; knockOut(t); createExplosion(t.distance, t.x * track.width, '#ff8a2e', 1.1); playExplosionSound(1.1);
        showMessage(t.nemesis ? `MISSILE GOT ${t.nemesis.name}!` : 'MISSILE HIT  /  RIVAL DESTROYED', 1.1);
      } else if (time - m.started > 3) { m.done = true; createExplosion(m.distance, m.lane * track.width, '#ff8a2e', .7); }
    }
    missiles = missiles.filter(m => !m.done);
    for (const mine of mines) {
      if (time < mine.armedAt) continue;
      for (const r of rivals) {
        if (!r.alive || r.dying || Math.abs(r.distance - mine.distance) > 260 || Math.abs(r.x - mine.lane) > .2) continue;
        mine.done = true; knockOut(r); createExplosion(mine.distance, mine.lane * track.width, '#ffe600', 1); showMessage('RIVAL HIT YOUR MINE!', 1); break;
      }
      if (time > mine.expires) mine.done = true;
    }
    mines = mines.filter(m => !m.done);
  }
  function drawMissile(x, y, w, m) {
    const r = Math.max(3, w * .025);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = .5 - i * .07; ctx.fillStyle = i % 2 ? '#ffd35a' : '#ff6b2e'; ctx.beginPath(); ctx.arc(x, y + r * (1.2 + i * 1.1), r * (1 - i * .1), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.shadowColor = '#ff8a2e'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.ellipse(x, y, r * .7, r * 1.4, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  // ---- Slipstream: tuck in right behind a rival to charge boost and pick up a little speed.
  let slip = 0, slipShown = false;
  function updateSlipstream(dt, track) {
    const ahead = rivals.some(r => { const gap = r.distance - (distance + 1050); return r.alive && !r.dying && gap > 380 && gap < 2600 && Math.abs(r.x * track.width - playerX) < .2 * track.width; });
    slip = ahead ? Math.min(1, slip + dt * 2.5) : Math.max(0, slip - dt * 3);
    if (slip > .5) {
      energy = Math.min(100, energy + dt * 16);
      if (!boosting) speed = Math.min(12200 * machines[shipIndex].top * topSpeed(), speed + dt * 1600);
      if (!slipShown) { slipShown = true; showMessage('SLIPSTREAM  /  BOOST CHARGING', .9); playToneSweep(300, 700, .3, 'sine', .03); }
    } else if (slip === 0) slipShown = false;
  }
  function drawSlipstream() {
    if (slip < .2 || mode !== 'racing') return;
    ctx.save(); ctx.globalAlpha = slip * .5; ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, k = mod(time * 2.2 + i / 16, 1), x = W * .5 + side * W * (.08 + random(i) * .3), y = H * (.5 + k * .45);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * W * .02 * k, y + H * .06 + k * H * .08); ctx.stroke();
    }
    ctx.restore();
  }
  // ==== Star gates and the hyperdrive.
  const HYPER_TIME = 10;
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
  // Light-speed space: nebulae, a ringed planet and star streaks rushing out of the vanishing point.
  function hyperFade() { return clamp(Math.min((time - hyperStarted) * 2.5, hyperTime * 1.5), 0, 1); }
  function drawHyperSpace() {
    const k = hyperFade(), cx = W * .5 - playerX * 30, cy = H * .42, hue = (time * 90) % 360;
    ctx.save(); ctx.globalAlpha = k;
    const deep = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * .9);
    deep.addColorStop(0, '#ffffff'); deep.addColorStop(.04, `hsl(${hue},100%,70%)`); deep.addColorStop(.25, `hsl(${(hue + 60) % 360},90%,22%)`); deep.addColorStop(1, '#03010d');
    ctx.fillStyle = deep; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const nx = W * (.15 + random(i + 300) * .7) + Math.sin(time * .3 + i) * 40, ny = H * (.1 + random(i + 310) * .35), nr = Math.max(W, H) * (.18 + random(i + 320) * .2);
      const neb = ctx.createRadialGradient(nx, ny, 1, nx, ny, nr); neb.addColorStop(0, `hsla(${(hue + i * 70) % 360},100%,60%,.45)`); neb.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = neb; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    for (let i = 0; i < 160; i++) {
      const angle = random(i * 3.1) * TAU, phase = mod(time * (1.2 + random(i) * 1.6) + random(i + 7), 1), r0 = phase * phase * Math.max(W, H) * .8;
      const len = 10 + phase * phase * 220, x = cx + Math.cos(angle) * r0, y = cy + Math.sin(angle) * r0 * .7;
      ctx.globalAlpha = k * phase; line(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len * .7, `hsl(${(hue + i * 9) % 360},100%,${70 + phase * 25}%)`, .6 + phase * 2.4);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    const px = W * .78 - playerX * 50, py = H * .2, pr = Math.min(W, H) * .08;
    const planet = ctx.createRadialGradient(px - pr * .4, py - pr * .4, 2, px, py, pr); planet.addColorStop(0, `hsl(${(hue + 180) % 360},90%,75%)`); planet.addColorStop(1, `hsl(${(hue + 240) % 360},80%,25%)`);
    ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.translate(px, py); ctx.rotate(-.4); ctx.scale(1, .28); ctx.beginPath(); ctx.arc(0, 0, pr * 1.8, 0, TAU); ctx.strokeStyle = `hsla(${(hue + 30) % 360},100%,70%,.8)`; ctx.lineWidth = pr * .18; ctx.stroke();
    ctx.restore();
  }
  function drawWarpOverlay() {
    const k = hyperFade(), cx = W * .5, cy = H * .45, hue = (time * 140) % 360;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const angle = random(i * 5.7 + 11) * TAU, phase = mod(time * 2.6 + random(i + 3), 1), r0 = Math.max(W, H) * (.12 + phase * .9);
      ctx.globalAlpha = k * phase * .55;
      line(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0, cx + Math.cos(angle) * (r0 + 60 + phase * 260), cy + Math.sin(angle) * (r0 + 60 + phase * 260), `hsl(${(hue + i * 13) % 360},100%,72%)`, 1 + phase * 3);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k * .5;
    const tunnel = ctx.createRadialGradient(cx, cy, Math.min(W, H) * .3, cx, cy, Math.max(W, H) * .75);
    tunnel.addColorStop(0, 'hsla(0,0%,0%,0)'); tunnel.addColorStop(1, `hsla(${hue},100%,45%,.55)`); ctx.fillStyle = tunnel; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function drawStarGate(s, t) {
    const a = s.p1, b = s.p2, g = s.stargate, width = lerp(a.w, b.w, .5), x = lerp(a.x, b.x, .5) + width * g.lane, y = lerp(a.y, b.y, .5);
    const r = width * .26; if (r < 3) return;
    const cy = y - r * 1.05, hue = (time * 160 + g.index) % 360, active = hyperTime <= 0;
    ctx.save(); ctx.translate(x, cy); ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, r); core.addColorStop(0, `hsla(${hue},100%,85%,${active ? .55 : .18})`); core.addColorStop(.7, `hsla(${(hue + 90) % 360},100%,55%,.25)`); core.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath(); ctx.ellipse(0, 0, r * (1 - ring * .14), r * (1 - ring * .14), time * (ring % 2 ? -1.5 : 1.2), 0, TAU);
      ctx.strokeStyle = `hsl(${(hue + ring * 100) % 360},100%,${active ? 65 : 40}%)`; ctx.lineWidth = Math.max(1.5, r * .07); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18; ctx.stroke();
    }
    ctx.rotate(time * 2);
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU, sx = Math.cos(ang) * r * 1.12, sy = Math.sin(ang) * r * 1.12, sr = r * .13;
      ctx.fillStyle = i % 2 ? '#fff6a0' : `hsl(${(hue + i * 45) % 360},100%,70%)`; ctx.beginPath();
      for (let j = 0; j < 10; j++) { const rr = j % 2 ? sr * .45 : sr, aa = j / 10 * TAU; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
      ctx.fill();
    }
    ctx.restore();
    roadStrip(a, b, g.lane - .3, g.lane + .3, `hsla(${hue},100%,60%,.35)`);
  }
  // ==== UFOs, bombs, crash paths and the mothership.
  const UFO_COLORS = ['#a7ff4f', '#54f8ff', '#ff73dc', '#fff16b'];
  function makeUfo(slot, seed, spawnedAt) {
    return { slot, seed, distance: 0, lane: 0, dropCooldown: .8 + slot * 1.25 + (spawnedAt > 0 ? 1.6 : 0), color: UFO_COLORS[seed % 4], spawnedAt, screen: null };
  }
  function shootDownUfo(ufo) {
    if (stat('ufos') >= 25) unlockAchievement('ufo25');
    if (mode === 'racing') raceStats.ufos++;
    ufos = ufos.filter(u => u !== ufo);
    const start = ufo.screen && time - ufo.screen.at < .3 ? ufo.screen : { x: W * .5, y: H * .38, size: Math.min(W, H) * .03 };
    const seed = Math.floor(time * 997) + ufo.seed * 31;
    // Erratic waypoints across the whole screen, ending near the middle for the big blast.
    const points = [[start.x, start.y]];
    for (let i = 0; i < 5; i++) points.push([W * (.08 + random(seed + i * 3) * .84), H * (.12 + random(seed + i * 3 + 1) * .62)]);
    points.push([W * (.35 + random(seed + 40) * .3), H * (.3 + random(seed + 41) * .2)]);
    crashingUfos.push({ ...ufo, started: time, points, startSize: start.size, spinDir: random(seed + 9) > .5 ? 1 : -1, x: start.x, y: start.y, size: start.size, angle: 0 });
    ufoKills++; addCredits(25, 'UFO DOWN');
    if (ufoKills % BOSS_EVERY === 0) summonBoss();
    else if (!boss) ufoRespawns.push({ at: time + UFO_CRASH_TIME + 2 + random(seed + 77) * 3, slot: ufo.slot });
    const [phrase, clip] = KILL_CALLS[Math.floor(random(seed + 5) * KILL_CALLS.length)];
    showCallout(phrase, ufo.color); robotSay(phrase, clip);
    showMessage('UFO HIT  /  IT IS GOING DOWN!', 1.2);
    playImpactSound(1.1); playNoiseBurst(1.6, .14, 5200, 300); playToneSweep(1400, 90, 2.4, 'sawtooth', .05);
  }
  const catmull = (p0, p1, p2, p3, t) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  function updateCrashingUfos(dt) {
    for (const u of crashingUfos) {
      const k = clamp((time - u.started) / UFO_CRASH_TIME, 0, 1), pts = u.points, span = k * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(span)), t = span - i;
      const p = j => pts[clamp(j, 0, pts.length - 1)];
      u.x = catmull(p(i - 1)[0], p(i)[0], p(i + 1)[0], p(i + 2)[0], t); u.y = catmull(p(i - 1)[1], p(i)[1], p(i + 1)[1], p(i + 2)[1], t);
      u.size = lerp(u.startSize, Math.min(W, H) * (u.kind === 'racer' ? .16 : .11), Math.pow(k, .7)); u.angle += u.spinDir * dt * (2 + k * 16);
      for (let n = 0; n < 3; n++) smoke.push({ x: u.x + (Math.random() - .5) * u.size * .6, y: u.y + (Math.random() - .3) * u.size * .3, r: u.size * (.18 + Math.random() * .2),
        vx: (Math.random() - .5) * 40, vy: -30 - Math.random() * 50, life: 1.1 + Math.random() * .6, max: 1.7, fire: n === 0 && Math.random() < .6 });
      if (k >= 1) {
        u.done = true;
        if (u.kind === 'racer') {
          megaBlasts.push({ x: u.x, y: u.y, started: time, duration: 1.2, color: u.color, seed: Math.floor(time * 1000), scale: .55 });
          shake = Math.max(shake, 1.4); screenFlash = Math.max(screenFlash, .6); playExplosionSound(1.6);
        } else {
          megaBlasts.push({ x: u.x, y: u.y, started: time, duration: 1.6, color: u.color, seed: Math.floor(time * 1000) });
          shake = Math.max(shake, 2.6); screenFlash = Math.max(screenFlash, 1);
          playExplosionSound(2.6); playToneSweep(70, 18, 1.6, 'sawtooth', .2); playNoiseBurst(1.8, .3, 1800, 40);
          showMessage('MEGA BLAST!', 1);
        }
      }
    }
    crashingUfos = crashingUfos.filter(u => !u.done);
    for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r *= 1 + dt * .9; p.life -= dt; }
    smoke = smoke.filter(p => p.life > 0); if (lowFx() && smoke.length > 40) smoke = smoke.slice(-40);
    if (smoke.length > 420) smoke.splice(0, smoke.length - 420);
    megaBlasts = megaBlasts.filter(b => time - b.started < b.duration);
    for (const r of ufoRespawns) if (time >= r.at && mode === 'racing') {
      r.spawned = true; ufos.push(makeUfo(r.slot, r.slot + Math.floor(time * 7), time));
      showMessage('NEW UFO INBOUND!', 1); playToneSweep(260, 1300, .6, 'sine', .05);
    }
    ufoRespawns = ufoRespawns.filter(r => !r.spawned);
  }
  function drawUfoShape(size, color) {
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * .3, 0, 0, TAU); ctx.fillStyle = '#26253e'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .075); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -size * .13, size * .42, size * .3, 0, Math.PI, TAU); ctx.fillStyle = '#aeeaff'; ctx.fill(); ctx.strokeStyle = '#efffff'; ctx.lineWidth = Math.max(1, size * .04); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = (i + Math.floor(time * 7)) % 2 ? '#fff4a0' : color; ctx.beginPath(); ctx.arc(i * size * .32, size * .05, Math.max(1, size * .055), 0, TAU); ctx.fill(); }
  }
  function summonBoss() {
    // Regular UFOs retreat; the mothership descends from the top of the screen.
    ufos = []; ufoRespawns = []; bombs = [];
    boss = { hp: BOSS_HP, arrived: time + 2.6, started: time, lane: 0, x: W / 2, y: -H * .3, size: Math.min(W, H) * .3, nextAttack: time + 4, hitFlash: 0, dying: 0, pattern: 0 };
    showCallout('WARNING: MOTHERSHIP!', '#ff3b6b'); showMessage('THE MOTHERSHIP HAS ARRIVED  /  SHOOT IT DOWN!', 2.6);
    robotSay('Warning. Mothership approaching', 'mothership-warning');
    if (audioContext && !muted) for (let i = 0; i < 4; i++) setTimeout(() => playToneSweep(440, 880, .32, 'square', .05), i * 420);
    playToneSweep(40, 30, 2.4, 'sawtooth', .14);
  }
  const bossScreenX = lane => W / 2 + (lane - playerX / tracks[trackIndex].width) * W * .42;
  function bossAttackRoadX(lane) { return W / 2 + (lane * tracks[trackIndex].width - playerX) * W * .42; }
  function updateBoss(dt) {
    if (!boss) return;
    const k = clamp((time - boss.started) / 2.6, 0, 1), track = tracks[trackIndex];
    boss.size = Math.min(W, H) * .26; boss.hitFlash = Math.max(0, boss.hitFlash - dt * 4);
    if (boss.dying) {
      const d = (time - boss.dying) / 2.4;
      boss.y += dt * H * .12; boss.angle = (boss.angle || 0) + dt * (1 + d * 4);
      if (Math.random() < dt * 9) megaBlasts.push({ x: boss.x + (Math.random() - .5) * boss.size * 1.6, y: boss.y + (Math.random() - .5) * boss.size * .4, started: time, duration: .9, color: ['#ff4eb8', '#ffd35a', '#7dfcff'][Math.floor(Math.random() * 3)], seed: Math.floor(Math.random() * 999) });
      for (let n = 0; n < 4; n++) smoke.push({ x: boss.x + (Math.random() - .5) * boss.size, y: boss.y, r: boss.size * (.08 + Math.random() * .1), vx: (Math.random() - .5) * 60, vy: -40 - Math.random() * 60, life: 1.4, max: 1.6, fire: Math.random() < .4 });
      if (Math.random() < dt * 6) { playExplosionSound(1.4); shake = Math.max(shake, 1.2); }
      if (d >= 1) {
        megaBlasts.push({ x: boss.x, y: boss.y, started: time, duration: 2.2, color: '#ff4eb8', seed: 99 }); megaBlasts.push({ x: boss.x, y: boss.y, started: time + .2, duration: 2, color: '#ddff46', seed: 42 });
        screenFlash = 1; shake = 3; playExplosionSound(3); playToneSweep(60, 14, 2.4, 'sawtooth', .24); playNoiseBurst(2.6, .34, 1600, 30);
        boss = null; document.body.classList.remove('boss');
        for (let i = 0; i < 2 + Math.floor(trackIndex / 3); i++) ufoRespawns.push({ at: time + 4 + i * 2, slot: i });
      }
      return;
    }
    // Hover, weaving across the sky.
    boss.lane = Math.sin((time - boss.started) * .55) * .55;
    boss.x = clamp(lerp(W / 2, bossScreenX(boss.lane), k), boss.size * 1.05, W - boss.size * 1.05);
    boss.y = lerp(-H * .3, H * (H < 520 ? .4 : .31), 1 - Math.pow(1 - k, 3)) + Math.sin(time * 1.7) * H * .015;
    if (time >= boss.nextAttack && time > boss.arrived) {
      const enraged = boss.hp < BOSS_HP / 2, lanePlayer = playerX / track.width;
      if (boss.pattern % 2 === 0) {
        // Laser: telegraph the player's lane, then fire a thick beam down into it.
        bossAttacks.push({ type: 'laser', lane: clamp(lanePlayer, -.85, .85), warnUntil: time + (enraged ? .75 : 1), until: time + (enraged ? 1.35 : 1.6), hit: false });
        playToneSweep(300, 1400, .9, 'sawtooth', .04);
      } else {
        // Lightning: two or three bolts around the player.
        const bolts = enraged ? 3 : 2;
        for (let i = 0; i < bolts; i++) bossAttacks.push({ type: 'bolt', lane: clamp(lanePlayer + (i - (bolts - 1) / 2) * .42 + (Math.random() - .5) * .1, -.85, .85), warnUntil: time + .7 + i * .12, until: time + 1.05 + i * .12, hit: false, seed: Math.random() * 1000 });
        playNoiseBurst(.4, .05, 8000, 2000);
      }
      boss.pattern++; boss.nextAttack = time + (enraged ? 1.7 : 2.4);
    }
    for (const a of bossAttacks) {
      if (time >= a.warnUntil && !a.fired) {
        a.fired = true;
        if (a.type === 'laser') { playToneSweep(1600, 200, .6, 'sawtooth', .08); playNoiseBurst(.6, .14, 5000, 500); }
        else { playNoiseBurst(.35, .22, 9000, 400); playToneSweep(2400, 80, .3, 'square', .06); screenFlash = Math.max(screenFlash, .35); }
      }
      if (a.fired && !a.hit && time < a.until && jumpHeight < 105 && Math.abs(playerX - a.lane * track.width) < (a.type === 'laser' ? .2 : .16) * track.width) {
        a.hit = true; shake = Math.max(shake, .9); screenFlash = Math.max(screenFlash, .4);
        showMessage((a.type === 'laser' ? 'MOTHERSHIP LASER  /  ' : 'LIGHTNING STRIKE  /  ') + shieldText(a.type === 'laser' ? 16 : 12), 1);
        playImpactSound(1.1);
        if (damageShield(a.type === 'laser' ? 16 : 12)) return;
      }
    }
    bossAttacks = bossAttacks.filter(a => time < a.until);
  }
  function hitBoss(power) {
    boss.hp = Math.max(0, boss.hp - power); boss.hitFlash = 1; playImpactSound(.8);
    megaBlasts.push({ x: boss.x + (Math.random() - .5) * boss.size * .8, y: boss.y + boss.size * .05, started: time, duration: .45, color: '#ffd35a', seed: Math.floor(Math.random() * 999), scale: .16 });
    if (boss.hp <= 0) {
      boss.dying = time; bossAttacks = []; addCredits(200, 'MOTHERSHIP DOWN'); unlockAchievement('mothership');
      showCallout('MOTHERSHIP DESTROYED!', '#ddff46'); showMessage('LEGENDARY!  SHIELD + LASER RESTORED', 2.4);
      robotSay('Mothership destroyed. You are a legend', 'mothership-down');
      shield = 100; laserAmmo = laserCap(); laserCharge = 0; energy = 100;
    } else showMessage(`MOTHERSHIP HIT  /  ${Math.ceil(boss.hp / BOSS_HP * 100)}%`, .6);
  }
  function drawBoss() {
    if (!boss) return;
    const s = boss.size, hue = (time * 60) % 360;
    // Attack telegraphs and effects on the road.
    for (const a of bossAttacks) {
      const rx = bossAttackRoadX(a.lane), ry = H * .8;
      if (!a.fired) {
        cbMark(rx, ry, W * .05);
        const blink = Math.sin(time * 30) > 0 ? .55 : .25;
        ctx.save(); ctx.globalAlpha = blink; ctx.fillStyle = a.type === 'laser' ? '#ff2d55' : '#9fe8ff';
        ctx.beginPath(); ctx.ellipse(rx, ry, W * (a.type === 'laser' ? .085 : .06), H * .03, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = blink * .5; ctx.fillRect(rx - 2, boss.y, 4, ry - boss.y); ctx.restore();
      } else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (a.type === 'laser') {
          const wob = Math.sin(time * 50) * 3;
          for (const [w, c] of [[W * .07, '#ff2d5588'], [W * .035, '#ff7a90'], [W * .012, '#ffffff']]) {
            ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(boss.x - w * .3, boss.y + s * .12); ctx.lineTo(boss.x + w * .3, boss.y + s * .12); ctx.lineTo(rx + w + wob, ry); ctx.lineTo(rx - w + wob, ry); ctx.fill();
          }
        } else {
          for (let strand = 0; strand < 2; strand++) {
            ctx.beginPath(); ctx.moveTo(boss.x + (a.lane - boss.lane) * s * .3, boss.y + s * .12);
            const steps = 9;
            for (let i = 1; i <= steps; i++) {
              const t = i / steps, jitter = i === steps ? 0 : (Math.random() - .5) * W * .06;
              ctx.lineTo(lerp(boss.x, rx, t) + jitter, lerp(boss.y + s * .12, ry, t));
            }
            ctx.strokeStyle = strand ? '#ffffff' : '#7dfcff'; ctx.lineWidth = strand ? 2 : 7; ctx.shadowColor = '#7dfcff'; ctx.shadowBlur = 25; ctx.stroke();
          }
          ctx.fillStyle = '#c9f7ff'; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(rx, ry, W * .07, H * .035, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }
    // The mothership itself.
    ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(boss.angle || Math.sin(time * 1.2) * .04);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25;
    const beam = ctx.createLinearGradient(0, 0, 0, H * .7); beam.addColorStop(0, `hsla(${hue},100%,70%,.6)`); beam.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-s * .25, s * .1); ctx.lineTo(s * .25, s * .1); ctx.lineTo(s * .9, H * .7); ctx.lineTo(-s * .9, H * .7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.shadowColor = boss.hitFlash > 0 ? '#ffffff' : '#ff4eb8'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * .24, 0, 0, TAU); ctx.fillStyle = boss.hitFlash > .5 ? '#ffffff' : '#1d1734'; ctx.fill();
    ctx.lineWidth = s * .025; ctx.strokeStyle = '#ff4eb8'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, s * .06, s * .72, s * .1, 0, 0, Math.PI); ctx.fillStyle = '#2d2350'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -s * .1, s * .38, s * .24, 0, Math.PI, TAU); ctx.fillStyle = '#9fe8ff'; ctx.fill(); ctx.strokeStyle = '#e8ffff'; ctx.lineWidth = s * .012; ctx.stroke();
    ctx.shadowBlur = 0;
    // Alien silhouette in the dome.
    ctx.fillStyle = '#1b3d2a'; ctx.beginPath(); ctx.ellipse(0, -s * .2, s * .07, s * .085, 0, 0, TAU); ctx.fill(); ctx.fillRect(-s * .05, -s * .13, s * .1, s * .06);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-s * .028, -s * .2, s * .022, s * .012, .4, 0, TAU); ctx.ellipse(s * .028, -s * .2, s * .022, s * .012, -.4, 0, TAU); ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + time * 1.5, lx = Math.cos(a) * s * .86, ly = Math.sin(a) * s * .17;
      if (Math.sin(a) < -.2) continue;
      ctx.fillStyle = (i + Math.floor(time * 8)) % 3 ? `hsl(${(hue + i * 25) % 360},100%,65%)` : '#fff5a0';
      ctx.beginPath(); ctx.arc(lx, ly, s * .03, 0, TAU); ctx.fill();
    }
    for (const side of [-1, 1]) { ctx.fillStyle = '#ff2d55'; ctx.fillRect(side * s * .55 - s * .03, s * .12, s * .06, s * .07); }
    ctx.restore();
    if (!boss.dying) {
      // Health bar floating above the mothership.
      const bw = s * 1.3, bx = boss.x - bw / 2, by = boss.y - s * .5;
      ctx.save(); ctx.fillStyle = '#09091acc'; ctx.fillRect(bx - 3, by - 15, bw + 6, 24);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(bx, by, bw, 6);
      const hp = ctx.createLinearGradient(bx, 0, bx + bw, 0); hp.addColorStop(0, '#ff2d55'); hp.addColorStop(.6, '#ff4eb8'); hp.addColorStop(1, '#ffb347');
      ctx.fillStyle = hp; ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 12; ctx.fillRect(bx, by, bw * boss.hp / BOSS_HP, 6);
      ctx.shadowBlur = 0; ctx.fillStyle = '#ff8aa2'; ctx.font = `${Math.max(11, s * .055)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center';
      ctx.fillText(`☠ MOTHERSHIP  ${Math.ceil(boss.hp / BOSS_HP * 100)}%`, boss.x, by - 4); ctx.restore();
    }
  }
  // Lasers fired at the mothership: from the racer's nose (also mid-jump) onto the hull, with an impact flare.
  function drawBossBeams() {
    const shots = laserShots.filter(shot => shot.screen);
    if (!shots.length || !boss) return;
    const shipWidth = Math.min(W * .074, 110), startX = W * .5 + steerVisual * 12, startY = H * .79 - jumpHeight - shipWidth * .76;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const shot of shots) {
      const x = boss.x + shot.offset * boss.size, y = boss.y + boss.size * .08, alpha = clamp(1 - (time - shot.started) / shot.duration, 0, 1);
      ctx.globalAlpha = alpha;
      if (shot.mega) { const hue = (time * 720) % 360; line(startX, startY, x, y, `hsl(${hue},100%,60%)`, 24); line(startX, startY, x, y, `hsl(${(hue + 120) % 360},100%,65%)`, 11); }
      else { line(startX, startY, x, y, shot.color, 10); line(startX, startY, x, y, shot.color, 5); }
      line(startX, startY, x, y, '#ffffff', shot.mega ? 5 : 2.4);
      const flare = ctx.createRadialGradient(x, y, 1, x, y, boss.size * .22);
      flare.addColorStop(0, '#ffffff'); flare.addColorStop(.3, shot.color); flare.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flare; ctx.beginPath(); ctx.arc(x, y, boss.size * .22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(startX, startY, 5 + alpha * 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawCrashLayer() {
    ctx.save();
    for (const p of smoke) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a * (p.fire ? .85 : .5); ctx.fillStyle = p.fire && a > .7 ? '#ff9a3d' : '#7d768c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const u of crashingUfos) {
      if (u.kind === 'racer') drawShip(u.x, u.y, u.size, Math.sin(time * 38) > 0 ? '#ffffff' : u.color, '#1d1828', 0, false, false, false, u.angle);
      else { ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); ctx.shadowColor = u.color; ctx.shadowBlur = 20; drawUfoShape(u.size, Math.sin(time * 38) > 0 ? '#ffffff' : u.color); ctx.restore(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = .8; ctx.fillStyle = i % 2 ? '#ffd35a' : '#ff6b2e'; ctx.beginPath(); ctx.arc(u.x + (Math.random() - .5) * u.size, u.y + (Math.random() - .5) * u.size * .4, u.size * .06, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (const b of megaBlasts) {
      const k = clamp((time - b.started) / b.duration, 0, 1), R = Math.max(W, H) * (.15 + Math.pow(k, .45) * .75) * (b.scale || 1);
      ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - k;
      const core = ctx.createRadialGradient(0, 0, 1, 0, 0, R * .7);
      core.addColorStop(0, '#ffffff'); core.addColorStop(.18, '#fff18b'); core.addColorStop(.45, '#ff8a2e'); core.addColorStop(.75, b.color + '99'); core.addColorStop(1, b.color + '00');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, R * .7, 0, TAU); ctx.fill();
      for (const [ring, color, width] of [[1, '#ffffff', 10], [.8, b.color, 22], [.6, '#ff4eb8', 14]]) {
        ctx.beginPath(); ctx.arc(0, 0, R * ring, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = width * (1 - k) + 1; ctx.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const angle = i / 28 * TAU + b.seed, reach = R * (.35 + random(b.seed + i) * .8);
        line(Math.cos(angle) * R * .1, Math.sin(angle) * R * .1, Math.cos(angle) * reach, Math.sin(angle) * reach, i % 3 ? '#fff3a1' : b.color, (1 - k) * 6 + 1);
        ctx.fillStyle = i % 2 ? '#ffe27a' : b.color; ctx.save(); ctx.translate(Math.cos(angle) * reach * 1.1, Math.sin(angle) * reach * 1.1); ctx.rotate(angle + k * 8);
        ctx.fillRect(-R * .012, -R * .006, R * .024, R * .012); ctx.restore();
      }
      ctx.restore();
    }
    drawBoss(); drawBossBeams();
    if (callout) {
      const k = (time - callout.started) / 1.9;
      if (k >= 1) callout = null;
      else {
        const pop = k < .12 ? 1.7 - k / .12 * .7 : 1, size = Math.min(W * .085, 86) * pop;
        ctx.save(); ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1; ctx.translate(W / 2, H * .38); ctx.rotate(-.06);
        ctx.font = `italic 900 ${size}px 'Barlow Condensed', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = size * .14; ctx.strokeStyle = '#09091a'; ctx.strokeText(callout.text, 0, 0, W * .92);
        ctx.shadowColor = callout.color; ctx.shadowBlur = 30; ctx.fillStyle = callout.color; ctx.fillText(callout.text, 0, 0, W * .92);
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= .55; ctx.fillText(callout.text, 0, -size * .05, W * .92); ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawUfo(s, ufo) {
    const a = s.p1, b = s.p2, f = mod(ufo.distance, SEG) / SEG, width = lerp(a.w, b.w, f);
    const arrive = ufo.spawnedAt > 0 ? clamp((time - ufo.spawnedAt) / 1.2, 0, 1) : 1;
    const x = lerp(a.x, b.x, f) + width * ufo.lane, roadY = lerp(a.y, b.y, f), size = width * .17, y = roadY - width * .43 - (1 - arrive) * (1 - arrive) * H * .6;
    if (size < 2) return;
    ufo.screen = { x, y, size, at: time };
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .82; ctx.shadowColor = ufo.color; ctx.shadowBlur = Math.min(25, size * .55);
    ctx.globalAlpha = .12; polygon([[-size * .4, size * .12], [-size * 1.8, size * 2.3], [size * 1.8, size * 2.3], [size * .4, size * .12]], ufo.color);
    ctx.globalAlpha = .94 * arrive;
    drawUfoShape(size, ufo.color);
    ctx.restore();
  }
  function drawBomb(s, bomb, t) {
    const a = s.p1, b = s.p2, worldPosition = mod(bomb.distance, LENGTH), f = worldPosition % SEG / SEG, width = lerp(a.w, b.w, f);
    const x = lerp(a.x, b.x, f) + width * bomb.lane, roadY = lerp(a.y, b.y, f), fall = clamp((time - bomb.droppedAt) / bomb.fallTime, 0, 1);
    const size = width * (.075 + fall * .025), y = roadY - (1 - fall) * width * .62;
    if (size < 1.5) return;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .7 + Math.sin(time * 18 + bomb.seed) * .2; ctx.shadowColor = bomb.color; ctx.shadowBlur = Math.min(24, size * .7);
    if (bomb.landed) { ctx.beginPath(); ctx.ellipse(0, size * .2, size * 1.8, size * .55, 0, 0, TAU); ctx.strokeStyle = '#ff6d3f'; ctx.lineWidth = Math.max(1, size * .06); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, size * .66, 0, TAU); ctx.fillStyle = '#292435'; ctx.fill(); ctx.strokeStyle = bomb.color; ctx.lineWidth = Math.max(1, size * .11); ctx.stroke();
    line(0, -size * .55, size * .2, -size * .95, '#fff2a1', Math.max(1, size * .08));
    ctx.fillStyle = '#fff1a0'; ctx.beginPath(); ctx.arc(size * .23, -size, Math.max(1, size * .09), 0, TAU); ctx.fill();
    ctx.restore();
    if (bomb.landed) cbMark(x, roadY, Math.max(10, size * 1.6));
  }
  // ==== Circuit unlocks, game modes, lifetime race stats.
  // ---- Campaign: circuit n+1 unlocks with a podium (top 3) on circuit n.
  const trackLocked = i => i >= (profile.unlocked || 1);
  function renderLock() {
    const locked = trackLocked(trackIndex), el = $('track-lock');
    document.body.classList.toggle('track-locked', locked);
    if (el) el.textContent = locked ? `🔒 LOCKED — FINISH TOP 3 ON ${tracks[trackIndex - 1].name} TO UNLOCK` : `CIRCUITS UNLOCKED: ${Math.min(profile.unlocked || 1, tracks.length)}/${tracks.length}`;
    const start = $('start'); if (start.firstElementChild) start.firstElementChild.textContent = locked ? 'LOCKED CIRCUIT' : 'ENTER THE RACE';
  }
  function showLockedHint() { const el = $('track-lock'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
  // ---- Game modes: RACE (grand prix), TIME TRIAL (alone against the clock) and ENDLESS (boss after boss).
  let trialRun = false;
  // ---- Lifetime statistics.
  function recordRaceStats(finished) {
    const st = profile.stats;
    st.races = (st.races || 0) + 1; st.km = (st.km || 0) + distance / LENGTH * 7.2;
    st.perTrack = st.perTrack || {}; st.perTrack[trackIndex] = (st.perTrack[trackIndex] || 0) + 1;
    if (finished && !trialRun) { if (rank === 1) st.wins = (st.wins || 0) + 1; if (rank <= 3) st.podiums = (st.podiums || 0) + 1; }
    saveProfile();
  }
  const GAME_MODES = { race: 'GRAND PRIX', trial: 'TIME TRIAL', endless: 'ENDLESS BOSSES' };
  const gameMode = () => GAME_MODES[settings.gameMode] ? settings.gameMode : 'race';
  function renderGameMode() {
    document.body.classList.toggle('mode-trial', gameMode() === 'trial'); document.body.classList.toggle('mode-endless', gameMode() === 'endless');
    const best = profile.stats.trial && profile.stats.trial[trackIndex];
    if ($('mode-info')) $('mode-info').textContent = gameMode() === 'trial' ? `NO RIVALS, NO UFOS · BEST ${best ? formatTime(best) : '— —:—'}` : gameMode() === 'endless' ? `BOSS AFTER BOSS UNTIL YOU FALL · RECORD ${profile.stats.endlessBest || 0} WAVES` : `${PILOT_COUNT} PILOTS · ${LAP_COUNT} LAPS · WIN TO FACE THE INVASION`;
    renderLock();
  }
  // ==== Daily challenge and streak.
  // ---- Daily challenge: one goal per calendar day (same for everyone), bonus credits and a day streak.
  let raceStats = { ufos: 0, rivals: 0, cats: 0, boost: 0, lives: 0 };
  const DAILY_GOALS = [
    { id: 'win', text: t => `WIN ${t}`, check: () => rank === 1 },
    { id: 'noboost', text: t => `TOP 3 ON ${t} WITHOUT BOOSTING`, check: () => rank <= 3 && raceStats.boost === 0 },
    { id: 'ufos', n: [6, 12], text: (t, n) => `SHOOT DOWN ${n} UFOs ON ${t}`, check: n => raceStats.ufos >= n },
    { id: 'rivals', n: [8, 16], text: (t, n) => `DESTROY ${n} RIVALS ON ${t}`, check: n => raceStats.rivals >= n },
    { id: 'flawless', text: t => `FINISH ${t} WITHOUT LOSING A LIFE`, check: () => raceStats.lives === 0 },
    { id: 'cats', n: [3, 6], text: (t, n) => `POP ${n} CATS ON ${t}`, check: n => raceStats.cats >= n },
    { id: 'podium', text: t => `PODIUM ON ${t} ON HARD`, check: () => rank <= 3 && settings.difficulty === 'hard' },
  ];
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function dailyChallenge(key = dayKey()) {
    let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    // The circuit is fixed the first time the day's challenge is shown, so unlocking a circuit mid-day cannot move it.
    if (!profile.daily.pick || profile.daily.pick.key !== key) { profile.daily.pick = { key, track: (h >>> 8) % Math.max(1, Math.min(profile.unlocked || 1, tracks.length)) }; saveProfile(); }
    const goal = DAILY_GOALS[h % DAILY_GOALS.length], track = profile.daily.pick.track;
    const n = goal.n ? goal.n[0] + (h >>> 16) % (goal.n[1] - goal.n[0] + 1) : 0;
    return { key, goal, track, n, text: goal.text(tracks[track].name, n) };
  }
  profile.daily = Object.assign({ done: '', last: '', streak: 0 }, profile.daily);
  const dailyReward = () => 300 + 50 * Math.min(10, profile.daily.streak);
  function renderDaily() {
    const d = dailyChallenge(), done = profile.daily.done === d.key, el = $('daily'); if (!el) return;
    el.classList.toggle('done', done);
    $('daily-text').textContent = done ? `✓ DONE — ${d.text}` : d.text;
    $('daily-meta').textContent = `${done ? 'COME BACK TOMORROW' : `REWARD ${dailyReward()} CR`}  ·  🔥 STREAK ${profile.daily.streak}`;
  }
  function checkDaily() {
    const d = dailyChallenge();
    if (gameMode() !== 'race' || trackIndex !== d.track || profile.daily.done === d.key || !d.goal.check(d.n)) return;
    const yesterday = dayKey(new Date(Date.now() - 864e5));
    profile.daily.streak = profile.daily.last === yesterday ? profile.daily.streak + 1 : 1;
    profile.daily.last = d.key; profile.daily.done = d.key; saveProfile();
    addCredits(dailyReward() - 50, 'DAILY CHALLENGE');
    $('result-record').textContent = `📅 DAILY CHALLENGE COMPLETE!  🔥 ${profile.daily.streak}-DAY STREAK`;
    renderDaily();
  }
  // ==== Race start/pause/garage, lasers, wrecks, lives, results.
  function startRace() {
    if (gameMode() === 'endless') { startEndless(); return; }
    if (trackLocked(trackIndex)) { renderLock(); playToneSweep(220, 120, .25, 'square', .05); showLockedHint(); return; }
    mode = 'countdown'; position = 0; distance = 0; playerX = 0; speed = 0; energy = 100; elapsed = 0; lap = 1; lapStart = 0;
    laps = []; countdown = 3; rank = PILOT_COUNT; shield = 100; collisionCooldown = 0; wallCooldown = 0; lastPad = -1; hitHazards = new Set(); hitRamps = new Set(); particles = []; explosions = []; laserShots = []; enemyShots = []; bombs = []; laserAmmo = laserCap(); laserCharge = 0; laserCooldown = 0; jumpHeight = 0; jumpVelocity = 0; jumpBoostTimer = 0; screenFlash = 0; wreckBurst = null; shake = 0; boosting = false; boostLocked = false; launchGoTime = 0;
    const track = tracks[trackIndex];
    const lanes = [-.6, -.3, 0, .3, .6], colors = ['#ff46bc', '#ffda46', '#9d6aff', '#3dffa6', '#ff774b', '#66aaff', '#e3ff6c', '#ff795e', '#a7ff54', '#61baff', '#e874ff', '#ffcb4d', '#73f1ed', '#fc69a7', '#a2ff72', '#d0a3ff', '#ff8756', '#59d8ff', '#f4f067'];
    rivals = Array.from({ length: PILOT_COUNT - 1 }, (_, i) => ({ distance: 1400 + i * 760, x: lanes[i % lanes.length], lane: lanes[i % lanes.length], speed: (7800 + i * 92) * track.rivalPace * diff().pace, color: colors[i % colors.length], seed: i, alive: true, hull: 3, boosting: false, boostRemaining: 0, boostCooldown: .4 + random(i + 42) * 1.7, laserCooldown: .55 + random(i + 182) * 4.2 }));
    ufos = Array.from({ length: 2 + Math.floor(trackIndex / 3) }, (_, i) => makeUfo(i, i, -10));
    // Three named nemeses race at the front of the grid: tougher hulls, they hunt the player and talk trash.
    const nemesisPick = [0, 1, 2, 3].filter(i => i !== trackIndex % 4).slice(0, 3);
    nemesisPick.forEach((n, k) => { const r = rivals[rivals.length - 1 - k], def = NEMESES[n]; Object.assign(r, { nemesis: def, color: def.color, dark: def.dark, hull: 6, speed: r.speed * 1.04, tauntAt: -99 }); });
    if (gameMode() === 'trial') { rivals = []; ufos = []; rank = 1; }
    endlessRun = false; trialRun = gameMode() === 'trial';
    crashingUfos = []; ufoRespawns = []; smoke = []; megaBlasts = []; confetti = []; callout = null; hyperTime = 0; hitGates = new Set(); power = {}; bubbleHits = 0; hitPowerups = new Set(); missiles = []; mines = []; slip = 0; slipShown = false; ufoKills = 0; boss = null; bossAttacks = [];
    musicHold = 0; raceEarned = 0; lostLifeThisRace = false; raceStats = { ufos: 0, rivals: 0, cats: 0, boost: 0, lives: 0 }; weather = null; nextWeatherAt = time + 22 + Math.random() * 10; lives = startLives(); raceRespawnAt = 0; raceInvulnUntil = 0; clearFinale(); keys.clear(); resetGesture(); $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause-screen').classList.add('hidden');
    $('hud').classList.remove('hidden'); document.body.classList.add('racing'); document.body.classList.remove('paused', 'destroyed');
    $('hud-track').textContent = tracks[trackIndex].name; $('best-label').textContent = bestLap ? `BEST ${formatTime(bestLap)}` : 'BEST — —:—';
    $('result-eyebrow').textContent = 'NEON GRAND PRIX / RACE COMPLETE';
    $('race-message').classList.remove('visible'); messageTime = 0;
    if (settings.steering === 'gyro' && !enableGyro.listening) enableGyro();
    playMusic(); primeSpeech(); calibrateTilt(); applyScreenSetting(true); updateHUD();
    if (!profile.tutorialDone && gameMode() === 'race') startTutorial(); else { tutorial = null; $('tutorial').classList.remove('visible'); }
    if (window.matchMedia?.('(pointer: coarse)').matches) { hintTime = 6; document.body.classList.add('hinting'); }
  }
  function pauseRace() {
    if (mode === 'racing' || mode === 'countdown') {
      $('pause-screen').dataset.previous = mode; mode = 'paused'; keys.clear(); resetGesture();
      $('pause-screen').classList.remove('hidden'); document.body.classList.add('paused');
    } else if (mode === 'paused') {
      mode = $('pause-screen').dataset.previous || 'racing'; $('pause-screen').classList.add('hidden'); document.body.classList.remove('paused'); calibrateTilt();
    }
  }
  function garage() {
    if (tutorial) { tutorial = null; $('tutorial').classList.remove('visible'); }
    clearFinale(); mode = 'menu'; keys.clear(); resetGesture(); speed = 0; playerX = 0; jumpHeight = 0; jumpVelocity = 0; jumpBoostTimer = 0; boosting = false;
    explosions = []; laserShots = []; enemyShots = []; bombs = []; ufos = []; particles = []; screenFlash = 0;
    crashingUfos = []; ufoRespawns = []; smoke = []; megaBlasts = []; callout = null; hyperTime = 0; boss = null; bossAttacks = []; document.body.classList.remove('hyper', 'boss');
    $('menu').classList.remove('hidden'); ['hud', 'pause-screen', 'results'].forEach(id => $(id).classList.add('hidden'));
    document.body.classList.remove('racing', 'paused', 'boosting', 'critical', 'destroyed', 'hinting'); hintTime = 0;
  }
  function fireLaser() {
    if (tutorial) tutorial.fired = true;
    if (laserAmmo <= 0 && !hyper()) { laserCooldown = .5; showMessage('LASER CELLS RECHARGING', .7); return; }
    const track = tracks[trackIndex];
    const reach = hyper() ? .6 : .32;
    const target = rivals.filter(r => r.alive && r.distance > distance + 1350 && r.distance < distance + (hyper() ? 26000 : 19000) && Math.abs(r.x * track.width - playerX) < track.width * reach)
      .sort((a, b) => a.distance - b.distance)[0];
    const shipScreenX = W * .5 + steerVisual * 12;
    if (boss && !boss.dying && time > boss.arrived - .6 && Math.abs(boss.x - shipScreenX) < boss.size * (hyper() ? 1.2 : .85)) {
      if (!hyper()) laserAmmo--; laserCooldown = hyper() ? .1 : .24;
      const offset = clamp((shipScreenX - boss.x) / boss.size, -.6, .6) * .5;
      laserShots.push({ screen: true, offset, color: track.second, mega: hyper(), started: time, duration: .32, x: boss.x + offset * boss.size, y: boss.y + boss.size * .08 });
      playLaserSound(); hitBoss(hyper() ? 3 : 1); return;
    }
    const ufoTarget = ufos.filter(u => time - u.spawnedAt > 1 && u.distance < distance + 19000 && Math.abs(u.lane * track.width - playerX) < track.width * (hyper() ? .62 : .34))
      .sort((a, b) => a.distance - b.distance)[0];
    if (ufoTarget && (!target || ufoTarget.distance < target.distance + 6000)) {
      if (!hyper()) laserAmmo--; laserCooldown = hyper() ? .1 : .24;
      laserShots.push({ distance: ufoTarget.distance, lane: ufoTarget.lane * track.width, air: true, color: track.second, mega: hyper(), started: time, duration: .2, x: W * .5, y: H * .79 });
      playLaserSound(); shootDownUfo(ufoTarget); return;
    }
    const lane = target ? target.x * track.width : clamp(playerX, -track.width * .85, track.width * .85);
    const targetDistance = target ? target.distance : distance + 9000;
    if (!hyper()) laserAmmo--; laserCooldown = hyper() ? .1 : .24;
    laserShots.push({ distance: targetDistance, lane, color: track.second, mega: hyper(), started: time, duration: hyper() ? .28 : .2, x: W * .5, y: H * .79 });
    playLaserSound();
    if (target && powerOn('multi')) {
      // Multi-laser: two more beams fan out to the next rivals in a wide cone.
      const extra = rivals.filter(r => r !== target && r.alive && r.distance > distance + 1350 && r.distance < distance + 22000 && Math.abs(r.x * track.width - playerX) < track.width * .75)
        .sort((a, b) => a.distance - b.distance).slice(0, 2);
      for (const r of extra) {
        laserShots.push({ distance: r.distance, lane: r.x * track.width, color: POWERUPS.multi.color, started: time, duration: .2, x: W * .5, y: H * .79 });
        r.hull -= 1; createExplosion(r.distance, r.x * track.width, r.color, r.hull > 0 ? .3 : .45);
        if (r.hull <= 0) knockOut(r);
      }
    }
    if (target) {
      target.hull = hyper() ? 0 : target.hull - 1; target.stunnedUntil = time + .32;
      createExplosion(target.distance, lane, target.color, target.hull > 0 ? .3 : .45);
      if (target.hull <= 0) {
        knockOut(target); showMessage(target.nemesis ? `NEMESIS ${target.nemesis.name} DESTROYED!` : 'RIVAL DESTROYED  /  +1 PLACE', 1.1);
      } else {
        showMessage(target.nemesis ? `${target.nemesis.name} HIT  /  HULL ${target.hull}/6` : `RIVAL HIT  /  HULL ${target.hull}/3`, .8); playImpactSound(.48);
      }
    } else if (laserAmmo === 0) showMessage('TARGET MISSED  /  LASERS LOW', .65);
  }
  // A beaten rival does not vanish at once: it trails smoke, spins out of control and only then explodes.
  const WRECK_TIME = 1.5;
  // A beaten rival is flung off the track: it careens across the whole screen, smoking and spinning, then explodes.
  function knockOut(rival) {
    if (rival.nemesis) {
      raceStats.nemeses = (raceStats.nemeses || 0) + 1; showCallout(`${rival.nemesis.name} IS OUT!`, rival.nemesis.color);
      robotSay(`${rival.nemesis.name} is out`, `down-${rival.nemesis.id}`); if (mode === 'racing') addCredits(100, 'NEMESIS DOWN');
      if (raceStats.nemeses >= 3) unlockAchievement('nemesis');
    }
    if (stat('rivals') >= 50) unlockAchievement('rivals50');
    if (mode === 'racing') raceStats.rivals++;
    if (mode === 'racing') addCredits(15, 'RIVAL DOWN');
    rival.alive = false; rival.boosting = false; rival.dying = null;
    const start = rival.screen && time - rival.screen.at < .3 ? rival.screen : { x: W * .5, y: H * .5, size: Math.min(W, H) * .04 };
    const seed = Math.floor(time * 991) + rival.seed * 17;
    const points = [[start.x, start.y]];
    for (let i = 0; i < 4; i++) points.push([W * (.08 + random(seed + i * 3) * .84), H * (.14 + random(seed + i * 3 + 1) * .6)]);
    points.push([W * (.3 + random(seed + 40) * .4), H * (.3 + random(seed + 41) * .25)]);
    crashingUfos.push({ kind: 'racer', color: rival.color, seed: rival.seed, started: time, points, startSize: start.size, spinDir: random(seed + 9) > .5 ? 1 : -1, x: start.x, y: start.y, size: start.size, angle: 0 });
    playImpactSound(.7); playNoiseBurst(.9, .1, 2600, 260);
  }
  function updateWreck(rival, dt, track) {
    const t = (time - rival.dying.started) / WRECK_TIME;
    // Coast just below the player's pace so the wreck stays in view ahead instead of being overtaken at once.
    rival.speed += (Math.max(speed * .9, 2500) - rival.speed) * Math.min(1, dt * 3); rival.distance += rival.speed * dt;
    rival.x = clamp(rival.x + rival.dying.spin * dt * (.12 + t * .35), -1.05, 1.05);
    if (t >= 1) {
      rival.dying = null;
      createExplosion(rival.distance, rival.x * track.width, rival.color, 1.4);
      createExplosion(rival.distance + 160, rival.x * track.width + .06, '#ffb347', .8);
      if (Math.abs(rival.distance - distance) < 15000) playExplosionSound(1.1);
    }
  }
  function drawSmoke(x, y, width, rival) {
    const t = clamp((time - rival.dying.started) / WRECK_TIME, 0, 1);
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const phase = mod(time * 1.7 + i / 14 + rival.seed * .13, 1);
      const drift = Math.sin(i * 2.3 + time * 3 + rival.seed) * width * (.12 + phase * .45);
      const px = x + drift, py = y - width * (.2 + phase * 1.6), r = width * (.14 + phase * .42) * (.75 + t * .7);
      ctx.globalAlpha = (1 - phase) * (.5 + t * .35);
      ctx.fillStyle = phase < .14 ? '#ff9a3d' : i % 3 ? '#8a8399' : '#b4adc2';
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const phase = mod(time * 4.1 + i / 5 + rival.seed, 1);
      ctx.globalAlpha = (1 - phase) * .9; ctx.fillStyle = i % 2 ? '#ffd35a' : '#ff6b2e';
      ctx.beginPath(); ctx.arc(x + Math.sin(i * 7.7 + time * 9) * width * .3, y - width * phase * .6, width * .06, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function destroyPlayer() {
    if (mode !== 'racing') return;
    if (lives > 0) { loseRaceLife(); return; }
    mode = 'wrecked'; wreckedAt = time;
    wreckRank = 1 + rivals.filter(r => r.alive && r.distance > distance + 1050).length;
    boosting = false; document.body.classList.remove('boosting'); document.body.classList.add('paused', 'destroyed');
    laserShots = []; enemyShots = []; wreckBurst = { started: time, duration: 1.6, color: '#ffec87', size: 5, seed: Math.floor(time * 1000), cartoon: false };
    const shipSize = Math.min(W * .074, 110);
    megaBlasts.push({ x: W * .5, y: H * .79, started: time, duration: 2, color: '#ffec87', seed: 5, scale: 1 });
    megaBlasts.push({ x: W * .5 - shipSize, y: H * .72, started: time + .2, duration: 1.6, color: machines[shipIndex].color, seed: 9, scale: .65 });
    megaBlasts.push({ x: W * .5 + shipSize, y: H * .75, started: time + .35, duration: 1.6, color: '#ff4eb8', seed: 21, scale: .65 });
    for (const rival of rivals) {
      if (!rival.alive && !rival.dying) continue;
      rival.alive = false; rival.dying = null; createExplosion(rival.distance, rival.x * tracks[trackIndex].width, rival.color, .85 + random(rival.seed + time) * .45);
    }
    for (const bomb of bombs) if (!bomb.exploded) createExplosion(bomb.distance, bomb.lane * tracks[trackIndex].width, '#ff9b42', .95);
    bombs = [];
    for (const ufo of ufos) createExplosion(ufo.distance, ufo.lane * tracks[trackIndex].width, ufo.color, 1.2);
    ufos = []; ufoRespawns = []; crashingUfos = []; hyperTime = 0; bossAttacks = []; if (boss) { megaBlasts.push({ x: boss.x, y: boss.y, started: time, duration: 1.6, color: '#ff4eb8', seed: 7 }); boss = null; }
    document.body.classList.remove('hyper', 'boss');
    for (let i = 0; i < 4; i++) createExplosion(distance + 900 + i * 620, playerX + (i % 2 ? .3 : -.3), i % 2 ? '#49f8ff' : '#ff54c8', 1.1 + i * .12);
    showMessage('SHIELDS DOWN  /  TOTAL CHAIN REACTION', 1.3);
    playExplosionSound(1.65); updateHUD();
  }
  const hullLoss = amount => Math.round(amount / hullStrength());
  // Shield gone but a life left: the ship blows up big, and after a moment it is back at the same spot on the track.
  function loseRaceLife() {
    lostLifeThisRace = true; raceStats.lives++;
    lives--; mode = 'respawning'; raceRespawnAt = time + 2.4; boosting = false; jumpHeight = 0; jumpVelocity = 0;
    document.body.classList.remove('boosting'); laserShots = []; enemyShots = [];
    const shipSize = Math.min(W * .074, 110), m = machines[shipIndex];
    megaBlasts.push({ x: W * .5, y: H * .79, started: time, duration: 2, color: '#ffec87', seed: 5, scale: 1 });
    megaBlasts.push({ x: W * .5 - shipSize, y: H * .72, started: time + .2, duration: 1.6, color: m.color, seed: 9, scale: .65 });
    megaBlasts.push({ x: W * .5 + shipSize, y: H * .75, started: time + .35, duration: 1.6, color: '#ff4eb8', seed: 21, scale: .65 });
    for (let i = 0; i < 40; i++) particles.push({ x: W * .5, y: H * .78, vx: (Math.random() - .5) * 1600, vy: -Math.random() * 1100, life: 1.2, color: i % 3 ? m.color : '#ffec87' });
    shake = 3.4; screenFlash = 1;
    playExplosionSound(3); playToneSweep(90, 18, 2.2, 'sawtooth', .2); playNoiseBurst(2.4, .32, 2400, 40);
    showMessage(`SHIP DESTROYED  /  ${lives + 1} ${lives ? 'LIVES' : 'LIFE'} LEFT`, 2.2); updateHUD();
  }
  function damageShield(amount) {
    if (hyper() || time < raceInvulnUntil) return false;
    if (bubbleHits > 0 && powerOn('bubble')) {
      bubbleHits--; screenFlash = Math.max(screenFlash, .25); playToneSweep(900, 1500, .2, 'sine', .07);
      if (!bubbleHits) power.bubble = 0;
      showMessage(bubbleHits ? `BUBBLE ABSORBED IT  /  ${bubbleHits} LEFT` : 'BUBBLE POPPED!', .9); return false;
    }
    shield = Math.max(0, shield - amount * diff().dmg / hullStrength());
    if (shield <= 25) screenFlash = Math.max(screenFlash, .08 + (25 - shield) * .005);
    if (shield === 0) { destroyPlayer(); return true; }
    return false;
  }
  function showWreckResults() {
    recordRaceStats(false);
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
    mode = 'finished';
    $('result-eyebrow').textContent = 'CATASTROPHIC FAILURE / SHIELDS OFFLINE';
    $('result-title').textContent = 'SHIELDS DOWN.';
    $('result-position').textContent = String(wreckRank).padStart(2, '0');
    $('result-time').textContent = formatTime(elapsed);
    $('result-lap').textContent = laps.length ? formatTime(Math.min(...laps)) : '— —:—';
    $('result-record').textContent = 'HULL LOST / THE WHOLE PACK WENT NOVA';
    $('results').classList.remove('hidden');
  }
  function finishTrial() {
    mode = 'finished'; boosting = false; document.body.classList.remove('boosting'); document.body.classList.add('paused');
    profile.stats.trial = profile.stats.trial || {};
    const best = profile.stats.trial[trackIndex], record = !best || elapsed < best;
    if (record) profile.stats.trial[trackIndex] = elapsed;
    saveProfile(); addCredits(80, 'TIME TRIAL');
    const fastest = Math.min(...laps); if (!bestLap || fastest < bestLap) { bestLap = fastest; try { localStorage.setItem(`chroma-best-${trackIndex}`, String(bestLap)); } catch {} }
    $('result-eyebrow').textContent = `TIME TRIAL / ${tracks[trackIndex].name}`; $('result-title').textContent = record ? 'NEW BEST TIME!' : 'TIME TRIAL DONE.';
    $('result-position').textContent = '⏱'; $('result-time').textContent = formatTime(elapsed); $('result-lap').textContent = formatTime(fastest);
    $('result-record').textContent = record ? (best ? `✦ ${formatTime(best - elapsed)} faster than your old best` : '✦ First time set — now beat it!') : `Best: ${formatTime(best)}  ·  +${formatTime(elapsed - best)} behind`;
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
    $('results').classList.remove('hidden'); invasionArmed = false; soundEffect(880, .6); if (record) playFanfare();
  }
  function finishRace() {
    recordRaceStats(true);
    if (trialRun) { finishTrial(); return; }
    addCredits(Math.max(0, (PILOT_COUNT + 1 - rank) * 10) + (rank <= 3 ? 100 : 0) + (rank === 1 ? 150 : 0), `P${rank} FINISH`);
    unlockAchievement('first-race'); if (rank <= 3) unlockAchievement('podium'); if (rank === 1) { unlockAchievement('win'); if (!lostLifeThisRace) unlockAchievement('flawless'); }
    let unlockedNow = '';
    if (rank <= 3 && trackIndex + 1 < tracks.length && trackLocked(trackIndex + 1)) { profile.unlocked = trackIndex + 2; saveProfile(); unlockedNow = tracks[trackIndex + 1].name; }
    if ((profile.unlocked || 1) >= tracks.length) unlockAchievement('unlock-all');
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
    mode = 'finished'; boosting = false; document.body.classList.remove('boosting'); document.body.classList.add('paused');
    $('results').classList.remove('hidden'); $('result-position').textContent = String(rank).padStart(2, '0');
    $('result-title').textContent = rank === 1 ? 'PURE OVERDRIVE.' : rank <= 3 ? 'PODIUM FINISH.' : 'LIMITS REDEFINED.';
    $('result-time').textContent = formatTime(elapsed); const fastest = Math.min(...laps);
    $('result-lap').textContent = formatTime(fastest);
    const record = !bestLap || fastest < bestLap;
    $('result-record').textContent = record ? '✦ NEW CIRCUIT LAP RECORD' : 'Chase the perfect line. The next podium is yours.';
    if (unlockedNow) $('result-record').textContent = `🔓 NEW CIRCUIT UNLOCKED: ${unlockedNow}!` + (record ? '  ·  ✦ NEW LAP RECORD' : '');
    if (record) { bestLap = fastest; try { localStorage.setItem(`chroma-best-${trackIndex}`, String(bestLap)); } catch {} }
    soundEffect(880, .6);
    invasionArmed = rank === 1;
    if (rank === 1) { launchConfetti(); playFanfare(); robotSay('First place. Flawless victory', 'first-place'); }
    checkDaily();
  }
  // ==== Playful boot panel on the start screen.
  // ---- Playful boot screen on the start page while the soundtrack and voices download.
  const BOOT_LINES = [
    'BOOTSTRAPPING THE SINGULARITY…', 'UPDATING THE SOLAR SYSTEM — DO NOT UNPLUG THE SUN…', 'RETICULATING HYPERSPACE SPLINES…',
    'CALIBRATING ANTI-GRAVITY. HOLD ON TO SOMETHING…', 'DEFRAGMENTING BLACK HOLES…', 'DOWNLOADING MORE RAM FOR THE MOTHERSHIP…',
    'FEEDING THE ALIEN OVERLORD…', 'POLISHING THE DISCO BALL…', 'TEACHING ROBOTS TO SCREAM…', 'TUNING MORBID FINGERS’ GUITAR AMPS…',
    'CONVINCING CATS TO CROSS THE TRACK…', 'REBOOTING THE BIG BANG (ATTEMPT 2 OF 3)…', 'WAXING THE MAGGOT QUEEN… EW.', 'COMPRESSING SPACETIME, ALMOST DONE…',
  ];
  let bootLine = -1, bootLineAt = -9, bootDoneAt = 0;
  const bootProgress = () => clamp(soundtrackProgress * .85 + voicesLoaded / VOICE_CLIPS.length * .15, 0, 1);
  // In portrait the boot panel sits under the start button; elsewhere it takes the middle of the bottom bar.
  function placeBoot() {
    const box = $('boot'), note = document.querySelector('.start-note'), bar = document.querySelector('.bottom-bar'), controls = document.querySelector('.bottom-bar .controls');
    if (!box || !note || !bar || !window.matchMedia) return;
    const portrait = matchMedia('(max-width:600px) and (orientation:portrait)').matches;
    if (portrait && box.previousElementSibling !== note) note.after(box);
    else if (!portrait && box.parentElement !== bar) bar.insertBefore(box, controls || null);
  }
  if (window.matchMedia) { placeBoot(); matchMedia('(max-width:600px) and (orientation:portrait)').addEventListener?.('change', placeBoot); }
  function updateBoot() {
    const box = $('boot'); if (!box) return;
    document.body.classList.toggle('booting', !box.classList.contains('gone'));
    const done = soundtrackReady && voicesLoaded >= VOICE_CLIPS.length, pct = done ? 100 : Math.min(99, Math.round(bootProgress() * 100));
    if (done) {
      if (!bootDoneAt) { bootDoneAt = time || .001; $('boot-text').textContent = 'SYSTEM READY · SINGULARITY STABLE · GO RACE!'; box.classList.add('done'); }
      if (time - bootDoneAt > 3.5) box.classList.add('gone');
    } else if (time - bootLineAt > 1.8) {
      bootLine = (bootLine + 1) % BOOT_LINES.length; bootLineAt = time; bootDoneAt = 0;
      $('boot-text').textContent = BOOT_LINES[bootLine]; box.classList.remove('done', 'gone');
    }
    $('boot-pct').textContent = pct + '%'; $('boot-fill').style.width = pct + '%';
  }
  // ==== Weather and track events.
  // ---- Weather and track events: a random event every 20-35 s of racing, lasting about 9 s.
  const WEATHER = {
    meteors: { name: '☄ METEOR SHOWER', info: 'WATCH THE IMPACT MARKERS!', color: '#ff8a2e' },
    sandstorm: { name: '🌪 SANDSTORM', info: 'VISIBILITY DROPPING', color: '#e0b070' },
    gravity: { name: '〰 GRAVITY WAVES', info: 'THE TRACK PULLS YOU SIDEWAYS', color: '#a88aff' },
  };
  let weather = null, nextWeatherAt = 25;
  function updateWeather(dt, track) {
    if (!weather && time >= nextWeatherAt) {
      const types = Object.keys(WEATHER), type = types[Math.floor(random(Math.floor(time * 3) + trackIndex) * types.length) % types.length];
      weather = { type, started: time, until: time + 9, nextMeteor: time + .6 };
      showCallout(WEATHER[type].name, WEATHER[type].color); showMessage(WEATHER[type].info, 2); playToneSweep(200, 600, .6, 'sawtooth', .04);
    }
    if (!weather) return;
    if (weather.type === 'meteors' && time >= weather.nextMeteor) {
      weather.nextMeteor = time + .55 + Math.random() * .5;
      const lane = clamp(playerX / track.width + (Math.random() - .5) * .9, -.75, .75);
      bombs.push({ distance: distance + Math.max(4800, speed * .7 + 1200), lane, droppedAt: time, fallTime: .7, landed: false, exploded: false, seed: Math.floor(time * 10), color: '#ff8a2e', meteor: true });
    }
    if (time >= weather.until) { weather = null; nextWeatherAt = time + 20 + Math.random() * 15; showMessage('THE SKY CLEARS', 1); }
  }
  function drawWeather() {
    if (!weather || mode === 'menu') return;
    const k = clamp(Math.min((time - weather.started) * 1.5, (weather.until - time) * 1.5), 0, 1);
    ctx.save();
    if (weather.type === 'sandstorm') {
      const g = ctx.createLinearGradient(0, H * .2, 0, H * .75); g.addColorStop(0, `rgba(180,130,70,${.75 * k})`); g.addColorStop(.7, `rgba(150,100,50,${.45 * k})`); g.addColorStop(1, 'rgba(150,100,50,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(240,200,140,${.55 * k})`;
      for (let i = 0; i < 160; i++) { const x = mod(random(i + 900) * W - time * (300 + random(i) * 500), W), y = random(i + 910) * H * .85; ctx.fillRect(x, y, 2 + random(i) * 10, 1.5); }
    } else if (weather.type === 'gravity') {
      ctx.strokeStyle = '#b89cff'; ctx.lineWidth = 5; ctx.shadowColor = '#a88aff'; ctx.shadowBlur = 14;
      for (let i = 0; i < 4; i++) { const ph = mod(time * .8 + i / 4, 1); ctx.globalAlpha = (1 - ph) * k; ctx.beginPath(); ctx.ellipse(W / 2 + Math.sin((time - weather.started) * 1.4) * W * .2, H * .6, W * (.1 + ph * .7), H * (.03 + ph * .2), 0, 0, TAU); ctx.stroke(); }
    } else if (weather.type === 'meteors') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) { const ph = mod(time * .7 + random(i + 70), 1), x = W * (.1 + random(i + 80) * .8) - ph * W * .25, y = -40 + ph * H * .6; ctx.globalAlpha = k * (1 - ph); line(x, y, x + 60, y - 90, '#ffb347', 3); ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // ==== First-run tutorial.
  // ---- First-run tutorial: short prompts during the first race that advance when you do the thing.
  const touchUI = () => !!window.matchMedia?.('(pointer: coarse)').matches;
  const TUTORIAL = [
    { id: 'steer', text: () => touchUI() ? (settings.steering === 'gyro' ? 'TILT YOUR DEVICE TO STEER' : 'DRAG LEFT / RIGHT ON THE TRACK TO STEER') : 'STEER WITH  A / D  OR  ◀ ▶', done: t => t.steered > .8 },
    { id: 'boost', text: () => touchUI() ? 'SLIDE UP (OR TAP ϟ) TO BOOST' : 'HOLD  SPACE  TO BOOST', done: t => t.boosted > .5 },
    { id: 'laser', text: () => touchUI() ? 'TAP THE TRACK (OR ◎) TO FIRE YOUR LASER' : 'PRESS  X  TO FIRE YOUR LASER', done: t => t.fired },
    { id: 'pads', text: () => 'CYAN PADS RECHARGE BOOST, SHIELD AND LASER', done: t => t.pad || t.stepTime > 7 },
    { id: 'extras', text: () => 'GRAB POWER-UP BOXES  ·  FLY THROUGH ✦ STAR GATES FOR HYPERDRIVE', done: t => t.stepTime > 7 },
    { id: 'goal', text: () => 'FINISH TOP 3 TO UNLOCK THE NEXT CIRCUIT  ·  WIN TO FACE THE INVASION!', done: t => t.stepTime > 6 },
  ];
  let tutorial = null;
  function startTutorial() {
    tutorial = { step: 0, stepTime: 0, steered: 0, boosted: 0, fired: false, pad: false };
    $('tutorial').classList.add('visible'); document.body.classList.add('tutoring'); renderTutorial();
  }
  function endTutorial(skipped) {
    tutorial = null; $('tutorial').classList.remove('visible'); document.body.classList.remove('tutoring'); profile.tutorialDone = true; saveProfile();
    if (!skipped) { showMessage("YOU'RE READY, PILOT!", 1.4); playToneSweep(500, 1500, .3, 'triangle', .05); }
  }
  function renderTutorial() {
    if (!tutorial) return;
    const s = TUTORIAL[tutorial.step];
    $('tutorial-step').textContent = `TUTORIAL ${tutorial.step + 1}/${TUTORIAL.length}`; $('tutorial-text').textContent = s.text();
  }
  function updateTutorial(dt, steer) {
    if (!tutorial || mode !== 'racing') return;
    tutorial.stepTime += dt; if (Math.abs(steer) > .3) tutorial.steered += dt; if (boosting) tutorial.boosted += dt;
    if (TUTORIAL[tutorial.step].done(tutorial)) {
      tutorial.step++; tutorial.stepTime = 0; playToneSweep(900, 1400, .12, 'square', .03);
      if (tutorial.step >= TUTORIAL.length) endTutorial(false); else renderTutorial();
    }
  }
  // ==== Per-frame update loop and HUD.
  let playClock = 0;
  function update(dt) {
    time += dt; screenFlash = Math.max(0, screenFlash - dt * 2.4);
    updateBoot(); tickAchievement();
    if (frameClock - subtitleAt > 2.8 && $('subtitle')) $('subtitle').classList.remove('visible');
    if (['racing', 'final', 'respawning', 'countdown'].includes(mode)) { playClock += dt; if (playClock > 15) { profile.stats.seconds = (profile.stats.seconds || 0) + playClock; playClock = 0; saveProfile(); } }
    if (analyser && !audio.paused && !muted) { analyser.getByteFrequencyData(frequency); beat = lerp(beat, frequency.slice(0, 12).reduce((a, b) => a + b, 0) / (12 * 255), .2); } else beat *= .95;
    if (engineGain) {
      engineGain.gain.setTargetAtTime(mode === 'racing' && !muted ? .013 + speed / 15000 * .027 : 0, audioContext.currentTime, .1);
      engineOsc.frequency.setTargetAtTime(35 + speed / 85 + (boosting ? 35 : 0), audioContext.currentTime, .08);
    }
    if (jetGain) {
      const jet = mode === 'racing' && !muted ? (jumpBoostTimer > 0 ? 1 : boosting ? .8 : 0) : 0, now = audioContext.currentTime;
      jetGain.gain.setTargetAtTime(jet * .16, now, jet ? .05 : .25);
      jetFilter.frequency.setTargetAtTime(500 + speed / 9 + (jumpBoostTimer > 0 ? 900 : 0), now, .1);
      jetWhineGain.gain.setTargetAtTime(jet * .007, now, jet ? .08 : .3);
      jetWhine.frequency.setTargetAtTime(700 + speed / 8 + (jumpBoostTimer > 0 ? 600 : 0), now, .15);
    }
    if (mode === 'menu') { position = mod(position + dt * 2900, LENGTH); playerX = Math.sin(time * .14) * .18; return; }
    if (mode === 'invasion' || mode === 'final' || mode === 'disco') { updateFinale(dt); return; }
    if (mode === 'paused' || mode === 'finished') return;
    if (hintTime > 0) { hintTime -= dt; if (hintTime <= 0 || gesture.moved) { hintTime = 0; document.body.classList.remove('hinting'); } }
    if (mode === 'countdown') {
      // Hold the countdown until the soundtrack is fully downloaded (at most 15 s), then start the music with it.
      if (!soundtrackReady && musicHold < 15) {
        musicHold += dt; $('countdown').textContent = `LOADING MUSIC ${Math.round(soundtrackProgress * 100)}%`; document.body.classList.add('buffering');
        updateHUD(); return;
      }
      if (document.body.classList.contains('buffering')) { document.body.classList.remove('buffering'); if (audio.paused && !muted) playMusic(); }
      const old = Math.ceil(countdown); countdown -= dt;
      $('countdown').textContent = countdown > 0 ? Math.ceil(countdown) : 'GO!';
      if (Math.ceil(countdown) !== old && countdown > 0) soundEffect(440, .13);
      if (countdown <= 0) { mode = 'racing'; launchGoTime = .8; soundEffect(880, .35); calibrateTilt(); }
      updateHUD(); return;
    }
    if (mode === 'respawning') {
      elapsed += dt; shake *= Math.pow(.05, dt);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 450 * dt; p.life -= dt; }
      particles = particles.filter(p => p.life > 0);
      if (messageTime > 0) { messageTime -= dt; if (messageTime <= 0) $('race-message').classList.remove('visible'); }
      if (time >= raceRespawnAt) {
        mode = 'racing'; shield = 100; speed = Math.min(speed, 4500); playerX = 0; raceInvulnUntil = time + 2.5;
        bombs = []; collisionCooldown = 1; showMessage('BACK IN THE RACE!', 1.2); playToneSweep(300, 1200, .5, 'sine', .07);
      }
      updateHUD(); return;
    }
    if (mode === 'wrecked') {
      shake *= Math.pow(.025, dt);
      explosions = explosions.filter(explosion => time - explosion.started < explosion.duration);
      if (time - wreckedAt > 1.15) showWreckResults();
      return;
    }
    if (launchGoTime > 0) { launchGoTime -= dt; if (launchGoTime <= 0) $('countdown').textContent = ''; }
    elapsed += dt; collisionCooldown = Math.max(0, collisionCooldown - dt); wallCooldown = Math.max(0, wallCooldown - dt); laserCooldown = Math.max(0, laserCooldown - dt); shake *= Math.pow(.008, dt);
    if (messageTime > 0) { messageTime -= dt; if (messageTime <= 0) $('race-message').classList.remove('visible'); }
    const machine = machines[shipIndex], track = tracks[trackIndex];
    const brake = keys.has('ArrowDown') || keys.has('KeyS') || gesture.brake;
    const accelerate = (keys.has('ArrowUp') || keys.has('KeyW') || gesture.accel) && !brake;
    const keySteer = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')) || padSteer;
    const steer = keySteer || (gyroActive() ? tiltSteer() : gesture.steer);
    updateTutorial(dt, steer);
    const boostHeld = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || gesture.boost;
    if (!boostHeld) boostLocked = false;
    const wasBoosting = boosting;
    if (hyper()) { energy = 100; boostLocked = false; }
    boosting = boostHeld && !boostLocked && energy > 0 && speed > 2500 && !brake;
    if (boosting && !wasBoosting) { playBoostSound(1); playJetBlast(.75); raceStats.boost++; }
    if (boosting) {
      speed = Math.min((hyper() ? 19800 : 14900) * machine.top * topSpeed(), speed + (hyper() ? 14000 : 9000) * dt); if (!hyper()) energy = Math.max(0, energy - machine.drain * boostDrain() * dt);
      if (energy <= 0) { boostLocked = true; showMessage('BOOST DEPLETED', 1); }
    } else {
      const target = brake ? 3000 : accelerate ? 10700 * machine.top * topSpeed() : 6500;
      speed += clamp(target - speed, -(brake ? 10500 : 2200) * dt, (accelerate ? 5300 : 2900) * dt);
      energy = Math.min(100, energy + dt * 7);
    }
    jumpBoostTimer = Math.max(0, jumpBoostTimer - dt);
    if (hyperTime > 0) { hyperTime -= dt; if (hyperTime <= 0) endHyper(); }
    updateWeather(dt, track);
    if (jumpHeight > 0 || jumpVelocity > 0) {
      jumpHeight = Math.max(0, jumpHeight + jumpVelocity * dt);
      jumpVelocity -= 1450 * dt;
      if (jumpHeight === 0 && jumpVelocity < 0) jumpVelocity = 0;
    }
    updateCrashingUfos(dt); updateBoss(dt);
    if (mode !== 'racing') { updateHUD(); return; }
    for (const ufo of ufos) {
      ufo.distance = distance + 6900 + ufo.slot * UFO_SLOTS_SPACING + Math.sin(time * .38 + ufo.seed) * 280;
      ufo.lane = Math.sin(time * .8 + ufo.seed * 2.1) * .58;
      ufo.dropCooldown -= dt * worldPace();
      if (ufo.dropCooldown <= 0) {
        const laneOffset = (random(Math.floor(time * 13) + ufo.seed * 77) - .5) * .62;
        const bombLane = clamp(playerX / track.width + laneOffset, -.68, .68);
        bombs.push({ distance: distance + Math.max(5300, speed * .72 + 1300) + ufo.seed * 360, lane: bombLane,
          droppedAt: time, fallTime: .72, landed: false, exploded: false, seed: ufo.seed + Math.floor(time * 10), color: '#ff9b42' });
        ufo.dropCooldown = 2.8 + random(Math.floor(time * 7) + ufo.seed * 19) * 2.1;
        showMessage('UFO BOMB RUN!  DODGE OR JUMP!', 1);
        playToneSweep(820, 260, .34, 'sawtooth', .045);
      }
    }
    const seg = segments[Math.floor(mod(position + 1050, LENGTH) / SEG)];
    playerX += steer * dt * (1.08 + speed / 16000) * machine.handling * track.grip;
    if (weather && weather.type === 'gravity') playerX += Math.sin((time - weather.started) * 1.4) * dt * .55 * track.width;
    playerX -= seg.curve * dt * speed / 10700 * .62;
    steerVisual = lerp(steerVisual, steer, Math.min(1, dt * 9));
    const edgeLimit = .93 * track.width;
    if (Math.abs(playerX) > edgeLimit) {
      const side = Math.sign(playerX); playerX = side * edgeLimit; speed = Math.max(2800, speed - dt * 15500); energy = Math.max(0, energy - dt * 10); shake = .5; screenFlash = Math.max(screenFlash, .08);
      for (let i = 0; i < 3; i++) particles.push({ x: W * .5 + side * 65, y: H * .81, vx: (random(time * 200 + i) - .5) * 600, vy: -random(time * 300 + i) * 260, life: .4, color: '#ffbd45' });
      if (wallCooldown <= 0) {
        wallCooldown = .85; showMessage('BARRIER CONTACT  /  ' + shieldText(10), .7); playImpactSound(.65);
        if (damageShield(10)) { updateHUD(); return; }
      }
    }
    if (seg.pad && Math.abs(playerX - seg.padLane * track.width) < .31 * track.width * magnetReach()) {
      // Cyan pads recharge everything: boost energy, hull shield and laser cells.
      energy = Math.min(100, energy + dt * track.recharge); speed = Math.min(15000, speed + dt * 6000);
      shield = Math.min(100, shield + dt * track.recharge * PAD_SHIELD);
      if (laserAmmo < laserCap()) {
        laserCharge += dt * track.recharge * PAD_LASER;
        while (laserCharge >= 1 && laserAmmo < laserCap()) { laserCharge -= 1; laserAmmo++; }
        if (laserAmmo === laserCap()) laserCharge = 0;
      }
      const id = Math.floor(distance / LENGTH) * COUNT + Math.floor(seg.index / track.padEvery);
      if (tutorial) tutorial.pad = true;
      if (lastPad !== id) { lastPad = id; showMessage('RECHARGE  /  BOOST + SHIELD + LASER', 1.1); soundEffect(1000, .2); }
    }
    const firstHazardSegment = Math.floor((distance + 1050 - SEG * .5) / SEG);
    const lastHazardSegment = Math.floor((distance + speed * dt + 1050 + SEG * .5) / SEG);
    for (let worldSegment = firstHazardSegment; worldSegment <= lastHazardSegment; worldSegment++) {
      const roadSegment = segments[mod(worldSegment, COUNT)], hazard = roadSegment.hazard;
      const id = Math.floor(worldSegment / COUNT) * COUNT + roadSegment.index;
      if (hazard && !hitHazards.has(id)) {
        const lane = hazardLane(hazard), jumpedClear = jumpHeight > 110 && hazard.type !== 'gate' && hazard.type !== 'drone';
        if (jumpedClear) hitHazards.add(id);
        else if (Math.abs(playerX - lane * track.width) < hazard.radius * track.width * (hazard.type === 'cat' ? magnetReach() : 1)) {
          hitHazards.add(id);
          if (hyper() && hazard.type !== 'cat') {
            createExplosion(worldSegment * SEG + SEG * .5, lane * track.width, '#7dfcff', 1); showMessage('SMASHED THROUGH!', .7); playExplosionSound(.7);
          } else if (hazard.type === 'cat') {
            speed = Math.max(3500, speed * .92); shake = Math.max(shake, .3); screenFlash = Math.max(screenFlash, .13);
            const previousAmmo = laserAmmo;
            laserAmmo = Math.min(laserCap(), laserAmmo + 1);
            createExplosion(worldSegment * SEG + SEG * .5, lane * track.width, hazard.color || '#ff9bf2', .82, true);
            if (stat('cats') >= 10) unlockAchievement('cats10'); raceStats.cats++;
            showMessage(laserAmmo > previousAmmo ? 'CAT PIXEL-POOF!  LASER +1' : 'CAT PIXEL-POOF!  LASER FULL', 1.05);
            playCatPopSound();
            if (damageShield(4)) { updateHUD(); return; }
          } else {
            speed = Math.max(2500, speed * (1 - (track.hazardPenalty || .24)));
            energy = Math.max(0, energy - (12 + trackIndex * 1.4)); shake = .9; screenFlash = Math.max(screenFlash, .3);
            if (energy <= 0 && boostHeld) boostLocked = true;
            showMessage(hazard.type === 'gate' ? 'LASER GATE HIT  /  ' + shieldText(17 + trackIndex * 1.5) : hazard.type === 'drone' ? 'DRONE COLLISION  /  ' + shieldText(17 + trackIndex * 1.5) : 'MINE STRIKE  /  ' + shieldText(17 + trackIndex * 1.5), 1.1);
            playImpactSound(1 + trackIndex * .055); playExplosionSound(.85); collisionCooldown = Math.max(collisionCooldown, .55);
            createExplosion(worldSegment * SEG + SEG * .5, lane * track.width, hazard.type === 'gate' ? '#ff456d' : track.edge, .75);
            if (damageShield(17 + trackIndex * 1.5)) { updateHUD(); return; }
            for (let i = 0; i < 7; i++) particles.push({ x: W * .5, y: H * .78, vx: (random(time * 200 + i) - .5) * 740, vy: -random(time * 300 + i) * 460, life: .65, color: track.edge });
          }
        }
      }
      const gate = roadSegment.stargate;
      if (gate && !hitGates.has(id) && Math.abs(playerX - gate.lane * track.width) < .3 * track.width * magnetReach()) { hitGates.add(id); activateHyper(); }
      const pickup = roadSegment.powerup;
      if (pickup && !hitPowerups.has(id) && Math.abs(playerX - pickup.lane * track.width) < .26 * track.width * magnetReach()) { hitPowerups.add(id); collectPowerup(pickup.type); }
      const trampoline = roadSegment.trampoline;
      if (trampoline && !hitRamps.has(id) && jumpHeight < 1 && jumpVelocity <= 0 && Math.abs(playerX - trampoline.lane * track.width) < .27 * track.width) {
        hitRamps.add(id); jumpHeight = 2; jumpVelocity = 850; jumpBoostTimer = 1.25; playJetBlast(1.25);
        speed = Math.min(14900 * machine.top * topSpeed(), speed + 2200); energy = Math.min(100, energy + 24);
        shake = Math.max(shake, .28); screenFlash = Math.max(screenFlash, .12);
        showMessage('TRAMPOLINE!  JUMP + BOOST!', 1.2); playToneSweep(250, 1300, .28, 'sine', .07); playBoostSound(.8);
        for (let i = 0; i < 12; i++) particles.push({ x: W * .5 + (random(time * 200 + i) - .5) * 120, y: H * .79, vx: (random(i + 9) - .5) * 340, vy: -random(i + 2) * 480, life: .55, color: i % 2 ? track.second : track.edge });
      }
    }
    for (const bomb of bombs) {
      if (time - bomb.droppedAt >= bomb.fallTime) bomb.landed = true;
      if (!bomb.landed || bomb.distance > distance + speed * dt + 1050 + SEG * .5) continue;
      const nearImpact = bomb.distance >= distance + 1050 - SEG * .5;
      const hit = nearImpact && jumpHeight < 105 && Math.abs(playerX - bomb.lane * track.width) < .2 * track.width;
      bomb.exploded = true; createExplosion(bomb.distance, bomb.lane * track.width, bomb.color, 1.05);
      if (hit) {
        if (!hyper()) speed = Math.max(2600, speed * .7); shake = 1; screenFlash = Math.max(screenFlash, .38);
        showMessage((bomb.meteor ? 'METEOR STRIKE!  ' : 'UFO BOMB HIT!  ') + shieldText(22), 1.1); playImpactSound(1.2); playExplosionSound(1.15);
        if (damageShield(22)) { updateHUD(); return; }
      } else if (nearImpact) showMessage('BOMB DODGED!', .65);
      else playExplosionSound(.55);
    }
    bombs = bombs.filter(bomb => !bomb.exploded && bomb.distance > distance - 1200);
    const prevDistance = distance; distance += speed * dt; position = mod(distance, LENGTH);
    for (const r of rivals) {
      if (r.dying) { updateWreck(r, dt, track); continue; }
      if (!r.alive) continue;
      if (r.boosting) {
        r.boostRemaining -= dt;
        if (r.boostRemaining <= 0) { r.boosting = false; r.boostCooldown = 1.2 + random(Math.floor(time * 11) + r.seed) * 2.1; }
      } else {
        r.boostCooldown -= dt;
        if (r.boostCooldown <= 0 && empSlow(r) === 1) {
          r.boosting = true; r.boostRemaining = .82 + random(Math.floor(time * 7) + r.seed * 3) * .72;
          if (Math.abs(r.distance - distance) < 5200) playBoostSound(.42);
        }
      }
      r.distance += r.speed * (r.boosting ? 1.55 : 1) * (1 + .06 * Math.sin(time * .55 + r.seed)) * dt * worldPace() * empSlow(r);
      r.x = r.lane + .13 * Math.sin(time * .8 + r.seed * 2);
      if (r.nemesis) {
        // Hunt the player: drift towards the player's lane when close, and taunt when overtaking.
        const gap = r.distance - distance;
        if (Math.abs(gap) < 9000) r.lane = lerp(r.lane, clamp(playerX / track.width, -.6, .6), dt * .6);
        if (gap > 0 && gap < 2200 && time - r.tauntAt > 25) nemesisTaunt(r);
      }
      r.laserCooldown -= dt * worldPace() * (r.nemesis ? 1.6 : 1);
      if (r.laserCooldown <= 0 && empSlow(r) === 1) {
        r.laserCooldown = 4.4 + random(Math.floor(time * 5) + r.seed * 31) * 3.2;
        if (r.distance > distance + 1700 && r.distance < distance + 17000 && Math.abs(r.x * track.width - playerX) < track.width * .48) {
          enemyShots.push({ from: r, sourceDistance: r.distance, sourceLane: r.x, targetLane: clamp(playerX / track.width, -.85, .85), color: r.color,
            started: time, impactAt: time + .46, expires: time + .76, resolved: false, x: W * .5, y: H * .5 });
          showMessage('RIVAL LASER LOCK!  BREAK LINE OF SIGHT', .9); playLaserSound();
        }
      }
      if (Math.abs(r.distance - (distance + 1050)) < 340 && Math.abs(r.x * track.width - playerX) < .2 * track.width && collisionCooldown <= 0 && jumpHeight < 90) {
        if (boosting || hyper()) {
          knockOut(r); createExplosion(r.distance, r.x * track.width, r.color, .5); if (!hyper()) speed *= .94; collisionCooldown = .45;
          showMessage('BOOST RAM  /  RIVAL DESTROYED  /  ' + shieldText(6), 1.15); playExplosionSound(1.35);
          if (damageShield(6)) { updateHUD(); return; }
        } else {
          playerX = clamp(playerX + (playerX >= r.x * track.width ? .15 : -.15) * track.width, -edgeLimit, edgeLimit); speed *= .78; shake = .8; collisionCooldown = 1;
          showMessage('HULL CONTACT  /  ' + shieldText(14), .7); playImpactSound(.9);
          if (damageShield(14)) { updateHUD(); return; }
        }
      }
    }
    updateAttacks(dt, track); updateSlipstream(dt, track);
    for (const shot of enemyShots) {
      if (shot.resolved || time < shot.impactAt) continue;
      shot.resolved = true;
      if (jumpHeight < 105 && Math.abs(playerX - shot.targetLane * track.width) < .21 * track.width) {
        shake = Math.max(shake, .55); screenFlash = Math.max(screenFlash, .18);
        const nem = shot.from && shot.from.nemesis;
        showMessage((nem ? `${nem.name} HIT YOU  /  ` : 'ENEMY LASER HIT  /  ') + shieldText(nem ? 11 : 8), .95); playImpactSound(.68);
        if (nem) nemesisTaunt(shot.from);
        if (damageShield(nem ? 11 : 8)) { updateHUD(); return; }
      }
    }
    enemyShots = enemyShots.filter(shot => time < shot.expires);
    if (laserAmmo < laserCap()) {
      laserCharge += dt / laserRecharge();
      if (laserCharge >= 1) { laserCharge -= 1; laserAmmo++; if (laserAmmo === laserCap()) laserCharge = 0; }
    } else laserCharge = 0;
    if ((keys.has('KeyX') || keys.has('KeyF') || gesture.fire || gesture.fireQueued) && laserCooldown <= 0) { gesture.fireQueued = false; fireLaser(); }
    laserShots = laserShots.filter(shot => time - shot.started < shot.duration);
    explosions = explosions.filter(explosion => time - explosion.started < explosion.duration);
    rank = 1 + rivals.filter(r => r.alive && r.distance > distance + 1050).length;
    if (Math.floor(distance / LENGTH) > Math.floor(prevDistance / LENGTH)) {
      laps.push(elapsed - lapStart); lapStart = elapsed;
      if (laps.length === LAP_COUNT) { finishRace(); } else { lap = laps.length + 1; showMessage(lap === LAP_COUNT ? 'FINAL LAP — MAKE IT COUNT' : `LAP ${String(lap).padStart(2, '0')} / ${String(LAP_COUNT).padStart(2, '0')} — KEEP PUSHING`, 2.2); soundEffect(660, .4); }
    }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 450 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0).slice(lowFx() ? -30 : -100);
    document.body.classList.toggle('boosting', boosting || jumpBoostTimer > 0); updateHUD();
  }
  let powerChipsHtml = '';
  function updateHUD() {
    if (time - creditPopAt > 1.4) $('credit-pop').classList.remove('visible');
    const chips = POWERUP_ORDER.filter(powerOn).map(t => `<span style="--c:${POWERUPS[t].color}">${POWERUPS[t].icon} ${POWERUPS[t].name}${t === 'bubble' ? ' ×' + bubbleHits : ''} <b>${Math.max(0, power[t] - time).toFixed(1)}</b></span>`).join('');
    if (chips !== powerChipsHtml) { powerChipsHtml = chips; $('powerups').innerHTML = chips; }
    $('race-lives').textContent = '♥'.repeat(lives + (mode === 'respawning' ? 0 : 1));
    $('ufo-kills').textContent = `${String(ufoKills % BOSS_EVERY).padStart(2, '0')}/${BOSS_EVERY}`;
    document.body.classList.toggle('boss', !!boss);
    document.body.classList.toggle('hyper', hyper());
    if (hyper()) {
      $('hyper-time').textContent = hyperTime.toFixed(1); $('hyper-fill').style.width = (hyperTime / HYPER_TIME * 100) + '%';
      document.body.classList.toggle('hyper-ending', hyperTime < 3);
    } else document.body.classList.remove('hyper-ending');
    $('speed').textContent = String(Math.round(speed / 11.5)).padStart(3, '0');
    $('energy-fill').style.width = energy + '%'; $('energy-fill').style.background = energy < 20 ? '#ff4b85' : 'var(--acid)';
    $('shield-fill').style.width = shield + '%'; $('shield-fill').style.background = shield < 26 ? '#ff426e' : 'var(--cyan)';
    $('shield-text').textContent = Math.round(shield) + '%'; document.body.classList.toggle('critical', shield <= 25 && mode !== 'wrecked');
    $('energy-text').textContent = Math.round(energy) + '%'; $('position').textContent = String(rank).padStart(2, '0');
    $('laser-count').textContent = String(laserAmmo).padStart(2, '0');
    $('laser-fill').style.width = Math.min(100, (laserAmmo + laserCharge) / laserCap() * 100) + '%';
    document.body.classList.toggle('lasers-empty', laserAmmo === 0);
    $('lap').textContent = String(lap).padStart(2, '0'); $('timer').textContent = formatTime(elapsed);
    $('progress').style.width = Math.min(100, distance / (LENGTH * LAP_COUNT) * 100) + '%';
    const laserIncoming = enemyShots.some(shot => !shot.resolved && shot.impactAt - time < .55);
    const bombIncoming = bombs.some(bomb => !bomb.exploded && bomb.distance - (distance + 1050) < 4200);
    $('boost-label').textContent = jumpHeight > 80 ? 'AIRBORNE  /  TRAMPOLINE BOOST' : laserIncoming ? 'WARNING  /  RIVAL LASER LOCK' : bombIncoming ? 'UFO BOMB RUN  /  DODGE!' : boosting ? 'ϟ OVERDRIVE ENGAGED ϟ' : slip > .5 ? 'SLIPSTREAM  /  BOOST CHARGING' : energy < 20 ? 'LOW ENERGY / RECHARGING' : 'ANTI-GRAVITY DRIVE ONLINE';
    document.body.classList.toggle('air-raid', laserIncoming || bombIncoming);
    drawMap();
  }
  // ==== Invasion, boss chain, final fight flow and disco.
  // ===================== FINALE: the alien invasion after a first-place finish =====================
  // RACE AGAIN after winning triggers an alarm and a 10 s countdown; the screen shatters into space,
  // the player blasts a hole through a wall of aliens and kills the overlord (10 hits); then: disco.
  let invasionArmed = false, finale = null, alarmNodes = null;
  let endlessRun = false;
  const FINALE_COLS = 11, FINALE_ROWS = 4, FINAL_BOSS_HP = 10, COUNTDOWN_START = 1.2, COUNTDOWN_LEN = 10;
  const CRITTER_COLORS = ['#7dff3a', '#ff4eb8', '#4df8ff', '#ffb347'];
  function raceAgain() { if (invasionArmed) startInvasion(); else startRace(); }
  function clearFinale() {
    stopAlarm(); finale = null; invasionArmed = false;
    $('again').classList.remove('alarm'); document.body.classList.remove('final', 'alarm', 'disco');
  }
  function startAlarm() {
    if (!audioContext || muted || alarmNodes) return;
    try {
      const now = audioContext.currentTime, osc = audioContext.createOscillator(), lfo = audioContext.createOscillator();
      const depth = audioContext.createGain(), gain = audioContext.createGain(), filter = audioContext.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.value = 760; lfo.type = 'triangle'; lfo.frequency.value = .85; depth.gain.value = 300;
      lfo.connect(depth); depth.connect(osc.frequency); filter.type = 'lowpass'; filter.frequency.value = 2600;
      osc.connect(filter); filter.connect(gain); gain.connect(sfxBus || audioContext.destination);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.06, now + .25);
      osc.start(now); lfo.start(now); alarmNodes = { osc, lfo, gain };
    } catch { alarmNodes = null; }
  }
  function stopAlarm() {
    if (!alarmNodes) return;
    const { osc, lfo, gain } = alarmNodes; alarmNodes = null;
    try { const now = audioContext.currentTime; gain.gain.setTargetAtTime(0, now, .04); osc.stop(now + .3); lfo.stop(now + .3); } catch { /* already stopped */ }
  }
  function startInvasion() {
    invasionArmed = false; keys.clear(); resetGesture(); confetti = [];
    mode = 'invasion'; finale = { phase: 'alarm', started: time, lastCount: null, voiced: false, resultsHidden: false, cracks: null };
    audio.pause(); updateMusic(); $('again').classList.add('alarm'); shake = .6;
    startAlarm(); playToneSweep(980, 260, .45, 'square', .06);
  }
  function finaleSnapshot() {
    try {
      if (typeof document.createElement !== 'function' || !canvas.width) return null;
      const snap = document.createElement('canvas'); snap.width = canvas.width; snap.height = canvas.height;
      snap.getContext('2d').drawImage(canvas, 0, 0); return snap;
    } catch { return null; }
  }
  function shatterIntoSpace() {
    stopAlarm();
    const snap = finaleSnapshot(), cols = 6, rows = 5, pts = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      pts.push([W * i / cols + (edge ? 0 : (Math.random() - .5) * W / cols * .7), H * j / rows + (edge ? 0 : (Math.random() - .5) * H / rows * .7)]);
    }
    const P = (i, j) => pts[j * (cols + 1) + i], shards = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      for (const tri of [[P(i, j), P(i + 1, j), P(i + 1, j + 1)], [P(i, j), P(i + 1, j + 1), P(i, j + 1)]]) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const dx = cx - W / 2, dy = cy - H / 2, d = Math.hypot(dx, dy) || 1, speed = 250 + Math.random() * 750;
        shards.push({ tri, cx, cy, vx: dx / d * speed, vy: dy / d * speed - 220, vr: (Math.random() - .5) * 9 });
      }
    }
    screenFlash = 1; shake = 2.4;
    playNoiseBurst(1.1, .34, 9000, 2400); playNoiseBurst(1.7, .3, 1500, 50); playToneSweep(95, 24, 1.5, 'sawtooth', .18);
    startFinalFight({ snap, shards, at: time });
  }
  // ---------- boss chain: one more boss per difficulty step, each wave harder than the last
  const BOSS_TYPES = [
    { kind: 'overlord', name: 'ALIEN OVERLORD', attack: 'slime', color: '#7dff3a', blood: ['#7dff3a', '#3fc21f'], guts: ['#ff6fa8', '#b8417a'], splat: '#4fd31f', down: 'OVERLORD SPLATTERED!' },
    { kind: 'cyclops', name: 'CYCLOPS COMMANDER', attack: 'eyebeam', color: '#c38bff', blood: ['#b06bff', '#7a2fd0'], guts: ['#ffb0d8', '#d05a9a'], splat: '#8f45e0', down: 'CYCLOPS POPPED!' },
    { kind: 'maggot', name: 'MAGGOT QUEEN', attack: 'acid', color: '#f2e85a', blood: ['#e8e04a', '#b8b020'], guts: ['#ff8a6a', '#c9503a'], splat: '#cfc23a', down: 'MAGGOT SQUASHED!' },
    { kind: 'robot', name: 'ROBO-TYRANT', attack: 'missiles', color: '#ff3b3b', blood: ['#26262c', '#4a4a52'], guts: ['#9aa3b5', '#c8ced8'], splat: '#1d1d22', down: 'ROBOT SCRAPPED!' },
    { kind: 'spider', name: 'CRYSTAL SPIDER', attack: 'web', color: '#7dfcff', blood: ['#bff8ff', '#5fd8ff'], guts: ['#e6fbff', '#8fe9ff'], splat: '#7dd8f0', down: 'SPIDER SHATTERED!' },
    { kind: 'shark', name: 'WORMHOLE SHARK', attack: 'portal', color: '#ff6a3d', blood: ['#ff3b3b', '#b0102a'], guts: ['#ff8aa2', '#c4566f'], splat: '#c0142e', down: 'SHARK SPLATTERED!' },
  ];
  const finaleWaveCount = () => clamp((tracks[trackIndex].difficulty || 3) - 2, 1, 6);
  const startLives = () => Math.max(0, finaleWaveCount() + diff().lives);
  function waveConfig(n) {
    const type = BOSS_TYPES[n % BOSS_TYPES.length];
    return { type, name: type.name + (n >= BOSS_TYPES.length ? ` MK ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(8, Math.floor(n / BOSS_TYPES.length) - 1)]}` : ''), hp: FINAL_BOSS_HP + n * 4, rows: Math.min(6, FINALE_ROWS + Math.floor(n / 2)),
      formVx: .09 + n * .035, rowSwing: n >= 2 ? .55 + n * .15 : 0, bossV: .38 + n * .07,
      invaderEvery: Math.max(.32, .75 - n * .08), bossEvery: Math.max(1.05, 1.8 - n * .13) };
  }
  function startWave(n) {
    const f = finale, cfg = waveConfig(n), invaders = [];
    for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < FINALE_COLS; c++) invaders.push({ r, c, alive: true, seed: r * 31 + c * 7 + n * 101 });
    Object.assign(f, { phase: 'fight', wave: n, cfg, invaders, formX: 0, formVx: cfg.formVx, rowPhase: 0, rowSwing: cfg.rowSwing,
      boss: { off: 0, v: cfg.bossV, hp: cfg.hp, maxHp: cfg.hp, flash: 0, arrive: time }, bolts: [], waveStarted: time,
      nextInvaderShot: time + 2.6, nextBossShot: time + 3.6 });
    if (n > 0) {
      showCallout(f.endless ? `WAVE ${n + 1}: ${cfg.name}!` : `BOSS ${n + 1}/${f.waves}: ${cfg.name}!`, cfg.type.color);
      shield = Math.min(100, shield + 35);
      robotSay('Warning. Next boss approaching', 'next-boss');
      playToneSweep(300, 900, .5, 'square', .05); playToneSweep(40, 30, 1.6, 'sawtooth', .12);
    } else showCallout(f.endless ? 'ENDLESS BOSS RUSH — WAVE 1!' : f.waves > 1 ? `FINAL BOSS 1/${f.waves}!` : 'FINAL BOSS!', cfg.type.color);
  }
  function playDeathScream(kind) {
    robotSay('', `scream-${{ spider: 'cyclops', shark: 'overlord' }[kind] || kind}`);
    if (kind === 'spider') { playToneSweep(3200, 600, 1.4, 'triangle', .05); playNoiseBurst(1.2, .2, 9000, 3000); playToneSweep(4400, 2000, .6, 'sine', .04); return; }
    if (kind === 'shark') { playToneSweep(160, 30, 2.2, 'sawtooth', .12); playToneSweep(90, 20, 2.4, 'square', .07); playNoiseBurst(1.4, .2, 1200, 80); return; }
    if (kind === 'overlord') { playToneSweep(220, 40, 2.4, 'sawtooth', .09); playNoiseBurst(1.6, .14, 900, 60); }
    else if (kind === 'cyclops') { playToneSweep(1400, 300, 1.8, 'triangle', .07); playToneSweep(1700, 420, 1.6, 'sawtooth', .03); }
    else if (kind === 'maggot') { playToneSweep(2200, 900, 1.2, 'square', .03); playNoiseBurst(1.1, .18, 500, 120); playToneSweep(120, 30, 1.2, 'sine', .14); }
    else { playToneSweep(880, 40, 2.6, 'square', .06); playToneSweep(660, 25, 2.8, 'sawtooth', .05); playNoiseBurst(.6, .1, 9000, 2000); }
  }
  function bossAttack(L, shipPx) {
    const f = finale, mx = L.bossX, my = L.bossY + L.bs * .22, dx = shipPx - mx, dy = L.shipY - my, aim = Math.atan2(dy, dx), attack = f.cfg.type.attack;
    if (attack === 'web') {
      // A sticky web falls on the player's spot; caught ships are slowed for a while.
      f.bolts.push({ kind: 'web', x: shipPx + (Math.random() - .5) * L.ship, y: my, vx: 0, vy: H * .34, dmg: 6, r: L.ship * .9 });
      for (const s of [-1, 1]) f.bolts.push({ kind: 'shard', x: mx + s * L.bs * .3, y: my, vx: s * H * .12 + dx * .18, vy: H * .45, dmg: 7, color: '#bff8ff' });
      playToneSweep(2600, 1200, .3, 'triangle', .04); return;
    }
    if (attack === 'portal') {
      // The shark dives into a wormhole and bursts out under the player: a telegraphed bite from below.
      f.bolts.push({ kind: 'bite', x: shipPx, y: L.shipY, vx: 0, vy: 0, dmg: 16, warnUntil: time + 1, until: time + 1.45 });
      f.boss.hidden = time + 1.5;
      playToneSweep(400, 60, 1, 'sine', .08); playNoiseBurst(.9, .1, 300, 2000); return;
    }
    if (attack === 'eyebeam') {
      // Telegraphed death ray from the monocle eye straight down at the player's position.
      f.bolts.push({ kind: 'eyebeam', x: shipPx, y: L.shipY, vx: 0, vy: 0, dmg: 14, fromX: mx, fromY: L.bossY - L.bs * .03, warnUntil: time + .85, until: time + 1.35 });
      playToneSweep(500, 1400, .8, 'sawtooth', .04);
    } else if (attack === 'acid') {
      for (let i = -2; i <= 2; i++) { const a = aim + i * .22, sp = H * .38; f.bolts.push({ kind: 'acid', x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 8, color: '#e8e04a' }); }
      playNoiseBurst(.4, .09, 800, 150);
    } else if (attack === 'missiles') {
      for (let i = -1; i <= 1; i++) { const a = aim + i * .18, sp = H * .6, sx = mx + i * L.bs * .5; f.bolts.push({ kind: 'missile', x: sx, y: my + L.bs * .2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 9, color: '#ff3b3b' }); }
      playToneSweep(900, 200, .35, 'sawtooth', .05);
    } else {
      const sp = H * .42, d = Math.hypot(dx, dy) || 1;
      f.bolts.push({ kind: 'slime', x: mx, y: my, vx: dx / d * sp, vy: dy / d * sp, dmg: 12, color: '#9dff5a' });
      playNoiseBurst(.35, .08, 600, 120); playToneSweep(180, 60, .3, 'sine', .07);
    }
  }
  function startFinalFight(shatter) {
    mode = 'final'; shield = 100; keys.clear(); resetGesture(); calibrateTilt();
    ufos = []; ufoRespawns = []; bombs = []; crashingUfos = []; smoke = []; boss = null; bossAttacks = []; enemyShots = []; laserShots = []; callout = null;
    finale = { phase: 'fight', started: time, shatter, shipX: .5, cool: 0, wave: 0, waves: endlessRun ? Infinity : finaleWaveCount(), endless: endlessRun, cleared: 0, lives, invulnUntil: 0, beams: [], bolts: [], gore: [], splats: [], bursts: [], msg: null };
    startWave(0);
    $('results').classList.add('hidden'); $('hud').classList.add('hidden');
    document.body.classList.remove('paused', 'alarm', 'critical', 'boosting', 'hyper', 'boss', 'hinting');
    document.body.classList.add('final');
    try { audio.currentTime = 0; } catch { /* not seekable yet */ }
    playMusic();
  }
  function finaleLayout() {
    const cw = Math.min(W * .062, 56, H * .072), ch = cw * .74, width = FINALE_COLS * cw;
    const travel = Math.max(0, (W - width) / 2 - cw * .4);
    const left = W / 2 - width / 2 + finale.formX * travel, top = H * (H < 520 ? .38 : .4);
    const bs = Math.min(W * .24, H * .21), ship = Math.min(W * .075, H * .075, 70);
    const bossX = left + width / 2 + finale.boss.off * Math.max(0, width / 2 - bs * .45);
    // Later waves: rows slide independently (alternating directions), so holes drift apart.
    const swing = Math.sin(finale.rowPhase || 0) * cw * 1.6, rowLeft = r => left + (finale.rowSwing ? swing * (r % 2 ? -1 : 1) : 0);
    const descend = Math.pow(1 - clamp((time - (finale.boss.arrive || 0)) / 1.4, 0, 1), 2) * H * .55;
    return { cw, ch, width, left, rowLeft, top, bs, bossX, bossY: top - bs * .55 - descend, ship, shipY: H - (H < 520 ? 70 : 112) };
  }
  function finaleMsg(text) { finale.msg = { text, at: time }; }
  // The player's ship goes out with a huge, layered blast and flying hull debris.
  function explodeShip(x, y, size) {
    const m = machines[shipIndex];
    megaBlasts.push({ x, y, started: time, duration: 2, color: '#ffec87', seed: 5, scale: 1.1 });
    megaBlasts.push({ x: x - size, y: y - size * .6, started: time + .15, duration: 1.6, color: m.color, seed: 9, scale: .7 });
    megaBlasts.push({ x: x + size, y: y - size * .3, started: time + .3, duration: 1.6, color: '#ff4eb8', seed: 21, scale: .7 });
    megaBlasts.push({ x, y: y - size * 1.4, started: time + .45, duration: 1.4, color: '#ff8a2e', seed: 33, scale: .5 });
    if (finale && finale.gore) for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, sp = 300 + Math.random() * 900;
      finale.gore.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 400, rot: Math.random() * TAU, vr: (Math.random() - .5) * 16, kind: 'gut', r: 3 + Math.random() * 6, color: i % 3 ? m.color : '#c8ced8', life: 2 + Math.random() * 1.5 });
    }
    shake = 3.6; screenFlash = 1;
    playExplosionSound(3); playToneSweep(90, 18, 2.2, 'sawtooth', .2); playNoiseBurst(2.4, .32, 2400, 40);
  }
  function frontInvader(c) { return finale.invaders.filter(v => v.alive && v.c === c).sort((a, b) => b.r - a.r)[0]; }
  const invaderX = (L, v) => L.rowLeft(v.r) + (v.c + .5) * L.cw;
  function finaleFire(L) {
    const f = finale, x = f.shipX * W, startY = L.shipY - L.ship * .8;
    f.cool = .24; playLaserSound();
    // The beam stops at the first (lowest) alien in its path: one shot, one alien.
    const target = f.invaders.filter(v => v.alive && Math.abs(invaderX(L, v) - x) < L.cw * .5).sort((a, b) => b.r - a.r)[0];
    if (target) {
      target.alive = false;
      const ty = L.top + (target.r + .5) * L.ch;
      f.beams.push({ x, y0: startY, y1: ty, at: time });
      f.bursts.push({ x: invaderX(L, target), y: ty, at: time, color: CRITTER_COLORS[target.r % 4], s: L.cw });
      playToneSweep(760, 110, .14, 'square', .05);
      return;
    }
    if (time - f.boss.arrive > 1.2 && !(f.boss.hidden > time) && Math.abs(x - L.bossX) < L.bs * .45) {
      const hitY = L.bossY + L.bs * .15;
      f.beams.push({ x, y0: startY, y1: hitY, at: time }); f.boss.hp--; f.boss.flash = 1; shake = Math.max(shake, .6);
      megaBlasts.push({ x, y: hitY, started: time, duration: .45, color: f.cfg.type.color, seed: Math.floor(Math.random() * 999), scale: .1 });
      for (let i = 0; i < 18; i++) spawnGore(x, hitY, 'blood', 380);
      playImpactSound(.9); playNoiseBurst(.3, .14, 900, 160);
      if (f.boss.hp <= 0) killOverlord(L); else finaleMsg(`${f.cfg.type.kind.toUpperCase()} HIT  /  ${f.boss.hp} TO GO`);
      return;
    }
    f.beams.push({ x, y0: startY, y1: -20, at: time });
  }
  function spawnGore(x, y, kind, power = 900) {
    const a = Math.random() * TAU, speed = (.25 + Math.random() * .75) * power;
    finale.gore.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - power * .35, rot: Math.random() * TAU, vr: (Math.random() - .5) * 12, kind,
      r: kind === 'gut' ? 7 + Math.random() * 9 : kind === 'eye' ? 6 + Math.random() * 6 : 2 + Math.random() * 6,
      color: kind === 'blood' ? finale.cfg.type.blood[Math.random() < .5 ? 0 : 1] : kind === 'gut' ? finale.cfg.type.guts[Math.random() < .5 ? 0 : 1] : '#fff6d8',
      life: 2.4 + Math.random() * 2 });
  }
  function killOverlord(L) {
    stat('bosses');
    addCredits(150 + finale.wave * 50, 'BOSS DOWN');
    const f = finale; f.phase = 'won'; f.wonAt = time; f.bolts = [];
    const x = L.bossX, y = L.bossY;
    for (let i = 0; i < 3; i++) megaBlasts.push({ x: x + (i - 1) * L.bs * .3, y: y + (i % 2) * L.bs * .2, started: time + i * .12, duration: 1.8, color: ['#7dff3a', '#ff4eb8', '#ffb347'][i], seed: 13 + i * 7 });
    for (let i = 0; i < 260; i++) spawnGore(x, y, i % 8 === 0 ? 'gut' : i % 29 === 0 ? 'eye' : 'blood', 1100);
    for (let i = 0; i < 16; i++) f.splats.push({ x: W * (.05 + Math.random() * .9), y: H * (.05 + Math.random() * .8), r: Math.min(W, H) * (.04 + Math.random() * .07), at: time + Math.random() * .4, seed: Math.random() * 1000, color: f.cfg.type.splat });
    for (const v of f.invaders) if (v.alive) { v.alive = false; f.bursts.push({ x: invaderX(L, v), y: L.top + (v.r + .5) * L.ch, at: time + Math.random() * .4, color: CRITTER_COLORS[v.r % 4], s: L.cw }); }
    shake = 3.2; screenFlash = 1;
    playExplosionSound(3); playToneSweep(70, 14, 2.2, 'sawtooth', .22); playNoiseBurst(2.4, .32, 700, 40); playToneSweep(260, 40, .9, 'sine', .16);
    showCallout(f.cfg.type.down, f.cfg.type.color); playDeathScream(f.cfg.type.kind);
    if (f.endless) { f.cleared = f.wave + 1; finaleMsg(`WAVE ${f.wave + 1} CLEARED  /  NEXT ONE INCOMING`); }
    else if (f.wave + 1 < f.waves) finaleMsg(`BOSS ${f.wave + 1}/${f.waves} DOWN  /  NEXT ONE INCOMING`);
  }
  function enterDisco() {
    unlockAchievement('galaxy'); if (finale.waves >= 6) unlockAchievement('galaxy6');
    const f = finale; f.phase = 'disco'; f.discoAt = time; f.gore = []; f.splats = []; f.bolts = []; f.beams = [];
    mode = 'disco'; document.body.classList.remove('final'); document.body.classList.add('disco', 'paused');
    robotSay('Congratulations, earthling', 'congratulations');
    launchConfetti(); playToneSweep(200, 1600, .8, 'sine', .06);
  }
  function showFinaleResults(won) {
    const f = finale; f.resultsShown = true;
    if (won) addCredits(300, 'GALAXY SAVED');
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
    $('result-eyebrow').textContent = won ? 'INTERGALACTIC CHAMPION / INVASION REPELLED' : 'GAME OVER / THE INVASION WON';
    $('result-title').textContent = won ? 'GALAXY SAVED.' : 'ABDUCTED.';
    $('result-position').textContent = '01';
    $('result-record').textContent = won ? 'The alien overlord is disco dust now. Dance on, pilot.' : 'The overlord survived. Win another race to face it again.';
    if (f.endless) {
      const best = profile.stats.endlessBest || 0, record = f.cleared > best;
      if (record) { profile.stats.endlessBest = f.cleared; saveProfile(); }
      $('result-eyebrow').textContent = 'ENDLESS BOSS RUSH / GAME OVER'; $('result-title').textContent = `${f.cleared} WAVE${f.cleared === 1 ? '' : 'S'}.`;
      $('result-position').textContent = String(f.cleared).padStart(2, '0');
      $('result-record').textContent = record ? `✦ NEW ENDLESS RECORD! (previous best: ${best})` : `Best so far: ${best} waves. One more try?`;
    }
    $('results').classList.remove('hidden'); document.body.classList.add('paused');
  }
  function updateFinale(dt) {
    const f = finale; if (!f) return;
    if (f.phase === 'alarm') {
      const e = time - f.started;
      shake = Math.max(shake, .35 + Math.pow(clamp(e / (COUNTDOWN_START + COUNTDOWN_LEN), 0, 1), 1.5) * 2.6);
      if (e > 1 && !f.resultsHidden) { f.resultsHidden = true; $('results').classList.add('hidden'); $('hud').classList.add('hidden'); $('countdown').textContent = ''; $('again').classList.remove('alarm'); document.body.classList.add('alarm'); }
      if (e > 1.3 && !f.voiced) { f.voiced = true; robotSay('Warning. Invasion incoming', 'invasion-incoming'); }
      const left = COUNTDOWN_START + COUNTDOWN_LEN - e, count = Math.ceil(left);
      if (e >= COUNTDOWN_START && count > 0 && count !== f.lastCount) { f.lastCount = count; const tone = count <= 3 ? 1480 : 920; playToneSweep(tone, tone, .18, 'square', .07); }
      if (left <= 0) shatterIntoSpace();
      return;
    }
    shake *= Math.pow(.03, dt); screenFlash = Math.max(0, screenFlash - dt * 1.6);
    f.beams = f.beams.filter(b => time - b.at < .15);
    f.bursts = f.bursts.filter(b => time - b.at < .55);
    megaBlasts = megaBlasts.filter(b => time - b.started < b.duration);
    for (const g of f.gore) {
      g.vy += 1100 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt; g.life -= dt;
      if (g.y > H - 8) { g.y = H - 8; g.vy *= -.22; g.vx *= .55; g.vr *= .5; }
    }
    f.gore = f.gore.filter(g => g.life > 0);
    if (f.phase === 'disco') { if (!f.resultsShown && time - f.discoAt > 3.4) showFinaleResults(true); return; }
    if (f.phase === 'won') { if (time - f.wonAt > 3.4) { if (f.endless || f.wave + 1 < f.waves) startWave(f.wave + 1); else enterDisco(); } return; }
    if (f.phase === 'lost') { if (!f.resultsShown && time - f.lostAt > 2.6) showFinaleResults(false); return; }
    if (f.phase === 'respawn') {
      // Continue exactly where the ship blew up: same wave, same wall, same boss health.
      if (time - f.lostAt > 2.6) {
        f.phase = 'fight'; shield = 100; f.invulnUntil = time + 2.5; f.shipX = .5; f.cool = 0;
        f.nextBossShot = Math.max(f.nextBossShot, time + 2); f.nextInvaderShot = Math.max(f.nextInvaderShot, time + 1.2);
        finaleMsg('BACK IN THE FIGHT!'); playToneSweep(300, 1200, .5, 'sine', .07);
      }
      return;
    }
    // --- fight
    const keySteer = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')) || padSteer;
    const steer = keySteer || (gyroActive() ? tiltSteer() : gesture.steer);
    f.shipX = clamp(f.shipX + steer * dt * .85 * (time < (f.webbedUntil || 0) ? .35 : 1), .05, .95);
    f.formX += f.formVx * dt; if (Math.abs(f.formX) > 1) { f.formX = Math.sign(f.formX); f.formVx *= -1; }
    f.rowPhase += f.rowSwing * dt;
    const b = f.boss; b.off += b.v * dt; if (Math.abs(b.off) > 1) { b.off = Math.sign(b.off); b.v *= -1; }
    b.flash = Math.max(0, b.flash - dt * 4); f.cool -= dt;
    const L = finaleLayout(), shipPx = f.shipX * W;
    const fire = keys.has('KeyX') || keys.has('KeyF') || keys.has('Space') || gesture.fire || gesture.fireQueued;
    if (fire && f.cool <= 0) { gesture.fireQueued = false; finaleFire(L); if (f.phase !== 'fight') return; }
    if (time >= f.nextInvaderShot) {
      const fronts = []; for (let c = 0; c < FINALE_COLS; c++) { const v = frontInvader(c); if (v) fronts.push(v); }
      if (fronts.length) {
        const v = fronts[Math.floor(Math.random() * fronts.length)];
        f.bolts.push({ kind: 'zap', x: invaderX(L, v), y: L.top + (v.r + 1) * L.ch, vx: 0, vy: H * (.5 + f.wave * .04), dmg: 7, color: CRITTER_COLORS[v.r % 4] });
        playToneSweep(420, 160, .12, 'square', .03);
      }
      f.nextInvaderShot = time + f.cfg.invaderEvery + Math.random() * .7;
    }
    if (time >= f.nextBossShot && time - f.boss.arrive > 1.4) {
      bossAttack(L, shipPx);
      f.nextBossShot = time + f.cfg.bossEvery + Math.random() * .9;
    }
    for (const bolt of f.bolts) {
      bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt;
      if (bolt.kind === 'bite') {
        if (time >= bolt.warnUntil && !bolt.fired) { bolt.fired = true; playToneSweep(90, 40, .4, 'sawtooth', .14); playNoiseBurst(.4, .2, 3000, 200); shake = Math.max(shake, 1.2); }
        if (bolt.fired && time < bolt.until && time > f.invulnUntil && Math.abs(bolt.x - shipPx) < L.ship * 1.1) {
          bolt.hit = true; shield = Math.max(0, shield - bolt.dmg * diff().dmg); screenFlash = Math.max(screenFlash, .4); playImpactSound(1.2); finaleMsg(`CHOMP!  SHIELD -${bolt.dmg}`);
        }
        continue;
      }
      if (bolt.kind === 'web' && time > f.invulnUntil && Math.abs(bolt.x - shipPx) < bolt.r && Math.abs(bolt.y - L.shipY) < L.ship * .6) {
        bolt.hit = true; f.webbedUntil = time + 2.2; shield = Math.max(0, shield - bolt.dmg * diff().dmg); playNoiseBurst(.3, .1, 2000, 400); finaleMsg('WEBBED!  SLOWED DOWN'); continue;
      }
      if (bolt.kind === 'eyebeam') {
        if (time >= bolt.warnUntil && !bolt.fired) { bolt.fired = true; playToneSweep(1800, 300, .5, 'sawtooth', .07); playNoiseBurst(.5, .12, 6000, 600); }
        if (bolt.fired && time < bolt.until && time > f.invulnUntil && Math.abs(bolt.x - shipPx) < L.ship * .75) {
          bolt.hit = true; shield = Math.max(0, shield - bolt.dmg * diff().dmg); shake = Math.max(shake, 1); screenFlash = Math.max(screenFlash, .35);
          playImpactSound(1); finaleMsg(`DEATH RAY!  SHIELD -${bolt.dmg}`);
        }
        continue;
      }
      if (time > f.invulnUntil && Math.abs(bolt.x - shipPx) < L.ship * .9 && Math.abs(bolt.y - L.shipY) < L.ship * .5) {
        bolt.hit = true; shield = Math.max(0, shield - bolt.dmg * diff().dmg); shake = Math.max(shake, .8); screenFlash = Math.max(screenFlash, .25);
        playImpactSound(.8); finaleMsg(`${{ slime: 'SLIMED!', acid: 'ACID BURN!', missile: 'MISSILE HIT!', shard: 'CRYSTAL SHARD!' }[bolt.kind] || 'ZAPPED!'}  SHIELD -${bolt.dmg}`);
      }
    }
    f.bolts = f.bolts.filter(bolt => bolt.kind === 'eyebeam' || bolt.kind === 'bite' ? !bolt.hit && time < bolt.until : !bolt.hit && bolt.y < H + 40 && bolt.x > -40 && bolt.x < W + 40);
    if (shield <= 0) {
      f.bolts = []; f.lostAt = time; explodeShip(shipPx, L.shipY, L.ship);
      if (f.lives > 0) { f.phase = 'respawn'; f.lives--; lives = f.lives; showCallout(`SHIP DESTROYED!  ${f.lives + 1} ${f.lives ? 'LIVES' : 'LIFE'} LEFT`, '#ff3b6b'); }
      else { f.phase = 'lost'; showCallout('SHIP DESTROYED!', '#ff3b6b'); }
    }
  }
  // ==== Boss and finale drawing.
  function drawJets(s, jx, jy, color, scale = 1) {
    for (const side of [-1, 1]) {
      const x = side * jx, flame = s * (.45 + Math.random() * .3) * scale;
      const g = ctx.createLinearGradient(0, jy, 0, jy + flame); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, color); g.addColorStop(.7, 'rgba(138,91,255,.5)'); g.addColorStop(1, 'rgba(138,91,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * .08 * scale, jy); ctx.lineTo(x + s * .08 * scale, jy); ctx.lineTo(x, jy + flame); ctx.fill();
      ctx.fillStyle = '#3b3550'; ctx.strokeStyle = '#9b8cff'; ctx.lineWidth = Math.max(1, s * .02); ctx.beginPath(); ctx.ellipse(x, jy - s * .06, s * .1 * scale, s * .13 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  function drawHitFlash(s, flash, rx = .55, ry = .45) {
    if (flash <= 0) return;
    ctx.globalAlpha = flash * .7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, s * rx, s * ry, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  // A one-eyed commander peering through a brass monocle (with a little top hat, of course).
  function drawCyclops(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    drawJets(s, s * .5, s * .3, '#ff9bf2', .9);
    for (let i = 0; i < 7; i++) { // tentacle beard
      const bx = (i - 3) * s * .09, ph = time * 2.6 + i;
      for (let k = 1; k <= 7; k++) { const t = k / 7, px = bx + Math.sin(ph + t * 3) * s * .07 * t, py = s * .3 + t * s * .38; ctx.fillStyle = k % 2 ? '#4a1d6e' : '#5c2688'; ctx.beginPath(); ctx.arc(px, py, s * .05 * (1 - t * .75), 0, TAU); ctx.fill(); }
    }
    const head = ctx.createRadialGradient(-s * .15, -s * .2, s * .05, 0, 0, s * .55); head.addColorStop(0, '#e2b8ff'); head.addColorStop(.5, '#8a45d0'); head.addColorStop(1, '#2a0d4a');
    ctx.fillStyle = head; ctx.shadowColor = '#c38bff'; ctx.shadowBlur = 28; ctx.beginPath(); ctx.ellipse(0, 0, s * .5, s * .44, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(40,0,60,.55)'; ctx.lineWidth = Math.max(1, s * .012);
    for (let w = 0; w < 4; w++) { ctx.beginPath(); ctx.arc(0, -s * .05, s * (.3 + w * .04), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.fillStyle = '#111'; ctx.fillRect(-s * .14, -s * .66, s * .28, s * .24); ctx.fillRect(-s * .22, -s * .44, s * .44, s * .05); // top hat
    ctx.fillStyle = '#ff4eb8'; ctx.fillRect(-s * .14, -s * .49, s * .28, s * .04);
    const er = s * .2, px = look * er * .35;
    ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(0, -s * .03, er, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(.7, s * .006);
    for (let v = 0; v < 7; v++) { const a = v * .9 + .2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * er, -s * .03 + Math.sin(a) * er); ctx.quadraticCurveTo(Math.cos(a + .2) * er * .7, -s * .03 + Math.sin(a + .2) * er * .7, Math.cos(a) * er * .5, -s * .03 + Math.sin(a) * er * .5); ctx.stroke(); }
    const iris = ctx.createRadialGradient(px, -s * .03, 1, px, -s * .03, er * .55); iris.addColorStop(0, '#ffd34d'); iris.addColorStop(1, '#d0400f');
    ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(px, -s * .03, er * .55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, -s * .03, er * .12, er * .45, 0, 0, TAU); ctx.fill();
    // the monocle: brass ring, crosshair, glint and chain
    const ring = ctx.createLinearGradient(-er, -er, er, er); ring.addColorStop(0, '#ffe08a'); ring.addColorStop(.5, '#c48a1a'); ring.addColorStop(1, '#7a520c');
    ctx.strokeStyle = ring; ctx.lineWidth = s * .045; ctx.beginPath(); ctx.arc(0, -s * .03, er * 1.18, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,40,40,.55)'; ctx.lineWidth = Math.max(.8, s * .006); line(-er, -s * .03, er, -s * .03, 'rgba(255,40,40,.55)', Math.max(.8, s * .006)); line(0, -s * .03 - er, 0, -s * .03 + er, 'rgba(255,40,40,.55)', Math.max(.8, s * .006));
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.arc(0, -s * .03, er * .9, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = '#d9a43a';
    for (let k = 0; k < 9; k++) { const t = k / 8; ctx.beginPath(); ctx.arc(er * 1.05 + t * s * .18, -s * .03 + er * .6 + Math.sin(t * Math.PI) * s * .12 + t * s * .12, s * .014, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2a0418'; ctx.beginPath(); ctx.ellipse(0, s * .27, s * .17, s * .05, 0, 0, TAU); ctx.fill(); // grin
    ctx.fillStyle = '#fff6d0'; for (let t = 0; t < 7; t++) { const tx = (t - 3) * s * .045; ctx.beginPath(); ctx.moveTo(tx - s * .015, s * .23); ctx.lineTo(tx + s * .015, s * .23); ctx.lineTo(tx, s * .27); ctx.fill(); }
    drawHitFlash(s, flash, .52, .46);
    ctx.restore();
  }
  // A pulsating larva with an exposed brain, a lamprey mouth, dozens of beady eyes, dripping pus and flies.
  function drawMaggot(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 4; i >= 0; i--) { // translucent segmented body
      const sy = s * (.36 - i * .02) - i * s * .02, sw = s * (.34 + i * .045) * (1 + Math.sin(time * 4 + i) * .04), sh = s * .14;
      ctx.fillStyle = i % 2 ? '#efd9a0' : '#f6e6b8'; ctx.beginPath(); ctx.ellipse(0, sy + i * s * .09, sw, sh, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,40,.5)'; ctx.lineWidth = Math.max(1, s * .01); ctx.stroke();
      ctx.fillStyle = 'rgba(90,50,30,.35)'; ctx.beginPath(); ctx.ellipse(Math.sin(time * 2 + i) * s * .06, sy + i * s * .09, sw * .4, sh * .45, 0, 0, TAU); ctx.fill();
    }
    const head = ctx.createRadialGradient(-s * .1, -s * .15, s * .04, 0, 0, s * .5); head.addColorStop(0, '#fff3c8'); head.addColorStop(.6, '#e6c47a'); head.addColorStop(1, '#8a6a2a');
    ctx.fillStyle = head; ctx.shadowColor = '#f2e85a'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(0, -s * .02, s * .42, s * .34, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff9fb8'; ctx.beginPath(); ctx.ellipse(0, -s * .28, s * .3, s * .17, 0, Math.PI, TAU); ctx.fill(); // exposed brain
    ctx.strokeStyle = '#c4566f'; ctx.lineWidth = Math.max(1, s * .012);
    for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let t = 0; t <= 10; t++) { const bx = -s * .26 + t / 10 * s * .52, by = -s * .3 - k * s * .02 + Math.sin(t * 2.2 + k + time * 3) * s * .015; if (t) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); } ctx.stroke(); }
    const mr = s * .17, mx = look * s * .03, my = s * .06; // lamprey mouth with rotating rings of teeth
    ctx.fillStyle = '#5a0614'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.arc(mx, my, mr * .35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2c8';
    for (let ringN = 0; ringN < 3; ringN++) {
      const rr = mr * (.92 - ringN * .22), n = 14 - ringN * 3, rot = time * (ringN % 2 ? -1.5 : 1.2);
      for (let t = 0; t < n; t++) { const a = t / n * TAU + rot; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a - .12) * rr, my + Math.sin(a - .12) * rr); ctx.lineTo(mx + Math.cos(a + .12) * rr, my + Math.sin(a + .12) * rr); ctx.lineTo(mx + Math.cos(a) * rr * .72, my + Math.sin(a) * rr * .72); ctx.fill(); }
    }
    for (let e = 0; e < 14; e++) { // beady eyes
      const a = Math.PI * (1.05 + e / 13 * .9), d = s * (.27 + (e % 3) * .035), ex = Math.cos(a) * d * 1.2, ey = Math.sin(a) * d * .55 - s * .02;
      ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(ex, ey, s * (.018 + (e % 3) * .006), 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - s * .005, ey - s * .006, s * .005, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#e6f04a'; // pustules and pus drips
    for (let p = 0; p < 6; p++) { const a = random(p + 300) * TAU, r = s * (.15 + random(p + 310) * .2); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .7, s * (.02 + random(p + 320) * .02), 0, TAU); ctx.fill(); }
    for (let d = 0; d < 4; d++) { const dx = (d - 1.5) * s * .14, ph = mod(time * .9 + d * .27, 1), dy = s * (.2 + ph * .55); ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(dx, dy, s * .018, s * .03, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (let fl = 0; fl < 6; fl++) { // flies
      const a = time * (3 + fl * .4) + fl * 1.1, fx = Math.cos(a) * s * (.55 + fl * .03), fy = Math.sin(a * 1.3) * s * .35 - s * .1;
      ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.beginPath(); ctx.ellipse(fx - s * .012, fy - s * .012, s * .014, s * .008, -.5, 0, TAU); ctx.ellipse(fx + s * .012, fy - s * .012, s * .014, s * .008, .5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(fx, fy, s * .012, 0, TAU); ctx.fill();
    }
    drawHitFlash(s, flash, .46, .5);
    ctx.restore();
  }
  // A chrome war machine: plated skull, scanning red visor, grille jaw, cannon arms and big thrusters.
  function drawRobot(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    drawJets(s, s * .32, s * .38, '#7dfcff', 1.25);
    for (const side of [-1, 1]) { // cannon arms
      ctx.save(); ctx.translate(side * s * .52, s * .02); ctx.rotate(side * (.25 + Math.sin(time * 1.5) * .08));
      ctx.fillStyle = '#6b7385'; ctx.fillRect(-s * .06, -s * .05, s * .12, s * .36);
      ctx.fillStyle = '#2b2f3a'; ctx.fillRect(-s * .045, s * .3, s * .09, s * .14);
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(0, s * .44, s * .03 + Math.abs(Math.sin(time * 6)) * s * .01, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c8ced8'; ctx.lineWidth = Math.max(1, s * .012); ctx.beginPath(); ctx.arc(0, 0, s * .07, time * 3, time * 3 + 4.5); ctx.stroke();
      ctx.restore();
    }
    const plate = ctx.createLinearGradient(0, -s * .45, 0, s * .35); plate.addColorStop(0, '#e6ebf2'); plate.addColorStop(.5, '#8a93a6'); plate.addColorStop(1, '#3d4352');
    ctx.fillStyle = plate; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(-s * .38, -s * .3); ctx.lineTo(-s * .26, -s * .44); ctx.lineTo(s * .26, -s * .44); ctx.lineTo(s * .38, -s * .3); ctx.lineTo(s * .42, s * .14); ctx.lineTo(s * .24, s * .34); ctx.lineTo(-s * .24, s * .34); ctx.lineTo(-s * .42, s * .14); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(30,34,44,.7)'; ctx.lineWidth = Math.max(1, s * .01);
    line(-s * .4, -s * .1, s * .4, -s * .1, 'rgba(30,34,44,.7)', Math.max(1, s * .01)); line(0, -s * .44, 0, -s * .2, 'rgba(30,34,44,.7)', Math.max(1, s * .01));
    ctx.fillStyle = '#3d4352';
    for (const [rx, ry] of [[-.32, -.26], [.32, -.26], [-.36, .1], [.36, .1], [-.2, .28], [.2, .28]]) { ctx.beginPath(); ctx.arc(rx * s, ry * s, s * .016, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#1a0006'; ctx.fillRect(-s * .32, -s * .2, s * .64, s * .12); // visor
    const scan = Math.sin(time * 2.5) * .5 + .5, vg = ctx.createLinearGradient(-s * .32, 0, s * .32, 0);
    vg.addColorStop(0, '#5a0010'); vg.addColorStop(clamp(scan - .15, 0, 1), '#ff2030'); vg.addColorStop(clamp(scan, 0, 1), '#ffffff'); vg.addColorStop(clamp(scan + .15, 0, 1), '#ff2030'); vg.addColorStop(1, '#5a0010');
    ctx.fillStyle = vg; ctx.shadowColor = '#ff2030'; ctx.shadowBlur = 18; ctx.fillRect(-s * .3, -s * .18, s * .6, s * .08); ctx.shadowBlur = 0;
    for (const side of [-1, 1]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * s * .14 + look * s * .05, -s * .14, s * .025, 0, TAU); ctx.fill(); }
    const open = Math.max(0, Math.sin(time * 3)) * s * .05; // grille jaw
    ctx.fillStyle = '#20232c'; ctx.fillRect(-s * .2, s * .06 + open * .3, s * .4, s * .16 + open);
    ctx.fillStyle = '#c8ced8'; for (let b = 0; b < 7; b++) ctx.fillRect(-s * .18 + b * s * .06, s * .08 + open * .3, s * .025, s * .12 + open);
    line(0, -s * .44, 0, -s * .62, '#c8ced8', Math.max(1, s * .015)); // antenna
    ctx.fillStyle = Math.sin(time * 8) > 0 ? '#ff2030' : '#5a0010'; ctx.beginPath(); ctx.arc(0, -s * .64, s * .03, 0, TAU); ctx.fill();
    drawHitFlash(s, flash, .44, .42);
    ctx.restore();
  }
  // A faceted ice-crystal spider: prism body, eight jointed legs, a cluster of glowing eyes and dripping fangs.
  function drawSpider(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { // legs
      const base = -.3 + i * .2, swing = Math.sin(time * 4 + i + (side > 0 ? 1.5 : 0)) * .12;
      const kx = side * s * (.45 + i * .04), ky = s * (base - .25 + swing), fx = side * s * (.72 + i * .02), fy = s * (base + .35 + swing * .5);
      ctx.strokeStyle = '#2b4d6b'; ctx.lineWidth = s * .05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(side * s * .18, s * base * .6); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#9ff4ff'; ctx.lineWidth = s * .018; ctx.stroke();
      ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + side * s * .03, fy + s * .1); ctx.lineTo(fx - side * s * .02, fy + s * .02); ctx.fill();
    }
    const facets = [[-.32, 0], [-.18, -.28], [.18, -.28], [.32, 0], [.18, .3], [-.18, .3]];
    ctx.shadowColor = '#7dfcff'; ctx.shadowBlur = 28;
    for (let k = 0; k < 6; k++) { // abdomen made of crystal facets
      const [ax, ay] = facets[k], [bx, by] = facets[(k + 1) % 6];
      ctx.fillStyle = `hsla(${190 + k * 8},90%,${55 + (k % 3) * 12}%,.9)`; ctx.beginPath(); ctx.moveTo(0, s * .02); ctx.lineTo(ax * s, ay * s); ctx.lineTo(bx * s, by * s); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, s * .008);
    ctx.beginPath(); facets.forEach(([fx, fy], k) => ctx[k ? 'lineTo' : 'moveTo'](fx * s, fy * s)); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#132a3d'; ctx.beginPath(); ctx.ellipse(0, s * .38, s * .2, s * .14, 0, 0, TAU); ctx.fill(); // head
    for (let e = 0; e < 8; e++) { // eye cluster
      const ex = (e % 4 - 1.5) * s * .07, ey = s * (.33 + Math.floor(e / 4) * .07), er = s * (e % 4 === 1 || e % 4 === 2 ? .035 : .022);
      ctx.fillStyle = '#ff2a5a'; ctx.shadowColor = '#ff2a5a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(ex + look * s * .01, ey, er, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const side of [-1, 1]) { // fangs with dripping venom
      ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.moveTo(side * s * .06, s * .48); ctx.lineTo(side * s * .1, s * .62); ctx.lineTo(side * s * .02, s * .5); ctx.fill();
      const drip = mod(time * .8 + (side > 0 ? .5 : 0), 1); ctx.fillStyle = '#9dff5a'; ctx.globalAlpha = 1 - drip; ctx.beginPath(); ctx.arc(side * s * .09, s * (.63 + drip * .3), s * .015, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    drawHitFlash(s, flash, .4, .45);
    ctx.restore();
  }
  // A space shark that swims through wormholes: gills, rows of teeth, a dead eye and jet fins.
  function drawShark(x, y, s, flash, look, attacking = false) {
    ctx.save(); ctx.translate(x, y); if (attacking) ctx.rotate(-Math.PI / 2);
    if (!attacking) { // swirling wormhole behind it
      for (let r = 4; r > 0; r--) { ctx.strokeStyle = `hsla(${(time * 120 + r * 50) % 360},100%,60%,${.12 + r * .05})`; ctx.lineWidth = s * .03; ctx.beginPath(); ctx.ellipse(0, 0, s * (.45 + r * .14), s * (.2 + r * .07), time * (r % 2 ? 1 : -1) * .7, 0, TAU); ctx.stroke(); }
      drawJets(s, s * .38, s * .2, '#ffb347', .8);
    }
    const wag = Math.sin(time * 5) * .12;
    ctx.fillStyle = '#4a5a72'; ctx.beginPath(); ctx.moveTo(s * .45, 0); ctx.lineTo(s * .75, -s * .22 + wag * s); ctx.lineTo(s * .66, 0); ctx.lineTo(s * .75, s * .2 + wag * s); ctx.closePath(); ctx.fill(); // tail
    ctx.beginPath(); ctx.moveTo(-s * .02, -s * .14); ctx.lineTo(s * .12, -s * .42); ctx.lineTo(s * .2, -s * .14); ctx.fill(); // dorsal fin
    const body = ctx.createLinearGradient(0, -s * .2, 0, s * .2); body.addColorStop(0, '#7b8ca8'); body.addColorStop(.55, '#4a5a72'); body.addColorStop(.56, '#e9edf2'); body.addColorStop(1, '#c9d0da');
    ctx.fillStyle = body; ctx.shadowColor = '#ff6a3d'; ctx.shadowBlur = attacking ? 0 : 24;
    ctx.beginPath(); ctx.moveTo(-s * .55, s * .02); ctx.quadraticCurveTo(-s * .4, -s * .22, s * .1, -s * .17); ctx.quadraticCurveTo(s * .45, -s * .12, s * .5, 0); ctx.quadraticCurveTo(s * .4, s * .16, 0, s * .18); ctx.quadraticCurveTo(-s * .45, s * .2, -s * .55, s * .02); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2b3445'; ctx.lineWidth = Math.max(1, s * .012); for (let gl = 0; gl < 4; gl++) { ctx.beginPath(); ctx.moveTo(-s * (.18 - gl * .05), -s * .08); ctx.quadraticCurveTo(-s * (.21 - gl * .05), 0, -s * (.18 - gl * .05), s * .08); ctx.stroke(); }
    const open = attacking ? .9 : .4 + Math.sin(time * 3) * .3; // jaws
    ctx.fillStyle = '#5a0614'; ctx.beginPath(); ctx.moveTo(-s * .55, s * .02); ctx.lineTo(-s * .3, -s * .02); ctx.lineTo(-s * .3, s * (.05 + open * .12)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffbe6'; for (let t = 0; t < 6; t++) { const tx = -s * (.52 - t * .04); ctx.beginPath(); ctx.moveTo(tx, s * .0); ctx.lineTo(tx + s * .02, s * .0); ctx.lineTo(tx + s * .01, s * .045); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx, s * (.05 + open * .1)); ctx.lineTo(tx + s * .02, s * (.05 + open * .1)); ctx.lineTo(tx + s * .01, s * (.01 + open * .1)); ctx.fill(); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-s * .36 + look * s * .005, -s * .06, s * .035, 0, TAU); ctx.fill(); // dead eye
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(-s * .365, -s * .065, s * .01, 0, TAU); ctx.fill();
    if (!attacking) drawHitFlash(s, flash, .55, .25);
    ctx.restore();
  }
  function drawFinalBoss(L, look) {
    const f = finale, kind = f.cfg.type.kind, y = L.bossY;
    if (kind === 'cyclops') drawCyclops(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'maggot') drawMaggot(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'robot') drawRobot(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'spider') drawSpider(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'shark') drawShark(L.bossX, y, L.bs, f.boss.flash, look);
    else drawOverlord(L.bossX, y, L.bs, f.boss.flash, look);
  }
  // ---------- finale drawing
  function drawSpace() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05010f'); g.addColorStop(.6, '#13062b'); g.addColorStop(1, '#030008');
    ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const nx = W * (.15 + random(i + 500) * .7), ny = H * (.12 + random(i + 510) * .5), nr = Math.max(W, H) * (.25 + random(i + 520) * .2);
      const neb = ctx.createRadialGradient(nx, ny, 1, nx, ny, nr); neb.addColorStop(0, `hsla(${[280, 140, 320, 190][i]},90%,45%,.26)`); neb.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = neb; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    for (let i = 0; i < 150; i++) {
      const speed = .05 + random(i + 600) * .3, x = random(i + 610) * W, y = mod(random(i + 620) * H + time * H * speed, H);
      ctx.globalAlpha = .35 + random(i + 630) * .65; line(x, y, x, y + 2 + speed * 34, i % 5 ? '#cfe8ff' : '#ffb5f9', speed > .22 ? 2 : 1);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawCritter(x, y, s, color, look, wob) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, s * .07);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * .18, s * .12); ctx.quadraticCurveTo(i * s * .3 + Math.sin(wob + i) * s * .12, s * .28, i * s * .22 + Math.sin(wob * 1.3 + i * 2) * s * .1, s * .36); ctx.stroke(); }
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * s * .12, -s * .16); ctx.lineTo(side * s * .24, -s * .32 + Math.sin(wob * 2 + side) * s * .03); ctx.stroke(); ctx.beginPath(); ctx.arc(side * s * .24, -s * .32, s * .05, 0, TAU); ctx.fill(); }
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(0, 0, s * .36, s * .23, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -s * .02, s * .13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120018'; ctx.beginPath(); ctx.arc(look * s * .05, -s * .01, s * .06, 0, TAU); ctx.fill();
    ctx.fillRect(-s * .13, s * .12, s * .26, s * .035);
    ctx.restore();
  }
  function drawOverlord(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (const side of [-1, 1]) { // rocket jets
      const jx = side * s * .6, jy = s * .14, flame = s * (.5 + Math.random() * .3);
      const g = ctx.createLinearGradient(0, jy, 0, jy + flame); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, '#7dfcff'); g.addColorStop(.7, 'rgba(138,91,255,.55)'); g.addColorStop(1, 'rgba(138,91,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(jx - s * .08, jy); ctx.lineTo(jx + s * .08, jy); ctx.lineTo(jx, jy + flame); ctx.fill();
      ctx.fillStyle = '#3b3550'; ctx.strokeStyle = '#9b8cff'; ctx.lineWidth = Math.max(1, s * .02); ctx.beginPath(); ctx.ellipse(jx, jy - s * .07, s * .11, s * .15, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) { // tentacles
      const baseX = (i - 3.5) * s * .12, phase = time * 2.3 + i * .9, len = s * (.7 + (i % 3) * .14);
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, px = baseX + Math.sin(phase + t * 4) * s * .15 * t + (i - 3.5) * s * .05 * t, py = s * .22 + t * len;
        ctx.fillStyle = k % 2 ? '#7a2a63' : '#93367a'; ctx.beginPath(); ctx.arc(px, py, s * .065 * (1 - t * .8), 0, TAU); ctx.fill();
        if (k % 2 === 0 && k < 11) { ctx.fillStyle = '#f7a8d4'; ctx.beginPath(); ctx.arc(px + s * .028 * (1 - t), py, s * .016 * (1 - t * .6), 0, TAU); ctx.fill(); }
      }
    }
    ctx.beginPath(); // lumpy body
    for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, r = s * .5 * (1 + .07 * Math.sin(5 * a + time * 2) + .05 * Math.sin(9 * a - time * 3)); const px = Math.cos(a) * r, py = Math.sin(a) * r * .8; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath();
    const body = ctx.createRadialGradient(-s * .15, -s * .2, s * .05, 0, 0, s * .6); body.addColorStop(0, '#c9ff7a'); body.addColorStop(.45, '#5fae2a'); body.addColorStop(1, '#1d3a10');
    ctx.fillStyle = body; ctx.shadowColor = '#7dff3a'; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#4b1a4a'; ctx.lineWidth = Math.max(1, s * .012);
    for (let v = 0; v < 6; v++) { const a = v / 6 * TAU + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .15, Math.sin(a) * s * .12); ctx.quadraticCurveTo(Math.cos(a + .4) * s * .3, Math.sin(a + .4) * s * .25, Math.cos(a + .1) * s * .45, Math.sin(a + .1) * s * .36); ctx.stroke(); }
    for (let p = 0; p < 8; p++) { const a = random(p + 70) * TAU, r = s * (.2 + random(p + 80) * .24); ctx.fillStyle = '#e9ff9a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .78, s * (.02 + random(p + 90) * .025), 0, TAU); ctx.fill(); }
    const open = .5 + .5 * Math.sin(time * 3), mh = s * (.06 + open * .07), my = s * .2; // mouth with fangs and drool
    ctx.fillStyle = '#2a0418'; ctx.beginPath(); ctx.ellipse(0, my, s * .26, mh, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6d0';
    for (let t = 0; t < 9; t++) {
      const tx = (t - 4) * s * .055;
      ctx.beginPath(); ctx.moveTo(tx - s * .02, my - mh * .85); ctx.lineTo(tx + s * .02, my - mh * .85); ctx.lineTo(tx, my - s * .005); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - s * .02, my + mh * .85); ctx.lineTo(tx + s * .02, my + mh * .85); ctx.lineTo(tx, my + s * .005); ctx.fill();
    }
    ctx.strokeStyle = '#9dff5a'; ctx.fillStyle = '#9dff5a'; ctx.lineWidth = Math.max(1, s * .014);
    for (let d = 0; d < 3; d++) { const dx = (d - 1) * s * .12, dl = s * (.1 + (Math.sin(time * 1.7 + d * 2) * .5 + .5) * .26), ex = dx + Math.sin(time * 2 + d) * s * .02; ctx.beginPath(); ctx.moveTo(dx, my + mh * .7); ctx.lineTo(ex, my + dl); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, my + dl, s * .018, 0, TAU); ctx.fill(); }
    [[-.24, -.16, .11], [.22, -.18, .13], [0, -.31, .08], [-.05, -.05, .055], [.36, 0, .06], [-.38, .02, .05]].forEach(([ex, ey, er], i) => {
      const blink = Math.sin(time * 1.3 + i * 1.7) > .97 ? .15 : 1, R = er * s;
      ctx.save(); ctx.translate(ex * s, ey * s); ctx.scale(1, blink);
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(.6, s * .006);
      for (let v = 0; v < 4; v++) { const a = v * 1.7 + i; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * R * .5, Math.sin(a) * R * .5); ctx.stroke(); }
      ctx.fillStyle = '#d01818'; ctx.beginPath(); ctx.arc(look * R * .35, 0, R * .5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(look * R * .35, 0, R * .12, R * .42, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (flash > 0) { ctx.globalAlpha = flash * .7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, s * .55, s * .45, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawGoreAndSplats() {
    const f = finale;
    for (const g of f.gore) {
      ctx.save(); ctx.globalAlpha = clamp(g.life, 0, 1); ctx.translate(g.x, g.y);
      if (g.kind === 'blood') { ctx.rotate(Math.atan2(g.vy, g.vx)); ctx.fillStyle = g.color; ctx.beginPath(); ctx.ellipse(0, 0, g.r * (1 + Math.min(2.2, Math.hypot(g.vx, g.vy) / 420)), g.r, 0, 0, TAU); ctx.fill(); }
      else if (g.kind === 'gut') {
        ctx.rotate(g.rot); ctx.lineCap = 'round'; ctx.strokeStyle = g.color; ctx.lineWidth = g.r;
        ctx.beginPath(); ctx.moveTo(-g.r * 1.6, 0); ctx.bezierCurveTo(-g.r * .5, -g.r * 1.2, g.r * .5, g.r * 1.2, g.r * 1.6, 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,235,.45)'; ctx.lineWidth = g.r * .3; ctx.stroke();
      } else {
        ctx.rotate(g.rot); ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d01818'; ctx.beginPath(); ctx.arc(g.r * .25, 0, g.r * .5, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(g.r * .3, 0, g.r * .2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    for (const sp of f.splats) { // alien blood on the "glass", dripping down
      const age = time - sp.at; if (age < 0) continue;
      ctx.save(); ctx.globalAlpha = clamp(Math.min(age * 6, (6.5 - age) / 1.5), 0, .82); ctx.fillStyle = sp.color || '#4fd31f';
      const grow = Math.min(1, age * 5); ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * grow, 0, TAU); ctx.fill();
      for (let i = 0; i < 9; i++) { const a = random(sp.seed + i) * TAU, d = sp.r * (1 + random(sp.seed + i + 20) * .9) * grow; ctx.beginPath(); ctx.arc(sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, sp.r * (.12 + random(sp.seed + i + 40) * .2), 0, TAU); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const dx = (random(sp.seed + i + 60) - .5) * sp.r * 1.4, len = sp.r * Math.min(3.2, age * (.4 + random(sp.seed + i + 70) * .6)), w = sp.r * .14; ctx.fillRect(sp.x + dx - w / 2, sp.y, w, len); ctx.beginPath(); ctx.arc(sp.x + dx, sp.y + len, w * .9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(220,255,190,.35)'; ctx.beginPath(); ctx.arc(sp.x - sp.r * .3, sp.y - sp.r * .3, sp.r * .25 * grow, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function drawShards() {
    const s = finale.shatter; if (!s) return;
    const t = time - s.at; if (t > 2 || !s.snap) { if (t > 2) finale.shatter = null; return; }
    ctx.save(); ctx.globalAlpha = clamp(2 - t, 0, 1);
    for (const sh of s.shards) {
      ctx.save(); ctx.translate(sh.cx + sh.vx * t, sh.cy + sh.vy * t + 520 * t * t); ctx.rotate(sh.vr * t); ctx.translate(-sh.cx, -sh.cy);
      ctx.beginPath(); ctx.moveTo(sh.tri[0][0], sh.tri[0][1]); ctx.lineTo(sh.tri[1][0], sh.tri[1][1]); ctx.lineTo(sh.tri[2][0], sh.tri[2][1]); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(s.snap, 0, 0, W, H); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawFinaleHud(L) {
    const f = finale, small = H < 520, mono = `'Share Tech Mono', monospace`;
    ctx.save(); ctx.textBaseline = 'middle';
    const bw = Math.min(W * .5, 420), bx = W / 2 - bw / 2, by = small ? 60 : 96;
    ctx.font = `${small ? 11 : 12}px ${mono}`; ctx.textAlign = 'center'; ctx.fillStyle = '#b9ff7a';
    ctx.fillStyle = f.cfg.type.color;
    ctx.fillText(`☣ ${f.cfg.name}  ${Math.max(0, f.boss.hp)}/${f.boss.maxHp}${f.endless ? `   ·   WAVE ${f.wave + 1}  ·  BEST ${profile.stats.endlessBest || 0}` : f.waves > 1 ? `   ·   BOSS ${f.wave + 1}/${f.waves}` : ''}`, W / 2, by - 9, W * .94);
    for (let i = 0; i < f.boss.maxHp; i++) { const sw = bw / f.boss.maxHp; ctx.fillStyle = i < f.boss.hp ? f.cfg.type.color : 'rgba(255,255,255,.14)'; ctx.fillRect(bx + i * sw + (sw > 6 ? 1 : 0), by, sw - (sw > 6 ? 2 : 0), 7); }
    const sw = Math.min(W * .32, 220), sx = Math.max(16, W * .03), sy = H - (small ? 58 : 92), alive = f.invaders.filter(v => v.alive).length;
    ctx.textAlign = 'left'; ctx.fillStyle = '#c3b6d3'; ctx.fillText('HULL SHIELD', sx, sy - 9);
    ctx.fillStyle = '#ff6a8a'; ctx.fillText(`LIVES ${'♥'.repeat(f.lives + (f.phase === 'respawn' || f.phase === 'lost' ? 0 : 1)) || '—'}`, sx, sy + 18);
    ctx.textAlign = 'right'; ctx.fillText(Math.max(0, Math.round(shield)) + '%', sx + sw, sy - 9);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(sx, sy, sw, 6); ctx.fillStyle = shield < 26 ? '#ff426e' : '#4df8ff'; ctx.fillRect(sx, sy, sw * clamp(shield / 100, 0, 1), 6);
    ctx.fillStyle = '#ff8fd0'; ctx.fillText(`ALIEN WALL ${alive}/${f.invaders.length}`, W - Math.max(16, W * .03), sy - 9);
    if (f.phase === 'fight' && time - f.started < 6) {
      ctx.globalAlpha = clamp(6 - (time - f.started), 0, 1); ctx.textAlign = 'center'; ctx.font = `${small ? 11 : 13}px ${mono}`; ctx.fillStyle = '#ddff46';
      ctx.fillText('◀ ▶ MOVE  ·  FIRE: BLAST A HOLE IN THE WALL, THEN HIT THE OVERLORD', W / 2, L.top + FINALE_ROWS * L.ch + (L.shipY - L.top - FINALE_ROWS * L.ch) * .45, W * .92);
      ctx.globalAlpha = 1;
    }
    if (f.msg && time - f.msg.at < 1.1) {
      ctx.globalAlpha = clamp(1.1 - (time - f.msg.at), 0, 1); ctx.textAlign = 'center'; ctx.font = `italic 800 ${small ? 18 : 26}px 'Barlow Condensed', Impact, sans-serif`;
      ctx.fillStyle = '#ddff46'; ctx.shadowColor = '#7dff3a'; ctx.shadowBlur = 16; ctx.fillText(f.msg.text, W / 2, L.shipY - L.ship * 1.9, W * .9);
    }
    ctx.restore();
  }
  function drawAlarm() {
    const f = finale, e = time - f.started, total = COUNTDOWN_START + COUNTDOWN_LEN, k = clamp(e / total, 0, 1);
    ctx.save();
    const pulse = Math.pow(Math.abs(Math.sin(time * Math.PI * 1.7)), 2);
    ctx.fillStyle = `rgba(255,20,45,${.1 + pulse * (.16 + k * .24)})`; ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.globalCompositeOperation = 'lighter';
    for (const [ox, oy, dir] of [[W * .08, H * .12, 1], [W * .92, H * .12, -1], [W * .5, H * .02, 1]]) {
      const len = Math.max(W, H) * 1.5;
      for (const off of [0, Math.PI]) {
        const a = time * 3.4 * dir + off, g = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
        g.addColorStop(0, 'rgba(255,70,70,.6)'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, a - .2, a + .2); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ff3040'; ctx.beginPath(); ctx.arc(ox, oy, 12, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const left = total - e;
    if (left < 3.2) { // the screen starts to crack
      if (!f.cracks) { f.cracks = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + Math.random() * .3, pts = [[W / 2, H / 2]]; let r = 0; while (r < Math.max(W, H)) { r += 40 + Math.random() * 90; pts.push([W / 2 + Math.cos(a + (Math.random() - .5) * .25) * r, H / 2 + Math.sin(a + (Math.random() - .5) * .25) * r]); } f.cracks.push(pts); } }
      const grow = clamp((3.2 - left) / 3.2, 0, 1);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
      for (const pts of f.cracks) { const n = Math.max(2, Math.ceil(pts.length * grow)); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    const big = `'Barlow Condensed', Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (Math.sin(time * 9) > -.3) {
      ctx.font = `italic 900 ${Math.min(W * .075, 64)}px ${big}`; ctx.lineWidth = 8; ctx.strokeStyle = '#1a0006';
      ctx.strokeText('⚠ INVASION INCOMING ⚠', W / 2, H * .22, W * .94); ctx.fillStyle = '#ff3b55'; ctx.fillText('⚠ INVASION INCOMING ⚠', W / 2, H * .22, W * .94);
    }
    if (e >= COUNTDOWN_START) {
      const n = Math.max(0, Math.ceil(left)), frac = n - left, size = Math.min(W, H) * .34 * (1.45 - .45 * Math.min(1, frac * 4));
      ctx.font = `italic 900 ${size}px ${big}`; ctx.lineWidth = 14; ctx.strokeStyle = '#2a0008'; ctx.strokeText(String(n), W / 2, H * .55);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff1e3c'; ctx.shadowBlur = 40; ctx.fillText(String(n), W / 2, H * .55);
    }
    ctx.restore();
  }
  function drawDisco() {
    const f = finale, bpm = 2.05, ph = mod(time * bpm, 1), pulse = Math.pow(1 - ph, 3), beatN = Math.floor(time * bpm);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#13021f'); g.addColorStop(1, '#050010'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
    const horizon = H * .56;
    for (let r = 0; r < 8; r++) { // perspective dance floor
      const y0 = horizon + (H - horizon) * Math.pow(r / 8, 1.5), y1 = horizon + (H - horizon) * Math.pow((r + 1) / 8, 1.5);
      const xw = y => W * .18 + (y - horizon) / (H - horizon) * W * 1.25;
      for (let c = -6; c < 6; c++) {
        const lit = (r + c + beatN) % 2 === 0, hue = (mod(r * 2 + c + beatN, 6)) * 60;
        ctx.fillStyle = lit ? `hsl(${hue},100%,${42 + pulse * 26}%)` : `hsl(${hue},60%,10%)`;
        ctx.beginPath(); ctx.moveTo(W / 2 + c / 6 * xw(y0), y0); ctx.lineTo(W / 2 + (c + 1) / 6 * xw(y0), y0); ctx.lineTo(W / 2 + (c + 1) / 6 * xw(y1), y1); ctx.lineTo(W / 2 + c / 6 * xw(y1), y1); ctx.closePath(); ctx.fill();
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { // sweeping spotlights
      const ox = i < 3 ? W * .06 : W * .94, ang = Math.PI / 2 + Math.sin(time * (.8 + i * .17) + i * 1.3) * .75, len = H * 1.4, sp = .11, hue = (i * 60 + time * 50) % 360;
      const lg = ctx.createLinearGradient(ox, -10, ox + Math.cos(ang) * len, Math.sin(ang) * len); lg.addColorStop(0, `hsla(${hue},100%,65%,.5)`); lg.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ox, -10); ctx.lineTo(ox + Math.cos(ang - sp) * len, Math.sin(ang - sp) * len); ctx.lineTo(ox + Math.cos(ang + sp) * len, Math.sin(ang + sp) * len); ctx.fill();
    }
    const bx = W / 2, by = H * .17, R = Math.min(W, H) * .085;
    for (let i = 0; i < 90; i++) { // light specks thrown by the disco ball
      const a = i * 2.39996 + time * .55, d = Math.max(W, H) * (.15 + random(i + 700) * .8);
      ctx.globalAlpha = .55; ctx.fillStyle = `hsl(${(i * 37 + time * 80) % 360},100%,75%)`; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * d, by + Math.sin(a) * d * .7, 1.5 + random(i + 710) * 2.5, 0, TAU); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    line(bx, -10, bx, by - R, '#c7c2d8', 2); // the disco ball
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.clip();
    ctx.fillStyle = '#4a4560'; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    for (let la = -6; la < 6; la++) for (let lo = 0; lo < 16; lo++) {
      const lat = (la + .5) / 6 * Math.PI / 2, lon = lo / 16 * TAU + time * 1.2, z = Math.cos(lon) * Math.cos(lat); if (z < 0) continue;
      const fx = bx + Math.sin(lon) * Math.cos(lat) * R, fy = by + Math.sin(lat) * R, sz = R / 6 * Math.max(.3, z);
      ctx.fillStyle = `hsl(${(lo * 22 + la * 40 + time * 120) % 360},40%,${45 + z * 45 * (random(lo * 13 + la + Math.floor(time * 6)) > .85 ? 1.2 : .8)}%)`;
      ctx.fillRect(fx - sz / 2, fy - R / 13, sz * .9, R / 7);
    }
    ctx.restore();
    for (let i = 0; i < 4; i++) { const tw = Math.sin(time * 6 + i * 2); if (tw < .6) continue; const sx = bx + Math.cos(i * 1.7) * R * .6, sy = by + Math.sin(i * 2.3) * R * .6; ctx.globalAlpha = tw; line(sx - 9, sy, sx + 9, sy, '#fff', 2); line(sx, sy - 9, sx, sy + 9, '#fff', 2); }
    ctx.globalAlpha = 1;
    const m = machines[shipIndex], hop = Math.abs(Math.sin(time * bpm * Math.PI)) * H * .04, size = Math.min(W * .1, H * .12, 110);
    drawShip(W / 2, H * .74 - hop, size, m.color, m.dark, Math.sin(time * bpm * Math.PI) * .6, true);
    for (let i = 0; i < 6; i++) { // dancing aliens (the friendly ones)
      const side = i < 3 ? -1 : 1, k = i % 3, x = W / 2 + side * (W * (.18 + k * .12)), y = H * (.8 + k * .04) - Math.abs(Math.sin(time * bpm * Math.PI + i)) * H * .05;
      drawCritter(x, y, Math.min(W * .07, 60) * (1 + k * .15), CRITTER_COLORS[i % 4], Math.sin(time * 3 + i), time * 8 + i);
    }
    const tsize = Math.min(W * .095, 92) * (1 + pulse * .07), hue = (time * 160) % 360;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `italic 900 ${tsize}px 'Barlow Condensed', Impact, sans-serif`;
    ctx.lineWidth = 10; ctx.strokeStyle = '#12001c'; ctx.strokeText('CONGRATULATIONS!', W / 2, H * .38, W * .94);
    ctx.fillStyle = `hsl(${hue},100%,65%)`; ctx.shadowColor = `hsl(${(hue + 120) % 360},100%,60%)`; ctx.shadowBlur = 30; ctx.fillText('CONGRATULATIONS!', W / 2, H * .38, W * .94);
    ctx.restore();
  }
  function renderFinale() {
    const f = finale;
    ctx.save();
    if (shakeAmount() > .03) ctx.translate(Math.sin(time * 121) * shakeAmount() * 8, Math.cos(time * 93) * shakeAmount() * 5);
    if (f.phase === 'disco') { drawDisco(); ctx.restore(); return; }
    drawSpace();
    const L = finaleLayout(), shipPx = f.shipX * W;
    if ((f.phase !== 'won' || time - f.wonAt < .15) && !(f.boss.hidden > time)) drawFinalBoss(L, clamp((shipPx - L.bossX) / (W * .25), -1, 1));
    for (const v of f.invaders) if (v.alive) {
      const x = invaderX(L, v), y = L.top + (v.r + .5) * L.ch;
      drawCritter(x, y + Math.sin(time * 3 + v.seed) * L.ch * .05, L.cw * .92, CRITTER_COLORS[v.r % 4], clamp((shipPx - x) / (W * .3), -1, 1), time * 6 + v.seed);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of f.beams) { const a = clamp(1 - (time - b.at) / .15, 0, 1); ctx.globalAlpha = a; line(b.x, b.y0, b.x, b.y1, '#7dfcff', 12); line(b.x, b.y0, b.x, b.y1, '#ffffff', 3); }
    for (const b of f.bursts) {
      const k = clamp((time - b.at) / .55, 0, 1); if (time < b.at) continue; ctx.globalAlpha = 1 - k; ctx.fillStyle = b.color;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, d = b.s * (.2 + k * 1.1), p = b.s * .12 * (1 - k * .5); ctx.fillRect(b.x + Math.cos(a) * d - p / 2, b.y + Math.sin(a) * d - p / 2, p, p); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    for (const b of f.bolts) {
      if (b.kind === 'web') {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(time * .6); ctx.strokeStyle = 'rgba(220,250,255,.85)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(0, 0, Math.cos(a) * b.r, Math.sin(a) * b.r, 'rgba(220,250,255,.85)', 1.5); }
        for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU, rr = b.r * ring / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
        ctx.restore(); continue;
      }
      if (b.kind === 'shard') { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(time * 8); ctx.fillStyle = '#bff8ff'; ctx.shadowColor = '#7dfcff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(0, -L.ship * .25); ctx.lineTo(L.ship * .1, 0); ctx.lineTo(0, L.ship * .25); ctx.lineTo(-L.ship * .1, 0); ctx.fill(); ctx.restore(); continue; }
      if (b.kind === 'bite') {
        ctx.save();
        if (!b.fired) {
          const k = clamp(1 - (b.warnUntil - time), 0, 1); cbMark(b.x, L.shipY + L.ship * .35, L.ship * .9); ctx.translate(b.x, L.shipY + L.ship * .35);
          for (let r = 4; r > 0; r--) { ctx.fillStyle = `hsla(${(time * 200 + r * 60) % 360},100%,55%,${.3 + k * .25})`; ctx.beginPath(); ctx.ellipse(0, 0, L.ship * (.8 + r * .5) * (.4 + k * .6), L.ship * (.18 + r * .1), time * 3, 0, TAU); ctx.fill(); }
          ctx.font = `bold ${Math.max(12, L.ship * .35)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.fillStyle = Math.sin(time * 20) > 0 ? '#ff6a3d' : '#ffffff'; ctx.fillText('⚠ WORMHOLE — MOVE!', 0, -L.ship * 1.3);
        } else {
          const k = clamp((time - b.warnUntil) / .45, 0, 1), up = Math.sin(k * Math.PI) * L.ship * 3.2; ctx.translate(b.x, L.shipY + L.ship * 1.4 - up);
          drawShark(0, 0, L.ship * 3.4, 0, 0, true);
        }
        ctx.restore(); continue;
      }
      if (b.kind === 'eyebeam') {
        ctx.save();
        if (!b.fired) { cbMark(b.x, L.shipY + L.ship * .3, L.ship * .8); ctx.globalAlpha = Math.sin(time * 30) > 0 ? .7 : .25; line(b.x, b.fromY, b.x, H, '#ff3b55', 2); ctx.fillStyle = 'rgba(255,40,70,.35)'; ctx.beginPath(); ctx.ellipse(b.x, L.shipY + L.ship * .3, L.ship, L.ship * .25, 0, 0, TAU); ctx.fill(); }
        else { ctx.globalCompositeOperation = 'lighter'; line(b.fromX, b.fromY, b.x, H, 'rgba(255,60,90,.55)', L.ship * 1.2); line(b.fromX, b.fromY, b.x, H, '#ff9aa8', L.ship * .45); line(b.fromX, b.fromY, b.x, H, '#ffffff', 4); }
        ctx.restore(); continue;
      }
      if (b.kind === 'missile') {
        const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-L.ship * .5, 0); ctx.lineTo(-L.ship * (.8 + Math.random() * .3), -L.ship * .07); ctx.lineTo(-L.ship * (.8 + Math.random() * .3), L.ship * .07); ctx.fill();
        ctx.fillStyle = '#c8ced8'; ctx.fillRect(-L.ship * .5, -L.ship * .07, L.ship * .5, L.ship * .14); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.moveTo(0, -L.ship * .07); ctx.lineTo(L.ship * .16, 0); ctx.lineTo(0, L.ship * .07); ctx.fill();
        ctx.restore(); continue;
      }
      if (b.kind === 'zap') { ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 5; i++) { const yy = b.y - i * 6, xx = b.x + (i % 2 ? 4 : -4); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
      else { ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(b.x, b.y, L.ship * .22, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(b.x - b.vx * .04, b.y - b.vy * .04, L.ship * .14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    if (f.phase !== 'lost' && f.phase !== 'respawn' && (time > f.invulnUntil || Math.sin(time * 40) > 0)) { const m = machines[shipIndex]; drawShip(shipPx, L.shipY, L.ship, m.color, m.dark, clamp(gesture.steer || 0, -1, 1) * -.5, true); }
    drawGoreAndSplats();
    drawCrashLayer();
    drawShards();
    drawFinaleHud(L);
    if (flashAmount(screenFlash) > .015) { ctx.fillStyle = `rgba(255,255,240,${flashAmount(screenFlash) * .55})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
    ctx.restore();
  }
  // ==== Race rendering and the frame loop.
  function polygon(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function background() {
    const t = tracks[trackIndex], horizon = H * .45;
    const sky = ctx.createLinearGradient(0, 0, 0, H * .7); sky.addColorStop(0, t.sky[0]); sky.addColorStop(.57, t.sky[1]); sky.addColorStop(1, t.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 95; i++) {
      const x = mod(random(i + 40) * W - playerX * 16, W), y = random(i + 80) * H * .46;
      ctx.fillStyle = i % 4 === 0 ? '#ffb5f9' : '#ccf4ff'; ctx.globalAlpha = .25 + random(i) * .6;
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    const sx = W * .72 - playerX * 35, sy = H * .29, radius = Math.min(W * .105, H * .17);
    const glow = ctx.createRadialGradient(sx, sy, radius * .3, sx, sy, radius * 2.8); glow.addColorStop(0, t.sun + '60'); glow.addColorStop(.4, '#ff4fa028'); glow.addColorStop(1, '#ff4fa000');
    ctx.fillStyle = glow; ctx.fillRect(sx - radius * 3, sy - radius * 3, radius * 6, radius * 6);
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, radius * (1 + beat * .025), 0, TAU); ctx.clip();
    const sun = ctx.createLinearGradient(0, sy - radius, 0, sy + radius); sun.addColorStop(0, '#ffeb8f'); sun.addColorStop(.45, t.sun); sun.addColorStop(1, '#ff4098');
    ctx.fillStyle = sun; ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    for (let i = 0; i < 9; i++) { const y = sy + i * radius * .12; ctx.fillStyle = t.sky[1]; ctx.fillRect(sx - radius, y, radius * 2, 1 + i * .9); }
    ctx.restore();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-.35); ctx.scale(1, .34); ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.6, radius * 1.6, 0, Math.PI * .05, Math.PI * .98); ctx.strokeStyle = '#ff80e29a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // Layered mountain silhouettes behind the megacity.
    for (let layer = 0; layer < 2; layer++) {
      const pts = [[0, H * .64]];
      for (let i = 0; i <= 24; i++) pts.push([i / 24 * W, horizon - random(i + layer * 60) * H * .12 + layer * 34]);
      pts.push([W, H * .64]); polygon(pts, layer ? '#19143e' : '#30205b', layer ? '#7e37a660' : '#a257b860');
    }
    for (let i = 0; i < 65; i++) {
      const x = mod(i / 65 * (W + 70) - playerX * 45 + Math.sin(position / LENGTH * TAU) * 75, W + 70) - 35;
      const width = 10 + random(i + 12) * 37, height = 25 + random(i + 5) ** 2 * H * .26;
      const y = horizon + H * .09 - height;
      ctx.fillStyle = i % 2 ? '#11102e' : '#181336'; ctx.fillRect(x, y, width, height + H * .1);
      const color = i % 3 === 0 ? t.edge : t.second;
      line(x, y, x + width, y, color + '60');
      if (i % 4 === 0) { line(x + width / 2, y, x + width / 2, y - 18, color + '90'); ctx.fillStyle = color; ctx.fillRect(x + width / 2 - 1, y - 20, 2, 2); }
      for (let row = 0; row < height / 10; row++) for (let col = 0; col < width / 7 - 1; col++) {
        if (random(i * 400 + row * 17 + col) > .48) { ctx.fillStyle = color + (row % 3 === 0 ? '90' : '38'); ctx.fillRect(x + 4 + col * 7, y + 6 + row * 10, 2, 3); }
      }
    }
    if (hyperTime > 0 && mode !== 'menu') drawHyperSpace();
    const ground = ctx.createLinearGradient(0, H * .5, 0, H); ground.addColorStop(0, t.fog); ground.addColorStop(.12, '#311248'); ground.addColorStop(1, '#0e0925');
    ctx.fillStyle = ground; ctx.fillRect(0, H * .55, W, H * .45);
    const gridHorizon = H * .51;
    for (let i = -14; i <= 14; i++) line(W / 2 + i * 22 - playerX * 15, gridHorizon, W / 2 + i * W / 7 - playerX * 130, H, t.edge + '28');
    for (let i = 0; i < 22; i++) { const q = mod(i / 22 + position / 50000, 1); const y = gridHorizon + q ** 3 * (H - gridHorizon); line(0, y, W, y, t.edge + '35'); }
  }
  function project(p, worldX, worldY, z, cameraY) {
    p.scale = DEPTH / Math.max(1, z); p.x = W * .5 + p.scale * worldX * W * .5;
    p.y = H * .45 - p.scale * (worldY - cameraY) * H * .5;
    p.w = p.scale * ROAD * W * .5 * tracks[trackIndex].width;
  }
  function roadStrip(a, b, left, right, color) {
    polygon([[a.x + a.w * left, a.y], [a.x + a.w * right, a.y], [b.x + b.w * right, b.y], [b.x + b.w * left, b.y]], color);
  }
  function hazardLane(hazard) {
    if (hazard.type === 'cat') return Math.sin(time * 1.55 + hazard.phase) * .64;
    return hazard.lane + (hazard.type === 'drone' ? Math.sin(time * 1.7 + hazard.phase) * .17 : 0);
  }
  function drawCat(s) {
    const a = s.p1, b = s.p2, width = lerp(a.w, b.w, .5), hazard = s.hazard;
    const size = width * .085, x = lerp(a.x, b.x, .5) + width * hazardLane(hazard), y = lerp(a.y, b.y, .5);
    if (size < 2) return;
    const color = hazard.color || '#ff9bf2', stride = Math.sin(time * 16 + hazard.phase) * .13;
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(time * 1.55 + hazard.phase) < 0 ? -1 : 1, 1);
    ctx.shadowColor = color; ctx.shadowBlur = Math.min(20, size * .55);
    ctx.beginPath(); ctx.moveTo(-size * .28, -size * .3); ctx.quadraticCurveTo(-size * .95, -size * .9 + stride * size, -size * .73, -size * 1.2); ctx.strokeStyle = '#d9d5f2'; ctx.lineWidth = size * .095; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-size * .12, -size * .38, size * .43, size * .24, -.08, 0, TAU); ctx.fillStyle = '#201d38'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .04); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(size * .26, -size * .54, size * .27, size * .24, 0, 0, TAU); ctx.fillStyle = '#27213e'; ctx.fill();
    polygon([[size * .07, -size * .65], [size * .09, -size * 1.02], [size * .3, -size * .77]], '#292441', color, Math.max(1, size * .035));
    polygon([[size * .35, -size * .74], [size * .56, -size * 1.03], [size * .54, -size * .56]], '#292441', color, Math.max(1, size * .035));
    for (let leg = 0; leg < 4; leg++) {
      const lx = (leg < 2 ? -1 : 1) * size * (.3 + (leg % 2) * .22), phase = stride * (leg % 2 ? -1 : 1);
      line(lx, -size * .26, lx + phase * size, size * .015, '#e3d8f7', size * .07);
    }
    ctx.fillStyle = '#fffcac'; ctx.shadowColor = color; ctx.shadowBlur = size * .25;
    ctx.beginPath(); ctx.arc(size * .34, -size * .56, size * .045, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(size * .49, -size * .56, size * .045, 0, TAU); ctx.fill();
    line(size * .1, -size * .2, size * .35, -size * .2, color, size * .075);
    ctx.restore();
  }
  function drawHazard(s, t) {
    const hazard = s.hazard, a = s.p1, b = s.p2, width = lerp(a.w, b.w, .5), y = lerp(a.y, b.y, .5);
    if (hazard.type === 'cat') { drawCat(s); return; }
    const x = lerp(a.x, b.x, .5) + width * hazardLane(hazard), size = width * (hazard.type === 'gate' ? .17 : .135);
    if (size < 2) return;
    const color = hazard.type === 'gate' ? '#ff456d' : hazard.type === 'drone' ? '#eaff55' : '#ff783e';
    ctx.save(); ctx.translate(x, y); ctx.shadowColor = color; ctx.shadowBlur = Math.min(28, size * .45);
    if (hazard.type === 'gate') {
      line(-size, 0, size, 0, '#60184b', size * .24);
      line(-size * .92, -size * .02, size * .92, -size * .02, color, size * .1);
      for (const side of [-1, 1]) {
        line(side * size * .86, 0, side * size * .86, -size * 1.45, '#ffad4a', size * .12);
        ctx.fillStyle = '#fff4a3'; ctx.fillRect(side * size * .86 - size * .08, -size * 1.5, size * .16, size * .12);
      }
      line(-size * .8, -size * .72, size * .8, -size * .72, '#ffd7ea', size * .055);
    } else if (hazard.type === 'drone') {
      const spin = time * 2.5 + hazard.phase;
      ctx.rotate(spin * .15);
      polygon([[-size * 1.3, 0], [-size * .52, -size * .32], [0, -size * .75], [size * .52, -size * .32], [size * 1.3, 0], [size * .52, size * .32], [0, size * .75], [-size * .52, size * .32]], '#432d45', color, Math.max(1, size * .06));
      ctx.fillStyle = '#fcffff'; ctx.beginPath(); ctx.arc(0, 0, size * .17, 0, TAU); ctx.fill();
      for (const side of [-1, 1]) {
        ctx.save(); ctx.rotate(spin * side); ctx.beginPath(); ctx.ellipse(side * size * .82, 0, size * .2, size * .055, 0, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .045); ctx.stroke(); ctx.restore();
      }
    } else {
      ctx.rotate(time * .55 + hazard.phase);
      const points = [];
      for (let i = 0; i < 12; i++) { const angle = i / 12 * TAU; const radius = size * (i % 2 ? .68 : 1); points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]); }
      polygon(points, '#732e36', color, Math.max(1, size * .065));
      ctx.fillStyle = '#fff1a5'; ctx.beginPath(); ctx.arc(0, 0, size * .19, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, size * 1.24, 0, TAU); ctx.strokeStyle = color + '90'; ctx.lineWidth = Math.max(1, size * .025); ctx.stroke();
    }
    ctx.restore();
  }
  function drawTrampoline(s, t) {
    const a = s.p1, b = s.p2, lane = s.trampoline.lane, width = lerp(a.w, b.w, .5), x = lerp(a.x, b.x, .5) + width * lane, y = lerp(a.y, b.y, .5);
    const size = width * .24;
    if (size < 2) return;
    roadStrip(a, b, lane - .27, lane + .27, '#183447');
    roadStrip(a, b, lane - .235, lane + .235, t.second + 'a0');
    ctx.save(); ctx.translate(x, y); ctx.shadowColor = t.second; ctx.shadowBlur = Math.min(24, size * .5);
    polygon([[-size, 0], [size, 0], [size * .72, -size * .25], [size * .42, -size * .7], [-size * .42, -size * .7], [-size * .72, -size * .25]], '#28264c', t.second, Math.max(1, size * .06));
    line(-size * .55, -size * .18, size * .55, -size * .18, t.edge, Math.max(1, size * .055));
    for (let i = -1; i <= 1; i++) {
      const ax = i * size * .35;
      line(ax, -size * .32, ax, -size * (.48 + .08 * Math.sin(time * 9 + i)), '#fff3a2', Math.max(1, size * .06));
      line(ax - size * .1, -size * .42, ax, -size * .53, '#fff3a2', Math.max(1, size * .05));
      line(ax + size * .1, -size * .42, ax, -size * .53, '#fff3a2', Math.max(1, size * .05));
    }
    ctx.restore();
  }
  function drawExplosion(x, y, width, explosion) {
    const progress = clamp((time - explosion.started) / explosion.duration, 0, 1);
    const radius = Math.max(2, width * (.07 + progress * .14) * explosion.size);
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - progress;
    if (explosion.cartoon) {
      const colors = ['#fff6ae', '#ff80e8', '#58f8ff', '#e2ff59', '#a88aff'];
      ctx.beginPath(); ctx.arc(0, 0, radius * (1 + progress * 2.4), 0, TAU); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, width * .015 * (1 - progress)); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * (.6 + progress * 2.8), 0, TAU); ctx.strokeStyle = '#ff82ec'; ctx.lineWidth = Math.max(1, width * .03 * (1 - progress)); ctx.stroke();
      for (let i = 0; i < 22; i++) {
        const angle = i / 22 * TAU + explosion.seed, reach = radius * (.5 + progress * 2.3 + random(explosion.seed + i) * .7);
        const px = Math.cos(angle) * reach, py = Math.sin(angle) * reach, pixel = Math.max(2, width * (.018 + random(i + explosion.seed * 2) * .025));
        ctx.save(); ctx.translate(px, py); ctx.rotate(angle + progress * 3); ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-pixel / 2, -pixel / 2, pixel, pixel); ctx.restore();
      }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.arc(0, 0, radius * (1.1 + progress * 1.5), 0, TAU); ctx.strokeStyle = '#fff7d0'; ctx.lineWidth = Math.max(1, width * .012 * (1 - progress)); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, radius * (.55 + progress * 2.2), 0, TAU); ctx.strokeStyle = explosion.color; ctx.lineWidth = Math.max(1, width * .025 * (1 - progress)); ctx.stroke();
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
    core.addColorStop(0, '#ffffff'); core.addColorStop(.22, '#fff18b'); core.addColorStop(.57, explosion.color); core.addColorStop(1, explosion.color + '00');
    ctx.fillStyle = core; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    for (let i = 0; i < 13; i++) {
      const angle = i / 13 * TAU + explosion.seed, reach = radius * (.6 + random(explosion.seed + i) * 1.7);
      line(Math.cos(angle) * radius * .24, Math.sin(angle) * radius * .24, Math.cos(angle) * reach, Math.sin(angle) * reach,
        i % 3 === 0 ? '#fff3a1' : explosion.color, Math.max(1, width * .009 * (1 - progress)));
    }
    ctx.restore();
  }
  function drawRoad() {
    const t = tracks[trackIndex], base = Math.floor(position / SEG), percent = position % SEG / SEG;
    const playerSeg = mod(base + 5, COUNT), elevation = lerp(segments[playerSeg].y, segments[mod(playerSeg + 1, COUNT)].y, percent);
    const cameraY = elevation + 1030;
    let x = 0, dx = -segments[base].curve * percent, clipY = H + 500;
    const visible = [];
    for (let n = 0; n < 185; n++) {
      const index = mod(base + n, COUNT), s = segments[index], next = segments[mod(index + 1, COUNT)];
      const z = (n - percent) * SEG;
      project(s.p1, x - playerX * ROAD, s.y, z, cameraY);
      project(s.p2, x + dx - playerX * ROAD, next.y, z + SEG, cameraY);
      x += dx; dx += s.curve;
      s.clip = clipY; s.depth = n;
      if (z <= DEPTH || s.p2.y >= s.p1.y || s.p2.y >= clipY) continue;
      visible.push(s); clipY = s.p2.y;
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const s = visible[i], a = s.p1, b = s.p2;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, s.clip); ctx.clip();
      const alt = Math.floor(s.index / 3) % 2;
      roadStrip(a, b, -1.12, 1.12, '#070e26');
      roadStrip(a, b, -1.055, 1.055, alt ? t.edge : t.second);
      roadStrip(a, b, -1, 1, alt ? t.road : '#11102e');
      roadStrip(a, b, -.986, -.974, '#ffffff80'); roadStrip(a, b, .974, .986, '#ffffff80');
      if (s.index % 9 < 4) { roadStrip(a, b, -.338, -.332, '#b6c7ff55'); roadStrip(a, b, .332, .338, '#b6c7ff55'); }
      if (s.index % 6 === 0) line(b.x - b.w, b.y, b.x + b.w, b.y, t.second + '20');
      if (s.pad) {
        roadStrip(a, b, s.padLane - .29, s.padLane + .29, s.index % 3 === 0 ? '#d1ffff' : '#15bccc');
        if (s.index % 3 === 1) { const cx = b.x + b.w * s.padLane; polygon([[cx - b.w * .18, a.y], [cx, b.y], [cx + b.w * .18, a.y], [cx, lerp(a.y, b.y, .5)]], '#a5ffff'); }
      }
      if (s.trampoline) drawTrampoline(s, t);
      if (s.stargate && mode !== 'menu' && s.depth > 3) drawStarGate(s, t);
      if (s.powerup && mode !== 'menu' && s.depth > 3 && !hitPowerups.has(Math.floor((distance + (s.index * SEG < mod(distance, LENGTH) ? LENGTH : 0)) / LENGTH) * COUNT + s.index)) drawPowerupPickup(s);
      if (s.hazard) drawHazard(s, t);
      for (const bomb of bombs) {
        const worldPosition = mod(bomb.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(worldPosition / SEG) === s.index && s.depth > 4) drawBomb(s, bomb, t);
      }
      if (s.index < 5) {
        for (let c = 0; c < 14; c++) roadStrip(a, b, -1 + c / 7, -1 + (c + 1) / 7, (c + s.index) % 2 ? '#ebf7ff' : '#202047');
      }
      // Raised luminous barrier strips give the floating road its shape.
      const railA = Math.min(40, a.w * .052), railB = Math.min(40, b.w * .052);
      for (const side of [-1, 1]) {
        polygon([[a.x + a.w * side * 1.06, a.y], [b.x + b.w * side * 1.06, b.y], [b.x + b.w * side * 1.06, b.y - railB], [a.x + a.w * side * 1.06, a.y - railA]], alt ? t.edge + 'a0' : t.second + '80');
        line(a.x + a.w * side * 1.06, a.y - railA, b.x + b.w * side * 1.06, b.y - railB, side === -1 ? t.edge : t.second, Math.max(1, a.w * .003));
      }
      if (s.tower && s.depth > 9 && s.depth < 145 && !(hyperTime > 0 && hyperFade() > .5)) drawScenery(s, t);
      if (s.arch && s.depth > 6) drawArch(s, t);
      for (const ufo of ufos) {
        const worldPosition = mod(ufo.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(worldPosition / SEG) === s.index && s.depth > 6 && s.depth < 150) drawUfo(s, ufo);
      }
      if (s.depth > 90) { ctx.globalAlpha = (s.depth - 90) / 95 * .6; roadStrip(a, b, -1.09, 1.09, t.fog); ctx.globalAlpha = 1; }
      if (mode !== 'menu') {
        for (const r of rivals) {
          if (!r.alive && !r.dying) continue;
          const rz = mod(r.distance, LENGTH);
          if (Math.floor(rz / SEG) === s.index && s.depth > 5) {
            const f = rz % SEG / SEG, rw = lerp(a.w, b.w, f);
            const rx = lerp(a.x, b.x, f) + rw * r.x, ry = lerp(a.y, b.y, f) - rw * .035;
            r.screen = { x: rx, y: ry, size: rw * .115, at: time };
            if (r.dying) {
              // Spin accelerates and the ship sags as its anti-gravity fails.
              const t = clamp((time - r.dying.started) / WRECK_TIME, 0, 1);
              const flicker = Math.sin(time * 40) > .3 ? '#ffffff' : r.color;
              drawShip(rx, ry + rw * .02 * t, rw * .115, t > .7 ? flicker : r.color, '#1d1828', 0, false, false, false, r.dying.spin * (t * t * 14 + t * 2));
              drawSmoke(rx, ry, rw * .115, r);
            } else {
              drawShip(rx, ry, rw * .115, r.color, r.dark || '#393156', Math.sin(time + r.seed) * .1, false, r.boosting);
              if (r.nemesis && rw * .115 > 26) {
                const fs = Math.max(11, Math.min(15, rw * .03)); ctx.save(); ctx.font = `${fs}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center';
                const label = `☠ ${r.nemesis.name}  ${'▮'.repeat(Math.max(0, r.hull))}`; const w = ((ctx.measureText(label) || {}).width || label.length * fs * .6) + 12, ty = ry - rw * .115 * .95;
                ctx.fillStyle = '#09091acc'; ctx.fillRect(rx - w / 2, ty - fs, w, fs + 6); ctx.fillStyle = r.nemesis.color; ctx.fillText(label, rx, ty); ctx.restore();
              }
            }
          }
        }
      }
      for (const m of missiles) {
        const wp = mod(m.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(wp / SEG) === s.index && s.depth > 4) { const f = wp % SEG / SEG, rw = lerp(a.w, b.w, f); drawMissile(lerp(a.x, b.x, f) + rw * m.lane, lerp(a.y, b.y, f) - rw * .06, rw, m); }
      }
      for (const explosion of explosions) {
        const worldPosition = mod(explosion.distance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 5) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          drawExplosion(lerp(a.x, b.x, f) + rw * explosion.lane, lerp(a.y, b.y, f) - rw * .035, rw * .36, explosion);
        }
      }
      for (const shot of laserShots) {
        if (shot.screen) continue;
        const worldPosition = mod(shot.distance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 4) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          shot.x = lerp(a.x, b.x, f) + rw * shot.lane;
          shot.y = lerp(a.y, b.y, f) - rw * (shot.air ? .43 : .035);
        }
      }
      for (const shot of enemyShots) {
        const worldPosition = mod(shot.sourceDistance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 5) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          shot.x = lerp(a.x, b.x, f) + rw * shot.sourceLane;
          shot.y = lerp(a.y, b.y, f) - rw * .14;
        }
      }
      ctx.restore();
    }
  }
  function drawScenery(s, t) {
    const a = s.p1, side = s.index % 18 === 0 ? -1 : 1;
    const x = a.x + side * a.w * (1.5 + random(s.index) * .8), width = a.w * (.13 + random(s.index + 1) * .18);
    const height = a.w * (.5 + random(s.index + 2) * 1.1), y = a.y;
    const color = s.index % 27 === 0 ? '#deff43' : side < 0 ? t.edge : t.second;
    polygon([[x, y], [x, y - height], [x + width, y - height - width * .2], [x + width, y]], '#131032', color + '90', 1);
    polygon([[x + width, y], [x + width, y - height - width * .2], [x + width * 1.4, y - height], [x + width * 1.4, y]], '#221340', color + '40');
    for (let k = 1; k < 9; k++) line(x + width * .15, y - height * k / 10, x + width * .8, y - height * k / 10, color + (k % 3 === 0 ? '99' : '35'), Math.max(1, a.w * .009));
    if (s.index % 36 === 0) {
      ctx.save(); ctx.translate(x + width * .5, y - height * .55); ctx.rotate(-Math.PI / 2); ctx.fillStyle = color;
      ctx.font = `800 ${Math.max(6, width * .55)}px ${'sans-serif'}`; ctx.textAlign = 'center'; ctx.fillText(s.index % 72 === 0 ? 'NEON' : '2097', 0, 0); ctx.restore();
    }
  }
  function drawArch(s, t) {
    const p = s.p1, height = p.w * .68, thickness = Math.max(1, p.w * .038);
    for (const side of [-1, 1]) {
      const x = p.x + side * p.w * 1.1;
      line(x, p.y, x, p.y - height, '#271841', thickness * 2.5);
      line(x, p.y, x, p.y - height, side < 0 ? t.edge : t.second, thickness * .4);
    }
    polygon([[p.x - p.w * 1.13, p.y - height], [p.x - p.w * .78, p.y - height * 1.23], [p.x + p.w * .78, p.y - height * 1.23], [p.x + p.w * 1.13, p.y - height]], '#241238', t.edge, thickness * .4);
    line(p.x - p.w * .7, p.y - height * 1.16, p.x + p.w * .7, p.y - height * 1.16, t.second, thickness * .25);
    if (p.w > 80) {
      ctx.textAlign = 'center'; ctx.font = `bold ${Math.min(14, Math.max(7, p.w * .025))}px monospace`; ctx.fillStyle = '#f5f2ff';
      ctx.fillText(s.index === 30 ? 'MORBID  /  RACERS' : `${t.class}  /  HYPER VELOCITY`, p.x, p.y - height * 1.035);
    }
  }
  function drawShip(x, y, width, color, dark, steer, player, rivalBoost = false, airborne = false, spin = 0) {
    if (width < 1) return;
    let paint = null;
    if (player) { paint = playerPaint(machines[shipIndex]); color = paint.color; dark = paint.dark; }
    ctx.save(); ctx.translate(x, y); ctx.scale(width / 100, width / 100); ctx.rotate(steer * (player ? .1 : .06) + spin);
    const bob = Math.sin(time * 8) * (player ? 2 : 1); ctx.translate(0, bob);
    const boosted = player ? boosting || jumpBoostTimer > 0 : rivalBoost;
    const shadow = ctx.createRadialGradient(0, 24, 1, 0, 24, 110); shadow.addColorStop(0, color + '60'); shadow.addColorStop(1, color + '00');
    if (!airborne) { ctx.save(); ctx.scale(1, .25); ctx.fillStyle = shadow; ctx.fillRect(-120, -80, 240, 240); ctx.restore(); }
    for (const side of [-1, 1]) {
      const flame = (boosted ? 150 : 52) + Math.sin(time * 40 + side) * 13 + beat * 24;
      const fire = ctx.createLinearGradient(0, 5, 0, flame); fire.addColorStop(0, '#ffffff'); fire.addColorStop(.18, color); fire.addColorStop(.55, boosted ? '#d9ff45cf' : '#5685ff80'); fire.addColorStop(1, '#4efaff00');
      polygon([[side * 51 - 11, 5], [side * 51 + 11, 5], [side * 51 + 7, flame * .55], [side * 51, flame], [side * 51 - 7, flame * .55]], fire);
    }
    ctx.shadowColor = boosted ? '#f4ff54' : color; ctx.shadowBlur = player ? 12 + beat * 9 : boosted ? 18 : 5;
    polygon([[-22, -61], [-38, -28], [-84, -1], [-96, 22], [-47, 17], [-27, 31], [27, 31], [47, 17], [96, 22], [84, -1], [38, -28], [22, -61], [0, -81]], dark, color, 2);
    ctx.shadowBlur = 0;
    polygon([[-84, -1], [-43, -15], [-35, 6], [-96, 22]], color);
    polygon([[84, -1], [43, -15], [35, 6], [96, 22]], color);
    const hull = ctx.createLinearGradient(-28, 0, 30, 0); hull.addColorStop(0, color); hull.addColorStop(.48, '#e3f5ff'); hull.addColorStop(.55, '#b3cbdf'); hull.addColorStop(1, dark);
    polygon([[0, -81], [-24, -45], [-30, 14], [0, 27], [30, 14], [24, -45]], hull);
    if (paint && paint.pattern === 'flames') for (const s of [-1, 1]) { polygon([[s * 40, -12], [s * 92, 18], [s * 70, 4], [s * 80, 16], [s * 58, 2], [s * 62, 12], [s * 44, 4]], paint.accent); polygon([[s * 42, -6], [s * 78, 14], [s * 60, 6], [s * 52, 8]], '#ffffff'); }
    if (paint && paint.pattern === 'stripes') { polygon([[-7, -80], [7, -80], [9, 26], [-9, 26]], paint.accent); polygon([[-3, -80], [3, -80], [4, 26], [-4, 26]], color); }
    if (paint && paint.pattern === 'spots') { ctx.fillStyle = paint.accent; for (const [sx, sy, r] of [[-60, 6, 5], [62, 4, 6], [-14, -30, 4], [16, -10, 5], [-74, 14, 3], [80, 14, 3]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); } }
    if (paint && paint.pattern === 'rainbow') for (let i = 0; i < 5; i++) line(-90 + i * 4, 20 - i * 3, 90 - i * 4, 20 - i * 3, `hsl(${(time * 90 + i * 60) % 360},100%,65%)`, 2);
    polygon([[0, -54], [-15, -28], [-13, -4], [13, -4], [15, -28]], '#10132f', '#86d9ef', 1.5);
    polygon([[0, -49], [-10, -28], [10, -28]], '#7568b6');
    polygon([[-49, -25], [-63, -14], [-66, 13], [-43, 13]], '#16152c', '#ddf9ff', 1);
    polygon([[49, -25], [63, -14], [66, 13], [43, 13]], '#16152c', '#ddf9ff', 1);
    for (const side of [-1, 1]) { line(side * 43, 14, side * 61, 14, '#fff', 3); line(side * 44, 19, side * 60, 19, color, 4); }
    line(0, 1, 0, 18, '#fff', 2);
    if (player) { ctx.fillStyle = '#142439'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('07', 0, 11); }
    ctx.restore();
  }
  function drawLaserBeams() {
    if (!laserShots.length && !enemyShots.length) return;
    // Beams always leave the racer's nose, wherever it is (including mid-jump).
    const shipWidth = Math.min(W * .074, 110), startX = W * .5 + steerVisual * 12, startY = H * .79 - jumpHeight - shipWidth * .76;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const shot of laserShots) {
      if (shot.screen) continue; // drawn on top of the mothership in drawBossBeams()
      const alpha = clamp(1 - (time - shot.started) / shot.duration, 0, 1);
      ctx.globalAlpha = alpha;
      if (shot.mega) {
        const hue = (time * 720) % 360;
        line(startX, startY, shot.x, shot.y, `hsl(${hue},100%,60%)`, 26); line(startX, startY, shot.x, shot.y, `hsl(${(hue + 120) % 360},100%,65%)`, 12);
      } else line(startX, startY, shot.x, shot.y, shot.color, 8);
      line(startX, startY, shot.x, shot.y, '#ffffff', shot.mega ? 5 : 2.2);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = shot.color; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(startX, startY, 5 + alpha * 4, 0, TAU); ctx.fill();
    }
    for (const shot of enemyShots) {
      const alpha = clamp(1 - (time - shot.started) / (shot.expires - shot.started), 0, 1);
      const targetX = W * .5 + steerVisual * 12, targetY = H * .79 - jumpHeight;
      ctx.globalAlpha = alpha * .9;
      line(shot.x, shot.y, targetX, targetY, shot.color, 7);
      line(shot.x, shot.y, targetX, targetY, '#fff1c2', 1.5);
    }
    ctx.restore();
  }
  function drawMap() {
    map.clearRect(0, 0, 190, 125);
    const point = f => {
      const a = f * TAU, t = tracks[trackIndex];
      return [95 + Math.cos(a) * (64 + Math.sin(a * (trackIndex + 2)) * (2 + t.curve * .9)),
        61 + Math.sin(a) * (37 + Math.cos(a * (trackIndex + 1)) * (2 + t.hill * .55))];
    };
    map.beginPath(); for (let i = 0; i <= 180; i++) { const [x, y] = point(i / 180); i ? map.lineTo(x, y) : map.moveTo(x, y); }
    map.strokeStyle = '#ffffff18'; map.lineWidth = 9; map.stroke(); map.strokeStyle = tracks[trackIndex].second; map.lineWidth = 1.5; map.stroke();
    for (const r of rivals) { if (!r.alive) continue; const [x, y] = point(mod(r.distance, LENGTH) / LENGTH); map.fillStyle = r.color; map.beginPath(); map.arc(x, y, r.nemesis ? 4 : 2.5, 0, TAU); map.fill(); }
    const [x, y] = point(position / LENGTH); map.shadowColor = '#ddff46'; map.shadowBlur = 9; map.fillStyle = '#ddff46'; map.beginPath(); map.arc(x, y, 4, 0, TAU); map.fill(); map.shadowBlur = 0;
  }
  function drawStick() {
    const dx = clamp(gesture.x - gesture.originX, -STICK, STICK), dy = clamp(gesture.y - gesture.originY, -STICK, STICK);
    ctx.save(); ctx.globalAlpha = .55; ctx.lineWidth = 2;
    ctx.strokeStyle = gesture.boost ? '#ddff46' : gesture.brake ? '#ff4eb8' : '#4df8ff';
    ctx.beginPath(); ctx.arc(gesture.originX, gesture.originY, STICK, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .8; ctx.fillStyle = ctx.strokeStyle; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(gesture.originX + dx, gesture.originY + dy, 18, 0, TAU); ctx.fill(); ctx.restore();
  }
  function render() {
    if (finale && (mode === 'final' || mode === 'disco')) { renderFinale(); return; }
    ctx.save();
    if (shakeAmount() > .03 && (mode === 'racing' || mode === 'wrecked' || mode === 'invasion' || mode === 'respawning')) ctx.translate(Math.sin(time * 121) * shakeAmount() * 8, Math.cos(time * 93) * shakeAmount() * 5);
    background(); drawRoad(); drawLaserBeams();
    const isMenu = mode === 'menu';
    const m = machines[shipIndex];
    const shipX = isMenu ? W * .56 : W * .5 + steerVisual * 12;
    const groundShipY = isMenu ? H * .73 : H * .79, shipY = groundShipY - jumpHeight;
    const shipSize = Math.min(W * (isMenu ? .085 : .074), isMenu ? 130 : 110);
    if (mode === 'wrecked' && wreckBurst) drawExplosion(shipX, shipY, shipSize * .9, wreckBurst);
    else if (mode === 'respawning' || (time < raceInvulnUntil && Math.sin(time * 40) < 0)) { /* exploded / blinking */ }
    else {
      if (jumpHeight > 30 && mode === 'racing') {
        ctx.save(); ctx.globalAlpha = clamp(1 - jumpHeight / 420, .18, .7); ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(shipX, groundShipY + shipSize * .12, shipSize * (.52 + jumpHeight / 650), shipSize * .12, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      drawShip(shipX, shipY, shipSize, m.color, m.dark, isMenu ? -.12 : -steerVisual, true, false, jumpHeight > 75);
      if (!isMenu) drawPowerupAura(shipX, shipY, shipSize);
    }
    if (boosting && mode === 'racing') {
      for (let i = 0; i < 45; i++) {
        const angle = random(i * 5) * TAU, progress = mod(time * (1.6 + random(i)) + random(i + 9), 1);
        const r = .22 + progress * .7, x = W * .5 + Math.cos(angle) * W * r, y = H * .45 + Math.sin(angle) * H * r;
        const length = 15 + progress * 100;
        ctx.globalAlpha = progress * .65; line(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, i % 2 ? '#ddff46' : '#5cfbff', 1 + progress * 2);
      }
      ctx.globalAlpha = 1;
      const glow = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); glow.addColorStop(0, '#6d29ff00'); glow.addColorStop(1, '#7644ff40'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 3); line(p.x, p.y, p.x - p.vx * .03, p.y - p.vy * .03, p.color, 2); } ctx.globalAlpha = 1;
    drawWeather(); drawSlipstream();
    if (hyperTime > 0 && mode !== 'menu') drawWarpOverlay();
    if (mode !== 'menu') drawCrashLayer();
    if (flashAmount(screenFlash) > .015) {
      const flash = ctx.createRadialGradient(W * .5, H * .62, 2, W * .5, H * .62, Math.max(W, H) * .72);
      flash.addColorStop(0, `rgba(255,246,205,${flashAmount(screenFlash) * .45})`);
      flash.addColorStop(.24, `rgba(255,55,153,${flashAmount(screenFlash) * .2})`); flash.addColorStop(1, '#ff3b9a00');
      ctx.fillStyle = flash; ctx.fillRect(0, 0, W, H);
    }
    if (gesture.id !== null && (mode === 'racing' || mode === 'countdown')) drawStick();
    if (mode === 'invasion' && finale) drawAlarm();
    // A light scanline texture ties the entire scene together.
    ctx.fillStyle = '#05051b12'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  function frame(now) {
    frameClock = now / 1000; pollGamepad();
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60; previousTime = now;
    measureFps(dt); update(dt); render(); updateConfetti(dt); requestAnimationFrame(frame);
  }
  // ==== Gamepad polling.
  // ---- Gamepad (standard mapping): stick/D-pad steer, A/RT accelerate, B/LT brake, X/RB laser, Y/LB boost,
  // START pause; in menus A starts / races again / resumes. Buttons are fed in as virtual keys.
  const PAD_KEYS = { ArrowUp: [0, 7], ArrowDown: [1, 6], KeyX: [2, 5], Space: [3, 4] };
  let padHeld = new Set(), padSteer = 0, padPrev = {}, padSeen = false;
  function pollGamepad() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const pad = pads[0];
    if (!pad) { if (padHeld.size) { padHeld.forEach(k => keys.delete(k)); padHeld.clear(); } padSteer = 0; return; }
    if (!padSeen) { padSeen = true; document.body.classList.add('gamepad'); showMessage('🎮 GAMEPAD CONNECTED', 1.4); }
    const pressed = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > .4));
    const edge = i => { const now = pressed(i), was = padPrev[i]; padPrev[i] = now; return now && !was; };
    const stick = pad.axes[0] || 0;
    padSteer = Math.abs(stick) > .18 ? clamp((stick - Math.sign(stick) * .18) / .7, -1, 1) : pressed(15) ? 1 : pressed(14) ? -1 : 0;
    for (const [code, buttons] of Object.entries(PAD_KEYS)) {
      const on = buttons.some(pressed) && (mode === 'racing' || mode === 'countdown' || mode === 'final' || mode === 'respawning');
      if (on && !padHeld.has(code)) { padHeld.add(code); keys.add(code); } else if (!on && padHeld.has(code)) { padHeld.delete(code); keys.delete(code); }
    }
    const a = edge(0), start = edge(9);
    if (start && ['racing', 'countdown', 'paused'].includes(mode)) pauseRace();
    if (a && !document.body.classList.contains('dialog-open')) {
      if (mode === 'menu') startRace(); else if (mode === 'paused') pauseRace();
      else if (mode === 'finished' || (finale && finale.resultsShown)) raceAgain();
    } else if (a && !$('health-screen').classList.contains('hidden')) $('health-accept').click();
  }
  // ==== Keyboard, buttons and touch gestures.
  const keys = new Set();
  // Touch gestures: a floating stick anywhere on the track. Drag sideways to steer, slide up to boost,
  // slide down to brake, tap (or touch with a second finger) to fire. Holding a finger accelerates.
  const gesture = { id: null, originX: 0, originY: 0, x: 0, y: 0, startTime: 0, moved: false, steer: 0, accel: false, brake: false, boost: false, fire: false, fireQueued: false, extra: new Set() };
  let hintTime = 0;
  const STICK = 64, DEADZONE = 7, VERTICAL = 42;
  function resetGesture() { gesture.id = null; gesture.steer = 0; gesture.accel = gesture.brake = gesture.boost = gesture.fire = gesture.fireQueued = false; gesture.extra.clear(); }
  $('start').addEventListener('click', startRace); $('again').addEventListener('click', raceAgain);
  $('pause').addEventListener('click', pauseRace); $('resume').addEventListener('click', pauseRace);
  $('quit').addEventListener('click', garage); $('garage').addEventListener('click', garage);
  $('prev-track').addEventListener('click', () => selectTrack(-1)); $('next-track').addEventListener('click', () => selectTrack(1));
  document.querySelectorAll('[data-ship]').forEach(button => button.addEventListener('click', () => {
    shipIndex = Number(button.dataset.ship); document.querySelectorAll('[data-ship]').forEach(b => b.classList.toggle('selected', b === button));
    $('ship-info').textContent = machines[shipIndex].info;
  }));
  $('music-toggle').addEventListener('click', () => { if (audio.paused) { if (muted) toggleMute(); playMusic(); } else { audio.pause(); updateMusic(); } });
  $('sound').addEventListener('click', toggleMute);
  audio.addEventListener('play', updateMusic); audio.addEventListener('pause', updateMusic);
  audio.addEventListener('error', () => { $('music-status').textContent = 'SOUNDTRACK / FILE UNAVAILABLE'; });
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Fullscreen may be unavailable in embedded browsers. */ }
  });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code) && event.target.tagName !== 'BUTTON') event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'Enter' && !['BUTTON', 'A'].includes(event.target.tagName) && !document.body.classList.contains('dialog-open')) { if (mode === 'menu') startRace(); else if (mode === 'finished' || (finale && finale.resultsShown)) raceAgain(); else if (mode === 'paused') pauseRace(); }
      if (event.code === 'Escape' || event.code === 'KeyP') pauseRace();
      if (event.code === 'KeyM') toggleMute();
    }
    if (mode === 'racing' || mode === 'countdown' || mode === 'final') {
      if (event.code === 'Space') { event.preventDefault(); if (event.target.tagName === 'BUTTON') event.target.blur(); }
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); resetGesture(); if (mode === 'racing' || mode === 'countdown') pauseRace(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (mode === 'racing' || mode === 'countdown')) pauseRace(); });
  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(button.dataset.key); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
  });
  const gestureActive = () => mode === 'racing' || mode === 'countdown' || mode === 'final';
  function updateGesture() {
    let dx = gesture.x - gesture.originX, dy = gesture.y - gesture.originY;
    // Float the origin behind the finger so reversing direction responds instantly.
    if (Math.abs(dx) > STICK) { gesture.originX += dx - Math.sign(dx) * STICK; dx = Math.sign(dx) * STICK; }
    if (Math.abs(dy) > STICK) { gesture.originY += dy - Math.sign(dy) * STICK; dy = Math.sign(dy) * STICK; }
    if (Math.hypot(dx, dy) > 14) gesture.moved = true;
    gesture.steer = gyroActive() || Math.abs(dx) < DEADZONE ? 0 : clamp((dx - Math.sign(dx) * DEADZONE) / (STICK * .7 - DEADZONE), -1, 1);
    gesture.boost = dy < -VERTICAL; gesture.brake = dy > VERTICAL; gesture.accel = !gesture.brake;
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !gestureActive()) return;
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers cannot be captured. */ }
    if (gesture.id === null) {
      Object.assign(gesture, { id: event.pointerId, originX: event.clientX, originY: event.clientY, x: event.clientX, y: event.clientY, startTime: performance.now(), moved: false });
      updateGesture();
    } else { gesture.extra.add(event.pointerId); if (mode === 'racing' || mode === 'final') gesture.fireQueued = true; }
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== gesture.id) return;
    event.preventDefault(); gesture.x = event.clientX; gesture.y = event.clientY; updateGesture();
  });
  function endGesture(event) {
    if (gesture.extra.delete(event.pointerId)) return;
    if (event.pointerId !== gesture.id) return;
    const tap = !gesture.moved && performance.now() - gesture.startTime < 260;
    const extra = new Set(gesture.extra); resetGesture(); gesture.extra = extra;
    if (tap && (mode === 'racing' || mode === 'final')) gesture.fireQueued = true;
  }
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, endGesture);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  // ==== Settings wiring, stats/profile transfer, health warning, changelog, easter egg.
  document.querySelectorAll('[data-steer]').forEach(button => button.addEventListener('click', async () => {
    if (button.dataset.steer === 'gyro') {
      setupNote('ASKING FOR MOTION SENSOR ACCESS…');
      if (!await enableGyro()) { settings.steering = 'touch'; setupNote('GYRO NOT AVAILABLE — USING TOUCH'); renderSettings(); return; }
      setupNote('GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS');
    } else setupNote('DRAG ON THE TRACK TO STEER');
    settings.steering = button.dataset.steer; saveSettings(); renderSettings();
  }));
  document.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => setSetting(button.dataset.setting, button.dataset.value)));
  settingHooks.gameMode = () => renderGameMode();
  renderGameMode(); renderDaily();
  // ---- Statistics and profile transfer (a copy-paste code, no server needed).
  function renderStats() {
    const s = profile.stats, fav = Object.entries(s.perTrack || {}).sort((a, b) => b[1] - a[1])[0];
    const hours = Math.floor((s.seconds || 0) / 3600), mins = Math.floor((s.seconds || 0) % 3600 / 60);
    const rows = [
      ['RACES', s.races || 0], ['WINS', s.wins || 0], ['PODIUMS', s.podiums || 0], ['DISTANCE', `${Math.round(s.km || 0).toLocaleString()} KM`],
      ['PLAY TIME', `${hours}H ${String(mins).padStart(2, '0')}M`], ['FAVOURITE', fav ? tracks[fav[0]].name : '—'],
      ['RIVALS DESTROYED', s.rivals || 0], ['UFOs SHOT DOWN', s.ufos || 0], ['CATS POPPED', s.cats || 0], ['BOSSES DEFEATED', s.bosses || 0],
      ['ENDLESS RECORD', `${s.endlessBest || 0} WAVES`], ['DAILY STREAK', `${profile.daily.streak || 0} DAYS`],
      ['TROPHIES', `${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`], ['CREDITS', `${profile.credits} CR`],
    ];
    $('stats-list').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('profile-code').value = ''; $('profile-note').textContent = '';
  }
  const exportCode = () => 'MR1-' + btoa(unescape(encodeURIComponent(JSON.stringify({ profile, settings, best: Object.fromEntries(tracks.map((_, i) => { try { return [i, localStorage.getItem(`chroma-best-${i}`)]; } catch { return [i, null]; } })) }))));
  function importCode(code) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^MR1-/, '')))));
      if (!data || typeof data.profile !== 'object') throw new Error('bad');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      for (const [i, v] of Object.entries(data.best || {})) if (v) localStorage.setItem(`chroma-best-${i}`, v);
      return true;
    } catch { return false; }
  }
  $('open-stats').addEventListener('click', () => { renderStats(); openDialog('stats-screen'); });
  $('profile-export').addEventListener('click', async () => {
    const code = exportCode(); $('profile-code').value = code;
    try { await navigator.clipboard.writeText(code); $('profile-note').textContent = 'CODE COPIED — PASTE IT ON YOUR OTHER DEVICE.'; } catch { $('profile-note').textContent = 'COPY THE CODE BELOW AND PASTE IT ON YOUR OTHER DEVICE.'; }
  });
  $('profile-import').addEventListener('click', () => {
    if (!$('profile-code').value.trim()) { $('profile-note').textContent = 'PASTE A PROFILE CODE INTO THE BOX FIRST.'; return; }
    if (importCode($('profile-code').value)) { $('profile-note').textContent = 'PROFILE IMPORTED — RESTARTING…'; setTimeout(() => location.reload(), 700); }
    else $('profile-note').textContent = 'THAT CODE DOES NOT LOOK RIGHT. CHECK IT AND TRY AGAIN.';
  });
  window.morbidProfile = { exportCode, importCode };
  $('tutorial-skip').addEventListener('click', () => endTutorial(true));
  $('tutorial-replay').addEventListener('click', () => { profile.tutorialDone = false; saveProfile(); setupNote('THE TUTORIAL RUNS IN YOUR NEXT GRAND PRIX'); });
  $('daily-go').addEventListener('click', () => { const d = dailyChallenge(); if (gameMode() !== 'race') setSetting('gameMode', 'race'); selectTrack(d.track - trackIndex); });
  settingHooks.difficulty = () => setupNote(`DIFFICULTY: ${diff().name} · ${diff().lives > 0 ? '+1 LIFE, ' : diff().lives < 0 ? '-1 LIFE, ' : ''}${Math.round(diff().credits * 100)}% CREDITS`);
  window.morbidSettings = { set: setSetting, get: () => settings };
  document.querySelectorAll('[data-haptics]').forEach(button => button.addEventListener('click', () => {
    settings.haptics = button.dataset.haptics === 'on'; saveSettings(); renderSettings();
    const canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;
    if (settings.haptics && canVibrate) try { navigator.vibrate([40, 40, 80]); } catch { /* ignore */ }
    setupNote(settings.haptics ? (canVibrate ? 'VIBRATION ON' : 'THIS DEVICE CANNOT VIBRATE FROM THE WEB') : 'VIBRATION OFF');
  }));
  document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => {
    settings.screen = button.dataset.screen; saveSettings(); renderSettings(); applyScreenSetting(true);
    setupNote(`SCREEN: ${settings.screen.toUpperCase()}`);
  }));
  $('rotate-switch').addEventListener('click', () => { settings.screen = settings.screen === 'portrait' ? 'landscape' : 'portrait'; saveSettings(); renderSettings(); });
  window.matchMedia?.('(orientation: landscape)').addEventListener?.('change', () => setTimeout(checkOrientation, 50));
  // A remembered gyro choice needs the sensor again; iOS will re-ask on the next tap of GYRO.
  if (settings.steering === 'gyro') enableGyro().then(ok => { if (!ok && typeof window.DeviceOrientationEvent?.requestPermission !== 'function') { settings.steering = 'touch'; renderSettings(); } });
  renderSettings();
  renderLock();
  // ---- Home screen dialogs: settings and changelog.
  function openDialog(id) { $(id).classList.remove('hidden'); document.body.classList.add('dialog-open'); }
  function closeDialogs() { ['settings-screen', 'changelog-screen', 'shop-screen', 'trophy-screen', 'stats-screen'].forEach(id => $(id).classList.add('hidden')); if ($('health-screen').classList.contains('hidden')) document.body.classList.remove('dialog-open'); }
  // Health warning: shown on every visit (not again after an in-app update reload within the same session).
  let healthSeen = false;
  try { healthSeen = sessionStorage.getItem('morbid-health-ok') === '1'; } catch { /* show it */ }
  if (!healthSeen) { $('health-screen').classList.remove('hidden'); document.body.classList.add('dialog-open', 'health-open'); }
  $('health-accept').addEventListener('click', () => {
    $('health-screen').classList.add('hidden'); document.body.classList.remove('dialog-open', 'health-open');
    try { sessionStorage.setItem('morbid-health-ok', '1'); } catch { /* ignore */ }
  });
  const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Minimal renderer for the semantic-release CHANGELOG.md (headings, bullet lists, links reduced to text).
  function renderChangelog(markdown) {
    const html = [];
    let list = false;
    for (const raw of markdown.split('\n')) {
      const line = raw.replace(/\s*\(\[[0-9a-f]{7,}\]\([^)]*\)\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
      const item = /^[*-]\s+(.*)/.exec(line), heading = /^(#{1,3})\s+(.*)/.exec(line);
      if (!item && list) { html.push('</ul>'); list = false; }
      if (heading) {
        if (heading[2] === 'Changelog') continue;
        const level = heading[1].length < 3 ? 'h3' : 'h4';
        html.push(`<${level}>${escapeHtml(heading[2])}</${level}>`);
      } else if (item) { if (!list) { html.push('<ul>'); list = true; } html.push(`<li>${escapeHtml(item[1])}</li>`); }
    }
    if (list) html.push('</ul>');
    return html.join('') || '<p>No changes recorded yet.</p>';
  }
  async function showChangelog() {
    openDialog('changelog-screen'); $('changelog-body').innerHTML = '<p>LOADING…</p>';
    try {
      const response = await fetch('CHANGELOG.md', { cache: 'no-cache' });
      if (!response.ok) throw new Error(response.status);
      $('changelog-body').innerHTML = renderChangelog(await response.text());
    } catch { $('changelog-body').innerHTML = '<p>The changelog is not available offline yet.</p>'; }
  }
  $('open-settings').addEventListener('click', () => openDialog('settings-screen'));
  $('open-changelog').addEventListener('click', showChangelog);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', closeDialogs));
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && document.body.classList.contains('dialog-open')) closeDialogs(); });
  // Easter egg: tap the big MORBID RACERS title 5 times quickly (or type B-O-S-S on the start screen)
  // to skip the race and go straight to the invasion; the number of bosses follows the selected circuit.
  let eggTaps = [], eggTyped = '';
  function startEndless() { endlessRun = true; trialRun = false; bossRush(true); }
  function bossRush(endless = false) {
    if (!endless) { unlockAchievement('egg'); endlessRun = false; }
    eggTaps = []; eggTyped = '';
    setupAudio(); primeSpeech();
    $('menu').classList.add('hidden'); $('hud').classList.add('hidden');
    document.body.classList.add('racing'); document.body.classList.remove('paused');
    rivals = []; ufos = []; bombs = []; shield = 100; lives = startLives(); raceEarned = 0;
    startInvasion();
  }
  $('title-egg').addEventListener('click', () => {
    if (mode !== 'menu' || document.body.classList.contains('dialog-open')) return;
    eggTaps = eggTaps.filter(t => Date.now() - t < 2500); eggTaps.push(Date.now());
    const title = $('title-egg'); title.classList.remove('egg-tap'); void title.offsetWidth; title.classList.add('egg-tap');
    playToneSweep(300 + eggTaps.length * 180, 400 + eggTaps.length * 220, .08, 'square', .03);
    if (eggTaps.length >= 5) bossRush();
  });
  window.addEventListener('keydown', event => {
    if (mode !== 'menu' || !/^Key[A-Z]$/.test(event.code)) return;
    eggTyped = (eggTyped + event.code.slice(3)).slice(-4);
    if (eggTyped === 'BOSS') bossRush();
  });
  // ==== Upgrade and paint shop.
  // ---- Upgrade shop in the garage.
  function renderShop() {
    $('shop-credits').textContent = `${profile.credits} CR`;
    $('open-shop').textContent = `🛠 UPGRADES · ${profile.credits} CR`;
    $('shop-list').innerHTML = Object.entries(UPGRADES).map(([key, u]) => {
      const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl], maxed = lvl >= UPGRADE_MAX;
      const pips = Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="shop-row"><div class="shop-info"><b>${u.icon} ${u.name}</b><span class="pips">${pips}</span><small>${maxed ? 'MAXED OUT — ' : 'NOW: '}${u.info(lvl)}${maxed ? '' : `<br>NEXT: ${u.info(lvl + 1)}`}</small></div>`
        + `<button class="setup-option shop-buy" data-buy="${key}" ${maxed || profile.credits < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `UPGRADE · ${cost} CR`}</button></div>`;
    }).join('');
    $('paint-list').innerHTML = PAINTS.map(p => {
      const owned = paintOwned(p), active = (profile.paint || 'factory') === p.id;
      const swatch = p.pattern === 'rainbow' ? 'linear-gradient(90deg,#ff4eb8,#ddff46,#4df8ff,#a88aff)' : p.id === 'factory' ? machines[shipIndex].color : `linear-gradient(135deg,${p.color} 55%,${p.accent} 55%)`;
      const label = active ? 'EQUIPPED' : owned ? 'EQUIP' : p.trophy ? `🏆 ${ACHIEVEMENTS.find(a => a.id === p.trophy).name}` : `BUY · ${p.cost} CR`;
      return `<button class="paint ${active ? 'active' : ''} ${owned ? 'owned' : ''}" data-paint="${p.id}" ${!owned && (p.trophy || profile.credits < p.cost) ? 'disabled' : ''}><i style="background:${swatch}"></i><b>${p.name}</b><small>${label}</small></button>`;
    }).join('');
  }
  function choosePaint(id) {
    const p = PAINTS.find(x => x.id === id); if (!p) return false;
    if (!paintOwned(p)) { if (p.trophy || profile.credits < p.cost) return false; profile.credits -= p.cost; profile.paints.push(p.id); playToneSweep(500, 1500, .3, 'square', .05); }
    profile.paint = p.id; saveProfile(); renderShop(); return true;
  }
  if ($('paint-list').addEventListener) $('paint-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-paint]'); if (b) choosePaint(b.dataset.paint); });
  function buyUpgrade(key) {
    const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl];
    if (lvl >= UPGRADE_MAX || profile.credits < cost) return false;
    profile.credits -= cost; profile.upgrades[key] = lvl + 1; saveProfile(); renderShop();
    unlockAchievement('upgrade'); if (Object.values(profile.upgrades).every(v => v >= UPGRADE_MAX)) unlockAchievement('maxed');
    playToneSweep(500, 1500, .3, 'square', .05); return true;
  }
  if ($('shop-list').addEventListener) $('shop-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-buy]'); if (b) buyUpgrade(b.dataset.buy); });
  $('open-shop').addEventListener('click', () => { renderShop(); openDialog('shop-screen'); });
  renderShop(); renderTrophyButton();
  $('open-trophies').addEventListener('click', () => { renderTrophies(); openDialog('trophy-screen'); });
  window.morbidShop = { buy: buyUpgrade, paint: choosePaint, profile };
  // ==== Share card.
  // ---- Share card: a 1200×630 image of the result, shared via the system share sheet (or downloaded).
  function shareCard() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d');
    const t = tracks[trackIndex], won = finale && finale.phase === 'disco';
    const sky = g.createLinearGradient(0, 0, 0, 630); sky.addColorStop(0, t.sky[0]); sky.addColorStop(.6, t.sky[1]); sky.addColorStop(1, '#09091a');
    g.fillStyle = sky; g.fillRect(0, 0, 1200, 630);
    const sun = g.createLinearGradient(0, 120, 0, 420); sun.addColorStop(0, '#ffeb8f'); sun.addColorStop(1, '#ff4098');
    g.fillStyle = sun; g.beginPath(); g.arc(920, 280, 160, 0, TAU); g.fill();
    g.fillStyle = t.sky[1]; for (let i = 0; i < 8; i++) g.fillRect(760, 300 + i * 18, 320, 3 + i * 1.5);
    g.strokeStyle = t.edge + '88'; g.lineWidth = 2; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(600 + i * 40, 430); g.lineTo(600 + i * 160, 630); g.stroke(); }
    for (let i = 0; i < 6; i++) { const y = 430 + Math.pow(i / 6, 2) * 200; g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
    g.font = 'italic 900 110px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ffffff'; g.fillText('MORBID', 60, 150); g.fillStyle = '#ddff46'; g.fillText('RACERS', 60, 250);
    g.font = '22px "Share Tech Mono", monospace'; g.fillStyle = '#ff4eb8'; g.fillText(won ? 'GALAXY SAVED · INVASION REPELLED' : `${t.name} · ${t.class}`, 64, 305);
    g.font = 'italic 900 150px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ddff46'; g.fillText($('result-position').textContent || '--', 60, 470);
    g.font = 'italic 700 46px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#c9c2dc'; g.fillText(`/ ${PILOT_COUNT}`, 250, 470);
    g.font = '26px "Share Tech Mono", monospace'; g.fillStyle = '#ffffff';
    g.fillText(`TIME ${$('result-time').textContent}   BEST LAP ${$('result-lap').textContent}`, 64, 535);
    g.fillStyle = '#4df8ff'; g.fillText(won ? `${finale.waves} BOSS${finale.waves > 1 ? 'ES' : ''} SPLATTERED · ${ufoKills} UFOs` : `${ufoKills} UFOs SHOT DOWN · ${Object.keys(profile.achievements).length} TROPHIES`, 64, 580);
    g.font = '20px "Share Tech Mono", monospace'; g.fillStyle = '#c9c2dc'; g.fillText('jan-frederic.github.io/Zero', 900, 600);
    return c;
  }
  $('share').addEventListener('click', async () => {
    const c = shareCard(), text = `I just finished P${$('result-position').textContent} in Morbid Racers! Can you beat me? 🏁`, url = 'https://jan-frederic.github.io/Zero/';
    const blob = await new Promise(done => c.toBlob(done, 'image/png'));
    const file = blob && typeof File === 'function' ? new File([blob], 'morbid-racers.png', { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url, title: 'Morbid Racers' });
      else if (navigator.share) await navigator.share({ text, url, title: 'Morbid Racers' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'morbid-racers.png'; a.click(); }
      unlockAchievement('share');
    } catch { /* share sheet dismissed */ }
  });
  // ==== Start-up.
  // Lets the update job wait until no race is in progress.
  window.morbidBusy = () => ['countdown', 'racing', 'respawning', 'paused', 'wrecked', 'invasion', 'final'].includes(mode) || (mode === 'disco' && !(finale && finale.resultsShown));
  window.addEventListener('resize', resize);
  preloadSoundtrack(); prefetchVoices();
  applyPerf(); applyLanguage(); resize(); buildTrack(); requestAnimationFrame(frame);
})();
