  // ==== Gyro steering and screen orientation.
  const tilt = { x: 0, neutral: 0, live: false };
  function screenAngle() { return (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : Number(window.orientation) || 0) * Math.PI / 180; }
  // Roll angle of the device relative to the screen's horizontal axis, from the gravity direction in device coordinates.
  function onTilt(event) {
    if (event.beta == null || event.gamma == null) return;
    const b = event.beta * Math.PI / 180, g = event.gamma * Math.PI / 180, a = screenAngle();
    const dx = Math.sin(g) * Math.cos(b), dy = -Math.sin(b);
    tilt.x = Math.asin(clamp(dx * Math.cos(a) - dy * Math.sin(a), -1, 1)) * 180 / Math.PI; tilt.live = true;
  }
  // Touch steering stays available until the sensor actually delivers data.
  const gyroActive = () => settings.steering === 'gyro' && tilt.live;
  function calibrateTilt() { tilt.neutral = tilt.live ? tilt.x : 0; }
  const TILT_FULL = 20, TILT_DEAD = 2.5;
  function tiltSteer() {
    if (!tilt.live) return 0;
    const d = tilt.x - tilt.neutral;
    return Math.abs(d) < TILT_DEAD ? 0 : clamp((d - Math.sign(d) * TILT_DEAD) / (TILT_FULL - TILT_DEAD), -1, 1);
  }
  async function enableGyro() {
    if (!window.DeviceOrientationEvent) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') return false;
    } catch { return false; }
    if (!enableGyro.listening) { window.addEventListener('deviceorientation', onTilt); enableGyro.listening = true; }
    return true;
  }
  function currentOrientation() { return window.matchMedia?.('(orientation: landscape)')?.matches ? 'landscape' : 'portrait'; }
  // Lock the orientation where the browser allows it (Android, installed app); everywhere else ask the player to rotate.
  async function applyScreenSetting(fromGesture) {
    if (!window.matchMedia?.('(pointer: coarse)').matches || !screen.orientation?.lock) { checkOrientation(); return; }
    try {
      if (fromGesture && !document.fullscreenElement && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) await document.documentElement.requestFullscreen?.();
      await screen.orientation.lock(settings.screen);
    } catch { /* Not allowed here (e.g. iOS): the rotate prompt takes over. */ }
    checkOrientation();
  }
  function checkOrientation() {
    const overlay = $('rotate-overlay');
    const wrong = !!window.matchMedia?.('(pointer: coarse)').matches && currentOrientation() !== settings.screen;
    overlay.classList.toggle('hidden', !wrong);
    if (wrong) {
      $('rotate-title').textContent = `ROTATE TO ${settings.screen.toUpperCase()}`; $('rotate-setting').textContent = settings.screen.toUpperCase();
      $('rotate-other').textContent = settings.screen === 'portrait' ? 'LANDSCAPE' : 'PORTRAIT';
      if (mode === 'racing' || mode === 'countdown') pauseRace();
    }
  }
