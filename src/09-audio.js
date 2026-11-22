  // ==== Audio graph, soundtrack preloading, sound effects, robot voice, jets.
  let jetSource, jetFilter, jetGain, jetWhine, jetWhineGain;
  // Each kill call has a pre-rendered retro robot clip in voice/ (made by tools/make-voice.sh).
  const KILL_CALLS = [['ALIEN KILLER!', 'alien-killer'], ['FATALITY!', 'fatality'], ['UFO OBLITERATED!', 'ufo-obliterated'], ['ABDUCT THIS!', 'abduct-this'],
    ['INVASION CANCELLED!', 'invasion-cancelled'], ['CLOSE ENCOUNTER OF THE FATAL KIND!', 'close-encounter'], ['SAUCER SMASHED!', 'saucer-smashed'],
    ['GREEN MEN DOWN!', 'green-men-down'], ['PROBE DENIED!', 'probe-denied'], ['AREA 51 SAYS THANK YOU!', 'area-51'], ['TOASTED SAUCER!', 'toasted-saucer'],
    ['MOTHERSHIP WILL HEAR ABOUT THIS!', 'mothership'], ['ULTRA KILL!', 'ultra-kill'], ['GALACTIC HUMILIATION!', 'galactic-humiliation'],
    ['NO PARKING IN MY SKY!', 'no-parking'], ['RETURN TO SENDER!', 'return-to-sender']];
  const VOICE_CLIPS = [...KILL_CALLS.map(call => call[1]), 'hyperdrive-initiated', 'first-place', 'mothership-warning', 'mothership-down', 'invasion-incoming', 'congratulations', 'next-boss', 'scream-overlord', 'scream-cyclops', 'scream-maggot', 'scream-robot', 'black-hole', 'time-tunnel', 'pink-hi', 'pink-bye', 'dj-mofo', ...NEMESES.flatMap(n => [`taunt-${n.id}`, `down-${n.id}`])];
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
    'black-hole': 'Uiuiui! Krasses Schwarzes Loch. Terminator-Katzen greifen an!!!', 'time-tunnel': 'Zeitsprung! Alle Gegner sind jetzt Früchte!', 'pink-hi': 'Na, auch hier?', 'pink-bye': 'Tschüsselchen!', 'dj-mofo': 'Ey yo! DJ MoFo ist am Start! Party!',
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
  // ---- Sound desk: separate levels for music, effects, explosions, engines/jets and the announcer (0-150 %).
  let boomBus, engineBus, voiceBus, busOverride = null;
  // Defaults until the player moves a slider: the music loud, everything else at 60 %.
  const VOLUME_DEFAULTS = { music: 1.5, fx: .6, boom: .6, engine: .6, voice: .6 };
  const vol = key => clamp(settings.vol && settings.vol[key] !== undefined ? Number(settings.vol[key]) : (VOLUME_DEFAULTS[key] ?? 1), 0, 1.5);
  const fxOut = () => busOverride || sfxBus || audioContext.destination;
  function withBus(bus, fn) { const before = busOverride; busOverride = bus || null; try { fn(); } finally { busOverride = before; } }
  function applyVolumes() {
    if (!audioContext || !musicGain) { audio.volume = Math.min(1, .24 * vol('music')); return; }
    const t = audioContext.currentTime;
    musicGain.gain.setTargetAtTime(.92 * .24 * vol('music'), t, .02); sfxBus.gain.setTargetAtTime(1.55 * vol('fx'), t, .02);
    boomBus.gain.setTargetAtTime(1.55 * vol('boom'), t, .02); engineBus.gain.setTargetAtTime(1.55 * vol('engine'), t, .02); voiceBus.gain.setTargetAtTime(1.55 * vol('voice'), t, .02);
  }
  function setupAudio() {
    audioSessionPlayback();
    if (audioContext) { wakeAudio(); return; }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser(); analyser.fftSize = 128;
      musicGain = audioContext.createGain(); audio.volume = 1;
      sfxBus = audioContext.createGain(); boomBus = audioContext.createGain(); engineBus = audioContext.createGain(); voiceBus = audioContext.createGain();
      for (const bus of [boomBus, engineBus, voiceBus]) bus.connect(audioContext.destination);
      applyVolumes();
      musicSource = audioContext.createMediaElementSource(audio); musicSource.connect(analyser); analyser.connect(musicGain); musicGain.connect(audioContext.destination);
      sfxBus.connect(audioContext.destination);
      frequency = new Uint8Array(analyser.frequencyBinCount);
      engineOsc = audioContext.createOscillator(); engineOsc.type = 'sawtooth';
      const filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220;
      engineGain = audioContext.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(engineBus); engineOsc.start();
      setupJet(); loadVoices();
    } catch { /* The soundtrack still plays if Web Audio is unavailable. */ }
  }
  // ---- Soundtrack: the songs of Morbid Fingers, shuffled for the whole game without repeats (every song once, then a
  // new order). When a song ends, an old radio hunts for the station of the next one. The current song is downloaded
  // into memory before the start button opens, so playback never runs dry mid-race; the next one downloads meanwhile.
  // WebM/Opus copies are ~40 % smaller; browsers that cannot play them get the MP3s.
  // Apple's WebKit gets the MP3s: its WebM/Opus support differs between iOS versions, especially in decodeAudioData.
  /** @type {{ id: string, title: string, file: string, blob?: string|null, received?: number, total?: number, mp3Only?: boolean }[]} */
  const SONGS = [
    { id: 'redemption', title: 'Redemption', file: 'Morbid_Fingers%20-%20live-%20Emmerich_Juli_2003%20-%2003%20Redemption' },
    { id: 'brainwash', title: 'Brain Wash', file: 'Morbid_Fingers%20-%20Brain_Wash_8-Bit_Edition' },
    { id: 'virusgirl', title: 'Virus Girl', file: 'Morbid_Fingers%20-%20Virus_Girl_8-Bit_Edition' },
    { id: '100bitch', title: '100 Bitch', file: 'Morbid_Fingers%20-%20100_Bitch_8-Bit_Edition' },
    { id: 'crystal', title: 'Crystal Clear Reflection Make Up', file: 'Morbid_Fingers%20-%20Crystal_Clear_Reflection_Make_Up_8-Bit_Edition' },
    { id: 'dirtytripper', title: 'Dirty Tripper', file: 'Morbid_Fingers%20-%20Dirty_Tripper_8-Bit_Edition' },
    { id: 'enough', title: 'Enough', file: 'Morbid_Fingers%20-%20Enough_8-Bit_Edition' },
    { id: 'imissyou', title: 'I Miss You', file: 'Morbid_Fingers%20-%20I_Miss_You_8-Bit_Edition' },
    { id: 'manabove', title: 'Man Above His Own Planet', file: 'Morbid_Fingers%20-%20Man_Above_His_Own_Planet_8-Bit_Edition' },
    { id: 'pornoshopbob', title: 'Porno Shop Bob', file: 'Morbid_Fingers%20-%20Porno_Shop_Bob_8-Bit_Edition' },
    { id: 'savior', title: 'Savior', file: 'Morbid_Fingers%20-%20Savior_8-Bit_Edition' },
    { id: 'skeletons', title: 'Skeletons', file: 'Morbid_Fingers%20-%20Skeletons_8-Bit_Edition' },
  ];
  const AUDIO_EXT = (() => { try { return !appleWebKit && audio.canPlayType && audio.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'mp3'; } catch { return 'mp3'; } })();
  const songUrl = (song, ext = AUDIO_EXT) => `${song.file}.${ext}`;
  const songSrc = i => { const song = SONGS[i]; return song.mp3Only ? songUrl(song, 'mp3') : song.blob || songUrl(song); };
  // Playlist: shuffled rounds of all songs, appended as needed, so "previous" can walk back through what was played.
  function shuffleSongs(avoid) {
    const order = SONGS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order.length > 1 && order[0] === avoid) [order[0], order[1]] = [order[1], order[0]];
    return order;
  }
  const playlist = shuffleSongs(-1);
  let playlistPos = 0, songIndex = playlist[0], tuning = null;
  function upcomingSong() { if (playlistPos + 1 >= playlist.length) playlist.push(...shuffleSongs(playlist[playlist.length - 1])); return playlist[playlistPos + 1]; }
  let soundtrackReady = false, soundtrackProgress = 0, soundtrackPromise = null, musicWanted = false, musicBlocked = false;
  // Plays the soundtrack; if the browser refuses (Safari outside a tap), the next tap starts it (see wakeAudio).
  function tryPlay() {
    const p = audio.play();
    if (p && p.then) return p.then(() => { musicBlocked = false; updateMusic(); }, () => { musicBlocked = true; updateMusic(); });
    return Promise.resolve();
  }
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='; // 0.1 s of silence
  const playingSilence = () => String(audio.src || '').startsWith('data:');
  async function downloadSong(song, onProgress) {
    const response = await fetch(songUrl(song));
    if (!response.ok) throw new Error(String(response.status));
    const total = Number(response.headers.get('content-length')) || 0;
    song.total = total || song.total; song.received = 0;
    let blob;
    if (response.body && response.body.getReader && total) {
      const reader = response.body.getReader(), chunks = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); song.received += value.length; if (onProgress) onProgress(); }
      blob = new Blob(chunks, { type: AUDIO_EXT === 'webm' ? 'audio/webm' : 'audio/mpeg' });
    } else blob = await response.blob();
    song.received = song.total = song.total || blob.size || 1;
    song.blob = URL.createObjectURL(blob);
  }
  const songDownloads = new Map();
  function fetchSongBlob(i, onProgress) {
    const song = SONGS[i];
    if (!song || song.blob || typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) return Promise.resolve();
    if (!songDownloads.has(i)) songDownloads.set(i, downloadSong(song, onProgress).catch(() => { song.blob = null; }).finally(() => songDownloads.delete(i)));
    return songDownloads.get(i);
  }
  // Only the current and the next song stay in memory; the next one downloads in the background.
  function prefetchUpcoming() {
    const next = upcomingSong();
    SONGS.forEach((song, i) => { if (song.blob && i !== songIndex && i !== next && !String(audio.src).startsWith(song.blob)) { URL.revokeObjectURL(song.blob); song.blob = null; } });
    if (soundtrackReady) fetchSongBlob(next);
  }
  function preloadSoundtrack() {
    if (soundtrackPromise) return soundtrackPromise;
    if (typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL || typeof Blob === 'undefined') {
      soundtrackReady = true; audio.preload = 'auto'; renderSongTitle(); return (soundtrackPromise = Promise.resolve());
    }
    soundtrackPromise = (async () => {
      renderSongTitle(); updateMusic();
      const first = songIndex, song = SONGS[first];
      // A failed download (offline without a cached copy) falls back to streaming that song.
      await fetchSongBlob(first, () => { soundtrackProgress = song.total ? Math.min(.99, song.received / song.total) : 0; updateMusic(); });
      if (songIndex === first) {
        // Move the current song over to its local copy, keeping its position if it is already playing.
        const resume = !audio.paused && !playingSilence(), at = playingSilence() ? 0 : audio.currentTime || 0;
        audio.src = songSrc(songIndex); audio.preload = 'auto'; try { audio.load(); } catch { /* ignore */ }
        if (at) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = at; } catch { /* keep the start */ } }, { once: true });
        if (resume || musicWanted) tryPlay();
      }
      soundtrackReady = true; soundtrackProgress = 1; updateMusic();
      prefetchUpcoming();
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
  // A song ended: tune the radio to the next one.
  audio.addEventListener('ended', () => { if (musicWanted) nextSong(false); });
  function renderSongTitle() {
    const title = tuning ? '— 📻 ~ ~ ~' : `— ${SONGS[songIndex].title}`;
    if ($('song-title')) $('song-title').textContent = title;
    if ($('pp-title')) $('pp-title').textContent = tuning ? '📻 ~ ~ ~' : SONGS[songIndex].title;
    if (typeof renderJukebox === 'function') renderJukebox();
  }
  // Switches the audio element to song i (from its start).
  function selectSong(i) {
    if (!SONGS[i]) return;
    songIndex = i; renderSongTitle();
    if (!playingSilence() || soundtrackReady) { audio.src = songSrc(i); try { audio.load(); } catch { /* ignore */ } }
  }
  function changeSong(i) {
    cancelTuning(); selectSong(i); prefetchUpcoming();
    if (dj && dj.shown) dj.record = { at: time, song: i }; // DJ MoFo puts the record on
    if (musicWanted && !muted) tryPlay(); else updateMusic();
  }
  // Between songs: the radio crackles, whistles and catches snippets of other stations before it locks on.
  function tuneTo(i, seconds) {
    cancelTuning(); audio.pause();
    if (!audioContext || muted || !musicWanted || !analyser) { changeSong(i); return; }
    tuning = { song: i, stop: playRadioTuning(seconds), timer: setTimeout(() => { tuning = null; changeSong(i); }, seconds * 1000) };
    renderSongTitle(); updateMusic();
  }
  function cancelTuning() {
    if (!tuning) return;
    clearTimeout(tuning.timer); try { tuning.stop(); } catch { /* already over */ }
    tuning = null; renderSongTitle();
  }
  function nextSong(quick = true) { upcomingSong(); playlistPos++; tuneTo(playlist[playlistPos], quick ? 1.1 : 2.8); }
  function prevSong() {
    if (playlistPos === 0 || (!tuning && audio.currentTime > 4)) { changeSong(songIndex); return; }
    playlistPos--; tuneTo(playlist[playlistPos], 1.1);
  }
  // A song picked by hand (pause menu, DJ MoFo's jukebox) plays right away; the shuffle carries on after it.
  function playSongNow(i) {
    if (!SONGS[i]) return;
    playlist.splice(playlistPos + 1, 0, i); playlistPos++;
    musicWanted = true; setupAudio(); changeSong(i);
  }
  function toggleMusic() {
    if (tuning) { cancelTuning(); musicWanted = false; audio.pause(); updateMusic(); return; }
    if (audio.paused) { if (muted) toggleMute(); playMusic(); } else { audio.pause(); musicWanted = false; musicBlocked = false; updateMusic(); }
  }
  function playRadioTuning(seconds) {
    const c = audioContext, now = c.currentTime, end = now + seconds, nodes = [];
    const out = c.createGain(); out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(1, now + .06); out.gain.setValueAtTime(1, end - .2); out.gain.linearRampToValueAtTime(0, end);
    out.connect(analyser);
    const track = n => { nodes.push(n); return n; };
    // Static, swept through a narrow band like a tuning dial, with fluttering reception.
    const length = c.sampleRate, buffer = c.createBuffer(1, length, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = track(c.createBufferSource()); noise.buffer = buffer; noise.loop = true;
    const band = c.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 3;
    const flutter = c.createGain();
    for (let t = 0; t < seconds; t += .11) { band.frequency.linearRampToValueAtTime(400 + Math.random() * 3600, now + t); flutter.gain.setValueAtTime(.25 + Math.random() * .75, now + t); }
    noise.connect(band); band.connect(flutter); flutter.connect(out); noise.start(now); noise.stop(end);
    // Heterodyne whistles gliding up and down as the dial passes the carriers.
    const whistle = track(c.createOscillator()), wg = c.createGain(); whistle.type = 'sine'; wg.gain.value = .12;
    for (let t = 0; t < seconds; t += .35) whistle.frequency.linearRampToValueAtTime(500 + Math.random() * 2600, now + t);
    whistle.connect(wg); wg.connect(out); whistle.start(now); whistle.stop(end);
    // Snippets of other stations: a bright trumpet fanfare and a far-away voice, each only for a moment.
    const snippet = (at, notes, type, gainValue, formant) => {
      const o = track(c.createOscillator()), g = c.createGain(), f = c.createBiquadFilter(); o.type = type; f.type = 'bandpass'; f.frequency.value = formant; f.Q.value = 1.5;
      notes.forEach((n, k) => o.frequency.setValueAtTime(n, now + at + k * .09));
      g.gain.setValueAtTime(0, now + at); g.gain.linearRampToValueAtTime(gainValue, now + at + .03); g.gain.setValueAtTime(gainValue, now + at + notes.length * .09); g.gain.linearRampToValueAtTime(0, now + at + notes.length * .09 + .05);
      o.connect(f); f.connect(g); g.connect(out); o.start(now + at); o.stop(now + at + notes.length * .09 + .1);
    };
    snippet(seconds * (.2 + Math.random() * .15), [784, 988, 1175, 988, 1175, 1568], 'sawtooth', .22, 1400);
    snippet(seconds * (.5 + Math.random() * .15), [150, 170, 140, 185, 160, 150, 175], 'sawtooth', .3, 750);
    // Locked on: a short chirp as the next song comes in.
    const lock = track(c.createOscillator()), lg = c.createGain(); lock.type = 'sine';
    lock.frequency.setValueAtTime(1900, end - .25); lock.frequency.exponentialRampToValueAtTime(900, end - .05);
    lg.gain.setValueAtTime(0, end - .25); lg.gain.linearRampToValueAtTime(.15, end - .22); lg.gain.linearRampToValueAtTime(0, end - .05);
    lock.connect(lg); lg.connect(out); lock.start(end - .25); lock.stop(end);
    return () => { for (const n of nodes) try { n.stop(); } catch { /* done */ } setTimeout(() => out.disconnect(), 100); };
  }
  // Kept for the race start: the shuffle simply keeps playing (started inside the player's tap for Safari).
  function startRaceMusic() { playMusic(); }
  function playMusic() {
    // iOS ignores audio.volume, so with Web Audio the music level is set on its gain node instead (see setupAudio).
    setupAudio(); musicWanted = true; audio.volume = musicSource ? 1 : Math.min(1, .24 * vol('music'));
    if (tuning) return;
    if (!soundtrackReady) {
      // Unlock the audio element inside the user's tap (needed on iOS), but don't stream it twice:
      // it starts for real as soon as the preloaded copy is ready.
      if (!String(audio.src || '').startsWith('blob:')) audio.src = SILENCE;
      const unlock = audio.play(); if (unlock && unlock.then) unlock.then(() => { if (!soundtrackReady) audio.pause(); }).catch(() => {});
      updateMusic(); return;
    }
    if (playingSilence() || !audio.src || audio.ended) { audio.src = songSrc(songIndex); try { audio.load(); } catch { /* ignore */ } }
    tryPlay().then(() => { if (musicBlocked) $('music-status').textContent = 'SOUNDTRACK / TAP TO PLAY'; });
  }
  function updateMusic() {
    const playing = !audio.paused && !muted;
    document.body.classList.toggle('playing', playing);
    $('music-status').textContent = !soundtrackReady ? `SOUNDTRACK / LOADING ${Math.round(soundtrackProgress * 100)}%` : muted ? 'SOUNDTRACK / MUTED' : tuning ? 'RADIO / TUNING IN…' : playing ? 'NOW PLAYING / LOCAL SOUNDTRACK' : 'SOUNDTRACK / PRESS PLAY';
    const playButton = $('pp-play'); if (playButton) { playButton.textContent = playing || tuning ? '⏸' : '▶'; playButton.setAttribute('aria-label', playing || tuning ? 'Pause music' : 'Play music'); }
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
    osc.connect(gain); gain.connect(fxOut()); osc.start(); osc.stop(audioContext.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function playToneSweep(from, to, duration, type, volume) {
    if (!audioContext || muted) return;
    try {
      const now = audioContext.currentTime, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(fxOut()); oscillator.start(now); oscillator.stop(now + duration);
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
      source.connect(filter); filter.connect(gain); gain.connect(fxOut()); source.start(now); source.stop(now + duration);
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
    withBus(engineBus, () => { playToneSweep(95, 560, .3, 'sawtooth', .055 * power); playNoiseBurst(.24, .055 * power, 3400, 260); });
  }
  function playLaserSound() {
    playToneSweep(1750, 180, .13, 'square', .048);
    playToneSweep(510, 95, .17, 'sawtooth', .035);
  }
  function playImpactSound(power = 1) {
    buzz(Math.round(35 + 45 * Math.min(power, 1.5)));
    withBus(boomBus, () => { playToneSweep(118, 29, .4, 'sawtooth', .095 * power); playToneSweep(980, 165, .11, 'square', .045 * power); playNoiseBurst(.3, .12 * power, 2400, 115); });
  }
  function playExplosionSound(power = 1) {
    buzz(power >= 2 ? [120, 40, 90, 40, 260] : Math.round(60 + power * 60), .02);
    withBus(boomBus, () => { playToneSweep(148, 27, .56, 'sawtooth', .12 * power); playToneSweep(740, 82, .28, 'triangle', .045 * power); playNoiseBurst(.5, .16 * power, 2800, 72); });
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
        source.buffer = buffer; gain.gain.value = 1.15; source.connect(gain); gain.connect(voiceBus || sfxBus || audioContext.destination);
        source.onended = () => { source.disconnect(); gain.disconnect(); if (voiceSource === source) voiceSource = null; };
        source.start(); voiceSource = source;
        for (let i = 0; i < 4; i++) setTimeout(() => withBus(voiceBus, () => playToneSweep(900 + Math.random() * 1600, 400 + Math.random() * 2000, .04, 'square', .014)), i * 40);
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
      voice.pitch = 0; voice.rate = .72; voice.volume = Math.min(1, vol('voice'));
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
      ring.gain.value = 0; mod.connect(ring.gain); carrier.connect(ring); ring.connect(filter); filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 1.4; filter.connect(out); out.connect(voiceBus || sfxBus);
      out.gain.setValueAtTime(0, now);
      for (let t = 0; t < duration; t += .14) { out.gain.setValueAtTime(.05, now + t); out.gain.setValueAtTime(.012, now + t + .09); }
      out.gain.setValueAtTime(0, now + duration);
      carrier.start(now); mod.start(now); carrier.stop(now + duration + .05); mod.stop(now + duration + .05);
      carrier.onended = () => { carrier.disconnect(); mod.disconnect(); ring.disconnect(); filter.disconnect(); out.disconnect(); };
      for (let i = 0; i < 6; i++) setTimeout(() => withBus(voiceBus, () => playToneSweep(600 + Math.random() * 1800, 300 + Math.random() * 2400, .05, 'square', .018)), i * 45);
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
    jetSource.connect(jetFilter); jetFilter.connect(jetGain); jetGain.connect(engineBus); jetSource.start();
    jetWhine = audioContext.createOscillator(); jetWhine.type = 'sawtooth'; jetWhine.frequency.value = 900;
    const whineFilter = audioContext.createBiquadFilter(); whineFilter.type = 'highpass'; whineFilter.frequency.value = 600;
    jetWhineGain = audioContext.createGain(); jetWhineGain.gain.value = 0;
    jetWhine.connect(whineFilter); whineFilter.connect(jetWhineGain); jetWhineGain.connect(engineBus); jetWhine.start();
  }
  function playJetBlast(power = 1) {
    buzz([30, 30, Math.round(60 * power)]);
    // Ignition: a roaring whoosh that tears upward, a deep rumble and a screaming turbine.
    const v = power * .38;
    withBus(engineBus, () => {
      playNoiseBurst(1.1 * power, .32 * v, 300, 6500);
      playNoiseBurst(1.4 * power, .22 * v, 5200, 140);
      playToneSweep(48, 160, .9 * power, 'sawtooth', .16 * v);
      playToneSweep(700, 3200, .8 * power, 'sawtooth', .03 * v);
    });
  }
