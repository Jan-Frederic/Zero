  // ==== More cutscenes (after the elevator and the car wash): a random one before every race once all have been seen.
  // Running gag in each: it ends with our racer under tension, blowing up, and the picture bursting into the race.
  const sceneSize = () => Math.min(Math.min(W, H) * .24, 170);
  const sceneFloor = () => H * .8;
  // Our racer in a scene: walking or standing (or without legs), shaking and sparking before the blast, then the blast.
  function sceneHero(t, T, x, y, size, o = {}) {
    const tension = clamp((t - T.tension) / (T.boom - T.tension), 0, 1), m = machines[shipIndex];
    intro.hero = { x, y, size };
    if (t >= T.boom) { if (intro.burst) drawExplosion(x, y, size * .9, intro.burst); return; }
    const jx = tension ? (Math.random() - .5) * size * .18 * tension : 0, jy = (tension ? (Math.random() - .5) * size * .1 * tension : 0) + (o.dy || 0);
    if (o.legs === false) drawShip(x + jx, y + jy, size, m.color, m.dark, o.tilt || 0, true, false, true, o.spin || 0);
    else drawWalker(x + jx, y + jy, size, !!o.walking, o.look || 0, Math.max(o.blush || 0, tension));
    if (o.overlay) o.overlay(x + jx, y + jy);
    drawTension(x, y + (o.dy || 0), size, tension);
  }
  const walkX = (t, t0, t1, from, to) => lerp(from, to, 1 - Math.pow(1 - clamp((t - t0) / (t1 - t0), 0, 1), 2));
  function sceneTitle(text, color, y = H * .09) {
    ctx.font = `900 ${Math.round(Math.min(W * .065, 48))}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillStyle = color; ctx.fillText(text, W / 2, y); ctx.shadowBlur = 0;
  }
  function sceneEnd(t, T) { if (t >= T.boom) drawCrashLayer(); }
  function partyHat(x, y, s) { polygon([[x - s * .5, y], [x + s * .5, y], [x, y - s * 1.2]], '#ffd24a', '#ff4eb8', 2); ctx.fillStyle = '#ff4eb8'; ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * .15, 0, TAU); ctx.fill(); }
  function bigText(text, x, y, color, sizePx, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 ${Math.round(sizePx)}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, sizePx * .08); ctx.strokeStyle = '#0b0712'; ctx.strokeText(text, 0, 0); ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore();
  }
  const PARTY_BARS = [
    { chord: [60, 64, 67, 72], bass: [36, 43], melody: [[0, 72, 1], [1, 74, 1], [2, 76, 2], [4, 79, 2], [6, 76, 2]] },
    { chord: [57, 60, 65, 69], bass: [41, 48], melody: [[0, 77, 2], [2, 76, 2], [4, 74, 4]] },
    { chord: [59, 62, 67, 71], bass: [43, 50], melody: [[0, 74, 1], [1, 76, 1], [2, 77, 2], [4, 79, 2], [6, 74, 2]] },
    { chord: [60, 64, 67, 72], bass: [36, 43], melody: [[0, 72, 6]] },
  ];

  // ---- 3. Birthday party: blow out the candles... trick candles. Blow harder... and harder.
  const BDAY = { walkIn: .3, sing: 2.6, wish: 4.6, blow1: 5.6, relight1: 6.3, blow2: 7, relight2: 7.6, trick: 7.9, blow3: 8.7, relight3: 9.3, tension: 9.6, boom: 12 };
  function drawBirthday(t) {
    const T = BDAY, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3a1250'); bg.addColorStop(1, '#14061f'); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    // Garland and balloons.
    for (let i = 0; i < 14; i++) { const x = W * i / 13, y = H * .16 + Math.sin(i * 1.3) * 6; polygon([[x - W / 30, y], [x + W / 30, y], [x, y + big * .06]], ['#ff4eb8', '#4df8ff', '#ffd24a', '#7dff3a'][i % 4]); }
    line(0, H * .16, W, H * .16, '#ffffff66', 2);
    for (let i = 0; i < 5; i++) { const x = W * (.08 + i * .21), y = H * .32 + Math.sin(time * 1.5 + i) * 10; line(x, y + big * .05, x + Math.sin(time + i) * 6, y + big * .2, '#ffffff88', 1.5); ctx.fillStyle = ['#ff4eb8', '#4df8ff', '#ffd24a', '#9d6aff', '#7dff3a'][i]; ctx.beginPath(); ctx.ellipse(x, y, big * .04, big * .05, 0, 0, TAU); ctx.fill(); }
    sceneTitle('HAPPY BIRTHDAY', '#ffd24a', H * .08);
    ctx.fillStyle = '#2a1238'; ctx.fillRect(-20, floorY, W + 40, H);
    // Table with the cake and five (trick) candles.
    const tableX = W * .66, tableY = floorY - size * .45, tw = size * 1.8;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(tableX - tw / 2, tableY, tw, size * .12); line(tableX - tw * .4, tableY, tableX - tw * .4, floorY, '#c9b8d8', 6); line(tableX + tw * .4, tableY, tableX + tw * .4, floorY, '#c9b8d8', 6);
    const cw = size * 1.1, cy = tableY - size * .45;
    ctx.fillStyle = '#ff9bd2'; ctx.fillRect(tableX - cw / 2, cy, cw, size * .45); ctx.fillStyle = '#fff0f8'; ctx.fillRect(tableX - cw / 2, cy, cw, size * .1);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = '#fff0f8'; ctx.beginPath(); ctx.arc(tableX - cw / 2 + cw * (i + .5) / 7, cy + size * .1, size * .05, 0, Math.PI); ctx.fill(); }
    const out = (t > T.blow1 + .15 && t < T.relight1) || (t > T.blow2 + .15 && t < T.relight2) || (t > T.blow3 + .15 && t < T.relight3);
    for (let i = 0; i < 5; i++) {
      const x = tableX - cw * .35 + cw * .7 * i / 4, top = cy - size * .22;
      ctx.fillStyle = ['#4df8ff', '#ffd24a', '#ff4eb8', '#7dff3a', '#9d6aff'][i]; ctx.fillRect(x - size * .025, top, size * .05, size * .22);
      if (!out) { const f = 1 + Math.sin(time * 20 + i) * .15; ctx.fillStyle = '#ffb14a'; ctx.beginPath(); ctx.ellipse(x, top - size * .06, size * .035 * f, size * .07 * f, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.ellipse(x, top - size * .05, size * .015, size * .035, 0, 0, TAU); ctx.fill(); }
      else { ctx.globalAlpha = .5; line(x, top, x + Math.sin(time * 3 + i) * size * .05, top - size * .25, '#cfcfcf', 2); ctx.globalAlpha = 1; }
    }
    // Guests in party hats: the pink racer and a terminator cat.
    const guestY = floorY - size * .58;
    drawPinkRacer(W * .16, guestY, size * .8, false, Math.sin(time * 3) > .7); partyHat(W * .16, guestY - size * .45, size * .18);
    drawTerminatorCat(tableX + tw * .45, tableY - size * .45, size * .8, false, { kind: 0, d: null, scaredUntil: 0 }, size * .1); partyHat(tableX + tw * .45, tableY - size * .78, size * .16);
    // Confetti while they sing.
    if (t > T.sing && t < T.sing + 3) for (let i = 0; i < 60; i++) { const q = mod((t - T.sing) * .5 + random(i), 1); ctx.fillStyle = ['#ff4eb8', '#4df8ff', '#ffd24a', '#7dff3a'][i % 4]; ctx.fillRect(random(i + 9) * W + Math.sin(time * 3 + i) * 10, q * H, 6, 10); }
    // Our racer walks up to the cake and blows... and blows.
    const x = walkX(t, T.walkIn, T.walkIn + 2, -size, tableX - tw * .62), y = floorY - size * .58;
    const blowing = [T.blow1, T.blow2, T.blow3].find(b => t > b - .1 && t < b + .5);
    sceneHero(t, T, x, y, size, { walking: t > T.walkIn && t < T.walkIn + 2, blush: t > T.trick ? .6 : 0, overlay: blowing === undefined ? null : (hx, hy) => {
      const power = blowing === T.blow3 ? 2 : 1;
      for (let i = 0; i < 6 * power; i++) { const q = mod(time * 3 + i / 6, 1); ctx.globalAlpha = 1 - q; line(hx + size * .3 + q * size * 1.2, hy - size * .1 + (i - 3) * 6, hx + size * .5 + q * size * 1.2, hy - size * .1 + (i - 3) * 6, '#ffffff', 2); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#ff9bd2'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + side * size * .2, hy - size * .02, size * .1, 0, TAU); ctx.fill(); }
    } });
    if (t > T.sing && t < T.sing + 2) drawBubble(W * .16, guestY - size * .7, 'Happy birthday!', '#ff4fa8');
    if (t > T.wish && t < T.wish + 1.6) drawBubble(tableX + tw * .45, tableY - size * 1.05, 'Make a wish!', '#ff2b2b');
    if (t > T.trick && t < T.trick + 1.8) drawBubble(x, y - size * .75, 'Trick candles?!', machines[shipIndex].color);
    sceneEnd(t, T);
  }

  // ---- 4. Red light: it stays red. And red. Green for a blink, then red. A snail crosses. It finally turns green... too late.
  const REDL = { rollIn: .3, comeOn: 2.8, green: 5, seriously: 5.6, snail: 6.4, rev: 8.6, tension: 9.4, boom: 11.8 };
  function drawRedLight(t) {
    const T = REDL, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    ctx.fillStyle = '#070b1e'; ctx.fillRect(-20, -20, W + 40, H + 40);
    for (let i = 0; i < 50; i++) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .3 + random(i) * .6; ctx.fillRect(random(i + 1) * W, random(i + 2) * H * .5, 2, 2); } ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) { const w = W / 9, h = H * (.2 + random(i + 30) * .3); ctx.fillStyle = '#121a36'; ctx.fillRect(i * w, floorY - h, w - 4, h); for (let k = 0; k < 6; k++) if (random(i * 9 + k) > .5) { ctx.fillStyle = '#ffd24a55'; ctx.fillRect(i * w + 8 + (k % 2) * w * .4, floorY - h + 12 + Math.floor(k / 2) * 22, w * .2, 10); } }
    ctx.fillStyle = '#1c1f2c'; ctx.fillRect(-20, floorY, W + 40, H);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(W * .52 + i * size * .32, floorY + 8, size * .18, H - floorY - 16); }
    line(W * .5, floorY + 4, W * .5, H, '#ffffff', 6);
    // The traffic light: red, red, red... green for a blink... red. Green at last, just as it is too late.
    const green = (t > T.green && t < T.green + .25) || t > T.boom - .2, lx = W * .8, ly = H * .22, lw = big * .1;
    line(lx, ly, lx, floorY, '#5d6474', 8);
    ctx.fillStyle = '#1b1e28'; ctx.fillRect(lx - lw / 2, ly - lw * 1.6, lw, lw * 3.2); ctx.strokeStyle = '#8e97a9'; ctx.lineWidth = 3; ctx.strokeRect(lx - lw / 2, ly - lw * 1.6, lw, lw * 3.2);
    for (const lamp of [{ k: -1, color: '#ff2b2b', on: !green }, { k: 0, color: '#ffb14a', on: false }, { k: 1, color: '#3dff7a', on: green }]) { ctx.fillStyle = lamp.on ? lamp.color : '#2b2f3e'; if (lamp.on) { ctx.shadowColor = lamp.color; ctx.shadowBlur = 30; } ctx.beginPath(); ctx.arc(lx, ly + lamp.k * lw * 1.02, lw * .38, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    // A snail in a helmet takes its time across the crosswalk.
    if (t > T.snail) {
      const sx = lerp(W * .95, W * .55, clamp((t - T.snail) / 6, 0, 1)), sy = floorY + (H - floorY) * .45, s = size * .3;
      ctx.fillStyle = '#c9a26a'; ctx.beginPath(); ctx.ellipse(sx, sy, s * .7, s * .22, 0, 0, TAU); ctx.fill();
      line(sx - s * .55, sy - s * .15, sx - s * .7, sy - s * .5, '#c9a26a', 3); line(sx - s * .45, sy - s * .15, sx - s * .5, sy - s * .5, '#c9a26a', 3);
      ctx.fillStyle = '#b05a2a'; ctx.beginPath(); ctx.arc(sx + s * .1, sy - s * .3, s * .38, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + s * .1, sy - s * .3, s * .2, 0, TAU * .8); ctx.stroke();
      ctx.fillStyle = '#ff2b2b'; ctx.beginPath(); ctx.arc(sx + s * .1, sy - s * .55, s * .25, Math.PI, TAU); ctx.fill();
    }
    // Our racer waits at the line, tapping, then revs the engine harder and harder.
    const x = walkX(t, T.rollIn, T.rollIn + 1.7, -size, W * .36), y = floorY - size * .58, revving = t > T.rev;
    sceneHero(t, T, x, y, size, { walking: t > T.rollIn && t < T.rollIn + 1.7, dy: !revving && t > 2 && Math.sin(time * 8) > .5 ? -size * .02 : 0, overlay: revving ? (hx, hy) => {
      for (const side of [-1, 1]) { const f = size * (.4 + Math.random() * .4 + (t - T.rev) * .2); polygon([[hx + side * size * .3 - size * .06, hy + size * .25], [hx + side * size * .3 + size * .06, hy + size * .25], [hx + side * size * .3, hy + size * .25 + f]], Math.random() > .5 ? '#5cfbff' : '#ffb14a'); }
    } : null });
    if (t > T.comeOn && t < T.comeOn + 2) drawBubble(x, y - size * .75, 'Come on... come on!', machines[shipIndex].color);
    if (t > T.seriously && t < T.seriously + 1.8) drawBubble(x, y - size * .75, 'Seriously?!', '#ff2b2b');
    sceneEnd(t, T);
  }

  // ---- 5. Hiccups: water does not help, holding the breath does not help... a terminator cat yells BOO!
  const HIC = { walkIn: .3, water: 3.6, hold: 6, boo: 8.5, tension: 9, boom: 11.4, hics: [1.7, 2.6, 3.3, 4.9, 5.6, 7.3, 8.1] };
  function drawHiccups(t) {
    const T = HIC, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    ctx.fillStyle = '#2a2f3a'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#3a4050'; ctx.fillRect(W * .1, H * .15, W * .8, H * .4);
    for (let i = 0; i < 12; i++) for (let k = 0; k < 5; k++) { ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.arc(W * .12 + i * W * .067, H * .18 + k * H * .08, 3, 0, TAU); ctx.fill(); }
    line(W * .2, H * .25, W * .2, H * .42, '#c9d2e3', 6); line(W * .3, H * .22, W * .36, H * .38, '#ffd24a', 8); ctx.strokeStyle = '#ff7a2e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W * .75, H * .32, big * .05, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#3a3f4c' : '#20232c'; ctx.fillRect(W * i / 12, floorY, W / 12 + 1, H); }
    sceneTitle('HIC!', '#7dfcff', H * .08);
    const x = walkX(t, T.walkIn, T.walkIn + 1.4, -size, W * .42), baseY = floorY - size * .58;
    const lastHic = T.hics.filter(h => t >= h).pop(), sinceHic = lastHic === undefined ? 9 : t - lastHic;
    let dy = sinceHic < .3 ? -Math.sin(sinceHic / .3 * Math.PI) * size * .25 : 0;
    if (t > T.boo) dy = -Math.sin(clamp((t - T.boo) / .5, 0, 1) * Math.PI) * size * .7;
    const holding = t > T.hold && t < T.hold + 2.2;
    // A glass of water with a straw.
    if (t > T.water && t < T.hold) { const gx = x + size * .55, gy = floorY - size * .45, level = 1 - clamp((t - T.water - .4) / 1.8, 0, 1); ctx.fillStyle = '#7dd8ff88'; ctx.fillRect(gx - size * .1, gy + size * .4 * (1 - level), size * .2, size * .4 * level); ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.strokeRect(gx - size * .1, gy, size * .2, size * .4); line(gx, gy + size * .3, gx - size * .25, gy - size * .25, '#ff4eb8', 3); }
    // The terminator cat sneaks up from behind the bench and yells BOO!
    const catRise = clamp((t - (T.boo - .8)) / .5, 0, 1);
    if (catRise > 0) drawTerminatorCat(x + size * 1.2, floorY - size * .4 - catRise * size * .5, size * 1.1, false, { kind: 0, d: null, scaredUntil: 0 }, size * .15);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(x + size * .7, floorY - size * .35, size, size * .35);
    sceneHero(t, T, x, baseY, size, { walking: t > T.walkIn && t < T.walkIn + 1.4, dy, overlay: holding ? (hx, hy) => {
      ctx.globalAlpha = .45; ctx.fillStyle = '#4a7dff'; ctx.beginPath(); ctx.arc(hx, hy - size * .1, size * .55, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#9fb8ff'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + side * size * .22, hy - size * .02, size * .12, 0, TAU); ctx.fill(); }
    } : null });
    if (sinceHic < .6 && t < T.boo) bigText('HIC!', x + size * .5, baseY - size * .7 - sinceHic * 40, '#7dfcff', Math.min(W * .07, 46), -.2);
    if (t > T.water && t < T.water + 2) drawBubble(x, baseY - size * .8, 'Hic! Water... hic!', machines[shipIndex].color);
    if (holding) drawBubble(x, baseY - size * .8, 'Hmmmmph!', '#4a7dff');
    if (t > T.boo && t < T.boo + 1.6) bigText('BOO!', x + size * 1.3, floorY - size * 1.6, '#ff2b2b', Math.min(W * .12, 90), .15);
    sceneEnd(t, T);
  }

  // ---- 6. Meditation: ommm... a fly. Ommm... more flies. Ommmmm...
  const ZEN = { sit: .3, om: 1.4, fly: 3, land: 4.6, calm: 6, flies: 7.6, tension: 9.6, boom: 12 };
  function zenFly(t, i, x, y, size) {
    const k = t * (1.3 + i * .21) + i * 2, fx = x + Math.cos(k * 2.1) * size * (.9 + i * .1), fy = y - size * .4 + Math.sin(k * 3.3) * size * .5;
    return [fx, fy];
  }
  function drawFlyAt(fx, fy) {
    ctx.fillStyle = '#ffffff88'; const flap = Math.sin(time * 60) * 3; ctx.beginPath(); ctx.ellipse(fx - 3, fy - 4, 4, 2 + flap * .3, -.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(fx + 3, fy - 4, 4, 2 - flap * .3, .5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, TAU); ctx.fill();
  }
  function drawZen(t) {
    const T = ZEN, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, floorY); bg.addColorStop(0, '#ff9b5a'); bg.addColorStop(1, '#ff5a8a'); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.arc(W / 2, floorY - big * .05, big * .2, Math.PI, TAU); ctx.fill();
    for (const bx of [W * .06, W * .12, W * .88, W * .94]) { line(bx, 0, bx, floorY, '#2f7a3a', 10); for (let y = 40; y < floorY; y += 60) line(bx - 6, y, bx + 6, y, '#1f5a2a', 4); }
    ctx.fillStyle = '#e8d8b8'; ctx.fillRect(-20, floorY, W + 40, H);
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2; for (let r = 1; r < 6; r++) { ctx.beginPath(); ctx.ellipse(W / 2, floorY + (H - floorY) * .5, r * W * .09, r * (H - floorY) * .12, 0, 0, TAU); ctx.stroke(); }
    sceneTitle('OMMM', '#ffffff', H * .08);
    const x = W / 2, y = floorY - size * .45, breathe = Math.sin(time * 1.4) * size * .03;
    const flies = t < T.fly ? 0 : t < T.flies ? 1 : 1 + Math.min(5, Math.floor((t - T.flies) * 3));
    const vein = clamp((t - T.calm) / 3, 0, 1);
    sceneHero(t, T, x, y, size, { legs: false, dy: breathe, overlay: vein > 0 ? (hx, hy) => {
      const vx = hx + size * .25, vy = hy - size * .35, s = size * .08 * (1 + vein);
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) line(vx + Math.cos(a) * s * .3, vy + Math.sin(a) * s * .3, vx + Math.cos(a + .4) * s, vy + Math.sin(a + .4) * s, '#ff2b2b', 3);
    } : null });
    for (let i = 0; i < flies && t < T.boom; i++) {
      let [fx, fy] = zenFly(t, i, x, y, size);
      if (i === 0 && t > T.land && t < T.land + 1.2) [fx, fy] = [x, y - size * .55];
      drawFlyAt(fx, fy);
    }
    if (t > T.om && t < T.om + 2.4) drawBubble(x, y - size * .8, 'Ommm...', '#ffffff');
    if (t > T.calm && t < T.calm + 2.6) drawBubble(x, y - size * .8, 'Ommm... calm... ommm...', '#ffffff');
    sceneEnd(t, T);
  }
  function zenUpdate(t, dt, state) {
    if (t < ZEN.fly || time < (state.nextBuzz || 0)) return;
    const flies = t < ZEN.flies ? 1 : 1 + Math.min(5, Math.floor((t - ZEN.flies) * 3));
    state.nextBuzz = time + .18; playToneSweep(190 + Math.random() * 60, 230 + Math.random() * 60, .2, 'sawtooth', .006 + flies * .003);
  }

  // ---- 7. Gas station: "Fill her up!" – the price counter does not stop.
  const GAS = { rollIn: .3, fill: 2.4, pump: 3.4, shock: 8, tension: 9, boom: 11.4 };
  const gasPrice = t => t < GAS.pump ? 0 : Math.floor(Math.pow(10, 1 + (t - GAS.pump) * .95));
  function drawGasStation(t) {
    const T = GAS, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    ctx.fillStyle = '#0a0716'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#1b1e28'; ctx.fillRect(W * .05, H * .14, W * .9, big * .08);
    ctx.strokeStyle = '#4df8ff'; ctx.lineWidth = 3; ctx.strokeRect(W * .05, H * .14, W * .9, big * .08);
    sceneTitle('⚡ PLASMA STATION ⚡', '#4df8ff', H * .14 + big * .04);
    for (const px of [W * .2, W * .8]) line(px, H * .14 + big * .08, px, floorY, '#5d6474', 10);
    ctx.fillStyle = '#16131f'; ctx.fillRect(-20, floorY, W + 40, H);
    // The pump with its display; the hose goes to the racer.
    const pumpX = W * .7, pw = big * .16, ph = big * .42, pumpY = floorY - ph;
    ctx.fillStyle = '#c0143c'; ctx.fillRect(pumpX - pw / 2, pumpY, pw, ph); ctx.fillStyle = '#0b0a12'; ctx.fillRect(pumpX - pw * .4, pumpY + ph * .1, pw * .8, ph * .32);
    const price = gasPrice(t), shown = t > T.shock + .6 ? '∞ CR' : `${price.toLocaleString('en-US').replace(/,/g, ' ')} CR`;
    ctx.font = `700 ${Math.round(pw * .14)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7dff3a'; ctx.fillText('PLASMA 98', pumpX, pumpY + ph * .17); ctx.fillStyle = t > T.shock ? (Math.sin(time * 14) > 0 ? '#ff2b2b' : '#ffd24a') : '#ffd24a'; ctx.fillText(shown, pumpX, pumpY + ph * .32);
    const x = walkX(t, T.rollIn, T.rollIn + 1.8, -size, W * .36), y = floorY - size * .58;
    if (t > T.pump - .4) { ctx.strokeStyle = '#1b1e28'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(pumpX - pw / 2, pumpY + ph * .6); ctx.quadraticCurveTo(lerp(pumpX, x, .5), floorY + 20, x + size * .35, y - size * .05); ctx.stroke(); }
    const shocked = t > T.shock;
    sceneHero(t, T, x, y, size, { walking: t > T.rollIn && t < T.rollIn + 1.8, dy: shocked && t < T.shock + .4 ? -Math.sin((t - T.shock) / .4 * Math.PI) * size * .4 : 0, overlay: shocked ? (hx, hy) => { bigText('!!', hx, hy - size * .7, '#ff2b2b', size * .4); } : null });
    if (t > T.fill && t < T.fill + 1.8) drawBubble(x, y - size * .8, 'Fill her up, please!', machines[shipIndex].color);
    if (t > T.shock + .1 && t < T.shock + 1.8) drawBubble(x, y - size * .95, 'How much?!', '#ff2b2b');
    sceneEnd(t, T);
  }
  function gasUpdate(t, dt, state) {
    if (t < GAS.pump || time < (state.nextTick || 0)) return;
    state.nextTick = time + Math.max(.03, .14 - (t - GAS.pump) * .02); soundEffect(1800 + Math.random() * 400, .03, 'square');
  }

  // ---- 8. Driving test: park between the cones. Cone. Other cone. FAILED.
  const TEST = { walkIn: .3, park: 2.3, try1: 3.4, bump1: 4.1, try2: 4.6, bump2: 5.3, parked: 5.9, failed: 6.6, tension: 8.8, boom: 11 };
  function drawDrivingTest(t) {
    const T = TEST, size = sceneSize(), floorY = sceneFloor(), big = Math.min(W, H);
    ctx.fillStyle = '#7fb8e8'; ctx.fillRect(-20, -20, W + 40, H + 40);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffffffcc'; const cx = mod(W * (i * .3 + .1) + time * 12, W + 200) - 100; ctx.beginPath(); ctx.ellipse(cx, H * (.15 + i * .07), big * .1, big * .035, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-20, floorY - size * .1, W + 40, H);
    line(0, floorY + (H - floorY) * .5, W, floorY + (H - floorY) * .5, '#ffffff', 4);
    sceneTitle('DRIVING TEST', '#ffffff', H * .08);
    // Two cones; each one gets knocked flying.
    const coneL = W * .44, coneR = W * .66, cy = floorY + size * .05;
    for (const [cx0, hit, dir] of [[coneL, T.bump2, -1], [coneR, T.bump1, 1]]) {
      const k = t > hit ? t - hit : 0, cx = cx0 + dir * k * size * 2.5, cyy = cy - (k ? Math.sin(Math.min(k, 1) * Math.PI) * size * .8 : 0);
      ctx.save(); ctx.translate(cx, cyy); ctx.rotate(dir * k * 8);
      polygon([[-size * .12, 0], [size * .12, 0], [0, -size * .38]], '#ff7a2e'); ctx.fillStyle = '#ffffff'; ctx.fillRect(-size * .07, -size * .2, size * .14, size * .05); ctx.restore();
    }
    // The examiner: a terminator cat with glasses and a clipboard.
    const ex = W * .86, ey = floorY - size * .7;
    drawTerminatorCat(ex, ey, size * 1.1, false, { kind: 0, d: null, scaredUntil: 0 }, size * .1);
    ctx.strokeStyle = '#0b0712'; ctx.lineWidth = 3; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + side * size * .17, ey - size * .08, size * .1, 0, TAU); ctx.stroke(); } line(ex - size * .07, ey - size * .08, ex + size * .07, ey - size * .08, '#0b0712', 3);
    ctx.fillStyle = '#c9a26a'; ctx.fillRect(ex - size * .5, ey + size * .25, size * .32, size * .42); ctx.fillStyle = '#ffffff'; ctx.fillRect(ex - size * .47, ey + size * .3, size * .26, size * .34);
    // Our racer: in, too far, back, too far, finally in the gap.
    let x = walkX(t, T.walkIn, T.walkIn + 1.8, -size, W * .24);
    if (t > T.try1) x = walkX(t, T.try1, T.bump1, W * .24, coneR - size * .15);
    if (t > T.try2) x = walkX(t, T.try2, T.bump2, coneR - size * .15, coneL + size * .15);
    if (t > T.parked) x = walkX(t, T.parked, T.parked + .5, coneL + size * .15, (coneL + coneR) / 2);
    const y = floorY - size * .58, moving = (t > T.walkIn && t < T.walkIn + 1.8) || (t > T.try1 && t < T.bump1) || (t > T.try2 && t < T.bump2) || (t > T.parked && t < T.parked + .5);
    sceneHero(t, T, x, y, size, { walking: moving, look: t > T.try2 && t < T.bump2 ? -1 : 0, blush: t > T.failed ? .8 : 0 });
    if (t > T.park && t < T.park + 1.8) drawBubble(ex, ey - size * .6, 'Park between the cones, please.', '#ff2b2b');
    if (t > T.failed) {
      const k = clamp((t - T.failed) / .25, 0, 1);
      bigText('FAILED', W / 2, H * .42, '#ff2b2b', Math.min(W * .16, 130) * (2 - k), -.18);
      if (t < T.failed + 1.6) drawBubble(ex, ey - size * .6, 'Failed!', '#ff2b2b');
    }
    sceneEnd(t, T);
  }

  CUTSCENES.push(
    { id: 'birthday', t: BDAY, draw: drawBirthday, music: () => startMuzak(PARTY_BARS, 140),
      lines: [[BDAY.sing, 'Happy birthday!', 'bday-sing'], [BDAY.wish, 'Make a wish!', 'bday-wish'], [BDAY.trick, 'Trick candles?!', 'bday-trick']],
      sounds: [[BDAY.sing, playFanfare], ...[BDAY.blow1, BDAY.blow2].map(at => [at, () => playNoiseBurst(.5, .12, 2000, 300)]), [BDAY.blow3, () => playNoiseBurst(.9, .25, 3000, 200)],
        ...[BDAY.relight1, BDAY.relight2, BDAY.relight3].map(at => [at, () => soundEffect(1500, .15, 'triangle')])] },
    { id: 'redlight', t: REDL, draw: drawRedLight, music: () => startMuzak(), lines: [[REDL.comeOn, 'Come on... come on!', 'red-come-on'], [REDL.seriously, 'Seriously?!', 'red-seriously']],
      sounds: [[REDL.green, () => soundEffect(880, .12)], ...[0, .5, 1, 1.4, 1.8, 2.1, 2.4].map(d => [REDL.rev + d, () => playBoostSound(1 + d * .3)])] },
    { id: 'hiccups', t: HIC, draw: drawHiccups, music: () => startMuzak(), lines: [[HIC.water, 'Hic! Water... hic!', 'hic-water'], [HIC.boo, 'BOO!', 'hic-boo']],
      sounds: [...HIC.hics.map(h => [h, () => { playToneSweep(520, 980, .08, 'square', .06); playNoiseBurst(.06, .05, 3000, 800); }]), [HIC.boo, () => playToneSweep(220, 70, .5, 'sawtooth', .12)]] },
    { id: 'zen', t: ZEN, draw: drawZen, update: zenUpdate, music: () => startMuzak(), lines: [[ZEN.om, 'Ommm...', 'zen-om'], [ZEN.calm, 'Ommm... calm... ommm...', 'zen-calm']],
      sounds: [[.4, () => playToneSweep(180, 170, 2.5, 'sine', .08)], [ZEN.flies, () => playToneSweep(180, 170, 1.5, 'sine', .05)]] },
    { id: 'gas', t: GAS, draw: drawGasStation, update: gasUpdate, music: () => startMuzak(WASH_BARS, 118),
      lines: [[GAS.fill, 'Fill her up, please!', 'gas-fill'], [GAS.shock + .1, 'How much?!', 'gas-what']], sounds: [[GAS.shock, () => playToneSweep(900, 180, .6, 'sawtooth', .08)]] },
    { id: 'drivingtest', t: TEST, draw: drawDrivingTest, music: () => startMuzak(MUZAK_BARS, 100),
      lines: [[TEST.park, 'Park between the cones, please.', 'test-park'], [TEST.failed, 'Failed!', 'test-failed']],
      sounds: [[TEST.bump1, () => playImpactSound(.6)], [TEST.bump2, () => playImpactSound(.6)], [TEST.failed, () => { playNoiseBurst(.15, .3, 800, 100); playToneSweep(120, 60, .3, 'square', .1); }]] },
  );
