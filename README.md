# CHROMA / OVERDRIVE

A colorful, F-Zero-inspired anti-gravity racer. Eight increasingly difficult neon circuits, three machines, nineteen rival pilots, 10-shot laser cannons, enemy lasers and boost bursts, UFO bombing runs, jump-and-boost trampolines, shield damage, three-lap races, boost pads, crossing cyber-cats, animated hazards, persistent lap records, and the local **Morbid Fingers — Redemption (Live, 2003)** soundtrack. Later circuits add narrower tracks, sharper turns, low-grip ice, laser gates, and faster rivals. Canvas graphics are generated entirely in code; engine, laser, impact, and explosion sounds are synthesized in the browser.

## Play online

https://jan-frederic.github.io/Zero/ (deployed automatically via GitHub Actions, see `.github/workflows/pages.yml`).

## Play locally

Run `npm start` in this folder, then open **http://localhost:3000**. No dependencies or installation required; Node.js 18+ is sufficient. You can also open `index.html` directly in a browser. Fonts use Google Fonts, with local fallbacks.

| Control | Action |
| --- | --- |
| Enter | Start race |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / D or ← / → | Steer |
| Space / Shift | Boost |
| X / F | Fire laser cannon (10 shots; cats reload it) |
| Esc / P | Pause / resume |
| M | Mute / unmute |

The machine cruises automatically; hold accelerate for race speed. Boost spends energy; release it to recharge, or drive over cyan pads. Shield energy drops on collisions; when shields fail, your ship and the remaining pack detonate in a chain reaction. Laser shots damage rival hulls over multiple hits; rivals fire back and boost. Trampolines launch you into a temporary air boost. Dodge falling UFO bombs, and watch for neon cats crossing the track: collisions produce a harmless, cartoony pixel-pop and reload one laser shot. Touch controls appear on mobile. Choose a circuit and machine in the garage; lap records are saved per circuit in this browser.

Music starts on your first click or race launch. The bottom-left music button independently pauses the soundtrack. The top-right sound button mutes both music and synthesized engine effects.

`npm run check` performs JavaScript syntax checks. `npm test` simulates a complete race and verifies controls, boost, collisions, pause/resume, lap records, restart, and the final circuit's hazards.
