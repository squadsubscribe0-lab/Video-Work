#!/usr/bin/env bash
# Fetches Remotion's official agent skills into .claude/skills/remotion-*.
# They are not committed because they are covered by the Remotion License
# (https://www.remotion.dev/license); this pulls the current version instead.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --quiet --depth 1 https://github.com/remotion-dev/skills "$tmp/skills"
mkdir -p .claude/skills
for dir in "$tmp"/skills/skills/remotion-*/; do
  name="$(basename "$dir")"
  rm -rf ".claude/skills/$name"
  cp -r "$dir" ".claude/skills/$name"
done
echo "Installed Remotion skills: $(ls -d .claude/skills/remotion-* | xargs -n1 basename | tr '\n' ' ')"
