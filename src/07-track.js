  // ==== Circuits, machines, track building and resizing.
  const tracks = [
    { name: 'NEON HORIZON', type: 'THE ELECTRIC METROPOLIS', feed: 'NIGHT CITY // 2097', sector: 'SECTOR 07 / NIGHTFALL', class: 'HYPER', difficulty: 3, sky: ['#090c32', '#442085', '#ed398f'], fog: '#743190', road: '#151033', edge: '#ff45ca', second: '#40f6ff', sun: '#ffb334', curve: 1, hill: 1, width: 1, grip: 1, bends: [[3, .75], [7, .32]], padEvery: 240, padStart: 155, padLength: 16, recharge: 90, hazards: 0, rivalPace: 1 },
    { name: 'SOLAR RIOT', type: 'BURN THROUGH THE AFTERGLOW', feed: 'SOLAR FIELDS // 2097', sector: 'SECTOR 12 / SOLAR STORM', class: 'INFERNO', difficulty: 4, sky: ['#23092d', '#9c1b61', '#ff8542'], fog: '#ba3b6a', road: '#291039', edge: '#ffb52e', second: '#eaff4d', sun: '#ffef82', curve: 1.3, hill: 1.3, width: .97, grip: .98, bends: [[2, .55], [5, .34], [9, .16]], padEvery: 260, padStart: 167, padLength: 14, recharge: 82, hazards: 2, hazardTypes: ['mine'], rivalPace: 1.02 },
    { name: 'ION DREAM', type: 'DIVE INTO THE ULTRAVIOLET', feed: 'ION EXPANSE // 2097', sector: 'SECTOR 03 / ION SQUALL', class: 'PHANTOM', difficulty: 5, sky: ['#070c30', '#153c80', '#30acae'], fog: '#295c88', road: '#101c38', edge: '#ac64ff', second: '#65ffca', sun: '#a29aff', curve: 1.65, hill: 1.6, width: .94, grip: .95, bends: [[3, .56], [6, .3], [11, .15]], padEvery: 280, padStart: 174, padLength: 13, recharge: 75, hazards: 4, hazardTypes: ['mine', 'drone'], rivalPace: 1.04 },
    { name: 'GLITCH SPIRE', type: 'THREAD THE FRACTURED SKYLINE', feed: 'SPIRE DISTRICT // 2097', sector: 'SECTOR 19 / GLITCH SPIRE', class: 'GLITCH', difficulty: 6, sky: ['#16042b', '#5220a6', '#f44ab7'], fog: '#61309b', road: '#1b1234', edge: '#f43cff', second: '#e6ff54', sun: '#ff65bc', curve: 1.9, hill: 1.75, width: .9, grip: .91, bends: [[2, .5], [6, .3], [11, .18]], padEvery: 300, padStart: 184, padLength: 12, recharge: 68, hazards: 6, hazardTypes: ['mine', 'drone'], rivalPace: 1.06 },
    { name: 'CRYO CANYON', type: 'LOW GRIP / ZERO MARGIN', feed: 'CRYO DEEP // 2097', sector: 'SECTOR 22 / FROSTBITE', class: 'CRYO', difficulty: 6, sky: ['#04172b', '#126c93', '#6de4e8'], fog: '#297e99', road: '#102a40', edge: '#7cf8ff', second: '#99ffdb', sun: '#e6ffff', curve: 2.05, hill: 2.15, width: .86, grip: .67, bends: [[2, .48], [7, .31], [13, .14]], padEvery: 330, padStart: 202, padLength: 11, recharge: 61, hazards: 8, hazardTypes: ['mine', 'drone'], rivalPace: 1.08, hazardPenalty: .28 },
    { name: 'VOID CIRCUIT', type: 'RIDE THE GRAVITY SHEAR', feed: 'DARK MATTER // 2097', sector: 'SECTOR 31 / EVENT HORIZON', class: 'VOID', difficulty: 7, sky: ['#07031b', '#23105b', '#5430a6'], fog: '#382365', road: '#12102b', edge: '#ab5bff', second: '#ff4fd8', sun: '#ffb752', curve: 2.3, hill: 2.35, width: .82, grip: .86, bends: [[2, .48], [5, .29], [10, .17], [15, .08]], padEvery: 360, padStart: 228, padLength: 10, recharge: 55, hazards: 10, hazardTypes: ['drone', 'mine'], rivalPace: 1.1, hazardPenalty: .31 },
    { name: 'PLASMA MAELSTROM', type: 'LASER GATES / NO BRAKES', feed: 'PLASMA BELT // 2097', sector: 'SECTOR 44 / REDLINE', class: 'CHAOS', difficulty: 7, sky: ['#250521', '#76184e', '#ff4c36'], fog: '#b33562', road: '#291026', edge: '#ff364f', second: '#ffdd35', sun: '#ffdf67', curve: 2.5, hill: 2.2, width: .78, grip: .79, bends: [[3, .43], [7, .3], [12, .2], [17, .09]], padEvery: 400, padStart: 257, padLength: 9, recharge: 49, hazards: 12, hazardTypes: ['gate', 'drone'], rivalPace: 1.13, hazardPenalty: .34 },
    { name: 'SINGULARITY RUN', type: 'THE FINAL IMPOSSIBLE LINE', feed: 'SINGULARITY // 2097', sector: 'SECTOR 99 / POINT OF NO RETURN', class: 'OMEGA', difficulty: 8, sky: ['#030611', '#121a42', '#43227d'], fog: '#311d69', road: '#0e1028', edge: '#f03bff', second: '#54fbff', sun: '#e1ff57', curve: 2.75, hill: 2.8, width: .74, grip: .73, bends: [[2, .47], [5, .3], [9, .19], [14, .1]], padEvery: 480, padStart: 316, padLength: 8, recharge: 43, hazards: 15, hazardTypes: ['gate', 'mine', 'drone'], rivalPace: 1.16, hazardPenalty: .38 }
  ];
  const machines = [
    { color: '#44f7ff', dark: '#09627d', name: 'PHANTOM', info: 'BALANCED / PRECISION HANDLING', handling: 1, top: 1, drain: 22 },
    { color: '#ff4aa8', dark: '#851657', name: 'VIPER', info: 'AGGRESSIVE / HIGH TOP SPEED', handling: .88, top: 1.06, drain: 25 },
    { color: '#ddff46', dark: '#56751b', name: 'PULSE', info: 'AGILE / EXTENDED OVERDRIVE', handling: 1.2, top: .96, drain: 17 }
  ];
  function resize() {
    W = innerWidth; H = innerHeight; dpr = lowFx() ? 1 : Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function buildTrack() {
    const t = tracks[trackIndex];
    segments = Array.from({ length: COUNT }, (_, i) => {
      const flip = mutator('reverse'), angle = (flip ? mod(COUNT - i, COUNT) : i) / COUNT * TAU, sign = (flip ? -1 : 1) * (mutator('mirror') ? -1 : 1);
      const intro = Math.min(1, i / 90);
      const curve = t.bends.reduce((sum, [frequency, amplitude], bend) => sum + Math.sin(angle * frequency + bend * .7) * amplitude, 0);
      const padPosition = i % t.padEvery;
      return { index: i, curve: curve * t.curve * intro * sign,
        y: (Math.sin(angle * 2) * 1900 + Math.sin(angle * 5) * 700 + Math.sin(angle * 9) * 260) * t.hill,
        pad: padPosition >= t.padStart && padPosition < t.padStart + t.padLength, padLane: Math.floor(i / t.padEvery) % 2 === 0 ? -.48 : .48,
        arch: i % Math.max(90, 150 - trackIndex * 6) === 30, tower: i % 9 === 0, p1: {}, p2: {} };
    });
    const placed = [];
    for (let i = 0; i < (t.hazards || 0); i++) {
      let index = Math.floor((i + 1) * COUNT / (t.hazards + 1));
      while (segments[index].pad || placed.some(other => Math.abs(other - index) < 20)) index = (index + 29) % COUNT;
      placed.push(index);
      const lane = [-.59, 0, .59][Math.floor(random(index + trackIndex * 101 + i) * 3)];
      segments[index].hazard = { type: t.hazardTypes[i % t.hazardTypes.length], lane, phase: random(index + 7) * TAU,
        radius: .14 + trackIndex * .008, index };
    }
    const catCount = 2 + Math.floor(trackIndex / 2);
    for (let i = 0; i < catCount; i++) {
      let index = Math.floor((i + 1) * COUNT / (catCount + 1));
      while (segments[index].pad || segments[index].hazard || placed.some(other => Math.abs(other - index) < 18)) index = (index + 29) % COUNT;
      placed.push(index);
      segments[index].hazard = { type: 'cat', lane: 0, phase: random(index + 500) * TAU, radius: .115, index,
        color: ['#ff9bf2', '#80faff', '#e4ff61'][i % 3] };
    }
    const trampolineCount = 3 + Math.floor(trackIndex / 3), trampolineLanes = [-.46, .46, 0, .46, -.46];
    for (let i = 0; i < trampolineCount; i++) {
      let index = Math.floor((i + 1) * COUNT / (trampolineCount + 1)) + 27;
      index = mod(index, COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || placed.some(other => Math.abs(other - index) < 22)) index = mod(index + 31, COUNT);
      placed.push(index);
      segments[index].trampoline = { index, lane: trampolineLanes[i % trampolineLanes.length] };
    }
    // Star gates: rare lane-specific portals that trigger the 15-second hyperdrive.
    const gateLanes = [.4, -.4, 0];
    for (let i = 0; i < 2; i++) {
      let index = mod(Math.floor((i + .62) * COUNT / 2), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || placed.some(other => Math.abs(other - index) < 24)) index = mod(index + 37, COUNT);
      placed.push(index);
      segments[index].stargate = { index, lane: gateLanes[(i + trackIndex) % gateLanes.length] };
    }
    const powerLanes = [-.42, .42, 0, .3, -.3, 0];
    for (let i = 0; i < 6; i++) {
      let index = mod(Math.floor((i + .38) * COUNT / 6), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || segments[index].stargate || placed.some(other => Math.abs(other - index) < 16)) index = mod(index + 23, COUNT);
      placed.push(index);
      segments[index].powerup = { index, lane: powerLanes[i], type: POWERUP_ORDER[(i + trackIndex) % POWERUP_ORDER.length] };
    }
    // Attack boxes: one of each per lap, in the second half of the field.
    for (let i = 0; i < ATTACK_ORDER.length; i++) {
      let index = mod(Math.floor((i + .7) * COUNT / 3), COUNT);
      while (segments[index].pad || segments[index].hazard || segments[index].trampoline || segments[index].stargate || segments[index].powerup || placed.some(other => Math.abs(other - index) < 14)) index = mod(index + 19, COUNT);
      placed.push(index);
      segments[index].powerup = { index, lane: [.35, -.35, 0][(i + trackIndex) % 3], type: ATTACK_ORDER[(i + trackIndex) % ATTACK_ORDER.length] };
    }
    // Shortcuts: a narrow tunnel portal at the road edge, announced by chevrons. Hit it dead centre to warp ahead.
    for (let i = 0; i < 2; i++) {
      let index = Math.floor(COUNT * (i ? .74 : .31)) + trackIndex * 7;
      while ([...Array(SHORTCUT_LEAD + 1).keys()].some(k => { const s = segments[mod(index - k, COUNT)]; return s.pad || s.hazard || s.trampoline || s.stargate || s.powerup; }) || placed.some(other => Math.abs(other - index) < 30)) index = mod(index + 13, COUNT);
      placed.push(index);
      const lane = (i + trackIndex) % 2 ? .78 : -.78;
      segments[index].shortcut = { index, lane };
      for (let k = 1; k <= SHORTCUT_LEAD; k++) segments[mod(index - k, COUNT)].shortcutLead = lane;
    }
    try { bestLap = Number(localStorage.getItem(`chroma-best-${trackIndex}`)) || 0; } catch { bestLap = 0; }
  }
  function selectTrack(delta) {
    trackIndex = mod(trackIndex + delta, tracks.length); buildTrack();
    const t = tracks[trackIndex];
    $('track-name').textContent = t.name; $('track-type').textContent = t.type;
    $('track-class').textContent = t.class; $('feed-label').textContent = t.feed;
    document.querySelector('.map-caption').textContent = t.sector;
    document.querySelector('.pill').textContent = `${String(trackIndex + 1).padStart(2, '0')} — ${String(tracks.length).padStart(2, '0')}`;
    renderGameMode();
    $('difficulty').innerHTML = '▰'.repeat(t.difficulty) + '<em>' + '▰'.repeat(8 - t.difficulty) + '</em>';
    const points = Array.from({ length: 96 }, (_, i) => {
      const angle = i / 96 * TAU, wobble = Math.sin(angle * (trackIndex + 2)) * (3 + t.curve * 1.4);
      return [165 + Math.cos(angle) * (96 + wobble), 70 + Math.sin(angle) * (42 + Math.cos(angle * (trackIndex + 1)) * (4 + t.hill * 1.5))];
    });
    const path = `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
    document.querySelector('.map-line').setAttribute('d', path);
    document.querySelector('.map-glow').setAttribute('d', path);
    document.querySelector('.map-line').style.stroke = t.second;
    document.querySelector('.map-glow').style.stroke = t.second;
  }
