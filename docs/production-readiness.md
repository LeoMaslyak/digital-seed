# Production Readiness

Digital Seed is production-stable for public use as an alpha: a new user can clone it, run the first-15-minute path, create local context, and optionally use the public data room. CI runs the gate stack on macOS + Linux, the fresh-clone path is repeatable, and the data room publisher tolerates locked legacy files.

It is **not** 1.0 yet. The next objective is to turn the useful alpha into a production-grade, easy-to-use open-source project for strangers.

## Current status: broader-alpha ready

Shipped and verified:

- README leads with the 15-minute promise and clear quick start.
- `bun run seed onboard` is the canonical first-run flow.
- `bun run seed onboard --plain` supports no-animation/no-color environments.
- `bun run seed intro` provides the locked terminal visual direction.
- Hero visual is generated, documented, GitHub-dark embedded, and checked by visual QA.
- Public Google Drive data room is live and refreshed from local sources.
- `bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com` passes against the clean public folder.
- `bun run seed visual-qa` checks hero dimensions, duration, loop flag, edge color, and seam.
- Beginner docs are mostly consolidated around `docs/first-15-minutes.md`.
- Health and privacy scans pass locally.
- Hostile production-alpha audit verdict: **ready for broader alpha announcement** (`docs/hostile-audit-production-alpha-2026-05-11.md`).

Current public data room:

<https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG>

## Production-grade definition

Digital Seed should be considered production-grade open source when these are all true:

1. **Beginner first win** — a stranger can understand the project in 60 seconds and get one useful outcome in 15 minutes without premature complexity.
2. **First-run reliability** — a fresh user can clone, install, run `bun run seed onboard`, `bun run seed doctor`, and `bun run seed first-prompt` without hand-holding on macOS/Linux.
3. **Safety clarity** — docs consistently explain what stays local, what is optional, what leaves the machine, and what requires explicit permission.
4. **No private residue** — privacy scan passes and README/docs contain no private, project-internal, or founder-specific leftovers.
5. **Release repeatability** — visual assets, data room sync, health checks, privacy scan, link checks, fresh-clone validation, and changelog update are captured in automated or checklist gates.
6. **Open-source usability** — issue templates, PR template, contributing guide, troubleshooting guide, and command taxonomy make it easy for external users to report problems and contribute.
7. **Product coherence** — beginner commands stay simple; advanced/legacy commands are clearly separated from the first-run path.
8. **Support expectations** — alpha limits, security reporting, contribution flow, supported platforms, and unsupported setups are explicit.

## Milestones to production-grade OSS

### Milestone 1 — Beginner trust + first win

Goal: a stranger understands what to do and gets one useful result quickly.

Must ship:

- Examples gallery with fictional profiles: student, founder/operator, researcher/investor, freelancer/consultant.
- Optional onboarding output such as `bun run seed onboard --write-first-win`, writing `user/FIRST-WIN.md` after confirmation.
- `seed first-prompt` support for the chosen first win.
- Health output semantics: `passed`, `passed with warnings`, `failed`.
- README / first-15-minutes “day one / not day one” guidance.

Exit criteria:

- A new user can pick an example, edit three context files, write a first win, and paste a first prompt with no extra docs.
- `bun run health` no longer says “All checks passed” when warnings exist.

### Milestone 2 — Release engineering

Goal: releases are boring and repeatable.

Must ship:

- Local Markdown link checker.
- Link checker in CI.
- Fresh-clone harness, or equivalent packaging smoke, in CI.
- Version consistency check for `package.json`, changelog, docs, and tags.
- Data-room dry-run gate.
- One maintainer release command/check, e.g. `bun run seed release-check`.

Exit criteria:

- Release gate can be run locally and in CI without remembering scattered commands.
- A failed link/version/data-room check blocks release confidence.

### Milestone 3 — Open-source usability

Goal: outside contributors/users can understand, debug, and extend it.

Must ship:

- Tightened `CONTRIBUTING.md` for first contributors.
- `docs/troubleshooting.md` covering Bun, Python/Pillow, Claude/Cursor/Windsurf, Drive/gog, privacy scan false positives, and fresh-clone failures.
- Issue templates for bug report, docs confusion, and integration recipe request.
- PR template with privacy/release checks.
- Clear beginner / advanced / maintainer-only command taxonomy.

Exit criteria:

- A user can file a good issue without prior context.
- A contributor can make a docs/recipe PR without asking how the repo works.

### Milestone 4 — Product coherence

Goal: Digital Seed feels focused rather than like a broad toolbox.

Must decide and implement:

- Which commands remain in the beginner surface.
- Which commands move to advanced/help sections.
- Which recipes are official vs experimental.
- Whether Excel/deck/digest/scheduler/web tools belong in the public main surface or advanced/legacy sections.

Recommendation:

- Keep the public surface brutally simple: context files, onboard, first prompt, privacy scan, local index/search, and recipes.
- Treat everything else as advanced until real users ask for it.

Exit criteria:

- `bun run seed help` is beginner-safe.
- Advanced commands are discoverable but not part of the first-run promise.

### Milestone 5 — 1.0 candidate

Goal: stable enough to recommend widely, not merely alpha-useful.

Must have:

- Reliable install on supported macOS + Linux versions.
- Clear Windows/WSL stance.
- CI green across supported platforms.
- No known P0/P1 docs contradictions.
- Security/privacy page strong enough for skeptical users.
- At least 5 external tester walkthroughs or equivalent fresh-user sessions.
- Changelog + semver discipline.
- Public examples/demo transcript using fictional data.
- Precise “what data leaves your machine?” explanation.
- No maintainer-only assumptions in the beginner path.

Exit criteria:

- Tagging `1.0.0` would feel honest, not aspirational.

## Immediate recommended sprint

1. Add examples gallery.
2. Add `FIRST-WIN.md` onboarding write path.
3. Add Markdown link checker + CI gate.
4. Fix health warning semantics.
5. Add troubleshooting guide.
6. Start command taxonomy cleanup.

## Next audit gate

Before calling Digital Seed production-grade or tagging a 1.0 candidate, run another hostile audit focused on external-user usability, not just alpha release gates.

## Release recommendation

Current honest status: `0.4.0-alpha`, broader-alpha ready.

Do **not** call this `1.0` until the production-grade milestones above are complete and validated with external-user walkthroughs.
