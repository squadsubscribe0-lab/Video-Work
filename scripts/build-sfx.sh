#!/usr/bin/env bash
# Rebuilds assets/sfx. Kenney (CC0) sounds come from a soundcn checkout:
#   git clone --depth 1 https://github.com/kapishdima/soundcn /tmp/soundcn
#   bash scripts/build-sfx.sh /tmp/soundcn/assets
set -euo pipefail
K="${1:?path to soundcn/assets}"
cd "$(dirname "$0")/../assets/sfx"
c() { ffmpeg -loglevel error -y -i "$1" -ac 1 -ar 44100 ${3:-} -b:a 128k "$2.mp3"; }
c "$K/kenney_interface-sounds/drop_002.ogg" pop
c "$K/kenney_interface-sounds/select_002.ogg" click
c "$K/kenney_interface-sounds/tick_001.ogg" tick
c "$K/kenney_interface-sounds/glitch_002.ogg" glitch
c "$K/kenney_interface-sounds/confirmation_002.ogg" ding
c "$K/kenney_impact-sounds/impactGeneric_light_002.ogg" thud
c "$K/kenney_sci-fi-sounds/lowFrequency_explosion_000.ogg" boom "-af afade=t=out:st=1.2:d=0.8"
c "$K/kenney_sci-fi-sounds/forceField_001.ogg" shimmer
# Procedural ones
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=0.7:c=pink:a=0.9" \
  -af "highpass=f=250,lowpass=f=2800,afade=t=in:d=0.4:curve=exp,afade=t=out:st=0.4:d=0.3,volume=1.6" -ac 1 -b:a 128k whoosh.mp3
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=0.32:c=white:a=0.8" \
  -af "highpass=f=900,lowpass=f=6000,afade=t=in:d=0.16:curve=exp,afade=t=out:st=0.16:d=0.16" -ac 1 -b:a 128k whip.mp3
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=1.6:c=pink:a=0.6" -f lavfi -i "aevalsrc=0.25*sin(2*PI*(120*t+180*t*t)):d=1.6" \
  -filter_complex "[0]highpass=f=400,lowpass=f=5000[n];[n][1]amix=inputs=2:normalize=0,afade=t=in:d=1.45:curve=exp,afade=t=out:st=1.5:d=0.1,volume=1.5" \
  -ac 1 -b:a 128k riser.mp3
