  // ==== Race rendering and the frame loop.
  function polygon(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function background() {
    const t = tracks[trackIndex], horizon = H * .45;
    const sky = ctx.createLinearGradient(0, 0, 0, H * .7); sky.addColorStop(0, t.sky[0]); sky.addColorStop(.57, t.sky[1]); sky.addColorStop(1, t.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 95; i++) {
      const x = mod(random(i + 40) * W - playerX * 16, W), y = random(i + 80) * H * .46;
      ctx.fillStyle = i % 4 === 0 ? '#ffb5f9' : '#ccf4ff'; ctx.globalAlpha = .25 + random(i) * .6;
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    const sx = W * .72 - playerX * 35, sy = H * .29, radius = Math.min(W * .105, H * .17);
    const glow = ctx.createRadialGradient(sx, sy, radius * .3, sx, sy, radius * 2.8); glow.addColorStop(0, t.sun + '60'); glow.addColorStop(.4, '#ff4fa028'); glow.addColorStop(1, '#ff4fa000');
    ctx.fillStyle = glow; ctx.fillRect(sx - radius * 3, sy - radius * 3, radius * 6, radius * 6);
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, radius * (1 + beat * .025), 0, TAU); ctx.clip();
    const sun = ctx.createLinearGradient(0, sy - radius, 0, sy + radius); sun.addColorStop(0, '#ffeb8f'); sun.addColorStop(.45, t.sun); sun.addColorStop(1, '#ff4098');
    ctx.fillStyle = sun; ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    for (let i = 0; i < 9; i++) { const y = sy + i * radius * .12; ctx.fillStyle = t.sky[1]; ctx.fillRect(sx - radius, y, radius * 2, 1 + i * .9); }
    ctx.restore();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-.35); ctx.scale(1, .34); ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.6, radius * 1.6, 0, Math.PI * .05, Math.PI * .98); ctx.strokeStyle = '#ff80e29a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // Layered mountain silhouettes behind the megacity.
    for (let layer = 0; layer < 2; layer++) {
      const pts = [[0, H * .64]];
      for (let i = 0; i <= 24; i++) pts.push([i / 24 * W, horizon - random(i + layer * 60) * H * .12 + layer * 34]);
      pts.push([W, H * .64]); polygon(pts, layer ? '#19143e' : '#30205b', layer ? '#7e37a660' : '#a257b860');
    }
    for (let i = 0; i < 65; i++) {
      const x = mod(i / 65 * (W + 70) - playerX * 45 + Math.sin(position / LENGTH * TAU) * 75, W + 70) - 35;
      const width = 10 + random(i + 12) * 37, height = 25 + random(i + 5) ** 2 * H * .26;
      const y = horizon + H * .09 - height;
      ctx.fillStyle = i % 2 ? '#11102e' : '#181336'; ctx.fillRect(x, y, width, height + H * .1);
      const color = i % 3 === 0 ? t.edge : t.second;
      line(x, y, x + width, y, color + '60');
      if (i % 4 === 0) { line(x + width / 2, y, x + width / 2, y - 18, color + '90'); ctx.fillStyle = color; ctx.fillRect(x + width / 2 - 1, y - 20, 2, 2); }
      for (let row = 0; row < height / 10; row++) for (let col = 0; col < width / 7 - 1; col++) {
        if (random(i * 400 + row * 17 + col) > .48) { ctx.fillStyle = color + (row % 3 === 0 ? '90' : '38'); ctx.fillRect(x + 4 + col * 7, y + 6 + row * 10, 2, 3); }
      }
    }
    if (hyperTime > 0 && mode !== 'menu') drawHyperSpace();
    const ground = ctx.createLinearGradient(0, H * .5, 0, H); ground.addColorStop(0, t.fog); ground.addColorStop(.12, '#311248'); ground.addColorStop(1, '#0e0925');
    ctx.fillStyle = ground; ctx.fillRect(0, H * .55, W, H * .45);
    const gridHorizon = H * .51;
    for (let i = -14; i <= 14; i++) line(W / 2 + i * 22 - playerX * 15, gridHorizon, W / 2 + i * W / 7 - playerX * 130, H, t.edge + '28');
    for (let i = 0; i < 22; i++) { const q = mod(i / 22 + position / 50000, 1); const y = gridHorizon + q ** 3 * (H - gridHorizon); line(0, y, W, y, t.edge + '35'); }
  }
  function project(p, worldX, worldY, z, cameraY) {
    p.scale = DEPTH / Math.max(1, z); p.x = W * .5 + p.scale * worldX * W * .5;
    p.y = H * .45 - p.scale * (worldY - cameraY) * H * .5;
    p.w = p.scale * ROAD * W * .5 * tracks[trackIndex].width;
  }
  function roadStrip(a, b, left, right, color) {
    polygon([[a.x + a.w * left, a.y], [a.x + a.w * right, a.y], [b.x + b.w * right, b.y], [b.x + b.w * left, b.y]], color);
  }
  function hazardLane(hazard) {
    if (hazard.type === 'cat') return Math.sin(time * 1.55 + hazard.phase) * .64;
    return hazard.lane + (hazard.type === 'drone' ? Math.sin(time * 1.7 + hazard.phase) * .17 : 0);
  }
  function drawCat(s) {
    const a = s.p1, b = s.p2, width = lerp(a.w, b.w, .5), hazard = s.hazard;
    const size = width * .085, x = lerp(a.x, b.x, .5) + width * hazardLane(hazard), y = lerp(a.y, b.y, .5);
    if (size < 2) return;
    const color = hazard.color || '#ff9bf2', stride = Math.sin(time * 16 + hazard.phase) * .13;
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(time * 1.55 + hazard.phase) < 0 ? -1 : 1, 1);
    ctx.shadowColor = color; ctx.shadowBlur = Math.min(20, size * .55);
    ctx.beginPath(); ctx.moveTo(-size * .28, -size * .3); ctx.quadraticCurveTo(-size * .95, -size * .9 + stride * size, -size * .73, -size * 1.2); ctx.strokeStyle = '#d9d5f2'; ctx.lineWidth = size * .095; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-size * .12, -size * .38, size * .43, size * .24, -.08, 0, TAU); ctx.fillStyle = '#201d38'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .04); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(size * .26, -size * .54, size * .27, size * .24, 0, 0, TAU); ctx.fillStyle = '#27213e'; ctx.fill();
    polygon([[size * .07, -size * .65], [size * .09, -size * 1.02], [size * .3, -size * .77]], '#292441', color, Math.max(1, size * .035));
    polygon([[size * .35, -size * .74], [size * .56, -size * 1.03], [size * .54, -size * .56]], '#292441', color, Math.max(1, size * .035));
    for (let leg = 0; leg < 4; leg++) {
      const lx = (leg < 2 ? -1 : 1) * size * (.3 + (leg % 2) * .22), phase = stride * (leg % 2 ? -1 : 1);
      line(lx, -size * .26, lx + phase * size, size * .015, '#e3d8f7', size * .07);
    }
    ctx.fillStyle = '#fffcac'; ctx.shadowColor = color; ctx.shadowBlur = size * .25;
    ctx.beginPath(); ctx.arc(size * .34, -size * .56, size * .045, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(size * .49, -size * .56, size * .045, 0, TAU); ctx.fill();
    line(size * .1, -size * .2, size * .35, -size * .2, color, size * .075);
    ctx.restore();
  }
  function drawHazard(s, t) {
    const hazard = s.hazard, a = s.p1, b = s.p2, width = lerp(a.w, b.w, .5), y = lerp(a.y, b.y, .5);
    if (hazard.type === 'cat') { drawCat(s); return; }
    const x = lerp(a.x, b.x, .5) + width * hazardLane(hazard), size = width * (hazard.type === 'gate' ? .17 : .135);
    if (size < 2) return;
    const color = hazard.type === 'gate' ? '#ff456d' : hazard.type === 'drone' ? '#eaff55' : '#ff783e';
    ctx.save(); ctx.translate(x, y); ctx.shadowColor = color; ctx.shadowBlur = Math.min(28, size * .45);
    if (hazard.type === 'gate') {
      line(-size, 0, size, 0, '#60184b', size * .24);
      line(-size * .92, -size * .02, size * .92, -size * .02, color, size * .1);
      for (const side of [-1, 1]) {
        line(side * size * .86, 0, side * size * .86, -size * 1.45, '#ffad4a', size * .12);
        ctx.fillStyle = '#fff4a3'; ctx.fillRect(side * size * .86 - size * .08, -size * 1.5, size * .16, size * .12);
      }
      line(-size * .8, -size * .72, size * .8, -size * .72, '#ffd7ea', size * .055);
    } else if (hazard.type === 'drone') {
      const spin = time * 2.5 + hazard.phase;
      ctx.rotate(spin * .15);
      polygon([[-size * 1.3, 0], [-size * .52, -size * .32], [0, -size * .75], [size * .52, -size * .32], [size * 1.3, 0], [size * .52, size * .32], [0, size * .75], [-size * .52, size * .32]], '#432d45', color, Math.max(1, size * .06));
      ctx.fillStyle = '#fcffff'; ctx.beginPath(); ctx.arc(0, 0, size * .17, 0, TAU); ctx.fill();
      for (const side of [-1, 1]) {
        ctx.save(); ctx.rotate(spin * side); ctx.beginPath(); ctx.ellipse(side * size * .82, 0, size * .2, size * .055, 0, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .045); ctx.stroke(); ctx.restore();
      }
    } else {
      ctx.rotate(time * .55 + hazard.phase);
      const points = [];
      for (let i = 0; i < 12; i++) { const angle = i / 12 * TAU; const radius = size * (i % 2 ? .68 : 1); points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]); }
      polygon(points, '#732e36', color, Math.max(1, size * .065));
      ctx.fillStyle = '#fff1a5'; ctx.beginPath(); ctx.arc(0, 0, size * .19, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, size * 1.24, 0, TAU); ctx.strokeStyle = color + '90'; ctx.lineWidth = Math.max(1, size * .025); ctx.stroke();
    }
    ctx.restore();
  }
  function drawShortcutLead(s) {
    const a = s.p1, b = s.p2, lane = s.shortcutLead;
    if (s.index % 4 === 0) { const cx = b.x + b.w * lane, w = b.w * .1; polygon([[cx - w, a.y], [cx, b.y], [cx + w, a.y], [cx, lerp(a.y, b.y, .45)]], '#ff9b2ecc'); }
    else if (s.index % 4 === 2) roadStrip(a, b, lane - .12, lane + .12, '#ff9b2e22');
  }
  function drawShortcut(s) {
    const a = s.p1, b = s.p2, lane = s.shortcut.lane, w = lerp(a.w, b.w, .5), x = lerp(a.x, b.x, .5) + w * lane, y = lerp(a.y, b.y, .5);
    const size = w * .2; if (size < 2) return;
    ctx.save(); ctx.translate(x, y);
    // Tunnel mouth: dark hole in a striped frame with a sign above.
    ctx.fillStyle = '#05030c'; ctx.beginPath(); ctx.ellipse(0, -size * .55, size * .62, size * .62, 0, Math.PI, 0); ctx.lineTo(size * .62, 0); ctx.lineTo(-size * .62, 0); ctx.fill();
    ctx.lineWidth = Math.max(2, size * .14); ctx.strokeStyle = Math.sin(time * 8) > 0 ? '#ff9b2e' : '#ffe600'; ctx.setLineDash([size * .2, size * .14]);
    ctx.beginPath(); ctx.ellipse(0, -size * .55, size * .7, size * .7, 0, Math.PI, 0); ctx.lineTo(size * .7, 0); ctx.moveTo(-size * .7, 0); ctx.lineTo(-size * .7, -size * .55); ctx.stroke(); ctx.setLineDash([]);
    if (size > 14) { ctx.fillStyle = '#ff9b2e'; ctx.font = `bold ${Math.max(9, size * .22)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.fillText('⤳ SHORTCUT', 0, -size * 1.42); }
    ctx.restore();
  }
  function drawTrampoline(s, t) {
    const a = s.p1, b = s.p2, lane = s.trampoline.lane, width = lerp(a.w, b.w, .5), x = lerp(a.x, b.x, .5) + width * lane, y = lerp(a.y, b.y, .5);
    const size = width * .24;
    if (size < 2) return;
    roadStrip(a, b, lane - .27, lane + .27, '#183447');
    roadStrip(a, b, lane - .235, lane + .235, t.second + 'a0');
    ctx.save(); ctx.translate(x, y); ctx.shadowColor = t.second; ctx.shadowBlur = Math.min(24, size * .5);
    polygon([[-size, 0], [size, 0], [size * .72, -size * .25], [size * .42, -size * .7], [-size * .42, -size * .7], [-size * .72, -size * .25]], '#28264c', t.second, Math.max(1, size * .06));
    line(-size * .55, -size * .18, size * .55, -size * .18, t.edge, Math.max(1, size * .055));
    for (let i = -1; i <= 1; i++) {
      const ax = i * size * .35;
      line(ax, -size * .32, ax, -size * (.48 + .08 * Math.sin(time * 9 + i)), '#fff3a2', Math.max(1, size * .06));
      line(ax - size * .1, -size * .42, ax, -size * .53, '#fff3a2', Math.max(1, size * .05));
      line(ax + size * .1, -size * .42, ax, -size * .53, '#fff3a2', Math.max(1, size * .05));
    }
    ctx.restore();
  }
  function drawExplosion(x, y, width, explosion) {
    const progress = clamp((time - explosion.started) / explosion.duration, 0, 1);
    const radius = Math.max(2, width * (.07 + progress * .14) * explosion.size);
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - progress;
    if (explosion.cartoon) {
      const colors = ['#fff6ae', '#ff80e8', '#58f8ff', '#e2ff59', '#a88aff'];
      ctx.beginPath(); ctx.arc(0, 0, radius * (1 + progress * 2.4), 0, TAU); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, width * .015 * (1 - progress)); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * (.6 + progress * 2.8), 0, TAU); ctx.strokeStyle = '#ff82ec'; ctx.lineWidth = Math.max(1, width * .03 * (1 - progress)); ctx.stroke();
      for (let i = 0; i < 22; i++) {
        const angle = i / 22 * TAU + explosion.seed, reach = radius * (.5 + progress * 2.3 + random(explosion.seed + i) * .7);
        const px = Math.cos(angle) * reach, py = Math.sin(angle) * reach, pixel = Math.max(2, width * (.018 + random(i + explosion.seed * 2) * .025));
        ctx.save(); ctx.translate(px, py); ctx.rotate(angle + progress * 3); ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-pixel / 2, -pixel / 2, pixel, pixel); ctx.restore();
      }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.arc(0, 0, radius * (1.1 + progress * 1.5), 0, TAU); ctx.strokeStyle = '#fff7d0'; ctx.lineWidth = Math.max(1, width * .012 * (1 - progress)); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, radius * (.55 + progress * 2.2), 0, TAU); ctx.strokeStyle = explosion.color; ctx.lineWidth = Math.max(1, width * .025 * (1 - progress)); ctx.stroke();
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
    core.addColorStop(0, '#ffffff'); core.addColorStop(.22, '#fff18b'); core.addColorStop(.57, explosion.color); core.addColorStop(1, explosion.color + '00');
    ctx.fillStyle = core; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    for (let i = 0; i < 13; i++) {
      const angle = i / 13 * TAU + explosion.seed, reach = radius * (.6 + random(explosion.seed + i) * 1.7);
      line(Math.cos(angle) * radius * .24, Math.sin(angle) * radius * .24, Math.cos(angle) * reach, Math.sin(angle) * reach,
        i % 3 === 0 ? '#fff3a1' : explosion.color, Math.max(1, width * .009 * (1 - progress)));
    }
    ctx.restore();
  }
  function drawRoad() {
    const t = tracks[trackIndex], base = Math.floor(position / SEG), percent = position % SEG / SEG;
    const playerSeg = mod(base + 5, COUNT), elevation = lerp(segments[playerSeg].y, segments[mod(playerSeg + 1, COUNT)].y, percent);
    const cameraY = elevation + 1030 + (photo ? photo.h * 900 : 0), camX = playerX + (photo ? photo.x : 0);
    let x = 0, dx = -segments[base].curve * percent, clipY = H + 500;
    const visible = [];
    for (let n = 0; n < 185; n++) {
      const index = mod(base + n, COUNT), s = segments[index], next = segments[mod(index + 1, COUNT)];
      const z = (n - percent) * SEG;
      project(s.p1, x - camX * ROAD, s.y, z, cameraY);
      project(s.p2, x + dx - camX * ROAD, next.y, z + SEG, cameraY);
      x += dx; dx += s.curve;
      s.clip = clipY; s.depth = n;
      if (z <= DEPTH || s.p2.y >= s.p1.y || s.p2.y >= clipY) continue;
      visible.push(s); clipY = s.p2.y;
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const s = visible[i], a = s.p1, b = s.p2;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, s.clip); ctx.clip();
      const alt = Math.floor(s.index / 3) % 2;
      roadStrip(a, b, -1.12, 1.12, '#070e26');
      roadStrip(a, b, -1.055, 1.055, alt ? t.edge : t.second);
      roadStrip(a, b, -1, 1, alt ? t.road : '#11102e');
      roadStrip(a, b, -.986, -.974, '#ffffff80'); roadStrip(a, b, .974, .986, '#ffffff80');
      if (s.index % 9 < 4) { roadStrip(a, b, -.338, -.332, '#b6c7ff55'); roadStrip(a, b, .332, .338, '#b6c7ff55'); }
      if (s.index % 6 === 0) line(b.x - b.w, b.y, b.x + b.w, b.y, t.second + '20');
      if (s.pad) {
        roadStrip(a, b, s.padLane - .29, s.padLane + .29, s.index % 3 === 0 ? '#d1ffff' : '#15bccc');
        if (s.index % 3 === 1) { const cx = b.x + b.w * s.padLane; polygon([[cx - b.w * .18, a.y], [cx, b.y], [cx + b.w * .18, a.y], [cx, lerp(a.y, b.y, .5)]], '#a5ffff'); }
      }
      if (s.shortcutLead !== undefined && mode !== 'menu') drawShortcutLead(s);
      if (s.shortcut && mode !== 'menu' && s.depth > 3) drawShortcut(s);
      if (s.trampoline) drawTrampoline(s, t);
      if (s.stargate && mode !== 'menu' && s.depth > 3) drawStarGate(s, t);
      if (s.powerup && mode !== 'menu' && s.depth > 3 && !hitPowerups.has(Math.floor((distance + (s.index * SEG < mod(distance, LENGTH) ? LENGTH : 0)) / LENGTH) * COUNT + s.index)) drawPowerupPickup(s);
      if (s.hazard) drawHazard(s, t);
      for (const bomb of bombs) {
        const worldPosition = mod(bomb.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(worldPosition / SEG) === s.index && s.depth > 4) drawBomb(s, bomb, t);
      }
      if (s.index < 5) {
        for (let c = 0; c < 14; c++) roadStrip(a, b, -1 + c / 7, -1 + (c + 1) / 7, (c + s.index) % 2 ? '#ebf7ff' : '#202047');
      }
      // Raised luminous barrier strips give the floating road its shape.
      const railA = Math.min(40, a.w * .052), railB = Math.min(40, b.w * .052);
      for (const side of [-1, 1]) {
        polygon([[a.x + a.w * side * 1.06, a.y], [b.x + b.w * side * 1.06, b.y], [b.x + b.w * side * 1.06, b.y - railB], [a.x + a.w * side * 1.06, a.y - railA]], alt ? t.edge + 'a0' : t.second + '80');
        line(a.x + a.w * side * 1.06, a.y - railA, b.x + b.w * side * 1.06, b.y - railB, side === -1 ? t.edge : t.second, Math.max(1, a.w * .003));
      }
      if (s.tower && s.depth > 9 && s.depth < 145 && !(hyperTime > 0 && hyperFade() > .5)) drawScenery(s, t);
      if (s.arch && s.depth > 6) drawArch(s, t);
      for (const ufo of ufos) {
        const worldPosition = mod(ufo.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(worldPosition / SEG) === s.index && s.depth > 6 && s.depth < 150) drawUfo(s, ufo);
      }
      if (s.depth > 90) { ctx.globalAlpha = (s.depth - 90) / 95 * .6; roadStrip(a, b, -1.09, 1.09, t.fog); ctx.globalAlpha = 1; }
      if (mode !== 'menu') {
        for (const r of rivals) {
          if (!r.alive && !r.dying) continue;
          const rz = mod(r.distance, LENGTH);
          if (Math.floor(rz / SEG) === s.index && s.depth > 5) {
            const f = rz % SEG / SEG, rw = lerp(a.w, b.w, f);
            const rx = lerp(a.x, b.x, f) + rw * r.x, ry = lerp(a.y, b.y, f) - rw * .035;
            r.screen = { x: rx, y: ry, size: rw * .115, at: time };
            if (r.dying) {
              // Spin accelerates and the ship sags as its anti-gravity fails.
              const t = clamp((time - r.dying.started) / WRECK_TIME, 0, 1);
              const flicker = Math.sin(time * 40) > .3 ? '#ffffff' : r.color;
              drawShip(rx, ry + rw * .02 * t, rw * .115, t > .7 ? flicker : r.color, '#1d1828', 0, false, false, false, r.dying.spin * (t * t * 14 + t * 2));
              drawSmoke(rx, ry, rw * .115, r);
            } else {
              drawShip(rx, ry, rw * .115, r.color, r.dark || '#393156', Math.sin(time + r.seed) * .1, false, r.boosting);
              if (r.bubbleUntil > time) { ctx.save(); ctx.strokeStyle = '#4df8ff'; ctx.globalAlpha = .55 + .25 * Math.sin(time * 8); ctx.lineWidth = Math.max(1.5, rw * .006); ctx.beginPath(); ctx.ellipse(rx, ry - rw * .03, rw * .16, rw * .1, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
              if (r.nemesis && rw * .115 > 26) {
                const fs = Math.max(11, Math.min(15, rw * .03)); ctx.save(); ctx.font = `${fs}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center';
                const label = `☠ ${r.nemesis.name}  ${'▮'.repeat(Math.max(0, r.hull))}`; const w = ((ctx.measureText(label) || {}).width || label.length * fs * .6) + 12, ty = ry - rw * .115 * .95;
                ctx.fillStyle = '#09091acc'; ctx.fillRect(rx - w / 2, ty - fs, w, fs + 6); ctx.fillStyle = r.nemesis.color; ctx.fillText(label, rx, ty); ctx.restore();
              }
            }
          }
        }
      }
      for (const m of missiles) {
        const wp = mod(m.distance, LENGTH);
        if (mode !== 'menu' && Math.floor(wp / SEG) === s.index && s.depth > 4) { const f = wp % SEG / SEG, rw = lerp(a.w, b.w, f); drawMissile(lerp(a.x, b.x, f) + rw * m.lane, lerp(a.y, b.y, f) - rw * .06, rw, m); }
      }
      for (const explosion of explosions) {
        const worldPosition = mod(explosion.distance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 5) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          drawExplosion(lerp(a.x, b.x, f) + rw * explosion.lane, lerp(a.y, b.y, f) - rw * .035, rw * .36, explosion);
        }
      }
      for (const shot of laserShots) {
        if (shot.screen) continue;
        const worldPosition = mod(shot.distance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 4) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          shot.x = lerp(a.x, b.x, f) + rw * shot.lane;
          shot.y = lerp(a.y, b.y, f) - rw * (shot.air ? .43 : .035);
        }
      }
      for (const shot of enemyShots) {
        const worldPosition = mod(shot.sourceDistance, LENGTH);
        if (Math.floor(worldPosition / SEG) === s.index && s.depth > 5) {
          const f = worldPosition % SEG / SEG, rw = lerp(a.w, b.w, f);
          shot.x = lerp(a.x, b.x, f) + rw * shot.sourceLane;
          shot.y = lerp(a.y, b.y, f) - rw * .14;
        }
      }
      ctx.restore();
    }
  }
  function drawScenery(s, t) {
    const a = s.p1, side = s.index % 18 === 0 ? -1 : 1;
    const x = a.x + side * a.w * (1.5 + random(s.index) * .8), width = a.w * (.13 + random(s.index + 1) * .18);
    const height = a.w * (.5 + random(s.index + 2) * 1.1), y = a.y;
    const color = s.index % 27 === 0 ? '#deff43' : side < 0 ? t.edge : t.second;
    polygon([[x, y], [x, y - height], [x + width, y - height - width * .2], [x + width, y]], '#131032', color + '90', 1);
    polygon([[x + width, y], [x + width, y - height - width * .2], [x + width * 1.4, y - height], [x + width * 1.4, y]], '#221340', color + '40');
    for (let k = 1; k < 9; k++) line(x + width * .15, y - height * k / 10, x + width * .8, y - height * k / 10, color + (k % 3 === 0 ? '99' : '35'), Math.max(1, a.w * .009));
    if (s.index % 36 === 0) {
      ctx.save(); ctx.translate(x + width * .5, y - height * .55); ctx.rotate(-Math.PI / 2); ctx.fillStyle = color;
      ctx.font = `800 ${Math.max(6, width * .55)}px ${'sans-serif'}`; ctx.textAlign = 'center'; ctx.fillText(s.index % 72 === 0 ? 'NEON' : '2097', 0, 0); ctx.restore();
    }
  }
  function drawArch(s, t) {
    const p = s.p1, height = p.w * .68, thickness = Math.max(1, p.w * .038);
    for (const side of [-1, 1]) {
      const x = p.x + side * p.w * 1.1;
      line(x, p.y, x, p.y - height, '#271841', thickness * 2.5);
      line(x, p.y, x, p.y - height, side < 0 ? t.edge : t.second, thickness * .4);
    }
    polygon([[p.x - p.w * 1.13, p.y - height], [p.x - p.w * .78, p.y - height * 1.23], [p.x + p.w * .78, p.y - height * 1.23], [p.x + p.w * 1.13, p.y - height]], '#241238', t.edge, thickness * .4);
    line(p.x - p.w * .7, p.y - height * 1.16, p.x + p.w * .7, p.y - height * 1.16, t.second, thickness * .25);
    if (p.w > 80) {
      ctx.textAlign = 'center'; ctx.font = `bold ${Math.min(14, Math.max(7, p.w * .025))}px monospace`; ctx.fillStyle = '#f5f2ff';
      ctx.fillText(s.index === 30 ? 'MORBID  /  RACERS' : `${t.class}  /  HYPER VELOCITY`, p.x, p.y - height * 1.035);
    }
  }
  function drawShip(x, y, width, color, dark, steer, player, rivalBoost = false, airborne = false, spin = 0) {
    if (width < 1) return;
    let paint = null;
    if (player) { paint = playerPaint(machines[shipIndex]); color = paint.color; dark = paint.dark; }
    ctx.save(); ctx.translate(x, y); ctx.scale(width / 100, width / 100); ctx.rotate(steer * (player ? .1 : .06) + spin);
    const bob = Math.sin(time * 8) * (player ? 2 : 1); ctx.translate(0, bob);
    const boosted = player ? boosting || jumpBoostTimer > 0 : rivalBoost;
    const shadow = ctx.createRadialGradient(0, 24, 1, 0, 24, 110); shadow.addColorStop(0, color + '60'); shadow.addColorStop(1, color + '00');
    if (!airborne) { ctx.save(); ctx.scale(1, .25); ctx.fillStyle = shadow; ctx.fillRect(-120, -80, 240, 240); ctx.restore(); }
    for (const side of [-1, 1]) {
      const flame = (boosted ? 150 : 52) + Math.sin(time * 40 + side) * 13 + beat * 24;
      const fire = ctx.createLinearGradient(0, 5, 0, flame); fire.addColorStop(0, '#ffffff'); fire.addColorStop(.18, color); fire.addColorStop(.55, boosted ? '#d9ff45cf' : '#5685ff80'); fire.addColorStop(1, '#4efaff00');
      polygon([[side * 51 - 11, 5], [side * 51 + 11, 5], [side * 51 + 7, flame * .55], [side * 51, flame], [side * 51 - 7, flame * .55]], fire);
    }
    ctx.shadowColor = boosted ? '#f4ff54' : color; ctx.shadowBlur = player ? 12 + beat * 9 : boosted ? 18 : 5;
    polygon([[-22, -61], [-38, -28], [-84, -1], [-96, 22], [-47, 17], [-27, 31], [27, 31], [47, 17], [96, 22], [84, -1], [38, -28], [22, -61], [0, -81]], dark, color, 2);
    ctx.shadowBlur = 0;
    polygon([[-84, -1], [-43, -15], [-35, 6], [-96, 22]], color);
    polygon([[84, -1], [43, -15], [35, 6], [96, 22]], color);
    const hull = ctx.createLinearGradient(-28, 0, 30, 0); hull.addColorStop(0, color); hull.addColorStop(.48, '#e3f5ff'); hull.addColorStop(.55, '#b3cbdf'); hull.addColorStop(1, dark);
    polygon([[0, -81], [-24, -45], [-30, 14], [0, 27], [30, 14], [24, -45]], hull);
    if (paint && paint.pattern === 'flames') for (const s of [-1, 1]) { polygon([[s * 40, -12], [s * 92, 18], [s * 70, 4], [s * 80, 16], [s * 58, 2], [s * 62, 12], [s * 44, 4]], paint.accent); polygon([[s * 42, -6], [s * 78, 14], [s * 60, 6], [s * 52, 8]], '#ffffff'); }
    if (paint && paint.pattern === 'stripes') { polygon([[-7, -80], [7, -80], [9, 26], [-9, 26]], paint.accent); polygon([[-3, -80], [3, -80], [4, 26], [-4, 26]], color); }
    if (paint && paint.pattern === 'spots') { ctx.fillStyle = paint.accent; for (const [sx, sy, r] of [[-60, 6, 5], [62, 4, 6], [-14, -30, 4], [16, -10, 5], [-74, 14, 3], [80, 14, 3]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); } }
    if (paint && paint.pattern === 'rainbow') for (let i = 0; i < 5; i++) line(-90 + i * 4, 20 - i * 3, 90 - i * 4, 20 - i * 3, `hsl(${(time * 90 + i * 60) % 360},100%,65%)`, 2);
    polygon([[0, -54], [-15, -28], [-13, -4], [13, -4], [15, -28]], '#10132f', '#86d9ef', 1.5);
    polygon([[0, -49], [-10, -28], [10, -28]], '#7568b6');
    polygon([[-49, -25], [-63, -14], [-66, 13], [-43, 13]], '#16152c', '#ddf9ff', 1);
    polygon([[49, -25], [63, -14], [66, 13], [43, 13]], '#16152c', '#ddf9ff', 1);
    for (const side of [-1, 1]) { line(side * 43, 14, side * 61, 14, '#fff', 3); line(side * 44, 19, side * 60, 19, color, 4); }
    line(0, 1, 0, 18, '#fff', 2);
    if (player) { ctx.fillStyle = '#142439'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('07', 0, 11); }
    ctx.restore();
  }
  function drawLaserBeams() {
    if (!laserShots.length && !enemyShots.length) return;
    // Beams always leave the racer's nose, wherever it is (including mid-jump).
    const shipWidth = Math.min(W * .074, 110), startX = W * .5 + steerVisual * 12, startY = H * .79 - jumpHeight - shipWidth * .76;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const shot of laserShots) {
      if (shot.screen) continue; // drawn on top of the mothership in drawBossBeams()
      const alpha = clamp(1 - (time - shot.started) / shot.duration, 0, 1);
      ctx.globalAlpha = alpha;
      if (shot.mega) {
        const hue = (time * 720) % 360;
        line(startX, startY, shot.x, shot.y, `hsl(${hue},100%,60%)`, 26); line(startX, startY, shot.x, shot.y, `hsl(${(hue + 120) % 360},100%,65%)`, 12);
      } else line(startX, startY, shot.x, shot.y, shot.color, 8);
      line(startX, startY, shot.x, shot.y, '#ffffff', shot.mega ? 5 : 2.2);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = shot.color; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(startX, startY, 5 + alpha * 4, 0, TAU); ctx.fill();
    }
    for (const shot of enemyShots) {
      const alpha = clamp(1 - (time - shot.started) / (shot.expires - shot.started), 0, 1);
      const targetX = W * .5 + steerVisual * 12, targetY = H * .79 - jumpHeight;
      ctx.globalAlpha = alpha * .9;
      line(shot.x, shot.y, targetX, targetY, shot.color, 7);
      line(shot.x, shot.y, targetX, targetY, '#fff1c2', 1.5);
    }
    ctx.restore();
  }
  function drawMap() {
    map.clearRect(0, 0, 190, 125);
    const point = f => {
      const a = f * TAU, t = tracks[trackIndex];
      return [95 + Math.cos(a) * (64 + Math.sin(a * (trackIndex + 2)) * (2 + t.curve * .9)),
        61 + Math.sin(a) * (37 + Math.cos(a * (trackIndex + 1)) * (2 + t.hill * .55))];
    };
    map.beginPath(); for (let i = 0; i <= 180; i++) { const [x, y] = point(i / 180); i ? map.lineTo(x, y) : map.moveTo(x, y); }
    map.strokeStyle = '#ffffff18'; map.lineWidth = 9; map.stroke(); map.strokeStyle = tracks[trackIndex].second; map.lineWidth = 1.5; map.stroke();
    for (const r of rivals) { if (!r.alive) continue; const [x, y] = point(mod(r.distance, LENGTH) / LENGTH); map.fillStyle = r.color; map.beginPath(); map.arc(x, y, r.nemesis ? 4 : 2.5, 0, TAU); map.fill(); }
    const [x, y] = point(position / LENGTH); map.shadowColor = '#ddff46'; map.shadowBlur = 9; map.fillStyle = '#ddff46'; map.beginPath(); map.arc(x, y, 4, 0, TAU); map.fill(); map.shadowBlur = 0;
  }
  function drawStick() {
    const dx = clamp(gesture.x - gesture.originX, -STICK, STICK), dy = clamp(gesture.y - gesture.originY, -STICK, STICK);
    ctx.save(); ctx.globalAlpha = .55; ctx.lineWidth = 2;
    ctx.strokeStyle = gesture.boost ? '#ddff46' : gesture.brake ? '#ff4eb8' : '#4df8ff';
    ctx.beginPath(); ctx.arc(gesture.originX, gesture.originY, STICK, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .8; ctx.fillStyle = ctx.strokeStyle; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(gesture.originX + dx, gesture.originY + dy, 18, 0, TAU); ctx.fill(); ctx.restore();
  }
  function render() {
    if (finale && (mode === 'final' || mode === 'disco')) { renderFinale(); return; }
    ctx.save();
    if (photo && photo.zoom !== 1) { ctx.translate(W / 2, H * .55); ctx.scale(photo.zoom, photo.zoom); ctx.translate(-W / 2, -H * .55); }
    if (shakeAmount() > .03 && (mode === 'racing' || mode === 'wrecked' || mode === 'invasion' || mode === 'respawning')) ctx.translate(Math.sin(time * 121) * shakeAmount() * 8, Math.cos(time * 93) * shakeAmount() * 5);
    background(); drawRoad(); drawLaserBeams();
    const isMenu = mode === 'menu';
    const m = machines[shipIndex];
    const shipX = isMenu ? W * .56 : W * .5 + steerVisual * 12 - (photo ? photo.x * W * .42 : 0);
    const groundShipY = isMenu ? H * .73 : H * .79 + (photo ? photo.h * H * .12 : 0), shipY = groundShipY - jumpHeight;
    const shipSize = Math.min(W * (isMenu ? .085 : .074), isMenu ? 130 : 110);
    if (mutator('night') && !isMenu) drawNight(shipX, shipY);
    if (mode === 'wrecked' && wreckBurst) drawExplosion(shipX, shipY, shipSize * .9, wreckBurst);
    else if (mode === 'respawning' || (photo && photo.hideShip) || (time < raceInvulnUntil && Math.sin(time * 40) < 0)) { /* exploded / blinking / hidden for a photo */ }
    else {
      if (jumpHeight > 30 && mode === 'racing') {
        ctx.save(); ctx.globalAlpha = clamp(1 - jumpHeight / 420, .18, .7); ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(shipX, groundShipY + shipSize * .12, shipSize * (.52 + jumpHeight / 650), shipSize * .12, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      drawShip(shipX, shipY, shipSize, m.color, m.dark, isMenu ? -.12 : -steerVisual, true, false, jumpHeight > 75);
      if (!isMenu) drawPowerupAura(shipX, shipY, shipSize);
    }
    if (boosting && mode === 'racing') {
      for (let i = 0; i < 45; i++) {
        const angle = random(i * 5) * TAU, progress = mod(time * (1.6 + random(i)) + random(i + 9), 1);
        const r = .22 + progress * .7, x = W * .5 + Math.cos(angle) * W * r, y = H * .45 + Math.sin(angle) * H * r;
        const length = 15 + progress * 100;
        ctx.globalAlpha = progress * .65; line(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, i % 2 ? '#ddff46' : '#5cfbff', 1 + progress * 2);
      }
      ctx.globalAlpha = 1;
      const glow = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); glow.addColorStop(0, '#6d29ff00'); glow.addColorStop(1, '#7644ff40'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 3); line(p.x, p.y, p.x - p.vx * .03, p.y - p.vy * .03, p.color, 2); } ctx.globalAlpha = 1;
    drawWeather(); drawSlipstream();
    if (hyperTime > 0 && mode !== 'menu') drawWarpOverlay();
    if (mode !== 'menu') drawCrashLayer();
    if (flashAmount(screenFlash) > .015) {
      const flash = ctx.createRadialGradient(W * .5, H * .62, 2, W * .5, H * .62, Math.max(W, H) * .72);
      flash.addColorStop(0, `rgba(255,246,205,${flashAmount(screenFlash) * .45})`);
      flash.addColorStop(.24, `rgba(255,55,153,${flashAmount(screenFlash) * .2})`); flash.addColorStop(1, '#ff3b9a00');
      ctx.fillStyle = flash; ctx.fillRect(0, 0, W, H);
    }
    if (gesture.id !== null && (mode === 'racing' || mode === 'countdown')) drawStick();
    if (mode === 'invasion' && finale) drawAlarm();
    // A light scanline texture ties the entire scene together.
    ctx.fillStyle = '#05051b12'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  // Night mutator: darkness everywhere except the cone of the ship's headlights.
  function drawNight(x, y) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y - H * .2, H * .04, x, y - H * .16, Math.max(W, H) * .62);
    g.addColorStop(0, 'rgba(3,2,14,0)'); g.addColorStop(.22, 'rgba(3,2,14,.5)'); g.addColorStop(.5, 'rgba(3,2,14,.93)'); g.addColorStop(1, 'rgba(3,2,14,.98)');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .1; ctx.fillStyle = '#fff4c8';
    ctx.beginPath(); ctx.moveTo(x - W * .03, y - H * .02); ctx.lineTo(x - W * .32, H * .44); ctx.lineTo(x + W * .32, H * .44); ctx.lineTo(x + W * .03, y - H * .02); ctx.fill();
    ctx.restore();
  }
  function frame(now) {
    frameClock = now / 1000; pollGamepad();
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60; previousTime = now;
    measureFps(dt); update(dt); render(); updateConfetti(dt); requestAnimationFrame(frame);
  }
