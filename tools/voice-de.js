#!/usr/bin/env node
// Prints the German announcer line for a clip, read from the VOICE_DE table in src/09-audio.js
// (one source for the game's subtitles and tools/make-voice.sh). Usage: node tools/voice-de.js <clip>
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', '09-audio.js'), 'utf8');
const m = /const VOICE_DE = (\{[\s\S]*?\n {2}\});/.exec(src);
if (!m) { console.error('VOICE_DE table not found'); process.exit(1); }
const table = Function(`return ${m[1]}`)();
const clip = process.argv[2];
if (!clip) { console.log(Object.keys(table).join('\n')); process.exit(0); }
if (!table[clip]) { console.error(`no German line for ${clip}`); process.exit(1); }
console.log(table[clip]);
