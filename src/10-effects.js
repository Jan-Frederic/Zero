  // ==== Race messages, callouts, explosions, confetti.
  function showCallout(text, color = '#ddff46') { callout = { text, color, started: time }; }
  // Confetti runs on its own overlay canvas so it rains over the results screen too.
  const confettiCanvas = $('confetti'), confettiCtx = confettiCanvas && confettiCanvas.getContext('2d');
  function launchConfetti() {
    const colors = ['#ddff46', '#ff4eb8', '#4df8ff', '#fff16b', '#a88aff', '#ff8a3d', '#ffffff'];
    for (let i = 0, n = lowFx() ? 110 : 360; i < n; i++) {
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
  function showMessage(text, duration = 1.5) { $('race-message').textContent = text; $('race-message').classList.add('visible'); messageTime = duration; }
  function createExplosion(worldDistance, lane, color, size = 1, cartoon = false) {
    explosions.push({ distance: worldDistance, lane, color, started: time, duration: cartoon ? .65 : .8, size, cartoon, seed: Math.floor(time * 1000) + explosions.length * 19 });
    shake = Math.max(shake, .55 * size); screenFlash = Math.max(screenFlash, .26 * size);
  }
