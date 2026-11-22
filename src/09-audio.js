  // ==== Audio graph, soundtrack preloading, sound effects, robot voice, jets.
  let jetSource, jetFilter, jetGain, jetWhine, jetWhineGain;
  // Each kill call has a pre-rendered retro robot clip in voice/ (made by tools/make-voice.sh).
  const KILL_CALLS = [['ALIEN KILLER!', 'alien-killer'], ['FATALITY!', 'fatality'], ['UFO OBLITERATED!', 'ufo-obliterated'], ['ABDUCT THIS!', 'abduct-this'],
    ['INVASION CANCELLED!', 'invasion-cancelled'], ['CLOSE ENCOUNTER OF THE FATAL KIND!', 'close-encounter'], ['SAUCER SMASHED!', 'saucer-smashed'],
    ['GREEN MEN DOWN!', 'green-men-down'], ['PROBE DENIED!', 'probe-denied'], ['AREA 51 SAYS THANK YOU!', 'area-51'], ['TOASTED SAUCER!', 'toasted-saucer'],
    ['MOTHERSHIP WILL HEAR ABOUT THIS!', 'mothership'], ['ULTRA KILL!', 'ultra-kill'], ['GALACTIC HUMILIATION!', 'galactic-humiliation'],
    ['NO PARKING IN MY SKY!', 'no-parking'], ['RETURN TO SENDER!', 'return-to-sender']];
  const VOICE_CLIPS = [...KILL_CALLS.map(call => call[1]), 'hyperdrive-initiated', 'first-place', 'mothership-warning', 'mothership-down', 'invasion-incoming', 'congratulations', 'next-boss', 'scream-overlord', 'scream-cyclops', 'scream-maggot', 'scream-robot', 'black-hole', ...NEMESES.flatMap(n => [`taunt-${n.id}`, `down-${n.id}`])];
  // German announcer: voice/de/<clip> is rendered from these lines by tools/make-voice.sh (which reads this table).
  // Clips without a German line (the wordless boss screams) use the English file in both languages.
  const VOICE_DE = {
    'alien-killer': 'Alien-Killer!', 'fatality': 'Tödlich!', 'ufo-obliterated': 'U F O pulverisiert!', 'abduct-this': 'Entführ doch das hier!',
    'invasion-cancelled': 'Invasion abgesagt!', 'close-encounter': 'Unheimliche Begegnung der tödlichen Art!', 'saucer-smashed': 'Untertasse zertrümmert!',
    'green-men-down': 'Grüne Männchen erledigt!', 'probe-denied': 'Sonde abgelehnt!', 'area-51': 'Area einundfünfzig sagt danke!', 'toasted-saucer': 'Geröstete Untertasse!',
    'mothership': 'Das Mutterschiff wird davon erfahren!', 'ultra-kill': 'Ultra-Abschuss!', 'galactic-humiliation': 'Galaktische Demütigung!',
    'no-parking': 'Parkverbot an meinem Himmel!', 'return-to-sender': 'Zurück an den Absender!',
    'hyperdrive-initiated': 'Hyperantrieb aktiviert!', 'first-place': 'Erster Platz. Makelloser Sieg!', 'mothership-warning': 'Warnung! Mutterschiff im Anflug!',
    'mothership-down': 'Mutterschiff zerstört. Du bist eine Legende!', 'invasion-incoming': 'Warnung! Invasion im Anmarsch!', 'congratulations': 'Herzlichen Glückwunsch, Erdling!',
    'next-boss': 'Warnung! Nächster Boss im Anflug!', 'scream-robot': 'Fehler. Fehler. Systemausfall. Abschaaaltung',
    'black-hole': 'Uiuiui! Krasses Schwarzes Loch. Terminator-Katzen greifen an!!!',
    'taunt-vex': 'Hier ist Vex. Du gehst unter, Anfänger!', 'down-vex': 'Unmöglich! Vex ist raus!',
    'taunt-kronos': 'Kronos beherrscht diese Strecke!', 'down-kronos': 'Kronos wird zurückkehren!',
    'taunt-null9': 'Null Neun. Ziel erfasst.', 'down-null9': 'Null Neun. Offline.',
    'taunt-blaze': 'Ha! Friss meine Abgase!', 'down-blaze': 'Neeein, mein wunderschönes Schiff!',
  };
  const voiceLang = () => settings.lang === 'de' ? 'de' : 'en';
  const voiceKey = (clip, lang = voiceLang()) => lang === 'de' && VOICE_DE[clip] ? `de/${clip}` : clip;
  const fetchVoice = (key, ext = AUDIO_EXT) => fetch(`voice/${key}.${ext}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`voice ${key} missing`)));
  const voiceBuffers = new Map();
  let voiceSource = null;
  let subtitleAt = -9, speechPrimed = false;
  const voicesStarted = new Set();
  // Safari 16.4+: play like a media app, so sound also comes out with the iPhone's silent switch on
  // (the music runs through Web Audio, which iOS would otherwise mute together with the ringer).
  function audioSessionPlayback() { try { const s = /** @type {any} */ (navigator).audioSession; if (s && s.type !== 'playback') s.type = 'playback'; } catch { /* not supported */ } }
  function wakeAudio() {
    if (audioContext && audioContext.state !== 'running' && audioContext.state !== 'closed') { audioSessionPlayback(); const p = audioContext.resume(); if (p && p.catch) p.catch(() => {}); }
    if (musicBlocked && musicWanted && audio.paused && !muted && soundtrackReady) tryPlay();
  }
  function setupAudio() {
    audioSessionPlayback();
    if (audioContext) { wakeAudio(); return; }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser(); analyser.fftSize = 128;
      musicGain = audioContext.createGain(); musicGain.gain.value = .92 * .24; audio.volume = 1;
      sfxBus = audioContext.createGain(); sfxBus.gain.value = 1.55;
      musicSource = audioContext.createMediaElementSource(audio); musicSource.connect(analyser); analyser.connect(musicGain); musicGain.connect(audioContext.destination);
      sfxBus.connect(audioContext.destination);
      frequency = new Uint8Array(analyser.frequencyBinCount);
      engineOsc = audioContext.createOscillator(); engineOsc.type = 'sawtooth';
      const filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220;
      engineGain = audioContext.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(sfxBus); engineOsc.start();
      setupJet(); loadVoices();
    } catch { /* The soundtrack still plays if Web Audio is unavailable. */ }
  }
  // ---- Soundtrack: two Morbid Fingers songs. Both are downloaded into memory as soon as the page opens and played
  // from local blobs, so playback can never run dry mid-race; the start button waits for them (renderStartButton).
  // WebM/Opus copies are ~40 % smaller; browsers that cannot play them get the MP3s.
  // Apple's WebKit gets the MP3s: its WebM/Opus support differs between iOS versions, especially in decodeAudioData.
  /** @type {{ id: string, name: string, title: string, file: string, blob?: string|null, received?: number, total?: number, mp3Only?: boolean }[]} */
  const SONGS = [
    { id: 'redemption', name: 'REDEMPTION', title: 'Redemption (Live, 2003)', file: 'Morbid_Fingers%20-%20live-%20Emmerich_Juli_2003%20-%2003%20Redemption' },
    { id: 'brainwash', name: 'BRAIN WASH', title: 'Brain Wash (8-Bit Edition)', file: 'Morbid_Fingers%20-%20Brain_Wash_8-Bit_Edition' },
  ];
  const AUDIO_EXT = (() => { try { return !appleWebKit && audio.canPlayType && audio.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'mp3'; } catch { return 'mp3'; } })();
  const songUrl = (song, ext = AUDIO_EXT) => `${song.file}.${ext}`;
  const songSrc = i => { const song = SONGS[i]; return song.mp3Only ? songUrl(song, 'mp3') : song.blob || songUrl(song); };
  let songIndex = 0;
  let soundtrackReady = false, soundtrackProgress = 0, soundtrackPromise = null, musicWanted = false, musicBlocked = false;
  // Plays the soundtrack; if the browser refuses (Safari outside a tap), the next tap starts it (see wakeAudio).
  function tryPlay() {
    const p = audio.play();
    if (p && p.then) return p.then(() => { musicBlocked = false; updateMusic(); }, () => { musicBlocked = true; updateMusic(); });
    return Promise.resolve();
  }
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='; // 0.1 s of silence
  const playingSilence = () => String(audio.src || '').startsWith('data:');
  // Share of the soundtrack downloaded so far (a song whose size is not known yet counts with an estimate).
  function downloadShare() {
    let got = 0, all = 0;
    for (const song of SONGS) { const total = song.total || 3e6; all += total; got += Math.min(total, song.received || 0); }
    return all ? Math.min(.99, got / all) : 0;
  }
  async function downloadSong(song) {
    const response = await fetch(songUrl(song));
    if (!response.ok) throw new Error(String(response.status));
    const total = Number(response.headers.get('content-length')) || 0;
    song.total = total || song.total; song.received = 0;
    let blob;
    if (response.body && response.body.getReader && total) {
      const reader = response.body.getReader(), chunks = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); song.received += value.length; soundtrackProgress = downloadShare(); updateMusic(); }
      blob = new Blob(chunks, { type: AUDIO_EXT === 'webm' ? 'audio/webm' : 'audio/mpeg' });
    } else blob = await response.blob();
    song.received = song.total = song.total || blob.size || 1; soundtrackProgress = downloadShare();
    song.blob = URL.createObjectURL(blob);
  }
  function preloadSoundtrack() {
    if (soundtrackPromise) return soundtrackPromise;
    if (typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL || typeof Blob === 'undefined') {
      soundtrackReady = true; audio.preload = 'auto'; return (soundtrackPromise = Promise.resolve());
    }
    soundtrackPromise = (async () => {
      updateMusic();
      // A failed download (offline without a cached copy) falls back to streaming that song.
      await Promise.all(SONGS.map(song => downloadSong(song).catch(() => { song.blob = null; })));
      // Move the current song over to its local copy, keeping its position if it is already playing.
      const resume = !audio.paused && !playingSilence(), at = playingSilence() ? 0 : audio.currentTime || 0;
      audio.src = songSrc(songIndex); audio.preload = 'auto'; try { audio.load(); } catch { /* ignore */ }
      if (at) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = at; } catch { /* keep the start */ } }, { once: true });
      if (resume || musicWanted) tryPlay();
      soundtrackReady = true; soundtrackProgress = 1; updateMusic();
    })();
    return soundtrackPromise;
  }
  // The browser could not play a WebM copy after all: stream that song's MP3 instead.
  audio.addEventListener('error', () => {
    const song = SONGS[songIndex];
    if (!song || song.mp3Only || AUDIO_EXT === 'mp3' || playingSilence()) return;
    song.mp3Only = true; audio.src = songSrc(songIndex); try { audio.load(); } catch { /* ignore */ }
    if (musicWanted && !muted) tryPlay();
  });
  // Shows the song in the music player and switches the audio element over to it (from the start).
  function selectSong(i) {
    if (!SONGS[i]) return;
    const changed = i !== songIndex; songIndex = i;
    if ($('song-title')) $('song-title').textContent = `— ${SONGS[i].title}`;
    if (changed && !playingSilence()) { audio.src = songSrc(i); try { audio.load(); } catch { /* ignore */ } }
  }
  // MUSIC setting: 'mix' (DJ Morbid Fingers: the songs take turns at every race start) or one song all the time.
  function raceSong() {
    const fixed = SONGS.findIndex(song => song.id === settings.music);
    if (fixed >= 0) return fixed;
    const next = (Number(settings.mixNext) || 0) % SONGS.length;
    settings.mixNext = next + 1; saveSettings(); return next;
  }
  // Picking one song in the settings switches to it right away (the tap lets it play on Safari too).
  settingHooks.music = v => {
    const i = SONGS.findIndex(song => song.id === v);
    if (i < 0 || i === songIndex || mode !== 'menu') return;
    const wasPlaying = !audio.paused; selectSong(i); if (wasPlaying) playMusic();
  };
  // Called from the race start (inside the player's tap, so Safari lets the new song play).
  function startRaceMusic() { selectSong(raceSong()); playMusic(); }
  function playMusic() {
    // iOS ignores audio.volume, so with Web Audio the music level is set on its gain node instead (see setupAudio).
    setupAudio(); musicWanted = true; audio.volume = musicSource ? 1 : .24;
    if (!soundtrackReady) {
      // Unlock the audio element inside the user's tap (needed on iOS), but don't stream it twice:
      // it starts for real as soon as the preloaded copy is ready.
      if (!String(audio.src || '').startsWith('blob:')) audio.src = SILENCE;
      const unlock = audio.play(); if (unlock && unlock.then) unlock.then(() => { if (!soundtrackReady) audio.pause(); }).catch(() => {});
      updateMusic(); return;
    }
    if (playingSilence()) audio.src = songSrc(songIndex);
    tryPlay().then(() => { if (musicBlocked) $('music-status').textContent = 'SOUNDTRACK / TAP TO PLAY'; });
  }
  function updateMusic() {
    const playing = !audio.paused && !muted;
    document.body.classList.toggle('playing', playing);
    $('music-status').textContent = !soundtrackReady ? `SOUNDTRACK / LOADING ${Math.round(soundtrackProgress * 100)}%` : muted ? 'SOUNDTRACK / MUTED' : playing ? 'NOW PLAYING / LOCAL SOUNDTRACK' : 'SOUNDTRACK / PRESS PLAY';
    $('music-toggle').setAttribute('aria-label', audio.paused ? 'Play soundtrack' : 'Pause soundtrack');
    $('sound').textContent = muted ? '♪̸' : '♫';
    $('sound').setAttribute('aria-label', muted ? 'Unmute soundtrack' : 'Mute soundtrack');
  }
  function toggleMute() { muted = !muted; audio.muted = muted; updateMusic(); }
  function soundEffect(freq, duration, type = 'sine') {
    if (!audioContext || muted) return;
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * .5, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(.06, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    osc.connect(gain); gain.connect(sfxBus || audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function playToneSweep(from, to, duration, type, volume) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(sfxBus || audioContext.destination); oscillator.start(now); oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Synth effects are optional on browsers with limited Web Audio support. */ }
  }
  function playNoiseBurst(duration, volume, cutoffFrom, cutoffTo) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime, length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
      const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate), samples = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoffFrom, now); filter.frequency.exponentialRampToValueAtTime(cutoffTo, now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(sfxBus || audioContext.destination); source.start(now); source.stop(now + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch { /* Keep gameplay running if a browser cannot synthesize noise. */ }
  }
  // Haptics: short buzzes for hits and boosts, long rumbles for explosions (Android; iOS has no web vibration).
  let lastBuzz = 0;
  function buzz(pattern, minGap = .06) {
    if (!settings.haptics || mode === 'menu' || typeof navigator === 'undefined' || !navigator.vibrate) return;
    if (time - lastBuzz < minGap) return; lastBuzz = time;
    try { navigator.vibrate(pattern); } catch { /* unsupported */ }
  }
  function playBoostSound(power = 1) {
    buzz(Math.round(25 * power));
    playToneSweep(95, 560, .3, 'sawtooth', .055 * power);
    playNoiseBurst(.24, .055 * power, 3400, 260);
  }
  function playLaserSound() {
    playToneSweep(1750, 180, .13, 'square', .048);
    playToneSweep(510, 95, .17, 'sawtooth', .035);
  }
  function playImpactSound(power = 1) {
    buzz(Math.round(35 + 45 * Math.min(power, 1.5)));
    playToneSweep(118, 29, .4, 'sawtooth', .095 * power);
    playToneSweep(980, 165, .11, 'square', .045 * power);
    playNoiseBurst(.3, .12 * power, 2400, 115);
  }
  function playExplosionSound(power = 1) {
    buzz(power >= 2 ? [120, 40, 90, 40, 260] : Math.round(60 + power * 60), .02);
    playToneSweep(148, 27, .56, 'sawtooth', .12 * power);
    playToneSweep(740, 82, .28, 'triangle', .045 * power);
    playNoiseBurst(.5, .16 * power, 2800, 72);
  }
  function playCatPopSound() {
    playToneSweep(480, 1120, .1, 'triangle', .06);
    playToneSweep(950, 530, .17, 'sine', .04);
  }
  // Robot announcer: Web Speech with a low, flat pitch. Silently skipped where unsupported.
  // Voice clips are downloaded right away (no audio context needed) and decoded once audio is unlocked.
  const voiceData = new Map();
  let voicesLoaded = 0;
  // Downloads the announcer clips of the current language (counted for the start button).
  function prefetchVoices() {
    if (typeof fetch !== 'function') { voicesLoaded = VOICE_CLIPS.length; return; }
    for (const clip of VOICE_CLIPS) { const key = voiceKey(clip); fetchVoice(key).then(data => { voiceData.set(key, data); }).catch(() => {}).finally(() => { voicesLoaded++; }); }
  }
  // Language switched: fetch (and, with sound on, decode) the other set of clips in the background.
  function voiceLanguageChanged() {
    if (typeof fetch !== 'function') return;
    if (audioContext) { loadVoices(); return; }
    for (const clip of VOICE_CLIPS) { const key = voiceKey(clip); if (!voiceData.has(key)) fetchVoice(key).then(data => { voiceData.set(key, data); }).catch(() => {}); }
  }
  // ---- Download progress (soundtrack 85 %, voices 15 %) and the start button that waits for it.
  const bootProgress = () => clamp(soundtrackProgress * .85 + voicesLoaded / VOICE_CLIPS.length * .15, 0, 1);
  // The start button waits until the soundtrack and all voice clips are on the device, so the music starts inside the
  // player's tap (Safari only allows that) and never stutters. A download that makes no progress for 25 s does not
  // lock the game: the button opens and the music streams instead.
  const DOWNLOAD_STALL = 25;
  let lastProgress = -1, lastProgressAt = 0, downloadsStalled = false;
  const downloadsDone = () => soundtrackReady && voicesLoaded >= VOICE_CLIPS.length;
  const downloadsReady = () => downloadsDone() || downloadsStalled;
  function watchDownloads(now) {
    if (downloadsReady()) return;
    const p = bootProgress();
    if (p !== lastProgress) { lastProgress = p; lastProgressAt = now; }
    else if (now - lastProgressAt > DOWNLOAD_STALL) downloadsStalled = true;
  }
  let startLabel = '';
  function renderStartButton() {
    const start = $('start'); if (!start) return;
    const ready = downloadsReady(), pct = Math.min(99, Math.round(bootProgress() * 100));
    const label = !ready ? `LOADING ${pct}%` : trackLocked(trackIndex) ? 'LOCKED CIRCUIT' : 'ENTER THE RACE';
    start.disabled = !ready; start.classList.toggle('loading', !ready); start.setAttribute('aria-busy', String(!ready));
    if (start.style && start.style.setProperty) start.style.setProperty('--load', `${ready ? 100 : pct}%`);
    if (label !== startLabel && start.firstElementChild) { startLabel = label; start.firstElementChild.textContent = label; }
  }
  // Callback form: older Safari has no promise-based decodeAudioData.
  const decodeClip = data => new Promise((ok, fail) => { try { const p = audioContext.decodeAudioData(data, ok, fail); if (p && p.catch) p.catch(fail); } catch (e) { fail(e); } });
  function loadVoices() {
    if (!audioContext || typeof fetch !== 'function') return;
    for (const clip of VOICE_CLIPS) {
      const key = voiceKey(clip); if (voicesStarted.has(key)) continue; voicesStarted.add(key);
      (voiceData.has(key) ? Promise.resolve(voiceData.get(key).slice(0)) : fetchVoice(key))
        .then(decodeClip).catch(() => AUDIO_EXT === 'mp3' ? Promise.reject() : fetchVoice(key, 'mp3').then(decodeClip))
        .then(buffer => voiceBuffers.set(key, buffer)).catch(() => { voicesStarted.delete(key); });
    }
  }
  // Retro robot announcer: plays the pre-rendered clip; falls back to the system voice if it is not loaded.
  // In German the announcer speaks the German line (pre-rendered clip, else the system's German voice).
  function robotSay(text, clip) {
    const de = voiceLang() === 'de';
    if (de && clip && VOICE_DE[clip]) text = VOICE_DE[clip];
    if (settings.subtitles && text && $('subtitle')) { $('subtitle').textContent = `🔊 ${String(text).replace(/[!.]+$/, '').toUpperCase()}`; $('subtitle').classList.add('visible'); subtitleAt = frameClock; }
    if (muted) return;
    const buffer = clip && voiceBuffers.get(voiceKey(clip));
    if (buffer && audioContext) {
      try {
        if (voiceSource) try { voiceSource.stop(); } catch { /* already ended */ }
        const source = audioContext.createBufferSource(), gain = audioContext.createGain();
        source.buffer = buffer; gain.gain.value = 1.15; source.connect(gain); gain.connect(sfxBus || audioContext.destination);
        source.onended = () => { source.disconnect(); gain.disconnect(); if (voiceSource === source) voiceSource = null; };
        source.start(); voiceSource = source;
        for (let i = 0; i < 4; i++) setTimeout(() => playToneSweep(900 + Math.random() * 1600, 400 + Math.random() * 2000, .04, 'square', .014), i * 40);
        return;
      } catch { /* fall through to speech */ }
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || !text) return;
    try {
      speechSynthesis.cancel();
      // Staccato word-by-word delivery, the lowest pitch and a novelty robot voice where the OS has one.
      const words = text.replace(/[!.,]/g, '').trim().split(/\s+/);
      const voice = new SpeechSynthesisUtterance(words.join('. '));
      const voices = speechSynthesis.getVoices(), own = voices.filter(v => (de ? /^de/i : /^en/i).test(v.lang));
      voice.lang = de ? 'de-DE' : 'en-US';
      voice.voice = own.find(v => /zarvox|trinoids|ralph|robot/i.test(v.name)) || own.find(v => /fred|albert|male|daniel|david|markus|yannick|stefan/i.test(v.name)) || own[0] || null;
      voice.pitch = 0; voice.rate = .72; voice.volume = 1;
      speechSynthesis.speak(voice);
      playRobotCarrier(words.length * .42 + .3);
    } catch { /* Speech is a bonus. */ }
  }
  // Vocoder-style bed under the speech: a ring-modulated buzz gated like syllables, plus data chirps.
  function playRobotCarrier(duration) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime + .05;
      const carrier = audioContext.createOscillator(), mod = audioContext.createOscillator(), ring = audioContext.createGain(), out = audioContext.createGain(), filter = audioContext.createBiquadFilter();
      carrier.type = 'square'; carrier.frequency.value = 82; mod.type = 'sine'; mod.frequency.value = 31;
      ring.gain.value = 0; mod.connect(ring.gain); carrier.connect(ring); ring.connect(filter); filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 1.4; filter.connect(out); out.connect(sfxBus);
      out.gain.setValueAtTime(0, now);
      for (let t = 0; t < duration; t += .14) { out.gain.setValueAtTime(.05, now + t); out.gain.setValueAtTime(.012, now + t + .09); }
      out.gain.setValueAtTime(0, now + duration);
      carrier.start(now); mod.start(now); carrier.stop(now + duration + .05); mod.stop(now + duration + .05);
      carrier.onended = () => { carrier.disconnect(); mod.disconnect(); ring.disconnect(); filter.disconnect(); out.disconnect(); };
      for (let i = 0; i < 6; i++) setTimeout(() => playToneSweep(600 + Math.random() * 1800, 300 + Math.random() * 2400, .05, 'square', .018), i * 45);
    } catch { /* optional */ }
  }
  function primeSpeech() {
    // iOS only allows speech after it was started inside a user gesture once.
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || speechPrimed) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); speechPrimed = true; } catch { /* ignore */ }
  }
  function playFanfare() {
    if (!audioContext || muted) return;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playToneSweep(f, f * 1.01, i > 4 ? .5 : .18, 'square', .045), i * 130));
  }
  // Jet engine: looping filtered noise plus a turbine whine, swelled for boosts and ramp jumps.
  function setupJet() {
    const length = audioContext.sampleRate * 2, buffer = audioContext.createBuffer(1, length, audioContext.sampleRate), data = buffer.getChannelData(0);
    let brown = 0; for (let i = 0; i < length; i++) { const white = Math.random() * 2 - 1; brown = (brown + .02 * white) / 1.02; data[i] = white * .6 + brown * 3; }
    jetSource = audioContext.createBufferSource(); jetSource.buffer = buffer; jetSource.loop = true;
    jetFilter = audioContext.createBiquadFilter(); jetFilter.type = 'bandpass'; jetFilter.frequency.value = 700; jetFilter.Q.value = .6;
    jetGain = audioContext.createGain(); jetGain.gain.value = 0;
    jetSource.connect(jetFilter); jetFilter.connect(jetGain); jetGain.connect(sfxBus); jetSource.start();
    jetWhine = audioContext.createOscillator(); jetWhine.type = 'sawtooth'; jetWhine.frequency.value = 900;
    const whineFilter = audioContext.createBiquadFilter(); whineFilter.type = 'highpass'; whineFilter.frequency.value = 600;
    jetWhineGain = audioContext.createGain(); jetWhineGain.gain.value = 0;
    jetWhine.connect(whineFilter); whineFilter.connect(jetWhineGain); jetWhineGain.connect(sfxBus); jetWhine.start();
  }
  function playJetBlast(power = 1) {
    buzz([30, 30, Math.round(60 * power)]);
    // Ignition: a roaring whoosh that tears upward, a deep rumble and a screaming turbine.
    const v = power * .38;
    playNoiseBurst(1.1 * power, .32 * v, 300, 6500);
    playNoiseBurst(1.4 * power, .22 * v, 5200, 140);
    playToneSweep(48, 160, .9 * power, 'sawtooth', .16 * v);
    playToneSweep(700, 3200, .8 * power, 'sawtooth', .03 * v);
  }
