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
