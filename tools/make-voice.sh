#!/usr/bin/env bash
# Generates the retro robot announcer clips in voice/ with espeak-ng + ffmpeg.
# Chain: espeak-ng robot variant -> ring modulation (metallic) -> short comb echo
# -> 7-bit crush at 11 kHz (8-bit-era sampler grit) -> band limit -> mono MP3.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p voice
say() { # slug, text [voice] [pitch]
  local tmp; tmp=$(mktemp --suffix=.wav)
  espeak-ng -v "${3:-en-us+UniversalRobot}" -s 118 -p "${4:-18}" -a 190 -g 4 -w "$tmp" "$2"
  ffmpeg -loglevel error -y -i "$tmp" -af "aeval='val(0)*(0.45+0.55*sin(2*PI*58*t))':c=same,aecho=0.85:0.55:9|17:0.45|0.3,aresample=11025,acrusher=bits=7:mode=lin:mix=0.85:samples=2,highpass=f=180,lowpass=f=3600,volume=2.2,alimiter=limit=0.95" -ac 1 -ar 22050 -b:a 48k "voice/$1.mp3"
  rm -f "$tmp"
}
say alien-killer "Alien killer!"
say fatality "Fatality!"
say ufo-obliterated "U F O obliterated!"
say abduct-this "Abduct this!"
say invasion-cancelled "Invasion cancelled!"
say close-encounter "Close encounter of the fatal kind!"
say saucer-smashed "Saucer smashed!"
say green-men-down "Green men down!"
say probe-denied "Probe denied!"
say area-51 "Area fifty one says thank you!"
say toasted-saucer "Toasted saucer!"
say mothership "Mothership will hear about this!"
say ultra-kill "Ultra kill!"
say galactic-humiliation "Galactic humiliation!"
say no-parking "No parking in my sky!"
say return-to-sender "Return to sender!"
# Female robot voice for the hyperdrive.
say hyperdrive-initiated "Hyperdrive initiated!" en-us+anikaRobot 62
say first-place "First place. Flawless victory!"
say mothership-warning "Warning! Mothership approaching!"
say mothership-down "Mothership destroyed. You are a legend!"
