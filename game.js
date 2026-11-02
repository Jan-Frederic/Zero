(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const map = $('minimap').getContext('2d');
  const audio = $('soundtrack');
  const TAU = Math.PI * 2, SEG = 200, COUNT = 1200, LENGTH = SEG * COUNT, ROAD = 1700, DEPTH = .88, PILOT_COUNT = 20, LASER_CAPACITY = 10;
  // One laser cell recharges every LASER_RECHARGE seconds; HULL_STRENGTH > 1 makes the shield last that many times longer.
  const LASER_RECHARGE = 2.5, HULL_STRENGTH = 2;
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
  let crashingUfos = [], ufoRespawns = [], smoke = [], megaBlasts = [], confetti = [], callout = null;
  let jetSource, jetFilter, jetGain, jetWhine, jetWhineGain;
  const UFO_CRASH_TIME = 2.6, UFO_SLOTS_SPACING = 4300;
  const KILL_CALLS = ['ALIEN KILLER!', 'FATALITY!', 'UFO OBLITERATED!', 'ABDUCT THIS!', 'INVASION CANCELLED!', 'CLOSE ENCOUNTER OF THE FATAL KIND!',
    'SAUCER SMASHED!', 'GREEN MEN DOWN!', 'PROBE DENIED!', 'AREA 51 SAYS THANK YOU!', 'TOASTED SAUCER!', 'MOTHERSHIP WILL HEAR ABOUT THIS!',
    'ULTRA KILL!', 'GALACTIC HUMILIATION!', 'NO PARKING IN MY SKY!', 'RETURN TO SENDER!'];
  let shake = 0, steerVisual = 0, distance = 0, bestLap = 0, previousTime = 0, muted = false, beat = 0;
  let audioContext, analyser, frequency, engineGain, engineOsc, musicSource, musicGain, sfxBus;
  let particles = [], explosions = [], laserShots = [], enemyShots = [], hitHazards = new Set(), hitRamps = new Set(), rank = 20, lastPad = -1, launchGoTime = 0, boostLocked = false;
  let laserAmmo = LASER_CAPACITY, laserCharge = 0, laserCooldown = 0, screenFlash = 0, wreckedAt = 0, wreckRank = PILOT_COUNT, wreckBurst = null;
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.6);
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
    try { bestLap = Number(localStorage.getItem(`chroma-best-${trackIndex}`)) || 0; } catch { bestLap = 0; }
  }
  function selectTrack(delta) {
    trackIndex = mod(trackIndex + delta, tracks.length); buildTrack();
    const t = tracks[trackIndex];
    $('track-name').textContent = t.name; $('track-type').textContent = t.type;
    $('track-class').textContent = t.class; $('feed-label').textContent = t.feed;
    document.querySelector('.map-caption').textContent = t.sector;
    document.querySelector('.pill').textContent = `${String(trackIndex + 1).padStart(2, '0')} — ${String(tracks.length).padStart(2, '0')}`;
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
      setupJet();
    } catch { /* The soundtrack still plays if Web Audio is unavailable. */ }
  }
  function playMusic() {
    setupAudio(); audio.volume = .24;
    audio.play().then(updateMusic).catch(() => { $('music-status').textContent = 'SOUNDTRACK / TAP TO PLAY'; });
  }
  function updateMusic() {
    const playing = !audio.paused && !muted;
    document.body.classList.toggle('playing', playing);
    $('music-status').textContent = muted ? 'SOUNDTRACK / MUTED' : playing ? 'NOW PLAYING / LOCAL SOUNDTRACK' : 'SOUNDTRACK / PRESS PLAY';
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
  function playBoostSound(power = 1) {
    playToneSweep(95, 560, .3, 'sawtooth', .055 * power);
    playNoiseBurst(.24, .055 * power, 3400, 260);
  }
  function playLaserSound() {
    playToneSweep(1750, 180, .13, 'square', .048);
    playToneSweep(510, 95, .17, 'sawtooth', .035);
  }
  function playImpactSound(power = 1) {
    playToneSweep(118, 29, .4, 'sawtooth', .095 * power);
    playToneSweep(980, 165, .11, 'square', .045 * power);
    playNoiseBurst(.3, .12 * power, 2400, 115);
  }
  function playExplosionSound(power = 1) {
    playToneSweep(148, 27, .56, 'sawtooth', .12 * power);
    playToneSweep(740, 82, .28, 'triangle', .045 * power);
    playNoiseBurst(.5, .16 * power, 2800, 72);
  }
  function playCatPopSound() {
    playToneSweep(480, 1120, .1, 'triangle', .06);
    playToneSweep(950, 530, .17, 'sine', .04);
  }
  const UFO_COLORS = ['#a7ff4f', '#54f8ff', '#ff73dc', '#fff16b'];
  function makeUfo(slot, seed, spawnedAt) {
    return { slot, seed, distance: 0, lane: 0, dropCooldown: .8 + slot * 1.25 + (spawnedAt > 0 ? 1.6 : 0), color: UFO_COLORS[seed % 4], spawnedAt, screen: null };
  }
  // Robot announcer: Web Speech with a low, flat pitch. Silently skipped where unsupported.
  function robotSay(text, pitch = .05) {
    if (muted || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices(), english = voices.filter(v => /^en/i.test(v.lang));
      voice.voice = english.find(v => /male|daniel|fred|google uk english male|david/i.test(v.name)) || english[0] || null;
      voice.pitch = pitch; voice.rate = .86; voice.volume = 1;
      speechSynthesis.speak(voice);
    } catch { /* Speech is a bonus. */ }
  }
  function primeSpeech() {
    // iOS only allows speech after it was started inside a user gesture once.
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || primeSpeech.done) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); primeSpeech.done = true; } catch { /* ignore */ }
  }
  function showCallout(text, color = '#ddff46') { callout = { text, color, started: time }; }
  function shootDownUfo(ufo) {
    ufos = ufos.filter(u => u !== ufo);
    const start = ufo.screen && time - ufo.screen.at < .3 ? ufo.screen : { x: W * .5, y: H * .38, size: Math.min(W, H) * .03 };
    const seed = Math.floor(time * 997) + ufo.seed * 31;
    // Erratic waypoints across the whole screen, ending near the middle for the big blast.
    const points = [[start.x, start.y]];
    for (let i = 0; i < 5; i++) points.push([W * (.08 + random(seed + i * 3) * .84), H * (.12 + random(seed + i * 3 + 1) * .62)]);
    points.push([W * (.35 + random(seed + 40) * .3), H * (.3 + random(seed + 41) * .2)]);
    crashingUfos.push({ ...ufo, started: time, points, startSize: start.size, spinDir: random(seed + 9) > .5 ? 1 : -1, x: start.x, y: start.y, size: start.size, angle: 0 });
    ufoRespawns.push({ at: time + UFO_CRASH_TIME + 2 + random(seed + 77) * 3, slot: ufo.slot });
    const phrase = KILL_CALLS[Math.floor(random(seed + 5) * KILL_CALLS.length)];
    showCallout(phrase, ufo.color); robotSay(phrase.replace(/!/g, ''));
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
      u.size = lerp(u.startSize, Math.min(W, H) * .11, Math.pow(k, .7)); u.angle += u.spinDir * dt * (2 + k * 16);
      for (let n = 0; n < 3; n++) smoke.push({ x: u.x + (Math.random() - .5) * u.size * .6, y: u.y + (Math.random() - .3) * u.size * .3, r: u.size * (.18 + Math.random() * .2),
        vx: (Math.random() - .5) * 40, vy: -30 - Math.random() * 50, life: 1.1 + Math.random() * .6, max: 1.7, fire: n === 0 && Math.random() < .6 });
      if (k >= 1) {
        u.done = true;
        megaBlasts.push({ x: u.x, y: u.y, started: time, duration: 1.6, color: u.color, seed: Math.floor(time * 1000) });
        shake = Math.max(shake, 2.6); screenFlash = Math.max(screenFlash, 1);
        playExplosionSound(2.6); playToneSweep(70, 18, 1.6, 'sawtooth', .2); playNoiseBurst(1.8, .3, 1800, 40);
        showMessage('MEGA BLAST!', 1);
      }
    }
    crashingUfos = crashingUfos.filter(u => !u.done);
    for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r *= 1 + dt * .9; p.life -= dt; }
    smoke = smoke.filter(p => p.life > 0);
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
  function drawCrashLayer() {
    ctx.save();
    for (const p of smoke) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a * (p.fire ? .85 : .5); ctx.fillStyle = p.fire && a > .7 ? '#ff9a3d' : '#7d768c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const u of crashingUfos) {
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); ctx.shadowColor = u.color; ctx.shadowBlur = 20;
      drawUfoShape(u.size, Math.sin(time * 38) > 0 ? '#ffffff' : u.color); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = .8; ctx.fillStyle = i % 2 ? '#ffd35a' : '#ff6b2e'; ctx.beginPath(); ctx.arc(u.x + (Math.random() - .5) * u.size, u.y + (Math.random() - .5) * u.size * .4, u.size * .06, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (const b of megaBlasts) {
      const k = clamp((time - b.started) / b.duration, 0, 1), R = Math.max(W, H) * (.15 + Math.pow(k, .45) * .75);
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
    if (callout) {
      const k = (time - callout.started) / 1.9;
      if (k >= 1) callout = null;
      else {
        const pop = k < .12 ? 1.7 - k / .12 * .7 : 1, size = Math.min(W * .085, 86) * pop;
        ctx.save(); ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1; ctx.translate(W / 2, H * .3); ctx.rotate(-.06);
        ctx.font = `italic 900 ${size}px 'Barlow Condensed', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = size * .14; ctx.strokeStyle = '#09091a'; ctx.strokeText(callout.text, 0, 0, W * .92);
        ctx.shadowColor = callout.color; ctx.shadowBlur = 30; ctx.fillStyle = callout.color; ctx.fillText(callout.text, 0, 0, W * .92);
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= .55; ctx.fillText(callout.text, 0, -size * .05, W * .92); ctx.restore();
      }
    }
    ctx.restore();
  }
  // Confetti runs on its own overlay canvas so it rains over the results screen too.
  const confettiCanvas = $('confetti'), confettiCtx = confettiCanvas && confettiCanvas.getContext('2d');
  function launchConfetti() {
    const colors = ['#ddff46', '#ff4eb8', '#4df8ff', '#fff16b', '#a88aff', '#ff8a3d', '#ffffff'];
    for (let i = 0; i < 360; i++) {
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
    // Ignition: a roaring whoosh that tears upward, a deep rumble and a screaming turbine.
    playNoiseBurst(1.1 * power, .32 * power, 300, 6500);
    playNoiseBurst(1.4 * power, .22 * power, 5200, 140);
    playToneSweep(48, 160, .9 * power, 'sawtooth', .16 * power);
    playToneSweep(700, 3200, .8 * power, 'sawtooth', .03 * power);
  }
  // ---- Setup: steering (touch or gyro) and screen orientation, chosen on the start screen and remembered.
  // Defaults: gyro steering in landscape. (v2 key: earlier builds saved touch/portrait implicitly.)
  const SETTINGS_KEY = 'morbid-settings-v2';
  const settings = { steering: 'gyro', screen: 'landscape' };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* defaults */ }
  const tilt = { x: 0, neutral: 0, live: false };
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
  function startRace() {
    mode = 'countdown'; position = 0; distance = 0; playerX = 0; speed = 0; energy = 100; elapsed = 0; lap = 1; lapStart = 0;
    laps = []; countdown = 3; rank = PILOT_COUNT; shield = 100; collisionCooldown = 0; wallCooldown = 0; lastPad = -1; hitHazards = new Set(); hitRamps = new Set(); particles = []; explosions = []; laserShots = []; enemyShots = []; bombs = []; laserAmmo = LASER_CAPACITY; laserCharge = 0; laserCooldown = 0; jumpHeight = 0; jumpVelocity = 0; jumpBoostTimer = 0; screenFlash = 0; wreckBurst = null; shake = 0; boosting = false; boostLocked = false; launchGoTime = 0;
    const track = tracks[trackIndex];
    const lanes = [-.6, -.3, 0, .3, .6], colors = ['#ff46bc', '#ffda46', '#9d6aff', '#3dffa6', '#ff774b', '#66aaff', '#e3ff6c', '#ff795e', '#a7ff54', '#61baff', '#e874ff', '#ffcb4d', '#73f1ed', '#fc69a7', '#a2ff72', '#d0a3ff', '#ff8756', '#59d8ff', '#f4f067'];
    rivals = Array.from({ length: PILOT_COUNT - 1 }, (_, i) => ({ distance: 1400 + i * 880, x: lanes[i % lanes.length], lane: lanes[i % lanes.length], speed: (7800 + i * 135) * track.rivalPace, color: colors[i], seed: i, alive: true, hull: 3, boosting: false, boostRemaining: 0, boostCooldown: .4 + random(i + 42) * 1.7, laserCooldown: .55 + random(i + 182) * 4.2 }));
    ufos = Array.from({ length: 2 + Math.floor(trackIndex / 3) }, (_, i) => makeUfo(i, i, -10));
    crashingUfos = []; ufoRespawns = []; smoke = []; megaBlasts = []; confetti = []; callout = null;
    keys.clear(); resetGesture(); $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause-screen').classList.add('hidden');
    $('hud').classList.remove('hidden'); document.body.classList.add('racing'); document.body.classList.remove('paused', 'destroyed');
    $('hud-track').textContent = tracks[trackIndex].name; $('best-label').textContent = bestLap ? `BEST ${formatTime(bestLap)}` : 'BEST — —:—';
    $('result-eyebrow').textContent = 'NEON GRAND PRIX / RACE COMPLETE';
    $('race-message').classList.remove('visible'); messageTime = 0;
    if (settings.steering === 'gyro' && !enableGyro.listening) enableGyro();
    playMusic(); primeSpeech(); calibrateTilt(); applyScreenSetting(true); updateHUD();
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
    mode = 'menu'; keys.clear(); resetGesture(); speed = 0; playerX = 0; jumpHeight = 0; jumpVelocity = 0; jumpBoostTimer = 0; boosting = false;
    explosions = []; laserShots = []; enemyShots = []; bombs = []; ufos = []; particles = []; screenFlash = 0;
    crashingUfos = []; ufoRespawns = []; smoke = []; megaBlasts = []; callout = null;
    $('menu').classList.remove('hidden'); ['hud', 'pause-screen', 'results'].forEach(id => $(id).classList.add('hidden'));
    document.body.classList.remove('racing', 'paused', 'boosting', 'critical', 'destroyed', 'hinting'); hintTime = 0;
  }
  function showMessage(text, duration = 1.5) { $('race-message').textContent = text; $('race-message').classList.add('visible'); messageTime = duration; }
  function createExplosion(worldDistance, lane, color, size = 1, cartoon = false) {
    explosions.push({ distance: worldDistance, lane, color, started: time, duration: cartoon ? .65 : .8, size, cartoon, seed: Math.floor(time * 1000) + explosions.length * 19 });
    shake = Math.max(shake, .55 * size); screenFlash = Math.max(screenFlash, .26 * size);
  }
  function fireLaser() {
    if (laserAmmo <= 0) { laserCooldown = .5; showMessage('LASER CELLS RECHARGING', .7); return; }
    const track = tracks[trackIndex];
    const target = rivals.filter(r => r.alive && r.distance > distance + 1350 && r.distance < distance + 19000 && Math.abs(r.x * track.width - playerX) < track.width * .32)
      .sort((a, b) => a.distance - b.distance)[0];
    const ufoTarget = ufos.filter(u => time - u.spawnedAt > 1 && u.distance < distance + 19000 && Math.abs(u.lane * track.width - playerX) < track.width * .34)
      .sort((a, b) => a.distance - b.distance)[0];
    if (ufoTarget && (!target || ufoTarget.distance < target.distance + 6000)) {
      laserAmmo--; laserCooldown = .24;
      laserShots.push({ distance: ufoTarget.distance, lane: ufoTarget.lane * track.width, air: true, color: track.second, started: time, duration: .2, x: W * .5, y: H * .79 });
      playLaserSound(); shootDownUfo(ufoTarget); return;
    }
    const lane = target ? target.x * track.width : clamp(playerX, -track.width * .85, track.width * .85);
    const targetDistance = target ? target.distance : distance + 9000;
    laserAmmo--; laserCooldown = .24;
    laserShots.push({ distance: targetDistance, lane, color: track.second, started: time, duration: .2, x: W * .5, y: H * .79 });
    playLaserSound();
    if (target) {
      target.hull -= 1; target.stunnedUntil = time + .32;
      createExplosion(target.distance, lane, target.color, target.hull > 0 ? .3 : .45);
      if (target.hull <= 0) {
        knockOut(target); showMessage('RIVAL DESTROYED  /  +1 PLACE', 1.1);
      } else {
        showMessage(`RIVAL HIT  /  HULL ${target.hull}/3`, .8); playImpactSound(.48);
      }
    } else if (laserAmmo === 0) showMessage('TARGET MISSED  /  LASERS LOW', .65);
  }
  // A beaten rival does not vanish at once: it trails smoke, spins out of control and only then explodes.
  const WRECK_TIME = 1.5;
  function knockOut(rival) {
    rival.alive = false; rival.boosting = false;
    rival.dying = { started: time, spin: random(rival.seed + time) > .5 ? 1 : -1 };
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
    mode = 'wrecked'; wreckedAt = time;
    wreckRank = 1 + rivals.filter(r => r.alive && r.distance > distance + 1050).length;
    boosting = false; document.body.classList.remove('boosting'); document.body.classList.add('paused', 'destroyed');
    laserShots = []; enemyShots = []; wreckBurst = { started: time, duration: 1.15, color: '#ffec87', size: 2.9, seed: Math.floor(time * 1000), cartoon: false };
    for (const rival of rivals) {
      if (!rival.alive && !rival.dying) continue;
      rival.alive = false; rival.dying = null; createExplosion(rival.distance, rival.x * tracks[trackIndex].width, rival.color, .85 + random(rival.seed + time) * .45);
    }
    for (const bomb of bombs) if (!bomb.exploded) createExplosion(bomb.distance, bomb.lane * tracks[trackIndex].width, '#ff9b42', .95);
    bombs = [];
    for (const ufo of ufos) createExplosion(ufo.distance, ufo.lane * tracks[trackIndex].width, ufo.color, 1.2);
    ufos = []; ufoRespawns = []; crashingUfos = [];
    for (let i = 0; i < 4; i++) createExplosion(distance + 900 + i * 620, playerX + (i % 2 ? .3 : -.3), i % 2 ? '#49f8ff' : '#ff54c8', 1.1 + i * .12);
    showMessage('SHIELDS DOWN  /  TOTAL CHAIN REACTION', 1.3);
    playExplosionSound(1.65); updateHUD();
  }
  const hullLoss = amount => Math.round(amount / HULL_STRENGTH);
  function damageShield(amount) {
    shield = Math.max(0, shield - amount / HULL_STRENGTH);
    if (shield <= 25) screenFlash = Math.max(screenFlash, .08 + (25 - shield) * .005);
    if (shield === 0) { destroyPlayer(); return true; }
    return false;
  }
  function showWreckResults() {
    mode = 'finished';
    $('result-eyebrow').textContent = 'CATASTROPHIC FAILURE / SHIELDS OFFLINE';
    $('result-title').textContent = 'SHIELDS DOWN.';
    $('result-position').textContent = String(wreckRank).padStart(2, '0');
    $('result-time').textContent = formatTime(elapsed);
    $('result-lap').textContent = laps.length ? formatTime(Math.min(...laps)) : '— —:—';
    $('result-record').textContent = 'HULL LOST / THE WHOLE PACK WENT NOVA';
    $('results').classList.remove('hidden');
  }
  function finishRace() {
    mode = 'finished'; boosting = false; document.body.classList.remove('boosting'); document.body.classList.add('paused');
    $('results').classList.remove('hidden'); $('result-position').textContent = String(rank).padStart(2, '0');
    $('result-title').textContent = rank === 1 ? 'PURE OVERDRIVE.' : rank <= 3 ? 'PODIUM FINISH.' : 'LIMITS REDEFINED.';
    $('result-time').textContent = formatTime(elapsed); const fastest = Math.min(...laps);
    $('result-lap').textContent = formatTime(fastest);
    const record = !bestLap || fastest < bestLap;
    $('result-record').textContent = record ? '✦ NEW CIRCUIT LAP RECORD' : 'Chase the perfect line. The next podium is yours.';
    if (record) { bestLap = fastest; try { localStorage.setItem(`chroma-best-${trackIndex}`, String(bestLap)); } catch {} }
    soundEffect(880, .6);
    if (rank === 1) { launchConfetti(); playFanfare(); robotSay('First place. Flawless victory', .3); }
  }
  function update(dt) {
    time += dt; screenFlash = Math.max(0, screenFlash - dt * 2.4);
    if (analyser && !audio.paused && !muted) { analyser.getByteFrequencyData(frequency); beat = lerp(beat, frequency.slice(0, 12).reduce((a, b) => a + b, 0) / (12 * 255), .2); } else beat *= .95;
    if (engineGain) {
      engineGain.gain.setTargetAtTime(mode === 'racing' && !muted ? .013 + speed / 15000 * .027 : 0, audioContext.currentTime, .1);
      engineOsc.frequency.setTargetAtTime(35 + speed / 85 + (boosting ? 35 : 0), audioContext.currentTime, .08);
    }
    if (jetGain) {
      const jet = mode === 'racing' && !muted ? (jumpBoostTimer > 0 ? 1 : boosting ? .8 : 0) : 0, now = audioContext.currentTime;
      jetGain.gain.setTargetAtTime(jet * .5, now, jet ? .05 : .25);
      jetFilter.frequency.setTargetAtTime(500 + speed / 9 + (jumpBoostTimer > 0 ? 900 : 0), now, .1);
      jetWhineGain.gain.setTargetAtTime(jet * .022, now, jet ? .08 : .3);
      jetWhine.frequency.setTargetAtTime(700 + speed / 8 + (jumpBoostTimer > 0 ? 600 : 0), now, .15);
    }
    if (mode === 'menu') { position = mod(position + dt * 2900, LENGTH); playerX = Math.sin(time * .14) * .18; return; }
    if (mode === 'paused' || mode === 'finished') return;
    if (hintTime > 0) { hintTime -= dt; if (hintTime <= 0 || gesture.moved) { hintTime = 0; document.body.classList.remove('hinting'); } }
    if (mode === 'countdown') {
      const old = Math.ceil(countdown); countdown -= dt;
      $('countdown').textContent = countdown > 0 ? Math.ceil(countdown) : 'GO!';
      if (Math.ceil(countdown) !== old && countdown > 0) soundEffect(440, .13);
      if (countdown <= 0) { mode = 'racing'; launchGoTime = .8; soundEffect(880, .35); calibrateTilt(); }
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
    const keySteer = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    const steer = keySteer || (gyroActive() ? tiltSteer() : gesture.steer);
    const boostHeld = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || gesture.boost;
    if (!boostHeld) boostLocked = false;
    const wasBoosting = boosting;
    boosting = boostHeld && !boostLocked && energy > 0 && speed > 2500 && !brake;
    if (boosting && !wasBoosting) { playBoostSound(1); playJetBlast(.75); }
    if (boosting) {
      speed = Math.min(14900 * machine.top, speed + 9000 * dt); energy = Math.max(0, energy - machine.drain * dt);
      if (energy <= 0) { boostLocked = true; showMessage('BOOST DEPLETED', 1); }
    } else {
      const target = brake ? 3000 : accelerate ? 10700 * machine.top : 6500;
      speed += clamp(target - speed, -(brake ? 10500 : 2200) * dt, (accelerate ? 5300 : 2900) * dt);
      energy = Math.min(100, energy + dt * 7);
    }
    jumpBoostTimer = Math.max(0, jumpBoostTimer - dt);
    if (jumpHeight > 0 || jumpVelocity > 0) {
      jumpHeight = Math.max(0, jumpHeight + jumpVelocity * dt);
      jumpVelocity -= 1450 * dt;
      if (jumpHeight === 0 && jumpVelocity < 0) jumpVelocity = 0;
    }
    updateCrashingUfos(dt);
    for (const ufo of ufos) {
      ufo.distance = distance + 6900 + ufo.slot * UFO_SLOTS_SPACING + Math.sin(time * .38 + ufo.seed) * 280;
      ufo.lane = Math.sin(time * .8 + ufo.seed * 2.1) * .58;
      ufo.dropCooldown -= dt;
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
    playerX -= seg.curve * dt * speed / 10700 * .62;
    steerVisual = lerp(steerVisual, steer, Math.min(1, dt * 9));
    const edgeLimit = .93 * track.width;
    if (Math.abs(playerX) > edgeLimit) {
      const side = Math.sign(playerX); playerX = side * edgeLimit; speed = Math.max(2800, speed - dt * 15500); energy = Math.max(0, energy - dt * 10); shake = .5; screenFlash = Math.max(screenFlash, .08);
      for (let i = 0; i < 3; i++) particles.push({ x: W * .5 + side * 65, y: H * .81, vx: (random(time * 200 + i) - .5) * 600, vy: -random(time * 300 + i) * 260, life: .4, color: '#ffbd45' });
      if (wallCooldown <= 0) {
        wallCooldown = .85; showMessage('BARRIER CONTACT  /  SHIELD -' + hullLoss(10), .7); playImpactSound(.65);
        if (damageShield(10)) { updateHUD(); return; }
      }
    }
    if (seg.pad && Math.abs(playerX - seg.padLane * track.width) < .31 * track.width) {
      // Cyan pads recharge everything: boost energy, hull shield and laser cells.
      energy = Math.min(100, energy + dt * track.recharge); speed = Math.min(15000, speed + dt * 6000);
      shield = Math.min(100, shield + dt * track.recharge * PAD_SHIELD);
      if (laserAmmo < LASER_CAPACITY) {
        laserCharge += dt * track.recharge * PAD_LASER;
        while (laserCharge >= 1 && laserAmmo < LASER_CAPACITY) { laserCharge -= 1; laserAmmo++; }
        if (laserAmmo === LASER_CAPACITY) laserCharge = 0;
      }
      const id = Math.floor(distance / LENGTH) * COUNT + Math.floor(seg.index / track.padEvery);
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
        else if (Math.abs(playerX - lane * track.width) < hazard.radius * track.width) {
          hitHazards.add(id);
          if (hazard.type === 'cat') {
            speed = Math.max(3500, speed * .92); shake = Math.max(shake, .3); screenFlash = Math.max(screenFlash, .13);
            const previousAmmo = laserAmmo;
            laserAmmo = Math.min(LASER_CAPACITY, laserAmmo + 1);
            createExplosion(worldSegment * SEG + SEG * .5, lane * track.width, hazard.color || '#ff9bf2', .82, true);
            showMessage(laserAmmo > previousAmmo ? 'CAT PIXEL-POOF!  LASER +1' : 'CAT PIXEL-POOF!  LASER FULL', 1.05);
            playCatPopSound();
            if (damageShield(4)) { updateHUD(); return; }
          } else {
            speed = Math.max(2500, speed * (1 - (track.hazardPenalty || .24)));
            energy = Math.max(0, energy - (12 + trackIndex * 1.4)); shake = .9; screenFlash = Math.max(screenFlash, .3);
            if (energy <= 0 && boostHeld) boostLocked = true;
            showMessage(hazard.type === 'gate' ? 'LASER GATE HIT  /  SHIELD -' + hullLoss(17 + trackIndex * 1.5) : hazard.type === 'drone' ? 'DRONE COLLISION  /  SHIELD -' + hullLoss(17 + trackIndex * 1.5) : 'MINE STRIKE  /  SHIELD -' + hullLoss(17 + trackIndex * 1.5), 1.1);
            playImpactSound(1 + trackIndex * .055); playExplosionSound(.85); collisionCooldown = Math.max(collisionCooldown, .55);
            createExplosion(worldSegment * SEG + SEG * .5, lane * track.width, hazard.type === 'gate' ? '#ff456d' : track.edge, .75);
            if (damageShield(17 + trackIndex * 1.5)) { updateHUD(); return; }
            for (let i = 0; i < 7; i++) particles.push({ x: W * .5, y: H * .78, vx: (random(time * 200 + i) - .5) * 740, vy: -random(time * 300 + i) * 460, life: .65, color: track.edge });
          }
        }
      }
      const trampoline = roadSegment.trampoline;
      if (trampoline && !hitRamps.has(id) && jumpHeight < 1 && jumpVelocity <= 0 && Math.abs(playerX - trampoline.lane * track.width) < .27 * track.width) {
        hitRamps.add(id); jumpHeight = 2; jumpVelocity = 850; jumpBoostTimer = 1.25; playJetBlast(1.25);
        speed = Math.min(14900 * machine.top, speed + 2200); energy = Math.min(100, energy + 24);
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
        speed = Math.max(2600, speed * .7); shake = 1; screenFlash = Math.max(screenFlash, .38);
        showMessage('UFO BOMB HIT!  SHIELD -' + hullLoss(22), 1.1); playImpactSound(1.2); playExplosionSound(1.15);
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
        if (r.boostCooldown <= 0) {
          r.boosting = true; r.boostRemaining = .82 + random(Math.floor(time * 7) + r.seed * 3) * .72;
          if (Math.abs(r.distance - distance) < 5200) playBoostSound(.42);
        }
      }
      r.distance += r.speed * (r.boosting ? 1.55 : 1) * (1 + .06 * Math.sin(time * .55 + r.seed)) * dt;
      r.x = r.lane + .13 * Math.sin(time * .8 + r.seed * 2);
      r.laserCooldown -= dt;
      if (r.laserCooldown <= 0) {
        r.laserCooldown = 3.2 + random(Math.floor(time * 5) + r.seed * 31) * 2.5;
        if (r.distance > distance + 1700 && r.distance < distance + 17000 && Math.abs(r.x * track.width - playerX) < track.width * .48) {
          enemyShots.push({ sourceDistance: r.distance, sourceLane: r.x, targetLane: clamp(playerX / track.width, -.85, .85), color: r.color,
            started: time, impactAt: time + .46, expires: time + .76, resolved: false, x: W * .5, y: H * .5 });
          showMessage('RIVAL LASER LOCK!  BREAK LINE OF SIGHT', .9); playLaserSound();
        }
      }
      if (Math.abs(r.distance - (distance + 1050)) < 340 && Math.abs(r.x * track.width - playerX) < .2 * track.width && collisionCooldown <= 0 && jumpHeight < 90) {
        if (boosting) {
          knockOut(r); createExplosion(r.distance, r.x * track.width, r.color, .5); speed *= .94; collisionCooldown = .45;
          showMessage('BOOST RAM  /  RIVAL DESTROYED  /  SHIELD -' + hullLoss(6), 1.15); playExplosionSound(1.35);
          if (damageShield(6)) { updateHUD(); return; }
        } else {
          playerX = clamp(playerX + (playerX >= r.x * track.width ? .15 : -.15) * track.width, -edgeLimit, edgeLimit); speed *= .78; shake = .8; collisionCooldown = 1;
          showMessage('HULL CONTACT  /  SHIELD -' + hullLoss(14), .7); playImpactSound(.9);
          if (damageShield(14)) { updateHUD(); return; }
        }
      }
    }
    for (const shot of enemyShots) {
      if (shot.resolved || time < shot.impactAt) continue;
      shot.resolved = true;
      if (jumpHeight < 105 && Math.abs(playerX - shot.targetLane * track.width) < .21 * track.width) {
        shake = Math.max(shake, .55); screenFlash = Math.max(screenFlash, .18);
        showMessage('ENEMY LASER HIT  /  SHIELD -' + hullLoss(8), .95); playImpactSound(.68);
        if (damageShield(8)) { updateHUD(); return; }
      }
    }
    enemyShots = enemyShots.filter(shot => time < shot.expires);
    if (laserAmmo < LASER_CAPACITY) {
      laserCharge += dt / LASER_RECHARGE;
      if (laserCharge >= 1) { laserCharge -= 1; laserAmmo++; if (laserAmmo === LASER_CAPACITY) laserCharge = 0; }
    } else laserCharge = 0;
    if ((keys.has('KeyX') || keys.has('KeyF') || gesture.fire || gesture.fireQueued) && laserCooldown <= 0) { gesture.fireQueued = false; fireLaser(); }
    laserShots = laserShots.filter(shot => time - shot.started < shot.duration);
    explosions = explosions.filter(explosion => time - explosion.started < explosion.duration);
    rank = 1 + rivals.filter(r => r.alive && r.distance > distance + 1050).length;
    if (Math.floor(distance / LENGTH) > Math.floor(prevDistance / LENGTH)) {
      laps.push(elapsed - lapStart); lapStart = elapsed;
      if (laps.length === 3) { finishRace(); } else { lap = laps.length + 1; showMessage(lap === 3 ? 'FINAL LAP — MAKE IT COUNT' : 'LAP 02 — KEEP PUSHING', 2.2); soundEffect(660, .4); }
    }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 450 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0).slice(-100);
    document.body.classList.toggle('boosting', boosting || jumpBoostTimer > 0); updateHUD();
  }
  function updateHUD() {
    $('speed').textContent = String(Math.round(speed / 11.5)).padStart(3, '0');
    $('energy-fill').style.width = energy + '%'; $('energy-fill').style.background = energy < 20 ? '#ff4b85' : 'var(--acid)';
    $('shield-fill').style.width = shield + '%'; $('shield-fill').style.background = shield < 26 ? '#ff426e' : 'var(--cyan)';
    $('shield-text').textContent = Math.round(shield) + '%'; document.body.classList.toggle('critical', shield <= 25 && mode !== 'wrecked');
    $('energy-text').textContent = Math.round(energy) + '%'; $('position').textContent = String(rank).padStart(2, '0');
    $('laser-count').textContent = String(laserAmmo).padStart(2, '0');
    $('laser-fill').style.width = Math.min(100, (laserAmmo + laserCharge) / LASER_CAPACITY * 100) + '%';
    document.body.classList.toggle('lasers-empty', laserAmmo === 0);
    $('lap').textContent = String(lap).padStart(2, '0'); $('timer').textContent = formatTime(elapsed);
    $('progress').style.width = Math.min(100, distance / (LENGTH * 3) * 100) + '%';
    const laserIncoming = enemyShots.some(shot => !shot.resolved && shot.impactAt - time < .55);
    const bombIncoming = bombs.some(bomb => !bomb.exploded && bomb.distance - (distance + 1050) < 4200);
    $('boost-label').textContent = jumpHeight > 80 ? 'AIRBORNE  /  TRAMPOLINE BOOST' : laserIncoming ? 'WARNING  /  RIVAL LASER LOCK' : bombIncoming ? 'UFO BOMB RUN  /  DODGE!' : boosting ? 'ϟ OVERDRIVE ENGAGED ϟ' : energy < 20 ? 'LOW ENERGY / RECHARGING' : 'ANTI-GRAVITY DRIVE ONLINE';
    document.body.classList.toggle('air-raid', laserIncoming || bombIncoming);
    drawMap();
  }
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
      if (s.tower && s.depth > 9 && s.depth < 145) drawScenery(s, t);
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
            if (r.dying) {
              // Spin accelerates and the ship sags as its anti-gravity fails.
              const t = clamp((time - r.dying.started) / WRECK_TIME, 0, 1);
              const flicker = Math.sin(time * 40) > .3 ? '#ffffff' : r.color;
              drawShip(rx, ry + rw * .02 * t, rw * .115, t > .7 ? flicker : r.color, '#1d1828', 0, false, false, false, r.dying.spin * (t * t * 14 + t * 2));
              drawSmoke(rx, ry, rw * .115, r);
            } else drawShip(rx, ry, rw * .115, r.color, '#393156', Math.sin(time + r.seed) * .1, false, r.boosting);
          }
        }
      }
      for (const explosion of explosions) {
        const worldPosition = mod(explosion.distance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 5) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          drawExplosion(lerp(a.x, b.x, f) + rw * explosion.lane, lerp(a.y, b.y, f) - rw * .035, rw * .36, explosion);
        }
      }
      for (const shot of laserShots) {
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
    const shipWidth = Math.min(W * .074, 110), startX = W * .5 + steerVisual * 12, startY = H * .79 - shipWidth * .76;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const shot of laserShots) {
      const alpha = clamp(1 - (time - shot.started) / shot.duration, 0, 1);
      ctx.globalAlpha = alpha;
      line(startX, startY, shot.x, shot.y, shot.color, 8);
      line(startX, startY, shot.x, shot.y, '#ffffff', 2.2);
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
    for (const r of rivals) { if (!r.alive) continue; const [x, y] = point(mod(r.distance, LENGTH) / LENGTH); map.fillStyle = r.color; map.beginPath(); map.arc(x, y, 2.5, 0, TAU); map.fill(); }
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
    ctx.save();
    if (shake > .03 && (mode === 'racing' || mode === 'wrecked')) ctx.translate(Math.sin(time * 121) * shake * 8, Math.cos(time * 93) * shake * 5);
    background(); drawRoad(); drawLaserBeams();
    const isMenu = mode === 'menu';
    const m = machines[shipIndex];
    const shipX = isMenu ? W * .56 : W * .5 + steerVisual * 12;
    const groundShipY = isMenu ? H * .73 : H * .79, shipY = groundShipY - jumpHeight;
    const shipSize = Math.min(W * (isMenu ? .085 : .074), isMenu ? 130 : 110);
    if (mode === 'wrecked' && wreckBurst) drawExplosion(shipX, shipY, shipSize * .9, wreckBurst);
    else {
      if (jumpHeight > 30 && mode === 'racing') {
        ctx.save(); ctx.globalAlpha = clamp(1 - jumpHeight / 420, .18, .7); ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(shipX, groundShipY + shipSize * .12, shipSize * (.52 + jumpHeight / 650), shipSize * .12, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      drawShip(shipX, shipY, shipSize, m.color, m.dark, isMenu ? -.12 : -steerVisual, true, false, jumpHeight > 75);
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
    if (mode !== 'menu') drawCrashLayer();
    if (screenFlash > .015) {
      const flash = ctx.createRadialGradient(W * .5, H * .62, 2, W * .5, H * .62, Math.max(W, H) * .72);
      flash.addColorStop(0, `rgba(255,246,205,${screenFlash * .45})`);
      flash.addColorStop(.24, `rgba(255,55,153,${screenFlash * .2})`); flash.addColorStop(1, '#ff3b9a00');
      ctx.fillStyle = flash; ctx.fillRect(0, 0, W, H);
    }
    if (gesture.id !== null && (mode === 'racing' || mode === 'countdown')) drawStick();
    // A light scanline texture ties the entire scene together.
    ctx.fillStyle = '#05051b12'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  function frame(now) {
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60; previousTime = now;
    update(dt); render(); updateConfetti(dt); requestAnimationFrame(frame);
  }
  $('start').addEventListener('click', startRace); $('again').addEventListener('click', startRace);
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
      if (event.code === 'Enter' && !['BUTTON', 'A'].includes(event.target.tagName)) { if (mode === 'menu' || mode === 'finished') startRace(); else if (mode === 'paused') pauseRace(); }
      if (event.code === 'Escape' || event.code === 'KeyP') pauseRace();
      if (event.code === 'KeyM') toggleMute();
    }
    if (mode === 'racing' || mode === 'countdown') {
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
  const gestureActive = () => mode === 'racing' || mode === 'countdown';
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
    } else { gesture.extra.add(event.pointerId); if (mode === 'racing') gesture.fireQueued = true; }
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
    if (tap && mode === 'racing') gesture.fireQueued = true;
  }
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, endGesture);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  document.querySelectorAll('[data-steer]').forEach(button => button.addEventListener('click', async () => {
    if (button.dataset.steer === 'gyro') {
      setupNote('ASKING FOR MOTION SENSOR ACCESS…');
      if (!await enableGyro()) { settings.steering = 'touch'; setupNote('GYRO NOT AVAILABLE — USING TOUCH'); renderSettings(); return; }
      setupNote('GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS');
    } else setupNote('DRAG ON THE TRACK TO STEER');
    settings.steering = button.dataset.steer; saveSettings(); renderSettings();
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
  window.addEventListener('resize', resize);
  resize(); buildTrack(); requestAnimationFrame(frame);
})();
