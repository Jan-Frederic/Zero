// Lighthouse audit of the deploy build (_site, minified, gzipped like GitHub Pages) with minimum scores per category.
// Reports land in lighthouse/ (HTML + JSON, uploaded as a CI artifact). Run: npm run lighthouse
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const serve = require('./serve');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..'), out = path.join(root, 'lighthouse');
const MIN = { performance: .7, accessibility: .9, 'best-practices': .9, seo: .9 };

(async () => {
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  execFileSync(process.execPath, [path.join(root, 'tools', 'build-site.js')], { stdio: 'inherit' });
  const server = await serve({ ROOT: path.join(root, '_site') });
  let failed = 0;
  try {
    execFileSync('npx', ['--yes', 'lighthouse@12.8.2', server.url, '--quiet', '--output=json', '--output=html', `--output-path=${path.join(out, 'report')}`,
      `--only-categories=${Object.keys(MIN).join(',')}`, '--chrome-flags=--headless=new --no-sandbox --disable-gpu'],
    { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'report.report.json'), 'utf8'));
    for (const [id, min] of Object.entries(MIN)) {
      const score = report.categories[id].score;
      const ok = score >= min; if (!ok) failed++;
      console.log(`${ok ? '✓' : '✗'} ${report.categories[id].title}: ${Math.round(score * 100)} (minimum ${Math.round(min * 100)})`);
    }
    const failing = Object.values(report.audits).filter(a => a.score !== null && a.score < .5 && a.scoreDisplayMode === 'binary').map(a => a.title);
    if (failing.length) console.log(`\nfailed audits:\n- ${failing.join('\n- ')}`);
  } finally { server.stop(); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
