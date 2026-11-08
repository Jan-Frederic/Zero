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
  // ---- Pilot profile (saved on the device): credits, ship upgrades, unlocked circuits, achievements, stats.
  const PROFILE_KEY = 'morbid-profile-v1';
  const profile = { credits: 0, upgrades: {}, unlocked: 1, achievements: {}, stats: {} };
  try { Object.assign(profile, JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')); } catch { /* fresh pilot */ }
  profile.upgrades = Object.assign({ armor: 0, laser: 0, boost: 0 }, profile.upgrades);
  // Existing pilots keep every circuit they already raced (from saved lap records).
  try { for (let i = 7; i > 0; i--) if (Number(localStorage.getItem(`chroma-best-${i}`)) > 0) { profile.unlocked = Math.max(profile.unlocked || 1, i + 1); break; } } catch { /* ignore */ }
  function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ } }
  const UPGRADES = {
    armor: { name: 'HULL ARMOR', icon: '🛡', info: lvl => `takes ${Math.round(100 - 100 / (1 + lvl * .25))}% less damage` },
    laser: { name: 'LASER BANK', icon: '◎', info: lvl => `${BASE_LASER_CAPACITY + lvl * 2} cells, recharge ${Math.round(lvl * 15)}% faster` },
    boost: { name: 'BOOST CORE', icon: 'ϟ', info: lvl => `${Math.round(lvl * 20)}% less drain, +${lvl * 3}% top speed` },
  };
  const UPGRADE_COST = [150, 350, 700], UPGRADE_MAX = 3;
  const hullStrength = () => BASE_HULL_STRENGTH * (1 + profile.upgrades.armor * .25);
  const laserCap = () => BASE_LASER_CAPACITY + profile.upgrades.laser * 2;
  const laserRecharge = () => BASE_LASER_RECHARGE * (1 - profile.upgrades.laser * .15);
  const boostDrain = () => 1 - profile.upgrades.boost * .2;
  const topSpeed = () => 1 + profile.upgrades.boost * .03;
  let raceEarned = 0, creditPopAt = -9;
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
  ];
  profile.achievements = profile.achievements || {}; profile.stats = Object.assign({ cats: 0, ufos: 0, rivals: 0, powerTypes: [] }, profile.stats);
  const achQueue = []; let achShownAt = -9;
  const realTime = () => frameClock;
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
  function stat(key, add = 1) { profile.stats[key] = (profile.stats[key] || 0) + add; saveProfile(); return profile.stats[key]; }
  function renderTrophyButton() { const b = $('open-trophies'); if (b) b.textContent = `🏆 TROPHIES ${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`; }
  function renderTrophies() {
    $('trophy-count').textContent = `${Object.keys(profile.achievements).length} / ${ACHIEVEMENTS.length}`;
    $('trophy-list').innerHTML = ACHIEVEMENTS.map(a => {
      const got = profile.achievements[a.id];
      return `<div class="trophy ${got ? 'got' : ''}"><i>${got ? a.icon : '🔒'}</i><span><b>${a.name}</b><em>${a.info}</em>${got ? `<small>${new Date(got).toLocaleDateString()}</small>` : ''}</span></div>`;
    }).join('');
  }
  function addCredits(amount, why) {
    if (!amount) return;
    profile.credits += amount; raceEarned += amount; saveProfile();
    $('credit-pop').textContent = `+${amount} CR  ${why}`; creditPopAt = time; $('credit-pop').classList.add('visible');
  }
  // Cyan pads refill shield and laser cells in proportion to each track's boost recharge rate.
  const PAD_SHIELD = .45, PAD_LASER = .1;
  const keys = new Set();
  // Touch gestures: a floating stick anywhere on the track. Drag sideways to steer, slide up to boost,
  // slide down to brake, tap (or touch with a second finger) to fire. Holding a finger accelerates.
  const gesture = { id: null, originX: 0, originY: 0, x: 0, y: 0, startTime: 0, moved: false, steer: 0, accel: false, brake: false, boost: false, fire: false, fireQueued: false, extra: new Set() };
  let hintTime = 0;
  const STICK = 64, DEADZONE = 7, VERTICAL = 42;
  function resetGesture() { gesture.id = null; gesture.steer = 0; gesture.accel = gesture.brake = gesture.boost = gesture.fire = gesture.fireQueued = false; gesture.extra.clear(); }
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
  // Power-ups picked up on the track: magnet, shield bubble, time warp, multi-laser.
  const POWERUPS = {
    magnet: { name: 'MAGNET', icon: '🧲', color: '#ff5a5a', time: 10, info: 'PULLS IN PADS, CATS, GATES AND POWER-UPS' },
    bubble: { name: 'SHIELD BUBBLE', icon: '◯', color: '#4df8ff', time: 15, info: 'ABSORBS THE NEXT 3 HITS' },
    warp: { name: 'TIME WARP', icon: '⧗', color: '#a88aff', time: 7, info: 'EVERYONE ELSE MOVES IN SLOW MOTION' },
    multi: { name: 'MULTI-LASER', icon: '⁂', color: '#ff4eb8', time: 10, info: 'EVERY SHOT HITS UP TO 3 TARGETS' },
  };
  const POWERUP_ORDER = ['magnet', 'bubble', 'warp', 'multi'];
  let power = {}, bubbleHits = 0, hitPowerups = new Set();
  const powerOn = type => (power[type] || 0) > time && (mode === 'racing' || mode === 'respawning');
  const magnetReach = () => powerOn('magnet') ? 2.6 : 1;
  const HYPER_TIME = 10;
  // Mothership boss: appears after every 10 UFO kills. Races run LAP_COUNT laps.
  const BOSS_EVERY = 10, BOSS_HP = 40, LAP_COUNT = 6;
  let ufoKills = 0, boss = null, bossAttacks = [];
  let crashingUfos = [], ufoRespawns = [], smoke = [], megaBlasts = [], confetti = [], callout = null;
  let jetSource, jetFilter, jetGain, jetWhine, jetWhineGain;
  const UFO_CRASH_TIME = 2.6, UFO_SLOTS_SPACING = 4300;
  // Each kill call has a pre-rendered retro robot clip in voice/ (made by tools/make-voice.sh).
  const KILL_CALLS = [['ALIEN KILLER!', 'alien-killer'], ['FATALITY!', 'fatality'], ['UFO OBLITERATED!', 'ufo-obliterated'], ['ABDUCT THIS!', 'abduct-this'],
    ['INVASION CANCELLED!', 'invasion-cancelled'], ['CLOSE ENCOUNTER OF THE FATAL KIND!', 'close-encounter'], ['SAUCER SMASHED!', 'saucer-smashed'],
    ['GREEN MEN DOWN!', 'green-men-down'], ['PROBE DENIED!', 'probe-denied'], ['AREA 51 SAYS THANK YOU!', 'area-51'], ['TOASTED SAUCER!', 'toasted-saucer'],
    ['MOTHERSHIP WILL HEAR ABOUT THIS!', 'mothership'], ['ULTRA KILL!', 'ultra-kill'], ['GALACTIC HUMILIATION!', 'galactic-humiliation'],
    ['NO PARKING IN MY SKY!', 'no-parking'], ['RETURN TO SENDER!', 'return-to-sender']];
  const VOICE_CLIPS = [...KILL_CALLS.map(call => call[1]), 'hyperdrive-initiated', 'first-place', 'mothership-warning', 'mothership-down', 'invasion-incoming', 'congratulations', 'next-boss', 'scream-overlord', 'scream-cyclops', 'scream-maggot', 'scream-robot'];
  const voiceBuffers = new Map();
  let voiceSource = null;
  let shake = 0, steerVisual = 0, distance = 0, bestLap = 0, previousTime = 0, muted = false, beat = 0;
  let audioContext, analyser, frequency, engineGain, engineOsc, musicSource, musicGain, sfxBus;
  let particles = [], explosions = [], laserShots = [], enemyShots = [], hitHazards = new Set(), hitRamps = new Set(), rank = 20, lastPad = -1, launchGoTime = 0, boostLocked = false;
  let laserAmmo = BASE_LASER_CAPACITY, laserCharge = 0, laserCooldown = 0, screenFlash = 0, wreckedAt = 0, wreckRank = PILOT_COUNT, wreckBurst = null;
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;
