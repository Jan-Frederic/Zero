const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

// Exercise the actual game loop with a deterministic clock and browser stand-ins.
function harness() {
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
  const windowEvents = {}, storage = new Map();
  let frame, now = 0;
  const sandbox = {
    console, Math, Uint8Array, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    document: { getElementById: element, querySelector: element, querySelectorAll: query => query === '[data-ship]' ? ships : [], body: element('body'), addEventListener() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: fn => { frame = fn; },
    addEventListener: (event, fn) => (windowEvents[event] ||= []).push(fn),
  };
  sandbox.window = sandbox;
  const source = fs.readFileSync('game.js', 'utf8').replace('  resize(); buildTrack(); requestAnimationFrame(frame);\n})();',
    '  resize(); buildTrack(); requestAnimationFrame(frame);\n  window.__testState = () => ({ mode, playerX, distance, shield, lap, rank, time, jumpHeight, jumpBoostTimer, laserAmmo, bombs: bombs.length, ufos: ufos.length, enemyShots: enemyShots.length, cats: segments.filter(s => s.hazard && s.hazard.type === \'cat\').map(s => ({ index: s.index, phase: s.hazard.phase })), trampolines: segments.filter(s => s.trampoline).map(s => ({ index: s.index, lane: s.trampoline.lane })) });\n  window.__setRacePosition = (d, x) => { distance = d; position = mod(d, LENGTH); playerX = x; };\n  window.__disableAirRaid = () => { ufos = []; bombs = []; enemyShots = []; rivals.forEach(r => { r.laserCooldown = 100000; }); };\n})();');
  vm.runInNewContext(source, sandbox);
  const step = seconds => { for (let i = 0; i < Math.ceil(seconds * 20); i++) { now += 50; frame(now); } };
  const key = (code, type = 'keydown') => (windowEvents[type] || []).forEach(fn => fn({ code, repeat: false, target: element('body'), preventDefault() {} }));
  return { element, step, key, storage, inspect: () => sandbox.__testState(), setRacePosition: (d, x) => sandbox.__setRacePosition(d, x), disableAirRaid: () => sandbox.__disableAirRaid() };
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
  assert.equal(el('position').textContent, '20');
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
  for (let i = 0; i < 450 && el('results').classList.contains('hidden'); i++) {
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
  assert.equal(el('results').classList.contains('hidden'), false, 'three laps finish the race');
  assert.equal(el('lap').textContent, '03');
  assert.match(el('result-time').textContent, /^\d\d:\d\d\.\d{3}$/);
  assert.ok(Number(storage.get('chroma-best-0')) > 0, 'best lap persists');
  el('again').fire('click');
  assert.equal(el('position').textContent, '20', 'restart resets ranking');
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
  assert.equal(el('position').textContent, '20');
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
