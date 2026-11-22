  // ==== Cat chaos: cats leap at the screen and poof the ship back; the 5th cat opens a black hole that swallows the
  // race, and inside it waits a maze full of fruit guarded by terminator cats. Eat every fruit to face the invasion.
  const CAT_KNOCK = 1500, CAT_HOLE_AT = 5, CAT_LEAP_TIME = .95, HOLE_PULL = 3.2, HOLE_SWALLOW = 1.3;
  let catPoofs = 0, catKnock = 0, catLeaps = [], blackHole = null, maze = null;
  function resetCatChaos() {
    catPoofs = 0; catKnock = 0; catLeaps = []; blackHole = null; maze = null;
    document.body.classList.remove('maze', 'blackhole');
  }
  // The black hole only opens in a grand prix race (other modes have no invasion to land in).
  const holeAllowed = () => gameMode() === 'race' && !tutorial && !finale && !blackHole && mode === 'racing';
  // ---- Cat hit on the track: the cat leaps at the screen and the ship is poofed back.
  function catPoof(color) {
    catPoofs++; catKnock = CAT_KNOCK; speed = Math.min(speed, 1200);
    catLeaps.push({ at: time, color: color || '#ff9bf2', side: Math.random() < .5 ? -1 : 1, seed: Math.random() * 1000 });
    shake = Math.max(shake, .8); buzz([30, 40, 70]);
    playToneSweep(300, 1400, .22, 'square', .05); playNoiseBurst(.35, .16, 6000, 900);
    if (holeAllowed() && catPoofs >= CAT_HOLE_AT) { startBlackHole(); return; }
    showCallout(holeAllowed() && catPoofs === CAT_HOLE_AT - 1 ? '⚠ ONE MORE CAT = BLACK HOLE' : `🐱 POOF ×${catPoofs}`, color || '#ff9bf2');
  }
  // Pushes the ship back along the track (never behind the start of the current lap, so laps count once).
  function applyCatKnock(dt) {
    const back = Math.min(catKnock, dt * 5200); catKnock -= back;
    distance = Math.max(Math.floor(distance / LENGTH) * LENGTH + 1, distance - back); position = mod(distance, LENGTH);
    speed = Math.min(speed, 1200);
  }
  function drawCatLeaps() {
    catLeaps = catLeaps.filter(l => time - l.at < CAT_LEAP_TIME);
    for (const l of catLeaps) {
      const t = (time - l.at) / CAT_LEAP_TIME, big = Math.min(W, H);
      if (t < .62) {
        const k = t / .62, e = k * k;
        drawLeapCat(W * (.5 + l.side * .16 * (1 - k)), H * (.74 - .32 * Math.sin(k * Math.PI * .75)), big * (.1 + e * 1.05), l.color, k);
      } else drawPixelPoof(W * .5, H * .46, big, l.color, (t - .62) / .38, l.seed);
    }
  }
  // A cat face leaping at the viewer: claws out, mouth wide open.
  function drawLeapCat(x, y, s, color, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(k * 9) * .08);
    ctx.shadowColor = color; ctx.shadowBlur = Math.min(40, s * .12);
    // Front paws reaching out of the screen.
    for (const side of [-1, 1]) {
      const px = side * s * (.42 + k * .18), py = s * (.32 - k * .1);
      ctx.beginPath(); ctx.ellipse(px, py, s * .16, s * .13, side * .3, 0, TAU); ctx.fillStyle = '#2a2444'; ctx.fill(); ctx.lineWidth = Math.max(1, s * .02); ctx.strokeStyle = color; ctx.stroke();
      for (let c = -1; c <= 1; c++) line(px + c * s * .06, py - s * .1, px + c * s * .08 + side * s * .02, py - s * .2 - k * s * .05, '#fffcac', Math.max(1, s * .018));
    }
    // Head and ears.
    polygon([[-s * .42, -s * .18], [-s * .38, -s * .62], [-s * .12, -s * .38]], '#27213e', color, Math.max(1, s * .02));
    polygon([[s * .42, -s * .18], [s * .38, -s * .62], [s * .12, -s * .38]], '#27213e', color, Math.max(1, s * .02));
    ctx.beginPath(); ctx.ellipse(0, 0, s * .46, s * .4, 0, 0, TAU); ctx.fillStyle = '#201d38'; ctx.fill(); ctx.lineWidth = Math.max(1, s * .025); ctx.strokeStyle = color; ctx.stroke();
    // Glowing slit eyes.
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(side * s * .17, -s * .1, s * .09, s * .07, 0, 0, TAU); ctx.fillStyle = '#fffcac'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(side * s * .17, -s * .1, s * .018, s * .06, 0, 0, TAU); ctx.fillStyle = '#120e22'; ctx.fill();
    }
    // Nose, wide open mouth with fangs, whiskers.
    polygon([[-s * .04, s * .02], [s * .04, s * .02], [0, s * .07]], '#ff7ab8');
    ctx.beginPath(); ctx.ellipse(0, s * .17, s * (.1 + k * .06), s * (.05 + k * .09), 0, 0, TAU); ctx.fillStyle = '#5a0a2a'; ctx.fill();
    for (const side of [-1, 1]) polygon([[side * s * .07, s * .1], [side * s * .03, s * .1], [side * s * .05, s * (.17 + k * .03)]], '#ffffff');
    for (const side of [-1, 1]) for (let w = 0; w < 3; w++) line(side * s * .14, s * (.06 + w * .04), side * s * .46, s * (.0 + w * .07), '#d9d5f2', Math.max(1, s * .008));
    ctx.restore();
  }
  // The leaping cat bursts into pixels.
  function drawPixelPoof(x, y, big, color, k, seed) {
    ctx.save(); ctx.globalAlpha = 1 - k;
    const glow = ctx.createRadialGradient(x, y, 1, x, y, big * (.3 + k * .6)); glow.addColorStop(0, '#ffffffcc'); glow.addColorStop(.4, color + '66'); glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const colors = [color, '#fffcac', '#201d38', '#d9d5f2'];
    for (let i = 0; i < 70; i++) {
      const a = random(seed + i) * TAU, d = big * (.08 + random(seed + i + 99) * .5) * (.3 + k * 1.6), size = big * (.02 + random(seed + i + 7) * .04) * (1 - k * .6);
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x + Math.cos(a) * d - size / 2, y + Math.sin(a) * d - size / 2, size, size);
    }
    ctx.font = `900 ${Math.round(big * .13)}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, big * .012); ctx.strokeStyle = '#120e22'; ctx.strokeText('POOF!', x, y - big * k * .1); ctx.fillStyle = color; ctx.fillText('POOF!', x, y - big * k * .1);
    ctx.restore();
  }
  // ---- Black hole: the race scene spirals into it, then the ship is swallowed.
  function startBlackHole() {
    mode = 'blackhole'; catKnock = 0; keys.clear(); resetGesture(); cancelClip();
    boss = null; bossAttacks = []; hyperTime = 0; document.body.classList.remove('boss', 'hyper', 'boosting', 'critical', 'hinting'); document.body.classList.add('blackhole');
    const kinds = ['ship', 'ufo', 'cat', 'rock'], colors = ['#ff46bc', '#ffda46', '#9d6aff', '#3dffa6', '#66aaff', '#ff774b'];
    blackHole = { at: time, buf: null, debris: Array.from({ length: 34 }, (_, i) => ({ kind: kinds[i % 4], a: random(i * 3 + time) * TAU, r: .45 + random(i * 7 + time) * .6, delay: random(i * 11 + time) * 1.6, s: 10 + random(i * 5) * 16, color: colors[i % colors.length], spin: (random(i) - .5) * 12 })) };
    showCallout('⚠ BLACK HOLE ⚠', '#ff9b2e'); robotSay('Whoa whoa whoa! Massive black hole. Terminator cats attack!', 'black-hole');
    playToneSweep(90, 18, 4.4, 'sawtooth', .14); playNoiseBurst(4.5, .2, 1600, 50); buzz([80, 60, 200, 80, 400]);
  }
  function updateBlackHole(dt) {
    const t = time - blackHole.at;
    speed *= Math.pow(.35, dt); position = mod(position + speed * dt, LENGTH); shake = Math.max(shake, .2 + Math.min(t, 3) * .18);
    if (t > HOLE_PULL + HOLE_SWALLOW) startMaze();
  }
  function drawBlackHole(shipX, shipY, shipSize) {
    const bh = blackHole, t = time - bh.at, k = clamp(t / HOLE_PULL, 0, 1), e = k * k * (3 - 2 * k), swallow = clamp((t - HOLE_PULL) / HOLE_SWALLOW, 0, 1);
    const cx = W * .5, cy = H * .42, big = Math.max(W, H);
    // The rendered scene, copied and drawn back rotated and shrunk: everything spirals into the hole.
    if (!bh.buf) try { bh.buf = document.createElement('canvas'); } catch { bh.buf = false; }
    const buf = bh.buf;
    if (buf && canvas.width) {
      if (buf.width !== canvas.width || buf.height !== canvas.height) { buf.width = canvas.width; buf.height = canvas.height; }
      const g = buf.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, buf.width, buf.height); g.drawImage(canvas, 0, 0);
      ctx.fillStyle = '#02010a'; ctx.fillRect(-40, -40, W + 80, H + 80);
      for (let i = 0; i < 3; i++) {
        const scale = Math.max(.01, 1 - e * (.8 + i * .08) - swallow * .2), rot = e * (2.4 + i * 1.4) + swallow * 3;
        ctx.save(); ctx.globalAlpha = i ? .3 : 1; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-cx, -cy); ctx.drawImage(buf, 0, 0, W, H); ctx.restore();
      }
    }
    const dark = ctx.createRadialGradient(cx, cy, 1, cx, cy, big * .75); dark.addColorStop(0, '#000000'); dark.addColorStop(.25, `rgba(4,2,16,${.2 + e * .5})`); dark.addColorStop(1, `rgba(4,2,16,${e * .75})`);
    ctx.fillStyle = dark; ctx.fillRect(-40, -40, W + 80, H + 80);
    // Debris from the race (rivals, saucers, cats, rocks) spiralling in.
    for (const d of bh.debris) {
      const life = clamp((t - d.delay) / 2.4, 0, 1); if (life <= 0 || life >= 1) continue;
      const r = d.r * big * Math.pow(1 - life, 1.5), a = d.a + life * 8, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .62, s = d.s * (1 - life * .85);
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.spin * life); ctx.globalAlpha = 1 - life * .5;
      if (d.kind === 'ship') polygon([[0, -s], [s * .7, s * .7], [-s * .7, s * .7]], d.color, '#ffffff', 1);
      else if (d.kind === 'ufo') { ctx.fillStyle = '#9ab0c8'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * .32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = d.color; ctx.beginPath(); ctx.ellipse(0, -s * .2, s * .4, s * .3, 0, Math.PI, TAU); ctx.fill(); }
      else if (d.kind === 'cat') { ctx.fillStyle = '#201d38'; ctx.beginPath(); ctx.arc(0, 0, s * .5, 0, TAU); ctx.fill(); polygon([[-s * .45, -s * .1], [-s * .35, -s * .7], [-s * .05, -s * .4]], '#201d38'); polygon([[s * .45, -s * .1], [s * .35, -s * .7], [s * .05, -s * .4]], '#201d38'); ctx.fillStyle = '#fffcac'; ctx.fillRect(-s * .25, -s * .1, s * .14, s * .1); ctx.fillRect(s * .11, -s * .1, s * .14, s * .1); }
      else polygon([[-s * .6, -s * .2], [-s * .1, -s * .6], [s * .6, -s * .3], [s * .4, s * .5], [-s * .4, s * .5]], '#4a3d5c', '#8b7aa8', 1);
      ctx.restore();
    }
    // Accretion disc, light ring and the event horizon.
    const R = Math.min(W, H) * (.035 + e * .15 + swallow * .06) + Math.sin(time * 9) * 1.5;
    ctx.save(); ctx.translate(cx, cy);
    for (let j = 0; j < 3; j++) {
      ctx.save(); ctx.rotate(time * (1.1 + j * .5) * (j % 2 ? -1 : 1)); ctx.shadowColor = ['#ff9b2e', '#ff4eb8', '#9d6aff'][j]; ctx.shadowBlur = R * .6;
      ctx.beginPath(); ctx.ellipse(0, 0, R * (2.5 - j * .35), R * (.66 - j * .1), 0, 0, TAU); ctx.lineWidth = R * (.2 - j * .04); ctx.strokeStyle = ['#ffb14acc', '#ff4eb8aa', '#9d6aff88'][j]; ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, R * 1.14, 0, TAU); ctx.lineWidth = Math.max(2, R * .08); ctx.strokeStyle = '#ffe2a8'; ctx.shadowColor = '#ffe2a8'; ctx.shadowBlur = R * .5; ctx.stroke();
    ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = '#000000'; ctx.fill();
    ctx.restore();
    // The player's ship: dragged towards the hole, then spun into it.
    const m = machines[shipIndex];
    let sx = lerp(shipX, cx, e * .18) + Math.sin(time * 47) * e * 4, sy = lerp(shipY, cy, e * .12), size = shipSize, spin = e * Math.sin(time * 5) * .3;
    if (swallow > 0) {
      const a = Math.atan2(sy - cy, sx - cx) + swallow * 9, d = Math.hypot(sx - cx, sy - cy) * (1 - swallow);
      sx = cx + Math.cos(a) * d; sy = cy + Math.sin(a) * d * .7; size = shipSize * (1 - swallow * .95); spin = swallow * 14;
    }
    drawShip(sx, sy, size, m.color, m.dark, 0, true, false, true, spin);
    // Warning sign, then a white-out as the ship crosses the horizon.
    if (swallow === 0 && Math.sin(time * 10) > -.3) {
      ctx.font = `900 ${Math.round(Math.min(W * .09, 64))}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = '#120e22'; ctx.strokeText('⚠ BLACK HOLE ⚠', W / 2, H * .14); ctx.fillStyle = '#ff9b2e'; ctx.fillText('⚠ BLACK HOLE ⚠', W / 2, H * .14);
    }
    if (swallow > .8) { ctx.fillStyle = `rgba(255,255,255,${(swallow - .8) * 5})`; ctx.fillRect(-40, -40, W + 80, H + 80); }
  }
  // ---- The maze inside the black hole. Original layout: '#' wall, '.' fruit, 'O' super candy, 'P' player start, 'C' terminator cat.
  // A super candy lets the pilot eat the terminator cats for a while; an eaten cat is off the board for a few seconds.
  const MAZE_MAP = [
    '###############',
    '#O.....#.....O#',
    '#.##.#.#.#.##.#',
    '#.#..#...#..#.#',
    '#.#.###.###.#.#',
    '#.............#',
    '###.##.#.##.###',
    '#.....#C#.....#',
    '#.###..C..###.#',
    '#.....#C#.....#',
    '###.##.#.##.###',
    '#.............#',
    '#.#.###.###.#.#',
    '#.#..#.P.#..#.#',
    '#.##.#.#.#.##.#',
    '#O.....#.....O#',
    '###############',
  ];
  const MAZE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const MAZE_PLAYER_SPEED = 6.2, MAZE_CAT_SPEED = 3, MAZE_HEARTS = 5, MAZE_READY = 2.2, FRUIT_KINDS = 3;
  const CANDY_TIME = 8, CAT_GONE_TIME = 6, SCARED_PACE = .55;
  function startMaze() {
    const rows = MAZE_MAP.length, cols = MAZE_MAP[0].length, wall = new Uint8Array(rows * cols), fruit = new Map(), candies = new Set(), cats = [];
    let start = { c: 1, r: 1 };
    MAZE_MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '#') wall[r * cols + c] = 1;
      else if (ch === '.') fruit.set(r * cols + c, (r * 7 + c * 3) % FRUIT_KINDS);
      else if (ch === 'O') candies.add(r * cols + c);
      else if (ch === 'P') start = { c, r };
      else if (ch === 'C') cats.push({ home: { c, r }, c, r, t: 0, d: null, kind: cats.length, releaseAt: 0, scaredUntil: 0, goneUntil: 0 });
    }));
    maze = { rows, cols, wall, fruit, candies, candyUntil: 0, catsEaten: 0, total: fruit.size, eaten: 0, start, cats, hearts: MAZE_HEARTS, at: time, invulnUntil: 0, clearedAt: 0, lostAt: 0, chomp: 0, want: null, dist: null, distFrom: -1,
      player: { c: start.c, r: start.r, t: 0, d: null, face: 0 } };
    resetMazeActors(MAZE_READY);
    mode = 'maze'; blackHole = null; screenFlash = 1; keys.clear(); resetGesture();
    document.body.classList.remove('blackhole'); document.body.classList.add('maze');
  }
  function resetMazeActors(delay) {
    const z = maze; z.readyUntil = time + delay; z.invulnUntil = z.readyUntil + .8;
    Object.assign(z.player, { c: z.start.c, r: z.start.r, t: 0, d: null }); z.want = null;
    z.candyUntil = 0;
    z.cats.forEach((cat, i) => Object.assign(cat, { c: cat.home.c, r: cat.home.r, t: 0, d: null, releaseAt: z.readyUntil + i * 3, scaredUntil: 0, goneUntil: 0 }));
  }
  const mazeOpen = (c, r) => { const z = maze; return c >= 0 && r >= 0 && c < z.cols && r < z.rows && !z.wall[r * z.cols + c]; };
  const mazeX = a => a.c + .5 + (a.d ? a.d[0] * a.t : 0), mazeY = a => a.r + .5 + (a.d ? a.d[1] * a.t : 0);
  // Moves an actor along the grid; at every cell centre `decide` picks the next direction (or null to stop).
  function mazeMove(a, spd, dt, decide, arrive) {
    let left = spd * dt, guard = 0;
    while (left > 1e-6 && guard++ < 8) {
      if (a.t === 0) { a.d = decide(a); if (!a.d) return; }
      const go = Math.min(1 - a.t, left); a.t += go; left -= go;
      if (a.t >= 1 - 1e-9) { a.c += a.d[0]; a.r += a.d[1]; a.t = 0; if (arrive) arrive(a); }
    }
  }
  // Wanted direction: the most recent arrow/WASD key, the gamepad, or the direction of a swipe/drag.
  function mazeInput() {
    let want = null;
    for (const k of keys) {
      const d = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 }[k];
      if (d !== undefined) want = MAZE_DIRS[d];
    }
    if (Math.abs(padSteer) > .5) want = MAZE_DIRS[padSteer > 0 ? 1 : 3];
    else if (padVert) want = MAZE_DIRS[padVert > 0 ? 2 : 0];
    if (gesture.id !== null) {
      const dx = gesture.x - gesture.originX, dy = gesture.y - gesture.originY;
      if (Math.hypot(dx, dy) > 16) want = Math.abs(dx) > Math.abs(dy) ? MAZE_DIRS[dx > 0 ? 1 : 3] : MAZE_DIRS[dy > 0 ? 2 : 0];
    }
    return want;
  }
  // Path distances from the player's cell (breadth-first), used by the chasing cats.
  function mazeDistances() {
    const z = maze, from = z.player.r * z.cols + z.player.c;
    if (z.distFrom === from && z.dist) return z.dist;
    const dist = new Int16Array(z.rows * z.cols).fill(-1), queue = [from]; dist[from] = 0;
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i], c = cell % z.cols, r = Math.floor(cell / z.cols);
      for (const [dc, dr] of MAZE_DIRS) { const nc = c + dc, nr = r + dr, n = nr * z.cols + nc; if (mazeOpen(nc, nr) && dist[n] < 0) { dist[n] = dist[cell] + 1; queue.push(n); } }
    }
    z.dist = dist; z.distFrom = from; return dist;
  }
  // Terminator cat brains: #0 hunts along the shortest path, #1 cuts the player off ahead, #2 hunts or prowls at random.
  function catDecide(cat) {
    const z = maze, p = z.player, back = cat.d ? [-cat.d[0], -cat.d[1]] : null;
    let options = MAZE_DIRS.filter(d => mazeOpen(cat.c + d[0], cat.r + d[1]) && !(back && d[0] === back[0] && d[1] === back[1]));
    if (!options.length) options = back ? [back] : [];
    if (options.length < 2) return options[0] || null;
    const dist = mazeDistances(), at = d => { const v = dist[(cat.r + d[1]) * z.cols + cat.c + d[0]]; return v < 0 ? 999 : v; };
    if (time < cat.scaredUntil) return options.reduce((best, d) => at(d) > at(best) ? d : best);
    if (cat.kind === 2 && random(time * 13 + cat.c * 7 + cat.r) < .35) return options[Math.floor(random(time * 31 + cat.r) * options.length)];
    if (cat.kind === 1) {
      const ahead = p.d || [0, 0], tx = p.c + ahead[0] * 3, ty = p.r + ahead[1] * 3;
      return options.reduce((best, d) => Math.hypot(cat.c + d[0] - tx, cat.r + d[1] - ty) < Math.hypot(cat.c + best[0] - tx, cat.r + best[1] - ty) ? d : best);
    }
    return options.reduce((best, d) => at(d) < at(best) ? d : best);
  }
  function updateMaze(dt) {
    const z = maze;
    if (z.clearedAt) { if (time - z.clearedAt > 2.4) leaveMazeForInvasion(); return; }
    if (z.lostAt) { if (!z.over && time - z.lostAt > 2) showMazeLost(); return; }
    const want = mazeInput(); if (want) z.want = want;
    if (time < z.readyUntil) return;
    // Player: buffered turns, instant reversals.
    const p = z.player;
    if (z.want && p.d && p.t > 0 && z.want[0] === -p.d[0] && z.want[1] === -p.d[1]) { p.c += p.d[0]; p.r += p.d[1]; p.t = 1 - p.t; p.d = z.want; }
    mazeMove(p, MAZE_PLAYER_SPEED, dt, a => (z.want && mazeOpen(a.c + z.want[0], a.r + z.want[1]) ? z.want : a.d && mazeOpen(a.c + a.d[0], a.r + a.d[1]) ? a.d : null), a => {
      const cell = a.r * z.cols + a.c;
      if (z.fruit.has(cell)) {
        z.fruit.delete(cell); z.eaten++; z.chomp = time;
        playToneSweep(660 + (z.eaten % 4) * 110, 990 + (z.eaten % 4) * 110, .07, 'square', .035);
        if (!z.fruit.size) mazeCleared();
      }
      if (z.candies.has(cell)) { z.candies.delete(cell); eatSuperCandy(); }
    });
    if (p.d) p.face = Math.atan2(p.d[1], p.d[0]) + Math.PI / 2;
    if (z.clearedAt) return;
    // Cats get a little faster as the fruit disappears; scared cats crawl.
    const pace = MAZE_CAT_SPEED * (1 + .2 * z.eaten / z.total);
    for (const cat of z.cats) {
      if (cat.goneUntil) {
        if (time < cat.goneUntil) continue;
        Object.assign(cat, { c: cat.home.c, r: cat.home.r, t: 0, d: null, goneUntil: 0, scaredUntil: 0, releaseAt: time + .8 }); // respawn in the den
        playToneSweep(200, 900, .3, 'sawtooth', .04);
      }
      if (time < cat.releaseAt) continue;
      const scared = time < cat.scaredUntil;
      mazeMove(cat, pace * (scared ? SCARED_PACE : 1), dt, catDecide);
      if (Math.hypot(mazeX(cat) - mazeX(p), mazeY(cat) - mazeY(p)) < .62) {
        if (scared) eatTerminatorCat(cat);
        else if (time > z.invulnUntil) { mazeCaught(); return; }
      }
    }
  }
  // Super candy: every cat on the board turns scared (and turns around) for a while.
  function eatSuperCandy() {
    const z = maze; z.candyUntil = time + CANDY_TIME; z.chomp = time;
    for (const cat of z.cats) if (!cat.goneUntil) { cat.scaredUntil = z.candyUntil; if (cat.d && cat.t > 0) { cat.c += cat.d[0]; cat.r += cat.d[1]; cat.t = 1 - cat.t; cat.d = [-cat.d[0], -cat.d[1]]; } }
    showCallout('🍬 SUPER CANDY! EAT THE CATS!', '#80faff'); playToneSweep(300, 1600, .45, 'triangle', .07); buzz([30, 30, 30]);
  }
  function eatTerminatorCat(cat) {
    const z = maze; z.catsEaten++; cat.goneUntil = time + CAT_GONE_TIME; cat.scaredUntil = 0;
    addCredits(25 * Math.min(4, z.catsEaten), 'CAT CRUNCHED');
    showCallout('CAT CRUNCHED!', '#80faff'); playNoiseBurst(.25, .2, 5000, 400); playToneSweep(1200, 200, .3, 'square', .06); shake = Math.max(shake, .5);
  }
  function mazeCaught() {
    const z = maze; z.hearts--; shake = 1.2; screenFlash = .8; buzz([120, 60, 240]);
    playExplosionSound(1); playToneSweep(520, 60, .8, 'sawtooth', .09);
    if (z.hearts <= 0) { z.lostAt = time; showCallout('CAUGHT!', '#ff456d'); return; }
    showCallout(`CAUGHT! ${z.hearts} ♥ LEFT`, '#ff456d'); resetMazeActors(1.6);
  }
  function mazeCleared() {
    const z = maze; z.clearedAt = time;
    unlockAchievement('maze'); addCredits(z.total * 2 + 150, 'BLACK HOLE MAZE');
    showCallout('MAZE CLEARED!', '#3dffa6'); launchConfetti(); playFanfare();
  }
  // All fruit eaten: straight into the invasion (alarm, countdown, boss fight).
  function leaveMazeForInvasion() {
    maze = null; document.body.classList.remove('maze');
    $('hud').classList.add('hidden'); rivals = []; ufos = []; bombs = []; enemyShots = []; shield = 100;
    startInvasion();
  }
  function showMazeLost() {
    const z = maze; z.over = true; mode = 'finished'; invasionArmed = false;
    $('hud').classList.add('hidden');
    $('result-eyebrow').textContent = `BLACK HOLE MAZE / ${tracks[trackIndex].name}`; $('result-title').textContent = 'CAUGHT BY TERMINATOR CATS.';
    $('result-position').textContent = '—'; $('result-time').textContent = formatTime(elapsed); $('result-lap').textContent = `${z.eaten}/${z.total}`;
    $('result-record').textContent = 'Eat every fruit to escape the black hole.';
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`; renderResultXp();
    $('cup-standings').classList.add('hidden'); $('results').classList.remove('hidden');
  }
  // ---- Maze drawing.
  function mazeLayout() {
    const z = maze, top = Math.max(46, H * .07), cell = Math.floor(Math.min((W - 16) / z.cols, (H - top - 12) / z.rows));
    return { cell, ox: Math.round((W - cell * z.cols) / 2), oy: Math.round(top + (H - top - 6 - cell * z.rows) / 2), top };
  }
  function renderMaze() {
    const z = maze, L = mazeLayout(), { cell, ox, oy } = L;
    ctx.save();
    if (shakeAmount() > .03) ctx.translate(Math.sin(time * 121) * shakeAmount() * 6, Math.cos(time * 93) * shakeAmount() * 5);
    // Inside the black hole: a slowly turning swirl of stars.
    ctx.fillStyle = '#04020e'; ctx.fillRect(-20, -20, W + 40, H + 40);
    for (let i = 0; i < 120; i++) {
      const a = random(i) * TAU + time * (.05 + random(i + 3) * .1), r = Math.max(W, H) * (.05 + random(i + 9) * .7);
      ctx.fillStyle = i % 3 ? '#8f7ad8' : '#ffb14a'; ctx.globalAlpha = .35 + random(i + 5) * .5; ctx.fillRect(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * .7, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Walls: dark blocks with a neon rim wherever they meet the corridors.
    for (let r = 0; r < z.rows; r++) for (let c = 0; c < z.cols; c++) {
      if (!z.wall[r * z.cols + c]) continue;
      const x = ox + c * cell, y = oy + r * cell;
      ctx.fillStyle = '#1a0d38'; ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = '#ff46bc'; ctx.lineWidth = Math.max(1.5, cell * .09); ctx.shadowColor = '#ff46bc'; ctx.shadowBlur = cell * .35;
      ctx.beginPath();
      if (mazeOpen(c, r - 1)) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
      if (mazeOpen(c, r + 1)) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
      if (mazeOpen(c - 1, r)) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
      if (mazeOpen(c + 1, r)) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    // The cats' den: a tiny black hole in the middle of the maze.
    const den = z.cats[1] ? z.cats[1].home : z.cats[0].home, dx = ox + (den.c + .5) * cell, dy = oy + (den.r + .5) * cell;
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(time * 2); ctx.strokeStyle = '#ff9b2e88'; ctx.lineWidth = cell * .12; ctx.beginPath(); ctx.ellipse(0, 0, cell * 1.1, cell * .35, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // Fruit: cherries, lemons and grapes (bobbing).
    for (const [cellIndex, kind] of z.fruit) {
      const c = cellIndex % z.cols, r = Math.floor(cellIndex / z.cols), x = ox + (c + .5) * cell, y = oy + (r + .5) * cell + Math.sin(time * 4 + cellIndex) * cell * .04;
      drawFruit(x, y, cell * .2, kind);
    }
    for (const cellIndex of z.candies) drawSuperCandy(ox + (cellIndex % z.cols + .5) * cell, oy + (Math.floor(cellIndex / z.cols) + .5) * cell, cell * .36, cellIndex);
    // Terminator cats (eaten ones are off the board until they respawn).
    for (const cat of z.cats) if (!cat.goneUntil) drawTerminatorCat(ox + mazeX(cat) * cell, oy + mazeY(cat) * cell, cell * .92, time < cat.releaseAt, cat);
    // The player's ship, facing where it flies; blinking while protected.
    const p = z.player, m = machines[shipIndex];
    if (!z.lostAt && !(time < z.invulnUntil && time > z.readyUntil && Math.sin(time * 30) < 0)) drawShip(ox + mazeX(p) * cell, oy + mazeY(p) * cell, cell * .82, m.color, m.dark, 0, true, false, true, p.face);
    if (time - z.chomp < .2) { ctx.globalAlpha = 1 - (time - z.chomp) * 5; ctx.fillStyle = '#ddff46'; ctx.beginPath(); ctx.arc(ox + mazeX(p) * cell, oy + mazeY(p) * cell, cell * (.3 + (time - z.chomp) * 3), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    // Top line: hearts, title, fruit count.
    const fs = Math.max(12, Math.min(20, W * .035));
    ctx.font = `700 ${fs}px 'Barlow Condensed', sans-serif`; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#ff456d'; ctx.fillText('♥'.repeat(Math.max(0, z.hearts)) + '♡'.repeat(Math.max(0, MAZE_HEARTS - z.hearts)), 14, L.top / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ddff46'; ctx.fillText('BLACK HOLE MAZE', W / 2, L.top / 2);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(`FRUIT ${z.eaten}/${z.total}`, W - 64, L.top / 2);
    // Super candy timer under the title.
    const candyLeft = z.candyUntil - time;
    if (candyLeft > 0 && !z.clearedAt) {
      const bw = Math.min(W * .5, 260), bx = W / 2 - bw / 2, by = L.top - 8;
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = candyLeft < 2 && Math.sin(time * 20) < 0 ? '#ffffff' : '#80faff'; ctx.fillRect(bx, by, bw * candyLeft / CANDY_TIME, 5);
    }
    // Big centre messages.
    const msg = z.over ? null : z.clearedAt ? ['MAZE CLEARED!', 'THE INVASION IS COMING…'] : z.lostAt ? ['CAUGHT!', ''] : time < z.readyUntil ? ['EAT ALL THE FRUIT!', window.matchMedia?.('(pointer: coarse)')?.matches ? 'SWIPE TO STEER · DODGE THE TERMINATOR CATS' : 'ARROW KEYS / WASD · DODGE THE TERMINATOR CATS', '🍬 SUPER CANDY: EAT THE CATS FOR A WHILE'] : null;
    if (msg) {
      ctx.textAlign = 'center'; ctx.font = `900 ${Math.round(Math.min(W * .08, 54))}px 'Barlow Condensed', sans-serif`;
      ctx.lineWidth = 6; ctx.strokeStyle = '#04020e'; ctx.strokeText(msg[0], W / 2, H * .44); ctx.fillStyle = z.lostAt ? '#ff456d' : '#ddff46'; ctx.fillText(msg[0], W / 2, H * .44);
      if (msg[2]) { ctx.font = `700 ${Math.round(Math.max(12, Math.min(W * .032, 20)))}px 'Barlow Condensed', sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = '#04020e'; ctx.strokeText(msg[2], W / 2, H * .44 + Math.min(W * .07, 44) * 1.8); ctx.fillStyle = '#80faff'; ctx.fillText(msg[2], W / 2, H * .44 + Math.min(W * .07, 44) * 1.8); }
      if (msg[1]) { ctx.font = `700 ${Math.round(Math.max(12, Math.min(W * .032, 20)))}px 'Barlow Condensed', sans-serif`; ctx.lineWidth = 4; ctx.strokeText(msg[1], W / 2, H * .44 + Math.min(W * .07, 44)); ctx.fillStyle = '#fff'; ctx.fillText(msg[1], W / 2, H * .44 + Math.min(W * .07, 44)); }
    }
    if (flashAmount(screenFlash) > .015) { ctx.fillStyle = `rgba(255,255,255,${flashAmount(screenFlash) * .7})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.fillStyle = '#05051b12'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  function drawFruit(x, y, s, kind) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 0) { // cherries
      line(-s * .4, -s * .1, s * .1, -s * 1.1, '#5fd36a', Math.max(1, s * .14)); line(s * .45, -s * .05, s * .1, -s * 1.1, '#5fd36a', Math.max(1, s * .14));
      for (const [cx, cy] of [[-s * .45, s * .2], [s * .45, s * .3]]) { ctx.beginPath(); ctx.arc(cx, cy, s * .48, 0, TAU); ctx.fillStyle = '#ff2f5e'; ctx.fill(); ctx.fillStyle = '#ffd1dc'; ctx.fillRect(cx - s * .2, cy - s * .25, s * .14, s * .14); }
    } else if (kind === 1) { // lemon
      ctx.beginPath(); ctx.ellipse(0, 0, s * .85, s * .6, -.4, 0, TAU); ctx.fillStyle = '#ffe24a'; ctx.fill(); ctx.fillStyle = '#fff6b0'; ctx.fillRect(-s * .35, -s * .3, s * .2, s * .14);
    } else { // grapes
      for (const [gx, gy] of [[-s * .3, -s * .3], [s * .3, -s * .3], [0, 0], [-s * .3, s * .3], [s * .3, s * .3], [0, s * .6]]) { ctx.beginPath(); ctx.arc(gx, gy, s * .3, 0, TAU); ctx.fillStyle = '#a45cff'; ctx.fill(); }
      line(0, -s * .55, s * .2, -s * .95, '#5fd36a', Math.max(1, s * .12));
    }
    ctx.restore();
  }
  // Super candy: a big wrapped sweet, pulsing in rainbow colours.
  function drawSuperCandy(x, y, s, seed) {
    const pulse = 1 + Math.sin(time * 6 + seed) * .12, hue = (time * 120 + seed * 40) % 360;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 2 + seed) * .3); ctx.scale(pulse, pulse);
    ctx.shadowColor = `hsl(${hue},100%,65%)`; ctx.shadowBlur = s * 1.2;
    for (const side of [-1, 1]) polygon([[side * s * .7, 0], [side * s * 1.35, -s * .55], [side * s * 1.35, s * .55]], `hsl(${(hue + 120) % 360},100%,70%)`);
    ctx.beginPath(); ctx.arc(0, 0, s * .78, 0, TAU); ctx.fillStyle = `hsl(${hue},100%,62%)`; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = Math.max(1, s * .16);
    ctx.beginPath(); ctx.arc(0, 0, s * .45, -2.4, .2); ctx.stroke();
    ctx.restore();
  }
  // Chrome cat skull with one glowing red eye and steel fangs; scared it turns blue, with a wobbly mouth.
  function drawTerminatorCat(x, y, s, waiting, cat) {
    const scaredLeft = cat.scaredUntil - time;
    if (scaredLeft > 0) { drawScaredCat(x, y, s, scaredLeft < 2 && Math.sin(time * 18) < 0); return; }
    ctx.save(); ctx.translate(x, y); if (waiting) ctx.globalAlpha = .55 + Math.sin(time * 6 + cat.kind) * .2;
    const look = cat.d ? cat.d[0] : 0, step = Math.sin(time * 14 + cat.kind) * s * .05;
    ctx.shadowColor = '#ff2020'; ctx.shadowBlur = s * .4;
    for (const side of [-1, 1]) polygon([[side * s * .4, -s * .05], [side * s * .36, -s * .52], [side * s * .1, -s * .3]], '#5d6474', '#c9d2e3', Math.max(1, s * .04));
    const metal = ctx.createLinearGradient(0, -s * .4, 0, s * .4); metal.addColorStop(0, '#e2e8f3'); metal.addColorStop(.5, '#8e97a9'); metal.addColorStop(1, '#4a5162');
    ctx.beginPath(); ctx.ellipse(0, 0, s * .42, s * .36, 0, 0, TAU); ctx.fillStyle = metal; ctx.fill(); ctx.lineWidth = Math.max(1, s * .03); ctx.strokeStyle = '#2b3040'; ctx.stroke();
    // One red eye (the other a steel plate with a bolt).
    ctx.beginPath(); ctx.arc(-s * .15 + look * s * .04, -s * .07, s * .09, 0, TAU); ctx.fillStyle = '#ff1a1a'; ctx.fill();
    ctx.fillStyle = '#ffd0d0'; ctx.beginPath(); ctx.arc(-s * .15 + look * s * .04, -s * .07, s * .03, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#3a4050'; ctx.fillRect(s * .06, -s * .14, s * .2, s * .13); ctx.fillStyle = '#c9d2e3'; ctx.beginPath(); ctx.arc(s * .16, -s * .075, s * .025, 0, TAU); ctx.fill();
    // Steel grin.
    ctx.fillStyle = '#1b1e28'; ctx.fillRect(-s * .2, s * .1, s * .4, s * .12);
    ctx.fillStyle = '#e8edf5'; for (let i = 0; i < 5; i++) ctx.fillRect(-s * .19 + i * s * .08, s * .1, s * .05, s * .06 + (i % 2) * s * .03);
    // Scurrying paws.
    ctx.fillStyle = '#8e97a9'; ctx.fillRect(-s * .32, s * .3 + step, s * .14, s * .1); ctx.fillRect(s * .18, s * .3 - step, s * .14, s * .1);
    ctx.restore();
  }
  function drawScaredCat(x, y, s, blink) {
    ctx.save(); ctx.translate(x + Math.sin(time * 30) * s * .03, y);
    const body = blink ? '#f2f4ff' : '#3b4fd8', rim = blink ? '#ff456d' : '#9fb0ff';
    for (const side of [-1, 1]) polygon([[side * s * .4, -s * .05], [side * s * .36, -s * .52], [side * s * .1, -s * .3]], body, rim, Math.max(1, s * .04));
    ctx.beginPath(); ctx.ellipse(0, 0, s * .42, s * .36, 0, 0, TAU); ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = Math.max(1, s * .03); ctx.strokeStyle = rim; ctx.stroke();
    ctx.fillStyle = blink ? '#3b4fd8' : '#ffffff';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * s * .15, -s * .07, s * .06, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = blink ? '#3b4fd8' : '#ffffff'; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const mx = -s * .22 + i * s * .073, my = s * .16 + (i % 2 ? -1 : 1) * s * .04; if (i) ctx.lineTo(mx, my); else ctx.moveTo(mx, my); }
    ctx.stroke(); ctx.restore();
  }
