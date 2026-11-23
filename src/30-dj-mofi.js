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

  // ---- The elevator ride before the very first race: the racer waddles in to elevator music, a pink racer gets on
  // and flirts, our racer turns red... and is so embarrassed that it shakes, sparks and blows up. Then the race starts.
  const ELEV = { open1: 1.4, walkIn: 2, close1: 4.4, ride1: 5, open2: 8.4, pinkIn: 9, flirt: 10.6, pinkOut: 13.8, close2: 15.4, ride2: 16, tension: 16.2, boom: 18.4, race: 20.8 };
  const INTRO_KEY = 'morbid-intro-v1';
  let intro = null;
  const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return true; } };
  function startIntro() {
    unlockQuietly();
    mode = 'intro'; intro = { at: time, said: {}, muzak: startMuzak(), burst: null, hero: null, nextCrackle: 0 };
    $('menu').classList.add('hidden'); document.body.classList.add('dj'); $('dj-skip').classList.remove('hidden');
  }
  function skipIntro() {
    if (!intro || time - intro.at >= ELEV.boom - .3) return;
    intro.at = time - (ELEV.boom - .3); intro.said = { hi: 1, bye: 1 }; stopMuzak(intro);
  }
  function finishIntro() {
    stopMuzak(intro); intro = null; megaBlasts = [];
    try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode: it plays again next time */ }
    document.body.classList.remove('dj'); $('dj-skip').classList.add('hidden'); mode = 'menu';
    startRace();
  }
  function updateIntro(dt) {
    const t = time - intro.at, at = moment => t >= moment && t - dt < moment;
    if (t > ELEV.flirt + .1 && !intro.said.hi) { intro.said.hi = 1; robotSay('Oh hey, you here too?', 'pink-hi'); }
    if (t > ELEV.pinkOut + .1 && !intro.said.bye) { intro.said.bye = 1; robotSay('Toodle-oo!', 'pink-bye'); }
    // "Ding-dong" when the cabin stops.
    for (const [moment, freq] of [[ELEV.open1 - .2, 1319], [ELEV.open1 + .02, 1047], [ELEV.open2 - .2, 1319], [ELEV.open2 + .02, 1047]]) if (at(moment)) soundEffect(freq, .7);
    // Under tension: crackling sparks, faster and faster, then the blast – the same one as a wreck in the race.
    if (t > ELEV.tension && t < ELEV.boom && time >= intro.nextCrackle) {
      const k = (t - ELEV.tension) / (ELEV.boom - ELEV.tension); intro.nextCrackle = time + .22 - k * .17;
      playNoiseBurst(.08, .05 + k * .08, 7000, 2000); playToneSweep(2400, 600, .06, 'square', .02 + k * .03); buzz(20);
    }
    if (at(ELEV.tension)) stopMuzak(intro);
    if (t >= ELEV.boom && !intro.burst) {
      const h = intro.hero || { x: W / 2, y: H / 2, size: 100 };
      intro.burst = { started: time, duration: 1.6, color: '#ffec87', size: 5, seed: Math.floor(time * 1000), cartoon: false };
      megaBlasts.push({ x: h.x, y: h.y, started: time, duration: 2, color: '#ffec87', seed: 5, scale: 1 });
      megaBlasts.push({ x: h.x - h.size, y: h.y - h.size * .3, started: time + .2, duration: 1.6, color: machines[shipIndex].color, seed: 9, scale: .65 });
      megaBlasts.push({ x: h.x + h.size, y: h.y - h.size * .1, started: time + .35, duration: 1.6, color: '#ff4eb8', seed: 21, scale: .65 });
      shake = 2.2; screenFlash = 1; playExplosionSound(2.2); buzz([120, 40, 90, 40, 260], 0);
    }
    for (const [moment, power] of [[ELEV.boom + .3, 1.4], [ELEV.boom + .75, 1.8]]) if (at(moment)) playExplosionSound(power);
    megaBlasts = megaBlasts.filter(b => time - b.started < b.duration);
    shake *= Math.pow(.08, dt); screenFlash = Math.max(0, screenFlash - dt * 1.2);
    if (t >= ELEV.race) finishIntro();
  }
  function renderIntro() {
    ctx.save();
    if (shakeAmount() > .03) ctx.translate(Math.sin(time * 121) * shakeAmount() * 8, Math.cos(time * 93) * shakeAmount() * 6);
    drawElevator(time - intro.at);
    if (flashAmount(screenFlash) > .015) { ctx.fillStyle = `rgba(255,255,255,${flashAmount(screenFlash) * .85})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
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
  const MUZAK_BPM = 128, EIGHTH = 60 / MUZAK_BPM / 2;
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
  const COMP = [0, 3, 5], SHAKE = [1, .4, .7, .4, 1, .4, .7, .5];
  const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
  function startMuzak() {
    if (!audioContext || !analyser || muted) return null;
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
        const bar = MUZAK_BARS[Math.floor(m.step / 8) % MUZAK_BARS.length], slot = m.step % 8, at = m.next;
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
      if (tension > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 2 + Math.floor(tension * 6); i++) {
          const a = Math.random() * TAU, r0 = size * .35, r1 = size * (.6 + tension * .5);
          ctx.strokeStyle = i % 2 ? '#7dfcff' : '#fff36a'; ctx.lineWidth = Math.max(1.5, size * .025); ctx.beginPath(); ctx.moveTo(heroX + Math.cos(a) * r0, standY + Math.sin(a) * r0);
          for (let k = 1; k <= 4; k++) { const rr = lerp(r0, r1, k / 4), aa = a + (Math.random() - .5) * .5; ctx.lineTo(heroX + Math.cos(aa) * rr, standY + Math.sin(aa) * rr); }
          ctx.stroke();
        }
        const glow = ctx.createRadialGradient(heroX, standY, 1, heroX, standY, size * (.7 + tension * .6)); glow.addColorStop(0, `rgba(255,80,80,${.25 + tension * .45})`); glow.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(heroX, standY, size * (.7 + tension * .6), 0, TAU); ctx.fill(); ctx.restore();
      }
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
