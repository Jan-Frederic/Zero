const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

// Exercise the actual game loop with a deterministic clock and browser stand-ins.
function harness(opts = {}) {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get: (o, key) => o[key] || (String(key).startsWith('create') ? () => gradient : () => {}), set: (o, key, value) => (o[key] = value, true) });
  const elements = new Map();
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(['menu'].includes(id) ? [] : ['hidden']);
    const listeners = {};
    const el = {
      style: {}, dataset: {}, textContent: '', innerHTML: '', tagName: 'DIV', paused: true,
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle: (x, force) => (force ?? !classes.has(x)) ? classes.add(x) : classes.delete(x) },
      addEventListener: (event, fn) => (listeners[event] ||= []).push(fn),
      fire: (event, data = {}) => (listeners[event] || []).forEach(fn => fn({ target: el, preventDefault() {}, ...data })),
      setAttribute() {}, getContext: () => context, blur() {},
      play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; },
    };
    elements.set(id, el); return el;
  }
  const ships = [0, 1, 2].map(n => { const el = element(`ship${n}`); el.dataset.ship = String(n); return el; });
  const hapticButtons = ['on', 'off'].map(v => { const el = element(`haptics-${v}`); el.dataset.haptics = v; return el; });
  const windowEvents = {}, storage = new Map(opts.fresh ? [] : [['morbid-profile-v1', JSON.stringify({ unlocked: 8 })]]), vibrations = [];
  let frame, now = 0;
  const sandbox = {
    console, Math, Uint8Array, navigator: { vibrate: pattern => { vibrations.push(pattern); return true; } }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    document: { getElementById: element, querySelector: element, querySelectorAll: query => query === '[data-ship]' ? ships : query === '[data-haptics]' ? hapticButtons : [], body: element('body'), addEventListener() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: fn => { frame = fn; },
    addEventListener: (event, fn) => (windowEvents[event] ||= []).push(fn),
  };
  sandbox.window = sandbox;
  const source = fs.readFileSync('game.js', 'utf8').replace('  resize(); buildTrack(); requestAnimationFrame(frame);\n})();',
    '  resize(); buildTrack(); requestAnimationFrame(frame);\n  window.__testState = () => ({ tutorialStep: tutorial ? tutorial.step : -1,  weather: weather && weather.type, meteors: bombs.filter(b => b.meteor).length,  nemeses: rivals.filter(r => r.nemesis).map(r => ({ name: r.nemesis.name, hull: r.hull, alive: r.alive })),  power: Object.keys(power).filter(k => power[k] > time), bubbleHits, powerups: segments.filter(s => s.powerup).map(s => ({ index: s.index, lane: s.powerup.lane, type: s.powerup.type })), lives, raceInvulnUntil, speed,  racerCrashes: crashingUfos.filter(c => c.kind === \'racer\').length, blasts2: megaBlasts.length, ufoKills, boss: boss && { hp: boss.hp, lane: boss.lane, dying: !!boss.dying }, bossAttacks: bossAttacks.length, hyperTime, stargates: segments.filter(s => s.stargate).map(s => ({ index: s.index, lane: s.stargate.lane })), energy, ufoList: ufos.map(u => ({ lane: u.lane, slot: u.slot })), crashing: crashingUfos.length, blasts: megaBlasts.length, confetti: confetti.length, callout: callout && callout.text, dying: rivals.filter(r => r.dying).length, explosions: explosions.length, mode, playerX, distance, shield, lap, rank, time, jumpHeight, jumpBoostTimer, laserAmmo, bombs: bombs.length, ufos: ufos.length, enemyShots: enemyShots.length, cats: segments.filter(s => s.hazard && s.hazard.type === \'cat\').map(s => ({ index: s.index, phase: s.hazard.phase })), trampolines: segments.filter(s => s.trampoline).map(s => ({ index: s.index, lane: s.trampoline.lane })), pads: segments.filter(s => s.pad).map(s => ({ index: s.index, lane: s.padLane })) });\n  window.__setReserves = (hull, cells, boost) => { shield = hull; laserAmmo = cells; laserCharge = 0; energy = boost; };\n  window.__setRacePosition = (d, x) => { distance = d; position = mod(d, LENGTH); playerX = x; };\n  window.__setUfoKills = n => { ufoKills = n; };\n  window.__setBossHp = n => { if (boss) boss.hp = n; };\n  window.__finaleAim = col => { finale.formVx = 0; finale.boss.v = 0; finale.boss.off = 0; finale.cool = 0; finale.rowSwing = 0; finale.rowPhase = 0; finale.boss.arrive = Math.min(finale.boss.arrive, time - 5); const L = finaleLayout(); finale.shipX = (L.left + (col + .5) * L.cw) / W; };\n  window.__finaleOpen = col => { finale.invaders.forEach(v => { if (v.c === col) v.alive = false; }); finale.boss.hp = 1; };\n  window.__wave = n => { finale.bolts = []; startWave(n); finale.boss.arrive -= 2; finale.nextBossShot = time + .1; };\n  window.__forceDaily = () => { DAILY_GOALS.length = 0; DAILY_GOALS.push({ id: "win", text: t => "WIN " + t, check: () => rank === 1 }); renderDaily(); };\n  window.__weatherNow = () => { nextWeatherAt = time; };\n  window.__musicLoading = p => { soundtrackReady = false; soundtrackProgress = p; };\n  window.__musicLoaded = () => { soundtrackReady = true; soundtrackProgress = 1; };\n  window.__finaleKillShip = () => { shield = 0; finale.invulnUntil = 0; finale.bolts = [{ kind: "zap", x: finale.shipX * W, y: finaleLayout().shipY, vx: 0, vy: 0, dmg: 1 }]; };\n  window.__finale = () => finale && { lives: finale.lives, shield, phase: finale.phase, wall: finale.invaders && finale.invaders.filter(v => v.alive).length, hp: finale.boss && finale.boss.hp, wave: finale.wave, waves: finale.waves, kind: finale.cfg && finale.cfg.type.kind, rows: finale.cfg && finale.cfg.rows, attacks: finale.bolts && finale.bolts.filter(b => b.kind !== "zap").map(b => b.kind) };\n  window.__eliminateRivals = () => { rivals.forEach(r => { r.distance = -1e7; r.speed = 0; r.laserCooldown = 1e6; }); };\n  window.__disableAirRaid = () => { ufos = []; bombs = []; enemyShots = []; rivals.forEach(r => { r.laserCooldown = 100000; }); };\n})();');
  vm.runInNewContext(source, sandbox);
  const step = seconds => { for (let i = 0; i < Math.ceil(seconds * 20); i++) { now += 50; frame(now); } };
  const key = (code, type = 'keydown') => (windowEvents[type] || []).forEach(fn => fn({ code, repeat: false, target: element('body'), preventDefault() {} }));
  return { sandbox, vibrations, element, step, key, storage, inspect: () => sandbox.__testState(), setRacePosition: (d, x) => sandbox.__setRacePosition(d, x), disableAirRaid: () => sandbox.__disableAirRaid(), setReserves: (h, c, b) => sandbox.__setReserves(h, c, b), eliminateRivals: () => sandbox.__eliminateRivals(), weatherNow: () => sandbox.__weatherNow(), finaleAim: c => sandbox.__finaleAim(c), finaleState: () => sandbox.__finale(), finaleOpen: c => sandbox.__finaleOpen(c), finaleKillShip: () => sandbox.__finaleKillShip(), musicLoading: p => sandbox.__musicLoading(p), musicLoaded: () => sandbox.__musicLoaded(), setUfoKills: n => sandbox.__setUfoKills(n), setBossHp: n => sandbox.__setBossHp(n) };
}

test('circuit selection, driving, boost, pause, full race, records and restart', () => {
  const { element: el, step, key, storage, inspect, disableAirRaid } = harness();
  el('next-track').fire('click'); assert.equal(el('track-name').textContent, 'SOLAR RIOT');
  el('prev-track').fire('click'); assert.equal(el('track-name').textContent, 'NEON HORIZON');
  const laterLevels = ['SOLAR RIOT', 'ION DREAM', 'GLITCH SPIRE', 'CRYO CANYON', 'VOID CIRCUIT', 'PLASMA MAELSTROM', 'SINGULARITY RUN'];
  for (const name of laterLevels) { el('next-track').fire('click'); assert.equal(el('track-name').textContent, name); }
  assert.equal(el('.pill').textContent, '08 — 08');
  assert.equal((el('difficulty').innerHTML.match(/▰/g) || []).length, 8, 'difficulty meter scales through eight ranks');
  for (let i = 0; i < laterLevels.length; i++) el('prev-track').fire('click');
  assert.equal(el('track-name').textContent, 'NEON HORIZON');
  el('ship2').fire('click'); assert.match(el('ship-info').textContent, /EXTENDED/);
  el('start').fire('click');
  assert.equal(el('soundtrack').paused, false);
  assert.equal(el('hud').classList.contains('hidden'), false);
  assert.equal(el('position').textContent, '30');
  assert.equal(el('laser-count').textContent, '10');
  key('ArrowUp'); step(5);
  assert.ok(Number(el('speed').textContent) > 500, 'accelerator increases speed');
  key('Space'); step(1);
  assert.ok(Number.parseInt(el('energy-text').textContent) < 100, 'boost consumes energy');
  assert.match(el('boost-label').textContent, /ENGAGED/);
  key('Space', 'keyup'); const depleted = Number.parseInt(el('energy-text').textContent); step(.5);
  assert.ok(Number.parseInt(el('energy-text').textContent) > depleted, 'energy recharges');
  key('Escape'); const pausedTime = el('timer').textContent; step(2);
  assert.equal(el('timer').textContent, pausedTime, 'pause freezes the race clock');
  assert.equal(el('pause-screen').classList.contains('hidden'), false);
  el('resume').fire('click'); key('ArrowUp');
  key('ArrowRight'); step(2);
  assert.match(el('race-message').textContent, /BARRIER CONTACT/, 'wall collision is detected');
  key('ArrowRight', 'keyup');
  disableAirRaid();
  let steering = null;
  key('KeyX');
  for (let i = 0; i < 900 && el('results').classList.contains('hidden'); i++) {
    for (let frame = 0; frame < 20 && el('results').classList.contains('hidden'); frame++) {
      const x = inspect().playerX;
      const wanted = x > .1 ? 'ArrowLeft' : x < -.1 ? 'ArrowRight' : null;
      if (wanted !== steering) {
        if (steering) key(steering, 'keyup');
        if (wanted) key(wanted);
        steering = wanted;
      }
      step(.05);
    }
  }
  if (steering) key(steering, 'keyup'); key('KeyX', 'keyup');
  assert.equal(el('results').classList.contains('hidden'), false, 'six laps finish the race');
  assert.equal(el('lap').textContent, '06');
  assert.match(el('result-time').textContent, /^\d\d:\d\d\.\d{3}$/);
  assert.ok(Number(storage.get('chroma-best-0')) > 0, 'best lap persists');
  // (RACE AGAIN after a win starts the invasion finale, so restart via the garage here.)
  el('garage').fire('click'); el('start').fire('click');
  assert.equal(el('position').textContent, '30', 'restart resets ranking');
  assert.equal(el('lap').textContent, '01');
  assert.equal(el('timer').textContent, '00:00.000');
  assert.equal(el('energy-text').textContent, '100%');
  assert.equal(el('laser-count').textContent, '10');
  key('Escape'); el('quit').fire('click');
  assert.equal(el('menu').classList.contains('hidden'), false);
  assert.equal(el('hud').classList.contains('hidden'), true);
});

test('Singularity Run has live laser hazards with a collision penalty', () => {
  const { element: el, step, key, disableAirRaid } = harness();
  for (let i = 0; i < 7; i++) el('next-track').fire('click');
  assert.equal(el('track-name').textContent, 'SINGULARITY RUN');
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  key('ArrowRight'); step(.9); key('ArrowRight', 'keyup'); step(1.65);
  assert.match(el('race-message').textContent, /LASER GATE HIT/);
  assert.ok(Number.parseInt(el('energy-text').textContent) < 100, 'a gate hit drains boost energy');
  assert.ok(Number.parseInt(el('shield-text').textContent) < 100, 'a gate collision drains hull shields');
  assert.ok(Number(el('speed').textContent) < 700, 'a gate hit knocks the racer off top speed');
});

test('one laser shot damages a rival without destroying it', () => {
  const { element: el, step, key } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  key('KeyX'); step(.05);
  assert.equal(el('laser-count').textContent, '09');
  assert.match(el('race-message').textContent, /RIVAL HIT  \/  HULL 2\/3/);
  assert.equal(el('position').textContent, '30');
});

test('rival pilots fire hostile lasers that create a dodge warning', () => {
  const { element: el, step, key, inspect } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  let sawEnemyShot = false;
  for (let i = 0; i < 160; i++) {
    step(.05);
    if (inspect().enemyShots > 0) { sawEnemyShot = true; break; }
  }
  assert.equal(sawEnemyShot, true, 'rivals launch laser shots during a race');
});

test('UFOs drop bombs, trampolines jump and boost, and cats reload lasers', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid } = harness();
  const ramp = inspect().trampolines[0], cat = inspect().cats[0];
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  assert.equal(inspect().ufos, 2);
  step(1.2);
  assert.ok(inspect().bombs > 0, 'UFOs drop live bombs into the race');
  disableAirRaid();

  setRacePosition(ramp.index * 200 - 1050, ramp.lane);
  step(.05);
  assert.ok(inspect().jumpBoostTimer > 0, 'trampoline triggered its boost');
  step(.15);
  assert.ok(inspect().jumpHeight > 100, 'trampoline launches the racer');
  assert.ok(inspect().jumpBoostTimer > 0, 'trampoline grants a temporary boost');
  step(1.35);

  key('KeyX'); step(.05); key('KeyX', 'keyup');
  const ammoBeforeCat = Number(el('laser-count').textContent);
  setRacePosition(cat.index * 200 - 1050, Math.sin((inspect().time + .05) * 1.55 + cat.phase) * .64);
  step(.05);
  assert.equal(Number(el('laser-count').textContent), Math.min(10, ammoBeforeCat + 1));
  assert.match(el('race-message').textContent, /CAT PIXEL-POOF/);
});

test('shield reaches zero, triggers the chain explosion, and resets on retry', () => {
  const { element: el, step, key, inspect } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  key('ArrowRight');
  for (let i = 0; i < 60 && inspect().mode !== 'finished'; i++) step(1);
  assert.equal(inspect().mode, 'finished');
  assert.equal(el('shield-text').textContent, '0%');
  assert.equal(el('result-title').textContent, 'SHIELDS DOWN.');
  assert.match(el('result-record').textContent, /NOVA/);
  el('again').fire('click');
  assert.equal(el('shield-text').textContent, '100%');
});

test('laser cells recharge on their own and fill the laser bar', () => {
  const { element: el, step, key } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  for (let i = 0; i < 3; i++) { key('KeyX'); step(.05); key('KeyX', 'keyup'); step(.3); }
  assert.equal(el('laser-count').textContent, '07');
  assert.ok(Number.parseFloat(el('laser-fill').style.width) < 75, 'laser bar drops after firing');
  step(2.6);
  assert.equal(el('laser-count').textContent, '08', 'one cell recharges after 2.5 s');
  step(5.1);
  assert.equal(el('laser-count').textContent, '10');
  assert.equal(el('laser-fill').style.width, '100%');
  step(3);
  assert.equal(el('laser-count').textContent, '10', 'recharge stops at capacity');
});

test('the hull withstands twice as much damage before failing', () => {
  const { element: el, step, key, disableAirRaid } = harness();
  for (let i = 0; i < 7; i++) el('next-track').fire('click');
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  key('ArrowRight'); step(.9); key('ArrowRight', 'keyup'); step(1.65);
  assert.match(el('race-message').textContent, /LASER GATE HIT/);
  // This run deals ~37 raw damage (barrier scrape + laser gate): 63% with the old hull, 81% with the doubled one.
  assert.equal(el('shield-text').textContent, '81%');
});

test('cyan pads recharge boost, shield and laser cells', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, setReserves } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  const pad = inspect().pads[0];
  setReserves(40, 2, 20);
  setRacePosition(pad.index * 200 - 1050, pad.lane);
  step(.2);
  assert.match(el('race-message').textContent, /RECHARGE/);
  assert.ok(Number.parseInt(el('shield-text').textContent) > 40, 'pad repairs the hull shield');
  assert.ok(Number(el('laser-count').textContent) > 2, 'pad recharges laser cells');
  assert.ok(Number.parseInt(el('energy-text').textContent) > 20, 'pad refills boost energy');
});

test('a destroyed rival flies across the screen, smoking and spinning, then explodes', () => {
  const { element: el, step, key, inspect, disableAirRaid } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  const before = Number(el('position').textContent);
  for (let i = 0; i < 3; i++) { key('KeyX'); step(.05); key('KeyX', 'keyup'); step(.3); }
  assert.match(el('race-message').textContent, /RIVAL DESTROYED/);
  assert.equal(inspect().racerCrashes, 1, 'the beaten rival careens across the screen');
  assert.ok(Number(el('position').textContent) < before, 'the place is gained right away');
  step(.8);
  assert.equal(inspect().racerCrashes, 1, 'still smoking and spinning');
  step(2);
  assert.equal(inspect().racerCrashes, 0, 'the crash flight is over');
  assert.ok(inspect().blasts2 >= 1, 'it explodes at the end');
});

test('UFOs can be shot down: they careen, smoke, explode huge and are replaced', () => {
  const { element: el, step, key, inspect, setRacePosition } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05); step(.5);
  const total = inspect().ufos;
  assert.ok(total >= 2);
  // Line up under the first UFO, then fire.
  const lane = inspect().ufoList.find(u => u.slot === 0).lane;
  setRacePosition(inspect().distance, lane * .98);
  key('KeyX'); step(.05); key('KeyX', 'keyup');
  assert.equal(inspect().crashing, 1, 'the UFO is going down');
  assert.equal(inspect().ufos, total - 1);
  assert.ok(inspect().callout && inspect().callout.length > 3, 'the announcer shouts a kill call');
  assert.match(el('race-message').textContent, /UFO HIT/);
  step(2.7);
  assert.equal(inspect().crashing, 0);
  assert.ok(inspect().blasts > 0 || inspect().mode !== 'racing', 'a mega blast follows the crash');
  for (let i = 0; i < 80 && inspect().ufos < total && inspect().mode === 'racing'; i++) step(.1);
  if (inspect().mode === 'racing') assert.equal(inspect().ufos, total, 'a new UFO warps in');
});

test('winning a race throws confetti across the screen', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) {
    setRacePosition((lap + 1) * 240000 - 60, 0);
    step(.5);
  }
  assert.equal(inspect().mode, 'finished');
  assert.equal(el('result-position').textContent, '01');
  assert.ok(inspect().confetti > 100, 'confetti is launched');
});

test('star gates trigger 10 s of hyperdrive: invincible, infinite boost, mega laser', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  const gates = inspect().stargates;
  assert.equal(gates.length, 2, 'two star gates per track');
  setRacePosition(gates[0].index * 200 - 1050, gates[0].lane);
  step(.1);
  assert.ok(inspect().hyperTime > 9, 'hyperdrive engaged');
  assert.equal(el('body').classList.contains('hyper'), true);
  // Infinite boost.
  key('Space'); step(3); key('Space', 'keyup');
  assert.equal(Number.parseInt(el('energy-text').textContent), 100, 'boost never drains');
  // Mega laser: no ammo used and one shot destroys a rival.
  key('KeyX'); step(.05); key('KeyX', 'keyup');
  assert.equal(el('laser-count').textContent, '10');
  // Invincible: scraping the wall costs nothing.
  key('ArrowRight'); step(2); key('ArrowRight', 'keyup');
  assert.equal(el('shield-text').textContent, '100%');
  assert.match(el('race-message').textContent, /INVINCIBLE|SMASHED|RIVAL|UFO|LIGHT SPEED|BARRIER/);
  step(11);
  assert.equal(inspect().hyperTime <= 0, true, 'hyperdrive ends after 10 s');
  assert.equal(el('body').classList.contains('hyper'), false);
});

test('the 10th UFO kill summons the mothership, which attacks and can be destroyed', () => {
  const { element: el, step, key, inspect, setRacePosition, setUfoKills, setBossHp, eliminateRivals } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05); step(.5);
  eliminateRivals(); setUfoKills(9);
  const aim = () => { const st = inspect(); setRacePosition(st.distance, (st.boss ? st.boss.lane : st.ufoList.find(u => u.slot === 0).lane) * .98); };
  aim(); key('KeyX'); step(.05); key('KeyX', 'keyup');
  assert.equal(inspect().ufoKills, 10);
  assert.ok(inspect().boss, 'the mothership appears');
  assert.equal(inspect().ufos, 0, 'regular UFOs make way');
  assert.equal(el('body').classList.contains('boss'), true, 'boss health bar is shown');
  let attacked = false;
  for (let i = 0; i < 80 && !attacked; i++) { step(.1); attacked = inspect().bossAttacks > 0; }
  assert.ok(attacked, 'the mothership fires lasers or lightning');
  const hp = inspect().boss.hp;
  step(.5); aim(); key('KeyX'); step(.05); key('KeyX', 'keyup');
  assert.ok(!inspect().boss || inspect().boss.hp < hp || inspect().mode !== 'racing', 'lasers damage the mothership');
  if (inspect().mode !== 'racing') return;
  setBossHp(1); step(.3); aim(); key('KeyX'); step(.05); key('KeyX', 'keyup');
  assert.equal(inspect().boss.dying, true);
  assert.match(el('race-message').textContent, /LEGENDARY/);
  assert.equal(el('shield-text').textContent, '100%', 'beating the boss restores the shield');
  step(2.6);
  assert.equal(inspect().boss, null, 'the mothership is gone');
  for (let i = 0; i < 80 && inspect().ufos === 0; i++) step(.1);
  assert.ok(inspect().ufos > 0, 'regular UFOs return afterwards');
});

test('stylesheets have balanced braces (a broken rule silently drops everything after it)', () => {
  for (const file of ['style.css', 'effects.css']) {
    const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    for (const ch of css) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `${file}: unexpected }`); }
    assert.equal(depth, 0, `${file}: unclosed {`);
    assert.doesNotMatch(css, /[^{};\s][^{};]*@media/, `${file}: @media inside a selector`);
  }
});

test('a health warning greets every visit on the home screen', () => {
  const { element: el } = harness();
  assert.equal(el('health-screen').classList.contains('hidden'), false, 'warning is shown on load');
  el('health-accept').fire('click');
  assert.equal(el('health-screen').classList.contains('hidden'), true, 'acknowledging closes it');
  assert.equal(el('body').classList.contains('dialog-open'), false);
});

test('winning first place, then RACE AGAIN, starts the alien invasion finale', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals, finaleAim, finaleState } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  key('ArrowUp', 'keyup');
  assert.equal(inspect().mode, 'finished'); assert.equal(el('result-position').textContent, '01');
  el('again').fire('click');
  assert.equal(inspect().mode, 'invasion', 'no new race: the invasion alarm goes off');
  assert.equal(el('soundtrack').paused, true, 'music stops');
  assert.equal(el('again').classList.contains('alarm'), true, 'the button turns red');
  step(1.2);
  assert.equal(el('results').classList.contains('hidden'), true, 'results give way to the alarm');
  step(9.5); assert.equal(inspect().mode, 'invasion', 'countdown still running');
  step(.6); assert.equal(inspect().mode, 'final', 'at zero the screen shatters into space');
  assert.equal(el('soundtrack').paused, false, 'the music returns for the final fight');
  assert.equal(finaleState().wall, 44);
  const shoot = col => { finaleAim(col); key('KeyX'); step(.05); key('KeyX', 'keyup'); step(.3); };
  shoot(5);
  assert.equal(finaleState().wall, 43, 'one shot destroys exactly one alien');
  assert.equal(finaleState().hp, 10, 'the wall protects the overlord');
  for (let i = 0; i < 3; i++) shoot(5);
  assert.equal(finaleState().wall, 40, 'the column is open');
  shoot(5);
  assert.equal(finaleState().hp, 9, 'through the hole the laser hits the overlord');
  for (let i = 0; i < 9 && finaleState().phase === 'fight'; i++) shoot(5);
  assert.equal(finaleState().phase, 'won', 'ten hits finish the overlord');
  step(3.6);
  assert.equal(inspect().mode, 'disco', 'welcome to the disco');
  step(3.6);
  assert.equal(el('results').classList.contains('hidden'), false, 'the new-race button is back');
  assert.equal(el('result-title').textContent, 'GALAXY SAVED.');
  el('again').fire('click');
  assert.equal(inspect().mode, 'countdown', 'then a normal new race starts');
});

test('harder tracks chain more bosses, each different and tougher, behind a new wall', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals, finaleAim, finaleState, finaleOpen } = harness();
  el('next-track').fire('click'); // SOLAR RIOT, difficulty 4 -> two bosses
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  key('ArrowUp', 'keyup');
  assert.equal(el('result-position').textContent, '01');
  el('again').fire('click'); step(11.4);
  assert.equal(inspect().mode, 'final');
  assert.equal(finaleState().waves, 2);
  assert.equal(finaleState().kind, 'overlord');
  const finish = () => { finaleOpen(5); finaleAim(5); key('KeyX'); step(.05); key('KeyX', 'keyup'); };
  finish();
  assert.equal(finaleState().phase, 'won');
  step(3.6);
  assert.equal(inspect().mode, 'final', 'no disco yet: another boss follows');
  assert.equal(finaleState().wave, 1);
  assert.equal(finaleState().kind, 'cyclops', 'the next boss looks different');
  assert.equal(finaleState().hp, 14, 'and is tougher');
  assert.equal(finaleState().wall, 44, 'behind a fresh wall of monsters');
  let attacks = [];
  for (let i = 0; i < 60 && !attacks.includes('eyebeam'); i++) { step(.1); attacks = finaleState().attacks || []; }
  assert.ok(attacks.includes('eyebeam'), 'the cyclops fires its monocle death ray');
  step(1); finish();
  assert.equal(finaleState().phase, 'won');
  step(3.6);
  assert.equal(inspect().mode, 'disco', 'the disco follows after the last boss');
});

test('easter egg: five quick taps on the title jump straight to the bosses', () => {
  const { element: el, step, inspect, finaleState } = harness();
  el('health-accept').fire('click');
  el('next-track').fire('click'); el('next-track').fire('click'); // ION DREAM, difficulty 5 -> 3 bosses
  for (let i = 0; i < 4; i++) el('title-egg').fire('click');
  assert.equal(inspect().mode, 'menu', 'four taps do nothing');
  el('title-egg').fire('click');
  assert.equal(inspect().mode, 'invasion', 'the fifth tap triggers the invasion');
  step(11.4);
  assert.equal(inspect().mode, 'final');
  assert.equal(finaleState().waves, 3, 'boss count follows the selected circuit');
  assert.equal(finaleState().lives, 3, 'one extra life per difficulty step');
});

test('extra lives let you continue the boss fight where you blew up', () => {
  const { element: el, step, inspect, finaleState, finaleKillShip, finaleAim, key } = harness();
  el('health-accept').fire('click');
  el('next-track').fire('click'); // SOLAR RIOT -> 2 bosses, 2 extra lives
  for (let i = 0; i < 5; i++) el('title-egg').fire('click');
  step(11.4);
  finaleAim(5); key('KeyX'); step(.05); key('KeyX', 'keyup');
  const wall = finaleState().wall;
  finaleKillShip(); step(.05);
  assert.equal(finaleState().phase, 'respawn', 'the ship explodes but a life is left');
  assert.equal(finaleState().lives, 1);
  step(2.8);
  assert.equal(finaleState().phase, 'fight', 'back in the fight');
  assert.equal(finaleState().shield, 100);
  assert.equal(finaleState().wall, wall, 'same wall as before');
  finaleKillShip(); step(.05); step(2.8);
  finaleKillShip(); step(.05);
  assert.equal(finaleState().phase, 'lost', 'out of lives');
  step(2.8);
  assert.equal(el('result-title').textContent, 'ABDUCTED.');
  assert.equal(inspect().mode, 'final');
});

test('the countdown waits until the soundtrack is fully loaded', () => {
  const { element: el, step, inspect, musicLoading, musicLoaded } = harness();
  musicLoading(.4);
  el('start').fire('click'); step(4);
  assert.equal(inspect().mode, 'countdown', 'the race does not start without the music');
  assert.equal(el('countdown').textContent, 'LOADING MUSIC 40%');
  musicLoaded(); step(3.1);
  assert.equal(inspect().mode, 'racing', 'once loaded the countdown runs and the race starts');
  assert.equal(el('soundtrack').paused, false, 'music is playing');
});

test('the start screen shows a playful boot status while files download', () => {
  const { element: el, step, musicLoading, musicLoaded } = harness();
  musicLoading(.4); step(.1);
  assert.equal(el('boot-pct').textContent, '49%', 'soundtrack and voices make up the progress');
  const first = el('boot-text').textContent; assert.ok(first.endsWith('…'), 'a funny loading line is shown');
  step(2);
  assert.notEqual(el('boot-text').textContent, first, 'the lines keep changing');
  musicLoaded(); step(.1);
  assert.match(el('boot-text').textContent, /SYSTEM READY/);
  assert.equal(el('boot').classList.contains('done'), true);
  step(4); assert.equal(el('boot').classList.contains('gone'), true, 'the panel fades away when ready');
});

test('extra lives also work in the race: you continue where you blew up', () => {
  const { element: el, step, key, inspect, disableAirRaid, setReserves } = harness();
  el('start').fire('click'); key('ArrowUp'); step(4);
  disableAirRaid();
  assert.equal(inspect().lives, 1, 'the first circuit gives one extra life');
  assert.equal(el('race-lives').textContent, '♥♥');
  const before = inspect().distance;
  setReserves(1, 10, 100); key('ArrowRight'); step(1.2); key('ArrowRight', 'keyup');
  assert.equal(inspect().mode, 'respawning', 'the ship explodes but the race goes on');
  assert.equal(inspect().lives, 0);
  assert.match(el('race-message').textContent, /SHIP DESTROYED/);
  step(2.5);
  assert.equal(inspect().mode, 'racing', 'back in the race');
  assert.equal(el('shield-text').textContent, '100%');
  assert.ok(inspect().distance >= before, 'same place on the track, not back at the start');
  assert.equal(el('race-lives').textContent, '♥');
  step(2.6); setReserves(1, 10, 100); key('ArrowRight'); step(1.2);
  assert.equal(inspect().mode, 'wrecked', 'without lives left the race ends as before');
});

test('vibration: hits and explosions buzz the phone, and it can be switched off', () => {
  const { element: el, step, key, vibrations, setReserves } = harness();
  el('start').fire('click'); key('ArrowUp'); step(4);
  vibrations.length = 0;
  setReserves(100, 10, 100); key('ArrowRight'); step(1.2); key('ArrowRight', 'keyup'); step(.2);
  assert.ok(vibrations.length > 0, 'hitting the barrier vibrates');
  el('garage').fire('click'); el('haptics-off').fire('click');
  el('start').fire('click'); key('ArrowUp'); step(4);
  vibrations.length = 0;
  key('ArrowRight'); step(1.2); key('ArrowRight', 'keyup');
  assert.equal(vibrations.length, 0, 'no vibration when switched off');
});

test('power-ups: pick-ups on the track grant magnet, bubble, time warp and multi-laser', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, setReserves } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid();
  const pickups = inspect().powerups;
  assert.equal(pickups.length, 6, 'six power-ups per circuit');
  assert.deepEqual([...new Set(pickups.map(p => p.type))].sort(), ['bubble', 'magnet', 'multi', 'warp']);
  const grab = type => { const p = pickups.find(q => q.type === type); setRacePosition(p.index * 200 - 1050, p.lane); step(.1); };
  grab('bubble');
  assert.ok(inspect().power.includes('bubble')); assert.equal(inspect().bubbleHits, 3);
  setReserves(100, 10, 100); key('ArrowRight'); step(1.2); key('ArrowRight', 'keyup');
  assert.equal(el('shield-text').textContent, '100%', 'the bubble absorbs the barrier hit');
  assert.ok(inspect().bubbleHits < 3);
  grab('multi'); assert.ok(inspect().power.includes('multi'));
  grab('magnet'); assert.ok(inspect().power.includes('magnet'));
  grab('warp'); assert.ok(inspect().power.includes('warp'));
  assert.match(el('powerups').innerHTML, /TIME WARP/);
});

test('credits: earned in races and boss fights, spent on ship upgrades that change the ship', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals, storage, sandbox } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  assert.equal(el('result-position').textContent, '01');
  const profile = JSON.parse(storage.get('morbid-profile-v1'));
  assert.equal(profile.credits, 300 + 100 + 150, 'P1 pays placement + podium + win bonus');
  assert.match(el('result-credits').textContent, /\+550 CR EARNED/);
  el('garage').fire('click');
  assert.equal(sandbox.morbidShop.buy('laser'), true, 'laser bank upgrade bought');
  assert.equal(sandbox.morbidShop.buy('armor'), true, 'armor upgrade bought');
  assert.equal(sandbox.morbidShop.buy('armor'), false, 'not enough credits left for armor level 2');
  el('start').fire('click'); step(.1);
  assert.equal(el('laser-count').textContent, '12', 'laser bank holds two more cells');
});

test('campaign: later circuits unlock with a podium on the previous one', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals } = harness({ fresh: true });
  el('next-track').fire('click');
  assert.match(el('track-lock').textContent, /LOCKED/);
  el('start').fire('click');
  assert.equal(inspect().mode, 'menu', 'a locked circuit cannot be started');
  el('prev-track').fire('click');
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  assert.match(el('result-record').textContent, /UNLOCKED: SOLAR RIOT/);
  el('garage').fire('click'); el('next-track').fire('click');
  assert.match(el('track-lock').textContent, /UNLOCKED: 2\/8/);
  el('start').fire('click');
  assert.equal(inspect().mode, 'countdown', 'the unlocked circuit starts');
});

test('achievements unlock and are listed in the trophy cabinet', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals, storage } = harness({ fresh: true });
  el('health-accept').fire('click');
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  const got = Object.keys(JSON.parse(storage.get('morbid-profile-v1')).achievements);
  for (const id of ['first-race', 'podium', 'win', 'flawless']) assert.ok(got.includes(id), id);
  assert.match(el('achievement').innerHTML, /ACHIEVEMENT UNLOCKED/);
  el('garage').fire('click'); el('open-trophies').fire('click');
  assert.match(el('trophy-count').textContent, /^4 \/ 18$/);
  assert.match(el('open-trophies').textContent, /4\/18/);
});

test('the boss roster has six different bosses before any MK II repeat', () => {
  const { element: el, step, finaleState, sandbox } = harness();
  el('health-accept').fire('click');
  for (let i = 0; i < 7; i++) el('next-track').fire('click');
  for (let i = 0; i < 5; i++) el('title-egg').fire('click');
  step(11.4);
  assert.equal(finaleState().waves, 6);
  const kinds = [];
  for (let n = 0; n < 6; n++) { sandbox.__wave(n); kinds.push(finaleState().kind); step(3); }
  assert.deepEqual(kinds, ['overlord', 'cyclops', 'maggot', 'robot', 'spider', 'shark']);
});

test('difficulty: easy gives an extra life and softer hits, hard the opposite', () => {
  const run = level => {
    const h = harness(); h.sandbox.morbidSettings.set('difficulty', level);
    h.element('start').fire('click'); h.key('ArrowUp'); h.step(4); h.disableAirRaid();
    const lives = h.inspect().lives; h.setReserves(100, 10, 100); h.key('ArrowRight'); h.step(1.2);
    return { lives, shield: Number.parseInt(h.element('shield-text').textContent) };
  };
  const easy = run('easy'), normal = run('normal'), hard = run('hard');
  assert.deepEqual([easy.lives, normal.lives, hard.lives], [2, 1, 0]);
  assert.ok(easy.shield > normal.shield && normal.shield > hard.shield, `${easy.shield} > ${normal.shield} > ${hard.shield}`);
});

test('time trial: alone on the track, best time saved, no invasion afterwards', () => {
  const { element: el, step, key, inspect, setRacePosition, sandbox, storage } = harness();
  sandbox.morbidSettings.set('gameMode', 'trial');
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  assert.equal(inspect().ufos, 0, 'no UFOs in a time trial');
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  assert.equal(inspect().mode, 'finished');
  assert.match(el('result-title').textContent, /NEW BEST TIME/);
  assert.ok(JSON.parse(storage.get('morbid-profile-v1')).stats.trial[0] > 0);
  el('again').fire('click');
  assert.equal(inspect().mode, 'countdown', 'RACE AGAIN starts another trial, not the invasion');
});

test('endless boss rush keeps sending bosses and records the waves cleared', () => {
  const { element: el, step, key, inspect, finaleState, finaleOpen, finaleAim, finaleKillShip, sandbox, storage } = harness();
  el('health-accept').fire('click');
  sandbox.morbidSettings.set('gameMode', 'endless');
  el('start').fire('click'); step(11.4);
  assert.equal(inspect().mode, 'final');
  for (let w = 0; w < 7; w++) { finaleOpen(5); finaleAim(5); key('KeyX'); step(.05); key('KeyX', 'keyup'); step(3.6); }
  assert.equal(finaleState().wave, 7, 'past the six regular bosses');
  assert.match(finaleState().kind, /overlord|cyclops/);
  for (let i = 0; i < 4 && finaleState().phase !== 'lost'; i++) { finaleKillShip(); step(.05); step(2.8); }
  step(3);
  assert.match(el('result-title').textContent, /7 WAVES/);
  assert.equal(JSON.parse(storage.get('morbid-profile-v1')).stats.endlessBest, 7);
});

test('paint shop: buy and equip a paint job, trophy paints stay locked', () => {
  const { storage, sandbox } = (() => { const h = harness(); return h; })();
  const shop = sandbox.morbidShop;
  shop.profile.credits = 700;
  assert.equal(shop.paint('gold'), false, 'trophy paint needs its trophy');
  assert.equal(shop.paint('chrome'), true, 'chrome bought');
  assert.equal(shop.profile.credits, 300);
  assert.equal(JSON.parse(storage.get('morbid-profile-v1')).paint, 'chrome');
  assert.equal(shop.paint('flames'), false, 'not enough credits for hot rods');
  assert.equal(shop.paint('factory'), true, 'factory paint is always available');
});

test('daily challenge: the goal of the day pays a bonus and starts a streak', () => {
  const { element: el, step, key, inspect, setRacePosition, disableAirRaid, eliminateRivals, sandbox, storage } = harness({ fresh: true }); // fresh pilot: only circuit 1 is open, so it is today's circuit
  // Force today's challenge to be 'win' on the first circuit.
  sandbox.__forceDaily();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  disableAirRaid(); eliminateRivals();
  for (let lap = 0; lap < 6 && inspect().mode === 'racing'; lap++) { setRacePosition((lap + 1) * 240000 - 60, 0); step(.5); }
  assert.match(el('result-record').textContent, /DAILY CHALLENGE COMPLETE/);
  const daily = JSON.parse(storage.get('morbid-profile-v1')).daily;
  assert.equal(daily.streak, 1);
  assert.match(el('daily-text').textContent, /DONE/);
});

test('three named nemeses race with tougher hulls and pay a bounty', () => {
  const { element: el, step, key, inspect } = harness();
  el('start').fire('click'); key('ArrowUp'); step(3.05);
  const nem = inspect().nemeses;
  assert.equal(nem.length, 3);
  assert.ok(nem.every(n => n.hull === 6), 'nemeses take six hits');
  assert.equal(new Set(nem.map(n => n.name)).size, 3);
});

test('weather events: a random event starts, does its thing and clears again', () => {
  const { element: el, step, key, inspect, weatherNow } = harness();
  el('start').fire('click'); key('ArrowUp'); step(4);
  const seen = new Set();
  for (let i = 0; i < 6; i++) { weatherNow(); step(.6); seen.add(inspect().weather); if (inspect().weather === 'meteors') { let most = 0; for (let k = 0; k < 20; k++) { step(.1); most = Math.max(most, inspect().meteors); } assert.ok(most > 0, 'meteors fall'); } step(9.5); }
  assert.ok(seen.size >= 2, `several event types: ${[...seen]}`);
  assert.equal(inspect().weather, null, 'events end');
});

test('first-run tutorial: prompts advance as the player steers, boosts and fires', () => {
  const { element: el, step, key, inspect, storage } = harness({ fresh: true });
  el('health-accept').fire('click');
  el('start').fire('click'); step(3.05);
  assert.equal(inspect().tutorialStep, 0);
  assert.match(el('tutorial-text').textContent, /STEER/);
  key('ArrowLeft'); step(1); key('ArrowLeft', 'keyup');
  assert.equal(inspect().tutorialStep, 1, 'steering done');
  key('ArrowUp'); step(1.5); key('Space'); step(.8); key('Space', 'keyup');
  assert.equal(inspect().tutorialStep, 2, 'boost done');
  key('KeyX'); step(.1); key('KeyX', 'keyup');
  assert.equal(inspect().tutorialStep, 3, 'laser done');
  step(22);
  assert.equal(inspect().tutorialStep, -1, 'tutorial finished');
  assert.equal(JSON.parse(storage.get('morbid-profile-v1')).tutorialDone, true);
});

test('gamepad: A starts the race, the stick steers, X fires', () => {
  const { element: el, step, inspect, sandbox } = harness();
  el('health-accept').fire('click');
  const pad = { axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  sandbox.navigator.getGamepads = () => [pad];
  const press = (i, on = true) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
  press(0); step(.05); press(0, false);
  assert.equal(inspect().mode, 'countdown', 'A starts the race');
  step(3.1); press(7); step(1);
  const x0 = inspect().playerX; pad.axes[0] = 1; step(.6); pad.axes[0] = 0;
  assert.ok(inspect().playerX > x0 + .2, 'stick steers right');
  const ammo = inspect().laserAmmo; press(2); step(.1); press(2, false); step(.05);
  assert.ok(inspect().laserAmmo < ammo, 'X fires the laser');
});
