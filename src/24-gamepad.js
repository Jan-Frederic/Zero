  // ==== Gamepad polling.
  // ---- Gamepad (standard mapping): stick/D-pad steer, A/RT accelerate, B/LT brake, X/RB laser, Y/LB boost,
  // START pause; in menus A starts / races again / resumes. Buttons are fed in as virtual keys.
  const PAD_KEYS = { ArrowUp: [0, 7], ArrowDown: [1, 6], KeyX: [2, 5], Space: [3, 4] };
  let padHeld = new Set(), padSteer = 0, padPrev = {}, padSeen = false;
  function pollGamepad() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const pad = pads[0];
    if (!pad) { if (padHeld.size) { padHeld.forEach(k => keys.delete(k)); padHeld.clear(); } padSteer = 0; return; }
    if (!padSeen) { padSeen = true; document.body.classList.add('gamepad'); showMessage('🎮 GAMEPAD CONNECTED', 1.4); }
    const pressed = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > .4));
    const edge = i => { const now = pressed(i), was = padPrev[i]; padPrev[i] = now; return now && !was; };
    const stick = pad.axes[0] || 0;
    padSteer = Math.abs(stick) > .18 ? clamp((stick - Math.sign(stick) * .18) / .7, -1, 1) : pressed(15) ? 1 : pressed(14) ? -1 : 0;
    for (const [code, buttons] of Object.entries(PAD_KEYS)) {
      const on = buttons.some(pressed) && (mode === 'racing' || mode === 'countdown' || mode === 'final' || mode === 'respawning');
      if (on && !padHeld.has(code)) { padHeld.add(code); keys.add(code); } else if (!on && padHeld.has(code)) { padHeld.delete(code); keys.delete(code); }
    }
    const a = edge(0), start = edge(9);
    if (start && ['racing', 'countdown', 'paused'].includes(mode)) pauseRace();
    if (a && !document.body.classList.contains('dialog-open')) {
      if (mode === 'menu') startRace(); else if (mode === 'paused') pauseRace();
      else if (mode === 'finished' || (finale && finale.resultsShown)) raceAgain();
    } else if (a && !$('health-screen').classList.contains('hidden')) $('health-accept').click();
  }
