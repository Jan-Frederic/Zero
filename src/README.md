# Game source

`game.js` is generated from the numbered parts in this folder — **edit these, not `game.js`**, then run:

```bash
npm run build   # concatenates src/NN-*.js into game.js
npm test        # also fails if game.js is out of date
```

The parts are fragments of one IIFE that share their closure (game state, canvas, audio), so they are
concatenated in file-name order rather than imported as ES modules.

| Part | Contents |
| --- | --- |
| `01-core-state.js` | IIFE header, pilot profile, upgrades, achievements, constants, tracks, machines, game state, helpers |
| `02-track.js` | resize, track generation, circuit selection |
| `03-audio.js` | Web Audio setup, soundtrack preloading, synth effects, haptics, voice clips, robot announcer |
| `04-ufos-mothership-effects.js` | UFO shoot-downs and crashes, mothership boss, crash layer, confetti, jet engine |
| `05-settings-hyperdrive.js` | settings (gyro, screen, vibration), orientation, hyperdrive |
| `06-finale-bosses.js` | invasion alarm, final fight, boss chain and boss drawings, gore, disco |
| `07-race-rules.js` | power-ups, campaign, race start/pause/garage, lasers, wrecks, lives, results, boot panel |
| `08-update-hud.js` | the per-frame update loop and HUD |
| `09-render.js` | all race rendering and the frame loop |
| `10-i18n.js` | English → German translation table; DOM text via MutationObserver, canvas text via fillText |
| `11-input-ui-init.js` | input, gestures, dialogs, easter egg, shop, sharing, start-up |
