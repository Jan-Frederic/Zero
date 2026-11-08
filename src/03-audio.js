  function setupAudio() {
    if (audioContext) { audioContext.resume().catch(() => {}); return; }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser(); analyser.fftSize = 128;
      musicGain = audioContext.createGain(); musicGain.gain.value = .92;
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
  // ---- Soundtrack preloading: the whole MP3 is downloaded into memory as soon as the page opens and played
  // from a local blob, so playback can never run dry mid-race. Races wait (briefly) until it is ready.
  const SOUNDTRACK_URL = (audio.getAttribute && audio.getAttribute('src')) || audio.src;
  let soundtrackReady = false, soundtrackProgress = 0, soundtrackPromise = null, musicWanted = false;
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='; // 0.1 s of silence

  function preloadSoundtrack() {
    if (soundtrackPromise) return soundtrackPromise;
    if (typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL || typeof Blob === 'undefined') {
      soundtrackReady = true; audio.preload = 'auto'; return (soundtrackPromise = Promise.resolve());
    }
    soundtrackPromise = (async () => {
      updateMusic();
      try {
        const response = await fetch(SOUNDTRACK_URL);
        if (!response.ok) throw new Error(String(response.status));
        const total = Number(response.headers.get('content-length')) || 0;
        let blob;
        if (response.body && response.body.getReader && total) {
          const reader = response.body.getReader(), chunks = []; let received = 0;
          for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); received += value.length; soundtrackProgress = Math.min(.99, received / total); updateMusic(); }
          blob = new Blob(chunks, { type: 'audio/mpeg' });
        } else blob = await response.blob();
        const resume = !audio.paused && !String(audio.src || '').startsWith('data:'), at = String(audio.src || '').startsWith('data:') ? 0 : audio.currentTime || 0;
        audio.src = URL.createObjectURL(blob); audio.preload = 'auto'; audio.load();
        await new Promise(done => { audio.addEventListener('canplaythrough', done, { once: true }); audio.addEventListener('error', done, { once: true }); setTimeout(done, 4000); });
        if (at) try { audio.currentTime = at; } catch { /* keep the start */ }
        if (resume || musicWanted) audio.play().catch(() => {});
      } catch {
        // Offline without a cached copy or a failed download: fall back to normal streaming.
        audio.src = SOUNDTRACK_URL; audio.preload = 'auto'; try { audio.load(); } catch { /* ignore */ }
        if (musicWanted) audio.play().catch(() => {});
      }
      soundtrackReady = true; soundtrackProgress = 1; updateMusic();
    })();
    return soundtrackPromise;
  }
  function playMusic() {
    setupAudio(); audio.volume = .24; musicWanted = true;
    if (!soundtrackReady) {
      // Unlock the audio element inside the user's tap (needed on iOS), but don't stream it twice:
      // it starts for real as soon as the preloaded copy is ready.
      if (!String(audio.src || '').startsWith('blob:')) audio.src = SILENCE;
      const unlock = audio.play(); if (unlock && unlock.then) unlock.then(() => { if (!soundtrackReady) audio.pause(); }).catch(() => {});
      updateMusic(); return;
    }
    audio.play().then(updateMusic).catch(() => { $('music-status').textContent = 'SOUNDTRACK / TAP TO PLAY'; });
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
  const UFO_COLORS = ['#a7ff4f', '#54f8ff', '#ff73dc', '#fff16b'];
  function makeUfo(slot, seed, spawnedAt) {
    return { slot, seed, distance: 0, lane: 0, dropCooldown: .8 + slot * 1.25 + (spawnedAt > 0 ? 1.6 : 0), color: UFO_COLORS[seed % 4], spawnedAt, screen: null };
  }
  // Robot announcer: Web Speech with a low, flat pitch. Silently skipped where unsupported.
  // Voice clips are downloaded right away (no audio context needed) and decoded once audio is unlocked.
  const voiceData = new Map();
  let voicesLoaded = 0;
  function prefetchVoices() {
    if (typeof fetch !== 'function') { voicesLoaded = VOICE_CLIPS.length; return; }
    for (const clip of VOICE_CLIPS) fetch(`voice/${clip}.mp3`).then(r => r.ok ? r.arrayBuffer() : null)
      .then(data => { if (data) voiceData.set(clip, data); }).catch(() => {}).finally(() => { voicesLoaded++; });
  }
  function loadVoices() {
    if (!audioContext || loadVoices.started || typeof fetch !== 'function') return;
    loadVoices.started = true;
    for (const clip of VOICE_CLIPS) (voiceData.has(clip) ? Promise.resolve(voiceData.get(clip).slice(0)) : fetch(`voice/${clip}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()))
      .then(data => new Promise((ok, fail) => audioContext.decodeAudioData(data, ok, fail))).then(buffer => voiceBuffers.set(clip, buffer)).catch(() => {});
  }
  // Retro robot announcer: plays the pre-rendered clip; falls back to the system voice if it is not loaded.
  function robotSay(text, clip) {
    if (muted) return;
    const buffer = clip && voiceBuffers.get(clip);
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
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      // Staccato word-by-word delivery, the lowest pitch and a novelty robot voice where the OS has one.
      const words = text.replace(/[!.,]/g, '').trim().split(/\s+/);
      const voice = new SpeechSynthesisUtterance(words.join('. '));
      const voices = speechSynthesis.getVoices(), english = voices.filter(v => /^en/i.test(v.lang));
      voice.voice = english.find(v => /zarvox|trinoids|ralph|robot/i.test(v.name)) || english.find(v => /fred|albert|male|daniel|david/i.test(v.name)) || english[0] || null;
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
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || primeSpeech.done) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); primeSpeech.done = true; } catch { /* ignore */ }
  }
