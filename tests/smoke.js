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
      await ctx.addInitScript(() => localStorage.setItem('morbid-scenes-v1', '99')); // the cutscenes are checked in the iPhone run
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
    // Apple: iPhone Safari user agent and no fullscreen API (as on a real iPhone). The game must pick the MP3s,
    // hide the useless fullscreen button and still run a race without errors.
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'en-GB',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' });
      await ctx.addInitScript(() => {
        for (const k of ['fullscreenEnabled', 'webkitFullscreenEnabled']) Object.defineProperty(Document.prototype, k, { get: () => false, configurable: true });
        Element.prototype.requestFullscreen = undefined;
      });
      const page = await ctx.newPage(), errors = [], lines = [], audio = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (/\.(mp3|webm)$/.test(r.url())) audio.push(r.url().split('/').pop()); });
      await page.route('**/game.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'game.js'), 'utf8').replace('  function startDownloads() {', HOOKS + '  function startDownloads() {') }));
      const step = async (label, fn) => {
        try { await fn(); lines.push(`  ✓ ${label}`); } catch (e) { failures++; lines.push(`  ✗ ${label}: ${String(e.message).split('\n')[0]}`); }
      };
      // A slow soundtrack download: the start button must wait for it.
      let release; const held = new Promise(r => { release = r; });
      await page.route(/Morbid_Fingers[^/]*\.(mp3|webm)$/, async r => { await held; await r.continue(); });
      await page.goto(server.url); await page.waitForTimeout(1200);
      if (await page.isVisible('#rotate-overlay')) await page.tap('#rotate-switch');
      if (await page.isVisible('#health-screen')) await page.tap('#health-accept');
      await step('start button is disabled while the soundtrack downloads', async () => {
        if (!await page.isDisabled('#start')) throw new Error('enabled');
        const label = (await page.textContent('#start')).trim(); if (!/^LOADING \d+%/.test(label)) throw new Error(`label "${label}"`);
      });
      await page.screenshot({ path: path.join(shots, 'iphone-safari-1-loading.png') });
      release();
      await step('start button opens once everything is downloaded', async () => {
        await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 15000 });
        if (!/ENTER THE RACE/.test(await page.textContent('#start'))) throw new Error('label not restored');
      });
      await step('fullscreen button is hidden without the fullscreen API', async () => { if (await page.isVisible('#fullscreen')) throw new Error('visible'); });
      await step('soundtrack and voices load as MP3', async () => {
        if (!audio.length) throw new Error('no audio requested');
        const webm = audio.filter(f => f.endsWith('.webm')); if (webm.length) throw new Error(`WebM requested: ${webm.slice(0, 3).join(', ')}`);
      });
      await step('the first race opens with the elevator ride, which can be skipped', async () => {
        await page.tap('#start'); await page.waitForTimeout(800);
        const mode = await page.evaluate(() => window.__smoke.mode());
        if (mode !== 'intro') throw new Error(`mode is ${mode}`);
        await page.tap('#dj-skip'); await page.waitForTimeout(2800);
      });
      await step('race starts after the countdown with the music playing', async () => {
        await page.waitForTimeout(3600);
        const mode = await page.evaluate(() => window.__smoke.mode());
        if (mode !== 'racing') throw new Error(`mode is ${mode}`);
        const music = await page.evaluate(() => { const a = document.querySelector('audio'); return { paused: a.paused, src: a.src.slice(0, 5), t: a.currentTime }; });
        if (music.paused || music.src !== 'blob:' || !(music.t > 1)) throw new Error(`music ${JSON.stringify(music)}`);
      });
      if (errors.length) { failures++; lines.push(`  ✗ page errors: ${errors.join(' | ')}`); }
      console.log(`iphone-safari\n${lines.join('\n')}`);
      await ctx.close();
    }
    await browser.close();
  } finally { server.stop(); }
  console.log(failures ? `\n${failures} smoke check(s) failed` : '\nall smoke checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
