# Hostile Production-Alpha Audit — 2026-05-11

Scope: hostile but constructive production-alpha audit after the `0.4.0-alpha` gate work. Intended status: production-stable alpha, not 1.0.

## Verdict

**Ready for broader alpha announcement, with one caveat:** announce it honestly as a local-first starter kit for people comfortable running a few terminal commands, not as a polished consumer app.

The core promise is now materially true: a public user can clone the repo, install dependencies, run the first-15-minute path, generate the first prompt, and inspect public supporting material. The remaining issues are trust/UX polish, not launch blockers.

## Evidence: commands run

All required production-alpha checks were run for real on macOS 25.4 arm64 with Bun 1.3.8.

- `git status --short` — **PASS** at audit start: clean.
- `bun install` — **PASS**, no dependency changes.
- `bun run health` — **PASS with warnings treated as alpha guidance**. Local repo: 7/7 context files, Claude CLI, MCP files, patterns, pre-commit hook. Fresh clone: warns that only starter context files are present and setup hook is not installed, but exits successfully.
- `bun run seed privacy-scan` — **PASS**, no common private leftovers found.
- `bun run seed visual-qa` — **PASS**: 640x277, 72 frames, 5.76s, infinite loop, 0.0% edge drift, 0.9% loop seam.
- `bun run seed onboard --plain` — **PASS**, prints the canonical five-step path.
- `bun run seed first-prompt` — **PASS**, prints a short agent-start prompt.
- `bash scripts/fresh-clone-check.sh` — **PASS**, validates install + health + privacy + visual QA + onboard + first prompt from a tracked-file archive.
- `bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com` — **PASS**, found the clean public folder and planned 34 uploads, 0 skipped, 0 failed.

Additional hostile checks:

- Local Markdown link scan across root/docs/recipes — **PASS**, 0 broken local Markdown links found.
- Version/link scan — **FIXED during audit**: README and data-room starter copy no longer put the interactive setup wizard in the main 15-minute quick start; public data-room guide no longer labels the current folder as v0.3.
- CI workflow inspection — **PASS** for current gate scope: checkout, setup Bun, setup Python, install Pillow, `bun install --frozen-lockfile`, health, privacy scan, visual QA, onboard plain, first prompt on Ubuntu and macOS.

## Top 10 findings, ranked

1. **Main README quick start was too heavy for the 15-minute promise.** It told users to run `./setup.sh`, which is an interactive seven-step wizard and can ask about providers/API keys/profile details. That contradicts the current low-friction first-run path. **Fixed:** README now uses `bun install` + `bun run seed onboard`, with `./setup.sh` as optional guided wizard.
2. **Public data-room starter copy repeated the same heavy quick start.** Non-technical data-room users would hit the same wizard complexity. **Fixed:** data-room copy now mirrors README.
3. **Data-room docs still displayed `v0.3` while the repo is `0.4.0-alpha`.** This creates stale-version distrust even though the link and publisher are current. **Fixed:** public folder label is now generic `Digital Seed — Public Starter Kit` in the guide.
4. **Health check says “All checks passed” even when warnings are shown.** In a fresh clone, missing setup hook and partial starter context are expected, but the output can look self-contradictory. Not a launch blocker, but it should eventually say “Passed with warnings.”
5. **The first useful win is still mostly delegated to the AI agent.** `first-prompt` is intentionally short, but a true beginner may want a concrete example of what “useful this week” means.
6. **No automated link checker yet.** Manual/local scan passed, but this should become a release gate before repeated public announcements.
7. **CI does not run the fresh-clone harness.** It runs the same core commands directly, which is fine, but the local archive harness catches packaging assumptions CI might miss.
8. **Maintainer-only Drive command is visible in release docs.** Correct for maintainers, but users may mistake data-room publishing for a normal first-run step. Current README does not push it as a beginner action, so this is acceptable.
9. **Visual polish supports the product, but it is close to becoming a distraction if expanded further.** The current hero/terminal visual is fine; do not spend another cycle on visuals before examples/first-win UX.
10. **Repo still exposes older broad subsystems in help output.** Excel/deck/digest/scheduler/web/drive commands are useful later, but they make the CLI look bigger than the first-15-minute promise.

## Top 10 improvements, ranked by leverage/effort

1. Add a tiny examples gallery: student, founder, researcher/investor.
2. Make `bun run seed onboard --write-first-win` create `user/FIRST-WIN.md` after explicit confirmation.
3. Change health output to “Passed with warnings” when warn checks exist.
4. Add a local Markdown link checker and run it in CI.
5. Add one concrete sample first-prompt transcript using fictional data.
6. Add a “What not to do on day one” box to the README or first-15-minutes guide.
7. Hide advanced CLI sections behind `bun run seed help advanced` later, or visually separate beginner commands from legacy/power-user commands.
8. Add CI job for `scripts/fresh-clone-check.sh` or a lightweight equivalent.
9. Add a maintainer-only note beside Drive publishing commands in release/data-room docs.
10. Add a one-page trust page: privacy boundaries, local files, provider caveat, and explicit non-goals.

## Next implementation plan

### P0 — must fix before announcement

No remaining P0 launch blockers found after the small quick-start/data-room doc fixes in this audit.

### P1 — should fix soon

- Add examples gallery for 2-3 fictional user profiles.
- Add local Markdown link checker and wire it into CI.
- Improve health output semantics for warnings.
- Add optional `FIRST-WIN.md` generation after user confirmation.

### P2 — later polish

- Advanced/help command separation.
- Sample transcript/demo using fictional user data.
- CI fresh-clone harness job.
- More recipe-specific validation.

## Safe fixes implemented in this audit

- `README.md`: quick start now uses `bun install` instead of `./setup.sh`; wizard is framed as optional.
- `docs/data-room/readme-what-this-is.md`: same quick-start correction for public data-room readers.
- `docs/data-room-guide.md`: removed stale `v0.3` public folder label from user-facing guide text.
