  // ==== Race start/pause/garage, lasers, wrecks, lives, results.
  function startRace() {
    if (gameMode() === 'endless') { startEndless(); return; }
    if (gameMode() === 'cup') prepareCupRace(); else cup = null;
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
    endlessRun = false; trialRun = gameMode() === 'trial'; survival = gameMode() === 'survival' ? { level: 1 } : null;
    $('lap-total').textContent = survival ? '∞' : String(LAP_COUNT).padStart(2, '0');
    crashingUfos = []; ufoRespawns = []; smoke = []; megaBlasts = []; confetti = []; callout = null; hyperTime = 0; hitGates = new Set(); power = {}; bubbleHits = 0; hitPowerups = new Set(); hitShortcuts = new Set(); blinkReadyAt = 0; rivalMissiles = []; missiles = []; mines = []; slip = 0; slipShown = false; drift = 0; driftTime = 0; ufoKills = 0; boss = null; bossAttacks = [];
    musicHold = 0; raceEarned = 0; lostLifeThisRace = false; raceStats = { ufos: 0, rivals: 0, cats: 0, boost: 0, lives: 0 }; weather = null; nextWeatherAt = time + 22 + Math.random() * 10; lives = startLives(); raceRespawnAt = 0; raceInvulnUntil = 0; clearFinale(); keys.clear(); resetGesture(); $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause-screen').classList.add('hidden');
    $('hud').classList.remove('hidden'); document.body.classList.add('racing'); document.body.classList.remove('paused', 'destroyed');
    $('hud-track').textContent = tracks[trackIndex].name; $('best-label').textContent = bestLap ? `BEST ${formatTime(bestLap)}` : 'BEST — —:—';
    $('result-eyebrow').textContent = 'NEON GRAND PRIX / RACE COMPLETE'; $('cup-standings').classList.add('hidden'); $('story-new').classList.add('hidden'); cancelClip(); if ($('again').firstElementChild) $('again').firstElementChild.textContent = 'RACE AGAIN';
    $('race-message').classList.remove('visible'); messageTime = 0;
    if (settings.steering === 'gyro' && !gyroListening) enableGyro();
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
    clearFinale(); cancelClip(); mode = 'menu'; keys.clear(); resetGesture(); speed = 0; playerX = 0; jumpHeight = 0; jumpVelocity = 0; jumpBoostTimer = 0; boosting = false;
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
    const extraBeams = (powerOn('multi') ? 2 : 0) + (ability() === 'twin' ? 1 : 0);
    if (target && extraBeams) {
      // Multi-laser and the TWIN machine: more beams fan out to the next rivals in a wide cone.
      const extra = rivals.filter(r => r !== target && r.alive && r.distance > distance + 1350 && r.distance < distance + 22000 && Math.abs(r.x * track.width - playerX) < track.width * .75)
        .sort((a, b) => a.distance - b.distance).slice(0, extraBeams);
      for (const r of extra) {
        laserShots.push({ distance: r.distance, lane: r.x * track.width, color: powerOn('multi') ? POWERUPS.multi.color : machines[shipIndex].color, started: time, duration: .2, x: W * .5, y: H * .79 });
        r.hull -= 1; createExplosion(r.distance, r.x * track.width, r.color, r.hull > 0 ? .3 : .45);
        if (r.hull <= 0) knockOut(r);
      }
    }
    if (target && target.bubbleUntil > time && !hyper()) {
      target.bubbleUntil = 0; createExplosion(target.distance, lane, '#4df8ff', .35); showMessage('RIVAL SHIELD POPPED', .8); playToneSweep(900, 1500, .2, 'sine', .05); return;
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
      raceStats.nemeses = (raceStats.nemeses || 0) + 1; mission('nemesis'); showCallout(`${rival.nemesis.name} IS OUT!`, rival.nemesis.color);
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
    if (survival) { finishSurvival(); return; }
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
    finishClip();
    recordRaceStats(true);
    if (trialRun) { finishTrial(); return; }
    addCredits(Math.max(0, (PILOT_COUNT + 1 - rank) * 10) + (rank <= 3 ? 100 : 0) + (rank === 1 ? 150 : 0), `P${rank} FINISH`);
    unlockAchievement('first-race'); if (rank <= 3) { unlockAchievement('podium'); mission('podium'); } if (rank === 1) { unlockAchievement('win'); if (!lostLifeThisRace) unlockAchievement('flawless'); }
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
    $('story-new').classList.toggle('hidden', !unlockedNow); if (unlockedNow) renderStoryButton();
    if (record) { bestLap = fastest; try { localStorage.setItem(`chroma-best-${trackIndex}`, String(bestLap)); } catch {} }
    soundEffect(880, .6);
    invasionArmed = rank === 1;
    if (cup) showCupResults();
    else if (rank === 1) { launchConfetti(); playFanfare(); robotSay('First place. Flawless victory', 'first-place'); }
    checkDaily();
  }
  // ---- Rival AI: dodge hazards ahead, block the player (aggressive pilots), and use power-ups of their own.
  let rivalMissiles = [];
  function rivalAI(r, dt, track) {
    if (r.baseLane === undefined) r.baseLane = r.lane;
    let target = r.baseLane; r.dodging = false; r.blocking = false;
    const at = Math.floor(mod(r.distance, LENGTH) / SEG);
    for (let k = 2; k < 14; k++) {
      const h = segments[mod(at + k, COUNT)].hazard;
      if (!h || h.type === 'cat') continue;
      const hl = hazardLane(h);
      if (Math.abs(hl - r.lane) < h.radius + .16) { target = hl > 0 ? hl - h.radius - .28 : hl + h.radius + .28; r.dodging = true; break; }
    }
    const ahead = r.distance - (distance + 1050);
    if (!r.dodging && !r.nemesis && r.seed % 3 === 0 && ahead > 250 && ahead < 2600 && mode === 'racing') { target = clamp(playerX / track.width, -.7, .7); r.blocking = true; }
    r.lane = lerp(r.lane, clamp(target, -.75, .75), Math.min(1, dt * (r.dodging ? 4 : r.blocking ? 1.8 : 1)));
    // Power-ups: a homing missile at the player from behind, or a protective bubble when ahead.
    if (r.powerCooldown === undefined) r.powerCooldown = 15 + random(r.seed + 600) * 25;
    r.powerCooldown -= dt * worldPace();
    if (r.powerCooldown <= 0 && mode === 'racing' && empSlow(r) === 1) {
      r.powerCooldown = 22 + random(Math.floor(time) + r.seed) * 20;
      if (ahead < -300 && ahead > -7000 && (r.nemesis || r.seed % 4 === 1)) {
        rivalMissiles.push({ distance: r.distance, lane: r.x, from: r, started: time, speed: Math.max(speed, 7000) + 5200 });
        showMessage('INCOMING MISSILE  /  DODGE OR JUMP!', 1.2); playToneSweep(1400, 700, .5, 'square', .04);
      } else if (ahead > 0 && ahead < 15000) r.bubbleUntil = time + 8;
    }
  }
  function updateRivalMissiles(dt, track) {
    for (const m of rivalMissiles) {
      m.distance += m.speed * dt;
      m.lane = lerp(m.lane, playerX / track.width, Math.min(1, dt * 1.4)); // limited turn rate: a sharp swerve shakes it off
      if (m.distance < distance + 1050) continue;
      m.done = true;
      if (jumpHeight < 90 && Math.abs(m.lane * track.width - playerX) < .16 * track.width) {
        createExplosion(distance + 1100, playerX, '#ff8a2e', 1); shake = Math.max(shake, .8); screenFlash = Math.max(screenFlash, .3);
        showMessage('MISSILE HIT  /  ' + shieldText(14), 1); playExplosionSound(1); damageShield(14);
      } else { showMessage('MISSILE DODGED!', .8); createExplosion(distance + 2600, m.lane * track.width, '#ff8a2e', .7); }
    }
    rivalMissiles = rivalMissiles.filter(m => !m.done && time - m.started < 6);
  }
