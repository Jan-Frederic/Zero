#!/usr/bin/env bash
# Generates the retro robot announcer clips in voice/ with espeak-ng + ffmpeg.
# Chain: espeak-ng robot variant -> ring modulation (metallic) -> short comb echo
# -> 7-bit crush at 11 kHz (8-bit-era sampler grit) -> band limit -> mono MP3.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p voice
# Alien: croaky voice pitched up, wobbling ring modulation and a thick chorus.
say_alien() { # slug, text
  local tmp; tmp=$(mktemp --suffix=.wav)
  espeak-ng -v en-us+croak -s 92 -p 30 -a 190 -g 6 -w "$tmp" "$2"
  ffmpeg -loglevel error -y -i "$tmp" -af "asetrate=22050*1.18,aresample=22050,aeval='val(0)*(0.35+0.65*sin(2*PI*(90+40*sin(2*PI*3*t))*t))':c=same,chorus=0.6:0.9:40|55|70:0.5|0.4|0.35:0.3|0.25|0.4:2|1.5|2.5,aecho=0.8:0.6:60|120:0.4|0.25,highpass=f=150,lowpass=f=5000,volume=2.4,alimiter=limit=0.95" -ac 1 -ar 22050 -b:a 48k "voice/$1.mp3"
  rm -f "$tmp"
}
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
say invasion-incoming "Warning! Invasion incoming!"
say_alien congratulations "Congratulations, earthling!"
say next-boss "Warning! Next boss approaching!"
# Boss death screams: a raw espeak cry bent into something inhuman for each boss.
scream() { # slug, text, voice, pitch, speed, ffmpeg filter chain
  local tmp; tmp=$(mktemp --suffix=.wav)
  espeak-ng -v "$3" -s "$5" -p "$4" -a 200 -w "$tmp" "$2"
  ffmpeg -loglevel error -y -i "$tmp" -af "$6,highpass=f=90,lowpass=f=7000,volume=2.6,alimiter=limit=0.95" -ac 1 -ar 22050 -b:a 48k "voice/$1.mp3"
  rm -f "$tmp"
}
scream scream-overlord "Aaaaaaarrrrrrrgggghhhhhh" en-us+croak 5 70 "asetrate=22050*0.72,aresample=22050,vibrato=f=6:d=0.6,aeval='val(0)*(0.4+0.6*sin(2*PI*28*t))':c=same,aecho=0.8:0.7:90|180:0.45|0.3"
scream scream-cyclops "Noooooooooooooooo" en-us+klatt3 95 75 "asetrate=22050*1.35,aresample=22050,vibrato=f=9:d=0.8,flanger=delay=4:depth=6:speed=1.5,aecho=0.8:0.6:120:0.4"
scream scream-maggot "Eeeeeeeeeeeeeeeeeeek" en-us+female5 99 90 "asetrate=22050*1.6,aresample=22050,vibrato=f=14:d=0.9,chorus=0.6:0.9:20|30:0.6|0.5:0.6|0.9:3|5,aecho=0.7:0.5:40:0.5"
scream scream-robot "Error. Error. System failure. Shutting dowwwn" en-us+UniversalRobot 25 115 "aeval='val(0)*(0.45+0.55*sin(2*PI*70*t))':c=same,aresample=8000,acrusher=bits=5:mode=lin:mix=0.9,aresample=22050,aecho=0.85:0.5:15|30:0.5|0.3"
# Nemesis rivals: a taunt and a defeat line each.
say taunt-vex "Vex here. You are going down, rookie!" en-us+female3 70
say down-vex "Impossible! Vex is out!" en-us+female3 70
say taunt-kronos "Kronos owns this track!" en-us+Mr_Serious 10
say down-kronos "Kronos will return!" en-us+Mr_Serious 10
say taunt-null9 "Null nine. Target acquired." en-us+UniversalRobot 5
say down-null9 "Null nine. Offline." en-us+UniversalRobot 5
say taunt-blaze "Ha! Eat my exhaust!" en-us+Andy 60
say down-blaze "Noooo, my beautiful ship!" en-us+Andy 60

# Opus copies (smaller; the game picks them where the browser can play WebM/Opus, else the MP3s).
for f in voice/*.mp3; do ffmpeg -hide_banner -loglevel error -y -i "$f" -ac 1 -c:a libopus -b:a 32k "${f%.mp3}.webm"; done
