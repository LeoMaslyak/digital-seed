# Audit Response — 2026-05-10

> This audit predates the 2026-05-11 and 2026-05-12 audit passes. See docs/simulated-public-alpha-readiness-2026-05-11.md for the current status.

Digital Seed received an independent hostile audit before broader promotion. The audit conclusion was useful and blunt: the idea is strong, but the repository looked mid-refactor and risked feeling performative.

This document records what was changed in response.

## Cleanup completed in this pass

- Fixed the broken rename artifacts documented in the hostile audit.
- Removed visible placeholder wording from public-facing files.
- Replaced legacy product branding with Digital Seed / Seed terminology.
- Renamed public MCP/tool identifiers and package scopes to Seed / Digital Seed naming.
- Removed seeded private/course-style collaboration examples (`ikea-sustainability`, `finance-group-a`).
- Removed the stale built-in dashboard from the product surface.
- Added setup profiles to the setup wizard:
  - Simple local workspace
  - Notes/documents search
  - Project/GitHub helper
  - Always-on assistant later
- Added beginner CLI affordances:
  - `bun run seed doctor`
  - `bun run seed first-prompt`
  - `bun run seed privacy-scan`
  - `bun run seed recipe list`
  - `bun run seed recipe openclaw init`
  - `bun run seed recipe hermes init`
  - `bun run seed index <folder>`
  - `bun run seed search "query"`
- Kept Digital Seed free-first and local-first: local JSON fallback retrieval remains available when LanceDB is not installed.

## Second cleanup pass

Additional cleanup after the first response:

- Verified the previous commit was clean and pushed.
- Tightened free-first local retrieval: `bun run seed index <folder>` now keeps a JSON search mirror so `bun run seed search "query"` can work without hosted vector infrastructure.
- Updated free-first docs to show the exact index/search loop.
- Updated architecture docs to describe the local JSON mirror plus optional LanceDB path.
- Removed the remaining security-contact placeholder.
- Removed the built-in dashboard from the default product surface and added `docs/dashboard-options.md` to point users to mature adaptable dashboard projects instead.
- Added `bun run seed onboard` and `docs/first-15-minutes.md` so new users have one obvious first path before optional infrastructure.
- Tightened README around what Digital Seed is / is not, and added `docs/known-alpha-limits.md` for transparent public-alpha expectations.

## Remaining alpha caveats

- Some legacy aliases remain intentionally for compatibility, especially the legacy project alias in deck/Excel generators.
- Some specialist packs still contain finance/strategy/project-analysis language. They should be reframed as optional examples, not the default product identity.
- Full TypeScript verification is still blocked by missing optional MCP/dev dependencies in this checkout, not only by source syntax.

## Promotion guidance

Do not pitch this as a polished platform yet. Pitch it as an alpha workshop/repo for building personal AI infrastructure, with explicit rough edges and a strong local-first philosophy.
