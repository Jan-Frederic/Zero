# MORBID RACERS

A colorful, F-Zero-inspired anti-gravity racer. Eight increasingly difficult neon circuits, three machines, nineteen rival pilots, self-recharging 10-cell laser cannons, enemy lasers and boost bursts, UFO bombing runs, jump-and-boost trampolines, shield damage, three-lap races, boost pads, crossing cyber-cats, animated hazards, persistent lap records, and the local **Morbid Fingers — Redemption (Live, 2003)** soundtrack. Later circuits add narrower tracks, sharper turns, low-grip ice, laser gates, and faster rivals. Canvas graphics are generated entirely in code; engine, laser, impact, and explosion sounds are synthesized in the browser.

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

The machine cruises automatically; hold accelerate for race speed. Boost spends energy; release it to recharge. Drive over the cyan pads to recharge boost energy, hull shield and laser cells at once. Shield energy drops on collisions (the reinforced hull takes half damage); when shields fail, your ship and the remaining pack detonate in a chain reaction. Laser shots damage rival hulls over multiple hits; a beaten rival trails smoke, spins out of control and then explodes; rivals fire back and boost. Trampolines launch you into a temporary air boost. Dodge falling UFO bombs, and watch for neon cats crossing the track: collisions produce a harmless, cartoony pixel-pop and reload one laser shot. Choose a circuit and machine in the garage; lap records are saved per circuit in this browser.

Music starts on your first click or race launch. The bottom-left music button independently pauses the soundtrack. The top-right sound button mutes both music and synthesized engine effects.

`npm run check` performs JavaScript syntax checks. `npm test` simulates a complete race and verifies controls, boost, collisions, pause/resume, lap records, restart, and the final circuit's hazards.
