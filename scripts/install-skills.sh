#!/usr/bin/env bash
# Fetches agent skills that can't be committed here (Remotion License / no license)
# into .claude/skills/. They're gitignored; this pulls the current upstream version.
#   - remotion-dev/skills: all remotion-* skills (official Remotion API rules)
#   - ncklrs/startup-os-skills: motion-designer, remotion-animation,
#     remotion-video-reviewer, remotion-performance-optimizer
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p .claude/skills

install() { # <src-dir>
  local name; name="$(basename "$1")"
  rm -rf ".claude/skills/$name"
  cp -r "$1" ".claude/skills/$name"
  echo "  $name"
}

echo "Installing skills:"
git clone --quiet --depth 1 https://github.com/remotion-dev/skills "$tmp/remotion"
for dir in "$tmp"/remotion/skills/remotion-*/; do install "${dir%/}"; done

git clone --quiet --depth 1 https://github.com/ncklrs/startup-os-skills "$tmp/ncklrs"
for name in motion-designer remotion-animation remotion-video-reviewer remotion-performance-optimizer; do
  # ncklrs ships its own remotion-best-practices; keep the official one.
  install "$tmp/ncklrs/skills/$name"
done
