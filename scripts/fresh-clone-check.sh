#!/usr/bin/env bash
# Digital Seed — fresh-clone validation script.
#
# Copies the current working tree into a temp directory outside the repo,
# runs install + the production-readiness gates, and reports timing.
# Use this before a release to make sure a user cloning from scratch can run
# the first-15-minute path without hand-holding.
#
# Usage:
#   scripts/fresh-clone-check.sh [--keep] [--git-clone REMOTE_URL]
#
# Flags:
#   --keep              Do not remove the temp directory at the end. Prints the
#                       path so you can poke around the clean environment.
#   --git-clone URL     Clone from a remote URL instead of copying the local
#                       working tree (slower but tests the real fetch path).

set -euo pipefail

KEEP=0
GIT_REMOTE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep) KEEP=1; shift ;;
    --git-clone) GIT_REMOTE="$2"; shift 2 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
WORK_DIR="$( mktemp -d -t digital-seed-fresh-clone-XXXXXX )"
trap 'if [ "$KEEP" -eq 0 ]; then rm -rf "$WORK_DIR"; fi' EXIT

echo "Digital Seed — fresh-clone validation"
echo "  source:    $REPO_DIR"
echo "  workdir:   $WORK_DIR"
echo

mkdir -p "$WORK_DIR/digital-seed"
if [ -n "$GIT_REMOTE" ]; then
  echo "→ git clone $GIT_REMOTE"
  rm -rf "$WORK_DIR/digital-seed"
  git clone --depth 1 "$GIT_REMOTE" "$WORK_DIR/digital-seed"
else
  echo "→ git archive HEAD → $WORK_DIR/digital-seed (only tracked files; matches a clean clone)"
  ( cd "$REPO_DIR" && git archive --format=tar HEAD ) | tar -x -C "$WORK_DIR/digital-seed"
fi

cd "$WORK_DIR/digital-seed"

run_step() {
  local label="$1"; shift
  local start end
  start=$(date +%s)
  echo
  echo "────────────────────────────────────────"
  echo "▶ $label"
  echo "  \$ $*"
  echo "────────────────────────────────────────"
  if "$@"; then
    end=$(date +%s)
    echo "✅ $label ($((end-start))s)"
  else
    local rc=$?
    end=$(date +%s)
    echo "❌ $label failed (exit $rc, $((end-start))s)"
    exit $rc
  fi
}

run_step "bun install"                bun install --frozen-lockfile
run_step "bun run health"             bun run health
run_step "seed privacy-scan"          bun run seed privacy-scan
run_step "seed visual-qa"             bun run seed visual-qa
run_step "seed onboard --plain"       bun run seed onboard --plain
run_step "seed first-prompt"          bun run seed first-prompt

echo
echo "✅ Fresh-clone validation passed."
echo "   uname: $(uname -srm)"
echo "   bun:   $(bun --version 2>/dev/null || echo 'missing')"
echo "   node:  $(node --version 2>/dev/null || echo 'missing')"
echo "   python:$(python3 --version 2>/dev/null || echo 'missing')"

if [ "$KEEP" -eq 1 ]; then
  echo
  echo "Workdir kept at: $WORK_DIR"
fi
