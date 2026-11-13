# MORBID RACERS

A colorful, F-Zero-inspired anti-gravity racer. Eight increasingly difficult neon circuits, three machines, twenty-nine rival pilots, self-recharging 10-cell laser cannons, enemy lasers and boost bursts, UFO bombing runs, jump-and-boost trampolines, shield damage, six-lap races, boost pads, crossing cyber-cats, animated hazards, persistent lap records, and the local **Morbid Fingers — Redemption (Live, 2003)** soundtrack. Later circuits add narrower tracks, sharper turns, low-grip ice, laser gates, and faster rivals. Canvas graphics are generated entirely in code; engine, laser, impact, and explosion sounds are synthesized in the browser.

> **Health warning:** the game contains flashing lights and fast-moving patterns. A photosensitive-seizure and motion-sickness warning pops up on the home screen on every visit and must be acknowledged before playing.

## Play online

https://jan-frederic.github.io/Zero/ (deployed automatically via GitHub Actions, see `.github/workflows/pages.yml`).

### Install as an app (PWA)

Morbid Racers is a Progressive Web App: install it and it runs fullscreen from your home screen, **fully offline** — game, soundtrack and fonts are cached by the service worker.

- **Android / Chrome / Edge:** tap the ⤓ button in the top bar (or *Install app* in the browser menu).
- **iPhone / iPad (Safari):** tap *Share* → *Add to Home Screen* (the ⤓ button shows this hint).

Each deploy stamps the service worker with the commit SHA, so installed copies update automatically on the next launch.

## Play locally

Run `npm start` in this folder, then open **http://localhost:3000**. No dependencies or installation required; Node.js 18+ is sufficient. You can also open `index.html` directly in a browser. Fonts use Google Fonts, with local fallbacks.

| Control | Action |
| --- | --- |
| Enter | Start race |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / D or ← / → | Steer |
| Space / Shift | Boost |
| X / F | Fire laser cannon (10 cells, one recharges every 2.5 s; cats add a bonus cell) |
| Esc / P | Pause / resume |
| M | Mute / unmute |

### Touch (phones & tablets)

The game is fully playable with touch gestures, in portrait and landscape:

| Gesture | Action |
| --- | --- |
| Tap **ENTER THE RACE** | Start race |
| Touch and hold anywhere on the track | Accelerate |
| Drag left / right | Steer (analog, floating stick) |
| Slide up while holding | Boost |
| Slide down while holding | Brake |
| Quick tap, or tap with a second finger | Fire laser |
| ϟ / ◎ / ▼ buttons | Boost / laser / brake (alternative to gestures) |
| Ⅱ button | Pause |

A short gesture guide appears at the start of every race on touch devices.

**Settings** (⚙ SETTINGS button on the start screen, remembered on the device; ☰ CHANGELOG shows what changed in each release):

- **Steering: GYRO (default) / TOUCH** — with GYRO you steer by tilting the device like a steering wheel; the neutral position is calibrated when the race starts and after every pause. Holding, sliding and tapping still accelerate, boost, brake and fire. On iPhone/iPad the browser asks once for motion-sensor access (on the first race start); if access is denied, steering falls back to touch automatically.
- **Screen: LANDSCAPE (default) / PORTRAIT** — where the browser allows it (Android, installed app) the screen is locked to that orientation; otherwise (e.g. iOS Safari) the game pauses and asks you to rotate the device, with a one-tap switch to the other orientation.

The machine cruises automatically; hold accelerate for race speed. Boost spends energy; release it to recharge. Drive over the cyan pads to recharge boost energy, hull shield and laser cells at once. Shield energy drops on collisions (the reinforced hull takes half damage); when shields fail, your ship and the remaining pack detonate in a chain reaction. Laser shots damage rival hulls over multiple hits; a beaten rival is flung across the whole screen, spinning and trailing smoke, then explodes; rivals fire back and boost. Trampolines launch you into a temporary air boost with a roaring jet blast (boosts roar too). Shoot the UFOs: a hit UFO careens across the whole screen trailing smoke, then goes off in a screen-filling mega blast while a retro 8-bit robot announcer (clips rendered with espeak-ng by `tools/make-voice.sh`) yells things like *ALIEN KILLER!* or *FATALITY!* — and fresh UFOs keep warping in. Every 10 UFO kills the **mothership** arrives: a giant saucer with a health bar that fires telegraphed lane lasers and lightning bolts (dodge by changing lanes or jumping). Shoot it down for a huge finale and a full shield and laser refill; afterwards regular UFOs return. Finish first and confetti rains over the whole screen. But beware: after a win, **RACE AGAIN** sounds the invasion alarm — the music cuts out, red lights sweep the screen, a robot voice warns *“Invasion incoming”* and a 10-second countdown runs until the whole picture shatters into space. There the final fight awaits: blast a hole through a wall of aliens (one alien per shot) and hit the tentacled, jet-powered alien overlord ten times. On harder circuits the overlord is only the beginning: every difficulty step adds another boss (1 on the first circuit, up to 6 on the last), each behind a fresh wall of monsters — the **Cyclops Commander** with his brass monocle and death ray, the dripping **Maggot Queen** spitting acid, the **Robo-Tyrant** firing missiles, the **Crystal Spider** dropping sticky webs that slow you down, and the **Wormhole Shark** that dives into a wormhole and bites up from under your ship — then MK II versions. Each wave is tougher: more hit points, more rows, faster walls, and later rows slide left and right independently so the holes keep drifting apart. Every boss dies with its own death scream. You get one extra ship per difficulty step, shared by the race and the boss fights that follow it; when your ship is destroyed (in a huge explosion) you continue right where you blew up — same wave, same wall, same boss health. The last boss bursts into blood and guts, and you end up in a disco under a mirror ball, congratulated by an alien voice. Grab the floating **power-ups**: 🧲 Magnet (pulls in pads, cats, gates and power-ups), ◯ Shield Bubble (absorbs 3 hits), ⧗ Time Warp (everyone else in slow motion) and ⁂ Multi-Laser (each shot hits up to 3 rivals). Steer through one of the spinning **star gates** for 10 seconds of hyperdrive: invincible, infinite boost, a rainbow mega laser that one-shots rivals, and light-speed visuals with a psychedelic deep-space backdrop. Dodge falling UFO bombs, and watch for neon cats crossing the track: collisions produce a harmless, cartoony pixel-pop and reload one laser shot. Circuits unlock one by one: finish in the top 3 to open the next. Choose a circuit and machine in the garage; lap records are saved per circuit in this browser.

Music starts on your first click or race launch. The bottom-left music button independently pauses the soundtrack. The top-right sound button mutes both music and synthesized engine effects.

The game code lives in `src/` (see `src/README.md`); `npm run build` assembles it into `game.js`. `npm run check` verifies that `game.js` is up to date and performs JavaScript syntax checks. `npm run smoke` drives the game in Chromium on desktop and phone viewports; `npm run visual` compares the start screen and dialogs with the screenshots in `tests/visual/` (`npm run visual -- --update` after an intended layout change). `npm run typecheck` type-checks the built `game.js` with TypeScript (`checkJs`, ambient types in `types/globals.d.ts`). `npm test` simulates a complete race and verifies controls, boost, collisions, pause/resume, lap records, restart, and the final circuit's hazards.

## Versioning & releases

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Work happens on feature branches and reaches `main` through pull requests; every push and PR is tested, and every merge into `main` is released automatically by [semantic-release](https://semantic-release.gitbook.io/) and deployed:

| Commit | Release |
| --- | --- |
| `fix: …` / `perf: …` | patch (1.0.**1**) |
| `feat: …` | minor (1.**1**.0) |
| `feat!: …` or a `BREAKING CHANGE:` footer | major (**2**.0.0) |
| `docs:`, `chore:`, `style:`, `refactor:`, `test:`, `ci:` | no release |

The workflow (`.github/workflows/pages.yml`) tests, runs semantic-release (git tag, GitHub release, `CHANGELOG.md`, version in `package.json`), then deploys the site stamped with that version. The version is shown in the footer (`V1.2.3`) and published as `version.json`.

**In-app updates:** the app checks for a new release every 5 minutes, when it comes back to the foreground and when the device goes online. A new version is downloaded in the background; it installs immediately in the garage or on the results screen, and during a race a banner announces it and installs it after the race (or right away on tap).
