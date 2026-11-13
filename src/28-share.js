  // ==== Share card.
  // ---- Share card: a 1200×630 image of the result, shared via the system share sheet (or downloaded).
  function shareCard() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d');
    const t = tracks[trackIndex], won = finale && finale.phase === 'disco';
    const sky = g.createLinearGradient(0, 0, 0, 630); sky.addColorStop(0, t.sky[0]); sky.addColorStop(.6, t.sky[1]); sky.addColorStop(1, '#09091a');
    g.fillStyle = sky; g.fillRect(0, 0, 1200, 630);
    const sun = g.createLinearGradient(0, 120, 0, 420); sun.addColorStop(0, '#ffeb8f'); sun.addColorStop(1, '#ff4098');
    g.fillStyle = sun; g.beginPath(); g.arc(920, 280, 160, 0, TAU); g.fill();
    g.fillStyle = t.sky[1]; for (let i = 0; i < 8; i++) g.fillRect(760, 300 + i * 18, 320, 3 + i * 1.5);
    g.strokeStyle = t.edge + '88'; g.lineWidth = 2; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(600 + i * 40, 430); g.lineTo(600 + i * 160, 630); g.stroke(); }
    for (let i = 0; i < 6; i++) { const y = 430 + Math.pow(i / 6, 2) * 200; g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
    g.font = 'italic 900 110px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ffffff'; g.fillText('MORBID', 60, 150); g.fillStyle = '#ddff46'; g.fillText('RACERS', 60, 250);
    g.font = '22px "Share Tech Mono", monospace'; g.fillStyle = '#ff4eb8'; g.fillText(won ? 'GALAXY SAVED · INVASION REPELLED' : `${t.name} · ${t.class}`, 64, 305);
    g.font = 'italic 900 150px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ddff46'; g.fillText($('result-position').textContent || '--', 60, 470);
    g.font = 'italic 700 46px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#c9c2dc'; g.fillText(`/ ${PILOT_COUNT}`, 250, 470);
    g.font = '26px "Share Tech Mono", monospace'; g.fillStyle = '#ffffff';
    g.fillText(`TIME ${$('result-time').textContent}   BEST LAP ${$('result-lap').textContent}`, 64, 535);
    g.fillStyle = '#4df8ff'; g.fillText(won ? `${finale.waves} BOSS${finale.waves > 1 ? 'ES' : ''} SPLATTERED · ${ufoKills} UFOs` : `${ufoKills} UFOs SHOT DOWN · ${Object.keys(profile.achievements).length} TROPHIES`, 64, 580);
    g.font = '20px "Share Tech Mono", monospace'; g.fillStyle = '#c9c2dc'; g.fillText('jan-frederic.github.io/Zero', 900, 600);
    return c;
  }
  $('share').addEventListener('click', async () => {
    const c = shareCard(), text = `I just finished P${$('result-position').textContent} in Morbid Racers! Can you beat me? 🏁`, url = 'https://jan-frederic.github.io/Zero/';
    const blob = await new Promise(done => c.toBlob(done, 'image/png'));
    if (await shareFile(blob, 'morbid-racers.png', text, url)) unlockAchievement('share');
  });
  // Shares a file through the system share sheet, or downloads it where sharing files is not possible.
  async function shareFile(blob, name, text, url) {
    if (!blob) return false;
    const file = typeof File === 'function' ? new File([blob], name, { type: blob.type }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url, title: 'Morbid Racers' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
      return true;
    } catch { return false; /* share sheet dismissed */ }
  }
  // ---- Photo mode: freeze the race, move the camera, pick a filter and save the shot.
  const PHOTO_FILTERS = [['NONE', 'none'], ['NOIR', 'grayscale(1) contrast(1.35)'], ['VHS', 'saturate(1.7) hue-rotate(-14deg) contrast(1.15) blur(.4px)'], ['NEON', 'saturate(2.1) brightness(1.12)'], ['SEPIA', 'sepia(.85) contrast(1.1)']];
  let photo = null;
  function enterPhoto() {
    if (mode !== 'paused') return;
    photo = { x: 0, h: 0, zoom: 1, filter: 0, hideShip: false };
    document.body.classList.add('photo'); $('pause-screen').classList.add('hidden'); renderPhoto();
  }
  function exitPhoto() {
    if (!photo) return;
    photo = null; canvas.style.filter = ''; document.body.classList.remove('photo'); $('pause-screen').classList.remove('hidden');
  }
  function photoAdjust(what, delta) {
    if (!photo) return;
    if (what === 'x') photo.x = clamp(photo.x + delta, -1.2, 1.2);
    if (what === 'h') photo.h = clamp(photo.h + delta, -.6, 2.5);
    if (what === 'zoom') photo.zoom = clamp(photo.zoom + delta, 1, 2.2);
    if (what === 'filter') photo.filter = mod(photo.filter + delta, PHOTO_FILTERS.length);
    if (what === 'ship') photo.hideShip = !photo.hideShip;
    renderPhoto();
  }
  function renderPhoto() {
    canvas.style.filter = PHOTO_FILTERS[photo.filter][1] === 'none' ? '' : PHOTO_FILTERS[photo.filter][1];
    $('photo-filter').textContent = `FILTER: ${PHOTO_FILTERS[photo.filter][0]}`; $('photo-ship').textContent = photo.hideShip ? 'SHIP: HIDDEN' : 'SHIP: SHOWN';
  }
  function photoShot() {
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; const g = c.getContext('2d');
    const f = PHOTO_FILTERS[photo ? photo.filter : 0][1]; if (f !== 'none' && 'filter' in g) g.filter = f;
    g.drawImage(canvas, 0, 0); g.filter = 'none';
    const s = c.width / 1200; g.font = `italic 900 ${Math.round(42 * s)}px "Barlow Condensed", Impact, sans-serif`; g.textAlign = 'right';
    g.fillStyle = '#ffffffcc'; g.fillText('MORBID', c.width - 150 * s, c.height - 34 * s); g.fillStyle = '#ddff46'; g.fillText('RACERS', c.width - 28 * s, c.height - 34 * s);
    return c;
  }
  async function savePhoto() {
    const c = photoShot(); const blob = await new Promise(done => c.toBlob(done, 'image/png'));
    if (await shareFile(blob, 'morbid-racers-photo.png', `${tracks[trackIndex].name} in Morbid Racers 📸`, 'https://jan-frederic.github.io/Zero/')) unlockAchievement('share');
  }
  $('photo-mode').addEventListener('click', enterPhoto);
  document.querySelectorAll('[data-photo]').forEach(b => b.addEventListener('click', () => { const [what, d] = b.dataset.photo.split(':'); photoAdjust(what, Number(d) || 0); }));
  $('photo-save').addEventListener('click', savePhoto); $('photo-exit').addEventListener('click', exitPhoto);
  window.addEventListener('keydown', event => {
    if (!photo) return;
    const map = { ArrowLeft: ['x', -.1], ArrowRight: ['x', .1], ArrowUp: ['h', .15], ArrowDown: ['h', -.15], Equal: ['zoom', .1], Minus: ['zoom', -.1], KeyF: ['filter', 1] };
    if (event.code === 'Escape') { event.stopImmediatePropagation(); exitPhoto(); } else if (map[event.code]) { event.preventDefault(); photoAdjust(...map[event.code]); }
  }, true);
  window.morbidPhoto = { enter: enterPhoto, exit: exitPhoto, adjust: photoAdjust, shot: photoShot, state: () => photo && { ...photo } };
  // ---- Highlight clip: the last ~10 s of the final lap are recorded (picture and sound) and can be shared after a win.
  const CLIP_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  let clip = null, clipBlob = null, clipDest = null;
  function clipSupported() { return typeof MediaRecorder === 'function' && typeof canvas.captureStream === 'function'; }
  function startClip() {
    if (clip || !clipSupported()) return;
    try {
      const video = canvas.captureStream(30), tracks = [...video.getVideoTracks()];
      if (audioContext && audioContext.createMediaStreamDestination) {
        if (!clipDest) { clipDest = audioContext.createMediaStreamDestination(); musicGain.connect(clipDest); sfxBus.connect(clipDest); }
        tracks.push(...clipDest.stream.getAudioTracks());
      }
      const stream = typeof MediaStream === 'function' ? new MediaStream(tracks) : video;
      const type = CLIP_TYPES.find(t => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4e6 } : undefined), chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { clipBlob = chunks.length ? new Blob(chunks, { type: rec.mimeType || type || 'video/webm' }) : null; renderClipButton(); };
      rec.start(500); clip = { rec, started: time, stopAt: 0 }; clipBlob = null;
    } catch { clip = null; }
  }
  function stopClip() { if (!clip) return; const rec = clip.rec; clip = null; try { if (rec.state !== 'inactive') rec.stop(); } catch { /* already stopped */ } }
  function cancelClip() { stopClip(); clipBlob = null; renderClipButton(); }
  function updateClip() {
    if (clip && clip.stopAt && time >= clip.stopAt) stopClip();
    if (mode === 'racing' && !clip && !clipBlob && lap === LAP_COUNT && !trialRun && (LENGTH * LAP_COUNT - distance) / Math.max(speed, 3000) < 10) startClip();
  }
  function finishClip() { if (clip) clip.stopAt = time + 1.5; }
  function renderClipButton() { const b = $('share-clip'); if (b) b.classList.toggle('hidden', !(clipBlob && mode === 'finished' && rank === 1)); }
  $('share-clip').addEventListener('click', () => {
    if (!clipBlob) return;
    const ext = /mp4/.test(clipBlob.type) ? 'mp4' : 'webm';
    shareFile(clipBlob, `morbid-racers-finish.${ext}`, `My finish in Morbid Racers 🏁 ${tracks[trackIndex].name}`, 'https://jan-frederic.github.io/Zero/').then(ok => { if (ok) unlockAchievement('share'); });
  });
