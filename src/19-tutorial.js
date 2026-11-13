  // ==== First-run tutorial.
  // ---- First-run tutorial: short prompts during the first race that advance when you do the thing.
  const touchUI = () => !!window.matchMedia?.('(pointer: coarse)').matches;
  const TUTORIAL = [
    { id: 'steer', text: () => touchUI() ? (settings.steering === 'gyro' ? 'TILT YOUR DEVICE TO STEER' : 'DRAG LEFT / RIGHT ON THE TRACK TO STEER') : 'STEER WITH  A / D  OR  ◀ ▶', done: t => t.steered > .8 },
    { id: 'boost', text: () => touchUI() ? 'SLIDE UP (OR TAP ϟ) TO BOOST' : 'HOLD  SPACE  TO BOOST', done: t => t.boosted > .5 },
    { id: 'laser', text: () => touchUI() ? 'TAP THE TRACK (OR ◎) TO FIRE YOUR LASER' : 'PRESS  X  TO FIRE YOUR LASER', done: t => t.fired },
    { id: 'pads', text: () => 'CYAN PADS RECHARGE BOOST, SHIELD AND LASER', done: t => t.pad || t.stepTime > 7 },
    { id: 'extras', text: () => 'GRAB POWER-UP BOXES  ·  FLY THROUGH ✦ STAR GATES FOR HYPERDRIVE', done: t => t.stepTime > 7 },
    { id: 'goal', text: () => 'FINISH TOP 3 TO UNLOCK THE NEXT CIRCUIT  ·  WIN TO FACE THE INVASION!', done: t => t.stepTime > 6 },
  ];
  let tutorial = null;
  function startTutorial() {
    tutorial = { step: 0, stepTime: 0, steered: 0, boosted: 0, fired: false, pad: false };
    $('tutorial').classList.add('visible'); document.body.classList.add('tutoring'); renderTutorial();
  }
  function endTutorial(skipped) {
    tutorial = null; $('tutorial').classList.remove('visible'); document.body.classList.remove('tutoring'); profile.tutorialDone = true; saveProfile();
    if (!skipped) { showMessage("YOU'RE READY, PILOT!", 1.4); playToneSweep(500, 1500, .3, 'triangle', .05); }
  }
  function renderTutorial() {
    if (!tutorial) return;
    const s = TUTORIAL[tutorial.step];
    $('tutorial-step').textContent = `TUTORIAL ${tutorial.step + 1}/${TUTORIAL.length}`; $('tutorial-text').textContent = s.text();
  }
  function updateTutorial(dt, steer) {
    if (!tutorial || mode !== 'racing') return;
    tutorial.stepTime += dt; if (Math.abs(steer) > .3) tutorial.steered += dt; if (boosting) tutorial.boosted += dt;
    if (TUTORIAL[tutorial.step].done(tutorial)) {
      tutorial.step++; tutorial.stepTime = 0; playToneSweep(900, 1400, .12, 'square', .03);
      if (tutorial.step >= TUTORIAL.length) endTutorial(false); else renderTutorial();
    }
  }
