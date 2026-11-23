  // ==== Music UI, "Chill with DJ MoFi" and the elevator intro: the sound desk, the pause-menu player, DJ MoFi's club
  // (every Morbid Fingers song on the jukebox) and the elevator ride that plays before the very first race.
  // ---- Sound desk (settings → MUSIC & FX): one slider per channel, a short test sound after each change.
  const VOLUME_TESTS = {
    fx: () => soundEffect(880, .25), boom: () => playExplosionSound(.7), engine: () => playJetBlast(.6),
    voice: () => robotSay('Hyperdrive initiated', 'hyperdrive-initiated'), music: () => {},
  };
  function renderMixer() {
    document.querySelectorAll('[data-volume]').forEach(el => { const input = /** @type {HTMLInputElement} */ (el); input.value = String(Math.round(vol(input.dataset.volume) * 100)); });
    document.querySelectorAll('[data-volume-value]').forEach(out => { out.textContent = `${Math.round(vol(out.dataset.volumeValue) * 100)}%`; });
    if ($('dj-volume')) $('dj-volume').value = String(Math.round(vol('music') * 100));
  }
  function setVolume(key, percent) {
    settings.vol = Object.assign({}, settings.vol, { [key]: clamp(percent / 100, 0, 1.5) });
    saveSettings(); applyVolumes(); renderMixer();
  }
  document.querySelectorAll('[data-volume]').forEach(el => {
    const input = /** @type {HTMLInputElement} */ (el);
    input.addEventListener('input', () => { setupAudio(); setVolume(input.dataset.volume, Number(input.value)); });
    input.addEventListener('change', () => { const test = VOLUME_TESTS[input.dataset.volume]; if (test) test(); });
  });
  if ($('open-mixer')) $('open-mixer').addEventListener('click', () => { closeDialogs(); renderMixer(); openDialog('mixer-screen'); });
  if ($('open-dj')) $('open-dj').addEventListener('click', () => { closeDialogs(); startDJ(); });
  // ---- Pause-menu player.
  if ($('pp-prev')) {
    $('pp-prev').addEventListener('click', () => { setupAudio(); musicWanted = true; prevSong(); });
    $('pp-play').addEventListener('click', toggleMusic);
    $('pp-next').addEventListener('click', () => { setupAudio(); musicWanted = true; nextSong(true); });
  }

  // ---- Chill with DJ MoFi: straight into the club.
  let dj = null, posterImage = null, djSeeking = false;
  function loadPoster() { if (!posterImage && typeof Image === 'function') { posterImage = new Image(); posterImage.src = 'images/poster-8-bit-fingers.jpg'; } }
  // Unlocks the music element inside the player's tap (Safari), then keeps it quiet until the scene wants music.
  function unlockQuietly() {
    setupAudio(); primeSpeech();
    const unlock = audio.play(); if (unlock && unlock.catch) unlock.catch(() => {});
    audio.pause(); cancelTuning(); musicWanted = false; musicBlocked = false;
  }
  function startDJ() {
    if (mode !== 'menu') return;
    unlockQuietly(); loadPoster();
    mode = 'dj'; dj = { at: time, discs: [], record: null, shown: false };
    $('menu').classList.add('hidden'); document.body.classList.add('dj');
    enterClub();
  }
  function leaveDJ() {
    if (!dj) return;
    dj = null; mode = 'menu';
    $('dj-club').classList.add('hidden'); $('menu').classList.remove('hidden');
    document.body.classList.remove('dj');
  }
  function enterClub() {
    dj.shown = true; $('dj-club').classList.remove('hidden');
    robotSay('Yo yo yo! DJ MoFi in the house! Party!', 'dj-mofi');
    renderMixer(); djPlay(songIndex);
  }

  // ---- Cutscenes before the first races. Running gag: each one ends with our racer blowing up, the picture bursts
  // into shards, and the race starts behind them.
  // 1. Elevator: the racer waddles in to elevator music, a pink racer gets on and flirts, our racer turns red and is
  //    so embarrassed that it comes under tension and explodes.
  // 2. Car wash: rinse (too cold), brushes (too ticklish), foam, then a terminator cat pulls the TURBO WAX lever.
  const ELEV = { open1: 1.4, walkIn: 2, close1: 4.4, ride1: 5, open2: 8.4, pinkIn: 9, flirt: 10.6, pinkOut: 13.8, close2: 15.4, ride2: 16, tension: 16.2, boom: 18.4 };
  const WASH = { rollIn: 1.2, rinse: 3.4, cold: 3.7, brushes: 5.8, tickle: 6.4, foam: 9.2, lever: 11.4, turbo: 11.6, tension: 12.6, boom: 15 };
  const CUTSCENES = [
    { id: 'elevator', t: ELEV, draw: t => drawElevator(t), music: () => startMuzak(), lines: [[ELEV.flirt + .1, 'Oh hey, you here too?', 'pink-hi'], [ELEV.pinkOut + .1, 'Toodle-oo!', 'pink-bye']],
      dings: [ELEV.open1 - .2, ELEV.open2 - .2] },
    { id: 'wash', t: WASH, draw: t => drawCarWash(t), music: () => startMuzak(WASH_BARS, 152), lines: [[WASH.cold, 'Brrr! Cold!', 'wash-cold'], [WASH.tickle, 'Hihi! That tickles!', 'wash-tickle'], [WASH.turbo, 'Turbo wax activated.', 'wash-turbo']],
      dings: [WASH.rollIn - .2, WASH.lever - .2] },
  ];
  const SCENES_KEY = 'morbid-scenes-v1', INTRO_KEY = 'morbid-intro-v1';
  let intro = null, sceneShatter = null;
  // How many cutscenes this pilot has seen (the first version only remembered the elevator).
  function scenesSeen() {
    try { const n = Number(localStorage.getItem(SCENES_KEY)); return n || (localStorage.getItem(INTRO_KEY) === '1' ? 1 : 0); } catch { return CUTSCENES.length; }
  }
  const nextCutscene = () => scenesSeen() < CUTSCENES.length ? scenesSeen() : -1;
  // One cutscene per race start: the race right after a cutscene starts without the next one.
  let cutsceneJustPlayed = false;
  function cutsceneDue() { if (cutsceneJustPlayed) { cutsceneJustPlayed = false; return false; } return nextCutscene() >= 0; }
  function startIntro(scene = Math.max(0, nextCutscene())) {
    unlockQuietly();
    const def = CUTSCENES[scene];
    mode = 'intro'; intro = { scene, def, at: time, said: {}, muzak: def.music(), burst: null, hero: null, nextCrackle: 0 };
    $('menu').classList.add('hidden'); document.body.classList.add('dj'); $('dj-skip').classList.remove('hidden');
  }
  function skipIntro() {
    if (!intro || time - intro.at >= intro.def.t.boom - .3) return;
    intro.at = time - (intro.def.t.boom - .3); intro.def.lines.forEach((_, i) => { intro.said[i] = 1; }); stopMuzak(intro);
  }
  // The picture bursts into shards; the race starts right behind them.
  function finishIntro() {
    const snap = finaleSnapshot(), scene = intro.scene;
    stopMuzak(intro); intro = null; megaBlasts = [];
    try { localStorage.setItem(SCENES_KEY, String(Math.max(scenesSeen(), scene + 1))); localStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode: it plays again next time */ }
    document.body.classList.remove('dj'); $('dj-skip').classList.add('hidden'); mode = 'menu';
    sceneShatter = snap ? { snap, shards: makeShards(), at: time } : null; cutsceneJustPlayed = true;
    playNoiseBurst(1.1, .3, 9000, 2400); playToneSweep(95, 24, 1.2, 'sawtooth', .14);
    startRace();
  }
  function makeShards() {
    const cols = 6, rows = 5, pts = [], shards = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      pts.push([W * i / cols + (edge ? 0 : (Math.random() - .5) * W / cols * .7), H * j / rows + (edge ? 0 : (Math.random() - .5) * H / rows * .7)]);
    }
    const P = (i, j) => pts[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      for (const tri of [[P(i, j), P(i + 1, j), P(i + 1, j + 1)], [P(i, j), P(i + 1, j + 1), P(i, j + 1)]]) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const dx = cx - W / 2, dy = cy - H / 2, d = Math.hypot(dx, dy) || 1, speed = 250 + Math.random() * 750;
        shards.push({ tri, cx, cy, vx: dx / d * speed, vy: dy / d * speed - 220, vr: (Math.random() - .5) * 9 });
      }
    }
    return shards;
  }
  // Drawn over the race start (called at the end of the race render).
  function drawSceneShatter() {
    const s = sceneShatter, t = time - s.at;
    if (t > 1.8) { sceneShatter = null; return; }
    ctx.save(); ctx.globalAlpha = clamp(1.8 - t, 0, 1);
    for (const sh of s.shards) {
      ctx.save(); ctx.translate(sh.cx + sh.vx * t, sh.cy + sh.vy * t + 520 * t * t); ctx.rotate(sh.vr * t); ctx.translate(-sh.cx, -sh.cy);
      ctx.beginPath(); ctx.moveTo(sh.tri[0][0], sh.tri[0][1]); ctx.lineTo(sh.tri[1][0], sh.tri[1][1]); ctx.lineTo(sh.tri[2][0], sh.tri[2][1]); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(s.snap, 0, 0, W, H); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function updateIntro(dt) {
    const def = intro.def, T = def.t, t = time - intro.at, at = moment => t >= moment && t - dt < moment;
    def.lines.forEach(([moment, text, clip], i) => { if (t > moment && !intro.said[i]) { intro.said[i] = 1; robotSay(text, clip); } });
    // "Ding-dong".
    for (const moment of def.dings) { if (at(moment)) soundEffect(1319, .7); if (at(moment + .22)) soundEffect(1047, .9); }
    // Under tension: crackling sparks, faster and faster, then the blast – the same one as a wreck in the race.
    if (t > T.tension && t < T.boom && time >= intro.nextCrackle) {
      const k = (t - T.tension) / (T.boom - T.tension); intro.nextCrackle = time + .22 - k * .17;
      playNoiseBurst(.08, .05 + k * .08, 7000, 2000); playToneSweep(2400, 600, .06, 'square', .02 + k * .03); buzz(20);
    }
    if (at(T.tension)) stopMuzak(intro);
    if (t >= T.boom && !intro.burst) {
      const h = intro.hero || { x: W / 2, y: H / 2, size: 100 };
      intro.burst = { started: time, duration: 1.6, color: '#ffec87', size: 5, seed: Math.floor(time * 1000), cartoon: false };
      megaBlasts.push({ x: h.x, y: h.y, started: time, duration: 2, color: '#ffec87', seed: 5, scale: 1 });
      megaBlasts.push({ x: h.x - h.size, y: h.y - h.size * .3, started: time + .2, duration: 1.6, color: machines[shipIndex].color, seed: 9, scale: .65 });
      megaBlasts.push({ x: h.x + h.size, y: h.y - h.size * .1, started: time + .35, duration: 1.6, color: '#ff4eb8', seed: 21, scale: .65 });
      shake = 2.2; screenFlash = 1; playExplosionSound(2.2); buzz([120, 40, 90, 40, 260], 0);
    }
    if (at(T.boom + .3)) playExplosionSound(1.4);
    megaBlasts = megaBlasts.filter(b => time - b.started < b.duration);
    shake *= Math.pow(.08, dt); screenFlash = Math.max(0, screenFlash - dt * 1.2);
    if (t >= T.boom + .65) finishIntro();
  }
  function renderIntro() {
    ctx.save();
    if (shakeAmount() > .03) ctx.translate(Math.sin(time * 121) * shakeAmount() * 8, Math.cos(time * 93) * shakeAmount() * 6);
    intro.def.draw(time - intro.at);
    if (flashAmount(screenFlash) > .015) { ctx.fillStyle = `rgba(255,255,255,${flashAmount(screenFlash) * .85})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
  // Sparks crackling around the racer and a red glow, growing with the tension (0-1).
  function drawTension(x, y, size, tension) {
    if (tension <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2 + Math.floor(tension * 6); i++) {
      const a = Math.random() * TAU, r0 = size * .35, r1 = size * (.6 + tension * .5);
      ctx.strokeStyle = i % 2 ? '#7dfcff' : '#fff36a'; ctx.lineWidth = Math.max(1.5, size * .025); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      for (let k = 1; k <= 4; k++) { const rr = lerp(r0, r1, k / 4), aa = a + (Math.random() - .5) * .5; ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(x, y, 1, x, y, size * (.7 + tension * .6)); glow.addColorStop(0, `rgba(255,80,80,${.25 + tension * .45})`); glow.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, size * (.7 + tension * .6), 0, TAU); ctx.fill(); ctx.restore();
  }
  // DJ MoFi puts the record on (see changeSong): it flies from the crate onto the deck, a scratch, then the song.
  function djPlay(i) { if (!dj) return; playScratch(); playSongNow(i); }
  function renderJukebox() {
    const list = $('dj-list'); if (!list || !list.appendChild) return;
    if (!list.children || list.children.length !== SONGS.length) {
      list.innerHTML = '';
      SONGS.forEach((song, i) => {
        const item = document.createElement('li'), button = document.createElement('button');
        button.type = 'button'; button.textContent = song.title; button.setAttribute('data-no-i18n', '');
        button.addEventListener('click', () => djPlay(i)); item.appendChild(button); list.appendChild(item);
      });
    }
    [...list.children].forEach((item, i) => item.classList.toggle('active', i === songIndex));
    if ($('dj-now')) $('dj-now').textContent = tuning ? '📻 ~ ~ ~' : SONGS[songIndex].title;
  }
  if ($('dj-leave')) {
    $('dj-leave').addEventListener('click', leaveDJ);
    $('dj-skip').addEventListener('click', skipIntro);
    $('dj-play').addEventListener('click', toggleMusic);
    // In the club the DJ changes records directly (no radio in between).
    $('dj-prev').addEventListener('click', () => { musicWanted = true; playScratch(); if (playlistPos > 0 && audio.currentTime < 4) playlistPos--; changeSong(playlist[playlistPos]); });
    $('dj-next').addEventListener('click', () => { musicWanted = true; playScratch(); upcomingSong(); playlistPos++; changeSong(playlist[playlistPos]); });
    $('dj-volume').addEventListener('input', () => { setupAudio(); setVolume('music', Number($('dj-volume').value)); });
    $('dj-seek').addEventListener('pointerdown', () => { djSeeking = true; });
    $('dj-seek').addEventListener('change', () => { djSeeking = false; if (audio.duration) try { audio.currentTime = Number($('dj-seek').value) / 1000 * audio.duration; } catch { /* not seekable */ } });
  }
  window.addEventListener('keydown', event => { if (mode === 'dj' && event.code === 'Escape') leaveDJ(); if (mode === 'intro' && event.code === 'Escape') skipIntro(); });
  function updateDJ(dt) {
    // DJ MoFi hurls a record across the room now and then.
    if (Math.random() < dt * .5) {
      const fromLeft = Math.random() < .5;
      dj.discs.push({ x: .5, y: .45, vx: (fromLeft ? -1 : 1) * (.35 + Math.random() * .6), vy: -(.3 + Math.random() * .5), at: time, spin: (Math.random() - .5) * 30 });
    }
    dj.discs = dj.discs.filter(d => time - d.at < 2.2);
    for (const d of dj.discs) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 1.1 * dt; }
    const seek = $('dj-seek');
    if (seek && dj.shown && audio.duration && !djSeeking) seek.value = String(Math.round((audio.currentTime || 0) / audio.duration * 1000));
  }

  // ---- Elevator music: an original, gentle bossa nova loop (electric piano, vibraphone, bass, shaker), synthesized.
  const MUZAK_BPM = 128;
  const MUZAK_BARS = [
    { chord: [57, 60, 64, 65], bass: [41, 48], melody: [[0, 69, 3], [3, 72, 2], [5, 76, 3]] },
    { chord: [57, 60, 64, 65], bass: [41, 48], melody: [[0, 74, 4], [4, 72, 4]] },
    { chord: [59, 62, 65, 67], bass: [43, 50], melody: [[0, 71, 3], [3, 74, 2], [5, 77, 3]] },
    { chord: [59, 62, 65, 67], bass: [43, 50], melody: [[0, 76, 6]] },
    { chord: [58, 62, 65, 67], bass: [43, 50], melody: [[0, 70, 3], [3, 74, 2], [5, 77, 3]] },
    { chord: [58, 60, 64, 67], bass: [36, 43], melody: [[0, 76, 3], [3, 74, 2], [5, 72, 3]] },
    { chord: [57, 60, 64, 65], bass: [41, 48], melody: [[0, 69, 8]] },
    { chord: [58, 60, 64, 67], bass: [36, 43], melody: [[0, 67, 3], [3, 69, 2], [5, 70, 3]] },
  ];
  // Car-wash jingle: a bouncy, original little shuffle in C.
  const WASH_BARS = [
    { chord: [60, 64, 67, 69], bass: [36, 43], melody: [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 76, 2]] },
    { chord: [60, 64, 67, 69], bass: [36, 43], melody: [[0, 77, 2], [3, 76, 1], [4, 74, 4]] },
    { chord: [57, 60, 65, 69], bass: [41, 48], melody: [[0, 72, 2], [2, 77, 2], [4, 81, 2], [6, 77, 2]] },
    { chord: [59, 62, 65, 67], bass: [43, 50], melody: [[0, 79, 3], [3, 77, 1], [4, 74, 4]] },
  ];
  const COMP = [0, 3, 5], SHAKE = [1, .4, .7, .4, 1, .4, .7, .5];
  const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
  function startMuzak(bars = MUZAK_BARS, bpm = MUZAK_BPM) {
    if (!audioContext || !analyser || muted) return null;
    const EIGHTH = 60 / bpm / 2;
    const out = audioContext.createGain(); out.gain.value = 1.6; out.connect(analyser);
    const m = { out, next: audioContext.currentTime + .2, step: 0, timer: 0 };
    const note = (type, freq, at, dur, level, vibrato = 0) => {
      const o = audioContext.createOscillator(), g = audioContext.createGain(); o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + .015); g.gain.exponentialRampToValueAtTime(level * .35, at + dur * .5); g.gain.exponentialRampToValueAtTime(.0005, at + dur);
      if (vibrato) { const lfo = audioContext.createOscillator(), depth = audioContext.createGain(); lfo.frequency.value = 5.2; depth.gain.value = level * vibrato; lfo.connect(depth); depth.connect(g.gain); lfo.start(at); lfo.stop(at + dur); }
      o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + .05);
    };
    const shaker = (at, level) => {
      const len = Math.floor(audioContext.sampleRate * .05), buf = audioContext.createBuffer(1, len, audioContext.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audioContext.createBufferSource(), f = audioContext.createBiquadFilter(), g = audioContext.createGain();
      src.buffer = buf; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = .05 * level; src.connect(f); f.connect(g); g.connect(out); src.start(at);
    };
    const schedule = () => {
      while (m.next < audioContext.currentTime + .4) {
        const bar = bars[Math.floor(m.step / 8) % bars.length], slot = m.step % 8, at = m.next;
        if (COMP.includes(slot)) for (const n of bar.chord) { note('sine', midiHz(n), at, EIGHTH * 2.4, .028); note('triangle', midiHz(n + 12), at, EIGHTH * 1.2, .008); }
        if (slot === 0 || slot === 4) note('triangle', midiHz(bar.bass[0]), at, EIGHTH * 2.8, .12);
        if (slot === 3 || slot === 7) note('triangle', midiHz(bar.bass[1]), at, EIGHTH * 1.2, .09);
        for (const [s, n, len] of bar.melody) if (s === slot) note('sine', midiHz(n), at, EIGHTH * len * 1.1, .05, .35);
        shaker(at, SHAKE[slot]);
        m.next += EIGHTH; m.step++;
      }
    };
    schedule(); m.timer = setInterval(schedule, 120);
    return m;
  }
  function stopMuzak(holder) {
    const m = holder && holder.muzak; if (!m) return;
    clearInterval(m.timer); holder.muzak = null;
    try { m.out.gain.setTargetAtTime(0, audioContext.currentTime, .05); setTimeout(() => m.out.disconnect(), 600); } catch { /* gone */ }
  }
  function playScratch() {
    if (!audioContext || muted) return;
    withBus(sfxBus, () => { playNoiseBurst(.18, .25, 4000, 600); playToneSweep(300, 1400, .09, 'sawtooth', .05); setTimeout(() => playToneSweep(1300, 250, .12, 'sawtooth', .05), 100); });
  }

  // ---- Drawing.
  function djStage() {
    if (!dj || !dj.shown) return { x: 0, y: 0, w: W, h: H };
    return W >= H ? { x: 0, y: 0, w: W - Math.min(380, W * .4), h: H } : { x: 0, y: 0, w: W, h: H * .52 };
  }
  function renderDJ() {
    ctx.save();
    drawClub(time - dj.at);
    for (const d of dj.discs) drawVinyl(d.x * W, d.y * H, Math.min(W, H) * .045, (time - d.at) * d.spin);
    ctx.restore();
  }
  function drawVinyl(x, y, r, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    ctx.fillStyle = '#0d0d12'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2a36'; ctx.lineWidth = Math.max(1, r * .03); for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (.45 + i * .12), 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#ff2b6a'; ctx.beginPath(); ctx.arc(0, 0, r * .32, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * .05, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = Math.max(1, r * .08); ctx.beginPath(); ctx.arc(0, 0, r * .75, -.6, .1); ctx.stroke();
    ctx.restore();
  }
  // A racer with little legs, waddling from side to side; `blush` turns it red with embarrassment.
  function drawWalker(x, y, size, walking, look, blush = 0) {
    const step = walking ? Math.sin(time * 12) : 0, m = machines[shipIndex];
    ctx.save(); ctx.translate(x, y); ctx.rotate(step * .16);
    drawShip(0, 0, size, m.color, m.dark, look * .3, true, false, true);
    for (const side of [-1, 1]) {
      const lift = walking ? Math.max(0, Math.sin(time * 12 + (side > 0 ? Math.PI : 0))) * size * .1 : 0;
      line(side * size * .16, size * .22, side * size * .2, size * .56 - lift, '#c9d2e3', size * .05);
      line(side * size * .2, size * .56 - lift, side * size * .2 + (look || side) * size * .1, size * .56 - lift, '#e8edf5', size * .07);
    }
    if (blush > 0) {
      ctx.globalAlpha = blush * .55; const g = ctx.createRadialGradient(0, -size * .05, 1, 0, -size * .05, size * .6); g.addColorStop(0, '#ff2040'); g.addColorStop(1, '#ff204000');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -size * .05, size * .6, 0, TAU); ctx.fill(); ctx.globalAlpha = blush;
      for (const side of [-1, 1]) { ctx.fillStyle = '#ff6f8f'; ctx.beginPath(); ctx.ellipse(side * size * .2, -size * .02, size * .09, size * .05, 0, 0, TAU); ctx.fill(); for (let k = 0; k < 3; k++) line(side * size * (.14 + k * .05), -size * .1, side * size * (.11 + k * .05), -size * .0, '#c0103a', Math.max(1, size * .015)); }
      ctx.fillStyle = '#9fe6ff'; ctx.beginPath(); ctx.ellipse(size * .3, -size * .35 + Math.sin(time * 3) * size * .03, size * .04, size * .07, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawPinkRacer(x, y, size, walking, wink) {
    const step = walking ? Math.sin(time * 12 + 1) : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(step * .16);
    drawShip(0, 0, size, '#ff7ad9', '#7a1f5c', 0, false, false, true);
    for (const side of [-1, 1]) {
      const lift = walking ? Math.max(0, Math.sin(time * 12 + (side > 0 ? Math.PI : 0) + 1)) * size * .1 : 0;
      line(side * size * .16, size * .22, side * size * .2, size * .56 - lift, '#ffd0ef', size * .05);
      line(side * size * .2, size * .56 - lift, side * size * .28, size * .56 - lift, '#ff2fa8', size * .08);
    }
    // A bow on top and long lashes.
    polygon([[0, -size * .42], [-size * .16, -size * .52], [-size * .16, -size * .32]], '#ff2fa8'); polygon([[0, -size * .42], [size * .16, -size * .52], [size * .16, -size * .32]], '#ff2fa8');
    ctx.fillStyle = '#ffe0f4'; ctx.beginPath(); ctx.arc(0, -size * .42, size * .04, 0, TAU); ctx.fill();
    if (wink) for (const side of [-1, 1]) line(side * size * .06, -size * .2, side * size * .14, -size * .24, '#2a0a20', Math.max(1, size * .02));
    ctx.restore();
  }
  function drawHeart(x, y, s, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y + s * .35);
    ctx.bezierCurveTo(x - s * .9, y - s * .3, x - s * .35, y - s * .9, x, y - s * .35); ctx.bezierCurveTo(x + s * .35, y - s * .9, x + s * .9, y - s * .3, x, y + s * .35); ctx.fill();
  }
  function drawBubble(x, y, text, color) {
    const fs = Math.max(13, Math.min(24, W * .028));
    ctx.font = `700 ${fs}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = tr(text), w = ((ctx.measureText(label) || {}).width || label.length * fs * .55) + fs * 1.4, h = fs * 2;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h, w, h, h / 2); else ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
    polygon([[x - fs * .3, y - 1], [x + fs * .3, y - 1], [x, y + fs * .6]], '#ffffff');
    ctx.fillStyle = '#2a0a20'; ctx.fillText(text, x, y - h / 2);
  }
  function drawElevator(t) {
    // Shaft: brick wall and floor slabs that scroll past while the cabin rides.
    const ride = clamp((t - ELEV.ride1) / (ELEV.open2 - ELEV.ride1), 0, 1) + clamp((t - ELEV.ride2) / (ELEV.boom - ELEV.ride2), 0, 1);
    const ease = x => x * x * (3 - 2 * x), scroll = (ease(Math.min(1, ride)) + ease(Math.max(0, ride - 1))) * H * 1.2;
    ctx.fillStyle = '#16121f'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#211a2e';
    for (let y = -40 + (scroll % 40); y < H + 40; y += 40) for (let x = ((y / 40) % 2) * 40 - 40; x < W + 80; x += 80) ctx.fillRect(x + 2, y + 2, 76, 36);
    for (let k = -1; k < 3; k++) { const y = mod(H * .9 + scroll, H * 1.2) - H * .2 + k * H * 1.2; ctx.fillStyle = '#3a3050'; ctx.fillRect(0, y, W, 14); }
    // Cabin slides up into view, then waits.
    const ch = Math.min(H * .8, W * .95), cw = ch * .78, cx = W / 2, slide = 1 - ease(clamp(t / ELEV.open1, 0, 1)), top = Math.max(H * .14, (H - ch) / 2) + slide * H * 1.1;
    const doors = Math.max(ease(clamp((t - ELEV.open1) / .6, 0, 1)) * (1 - ease(clamp((t - ELEV.close1) / .6, 0, 1))), ease(clamp((t - ELEV.open2) / .6, 0, 1)) * (1 - ease(clamp((t - ELEV.close2) / .6, 0, 1))));
    const left = cx - cw / 2, floorY = top + ch * .9;
    // Interior: warm wood panels, a checkered floor, a handrail and the button panel.
    const wood = ctx.createLinearGradient(left, top, left + cw, top); wood.addColorStop(0, '#5a3a22'); wood.addColorStop(.5, '#8a5a32'); wood.addColorStop(1, '#5a3a22');
    ctx.fillStyle = wood; ctx.fillRect(left, top, cw, ch);
    for (let i = 1; i < 5; i++) line(left + cw * i / 5, top + ch * .05, left + cw * i / 5, floorY, '#4a2e1a', 2);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#d8d0c0' : '#2a2a2a'; ctx.fillRect(left + cw * i / 8, floorY, cw / 8, ch * .1); }
    line(left + cw * .05, top + ch * .55, left + cw * .95, top + ch * .55, '#d9c48a', Math.max(2, ch * .015));
    ctx.fillStyle = '#9aa3b5'; ctx.fillRect(left + cw * .82, top + ch * .3, cw * .1, ch * .2);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i === Math.min(5, Math.floor(ride * 2.5)) ? '#ffd24a' : '#40465a'; ctx.beginPath(); ctx.arc(left + cw * (.85 + (i % 2) * .04), top + ch * (.33 + Math.floor(i / 2) * .055), ch * .012, 0, TAU); ctx.fill(); }
    // The racers inside.
    const size = Math.min(cw * .24, 120), standY = floorY - size * .58;
    const walkIn = clamp((t - ELEV.walkIn) / (ELEV.close1 - ELEV.walkIn - .2), 0, 1), heroX = lerp(W + size, cx + cw * .14, walkIn);
    const pinkIn = clamp((t - ELEV.pinkIn) / (ELEV.flirt - ELEV.pinkIn), 0, 1), pinkOut = clamp((t - ELEV.pinkOut) / (ELEV.close2 - ELEV.pinkOut), 0, 1);
    const pinkX = t < ELEV.pinkOut ? lerp(-size, cx - cw * .2, pinkIn) : lerp(cx - cw * .2, -size * 1.5, pinkOut), pinkHere = t > ELEV.pinkIn && pinkOut < 1;
    const blush = t > ELEV.flirt + .8 ? Math.min(1, (t - ELEV.flirt - .8) * 1.5) * (t < ELEV.ride2 + .6 ? 1 : Math.max(0, 1 - (t - ELEV.ride2 - .6))) : 0;
    if (pinkHere) drawPinkRacer(pinkX, standY, size, (t < ELEV.flirt) || t > ELEV.pinkOut, t > ELEV.flirt + .5 && t < ELEV.pinkOut && Math.sin(time * 3) > .6);
    const tapping = walkIn >= 1 && !pinkHere && Math.sin(time * 6) > 0;
    // So embarrassed it is under tension: shaking harder and harder, sparks crackling around it, then it blows up.
    const tension = clamp((t - ELEV.tension) / (ELEV.boom - ELEV.tension), 0, 1);
    const jx = tension ? (Math.random() - .5) * size * .18 * tension : 0, jy = tension ? (Math.random() - .5) * size * .1 * tension : 0;
    intro.hero = { x: heroX, y: standY, size };
    if (t < ELEV.boom) {
      drawWalker(heroX + jx, standY - (tapping ? size * .02 : 0) + jy, size, walkIn > 0 && walkIn < 1, walkIn < 1 ? -1 : pinkHere ? -1 : 0, Math.max(blush, tension));
      drawTension(heroX, standY, size, tension);
    } else if (intro.burst) drawExplosion(heroX, standY, size * .9, intro.burst);
    // Flirting: hearts float up, speech bubbles.
    if (t > ELEV.flirt && t < ELEV.pinkOut + .4) for (let i = 0; i < 5; i++) { const k = mod(t * .6 + i / 5, 1); ctx.globalAlpha = 1 - k; drawHeart(pinkX + Math.sin(time * 2 + i) * size * .3, standY - size * (.4 + k * 1.2), size * .14, '#ff4fa8'); ctx.globalAlpha = 1; }
    if (t > ELEV.flirt && t < ELEV.flirt + 2.6) drawBubble(pinkX, standY - size * .6, 'Oh hey, you here too?', '#ff4fa8');
    if (t > ELEV.pinkOut && t < ELEV.pinkOut + 1.6) drawBubble(pinkX + size * .3, standY - size * .6, 'Toodle-oo!', '#ff4fa8');
    // Glass doors in front, the frame and the floor display above.
    for (const side of [-1, 1]) {
      const w = cw / 2 * (1 - doors * .96), x = side < 0 ? left : left + cw - w;
      ctx.fillStyle = 'rgba(150,220,255,.16)'; ctx.fillRect(x, top, w, ch);
      ctx.strokeStyle = '#c9d2e3'; ctx.lineWidth = Math.max(2, cw * .012); ctx.strokeRect(x, top, w, ch);
      line(x + w * .2, top + ch * .1, x + w * .5, top + ch * .4, 'rgba(255,255,255,.25)', Math.max(2, cw * .02));
    }
    ctx.strokeStyle = '#8e97a9'; ctx.lineWidth = Math.max(4, cw * .03); ctx.strokeRect(left - cw * .02, top - ch * .02, cw * 1.04, ch * 1.04);
    const floorNo = 1 + Math.floor(ride * 3);
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(cx - cw * .14, top - ch * .11, cw * .28, ch * .08);
    ctx.fillStyle = '#ff9b2e'; ctx.font = `700 ${Math.round(ch * .055)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${(t > ELEV.ride1 && t < ELEV.open2) || (t > ELEV.ride2) ? '▲' : '•'} ${floorNo}`, cx, top - ch * .07);
    // The blast, as big as a wreck in the race.
    if (t >= ELEV.boom) drawCrashLayer();
  }
  // The car wash "MORBID WASH 3000": conveyor, rinse jets, spinning brushes, foam, and the TURBO WAX lever.
  function drawCarWash(t) {
    const T = WASH, big = Math.min(W, H), size = Math.min(big * .22, 160), floorY = H * .8, m = machines[shipIndex];
    // Tiled wall, the tunnel frame with its neon sign and chasing bulbs.
    ctx.fillStyle = '#0f2a33'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = '#174552'; ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    const fx = W * .06, fw = W * .88, fy = H * .1;
    ctx.fillStyle = '#081a20'; ctx.fillRect(fx, fy, fw, floorY - fy);
    ctx.strokeStyle = '#4df8ff'; ctx.lineWidth = 4; ctx.strokeRect(fx, fy, fw, floorY - fy);
    for (let i = 0; i < 24; i++) { const on = Math.floor(time * 8 + i) % 3 === 0; ctx.fillStyle = on ? '#ffe86a' : '#5a5020'; ctx.beginPath(); ctx.arc(fx + fw * (i + .5) / 24, fy, 4, 0, TAU); ctx.fill(); }
    ctx.font = `900 ${Math.round(Math.min(W * .06, 46))}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff46bc'; ctx.shadowBlur = 16; ctx.fillStyle = '#ff46bc'; ctx.fillText('MORBID WASH 3000', W / 2, fy - Math.min(W * .035, 26)); ctx.shadowBlur = 0;
    const program = t >= T.turbo ? '⚠ TURBO WAX ⚠' : t >= T.foam ? 'FOAM' : t >= T.brushes ? 'BRUSHES' : t >= T.rinse ? 'RINSE' : '';
    if (program) { ctx.font = `700 ${Math.round(Math.min(W * .03, 22))}px 'Share Tech Mono', monospace`; ctx.fillStyle = t >= T.turbo && Math.sin(time * 12) > 0 ? '#ff456d' : '#7dfcff'; ctx.fillText(program, W / 2, fy + Math.min(W * .035, 26)); }
    // Pipe with nozzles, the conveyor belt.
    const pipeY = fy + big * .12; line(fx + 10, pipeY, fx + fw - 10, pipeY, '#8e97a9', 10);
    ctx.fillStyle = '#2b3040'; ctx.fillRect(fx, floorY - 8, fw, 22);
    for (let x = -40 + mod(time * 140, 40); x < fw; x += 40) line(fx + x, floorY + 12, fx + x + 18, floorY - 6, '#ffd24a', 5);
    // The racer rolls in on the conveyor and stays in the middle.
    const roll = clamp((t - T.rollIn) / 2, 0, 1), x0 = lerp(-size, W * .42, 1 - Math.pow(1 - roll, 2)), y0 = floorY - size * .55;
    const cold = t > T.rinse && t < T.brushes, tickled = t > T.brushes + .3 && t < T.foam;
    const tension = clamp((t - T.tension) / (T.boom - T.tension), 0, 1), spinning = clamp((t - T.turbo) / (T.boom - T.turbo), 0, 1);
    const jx = cold ? (Math.random() - .5) * size * .05 : tension ? (Math.random() - .5) * size * .18 * tension : 0;
    const tilt = tickled ? Math.sin(time * 22) * .9 : 0, spin = spinning * spinning * (time - intro.at - T.turbo) * 9;
    intro.hero = { x: x0, y: y0, size };
    // Rinse: cold water jets from the nozzles.
    if (t > T.rinse && t < T.brushes) for (let i = -2; i <= 2; i++) {
      const nx = x0 + i * size * .35; ctx.globalAlpha = .55; line(nx, pipeY + 6, x0 + i * size * .2, y0 - size * .2, '#7dd8ff', 6); ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) { const q = mod(time * 2.2 + k / 4 + i * .13, 1); ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.arc(lerp(nx, x0 + i * size * .2, q), lerp(pipeY, y0 - size * .2, q), 3, 0, TAU); ctx.fill(); }
    }
    if (t < T.boom) {
      drawShip(x0 + jx, y0 + (cold ? Math.sin(time * 60) * 2 : 0), size, m.color, m.dark, tilt, true, false, true, spin);
      if (cold) { ctx.globalAlpha = .35; ctx.fillStyle = '#7dd8ff'; ctx.beginPath(); ctx.arc(x0, y0 - size * .1, size * .55, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      if (tickled) for (const side of [-1, 1]) { ctx.fillStyle = '#ff6f8f'; ctx.beginPath(); ctx.ellipse(x0 + side * size * .2, y0 - size * .02, size * .09, size * .05, 0, 0, TAU); ctx.fill(); }
      // Turbo wax: a mirror shine.
      if (t > T.turbo) for (let i = 0; i < 6; i++) { const a = time * 3 + i, r = size * (.5 + .1 * Math.sin(time * 7 + i)); const sx = x0 + Math.cos(a) * r, sy = y0 - size * .1 + Math.sin(a) * r * .6; line(sx - 6, sy, sx + 6, sy, '#ffffff', 2); line(sx, sy - 6, sx, sy + 6, '#ffffff', 2); }
      drawTension(x0, y0 - size * .1, size, tension);
    } else if (intro.burst) drawExplosion(x0, y0, size * .9, intro.burst);
    // Brushes: two spinning cylinders closing in.
    if (t > T.brushes && t < T.foam + .8) {
      const close = clamp((t - T.brushes) / .8, 0, 1) * (1 - clamp((t - T.foam) / .8, 0, 1)), gap = lerp(size * 1.7, size * .62, close), bh = size * 1.6, bw = size * .42;
      for (const side of [-1, 1]) {
        const bx = x0 + side * gap - bw / 2, by = y0 - bh * .6;
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        for (let k = -1; k < 12; k++) { const yy = by + mod(k * bh / 10 + time * 420 * side, bh + bh / 10) - bh / 10; ctx.fillStyle = ['#ff4eb8', '#4df8ff', '#ffe24a'][(k + 3) % 3]; ctx.fillRect(bx, yy, bw, bh / 20); }
        ctx.restore(); line(bx + bw / 2, pipeY, bx + bw / 2, by, '#8e97a9', 6);
      }
    }
    // Foam piles up until only a shape is left, then the dryers blow it away.
    const foam = clamp((t - T.foam) / 1.8, 0, 1) * (1 - clamp((t - T.turbo) / .9, 0, 1));
    if (foam > 0) for (let i = 0; i < 70 * foam; i++) {
      const a = random(i) * TAU, r = size * (.2 + random(i + 7) * .7), bx = x0 + Math.cos(a) * r, by = y0 - size * .1 + Math.sin(a) * r * .7 - (1 - foam) * size;
      ctx.fillStyle = i % 4 ? 'rgba(255,255,255,.9)' : 'rgba(255,190,240,.9)'; ctx.beginPath(); ctx.arc(bx, by + Math.sin(time * 3 + i) * 2, size * (.08 + random(i + 3) * .1), 0, TAU); ctx.fill();
    }
    // Dryers at full blast.
    if (t > T.turbo && t < T.boom) for (let i = 0; i < 18; i++) { const q = mod(time * 2.5 + random(i), 1), yy = y0 - size * .7 + random(i + 1) * size * 1.2; ctx.globalAlpha = .5 * (1 - q); for (const side of [-1, 1]) line(x0 + side * (size * 2.2 - q * size * 1.4), yy, x0 + side * (size * 1.8 - q * size * 1.4), yy, '#ffffff', 2); ctx.globalAlpha = 1; }
    // The attendant's booth: a terminator cat with the TURBO WAX lever.
    const bw2 = big * .26, bh2 = big * .34, boothX = W * .8, boothY = W < H ? H * .3 : floorY - bh2; // on the wall above the belt on tall screens
    ctx.fillStyle = '#1b1e28'; ctx.fillRect(boothX - bw2 / 2, boothY, bw2, bh2); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.strokeRect(boothX - bw2 / 2, boothY, bw2, bh2);
    if (t > T.foam - .4) drawTerminatorCat(boothX, boothY + bh2 * .32, bw2 * .7, false, { kind: 0, d: null, scaredUntil: 0 }, big * .02);
    const leverAngle = lerp(-.9, .9, clamp((t - T.lever) / .4, 0, 1)), lx = boothX - bw2 / 2 - 6, ly = boothY + bh2 * .7;
    line(lx, ly, lx + Math.sin(leverAngle) * bh2 * .5, ly - Math.cos(leverAngle) * bh2 * .5, '#c9d2e3', 6);
    ctx.fillStyle = '#ff2b2b'; ctx.beginPath(); ctx.arc(lx + Math.sin(leverAngle) * bh2 * .5, ly - Math.cos(leverAngle) * bh2 * .5, 9, 0, TAU); ctx.fill();
    if (t > T.turbo) {
      for (const bxp of [fx + 24, fx + fw - 24]) { const a = time * 8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,120,40,.35)'; ctx.beginPath(); ctx.moveTo(bxp, fy + 20); ctx.arc(bxp, fy + 20, big * .5, a, a + .5); ctx.fill(); ctx.restore(); ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.arc(bxp, fy + 20, 10, 0, TAU); ctx.fill(); }
      ctx.fillStyle = `rgba(255,40,60,${.08 + Math.max(0, Math.sin(time * 10)) * .12})`; ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    // Speech bubbles.
    if (t > T.cold && t < T.cold + 2) drawBubble(x0, y0 - size * .75, 'Brrr! Cold!', '#7dd8ff');
    if (t > T.tickle && t < T.tickle + 2.4) drawBubble(x0, y0 - size * .75, 'Hihi! That tickles!', '#ff4fa8');
    if (t > T.turbo && t < T.turbo + 2) drawBubble(boothX, boothY - 8, 'Turbo wax activated.', '#ff2b2b');
    if (t >= T.boom) drawCrashLayer();
  }
  function drawClub(t) {
    const S = djStage(), cx = S.x + S.w / 2, k = clamp(t / .9, 0, 1), big = Math.min(S.w, S.h), pulse = beat;
    ctx.fillStyle = '#0c0618'; ctx.fillRect(-20, -20, W + 40, H + 40);
    // Back wall with the poster, lit by a spot.
    const spot = ctx.createRadialGradient(cx, S.h * .3, 1, cx, S.h * .3, big * .55); spot.addColorStop(0, '#3a1f5c'); spot.addColorStop(1, '#0c061800');
    ctx.fillStyle = spot; ctx.fillRect(S.x, 0, S.w, S.h);
    const ps = Math.min(S.w * .32, S.h * .5), px = S.x + S.w * .05, py = S.h * .12, pcx = px + ps / 2;
    ctx.save(); ctx.translate(pcx, py + ps / 2); ctx.rotate(-.04); ctx.translate(-pcx, -(py + ps / 2));
    ctx.fillStyle = '#000'; ctx.fillRect(px - 6, py - 6, ps + 12, ps + 12);
    if (posterImage && posterImage.complete && posterImage.naturalWidth) ctx.drawImage(posterImage, px, py, ps, ps);
    else { ctx.fillStyle = '#1a1020'; ctx.fillRect(px, py, ps, ps); ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(ps * .09)}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center'; ctx.fillText('8-BIT FINGERS', pcx, py + ps * .2); }
    ctx.fillStyle = '#e8e2c8cc'; for (const [x, y] of [[px, py], [px + ps, py]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(x === px ? -.6 : .6); ctx.fillRect(-ps * .08, -ps * .025, ps * .16, ps * .05); ctx.restore(); }
    ctx.restore();
    // Disco ball and sweeping light beams.
    const ballR = big * .065, ballX = cx + S.w * .12, ballY = ballR + 14;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + Math.sin(time * (.7 + i * .13) + i) * 1.1, len = big * 1.3, hue = (i * 60 + time * 40) % 360;
      ctx.fillStyle = `hsla(${hue},100%,60%,${.12 + pulse * .2})`; ctx.beginPath(); ctx.moveTo(ballX, ballY);
      ctx.lineTo(ballX + Math.cos(a - .08) * len, ballY + Math.sin(a - .08) * len); ctx.lineTo(ballX + Math.cos(a + .08) * len, ballY + Math.sin(a + .08) * len); ctx.fill();
    }
    ctx.restore();
    line(ballX, 0, ballX, ballY - ballR, '#8e97a9', 2);
    ctx.save(); ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, TAU); ctx.clip();
    for (let y = -ballR; y < ballR; y += ballR / 4) for (let x = -ballR; x < ballR; x += ballR / 4) { const lit = Math.sin(time * 4 + x * 3 + y * 5) > .4; ctx.fillStyle = lit ? '#ffffff' : (x + y) % 2 ? '#9aa3b5' : '#5d6474'; ctx.fillRect(ballX + x + mod(time * 30, ballR / 4) - ballR / 4, ballY + y, ballR / 4 - 1, ballR / 4 - 1); }
    ctx.restore();
    for (let i = 0; i < 10; i++) { const a = random(i) * TAU + time * .4, r = big * (.2 + random(i + 3) * .5), x = ballX + Math.cos(a) * r, y = ballY + Math.abs(Math.sin(a)) * r * 1.2; if (Math.sin(time * 6 + i) > .3) { line(x - 4, y, x + 4, y, '#ffffff', 2); line(x, y - 4, x, y + 4, '#ffffff', 2); } }
    // Dance floor tiles flashing to the beat.
    const floorTop = S.h * .78, tile = S.w / 10;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { const on = Math.sin(time * 5 + i * 1.7 + j * 2.3 + pulse * 6) > 0; ctx.fillStyle = on ? `hsl(${(i * 36 + j * 50 + time * 60) % 360},90%,${45 + pulse * 25}%)` : '#1c1030'; ctx.fillRect(S.x + i * tile + 1, floorTop + j * (S.h - floorTop) / 3 + 1, tile - 2, (S.h - floorTop) / 3 - 2); }
    // DJ booth: two decks, DJ MoFi with headphones behind them.
    const boothW = big * .62, boothH = big * .14, bx = cx - boothW / 2, by = floorTop - boothH;
    const mofiSize = big * .42, bob = Math.sin(time * MUZAK_BPM / 60 * Math.PI) * big * .012 * (1 + pulse * 2);
    const enter = 1 - Math.pow(1 - k, 3);
    drawTerminatorCat(cx, by - mofiSize * .18 + bob + (1 - enter) * S.h * .6, mofiSize, false, { kind: 0, d: null, scaredUntil: 0 }, big * .04);
    // Headphones and shades.
    const hy = by - mofiSize * .18 + bob + (1 - enter) * S.h * .6;
    ctx.strokeStyle = '#1b1e28'; ctx.lineWidth = Math.max(3, mofiSize * .04); ctx.beginPath(); ctx.arc(cx, hy - mofiSize * .05, mofiSize * .44, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    for (const side of [-1, 1]) { ctx.fillStyle = '#ff2b6a'; ctx.beginPath(); ctx.ellipse(cx + side * mofiSize * .42, hy - mofiSize * .02, mofiSize * .07, mofiSize * .11, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(cx - mofiSize * .26, hy - mofiSize * .14, mofiSize * .52, mofiSize * .1);
    ctx.fillStyle = '#ff1a1a'; ctx.fillRect(cx - mofiSize * .2, hy - mofiSize * .11, mofiSize * .1, mofiSize * .03);
    ctx.fillStyle = '#1b1e28'; ctx.fillRect(bx, by, boothW, boothH); ctx.strokeStyle = '#ff46bc'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, boothW, boothH);
    ctx.fillStyle = '#ff46bc'; ctx.font = `900 ${Math.round(boothH * .32)}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DJ MOFI', cx, by + boothH * .62);
    for (const side of [-1, 1]) {
      const dx = cx + side * boothW * .32, dy = by + boothH * .15, rr = boothH * .55;
      ctx.fillStyle = '#2b3040'; ctx.beginPath(); ctx.ellipse(dx, dy, rr * 1.15, rr * .45, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(dx, dy); ctx.scale(1, .4); drawVinyl(0, 0, rr, time * 6 * side); ctx.restore();
    }
    // The record for the chosen song flies from the crate onto the left deck.
    if (dj.record && time - dj.record.at < .7) {
      const q = (time - dj.record.at) / .7, fx = lerp(bx - boothW * .2, cx - boothW * .32, q), fy = lerp(by - big * .3, by + boothH * .15, q) - Math.sin(q * Math.PI) * big * .15;
      drawVinyl(fx, fy, boothH * .55, q * 12);
    }
    // Our racer dancing on the floor.
    const m = machines[shipIndex], dance = Math.sin(time * MUZAK_BPM / 60 * Math.PI);
    drawShip(S.x + S.w * .82, floorTop + (S.h - floorTop) * .35 - Math.abs(dance) * big * .03, big * .16, m.color, m.dark, dance * .6, true, false, true, dance * .2);
  }
