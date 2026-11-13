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
  let missiles = [], mines = [], hitShortcuts = new Set();
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
  // ---- Drift: steer hard into a tight curve at speed. Costs a little speed, charges boost, pays a bonus at the end.
  let driftCurve = 1, drift = 0, driftTime = 0;
  function updateDrift(dt, steer, seg) {
    const into = steer * Math.sign(seg.curve), tight = Math.abs(seg.curve) >= driftCurve;
    const drifting = mode === 'racing' && tight && into > .6 && speed > 6000 && jumpHeight < 20 && !hyper();
    if (drifting) {
      driftTime += dt; drift = Math.min(1, drift + dt * 3);
      energy = Math.min(100, energy + dt * 14); speed = Math.max(6000, speed - dt * 700);
      if (Math.random() < dt * 30) {
        const side = -Math.sign(seg.curve);
        particles.push({ x: W * .5 + side * 60, y: H * .82, vx: side * (200 + Math.random() * 300), vy: -Math.random() * 200, life: .35, color: Math.random() < .5 ? '#ffd35a' : '#ffffff' });
      }
      if (tutorial) tutorial.drifted = true;
    } else {
      drift = Math.max(0, drift - dt * 4);
      if (driftTime > 1 && drift === 0) {
        const bonus = Math.min(30, Math.round(driftTime * 8));
        energy = Math.min(100, energy + bonus); speed = Math.min(14900 * machines[shipIndex].top * topSpeed(), speed + 900);
        showMessage(`DRIFT ${driftTime.toFixed(1)} S  /  +${bonus} BOOST`, 1); playToneSweep(400, 1200, .25, 'triangle', .05);
        raceStats.drifts = (raceStats.drifts || 0) + 1; profile.stats.driftSeconds = (profile.stats.driftSeconds || 0) + driftTime;
      }
      if (drift === 0) driftTime = 0;
    }
  }
