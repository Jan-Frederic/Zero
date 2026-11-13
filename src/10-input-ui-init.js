  $('start').addEventListener('click', startRace); $('again').addEventListener('click', raceAgain);
  $('pause').addEventListener('click', pauseRace); $('resume').addEventListener('click', pauseRace);
  $('quit').addEventListener('click', garage); $('garage').addEventListener('click', garage);
  $('prev-track').addEventListener('click', () => selectTrack(-1)); $('next-track').addEventListener('click', () => selectTrack(1));
  document.querySelectorAll('[data-ship]').forEach(button => button.addEventListener('click', () => {
    shipIndex = Number(button.dataset.ship); document.querySelectorAll('[data-ship]').forEach(b => b.classList.toggle('selected', b === button));
    $('ship-info').textContent = machines[shipIndex].info;
  }));
  $('music-toggle').addEventListener('click', () => { if (audio.paused) { if (muted) toggleMute(); playMusic(); } else { audio.pause(); updateMusic(); } });
  $('sound').addEventListener('click', toggleMute);
  audio.addEventListener('play', updateMusic); audio.addEventListener('pause', updateMusic);
  audio.addEventListener('error', () => { $('music-status').textContent = 'SOUNDTRACK / FILE UNAVAILABLE'; });
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Fullscreen may be unavailable in embedded browsers. */ }
  });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code) && event.target.tagName !== 'BUTTON') event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'Enter' && !['BUTTON', 'A'].includes(event.target.tagName) && !document.body.classList.contains('dialog-open')) { if (mode === 'menu') startRace(); else if (mode === 'finished' || (finale && finale.resultsShown)) raceAgain(); else if (mode === 'paused') pauseRace(); }
      if (event.code === 'Escape' || event.code === 'KeyP') pauseRace();
      if (event.code === 'KeyM') toggleMute();
    }
    if (mode === 'racing' || mode === 'countdown' || mode === 'final') {
      if (event.code === 'Space') { event.preventDefault(); if (event.target.tagName === 'BUTTON') event.target.blur(); }
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); resetGesture(); if (mode === 'racing' || mode === 'countdown') pauseRace(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (mode === 'racing' || mode === 'countdown')) pauseRace(); });
  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(button.dataset.key); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
  });
  const gestureActive = () => mode === 'racing' || mode === 'countdown' || mode === 'final';
  function updateGesture() {
    let dx = gesture.x - gesture.originX, dy = gesture.y - gesture.originY;
    // Float the origin behind the finger so reversing direction responds instantly.
    if (Math.abs(dx) > STICK) { gesture.originX += dx - Math.sign(dx) * STICK; dx = Math.sign(dx) * STICK; }
    if (Math.abs(dy) > STICK) { gesture.originY += dy - Math.sign(dy) * STICK; dy = Math.sign(dy) * STICK; }
    if (Math.hypot(dx, dy) > 14) gesture.moved = true;
    gesture.steer = gyroActive() || Math.abs(dx) < DEADZONE ? 0 : clamp((dx - Math.sign(dx) * DEADZONE) / (STICK * .7 - DEADZONE), -1, 1);
    gesture.boost = dy < -VERTICAL; gesture.brake = dy > VERTICAL; gesture.accel = !gesture.brake;
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !gestureActive()) return;
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers cannot be captured. */ }
    if (gesture.id === null) {
      Object.assign(gesture, { id: event.pointerId, originX: event.clientX, originY: event.clientY, x: event.clientX, y: event.clientY, startTime: performance.now(), moved: false });
      updateGesture();
    } else { gesture.extra.add(event.pointerId); if (mode === 'racing' || mode === 'final') gesture.fireQueued = true; }
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== gesture.id) return;
    event.preventDefault(); gesture.x = event.clientX; gesture.y = event.clientY; updateGesture();
  });
  function endGesture(event) {
    if (gesture.extra.delete(event.pointerId)) return;
    if (event.pointerId !== gesture.id) return;
    const tap = !gesture.moved && performance.now() - gesture.startTime < 260;
    const extra = new Set(gesture.extra); resetGesture(); gesture.extra = extra;
    if (tap && (mode === 'racing' || mode === 'final')) gesture.fireQueued = true;
  }
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, endGesture);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  document.querySelectorAll('[data-steer]').forEach(button => button.addEventListener('click', async () => {
    if (button.dataset.steer === 'gyro') {
      setupNote('ASKING FOR MOTION SENSOR ACCESS…');
      if (!await enableGyro()) { settings.steering = 'touch'; setupNote('GYRO NOT AVAILABLE — USING TOUCH'); renderSettings(); return; }
      setupNote('GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS');
    } else setupNote('DRAG ON THE TRACK TO STEER');
    settings.steering = button.dataset.steer; saveSettings(); renderSettings();
  }));
  document.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => setSetting(button.dataset.setting, button.dataset.value)));
  settingHooks.gameMode = () => renderGameMode();
  renderGameMode();
  settingHooks.difficulty = () => setupNote(`DIFFICULTY: ${diff().name} · ${diff().lives > 0 ? '+1 LIFE, ' : diff().lives < 0 ? '-1 LIFE, ' : ''}${Math.round(diff().credits * 100)}% CREDITS`);
  window.morbidSettings = { set: setSetting, get: () => settings };
  document.querySelectorAll('[data-haptics]').forEach(button => button.addEventListener('click', () => {
    settings.haptics = button.dataset.haptics === 'on'; saveSettings(); renderSettings();
    const canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;
    if (settings.haptics && canVibrate) try { navigator.vibrate([40, 40, 80]); } catch { /* ignore */ }
    setupNote(settings.haptics ? (canVibrate ? 'VIBRATION ON' : 'THIS DEVICE CANNOT VIBRATE FROM THE WEB') : 'VIBRATION OFF');
  }));
  document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => {
    settings.screen = button.dataset.screen; saveSettings(); renderSettings(); applyScreenSetting(true);
    setupNote(`SCREEN: ${settings.screen.toUpperCase()}`);
  }));
  $('rotate-switch').addEventListener('click', () => { settings.screen = settings.screen === 'portrait' ? 'landscape' : 'portrait'; saveSettings(); renderSettings(); });
  window.matchMedia?.('(orientation: landscape)').addEventListener?.('change', () => setTimeout(checkOrientation, 50));
  // A remembered gyro choice needs the sensor again; iOS will re-ask on the next tap of GYRO.
  if (settings.steering === 'gyro') enableGyro().then(ok => { if (!ok && typeof window.DeviceOrientationEvent?.requestPermission !== 'function') { settings.steering = 'touch'; renderSettings(); } });
  renderSettings();
  renderLock();
  // ---- Home screen dialogs: settings and changelog.
  function openDialog(id) { $(id).classList.remove('hidden'); document.body.classList.add('dialog-open'); }
  function closeDialogs() { ['settings-screen', 'changelog-screen', 'shop-screen', 'trophy-screen'].forEach(id => $(id).classList.add('hidden')); if ($('health-screen').classList.contains('hidden')) document.body.classList.remove('dialog-open'); }
  // Health warning: shown on every visit (not again after an in-app update reload within the same session).
  let healthSeen = false;
  try { healthSeen = sessionStorage.getItem('morbid-health-ok') === '1'; } catch { /* show it */ }
  if (!healthSeen) { $('health-screen').classList.remove('hidden'); document.body.classList.add('dialog-open', 'health-open'); }
  $('health-accept').addEventListener('click', () => {
    $('health-screen').classList.add('hidden'); document.body.classList.remove('dialog-open', 'health-open');
    try { sessionStorage.setItem('morbid-health-ok', '1'); } catch { /* ignore */ }
  });
  const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Minimal renderer for the semantic-release CHANGELOG.md (headings, bullet lists, links reduced to text).
  function renderChangelog(markdown) {
    const html = [];
    let list = false;
    for (const raw of markdown.split('\n')) {
      const line = raw.replace(/\s*\(\[[0-9a-f]{7,}\]\([^)]*\)\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
      const item = /^[*-]\s+(.*)/.exec(line), heading = /^(#{1,3})\s+(.*)/.exec(line);
      if (!item && list) { html.push('</ul>'); list = false; }
      if (heading) {
        if (heading[2] === 'Changelog') continue;
        const level = heading[1].length < 3 ? 'h3' : 'h4';
        html.push(`<${level}>${escapeHtml(heading[2])}</${level}>`);
      } else if (item) { if (!list) { html.push('<ul>'); list = true; } html.push(`<li>${escapeHtml(item[1])}</li>`); }
    }
    if (list) html.push('</ul>');
    return html.join('') || '<p>No changes recorded yet.</p>';
  }
  async function showChangelog() {
    openDialog('changelog-screen'); $('changelog-body').innerHTML = '<p>LOADING…</p>';
    try {
      const response = await fetch('CHANGELOG.md', { cache: 'no-cache' });
      if (!response.ok) throw new Error(response.status);
      $('changelog-body').innerHTML = renderChangelog(await response.text());
    } catch { $('changelog-body').innerHTML = '<p>The changelog is not available offline yet.</p>'; }
  }
  $('open-settings').addEventListener('click', () => openDialog('settings-screen'));
  $('open-changelog').addEventListener('click', showChangelog);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', closeDialogs));
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && document.body.classList.contains('dialog-open')) closeDialogs(); });
  // Easter egg: tap the big MORBID RACERS title 5 times quickly (or type B-O-S-S on the start screen)
  // to skip the race and go straight to the invasion; the number of bosses follows the selected circuit.
  let eggTaps = [], eggTyped = '';
  function startEndless() { endlessRun = true; trialRun = false; bossRush(true); }
  function bossRush(endless = false) {
    if (!endless) { unlockAchievement('egg'); endlessRun = false; }
    eggTaps = []; eggTyped = '';
    setupAudio(); primeSpeech();
    $('menu').classList.add('hidden'); $('hud').classList.add('hidden');
    document.body.classList.add('racing'); document.body.classList.remove('paused');
    rivals = []; ufos = []; bombs = []; shield = 100; lives = startLives(); raceEarned = 0;
    startInvasion();
  }
  $('title-egg').addEventListener('click', () => {
    if (mode !== 'menu' || document.body.classList.contains('dialog-open')) return;
    eggTaps = eggTaps.filter(t => Date.now() - t < 2500); eggTaps.push(Date.now());
    const title = $('title-egg'); title.classList.remove('egg-tap'); void title.offsetWidth; title.classList.add('egg-tap');
    playToneSweep(300 + eggTaps.length * 180, 400 + eggTaps.length * 220, .08, 'square', .03);
    if (eggTaps.length >= 5) bossRush();
  });
  window.addEventListener('keydown', event => {
    if (mode !== 'menu' || !/^Key[A-Z]$/.test(event.code)) return;
    eggTyped = (eggTyped + event.code.slice(3)).slice(-4);
    if (eggTyped === 'BOSS') bossRush();
  });
  // ---- Upgrade shop in the garage.
  function renderShop() {
    $('shop-credits').textContent = `${profile.credits} CR`;
    $('open-shop').textContent = `🛠 UPGRADES · ${profile.credits} CR`;
    $('shop-list').innerHTML = Object.entries(UPGRADES).map(([key, u]) => {
      const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl], maxed = lvl >= UPGRADE_MAX;
      const pips = Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="shop-row"><div class="shop-info"><b>${u.icon} ${u.name}</b><span class="pips">${pips}</span><small>${maxed ? 'MAXED OUT — ' : 'NOW: '}${u.info(lvl)}${maxed ? '' : `<br>NEXT: ${u.info(lvl + 1)}`}</small></div>`
        + `<button class="setup-option shop-buy" data-buy="${key}" ${maxed || profile.credits < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `UPGRADE · ${cost} CR`}</button></div>`;
    }).join('');
    $('paint-list').innerHTML = PAINTS.map(p => {
      const owned = paintOwned(p), active = (profile.paint || 'factory') === p.id;
      const swatch = p.pattern === 'rainbow' ? 'linear-gradient(90deg,#ff4eb8,#ddff46,#4df8ff,#a88aff)' : p.id === 'factory' ? machines[shipIndex].color : `linear-gradient(135deg,${p.color} 55%,${p.accent} 55%)`;
      const label = active ? 'EQUIPPED' : owned ? 'EQUIP' : p.trophy ? `🏆 ${ACHIEVEMENTS.find(a => a.id === p.trophy).name}` : `BUY · ${p.cost} CR`;
      return `<button class="paint ${active ? 'active' : ''} ${owned ? 'owned' : ''}" data-paint="${p.id}" ${!owned && (p.trophy || profile.credits < p.cost) ? 'disabled' : ''}><i style="background:${swatch}"></i><b>${p.name}</b><small>${label}</small></button>`;
    }).join('');
  }
  function choosePaint(id) {
    const p = PAINTS.find(x => x.id === id); if (!p) return false;
    if (!paintOwned(p)) { if (p.trophy || profile.credits < p.cost) return false; profile.credits -= p.cost; profile.paints.push(p.id); playToneSweep(500, 1500, .3, 'square', .05); }
    profile.paint = p.id; saveProfile(); renderShop(); return true;
  }
  if ($('paint-list').addEventListener) $('paint-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-paint]'); if (b) choosePaint(b.dataset.paint); });
  function buyUpgrade(key) {
    const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl];
    if (lvl >= UPGRADE_MAX || profile.credits < cost) return false;
    profile.credits -= cost; profile.upgrades[key] = lvl + 1; saveProfile(); renderShop();
    unlockAchievement('upgrade'); if (Object.values(profile.upgrades).every(v => v >= UPGRADE_MAX)) unlockAchievement('maxed');
    playToneSweep(500, 1500, .3, 'square', .05); return true;
  }
  if ($('shop-list').addEventListener) $('shop-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-buy]'); if (b) buyUpgrade(b.dataset.buy); });
  $('open-shop').addEventListener('click', () => { renderShop(); openDialog('shop-screen'); });
  renderShop(); renderTrophyButton();
  $('open-trophies').addEventListener('click', () => { renderTrophies(); openDialog('trophy-screen'); });
  window.morbidShop = { buy: buyUpgrade, paint: choosePaint, profile };
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
    const file = blob && typeof File === 'function' ? new File([blob], 'morbid-racers.png', { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url, title: 'Morbid Racers' });
      else if (navigator.share) await navigator.share({ text, url, title: 'Morbid Racers' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'morbid-racers.png'; a.click(); }
      unlockAchievement('share');
    } catch { /* share sheet dismissed */ }
  });
  // Lets the update job wait until no race is in progress.
  window.morbidBusy = () => ['countdown', 'racing', 'respawning', 'paused', 'wrecked', 'invasion', 'final'].includes(mode) || (mode === 'disco' && !(finale && finale.resultsShown));
  window.addEventListener('resize', resize);
  preloadSoundtrack(); prefetchVoices();
  resize(); buildTrack(); requestAnimationFrame(frame);
})();
