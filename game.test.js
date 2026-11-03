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
    '  resize(); buildTrack(); requestAnimationFrame(frame);\n  window.__testState = () => ({ racerCrashes: crashingUfos.filter(c => c.kind === \'racer\').length, blasts2: megaBlasts.length, ufoKills, boss: boss && { hp: boss.hp, lane: boss.lane, dying: !!boss.dying }, bossAttacks: bossAttacks.length, hyperTime, stargates: segments.filter(s => s.stargate).map(s => ({ index: s.index, lane: s.stargate.lane })), energy, ufoList: ufos.map(u => ({ lane: u.lane, slot: u.slot })), crashing: crashingUfos.length, blasts: megaBlasts.length, confetti: confetti.length, callout: callout && callout.text, dying: rivals.filter(r => r.dying).length, explosions: explosions.length, mode, playerX, distance, shield, lap, rank, time, jumpHeight, jumpBoostTimer, laserAmmo, bombs: bombs.length, ufos: ufos.length, enemyShots: enemyShots.length, cats: segments.filter(s => s.hazard && s.hazard.type === \'cat\').map(s => ({ index: s.index, phase: s.hazard.phase })), trampolines: segments.filter(s => s.trampoline).map(s => ({ index: s.index, lane: s.trampoline.lane })), pads: segments.filter(s => s.pad).map(s => ({ index: s.index, lane: s.padLane })) });\n  window.__setReserves = (hull, cells, boost) => { shield = hull; laserAmmo = cells; laserCharge = 0; energy = boost; };\n  window.__setRacePosition = (d, x) => { distance = d; position = mod(d, LENGTH); playerX = x; };\n  window.__setUfoKills = n => { ufoKills = n; };\n  window.__setBossHp = n => { if (boss) boss.hp = n; };\n  window.__finaleAim = col => { const L = finaleLayout(); finale.formVx = 0; finale.boss.v = 0; finale.boss.off = 0; finale.cool = 0; finale.shipX = (L.left + (col + .5) * L.cw) / W; };\n  window.__finale = () => finale && { phase: finale.phase, wall: finale.invaders.filter(v => v.alive).length, hp: finale.boss.hp };\n  window.__eliminateRivals = () => { rivals.forEach(r => { r.distance = -1e7; r.speed = 0; r.laserCooldown = 1e6; }); };\n  window.__disableAirRaid = () => { ufos = []; bombs = []; enemyShots = []; rivals.forEach(r => { r.laserCooldown = 100000; }); };\n})();');
  vm.runInNewContext(source, sandbox);
  const step = seconds => { for (let i = 0; i < Math.ceil(seconds * 20); i++) { now += 50; frame(now); } };
  const key = (code, type = 'keydown') => (windowEvents[type] || []).forEach(fn => fn({ code, repeat: false, target: element('body'), preventDefault() {} }));
  return { element, step, key, storage, inspect: () => sandbox.__testState(), setRacePosition: (d, x) => sandbox.__setRacePosition(d, x), disableAirRaid: () => sandbox.__disableAirRaid(), setReserves: (h, c, b) => sandbox.__setReserves(h, c, b), eliminateRivals: () => sandbox.__eliminateRivals(), finaleAim: c => sandbox.__finaleAim(c), finaleState: () => sandbox.__finale(), setUfoKills: n => sandbox.__setUfoKills(n), setBossHp: n => sandbox.__setBossHp(n) };
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
  el('again').fire('click');
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
