#!/usr/bin/env node
// Builds game.js from the source parts in src/ (concatenated in file-name order).
// The parts share one closure, so they are plain fragments of a single IIFE, not ES modules.
// Usage: node tools/build.js          -> writes game.js
//        node tools/build.js --check  -> exits 1 if game.js is out of date
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'src');
const parts = fs.readdirSync(dir).filter(f => /^\d+-.*\.js$/.test(f)).sort();
const out = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
const target = path.join(root, 'game.js');
if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (current !== out) { console.error('game.js is out of date: run `npm run build`'); process.exit(1); }
  console.log(`game.js is up to date (${parts.length} parts)`);
} else {
  fs.writeFileSync(target, out);
  console.log(`built game.js from ${parts.length} parts (${out.split('\n').length} lines)`);
}
