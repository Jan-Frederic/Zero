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
