# Changelog

All notable changes to Digital Seed will be documented in this file.

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
