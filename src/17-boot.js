  // ==== Playful boot panel on the start screen.
  // ---- Playful boot screen on the start page while the soundtrack and voices download.
  const BOOT_LINES = [
    'BOOTSTRAPPING THE SINGULARITY…', 'UPDATING THE SOLAR SYSTEM — DO NOT UNPLUG THE SUN…', 'RETICULATING HYPERSPACE SPLINES…',
    'CALIBRATING ANTI-GRAVITY. HOLD ON TO SOMETHING…', 'DEFRAGMENTING BLACK HOLES…', 'DOWNLOADING MORE RAM FOR THE MOTHERSHIP…',
    'FEEDING THE ALIEN OVERLORD…', 'POLISHING THE DISCO BALL…', 'TEACHING ROBOTS TO SCREAM…', 'TUNING MORBID FINGERS’ GUITAR AMPS…',
    'CONVINCING CATS TO CROSS THE TRACK…', 'REBOOTING THE BIG BANG (ATTEMPT 2 OF 3)…', 'WAXING THE MAGGOT QUEEN… EW.', 'COMPRESSING SPACETIME, ALMOST DONE…',
  ];
  let bootLine = -1, bootLineAt = -9, bootDoneAt = 0;
  const bootProgress = () => clamp(soundtrackProgress * .85 + voicesLoaded / VOICE_CLIPS.length * .15, 0, 1);
  // In portrait the boot panel sits under the start button; elsewhere it takes the middle of the bottom bar.
  function placeBoot() {
    const box = $('boot'), note = document.querySelector('.start-note'), bar = document.querySelector('.bottom-bar'), controls = document.querySelector('.bottom-bar .controls');
    if (!box || !note || !bar || !window.matchMedia) return;
    const portrait = matchMedia('(max-width:600px) and (orientation:portrait)').matches;
    if (portrait && box.previousElementSibling !== note) note.after(box);
    else if (!portrait && box.parentElement !== bar) bar.insertBefore(box, controls || null);
  }
  if (window.matchMedia) { placeBoot(); matchMedia('(max-width:600px) and (orientation:portrait)').addEventListener?.('change', placeBoot); }
  function updateBoot() {
    const box = $('boot'); if (!box) return;
    document.body.classList.toggle('booting', !box.classList.contains('gone'));
    const done = soundtrackReady && voicesLoaded >= VOICE_CLIPS.length, pct = done ? 100 : Math.min(99, Math.round(bootProgress() * 100));
    if (done) {
      if (!bootDoneAt) { bootDoneAt = time || .001; $('boot-text').textContent = 'SYSTEM READY · SINGULARITY STABLE · GO RACE!'; box.classList.add('done'); }
      if (time - bootDoneAt > 3.5) box.classList.add('gone');
    } else if (time - bootLineAt > 1.8) {
      bootLine = (bootLine + 1) % BOOT_LINES.length; bootLineAt = time; bootDoneAt = 0;
      $('boot-text').textContent = BOOT_LINES[bootLine]; box.classList.remove('done', 'gone');
    }
    $('boot-pct').textContent = pct + '%'; $('boot-fill').style.width = pct + '%';
  }
