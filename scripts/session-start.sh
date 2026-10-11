#!/usr/bin/env bash
# SessionStart hook: makes a fresh (cloud) Claude Code session ready to work.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install --no-fund --no-audit >/dev/null 2>&1
[ -d .claude/skills/remotion-best-practices ] || bash scripts/install-remotion-skills.sh >/dev/null 2>&1 || true
