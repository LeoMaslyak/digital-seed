# Changelog

All notable changes to Digital Seed will be documented in this file.

## [0.2.0-alpha] - 2026-03-19
### Added
- Excel template generator: `bun run seed excel dcf|ratios|case`
- Slide deck generator: `bun run seed deck case|strategy|finance`
- `--fill` mode: AI-generated topic-specific deck content (model-agnostic)
- `scripts/lib/ai-call.ts`: provider detection chain (Claude → OpenAI → Gemini → direct API)
- Knowledge graph seeding from setup wizard (`scripts/seed-graph.ts`)
- Setup wizard now collects real goals in Step 4
- `dai update` command with safe version management

## [0.1.0-alpha] - 2026-03-18
### Added
- Initial release
- Core CLI (`bun run seed`)
- Pattern marketplace with 7 patterns + 3 skill packs
- Collaboration layer (shared projects + learning groups)
- Daily digest
- Knowledge graph MCP server
- Activity state detection
- Offline mode
- Repo bot (learn + search)
- Interactive setup wizard (6 steps)
