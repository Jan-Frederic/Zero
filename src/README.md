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
| `01-core.js` | DOM handles, constants, helpers and the shared race state |
| `02-profile.js` | saved pilot profile: credits, upgrades, paint jobs, lifetime stats |
| `03-achievements.js` | trophy cabinet and unlock pop-ups |
| `04-settings.js` | settings, difficulty, accessibility helpers, performance mode |
| `05-device.js` | gyro steering and screen orientation |
| `06-i18n.js` | English → German translation (DOM and canvas text) |
| `07-track.js` | circuits, machines, track building and resizing |
| `08-nemesis.js` | named nemesis rivals (data is used by the voice clip list) |
| `09-audio.js` | audio graph, soundtrack preloading, sound effects, robot voice, jets |
| `10-effects.js` | race messages, callouts, explosions, confetti |
| `11-powerups.js` | power-ups: magnet, shield bubble, time warp, multi-laser |
| `12-hyperdrive.js` | star gates and the hyperdrive |
| `13-ufos-mothership.js` | UFOs, bombs, crash paths and the mothership |
| `14-campaign-modes.js` | circuit unlocks, game modes, lifetime race stats |
| `15-daily.js` | daily challenge and streak |
| `16-race.js` | race start/pause/garage, lasers, wrecks, lives, results |
| `17-boot.js` | playful boot panel on the start screen |
| `18-weather.js` | weather and track events |
| `19-tutorial.js` | first-run tutorial |
| `20-update-hud.js` | per-frame update loop and HUD |
| `21-finale.js` | invasion, boss chain, final fight flow and disco |
| `22-finale-draw.js` | boss and finale drawing |
| `23-render.js` | race rendering and the frame loop |
| `24-gamepad.js` | gamepad polling |
| `25-input.js` | keyboard, buttons and touch gestures |
| `26-dialogs.js` | settings wiring, stats/profile transfer, health warning, changelog, easter egg |
| `27-garage.js` | upgrade and paint shop |
| `28-share.js` | share card |
| `29-init.js` | start-up |

**Load order matters.** Function declarations are hoisted across all parts, but `const`/`let` values that are
computed while the script loads must be declared in an earlier part than the code that reads them — for example
the nemesis data (`08`) feeds the voice clip list in `09-audio.js`. A wrong order shows up immediately as
"Cannot access … before initialization" in every test.