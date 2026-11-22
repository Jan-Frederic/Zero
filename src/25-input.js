  // ==== Keyboard, buttons and touch gestures.
  const keys = new Set();
  // Touch gestures: a floating stick anywhere on the track. Drag sideways to steer, slide up to boost,
  // slide down to brake, tap (or touch with a second finger) to fire. Holding a finger accelerates.
  const gesture = { id: null, originX: 0, originY: 0, x: 0, y: 0, startTime: 0, moved: false, steer: 0, accel: false, brake: false, boost: false, fire: false, fireQueued: false, extra: new Set() };
  let hintTime = 0;
  const STICK = 64, DEADZONE = 7, VERTICAL = 42;
  function resetGesture() { gesture.id = null; gesture.steer = 0; gesture.accel = gesture.brake = gesture.boost = gesture.fire = gesture.fireQueued = false; gesture.extra.clear(); }
  $('start').addEventListener('click', startRace); $('again').addEventListener('click', raceAgain);
  $('pause').addEventListener('click', pauseRace); $('resume').addEventListener('click', pauseRace);
  $('quit').addEventListener('click', garage); $('garage').addEventListener('click', garage);
  $('prev-track').addEventListener('click', () => selectTrack(-1)); $('next-track').addEventListener('click', () => selectTrack(1));
  document.querySelectorAll('[data-ship]').forEach(button => button.addEventListener('click', () => selectShip(Number(button.dataset.ship))));
  renderShips(); window.morbidShips = { select: selectShip };
  $('music-toggle').addEventListener('click', toggleMusic);
  $('sound').addEventListener('click', toggleMute);
  audio.addEventListener('play', updateMusic); audio.addEventListener('pause', updateMusic);
  audio.addEventListener('error', () => { $('music-status').textContent = 'SOUNDTRACK / FILE UNAVAILABLE'; });
  $('fullscreen').addEventListener('click', async () => {
    try { if (fullscreenElement()) await exitFullscreen(); else await enterFullscreen(); } catch { /* Fullscreen may be unavailable in embedded browsers. */ }
  });
  // No fullscreen API (iPhone Safari) or already running as an installed app: the button would do nothing.
  if (!fullscreenAvailable() || (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || /** @type {any} */ (navigator).standalone) $('fullscreen').classList.add('hidden');
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code) && event.target.tagName !== 'BUTTON') event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'Enter' && !['BUTTON', 'A'].includes(event.target.tagName) && !document.body.classList.contains('dialog-open')) { if (mode === 'menu') startRace(); else if (mode === 'finished' || (finale && finale.resultsShown)) raceAgain(); else if (mode === 'paused') pauseRace(); }
      if (event.code === 'Escape' || event.code === 'KeyP') pauseRace();
      if (event.code === 'KeyM') toggleMute();
    }
    if (mode === 'racing' || mode === 'countdown' || mode === 'final' || mode === 'maze') {
      if (event.code === 'Space') { event.preventDefault(); if (event.target.tagName === 'BUTTON') event.target.blur(); }
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); resetGesture(); if (mode === 'racing' || mode === 'countdown' || mode === 'maze') pauseRace(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (mode === 'racing' || mode === 'countdown' || mode === 'maze')) pauseRace(); else if (!document.hidden) wakeAudio(); });
  // iOS suspends ("interrupts") the audio context for calls, Siri or app switches; the next touch brings the sound back.
  window.addEventListener('pointerdown', wakeAudio, { capture: true, passive: true });
  window.addEventListener('keydown', wakeAudio, { capture: true, passive: true });
  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(/** @type {PointerEvent} */ (event).pointerId); keys.add(button.dataset.key); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
  });
  const gestureActive = () => mode === 'racing' || mode === 'countdown' || mode === 'final' || mode === 'maze';
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
