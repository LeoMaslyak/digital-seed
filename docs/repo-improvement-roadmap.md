# Repo Improvement Roadmap

This is the current practical backlog for making Digital Seed feel more polished and useful without turning it into a heavyweight platform.

## Current milestone sequence

Current assessment: **~80% of 100% usable OSS project**. Digital Seed is broader-alpha ready, with a coherent beginner / advanced / maintainer surface, but not production-grade / 1.0 yet.

See `docs/production-readiness.md` for the full production-grade definition. The short version:

1. **Beginner trust + first win** — examples gallery, optional `FIRST-WIN.md`, better first prompt, health warning semantics, day-one guidance.
2. **Release engineering** — link checker, CI link gate, fresh-clone CI smoke, version consistency check, data-room dry-run gate, release-check command.
3. **Open-source usability** — shipped for alpha: tightened contributing guide, troubleshooting doc, issue templates, PR template, trust page, command taxonomy.
4. **Product coherence** — shipped for alpha: beginner vs advanced vs maintainer-only command surfaces; recipes labeled official alpha-supported vs experimental/adapt-yourself.
5. **1.0 candidate** — supported-platform proof, external tester walkthroughs, precise privacy/security explanation, no maintainer-only beginner assumptions.

## Completed Milestone 4 product coherence work

Milestone 4 has shipped at the repo level. External-user validation is still needed before the surface can be called production-grade.

1. ~~**Beginner surface review**~~ ✅
   - `bun run seed help` BEGINNER section is now exactly: onboard, doctor, first-prompt, privacy-scan, index, search, recipe list.
   - README "Useful commands" matches the same beginner surface.
   - `docs/first-15-minutes.md` "Stop there" explicitly names the advanced commands that are *not* part of day one.

2. ~~**Advanced command labeling**~~ ✅
   - Scheduler, digest, learn, web, drive, excel, deck, status, task, collab, intro, recipe openclaw/hermes init now live under ADVANCED with a clear "skip on day one" framing.
   - `visual-qa` moved out of the beginner surface into MAINTAINER / RELEASE where it belongs.

3. ~~**Maintainer-only labeling**~~ ✅
   - MAINTAINER / RELEASE section now groups marketplace publish/install/rate, update, tokens, health alias, visual-qa, Drive publishing, and release-check together with a "not for end users" warning.

4. ~~**Recipe classification**~~ ✅
   - `docs/integration-recipes.md` now labels each recipe as **Official alpha-supported** (Obsidian, Claude Code / Cursor / Windsurf) or **Experimental / adapt-yourself** (GitHub, Drive, Telegram/Discord/Slack, OpenClaw/Hermes).
   - Adds a status legend and frames recipes as optional after the local loop is useful.

5. **External validation loop** — still open
   - Issue templates and PR template are in place from Milestone 3; first outside issues/PRs still pending.
   - Treat first external walkthroughs as validation, not as proof yet.
   - 2026-05-11: ran a simulated three-persona hostile audit (`docs/simulated-external-user-audit-2026-05-11.md`) and fixed the P0/P1 install-path contradictions it surfaced. This is a sanity check, not real external validation.

## Immediate next sprint — Milestone 5 prep

Now that the surface is coherent, the next gate is the run to a 1.0
candidate. Repo-side prep shipped 2026-05-11; the remaining work is
real-user validation, not more docs.

Shipped 2026-05-11 (Milestone 5 repo-side prep):

- `docs/supported-platforms.md` — explicit stance (macOS + Linux
  supported in CI, WSL2 best-effort, Windows-native out of scope).
- `docs/demo-transcript.md` — fictional first 15-minute walkthrough.
- `docs/first-useful-outcomes.md` — concrete first-win shapes (and
  what to defer).
- Release-candidate discipline section in `docs/production-readiness.md`
  with explicit `1.0.0-rc.1` / `1.0.0` gates.
- `docs/hostile-1.0-readiness-audit-prompt.md` — reusable pre-RC audit
  prompt focused on blockers, not polish.
- `docs/release-checklist.md` now points at the RC discipline and the
  1.0 audit prompt for any 1.0-flavored tag.

Open (Milestone 5 real-validation work, treated as the actual gate):

1. **Real** external tester walkthroughs — invite 3–5 people to run the first-15-minute path cold. Simulated persona audits do not substitute. **Open — P0 per the 2026-05-11 hostile 1.0 audit.**
2. One green CI release-check cycle on a tag commit (no tag has been cut yet, even at `0.4.1-alpha`). **Open — P0 per the 2026-05-11 hostile 1.0 audit.**
3. Cold runs of the first-15-minute path on a clean macOS *and* a clean Linux machine; capture friction in issues.
4. Tighten the privacy/security explanation in `what-leaves-your-machine.md` once real users push back on it. (One pass on 2026-05-11 clarified the `bun install` network nuance based on a simulated skeptic.)
5. Audit again for maintainer-only assumptions that sneak into beginner docs.
6. Decide whether any ADVANCED commands should be deprecated or split out before 1.0.
7. Address remaining P2 items from `docs/simulated-external-user-audit-2026-05-11.md` (CONTRIBUTING repo-shape gaps, ordering ambiguity in `seed onboard` step 3, privacy-scan deny-list commentary) and from `docs/hostile-1.0-readiness-audit-2026-05-11.md` (README data-room maintainer-only label, `SECURITY.md` privacy-scan pointer).
8. When both P0s above are closed, re-run `docs/hostile-1.0-readiness-audit-prompt.md`. Only after a clean verdict consider tagging `1.0.0-rc.1`.

## Completed Milestone 3 open-source usability work

1. ~~**Contributor guide tightening**~~ ✅
   - `CONTRIBUTING.md` now explains first-time contribution paths, repo shape, docs/recipe/code expectations, privacy rules, and maintainer review posture.

2. ~~**Issue templates**~~ ✅
   - Added `.github/ISSUE_TEMPLATE/bug_report.yml`.
   - Added `.github/ISSUE_TEMPLATE/docs_confusion.yml`.
   - Added `.github/ISSUE_TEMPLATE/integration_recipe_request.yml`.

3. ~~**PR template**~~ ✅
   - Added `.github/pull_request_template.md` with privacy, docs, check, release-check, and fresh-clone reminders.

4. ~~**External-user trust polish**~~ ✅
   - Added `docs/what-leaves-your-machine.md`.
   - Cross-linked it from README, SECURITY, troubleshooting, and known alpha limits.

5. ~~**Maintainer/contributor flow**~~ ✅
   - Kept the maintainer guidance concise inside `CONTRIBUTING.md` instead of adding another doc.

## Completed Milestone 2 release-engineering work

1. ~~**Unified release check**~~ ✅
   - `bun run seed release-check` is the canonical maintainer gate.
   - `bun run release:check` is available as a package script.

2. ~~**Version consistency check**~~ ✅
   - Release check verifies `package.json`, `CHANGELOG.md`, and release checklist tag instruction.

3. ~~**CI release smoke**~~ ✅
   - CI runs `bun run seed release-check --ci --skip-install` on macOS and Linux.
   - Public CI avoids Drive credentials and fresh-clone recursion.

4. ~~**Data-room dry-run gate**~~ ✅
   - Maintainer-only opt-in via `--with-drive-dry-run --account EMAIL`.

5. ~~**Release checklist consolidation**~~ ✅
   - `docs/release-checklist.md` now starts with the unified release check.

6. ~~**Day one / not day one guidance**~~ ✅
   - README and first-15-minutes include practical day-one boundaries.

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
- Decide whether to tag/publish `v0.4.1-alpha` after audit fixes.

Remaining P1 polish after the hostile audit:

- Real outside-user validation of the new contributor, issue, and beginner-surface flows.
- Continue sharpening security/privacy docs as integrations mature.

## Later, not urgent

- Add optional templates for weekly planning and project review.
- Add terminal demo media to docs only if repo size budget allows.

## Non-goals for now

- Do not turn the repo into a dashboard product.
- Do not require hosted vector databases or paid APIs for the first loop.
- Do not add messaging/email automation as a default setup step.
