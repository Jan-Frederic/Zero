  function resize() {
    W = innerWidth; H = innerHeight; dpr = lowFx() ? 1 : Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function buildTrack() {
    const t = tracks[trackIndex];
    segments = Array.from({ length: COUNT }, (_, i) => {
      const angle = i / COUNT * TAU;
      const intro = Math.min(1, i / 90);
      const curve = t.bends.reduce((sum, [frequency, amplitude], bend) => sum + Math.sin(angle * frequency + bend * .7) * amplitude, 0);
      const padPosition = i % t.padEvery;
      return { index: i, curve: curve * t.curve * intro,
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
