  // ==== Settings wiring, stats/profile transfer, health warning, changelog, easter egg.
  document.querySelectorAll('[data-steer]').forEach(button => button.addEventListener('click', async () => {
    if (button.dataset.steer === 'gyro') {
      setupNote('ASKING FOR MOTION SENSOR ACCESS…');
      if (!await enableGyro()) { settings.steering = 'touch'; setupNote('GYRO NOT AVAILABLE — USING TOUCH'); renderSettings(); return; }
      setupNote('GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS');
    } else setupNote('DRAG ON THE TRACK TO STEER');
    settings.steering = button.dataset.steer; saveSettings(); renderSettings();
  }));
  document.querySelectorAll('[data-mutator]').forEach(button => button.addEventListener('click', () => toggleMutator(button.dataset.mutator)));
  renderMutators(); window.morbidMutators = { toggle: toggleMutator };
  document.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => setSetting(button.dataset.setting, button.dataset.value)));
  settingHooks.gameMode = () => renderGameMode();
  renderGameMode(); renderDaily();
  // ---- Statistics and profile transfer (a copy-paste code, no server needed).
  function renderStats() {
    const s = profile.stats, fav = Object.entries(s.perTrack || {}).sort((a, b) => b[1] - a[1])[0];
    const hours = Math.floor((s.seconds || 0) / 3600), mins = Math.floor((s.seconds || 0) % 3600 / 60);
    const rows = [
      ['RACES', s.races || 0], ['WINS', s.wins || 0], ['PODIUMS', s.podiums || 0], ['DISTANCE', `${Math.round(s.km || 0).toLocaleString()} KM`],
      ['PLAY TIME', `${hours}H ${String(mins).padStart(2, '0')}M`], ['FAVOURITE', fav ? tracks[fav[0]].name : '—'],
      ['RIVALS DESTROYED', s.rivals || 0], ['UFOs SHOT DOWN', s.ufos || 0], ['CATS POPPED', s.cats || 0], ['BOSSES DEFEATED', s.bosses || 0],
      ['ENDLESS RECORD', `${s.endlessBest || 0} WAVES`], ['DAILY STREAK', `${profile.daily.streak || 0} DAYS`],
      ['TROPHIES', `${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`], ['CREDITS', `${profile.credits} CR`],
    ];
    $('stats-list').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('profile-code').value = ''; $('profile-note').textContent = '';
  }
  const exportCode = () => 'MR1-' + btoa(unescape(encodeURIComponent(JSON.stringify({ profile, settings, best: Object.fromEntries(tracks.map((_, i) => { try { return [i, localStorage.getItem(`chroma-best-${i}`)]; } catch { return [i, null]; } })) }))));
  function importCode(code) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^MR1-/, '')))));
      if (!data || typeof data.profile !== 'object') throw new Error('bad');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      for (const [i, v] of Object.entries(data.best || {})) if (v) localStorage.setItem(`chroma-best-${i}`, v);
      return true;
    } catch { return false; }
  }
  $('open-stats').addEventListener('click', () => { renderStats(); openDialog('stats-screen'); });
  $('profile-export').addEventListener('click', async () => {
    const code = exportCode(); $('profile-code').value = code;
    try { await navigator.clipboard.writeText(code); $('profile-note').textContent = 'CODE COPIED — PASTE IT ON YOUR OTHER DEVICE.'; } catch { $('profile-note').textContent = 'COPY THE CODE BELOW AND PASTE IT ON YOUR OTHER DEVICE.'; }
  });
  $('profile-import').addEventListener('click', () => {
    if (!$('profile-code').value.trim()) { $('profile-note').textContent = 'PASTE A PROFILE CODE INTO THE BOX FIRST.'; return; }
    if (importCode($('profile-code').value)) { $('profile-note').textContent = 'PROFILE IMPORTED — RESTARTING…'; setTimeout(() => location.reload(), 700); }
    else $('profile-note').textContent = 'THAT CODE DOES NOT LOOK RIGHT. CHECK IT AND TRY AGAIN.';
  });
  window.morbidProfile = { exportCode, importCode };
  $('tutorial-skip').addEventListener('click', () => endTutorial(true));
  $('tutorial-replay').addEventListener('click', () => { profile.tutorialDone = false; saveProfile(); setupNote('THE TUTORIAL RUNS IN YOUR NEXT GRAND PRIX'); });
  $('daily-go').addEventListener('click', () => { const d = dailyChallenge(); if (gameMode() !== 'race') setSetting('gameMode', 'race'); selectTrack(d.track - trackIndex); });
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
  function closeDialogs() { ['settings-screen', 'changelog-screen', 'shop-screen', 'trophy-screen', 'stats-screen', 'story-screen'].forEach(id => $(id).classList.add('hidden')); if ($('health-screen').classList.contains('hidden')) document.body.classList.remove('dialog-open'); }
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
  // ---- Story: one comic chapter per circuit, unlocked together with the circuit.
  const STORY = [
    { title: "THE SIGNAL", panels: [{ art: "🌃📡", text: "2097. Night City never sleeps — and tonight the sky is humming." }, { art: "🛸📺", text: "A signal hijacks every screen: “EARTHLINGS. ENTERTAIN US.”" }, { art: "🏁🔥", text: "The Grand Prix goes on. If they want a show, we give them speed." }] },
    { title: "FIRST CONTACT", panels: [{ art: "☀️🛸", text: "The saucers follow the race to the solar fields. They drop gifts: bombs." }, { art: "🐱✨", text: "Someone keeps beaming cats onto the track. Nobody knows why." }, { art: "💬😈", text: "VEX: “Aliens or not — first place is mine.”" }] },
    { title: "THE MOTHERSHIP", panels: [{ art: "🌌🛸", text: "Over the ion seas a shadow swallows the stars. The mothership is here." }, { art: "📡🎯", text: "Mission control: “Down ten saucers and it shows itself. Then shoot it!”" }, { art: "⚡🙌", text: "Your laser cells hum. The crowd goes wild." }] },
    { title: "SYSTEM GLITCH", panels: [{ art: "🏙️⚠️", text: "The aliens hack the city grid. Drones and laser gates rise from the road." }, { art: "🤖💬", text: "NULL-9 laughs: “I helped them. Faster tracks, better ratings.”" }, { art: "✦🚀", text: "Your mechanic whispers a trick: star gates. Light speed, ten seconds." }] },
    { title: "COLD FRONT", panels: [{ art: "❄️🏔️", text: "They freeze the canyon. Grip is gone, the margins are zero." }, { art: "🛸💬", text: "The signal again: “YOUR SPECIES IS… AMUSING. CONTINUE.”" }, { art: "🔥💪", text: "KRONOS: “Amusing? Let's see how they like losing.”" }] },
    { title: "GRAVITY WARS", panels: [{ art: "🕳️🌙", text: "Beyond the moon, gravity bends. The track pulls you sideways." }, { art: "👁️🌑", text: "Something huge watches from the void. A cyclops? A commander?" }, { art: "🏁👀", text: "Only a winner gets close enough to find out." }] },
    { title: "NO BRAKES", panels: [{ art: "🔴🌪️", text: "Plasma storms. Laser gates. The aliens raise the stakes." }, { art: "💬😎", text: "BLAZE: “Whoever wins here gets the invitation. It's mine.”" }, { art: "🎟️🌌", text: "The invitation: a seat at the final fight above the galaxy." }] },
    { title: "THE LAST LINE", panels: [{ art: "🌀⚫", text: "The singularity. The final, impossible line." }, { art: "👾👾", text: "Win, and the invasion comes for you. Bosses wait in the dark." }, { art: "🪩💃", text: "And if you beat them too… the whole galaxy will dance." }] },
  ];
  let storyChapter = 0;
  const storyUnlocked = () => Math.min(STORY.length, profile.unlocked || 1);
  const storyUnseen = () => STORY.slice(0, storyUnlocked()).some((_, i) => !(profile.storySeen || []).includes(i));
  function renderStoryButton() { const b = $('open-story'); if (b) b.classList.toggle('new', storyUnseen()); }
  function openStory(chapter = 0) {
    storyChapter = clamp(chapter, 0, storyUnlocked() - 1); renderStory(); openDialog('story-screen');
  }
  function renderStory() {
    const c = STORY[storyChapter];
    profile.storySeen = [...new Set([...(profile.storySeen || []), storyChapter])]; saveProfile(); renderStoryButton();
    $('story-chapter').textContent = `CHAPTER ${storyChapter + 1} / ${STORY.length}  ·  ${tracks[storyChapter].name}`;
    $('story-title').textContent = c.title;
    $('story-panels').innerHTML = c.panels.map((p, i) => `<figure class="comic-panel" style="--tilt:${[-1.2, .8, -.5][i]}deg"><div class="comic-art">${p.art}</div><figcaption>${escapeHtml(p.text)}</figcaption></figure>`).join('');
    $('story-prev').disabled = storyChapter === 0; $('story-next').disabled = storyChapter >= storyUnlocked() - 1;
    $('story-locked').textContent = storyUnlocked() < STORY.length ? `🔒 ${STORY.length - storyUnlocked()} MORE CHAPTERS — UNLOCK CIRCUITS TO READ ON` : '';
  }
  $('open-story').addEventListener('click', () => openStory(Math.max(0, storyUnlocked() - 1)));
  $('story-prev').addEventListener('click', () => { storyChapter = Math.max(0, storyChapter - 1); renderStory(); });
  $('story-next').addEventListener('click', () => { storyChapter = Math.min(storyUnlocked() - 1, storyChapter + 1); renderStory(); });
  $('story-new').addEventListener('click', () => openStory(storyUnlocked() - 1));
  renderStoryButton(); window.morbidStory = { open: openStory };
