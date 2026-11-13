// Visual regression test: screenshots of the start screen and the dialogs on desktop and phone, compared with the
// baselines in tests/visual/. The game canvas, animations and changing texts are taken out so only layout is compared.
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
const MAX_DIFF = 0.015; // share of pixels allowed to differ (font anti-aliasing between machines)
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 760 }, { name: 'phone', width: 390, height: 844, mobile: true }];
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
function compare(name, png) {
  const file = path.join(baseDir, `${name}.png`);
  if (update || !fs.existsSync(file)) { fs.writeFileSync(file, png); return { name, status: update ? 'updated' : 'new baseline' }; }
  const a = PNG.sync.read(fs.readFileSync(file)), b = PNG.sync.read(png);
  if (a.width !== b.width || a.height !== b.height) {
    fs.writeFileSync(path.join(diffDir, `${name}-actual.png`), png);
    return { name, status: 'FAIL', detail: `size ${b.width}×${b.height}, baseline ${a.width}×${a.height}` };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: .2 }), share = pixels / (a.width * a.height);
  if (share > MAX_DIFF) {
    fs.writeFileSync(path.join(diffDir, `${name}-actual.png`), png); fs.writeFileSync(path.join(diffDir, `${name}-diff.png`), PNG.sync.write(diff));
    return { name, status: 'FAIL', detail: `${(share * 100).toFixed(2)} % of pixels differ` };
  }
  return { name, status: 'ok', detail: `${(share * 100).toFixed(2)} %` };
}

(async () => {
  fs.mkdirSync(baseDir, { recursive: true }); fs.rmSync(diffDir, { recursive: true, force: true }); fs.mkdirSync(diffDir, { recursive: true });
  const server = spawn(process.execPath, [path.join(root, 'server.js')], { stdio: 'ignore', env: { ...process.env, PORT: String(port) } });
  const results = [];
  try {
    await waitForServer();
    const browser = await chromium.launch();
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: !!vp.mobile, isMobile: !!vp.mobile, serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-03-10T12:00:00Z'));
      await page.addInitScript(screen => {
        localStorage.setItem('morbid-profile-v1', JSON.stringify({ unlocked: 3, credits: 1234, tutorialDone: true, achievements: { 'first-race': Date.UTC(2026, 2, 1) }, stats: { races: 12, wins: 3, podiums: 5, km: 321, seconds: 5400 } }));
        localStorage.setItem('morbid-settings-v2', JSON.stringify({ perf: 'full', lang: 'en', screen, steering: 'touch' }));
      }, vp.mobile ? 'portrait' : 'landscape');
      await page.goto(`http://localhost:${port}/`); await page.evaluate(() => document.fonts.ready);
      await page.click('#health-accept'); await page.addStyleTag({ content: FREEZE });
      const mask = [page.locator('#boot'), page.locator('#app-version'), page.locator('#music-status')];
      for (const s of SCREENS) {
        if (s.open) { await page.click(s.open); }
        await page.waitForTimeout(150);
        const png = await page.locator(s.shot).first().screenshot({ mask, animations: 'disabled' });
        results.push(compare(`${vp.name}-${s.name}`, png));
        if (s.open) await page.click(`${s.shot.split(' ')[0]} [data-close-dialog]`);
      }
      await ctx.close();
    }
    await browser.close();
  } finally { server.kill(); }
  for (const r of results) console.log(`${r.status === 'FAIL' ? '✗' : '✓'} ${r.name}: ${r.status}${r.detail ? ' — ' + r.detail : ''}`);
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(failed ? `\n${failed} screen(s) changed — see visual-diff/, or run npm run visual -- --update if intended` : '\nno visual changes');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
