# Repo Improvement Roadmap

This is the current practical backlog for making Digital Seed feel more polished and useful without turning it into a heavyweight platform.

## Current milestone sequence

Current assessment: **~72% of 100% usable OSS project**. Digital Seed is broader-alpha ready, but not production-grade / 1.0 yet.

See `docs/production-readiness.md` for the full production-grade definition. The short version:

1. **Beginner trust + first win** — examples gallery, optional `FIRST-WIN.md`, better first prompt, health warning semantics, day-one guidance.
2. **Release engineering** — link checker, CI link gate, fresh-clone CI smoke, version consistency check, data-room dry-run gate, release-check command.
3. **Open-source usability** — tightened contributing guide, troubleshooting doc, issue templates, PR template, command taxonomy.
4. **Product coherence** — beginner vs advanced vs maintainer-only command surfaces; official vs experimental recipes.
5. **1.0 candidate** — supported-platform proof, external tester walkthroughs, precise privacy/security explanation, no maintainer-only beginner assumptions.

## Immediate next sprint — Milestone 3 open-source usability

1. **Contributor guide tightening**
   - Rewrite/tighten `CONTRIBUTING.md` for first-time external contributors.
   - Explain the simplest contribution paths: docs fixes, examples, recipes, bug reports.

2. **Issue templates**
   - Add `.github/ISSUE_TEMPLATE/bug_report.yml`.
   - Add `.github/ISSUE_TEMPLATE/docs_confusion.yml`.
   - Add `.github/ISSUE_TEMPLATE/integration_recipe_request.yml`.

3. **PR template**
   - Add `.github/pull_request_template.md` with privacy, docs, `bun run check:links`, and `bun run seed release-check --skip-fresh-clone` reminders.

4. **External-user trust polish**
   - Add or improve a short security/privacy trust page focused on “what data leaves your machine?”
   - Cross-link from README, known alpha limits, and troubleshooting.

5. **Maintainer/contributor flow**
   - If useful, add `docs/open-source-maintainer-guide.md` or a concise section in `CONTRIBUTING.md` for release/review expectations.

6. **Roadmap cleanup after implementation**
   - Mark Milestone 3 items shipped once templates/docs are in place.
   - Keep Milestone 4 product-coherence cleanup as the next target.

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
- Decide whether to tag/publish `v0.4.0-alpha` after audit fixes.

Remaining P1 polish after the hostile audit:

- Open-source contributor package: issue templates, PR template, tightened contributor guide.
- Security/privacy trust page focused on data boundaries.
- Product-coherence cleanup for advanced/legacy commands.

## Later, not urgent

- Add optional templates for weekly planning and project review.
- Add terminal demo media to docs only if repo size budget allows.

## Non-goals for now

- Do not turn the repo into a dashboard product.
- Do not require hosted vector databases or paid APIs for the first loop.
- Do not add messaging/email automation as a default setup step.
