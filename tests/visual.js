// Visual regression test for the start screen and the dialogs on desktop and phone, against baselines in tests/visual/.
// Two checks per screen, both robust to font anti-aliasing differing between machines:
//  1. layout: position and size of every visible element must match the baseline within LAYOUT_TOLERANCE px;
//  2. pixels: the screenshot, averaged over 4×4 blocks, may differ in at most MAX_DIFF of the blocks.
// The game canvas, animations and changing texts are taken out.
// Run: npm run visual            (compare)
//      npm run visual -- --update (write new baselines after an intended layout change)
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const root = path.join(__dirname, '..'), baseDir = path.join(__dirname, 'visual'), diffDir = path.join(root, 'visual-diff');
const update = process.argv.includes('--update'), port = 4700 + Math.floor(Math.random() * 500);
const MAX_DIFF = 0.04, BLOCK = 4, LAYOUT_TOLERANCE = 4;
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 760 }, { name: 'phone', width: 390, height: 844, mobile: true }];
// The race HUD is captured in a time trial (no rivals or UFOs, so the bars stay full); values that change are masked.
const RACE_VIEWPORTS = [...VIEWPORTS, { name: 'phone-landscape', width: 844, height: 390, mobile: true }];
const RACE_DYNAMIC = '#timer,#speed,#race-message,#credit-pop,#powerups,#progress,#countdown,#boost-label,#achievement,#subtitle,.touch-hint';
const SCREENS = [
  { name: 'home', open: null, shot: '#menu' },
  { name: 'settings', open: '#open-settings', shot: '#settings-screen .modal-card' },
  { name: 'shop', open: '#open-shop', shot: '#shop-screen .modal-card' },
  { name: 'trophies', open: '#open-trophies', shot: '#trophy-screen .modal-card' },
  { name: 'stats', open: '#open-stats', shot: '#stats-screen .modal-card' },
  { name: 'story', open: '#open-story', shot: '#story-screen .modal-card' },
];
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
#game,#confetti{visibility:hidden!important}body{background:#0b0920!important}.modal{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`;

async function waitForServer() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) return; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 100)); }
  throw new Error('server did not start');
}
// Average BLOCK×BLOCK pixel blocks: glyph rasterisation differences vanish, moved or missing elements stay visible.
function downsample(img) {
  const w = Math.floor(img.width / BLOCK), h = Math.floor(img.height / BLOCK), out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sum = [0, 0, 0, 0];
    for (let dy = 0; dy < BLOCK; dy++) for (let dx = 0; dx < BLOCK; dx++) { const i = ((y * BLOCK + dy) * img.width + x * BLOCK + dx) * 4; for (let c = 0; c < 4; c++) sum[c] += img.data[i + c]; }
    const o = (y * w + x) * 4; for (let c = 0; c < 4; c++) out.data[o + c] = Math.round(sum[c] / (BLOCK * BLOCK));
  }
  return out;
}
function compareLayout(base, boxes) {
  if (base.length !== boxes.length) return `${boxes.length} visible elements, baseline ${base.length}`;
  const moved = boxes.map((b, i) => [b, base[i]]).filter(([b, a]) => a.el !== b.el || ['x', 'y', 'w', 'h'].some(k => Math.abs(a[k] - b[k]) > LAYOUT_TOLERANCE));
  return moved.length ? moved.slice(0, 4).map(([b, a]) => `${b.el} at ${b.x},${b.y} ${b.w}×${b.h} (was ${a.el} ${a.x},${a.y} ${a.w}×${a.h})`).join('; ') + (moved.length > 4 ? ` … ${moved.length} elements` : '') : null;
}
function compare(name, png, boxes) {
  const file = path.join(baseDir, `${name}.png`), layoutFile = path.join(baseDir, `${name}.json`);
  if (update || !fs.existsSync(file) || !fs.existsSync(layoutFile)) {
    fs.writeFileSync(file, png); fs.writeFileSync(layoutFile, JSON.stringify(boxes)); return { name, status: update ? 'updated' : 'new baseline' };
  }
  const layout = compareLayout(JSON.parse(fs.readFileSync(layoutFile, 'utf8')), boxes);
  const a = PNG.sync.read(fs.readFileSync(file)), b = PNG.sync.read(png);
  if (layout || a.width !== b.width || a.height !== b.height) {
    fs.writeFileSync(path.join(diffDir, `${name}-actual.png`), png);
    return { name, status: 'FAIL', detail: `layout changed: ${layout || `size ${b.width}×${b.height}, baseline ${a.width}×${a.height}`}` };
  }
  const sa = downsample(a), sb = downsample(b), diff = new PNG({ width: sa.width, height: sa.height });
  const blocks = pixelmatch(sa.data, sb.data, diff.data, sa.width, sa.height, { threshold: .2 }), share = blocks / (sa.width * sa.height);
  if (share > MAX_DIFF) {
    fs.writeFileSync(path.join(diffDir, `${name}-actual.png`), png); fs.writeFileSync(path.join(diffDir, `${name}-diff.png`), PNG.sync.write(diff));
    return { name, status: 'FAIL', detail: `${(share * 100).toFixed(2)} % of blocks differ` };
  }
  return { name, status: 'ok', detail: `layout same, ${(share * 100).toFixed(2)} % of blocks differ` };
}
// Boxes of all visible elements inside the screenshot root, relative to it (rounded to whole pixels).
const LAYOUT = (root, skip = '#boot,#app-version,#music-status') => {
  const r = root.getBoundingClientRect(), out = [];
  for (const e of root.querySelectorAll('*')) {
    const b = e.getBoundingClientRect(), st = getComputedStyle(e);
    if (!b.width || !b.height || st.visibility === 'hidden' || e.closest(skip)) continue;
    out.push({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.classList[0] ? '.' + e.classList[0] : ''), x: Math.round(b.left - r.left), y: Math.round(b.top - r.top), w: Math.round(b.width), h: Math.round(b.height) });
  }
  return out;
};

(async () => {
  fs.mkdirSync(baseDir, { recursive: true }); fs.rmSync(diffDir, { recursive: true, force: true }); fs.mkdirSync(diffDir, { recursive: true });
  const server = spawn(process.execPath, [path.join(root, 'server.js')], { stdio: 'ignore', env: { ...process.env, PORT: String(port) } });
  const results = [];
  try {
    await waitForServer();
    // Font hinting decides glyph advances; machines default to different settings (the CI runner uses 'medium'), so pin it.
    const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: !!vp.mobile, isMobile: !!vp.mobile, serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-03-10T12:00:00Z'));
      await page.addInitScript(screen => {
        localStorage.setItem('morbid-profile-v1', JSON.stringify({ unlocked: 3, credits: 1234, tutorialDone: true, achievements: { 'first-race': Date.UTC(2026, 2, 1) }, stats: { races: 12, wins: 3, podiums: 5, km: 321, seconds: 5400 } }));
        localStorage.setItem('morbid-settings-v2', JSON.stringify({ perf: 'full', lang: 'en', screen, steering: 'touch' }));
      }, vp.mobile ? 'portrait' : 'landscape');
      await page.goto(`http://localhost:${port}/`);
      // Load every font face up front: faces first used inside a dialog would otherwise still be loading on a slow machine.
      await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => {}))); await document.fonts.ready; });
      await page.click('#health-accept'); await page.addStyleTag({ content: FREEZE });
      const mask = [page.locator('#boot'), page.locator('#app-version'), page.locator('#music-status')];
      for (const s of SCREENS) {
        if (s.open) { await page.click(s.open); }
        await page.waitForTimeout(150); await page.evaluate(() => document.fonts.ready);
        const target = page.locator(s.shot).first();
        const png = await target.screenshot({ mask, animations: 'disabled' }), boxes = await target.evaluate(LAYOUT);
        results.push(compare(`${vp.name}-${s.name}`, png, boxes));
        if (s.open) await page.click(`${s.shot.split(' ')[0]} [data-close-dialog]`);
      }
      await ctx.close();
    }
    for (const vp of RACE_VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: !!vp.mobile, isMobile: !!vp.mobile, serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-03-10T12:00:00Z'));
      await page.addInitScript(screen => {
        localStorage.setItem('morbid-profile-v1', JSON.stringify({ unlocked: 3, tutorialDone: true }));
        localStorage.setItem('morbid-settings-v2', JSON.stringify({ perf: 'full', lang: 'en', screen, steering: 'touch', gameMode: 'trial' }));
      }, vp.width > vp.height ? 'landscape' : 'portrait');
      await page.goto(`http://localhost:${port}/`);
      await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => {}))); await document.fonts.ready; });
      await page.click('#health-accept'); await page.addStyleTag({ content: FREEZE });
      await page.click('#start');
      await page.waitForFunction(() => document.body.classList.contains('racing') && !document.body.classList.contains('buffering') && document.getElementById('countdown').textContent === '', null, { timeout: 20000 });
      await page.waitForTimeout(300);
      const target = page.locator('#hud');
      const png = await target.screenshot({ mask: RACE_DYNAMIC.split(',').map(sel => page.locator(sel)), animations: 'disabled' });
      const boxes = await target.evaluate(LAYOUT, RACE_DYNAMIC + ',#boot,#app-version,#music-status');
      results.push(compare(`${vp.name}-race`, png, boxes));
      await ctx.close();
    }
    await browser.close();
  } finally { server.kill(); }
  for (const r of results) console.log(`${r.status === 'FAIL' ? '✗' : '✓'} ${r.name}: ${r.status}${r.detail ? ' — ' + r.detail : ''}`);
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(failed ? `\n${failed} screen(s) changed — see visual-diff/, or run npm run visual -- --update if intended` : '\nno visual changes');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
