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
  function drawJets(s, jx, jy, color, scale = 1) {
    for (const side of [-1, 1]) {
      const x = side * jx, flame = s * (.45 + Math.random() * .3) * scale;
      const g = ctx.createLinearGradient(0, jy, 0, jy + flame); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, color); g.addColorStop(.7, 'rgba(138,91,255,.5)'); g.addColorStop(1, 'rgba(138,91,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * .08 * scale, jy); ctx.lineTo(x + s * .08 * scale, jy); ctx.lineTo(x, jy + flame); ctx.fill();
      ctx.fillStyle = '#3b3550'; ctx.strokeStyle = '#9b8cff'; ctx.lineWidth = Math.max(1, s * .02); ctx.beginPath(); ctx.ellipse(x, jy - s * .06, s * .1 * scale, s * .13 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  function drawHitFlash(s, flash, rx = .55, ry = .45) {
    if (flash <= 0) return;
    ctx.globalAlpha = flash * .7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, s * rx, s * ry, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  // A one-eyed commander peering through a brass monocle (with a little top hat, of course).
  function drawCyclops(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    drawJets(s, s * .5, s * .3, '#ff9bf2', .9);
    for (let i = 0; i < 7; i++) { // tentacle beard
      const bx = (i - 3) * s * .09, ph = time * 2.6 + i;
      for (let k = 1; k <= 7; k++) { const t = k / 7, px = bx + Math.sin(ph + t * 3) * s * .07 * t, py = s * .3 + t * s * .38; ctx.fillStyle = k % 2 ? '#4a1d6e' : '#5c2688'; ctx.beginPath(); ctx.arc(px, py, s * .05 * (1 - t * .75), 0, TAU); ctx.fill(); }
    }
    const head = ctx.createRadialGradient(-s * .15, -s * .2, s * .05, 0, 0, s * .55); head.addColorStop(0, '#e2b8ff'); head.addColorStop(.5, '#8a45d0'); head.addColorStop(1, '#2a0d4a');
    ctx.fillStyle = head; ctx.shadowColor = '#c38bff'; ctx.shadowBlur = 28; ctx.beginPath(); ctx.ellipse(0, 0, s * .5, s * .44, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(40,0,60,.55)'; ctx.lineWidth = Math.max(1, s * .012);
    for (let w = 0; w < 4; w++) { ctx.beginPath(); ctx.arc(0, -s * .05, s * (.3 + w * .04), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.fillStyle = '#111'; ctx.fillRect(-s * .14, -s * .66, s * .28, s * .24); ctx.fillRect(-s * .22, -s * .44, s * .44, s * .05); // top hat
    ctx.fillStyle = '#ff4eb8'; ctx.fillRect(-s * .14, -s * .49, s * .28, s * .04);
    const er = s * .2, px = look * er * .35;
    ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(0, -s * .03, er, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(.7, s * .006);
    for (let v = 0; v < 7; v++) { const a = v * .9 + .2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * er, -s * .03 + Math.sin(a) * er); ctx.quadraticCurveTo(Math.cos(a + .2) * er * .7, -s * .03 + Math.sin(a + .2) * er * .7, Math.cos(a) * er * .5, -s * .03 + Math.sin(a) * er * .5); ctx.stroke(); }
    const iris = ctx.createRadialGradient(px, -s * .03, 1, px, -s * .03, er * .55); iris.addColorStop(0, '#ffd34d'); iris.addColorStop(1, '#d0400f');
    ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(px, -s * .03, er * .55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, -s * .03, er * .12, er * .45, 0, 0, TAU); ctx.fill();
    // the monocle: brass ring, crosshair, glint and chain
    const ring = ctx.createLinearGradient(-er, -er, er, er); ring.addColorStop(0, '#ffe08a'); ring.addColorStop(.5, '#c48a1a'); ring.addColorStop(1, '#7a520c');
    ctx.strokeStyle = ring; ctx.lineWidth = s * .045; ctx.beginPath(); ctx.arc(0, -s * .03, er * 1.18, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,40,40,.55)'; ctx.lineWidth = Math.max(.8, s * .006); line(-er, -s * .03, er, -s * .03, 'rgba(255,40,40,.55)', Math.max(.8, s * .006)); line(0, -s * .03 - er, 0, -s * .03 + er, 'rgba(255,40,40,.55)', Math.max(.8, s * .006));
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.arc(0, -s * .03, er * .9, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = '#d9a43a';
    for (let k = 0; k < 9; k++) { const t = k / 8; ctx.beginPath(); ctx.arc(er * 1.05 + t * s * .18, -s * .03 + er * .6 + Math.sin(t * Math.PI) * s * .12 + t * s * .12, s * .014, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2a0418'; ctx.beginPath(); ctx.ellipse(0, s * .27, s * .17, s * .05, 0, 0, TAU); ctx.fill(); // grin
    ctx.fillStyle = '#fff6d0'; for (let t = 0; t < 7; t++) { const tx = (t - 3) * s * .045; ctx.beginPath(); ctx.moveTo(tx - s * .015, s * .23); ctx.lineTo(tx + s * .015, s * .23); ctx.lineTo(tx, s * .27); ctx.fill(); }
    drawHitFlash(s, flash, .52, .46);
    ctx.restore();
  }
  // A pulsating larva with an exposed brain, a lamprey mouth, dozens of beady eyes, dripping pus and flies.
  function drawMaggot(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 4; i >= 0; i--) { // translucent segmented body
      const sy = s * (.36 - i * .02) - i * s * .02, sw = s * (.34 + i * .045) * (1 + Math.sin(time * 4 + i) * .04), sh = s * .14;
      ctx.fillStyle = i % 2 ? '#efd9a0' : '#f6e6b8'; ctx.beginPath(); ctx.ellipse(0, sy + i * s * .09, sw, sh, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,40,.5)'; ctx.lineWidth = Math.max(1, s * .01); ctx.stroke();
      ctx.fillStyle = 'rgba(90,50,30,.35)'; ctx.beginPath(); ctx.ellipse(Math.sin(time * 2 + i) * s * .06, sy + i * s * .09, sw * .4, sh * .45, 0, 0, TAU); ctx.fill();
    }
    const head = ctx.createRadialGradient(-s * .1, -s * .15, s * .04, 0, 0, s * .5); head.addColorStop(0, '#fff3c8'); head.addColorStop(.6, '#e6c47a'); head.addColorStop(1, '#8a6a2a');
    ctx.fillStyle = head; ctx.shadowColor = '#f2e85a'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(0, -s * .02, s * .42, s * .34, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff9fb8'; ctx.beginPath(); ctx.ellipse(0, -s * .28, s * .3, s * .17, 0, Math.PI, TAU); ctx.fill(); // exposed brain
    ctx.strokeStyle = '#c4566f'; ctx.lineWidth = Math.max(1, s * .012);
    for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let t = 0; t <= 10; t++) { const bx = -s * .26 + t / 10 * s * .52, by = -s * .3 - k * s * .02 + Math.sin(t * 2.2 + k + time * 3) * s * .015; if (t) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); } ctx.stroke(); }
    const mr = s * .17, mx = look * s * .03, my = s * .06; // lamprey mouth with rotating rings of teeth
    ctx.fillStyle = '#5a0614'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.arc(mx, my, mr * .35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2c8';
    for (let ringN = 0; ringN < 3; ringN++) {
      const rr = mr * (.92 - ringN * .22), n = 14 - ringN * 3, rot = time * (ringN % 2 ? -1.5 : 1.2);
      for (let t = 0; t < n; t++) { const a = t / n * TAU + rot; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a - .12) * rr, my + Math.sin(a - .12) * rr); ctx.lineTo(mx + Math.cos(a + .12) * rr, my + Math.sin(a + .12) * rr); ctx.lineTo(mx + Math.cos(a) * rr * .72, my + Math.sin(a) * rr * .72); ctx.fill(); }
    }
    for (let e = 0; e < 14; e++) { // beady eyes
      const a = Math.PI * (1.05 + e / 13 * .9), d = s * (.27 + (e % 3) * .035), ex = Math.cos(a) * d * 1.2, ey = Math.sin(a) * d * .55 - s * .02;
      ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(ex, ey, s * (.018 + (e % 3) * .006), 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - s * .005, ey - s * .006, s * .005, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#e6f04a'; // pustules and pus drips
    for (let p = 0; p < 6; p++) { const a = random(p + 300) * TAU, r = s * (.15 + random(p + 310) * .2); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .7, s * (.02 + random(p + 320) * .02), 0, TAU); ctx.fill(); }
    for (let d = 0; d < 4; d++) { const dx = (d - 1.5) * s * .14, ph = mod(time * .9 + d * .27, 1), dy = s * (.2 + ph * .55); ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(dx, dy, s * .018, s * .03, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (let fl = 0; fl < 6; fl++) { // flies
      const a = time * (3 + fl * .4) + fl * 1.1, fx = Math.cos(a) * s * (.55 + fl * .03), fy = Math.sin(a * 1.3) * s * .35 - s * .1;
      ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.beginPath(); ctx.ellipse(fx - s * .012, fy - s * .012, s * .014, s * .008, -.5, 0, TAU); ctx.ellipse(fx + s * .012, fy - s * .012, s * .014, s * .008, .5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(fx, fy, s * .012, 0, TAU); ctx.fill();
    }
    drawHitFlash(s, flash, .46, .5);
    ctx.restore();
  }
  // A chrome war machine: plated skull, scanning red visor, grille jaw, cannon arms and big thrusters.
  function drawRobot(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    drawJets(s, s * .32, s * .38, '#7dfcff', 1.25);
    for (const side of [-1, 1]) { // cannon arms
      ctx.save(); ctx.translate(side * s * .52, s * .02); ctx.rotate(side * (.25 + Math.sin(time * 1.5) * .08));
      ctx.fillStyle = '#6b7385'; ctx.fillRect(-s * .06, -s * .05, s * .12, s * .36);
      ctx.fillStyle = '#2b2f3a'; ctx.fillRect(-s * .045, s * .3, s * .09, s * .14);
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(0, s * .44, s * .03 + Math.abs(Math.sin(time * 6)) * s * .01, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c8ced8'; ctx.lineWidth = Math.max(1, s * .012); ctx.beginPath(); ctx.arc(0, 0, s * .07, time * 3, time * 3 + 4.5); ctx.stroke();
      ctx.restore();
    }
    const plate = ctx.createLinearGradient(0, -s * .45, 0, s * .35); plate.addColorStop(0, '#e6ebf2'); plate.addColorStop(.5, '#8a93a6'); plate.addColorStop(1, '#3d4352');
    ctx.fillStyle = plate; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(-s * .38, -s * .3); ctx.lineTo(-s * .26, -s * .44); ctx.lineTo(s * .26, -s * .44); ctx.lineTo(s * .38, -s * .3); ctx.lineTo(s * .42, s * .14); ctx.lineTo(s * .24, s * .34); ctx.lineTo(-s * .24, s * .34); ctx.lineTo(-s * .42, s * .14); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(30,34,44,.7)'; ctx.lineWidth = Math.max(1, s * .01);
    line(-s * .4, -s * .1, s * .4, -s * .1, 'rgba(30,34,44,.7)', Math.max(1, s * .01)); line(0, -s * .44, 0, -s * .2, 'rgba(30,34,44,.7)', Math.max(1, s * .01));
    ctx.fillStyle = '#3d4352';
    for (const [rx, ry] of [[-.32, -.26], [.32, -.26], [-.36, .1], [.36, .1], [-.2, .28], [.2, .28]]) { ctx.beginPath(); ctx.arc(rx * s, ry * s, s * .016, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#1a0006'; ctx.fillRect(-s * .32, -s * .2, s * .64, s * .12); // visor
    const scan = Math.sin(time * 2.5) * .5 + .5, vg = ctx.createLinearGradient(-s * .32, 0, s * .32, 0);
    vg.addColorStop(0, '#5a0010'); vg.addColorStop(clamp(scan - .15, 0, 1), '#ff2030'); vg.addColorStop(clamp(scan, 0, 1), '#ffffff'); vg.addColorStop(clamp(scan + .15, 0, 1), '#ff2030'); vg.addColorStop(1, '#5a0010');
    ctx.fillStyle = vg; ctx.shadowColor = '#ff2030'; ctx.shadowBlur = 18; ctx.fillRect(-s * .3, -s * .18, s * .6, s * .08); ctx.shadowBlur = 0;
    for (const side of [-1, 1]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * s * .14 + look * s * .05, -s * .14, s * .025, 0, TAU); ctx.fill(); }
    const open = Math.max(0, Math.sin(time * 3)) * s * .05; // grille jaw
    ctx.fillStyle = '#20232c'; ctx.fillRect(-s * .2, s * .06 + open * .3, s * .4, s * .16 + open);
    ctx.fillStyle = '#c8ced8'; for (let b = 0; b < 7; b++) ctx.fillRect(-s * .18 + b * s * .06, s * .08 + open * .3, s * .025, s * .12 + open);
    line(0, -s * .44, 0, -s * .62, '#c8ced8', Math.max(1, s * .015)); // antenna
    ctx.fillStyle = Math.sin(time * 8) > 0 ? '#ff2030' : '#5a0010'; ctx.beginPath(); ctx.arc(0, -s * .64, s * .03, 0, TAU); ctx.fill();
    drawHitFlash(s, flash, .44, .42);
    ctx.restore();
  }
  // A faceted ice-crystal spider: prism body, eight jointed legs, a cluster of glowing eyes and dripping fangs.
  function drawSpider(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { // legs
      const base = -.3 + i * .2, swing = Math.sin(time * 4 + i + (side > 0 ? 1.5 : 0)) * .12;
      const kx = side * s * (.45 + i * .04), ky = s * (base - .25 + swing), fx = side * s * (.72 + i * .02), fy = s * (base + .35 + swing * .5);
      ctx.strokeStyle = '#2b4d6b'; ctx.lineWidth = s * .05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(side * s * .18, s * base * .6); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#9ff4ff'; ctx.lineWidth = s * .018; ctx.stroke();
      ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + side * s * .03, fy + s * .1); ctx.lineTo(fx - side * s * .02, fy + s * .02); ctx.fill();
    }
    const facets = [[-.32, 0], [-.18, -.28], [.18, -.28], [.32, 0], [.18, .3], [-.18, .3]];
    ctx.shadowColor = '#7dfcff'; ctx.shadowBlur = 28;
    for (let k = 0; k < 6; k++) { // abdomen made of crystal facets
      const [ax, ay] = facets[k], [bx, by] = facets[(k + 1) % 6];
      ctx.fillStyle = `hsla(${190 + k * 8},90%,${55 + (k % 3) * 12}%,.9)`; ctx.beginPath(); ctx.moveTo(0, s * .02); ctx.lineTo(ax * s, ay * s); ctx.lineTo(bx * s, by * s); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, s * .008);
    ctx.beginPath(); facets.forEach(([fx, fy], k) => ctx[k ? 'lineTo' : 'moveTo'](fx * s, fy * s)); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#132a3d'; ctx.beginPath(); ctx.ellipse(0, s * .38, s * .2, s * .14, 0, 0, TAU); ctx.fill(); // head
    for (let e = 0; e < 8; e++) { // eye cluster
      const ex = (e % 4 - 1.5) * s * .07, ey = s * (.33 + Math.floor(e / 4) * .07), er = s * (e % 4 === 1 || e % 4 === 2 ? .035 : .022);
      ctx.fillStyle = '#ff2a5a'; ctx.shadowColor = '#ff2a5a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(ex + look * s * .01, ey, er, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const side of [-1, 1]) { // fangs with dripping venom
      ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.moveTo(side * s * .06, s * .48); ctx.lineTo(side * s * .1, s * .62); ctx.lineTo(side * s * .02, s * .5); ctx.fill();
      const drip = mod(time * .8 + (side > 0 ? .5 : 0), 1); ctx.fillStyle = '#9dff5a'; ctx.globalAlpha = 1 - drip; ctx.beginPath(); ctx.arc(side * s * .09, s * (.63 + drip * .3), s * .015, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    drawHitFlash(s, flash, .4, .45);
    ctx.restore();
  }
  // A space shark that swims through wormholes: gills, rows of teeth, a dead eye and jet fins.
  function drawShark(x, y, s, flash, look, attacking = false) {
    ctx.save(); ctx.translate(x, y); if (attacking) ctx.rotate(-Math.PI / 2);
    if (!attacking) { // swirling wormhole behind it
      for (let r = 4; r > 0; r--) { ctx.strokeStyle = `hsla(${(time * 120 + r * 50) % 360},100%,60%,${.12 + r * .05})`; ctx.lineWidth = s * .03; ctx.beginPath(); ctx.ellipse(0, 0, s * (.45 + r * .14), s * (.2 + r * .07), time * (r % 2 ? 1 : -1) * .7, 0, TAU); ctx.stroke(); }
      drawJets(s, s * .38, s * .2, '#ffb347', .8);
    }
    const wag = Math.sin(time * 5) * .12;
    ctx.fillStyle = '#4a5a72'; ctx.beginPath(); ctx.moveTo(s * .45, 0); ctx.lineTo(s * .75, -s * .22 + wag * s); ctx.lineTo(s * .66, 0); ctx.lineTo(s * .75, s * .2 + wag * s); ctx.closePath(); ctx.fill(); // tail
    ctx.beginPath(); ctx.moveTo(-s * .02, -s * .14); ctx.lineTo(s * .12, -s * .42); ctx.lineTo(s * .2, -s * .14); ctx.fill(); // dorsal fin
    const body = ctx.createLinearGradient(0, -s * .2, 0, s * .2); body.addColorStop(0, '#7b8ca8'); body.addColorStop(.55, '#4a5a72'); body.addColorStop(.56, '#e9edf2'); body.addColorStop(1, '#c9d0da');
    ctx.fillStyle = body; ctx.shadowColor = '#ff6a3d'; ctx.shadowBlur = attacking ? 0 : 24;
    ctx.beginPath(); ctx.moveTo(-s * .55, s * .02); ctx.quadraticCurveTo(-s * .4, -s * .22, s * .1, -s * .17); ctx.quadraticCurveTo(s * .45, -s * .12, s * .5, 0); ctx.quadraticCurveTo(s * .4, s * .16, 0, s * .18); ctx.quadraticCurveTo(-s * .45, s * .2, -s * .55, s * .02); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2b3445'; ctx.lineWidth = Math.max(1, s * .012); for (let gl = 0; gl < 4; gl++) { ctx.beginPath(); ctx.moveTo(-s * (.18 - gl * .05), -s * .08); ctx.quadraticCurveTo(-s * (.21 - gl * .05), 0, -s * (.18 - gl * .05), s * .08); ctx.stroke(); }
    const open = attacking ? .9 : .4 + Math.sin(time * 3) * .3; // jaws
    ctx.fillStyle = '#5a0614'; ctx.beginPath(); ctx.moveTo(-s * .55, s * .02); ctx.lineTo(-s * .3, -s * .02); ctx.lineTo(-s * .3, s * (.05 + open * .12)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffbe6'; for (let t = 0; t < 6; t++) { const tx = -s * (.52 - t * .04); ctx.beginPath(); ctx.moveTo(tx, s * .0); ctx.lineTo(tx + s * .02, s * .0); ctx.lineTo(tx + s * .01, s * .045); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx, s * (.05 + open * .1)); ctx.lineTo(tx + s * .02, s * (.05 + open * .1)); ctx.lineTo(tx + s * .01, s * (.01 + open * .1)); ctx.fill(); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-s * .36 + look * s * .005, -s * .06, s * .035, 0, TAU); ctx.fill(); // dead eye
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(-s * .365, -s * .065, s * .01, 0, TAU); ctx.fill();
    if (!attacking) drawHitFlash(s, flash, .55, .25);
    ctx.restore();
  }
  function drawFinalBoss(L, look) {
    const f = finale, kind = f.cfg.type.kind, y = L.bossY;
    if (kind === 'cyclops') drawCyclops(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'maggot') drawMaggot(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'robot') drawRobot(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'spider') drawSpider(L.bossX, y, L.bs, f.boss.flash, look);
    else if (kind === 'shark') drawShark(L.bossX, y, L.bs, f.boss.flash, look);
    else drawOverlord(L.bossX, y, L.bs, f.boss.flash, look);
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
  // ---------- finale drawing
  function drawSpace() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05010f'); g.addColorStop(.6, '#13062b'); g.addColorStop(1, '#030008');
    ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const nx = W * (.15 + random(i + 500) * .7), ny = H * (.12 + random(i + 510) * .5), nr = Math.max(W, H) * (.25 + random(i + 520) * .2);
      const neb = ctx.createRadialGradient(nx, ny, 1, nx, ny, nr); neb.addColorStop(0, `hsla(${[280, 140, 320, 190][i]},90%,45%,.26)`); neb.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = neb; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    for (let i = 0; i < 150; i++) {
      const speed = .05 + random(i + 600) * .3, x = random(i + 610) * W, y = mod(random(i + 620) * H + time * H * speed, H);
      ctx.globalAlpha = .35 + random(i + 630) * .65; line(x, y, x, y + 2 + speed * 34, i % 5 ? '#cfe8ff' : '#ffb5f9', speed > .22 ? 2 : 1);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawCritter(x, y, s, color, look, wob) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, s * .07);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * .18, s * .12); ctx.quadraticCurveTo(i * s * .3 + Math.sin(wob + i) * s * .12, s * .28, i * s * .22 + Math.sin(wob * 1.3 + i * 2) * s * .1, s * .36); ctx.stroke(); }
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * s * .12, -s * .16); ctx.lineTo(side * s * .24, -s * .32 + Math.sin(wob * 2 + side) * s * .03); ctx.stroke(); ctx.beginPath(); ctx.arc(side * s * .24, -s * .32, s * .05, 0, TAU); ctx.fill(); }
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(0, 0, s * .36, s * .23, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -s * .02, s * .13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120018'; ctx.beginPath(); ctx.arc(look * s * .05, -s * .01, s * .06, 0, TAU); ctx.fill();
    ctx.fillRect(-s * .13, s * .12, s * .26, s * .035);
    ctx.restore();
  }
  function drawOverlord(x, y, s, flash, look) {
    ctx.save(); ctx.translate(x, y);
    for (const side of [-1, 1]) { // rocket jets
      const jx = side * s * .6, jy = s * .14, flame = s * (.5 + Math.random() * .3);
      const g = ctx.createLinearGradient(0, jy, 0, jy + flame); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, '#7dfcff'); g.addColorStop(.7, 'rgba(138,91,255,.55)'); g.addColorStop(1, 'rgba(138,91,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(jx - s * .08, jy); ctx.lineTo(jx + s * .08, jy); ctx.lineTo(jx, jy + flame); ctx.fill();
      ctx.fillStyle = '#3b3550'; ctx.strokeStyle = '#9b8cff'; ctx.lineWidth = Math.max(1, s * .02); ctx.beginPath(); ctx.ellipse(jx, jy - s * .07, s * .11, s * .15, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) { // tentacles
      const baseX = (i - 3.5) * s * .12, phase = time * 2.3 + i * .9, len = s * (.7 + (i % 3) * .14);
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, px = baseX + Math.sin(phase + t * 4) * s * .15 * t + (i - 3.5) * s * .05 * t, py = s * .22 + t * len;
        ctx.fillStyle = k % 2 ? '#7a2a63' : '#93367a'; ctx.beginPath(); ctx.arc(px, py, s * .065 * (1 - t * .8), 0, TAU); ctx.fill();
        if (k % 2 === 0 && k < 11) { ctx.fillStyle = '#f7a8d4'; ctx.beginPath(); ctx.arc(px + s * .028 * (1 - t), py, s * .016 * (1 - t * .6), 0, TAU); ctx.fill(); }
      }
    }
    ctx.beginPath(); // lumpy body
    for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, r = s * .5 * (1 + .07 * Math.sin(5 * a + time * 2) + .05 * Math.sin(9 * a - time * 3)); const px = Math.cos(a) * r, py = Math.sin(a) * r * .8; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath();
    const body = ctx.createRadialGradient(-s * .15, -s * .2, s * .05, 0, 0, s * .6); body.addColorStop(0, '#c9ff7a'); body.addColorStop(.45, '#5fae2a'); body.addColorStop(1, '#1d3a10');
    ctx.fillStyle = body; ctx.shadowColor = '#7dff3a'; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#4b1a4a'; ctx.lineWidth = Math.max(1, s * .012);
    for (let v = 0; v < 6; v++) { const a = v / 6 * TAU + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .15, Math.sin(a) * s * .12); ctx.quadraticCurveTo(Math.cos(a + .4) * s * .3, Math.sin(a + .4) * s * .25, Math.cos(a + .1) * s * .45, Math.sin(a + .1) * s * .36); ctx.stroke(); }
    for (let p = 0; p < 8; p++) { const a = random(p + 70) * TAU, r = s * (.2 + random(p + 80) * .24); ctx.fillStyle = '#e9ff9a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .78, s * (.02 + random(p + 90) * .025), 0, TAU); ctx.fill(); }
    const open = .5 + .5 * Math.sin(time * 3), mh = s * (.06 + open * .07), my = s * .2; // mouth with fangs and drool
    ctx.fillStyle = '#2a0418'; ctx.beginPath(); ctx.ellipse(0, my, s * .26, mh, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6d0';
    for (let t = 0; t < 9; t++) {
      const tx = (t - 4) * s * .055;
      ctx.beginPath(); ctx.moveTo(tx - s * .02, my - mh * .85); ctx.lineTo(tx + s * .02, my - mh * .85); ctx.lineTo(tx, my - s * .005); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - s * .02, my + mh * .85); ctx.lineTo(tx + s * .02, my + mh * .85); ctx.lineTo(tx, my + s * .005); ctx.fill();
    }
    ctx.strokeStyle = '#9dff5a'; ctx.fillStyle = '#9dff5a'; ctx.lineWidth = Math.max(1, s * .014);
    for (let d = 0; d < 3; d++) { const dx = (d - 1) * s * .12, dl = s * (.1 + (Math.sin(time * 1.7 + d * 2) * .5 + .5) * .26), ex = dx + Math.sin(time * 2 + d) * s * .02; ctx.beginPath(); ctx.moveTo(dx, my + mh * .7); ctx.lineTo(ex, my + dl); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, my + dl, s * .018, 0, TAU); ctx.fill(); }
    [[-.24, -.16, .11], [.22, -.18, .13], [0, -.31, .08], [-.05, -.05, .055], [.36, 0, .06], [-.38, .02, .05]].forEach(([ex, ey, er], i) => {
      const blink = Math.sin(time * 1.3 + i * 1.7) > .97 ? .15 : 1, R = er * s;
      ctx.save(); ctx.translate(ex * s, ey * s); ctx.scale(1, blink);
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(.6, s * .006);
      for (let v = 0; v < 4; v++) { const a = v * 1.7 + i; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * R * .5, Math.sin(a) * R * .5); ctx.stroke(); }
      ctx.fillStyle = '#d01818'; ctx.beginPath(); ctx.arc(look * R * .35, 0, R * .5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(look * R * .35, 0, R * .12, R * .42, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (flash > 0) { ctx.globalAlpha = flash * .7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, s * .55, s * .45, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawGoreAndSplats() {
    const f = finale;
    for (const g of f.gore) {
      ctx.save(); ctx.globalAlpha = clamp(g.life, 0, 1); ctx.translate(g.x, g.y);
      if (g.kind === 'blood') { ctx.rotate(Math.atan2(g.vy, g.vx)); ctx.fillStyle = g.color; ctx.beginPath(); ctx.ellipse(0, 0, g.r * (1 + Math.min(2.2, Math.hypot(g.vx, g.vy) / 420)), g.r, 0, 0, TAU); ctx.fill(); }
      else if (g.kind === 'gut') {
        ctx.rotate(g.rot); ctx.lineCap = 'round'; ctx.strokeStyle = g.color; ctx.lineWidth = g.r;
        ctx.beginPath(); ctx.moveTo(-g.r * 1.6, 0); ctx.bezierCurveTo(-g.r * .5, -g.r * 1.2, g.r * .5, g.r * 1.2, g.r * 1.6, 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,235,.45)'; ctx.lineWidth = g.r * .3; ctx.stroke();
      } else {
        ctx.rotate(g.rot); ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d01818'; ctx.beginPath(); ctx.arc(g.r * .25, 0, g.r * .5, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(g.r * .3, 0, g.r * .2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    for (const sp of f.splats) { // alien blood on the "glass", dripping down
      const age = time - sp.at; if (age < 0) continue;
      ctx.save(); ctx.globalAlpha = clamp(Math.min(age * 6, (6.5 - age) / 1.5), 0, .82); ctx.fillStyle = sp.color || '#4fd31f';
      const grow = Math.min(1, age * 5); ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * grow, 0, TAU); ctx.fill();
      for (let i = 0; i < 9; i++) { const a = random(sp.seed + i) * TAU, d = sp.r * (1 + random(sp.seed + i + 20) * .9) * grow; ctx.beginPath(); ctx.arc(sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, sp.r * (.12 + random(sp.seed + i + 40) * .2), 0, TAU); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const dx = (random(sp.seed + i + 60) - .5) * sp.r * 1.4, len = sp.r * Math.min(3.2, age * (.4 + random(sp.seed + i + 70) * .6)), w = sp.r * .14; ctx.fillRect(sp.x + dx - w / 2, sp.y, w, len); ctx.beginPath(); ctx.arc(sp.x + dx, sp.y + len, w * .9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(220,255,190,.35)'; ctx.beginPath(); ctx.arc(sp.x - sp.r * .3, sp.y - sp.r * .3, sp.r * .25 * grow, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function drawShards() {
    const s = finale.shatter; if (!s) return;
    const t = time - s.at; if (t > 2 || !s.snap) { if (t > 2) finale.shatter = null; return; }
    ctx.save(); ctx.globalAlpha = clamp(2 - t, 0, 1);
    for (const sh of s.shards) {
      ctx.save(); ctx.translate(sh.cx + sh.vx * t, sh.cy + sh.vy * t + 520 * t * t); ctx.rotate(sh.vr * t); ctx.translate(-sh.cx, -sh.cy);
      ctx.beginPath(); ctx.moveTo(sh.tri[0][0], sh.tri[0][1]); ctx.lineTo(sh.tri[1][0], sh.tri[1][1]); ctx.lineTo(sh.tri[2][0], sh.tri[2][1]); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(s.snap, 0, 0, W, H); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawFinaleHud(L) {
    const f = finale, small = H < 520, mono = `'Share Tech Mono', monospace`;
    ctx.save(); ctx.textBaseline = 'middle';
    const bw = Math.min(W * .5, 420), bx = W / 2 - bw / 2, by = small ? 60 : 96;
    ctx.font = `${small ? 11 : 12}px ${mono}`; ctx.textAlign = 'center'; ctx.fillStyle = '#b9ff7a';
    ctx.fillStyle = f.cfg.type.color;
    ctx.fillText(`☣ ${f.cfg.name}  ${Math.max(0, f.boss.hp)}/${f.boss.maxHp}${f.endless ? `   ·   WAVE ${f.wave + 1}  ·  BEST ${profile.stats.endlessBest || 0}` : f.waves > 1 ? `   ·   BOSS ${f.wave + 1}/${f.waves}` : ''}`, W / 2, by - 9, W * .94);
    for (let i = 0; i < f.boss.maxHp; i++) { const sw = bw / f.boss.maxHp; ctx.fillStyle = i < f.boss.hp ? f.cfg.type.color : 'rgba(255,255,255,.14)'; ctx.fillRect(bx + i * sw + (sw > 6 ? 1 : 0), by, sw - (sw > 6 ? 2 : 0), 7); }
    const sw = Math.min(W * .32, 220), sx = Math.max(16, W * .03), sy = H - (small ? 58 : 92), alive = f.invaders.filter(v => v.alive).length;
    ctx.textAlign = 'left'; ctx.fillStyle = '#c3b6d3'; ctx.fillText('HULL SHIELD', sx, sy - 9);
    ctx.fillStyle = '#ff6a8a'; ctx.fillText(`LIVES ${'♥'.repeat(f.lives + (f.phase === 'respawn' || f.phase === 'lost' ? 0 : 1)) || '—'}`, sx, sy + 18);
    ctx.textAlign = 'right'; ctx.fillText(Math.max(0, Math.round(shield)) + '%', sx + sw, sy - 9);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(sx, sy, sw, 6); ctx.fillStyle = shield < 26 ? '#ff426e' : '#4df8ff'; ctx.fillRect(sx, sy, sw * clamp(shield / 100, 0, 1), 6);
    ctx.fillStyle = '#ff8fd0'; ctx.fillText(`ALIEN WALL ${alive}/${f.invaders.length}`, W - Math.max(16, W * .03), sy - 9);
    if (f.phase === 'fight' && time - f.started < 6) {
      ctx.globalAlpha = clamp(6 - (time - f.started), 0, 1); ctx.textAlign = 'center'; ctx.font = `${small ? 11 : 13}px ${mono}`; ctx.fillStyle = '#ddff46';
      ctx.fillText('◀ ▶ MOVE  ·  FIRE: BLAST A HOLE IN THE WALL, THEN HIT THE OVERLORD', W / 2, L.top + FINALE_ROWS * L.ch + (L.shipY - L.top - FINALE_ROWS * L.ch) * .45, W * .92);
      ctx.globalAlpha = 1;
    }
    if (f.msg && time - f.msg.at < 1.1) {
      ctx.globalAlpha = clamp(1.1 - (time - f.msg.at), 0, 1); ctx.textAlign = 'center'; ctx.font = `italic 800 ${small ? 18 : 26}px 'Barlow Condensed', Impact, sans-serif`;
      ctx.fillStyle = '#ddff46'; ctx.shadowColor = '#7dff3a'; ctx.shadowBlur = 16; ctx.fillText(f.msg.text, W / 2, L.shipY - L.ship * 1.9, W * .9);
    }
    ctx.restore();
  }
  function drawAlarm() {
    const f = finale, e = time - f.started, total = COUNTDOWN_START + COUNTDOWN_LEN, k = clamp(e / total, 0, 1);
    ctx.save();
    const pulse = Math.pow(Math.abs(Math.sin(time * Math.PI * 1.7)), 2);
    ctx.fillStyle = `rgba(255,20,45,${.1 + pulse * (.16 + k * .24)})`; ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.globalCompositeOperation = 'lighter';
    for (const [ox, oy, dir] of [[W * .08, H * .12, 1], [W * .92, H * .12, -1], [W * .5, H * .02, 1]]) {
      const len = Math.max(W, H) * 1.5;
      for (const off of [0, Math.PI]) {
        const a = time * 3.4 * dir + off, g = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
        g.addColorStop(0, 'rgba(255,70,70,.6)'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, a - .2, a + .2); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ff3040'; ctx.beginPath(); ctx.arc(ox, oy, 12, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const left = total - e;
    if (left < 3.2) { // the screen starts to crack
      if (!f.cracks) { f.cracks = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + Math.random() * .3, pts = [[W / 2, H / 2]]; let r = 0; while (r < Math.max(W, H)) { r += 40 + Math.random() * 90; pts.push([W / 2 + Math.cos(a + (Math.random() - .5) * .25) * r, H / 2 + Math.sin(a + (Math.random() - .5) * .25) * r]); } f.cracks.push(pts); } }
      const grow = clamp((3.2 - left) / 3.2, 0, 1);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
      for (const pts of f.cracks) { const n = Math.max(2, Math.ceil(pts.length * grow)); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    const big = `'Barlow Condensed', Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (Math.sin(time * 9) > -.3) {
      ctx.font = `italic 900 ${Math.min(W * .075, 64)}px ${big}`; ctx.lineWidth = 8; ctx.strokeStyle = '#1a0006';
      ctx.strokeText('⚠ INVASION INCOMING ⚠', W / 2, H * .22, W * .94); ctx.fillStyle = '#ff3b55'; ctx.fillText('⚠ INVASION INCOMING ⚠', W / 2, H * .22, W * .94);
    }
    if (e >= COUNTDOWN_START) {
      const n = Math.max(0, Math.ceil(left)), frac = n - left, size = Math.min(W, H) * .34 * (1.45 - .45 * Math.min(1, frac * 4));
      ctx.font = `italic 900 ${size}px ${big}`; ctx.lineWidth = 14; ctx.strokeStyle = '#2a0008'; ctx.strokeText(String(n), W / 2, H * .55);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff1e3c'; ctx.shadowBlur = 40; ctx.fillText(String(n), W / 2, H * .55);
    }
    ctx.restore();
  }
  function drawDisco() {
    const f = finale, bpm = 2.05, ph = mod(time * bpm, 1), pulse = Math.pow(1 - ph, 3), beatN = Math.floor(time * bpm);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#13021f'); g.addColorStop(1, '#050010'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
    const horizon = H * .56;
    for (let r = 0; r < 8; r++) { // perspective dance floor
      const y0 = horizon + (H - horizon) * Math.pow(r / 8, 1.5), y1 = horizon + (H - horizon) * Math.pow((r + 1) / 8, 1.5);
      const xw = y => W * .18 + (y - horizon) / (H - horizon) * W * 1.25;
      for (let c = -6; c < 6; c++) {
        const lit = (r + c + beatN) % 2 === 0, hue = (mod(r * 2 + c + beatN, 6)) * 60;
        ctx.fillStyle = lit ? `hsl(${hue},100%,${42 + pulse * 26}%)` : `hsl(${hue},60%,10%)`;
        ctx.beginPath(); ctx.moveTo(W / 2 + c / 6 * xw(y0), y0); ctx.lineTo(W / 2 + (c + 1) / 6 * xw(y0), y0); ctx.lineTo(W / 2 + (c + 1) / 6 * xw(y1), y1); ctx.lineTo(W / 2 + c / 6 * xw(y1), y1); ctx.closePath(); ctx.fill();
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { // sweeping spotlights
      const ox = i < 3 ? W * .06 : W * .94, ang = Math.PI / 2 + Math.sin(time * (.8 + i * .17) + i * 1.3) * .75, len = H * 1.4, sp = .11, hue = (i * 60 + time * 50) % 360;
      const lg = ctx.createLinearGradient(ox, -10, ox + Math.cos(ang) * len, Math.sin(ang) * len); lg.addColorStop(0, `hsla(${hue},100%,65%,.5)`); lg.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ox, -10); ctx.lineTo(ox + Math.cos(ang - sp) * len, Math.sin(ang - sp) * len); ctx.lineTo(ox + Math.cos(ang + sp) * len, Math.sin(ang + sp) * len); ctx.fill();
    }
    const bx = W / 2, by = H * .17, R = Math.min(W, H) * .085;
    for (let i = 0; i < 90; i++) { // light specks thrown by the disco ball
      const a = i * 2.39996 + time * .55, d = Math.max(W, H) * (.15 + random(i + 700) * .8);
      ctx.globalAlpha = .55; ctx.fillStyle = `hsl(${(i * 37 + time * 80) % 360},100%,75%)`; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * d, by + Math.sin(a) * d * .7, 1.5 + random(i + 710) * 2.5, 0, TAU); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    line(bx, -10, bx, by - R, '#c7c2d8', 2); // the disco ball
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.clip();
    ctx.fillStyle = '#4a4560'; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    for (let la = -6; la < 6; la++) for (let lo = 0; lo < 16; lo++) {
      const lat = (la + .5) / 6 * Math.PI / 2, lon = lo / 16 * TAU + time * 1.2, z = Math.cos(lon) * Math.cos(lat); if (z < 0) continue;
      const fx = bx + Math.sin(lon) * Math.cos(lat) * R, fy = by + Math.sin(lat) * R, sz = R / 6 * Math.max(.3, z);
      ctx.fillStyle = `hsl(${(lo * 22 + la * 40 + time * 120) % 360},40%,${45 + z * 45 * (random(lo * 13 + la + Math.floor(time * 6)) > .85 ? 1.2 : .8)}%)`;
      ctx.fillRect(fx - sz / 2, fy - R / 13, sz * .9, R / 7);
    }
    ctx.restore();
    for (let i = 0; i < 4; i++) { const tw = Math.sin(time * 6 + i * 2); if (tw < .6) continue; const sx = bx + Math.cos(i * 1.7) * R * .6, sy = by + Math.sin(i * 2.3) * R * .6; ctx.globalAlpha = tw; line(sx - 9, sy, sx + 9, sy, '#fff', 2); line(sx, sy - 9, sx, sy + 9, '#fff', 2); }
    ctx.globalAlpha = 1;
    const m = machines[shipIndex], hop = Math.abs(Math.sin(time * bpm * Math.PI)) * H * .04, size = Math.min(W * .1, H * .12, 110);
    drawShip(W / 2, H * .74 - hop, size, m.color, m.dark, Math.sin(time * bpm * Math.PI) * .6, true);
    for (let i = 0; i < 6; i++) { // dancing aliens (the friendly ones)
      const side = i < 3 ? -1 : 1, k = i % 3, x = W / 2 + side * (W * (.18 + k * .12)), y = H * (.8 + k * .04) - Math.abs(Math.sin(time * bpm * Math.PI + i)) * H * .05;
      drawCritter(x, y, Math.min(W * .07, 60) * (1 + k * .15), CRITTER_COLORS[i % 4], Math.sin(time * 3 + i), time * 8 + i);
    }
    const tsize = Math.min(W * .095, 92) * (1 + pulse * .07), hue = (time * 160) % 360;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `italic 900 ${tsize}px 'Barlow Condensed', Impact, sans-serif`;
    ctx.lineWidth = 10; ctx.strokeStyle = '#12001c'; ctx.strokeText('CONGRATULATIONS!', W / 2, H * .38, W * .94);
    ctx.fillStyle = `hsl(${hue},100%,65%)`; ctx.shadowColor = `hsl(${(hue + 120) % 360},100%,60%)`; ctx.shadowBlur = 30; ctx.fillText('CONGRATULATIONS!', W / 2, H * .38, W * .94);
    ctx.restore();
  }
  function renderFinale() {
    const f = finale;
    ctx.save();
    if (shake > .03) ctx.translate(Math.sin(time * 121) * shake * 8, Math.cos(time * 93) * shake * 5);
    if (f.phase === 'disco') { drawDisco(); ctx.restore(); return; }
    drawSpace();
    const L = finaleLayout(), shipPx = f.shipX * W;
    if ((f.phase !== 'won' || time - f.wonAt < .15) && !(f.boss.hidden > time)) drawFinalBoss(L, clamp((shipPx - L.bossX) / (W * .25), -1, 1));
    for (const v of f.invaders) if (v.alive) {
      const x = invaderX(L, v), y = L.top + (v.r + .5) * L.ch;
      drawCritter(x, y + Math.sin(time * 3 + v.seed) * L.ch * .05, L.cw * .92, CRITTER_COLORS[v.r % 4], clamp((shipPx - x) / (W * .3), -1, 1), time * 6 + v.seed);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of f.beams) { const a = clamp(1 - (time - b.at) / .15, 0, 1); ctx.globalAlpha = a; line(b.x, b.y0, b.x, b.y1, '#7dfcff', 12); line(b.x, b.y0, b.x, b.y1, '#ffffff', 3); }
    for (const b of f.bursts) {
      const k = clamp((time - b.at) / .55, 0, 1); if (time < b.at) continue; ctx.globalAlpha = 1 - k; ctx.fillStyle = b.color;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, d = b.s * (.2 + k * 1.1), p = b.s * .12 * (1 - k * .5); ctx.fillRect(b.x + Math.cos(a) * d - p / 2, b.y + Math.sin(a) * d - p / 2, p, p); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    for (const b of f.bolts) {
      if (b.kind === 'web') {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(time * .6); ctx.strokeStyle = 'rgba(220,250,255,.85)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(0, 0, Math.cos(a) * b.r, Math.sin(a) * b.r, 'rgba(220,250,255,.85)', 1.5); }
        for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU, rr = b.r * ring / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
        ctx.restore(); continue;
      }
      if (b.kind === 'shard') { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(time * 8); ctx.fillStyle = '#bff8ff'; ctx.shadowColor = '#7dfcff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(0, -L.ship * .25); ctx.lineTo(L.ship * .1, 0); ctx.lineTo(0, L.ship * .25); ctx.lineTo(-L.ship * .1, 0); ctx.fill(); ctx.restore(); continue; }
      if (b.kind === 'bite') {
        ctx.save();
        if (!b.fired) {
          const k = clamp(1 - (b.warnUntil - time), 0, 1); ctx.translate(b.x, L.shipY + L.ship * .35);
          for (let r = 4; r > 0; r--) { ctx.fillStyle = `hsla(${(time * 200 + r * 60) % 360},100%,55%,${.3 + k * .25})`; ctx.beginPath(); ctx.ellipse(0, 0, L.ship * (.8 + r * .5) * (.4 + k * .6), L.ship * (.18 + r * .1), time * 3, 0, TAU); ctx.fill(); }
          ctx.font = `bold ${Math.max(12, L.ship * .35)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.fillStyle = Math.sin(time * 20) > 0 ? '#ff6a3d' : '#ffffff'; ctx.fillText('⚠ WORMHOLE — MOVE!', 0, -L.ship * 1.3);
        } else {
          const k = clamp((time - b.warnUntil) / .45, 0, 1), up = Math.sin(k * Math.PI) * L.ship * 3.2; ctx.translate(b.x, L.shipY + L.ship * 1.4 - up);
          drawShark(0, 0, L.ship * 3.4, 0, 0, true);
        }
        ctx.restore(); continue;
      }
      if (b.kind === 'eyebeam') {
        ctx.save();
        if (!b.fired) { ctx.globalAlpha = Math.sin(time * 30) > 0 ? .7 : .25; line(b.x, b.fromY, b.x, H, '#ff3b55', 2); ctx.fillStyle = 'rgba(255,40,70,.35)'; ctx.beginPath(); ctx.ellipse(b.x, L.shipY + L.ship * .3, L.ship, L.ship * .25, 0, 0, TAU); ctx.fill(); }
        else { ctx.globalCompositeOperation = 'lighter'; line(b.fromX, b.fromY, b.x, H, 'rgba(255,60,90,.55)', L.ship * 1.2); line(b.fromX, b.fromY, b.x, H, '#ff9aa8', L.ship * .45); line(b.fromX, b.fromY, b.x, H, '#ffffff', 4); }
        ctx.restore(); continue;
      }
      if (b.kind === 'missile') {
        const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-L.ship * .5, 0); ctx.lineTo(-L.ship * (.8 + Math.random() * .3), -L.ship * .07); ctx.lineTo(-L.ship * (.8 + Math.random() * .3), L.ship * .07); ctx.fill();
        ctx.fillStyle = '#c8ced8'; ctx.fillRect(-L.ship * .5, -L.ship * .07, L.ship * .5, L.ship * .14); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.moveTo(0, -L.ship * .07); ctx.lineTo(L.ship * .16, 0); ctx.lineTo(0, L.ship * .07); ctx.fill();
        ctx.restore(); continue;
      }
      if (b.kind === 'zap') { ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 5; i++) { const yy = b.y - i * 6, xx = b.x + (i % 2 ? 4 : -4); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
      else { ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(b.x, b.y, L.ship * .22, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(b.x - b.vx * .04, b.y - b.vy * .04, L.ship * .14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    if (f.phase !== 'lost' && f.phase !== 'respawn' && (time > f.invulnUntil || Math.sin(time * 40) > 0)) { const m = machines[shipIndex]; drawShip(shipPx, L.shipY, L.ship, m.color, m.dark, clamp(gesture.steer || 0, -1, 1) * -.5, true); }
    drawGoreAndSplats();
    drawCrashLayer();
    drawShards();
    drawFinaleHud(L);
    if (screenFlash > .015) { ctx.fillStyle = `rgba(255,255,240,${screenFlash * .55})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
    ctx.restore();
  }
