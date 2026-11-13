  // ==== Power-ups: magnet, shield bubble, time warp, multi-laser.
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
  const worldPace = () => powerOn('warp') ? .45 : 1;
  function collectPowerup(type) {
    if (!profile.stats.powerTypes.includes(type)) { profile.stats.powerTypes.push(type); saveProfile(); }
    if (profile.stats.powerTypes.length >= 4) unlockAchievement('collector');
    const p = POWERUPS[type];
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
