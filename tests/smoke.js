// Browser smoke test: boots the real game in Chromium on desktop and phone viewports, clicks through the
// home screen dialogs, races to the results screen and checks the German UI. Fails on any page error.
// Screenshots land in smoke-shots/ (uploaded as a CI artifact). Run: npm run smoke
const { chromium } = require('playwright');
const serve = require('./serve');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..'), shots = path.join(root, 'smoke-shots');
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 760 },
  { name: 'phone-portrait', width: 390, height: 844, mobile: true },
  { name: 'phone-landscape', width: 844, height: 390, mobile: true },
];
// Test hooks injected into the served game.js: read state and jump to the end of a won race.
const HOOKS = "  window.__smoke = { mode: () => mode, win: () => { ufos = []; bombs = []; rivals.forEach(r => { r.distance = -1e7; r.speed = 0; }); laps = [30, 31, 32, 30, 29]; distance = LENGTH * LAP_COUNT - 30; position = mod(distance, LENGTH); } };\n";

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const server = await serve();
  let failures = 0;
  try {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.mobile, isMobile: !!vp.mobile, serviceWorkers: 'block', locale: 'en-GB' });
      const page = await ctx.newPage(), errors = [], lines = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/game.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'game.js'), 'utf8').replace('  function startDownloads() {', HOOKS + '  function startDownloads() {') }));
      const tap = sel => vp.mobile ? page.tap(sel) : page.click(sel);
      const step = async (label, fn) => {
        try { await fn(); lines.push(`  ✓ ${label}`); } catch (e) { failures++; lines.push(`  ✗ ${label}: ${String(e.message).split('\n')[0]}`); }
      };
      await page.goto(server.url); await page.waitForTimeout(400);
      if (await page.isVisible('#rotate-overlay')) await tap('#rotate-switch');
      await step('health warning is shown and accepted', async () => {
        if (!await page.isVisible('#health-screen')) throw new Error('not visible');
        await tap('#health-accept');
      });
      await page.screenshot({ path: path.join(shots, `${vp.name}-1-home.png`) });
      for (const [button, dialog] of [['#open-shop', '#shop-screen'], ['#open-trophies', '#trophy-screen'], ['#open-stats', '#stats-screen'], ['#open-settings', '#settings-screen'], ['#open-changelog', '#changelog-screen']]) {
        await step(`${dialog.slice(1)} opens and closes`, async () => {
          await tap(button); await page.waitForTimeout(200);
          if (!await page.isVisible(dialog)) throw new Error('not visible');
          if (dialog === '#settings-screen') await page.screenshot({ path: path.join(shots, `${vp.name}-2-settings.png`) });
          await tap(`${dialog} [data-close-dialog]`); await page.waitForTimeout(150);
          if (await page.isVisible(dialog)) throw new Error('still visible');
        });
      }
      await step('race starts after the countdown', async () => {
        await tap('#start'); await page.waitForTimeout(4200);
        const mode = await page.evaluate(() => window.__smoke.mode());
        if (mode !== 'racing') throw new Error(`mode is ${mode}`);
      });
      await page.screenshot({ path: path.join(shots, `${vp.name}-3-race.png`) });
      await step('winning shows the results screen', async () => {
        await page.evaluate(() => window.__smoke.win()); await page.waitForTimeout(1500);
        if (!(await page.textContent('#result-position')).includes('01')) throw new Error('not P1');
        if (!await page.isVisible('#share')) throw new Error('share button missing');
      });
      await page.screenshot({ path: path.join(shots, `${vp.name}-4-results.png`) });
      await step('German language switch translates the UI', async () => {
        await page.evaluate(() => { window.morbidSettings.set('lang', 'de'); });
        await page.waitForTimeout(100);
        const text = await page.textContent('#again');
        if (!/NOCHMAL FAHREN/.test(text)) throw new Error(`got "${text.trim()}"`);
        await page.evaluate(() => { window.morbidSettings.set('lang', 'en'); });
        if (!/RACE AGAIN/.test(await page.textContent('#again'))) throw new Error('did not switch back');
      });
      if (errors.length) { failures++; lines.push(`  ✗ page errors: ${errors.join(' | ')}`); }
      console.log(`${vp.name}\n${lines.join('\n')}`);
      await ctx.close();
    }
    await browser.close();
  } finally { server.stop(); }
  console.log(failures ? `\n${failures} smoke check(s) failed` : '\nall smoke checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
