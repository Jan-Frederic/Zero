  // ==== UFOs, bombs, crash paths and the mothership.
  const UFO_COLORS = ['#a7ff4f', '#54f8ff', '#ff73dc', '#fff16b'];
  function makeUfo(slot, seed, spawnedAt) {
    return { slot, seed, distance: 0, lane: 0, dropCooldown: .8 + slot * 1.25 + (spawnedAt > 0 ? 1.6 : 0), color: UFO_COLORS[seed % 4], spawnedAt, screen: null };
  }
  function shootDownUfo(ufo) {
    mission('ufos');
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
    if (season() === 'halloween') { drawPumpkin(size); return; }
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
          for (const [w, c] of /** @type {[number, string][]} */ ([[W * .07, '#ff2d5588'], [W * .035, '#ff7a90'], [W * .012, '#ffffff']])) {
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
  // Halloween: the saucers become flying jack-o'-lanterns.
  function drawPumpkin(size) {
    const r = size * .62;
    ctx.fillStyle = '#ff7a1a'; ctx.strokeStyle = '#a83c00'; ctx.lineWidth = Math.max(1, size * .04);
    for (const dx of [-.45, .45, 0]) { ctx.beginPath(); ctx.ellipse(dx * r, 0, r * .62, r * .8, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#3f7a1a'; ctx.fillRect(-r * .08, -r * 1.05, r * .16, r * .3);
    ctx.fillStyle = Math.sin(time * 9) > -.6 ? '#ffe36b' : '#ffb347';
    const tri = (x, y, s, up) => { ctx.beginPath(); ctx.moveTo(x - s, y + (up ? s * .7 : -s * .7)); ctx.lineTo(x + s, y + (up ? s * .7 : -s * .7)); ctx.lineTo(x, y + (up ? -s * .7 : s * .7)); ctx.fill(); };
    tri(-r * .32, -r * .18, r * .17, true); tri(r * .32, -r * .18, r * .17, true);
    ctx.beginPath(); ctx.moveTo(-r * .5, r * .2); for (let i = 0; i <= 6; i++) ctx.lineTo(-r * .5 + i * r / 6, r * (i % 2 ? .45 : .28)); ctx.lineTo(r * .5, r * .2); ctx.quadraticCurveTo(0, r * .62, -r * .5, r * .2); ctx.fill();
  }
