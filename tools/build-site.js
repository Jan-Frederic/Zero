#!/usr/bin/env node
// Builds the deployable site in _site/: copies the app files and minifies the JavaScript and CSS with esbuild.
// Used by the deploy job and by the Lighthouse check. Usage: node tools/build-site.js
const fs = require('fs'), path = require('path');
const esbuild = require('esbuild');
const root = path.join(__dirname, '..'), out = path.join(root, '_site');
const FILES = ['index.html', 'sw.js', 'manifest.webmanifest', 'og-image.jpg', 'CHANGELOG.md', '.nojekyll'];
const DIRS = ['icons', 'voice', 'fonts'];
const MINIFY = ['game.js', 'pwa.js', 'style.css', 'effects.css'];

fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of FILES) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of fs.readdirSync(root)) if (/\.(mp3|webm)$/.test(f)) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
let before = 0, after = 0;
for (const f of MINIFY) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const { code } = esbuild.transformSync(src, { loader: f.endsWith('.css') ? 'css' : 'js', minify: true, target: f.endsWith('.css') ? ['chrome100', 'safari15', 'firefox100'] : 'es2020', legalComments: 'none' });
  fs.writeFileSync(path.join(out, f), code); before += src.length; after += code.length;
}
console.log(`_site built: JS/CSS ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB minified`);
