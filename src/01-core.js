// GENERATED FILE — edit the parts in src/ and run `npm run build` (see src/README.md).
(() => {
  'use strict';
  /** DOM lookup. Typed loosely on purpose: elements are used as inputs, media, canvases and buttons. @type {(id: string) => any} */
  const $ = id => document.getElementById(id);
  /** @type {HTMLCanvasElement} */
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
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
  const SHORTCUT_LEAD = 24, SHORTCUT_SKIP = 40;
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
