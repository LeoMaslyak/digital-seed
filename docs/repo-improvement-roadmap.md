# Repo Improvement Roadmap

This is the current practical backlog for making Digital Seed feel more polished and useful without turning it into a heavyweight platform.

## Current milestone sequence

See `docs/production-readiness.md` for the full production-grade definition. The short version:

1. **Beginner trust + first win** — examples gallery, optional `FIRST-WIN.md`, better first prompt, health warning semantics, day-one guidance.
2. **Release engineering** — link checker, CI link gate, fresh-clone CI smoke, version consistency check, data-room dry-run gate, release-check command.
3. **Open-source usability** — tightened contributing guide, troubleshooting doc, issue templates, PR template, command taxonomy.
4. **Product coherence** — beginner vs advanced vs maintainer-only command surfaces; official vs experimental recipes.
5. **1.0 candidate** — supported-platform proof, external tester walkthroughs, precise privacy/security explanation, no maintainer-only beginner assumptions.

## Immediate next sprint — Milestone 2 release engineering

1. **Unified release check**
   - Add `bun run seed release-check` as the canonical maintainer gate.
   - It should run the local release checks already scattered across docs.

2. **Version consistency check**
   - Verify `package.json` version appears in `CHANGELOG.md` and release docs.
   - Fail clearly if docs reference a stale release/tag.

3. **Fresh-clone CI smoke**
   - Either run `scripts/fresh-clone-check.sh` in CI or add a CI-safe equivalent that avoids recursive expensive checks.

4. **Data-room dry-run gate**
   - Keep Drive publishing opt-in and maintainer-only.
   - Release check may run a dry-run only when credentials/account are available; otherwise it should skip with a clear warning, not fail public CI.

5. **Release checklist consolidation**
   - Update `docs/release-checklist.md` around the single release-check command.
   - Keep manual publish/tag steps explicit.

6. **Remaining beginner guidance**
   - Add the explicit “day one / not day one” guidance box to README and/or first-15-minutes.

## Completed high-leverage alpha/beginner work

1. ~~**Examples gallery**~~ ✅
   - `docs/examples/` includes fictional student, founder/operator, researcher/investor, and freelancer/consultant profiles.
   - README and first-15-minutes link to the gallery.

2. ~~**First-win onboarding**~~ ✅
   - `bun run seed onboard --write-first-win` creates `user/FIRST-WIN.md` only when explicitly requested.
   - `seed first-prompt` references `user/FIRST-WIN.md` when present.

3. ~~**Markdown link checker**~~ ✅
   - `scripts/check-markdown-links.ts` checks local Markdown links.
   - `bun run check:links` is wired into package scripts and CI.

4. ~~**Health warning semantics**~~ ✅
   - Health summary distinguishes clean pass from pass-with-warnings and failures.

5. ~~**Troubleshooting guide**~~ ✅
   - `docs/troubleshooting.md` covers Bun, Python/Pillow, AI agent CLIs, Drive/gog, privacy scan false positives, fresh-clone failures, and CI failures.

6. ~~**Command taxonomy cleanup**~~ ✅
   - `seed help` separates beginner, optional recipes/search, advanced, and maintainer/release commands.

## Earlier completed high-leverage alpha work

1. ~~**Data room publishing path**~~ ✅
   - `bun run seed drive publish-data-room` syncs the public folder from local sources.
   - Manual fallback (exact file list, Drive folder mapping) is in `docs/data-room-guide.md`.

2. ~~**README conversion pass**~~ ✅
   - Top of README leads with the "15-minute" promise, who-it-is-for / not-for, and the data room link.

3. ~~**First-run experience**~~ ✅
   - `bun run seed onboard` is now the canonical five-step path.
   - `bun run seed onboard --plain` for no animation or color.

4. ~~**Visual QA guardrail**~~ ✅
   - `bun run seed visual-qa` checks dimensions, frame count, duration, loop flag, edge color, and seam.

5. ~~**Docs deduplication**~~ ✅
   - `first-15-minutes.md` is the canonical short path.
   - `getting-started.md` and `setup-wizard.md` now defer to it instead of duplicating.

6. ~~**Release packaging draft**~~ ✅
   - `docs/release-checklist.md` now captures maintainer checks, visual QA, and data room publishing.

## Production-stable roadmap

See `docs/production-readiness.md` for the current production-stable alpha status.

P0 items shipped in this pass:

1. ✅ Fresh-clone test — `scripts/fresh-clone-check.sh` + `docs/fresh-clone-validation.md`.
2. ✅ CI / GitHub Actions — `.github/workflows/ci.yml` runs the gate stack on macOS + Linux.
3. ✅ Cross-platform smoke — same CI matrix covers macOS + Linux command behaviour.
4. ✅ Data room publish fallback — `--no-delete`, `--replace-strategy`, `--strict`; the default delete path now warns instead of hard-failing on permission errors.
5. ✅ README first-screen tightening — 15-minute promise, quick start, data room, who for / not for.

Next gate before a larger public push:

- Run the hostile production-alpha audit in `docs/hostile-audit-production-alpha-prompt.md`.
- Fix any P0 findings from that audit.
- Decide whether to tag/publish `v0.4.0-alpha` after audit fixes.

Remaining P1 polish after the hostile audit:

- Version metadata alignment with the next tag.
- Unified release check command.
- Fresh-clone CI smoke / release-gate consolidation.
- Remaining day-one/not-day-one guidance box.

## Later, not urgent

- Add optional templates for weekly planning and project review.
- Add terminal demo media to docs only if repo size budget allows.

## Non-goals for now

- Do not turn the repo into a dashboard product.
- Do not require hosted vector databases or paid APIs for the first loop.
- Do not add messaging/email automation as a default setup step.
