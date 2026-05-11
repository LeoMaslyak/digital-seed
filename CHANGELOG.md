# Changelog

All notable changes to Digital Seed will be documented in this file.

## [Unreleased]

(No new changes since `0.4.1-alpha`.)

## [0.4.1-alpha] - 2026-05-11
### Added
- `bun run seed hooks install` — installs the pre-commit secret-scan hook into `.git/hooks/pre-commit`. `bun run seed onboard` warns when the hook is missing. The hook is no longer something only `setup.sh` can install.
- `bun run seed hooks status` — reports whether the Digital Seed pre-commit hook is currently installed.
- `recipes/_template/README.md` — boilerplate for new integration recipes. Linked from `recipes/README.md` and `CONTRIBUTING.md`.
- `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues and points contributors at the docs-confusion template (used as the "ask a question" path) and the GitHub security advisory flow.
- `CODE_OF_CONDUCT.md` — Contributor Covenant-style baseline. Linked from `README.md` and `CONTRIBUTING.md`.
- `docs/simulated-public-alpha-readiness-2026-05-11.md` — consolidates findings from four isolated hostile audits run on `0.4.0-alpha` and records the P0/P1 fixes that became this release.

### Changed
- **README** now leads "Start in 15 minutes" with an explicit Prerequisites block (Git, Bun, terminal-capable AI agent) and links to troubleshooting + AI-agent install. The canonical path is restated as `bun install` + `bun run seed onboard`, with `./setup.sh` explicitly framed as the optional guided wizard. The status badge now links to `docs/known-alpha-limits.md` instead of an empty URL.
- **`docs/getting-started.md`** no longer suggests `./setup.sh` as the primary install step. It now leads with the canonical `bun install` + `bun run seed onboard` path; `setup.sh` is described as optional hand-holding.
- **`bun run seed onboard --plain`** explains, with terminal-anxious users in mind, how to open the three core context files (editor, `open`, `xdg-open`, `code`) and walks through the two-pane / copy-paste flow for `bun run seed first-prompt`.
- **`bun run seed first-prompt`** now prints a clear "copy the prompt below" header with delimiter rulers so beginners do not paste the wrong text.
- **`bun run seed recipe list`** prints a one-line description for each recipe (extracted from the recipe's README) instead of a slug-only blind pick. Lists the `recipes/_template/README.md` location for contributors.
- **`SECURITY.md`** rewritten for honesty: clarifies which `user/*.md` files are tracked starter templates vs. ignored personal data, documents that the pre-commit hook is opt-in via `bun run seed hooks install`, removes the unsubstantiated "every action logged to `logs/audit.jsonl`" claim (no such log is produced today), and clarifies that MCP servers are ordinary local processes with no Digital-Seed sandbox.
- **`docs/what-leaves-your-machine.md`** adds a complete table of Digital Seed's own outbound network calls: the npm registry during `bun install`, `r.jina.ai` during `bun run seed web ...`, Google Drive during maintainer `seed drive ...` commands, and the GitHub repo during `seed update`. The 15-minute beginner path does not hit any of these except npm.
- **`bun run seed web`** usage banner now includes a first-use Jina disclosure pointing at the network-calls doc.
- **`bun run seed privacy-scan`** adds a non-blocking warning for tracked `user/*.md` templates that look filled in (likely-personal `Name:`, `Email:`, `Phone:` lines).
- **`bun run seed doctor` / `bun run health`** updated to recommend `bun run seed hooks install` when the pre-commit hook is missing (was: "Run setup.sh to install").
- **PR template** restructured into scoped groups (docs-only, code, privacy, visual assets, release-impacting). Fresh-clone harness and visual-qa are now explicitly optional unless the relevant scope applies.
- **CONTRIBUTING.md** prefers `bun run seed doctor` as the canonical local health command and notes `bun run health` is an alias. Adds the recipe template pointer.
- **`user/README.md`** is honest about which templates are tracked (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) vs. which user files are ignored (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`), and warns about putting real content in tracked templates.
- **`.github/workflows/ci.yml`** now triggers on `v*` tag pushes and pins `oven-sh/setup-bun@v2` to `bun-version: 1.3.8` instead of `latest`.
- **`docs/release-checklist.md`** tag instruction bumped to `v0.4.1-alpha`.

### Notes
- This is a documentation and developer-experience polish release. It does not change the alpha trust contract: real external-tester walkthroughs and a green CI cycle on a tag commit are still required before any `1.0.0-rc.1` consideration. See `docs/production-readiness.md`.
- No new dependencies. No new external services exercised on the beginner path.

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
