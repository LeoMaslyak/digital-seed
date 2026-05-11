# Fresh-Clone Validation

A fresh-clone test answers one question: **can a new user clone the repo into a clean directory, install, and run the first-15-minute gates without hand-holding?**

The repeatable harness lives at `scripts/fresh-clone-check.sh`. It copies the tracked git tree into a temp directory outside the repo (so no `node_modules`, `data/`, `exports/`, `.env`, or private `user/` files leak in), runs `bun install`, and then walks the production-readiness gates in order.

## Run it

```bash
# Simulate a clone from this working tree.
bash scripts/fresh-clone-check.sh

# Simulate a real clone from GitHub.
bash scripts/fresh-clone-check.sh --git-clone https://github.com/LeoMaslyak/digital-seed.git

# Keep the temp workdir for poking around afterwards.
bash scripts/fresh-clone-check.sh --keep
```

Each step is timed and any non-zero exit aborts the run.

## What it covers

Gates run in a clean directory with **only the tracked files**, no prior `node_modules`, no `data/rag`, no Claude or `gog` credentials beyond whatever the host shell already has:

1. `bun install --frozen-lockfile`
2. `bun run health`
3. `bun run seed privacy-scan`
4. `bun run seed visual-qa`
5. `bun run seed onboard --plain`
6. `bun run seed first-prompt`

Expected behaviour on a clean clone before any user setup:

- **User context** is reported as `1/4 core` — `COMPASS.md`, `DOMAINS.md`, `ANTI-GOALS.md` are tracked; `USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md` are intentionally gitignored and created during onboard. This is a `⚠️` warning, not a `❌` failure.
- **Security hooks** show `Run setup.sh to install` — git hooks are installed by `setup.sh`, not by `bun install`. Also a warning.
- **AI provider** depends on the host: if `claude` CLI is on PATH or an `.env` exists, the gate passes; otherwise it warns. Health-check never exits non-zero, so CI is unaffected.
- All other gates should report `✅`.

## Last verified run

| Host | OS / arch | bun | node | python | Result |
|---|---|---|---|---|---|
| macOS Sonnet (publisher's laptop) | Darwin 25.4.0 arm64 | 1.3.8 | v25.9.0 | 3.14.3 | ✅ all gates green |

Linux coverage runs in CI on every push and PR via `.github/workflows/ci.yml` (matrix: `ubuntu-latest`, `macos-latest`).

Re-run this harness before tagging any release and paste the result into the release notes.

## When this fails

- **`bun install` fails:** bun lockfile drifted from `package.json`. Run `bun install` locally, commit the new `bun.lock`.
- **`visual-qa` fails:** the hero GIF was regenerated and broke a guardrail (dimensions, frames, loop seam). Re-run `python3 scripts/generate-visual-assets.py` and re-check.
- **`privacy-scan` fails:** committed text matches a private-residue pattern. Open the script (`scripts/seed.ts → privacyScan`) to see which regex hit.
- **`onboard --plain` prints colour codes:** plain mode is leaking ANSI. Check `USE_ANSI` handling in `scripts/seed.ts`.
