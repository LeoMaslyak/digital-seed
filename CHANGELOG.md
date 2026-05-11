# Changelog

All notable changes to Digital Seed will be documented in this file.

## [Unreleased]
### Added
- `docs/supported-platforms.md` — explicit stance: macOS + Linux supported in CI, WSL2 best-effort, Windows-native out of scope.
- `docs/demo-transcript.md` — fictional first 15-minute walkthrough that readers can skim before cloning.
- `docs/first-useful-outcomes.md` — concrete first-win shapes (weekly plan, project priority list, notes search, first draft, weekly reflection) plus shapes to defer.
- `docs/hostile-1.0-readiness-audit-prompt.md` — reusable pre-1.0 audit prompt that asks "would calling this 1.0 be dishonest?" and focuses on blockers, not polish.

### Changed
- `docs/production-readiness.md` now includes a "Release candidate discipline" section with explicit `1.0.0-rc.1` and `1.0.0` gates, honest red flags, and the version-bump rule (`package.json` ↔ `CHANGELOG.md` ↔ release checklist).
- Milestone 5 in `docs/production-readiness.md` is annotated as "prep in progress" with shipped repo-side prep and the open real-validation gates.
- `docs/release-checklist.md` points to the RC discipline section and the hostile 1.0 audit prompt for any 1.0-flavored tag.
- `docs/repo-improvement-roadmap.md` lists Milestone 5 repo-side prep as shipped and frames the remaining work as real-user validation.
- `docs/known-alpha-limits.md` now links to the supported-platforms doc.
- README guides section adds the demo transcript, first useful outcomes, and supported platforms entries.
- `docs/first-15-minutes.md` links to the demo transcript and first-useful-outcomes doc from the head and "Stop there" sections.

### Notes
- Version stays at `0.4.0-alpha`. Repo is broader-alpha ready with Milestone 5 *prep* shipped; real external-tester validation is still required before any `1.0.0-rc.1` consideration.

## [0.4.0-alpha] - 2026-05-11
### Added
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs install, health, privacy scan, visual QA, onboard, first-prompt, and Markdown link checks on `ubuntu-latest` and `macos-latest` for every push and PR.
- `scripts/fresh-clone-check.sh` — repeatable fresh-clone validation harness backed by `git archive`, with timing and a clean teardown.
- `docs/fresh-clone-validation.md` — what the harness covers, expected output on a clean clone, last verified run, troubleshooting.
- `docs/examples/` — fictional student, founder/operator, researcher/investor, and freelancer/consultant examples for first-15-minute onboarding.
- `docs/troubleshooting.md` — common fixes for Bun, Python/Pillow, AI agent CLIs, Drive/gog, privacy scan, fresh-clone validation, and CI failures.
- `scripts/check-markdown-links.ts` plus `bun run check:links` for local Markdown link validation.
- `bun run seed onboard --write-first-win` to create `user/FIRST-WIN.md` as an explicit first useful outcome.
- `--no-delete`, `--replace-strategy {delete,skip-delete}`, and `--strict` flags on `scripts/publish-data-room.ts` for publishing into folders with locked legacy files.

### Changed
- Data room publisher now warns and falls back to skip-delete per file when Drive returns a permission error, instead of hard-failing the run.
- README first screen tightened to lead with 15-minute promise → quick start → data room → who-for/not-for; CI badge added.
- README and public data-room starter copy now use `bun install` + `bun run seed onboard` as the low-friction quick start, with `./setup.sh` framed as the optional guided wizard.
- README and `docs/first-15-minutes.md` link to examples and troubleshooting.
- `seed first-prompt` now points to `user/FIRST-WIN.md` when present.
- `seed help` now separates beginner, optional recipes/search, advanced, and maintainer/release commands.
- Health check output now distinguishes clean pass from pass-with-warnings.
- `docs/release-checklist.md` references the fresh-clone harness, CI coverage, and `--no-delete` recovery path.
- `docs/data-room-guide.md` documents the permission-fallback strategy matrix and avoids stale user-facing v0.3 folder labeling.
- `docs/production-readiness.md` and `docs/repo-improvement-roadmap.md` updated to reflect broader-alpha status, ~72% production-grade usability assessment, completed Milestone 2 release engineering, and Milestone 3 open-source usability as the next sprint.

## [0.3.1-alpha] - 2026-05-11
### Added
- Premium generated Digital Seed hero loop with GitHub-dark edge blending, bushier fruit-bearing mature canopy, MP4/WebM/GIF/still/SVG fallbacks, and documented generation notes.
- Terminal-native `bun run seed intro` visual plus `bun run seed onboard --plain`.
- Public data room publisher: `bun run seed drive publish-data-room`.
- Visual QA guardrail: `bun run seed visual-qa`.
- Production readiness and release checklist docs.

### Changed
- README now leads with the 15-minute promise and the live public data room.
- Beginner docs now defer to the first-15-minute path instead of duplicating it.
- Public data room moved to a clean folder owned by the publishing account.

## [0.3.0-alpha] - 2026-05-10
### Changed
- Repositioned Digital Seed as a free-first, local-first, agent-neutral starter kit.
- Added the first-15-minute path: `bun run seed onboard` / `bun run seed init` and `docs/first-15-minutes.md`.
- Hid and then removed the built-in dashboard from the default product surface; added dashboard alternatives guidance.
- Strengthened local retrieval: `bun run seed index <folder>` keeps a JSON search mirror for `bun run seed search`.
- Added public alpha expectation docs and audit-response documentation.
- Cleaned stale DAI-era naming, public placeholders, and private/course-style residue.

### Added
- `bun run seed doctor`
- `bun run seed first-prompt`
- `bun run seed privacy-scan`
- `bun run seed recipe list`
- `bun run seed recipe openclaw init`
- `bun run seed recipe hermes init`
- `docs/known-alpha-limits.md`
- `docs/dashboard-options.md`

## [0.2.0-alpha] - 2026-03-19
### Added
- Excel template generator: `bun run seed excel dcf|ratios|project`
- Slide deck generator: `bun run seed deck project|strategy|finance`
- `--fill` mode: AI-generated topic-specific deck content (model-agnostic)
- `scripts/lib/ai-call.ts`: provider detection chain (Claude → OpenAI → Gemini → direct API)
- Knowledge graph seeding from setup wizard (`scripts/seed-graph.ts`)
- Setup wizard now collects real goals
- `seed update` command with safe version management

## [0.1.0-alpha] - 2026-03-18
### Added
- Initial release
- Core CLI (`bun run seed`)
- Pattern marketplace with bundled patterns and skill packs
- Collaboration layer (shared projects + learning groups)
- Daily digest
- Knowledge graph MCP server
- Activity state detection
- Offline mode
- Repo bot (learn + search)
- Interactive setup wizard
