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
      jumpVelocity -= (mutator('lowgrav') ? 620 : 1450) * dt;
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
    playerX += steer * dt * (1.08 + speed / 16000) * machine.handling * track.grip * (weather && weather.type === 'snow' ? .62 : 1);
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
      const cut = roadSegment.shortcut;
      if (cut && !hitShortcuts.has(id) && jumpHeight < 90) {
        const miss = Math.abs(playerX - cut.lane * track.width);
        if (miss < .1 * track.width) {
          hitShortcuts.add(id); distance += SHORTCUT_SKIP * SEG; position = mod(distance, LENGTH); raceStats.shortcuts = (raceStats.shortcuts || 0) + 1;
          showCallout('⤳ SHORTCUT!', '#ff9b2e'); showMessage('TUNNEL WARP  /  +' + SHORTCUT_SKIP * SEG / 1000 + ' KM AHEAD', 1.2);
          screenFlash = Math.max(screenFlash, .3); playJetBlast(1); playToneSweep(200, 1400, .4, 'sawtooth', .05); buzz([15, 25, 15]);
        } else if (miss < .3 * track.width) {
          hitShortcuts.add(id); speed = Math.max(2500, speed * .7); shake = .9; screenFlash = Math.max(screenFlash, .25);
          showMessage('TUNNEL WALL!  ' + shieldText(12), 1); playImpactSound(1); createExplosion(worldSegment * SEG + SEG * .5, cut.lane * track.width, '#ff9b2e', .7);
          if (damageShield(12)) { updateHUD(); return; }
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
    if (keys.has('KeyC')) { keys.delete('KeyC'); blink(); }
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
