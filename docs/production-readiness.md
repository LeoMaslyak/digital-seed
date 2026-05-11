# Production Readiness

Digital Seed is production-stable for public use as an alpha: a new user can clone it, run the first-15-minute path, create local context, and optionally use the public data room. CI runs the gate stack on macOS + Linux, the fresh-clone path is repeatable, and the data room publisher tolerates locked legacy files.

It is **not** 1.0 yet. The next objective is to turn the useful alpha into a production-grade, easy-to-use open-source project for strangers.

## Current status: broader-alpha ready (~80% toward production-grade OSS usability)

Digital Seed is no longer in “make it work” mode. It is now in **make it trustworthy, obvious, and boringly maintainable for strangers** mode. Milestones 3 (open-source usability) and 4 (product coherence) are shipped at the repo level; both still need real outside-contributor use to prove the flow.

Current usability scorecard:

- **Core concept / positioning:** ~90% — clear local-first personal AI context starter kit.
- **First-run beginner path:** ~85% — beginner surface is now narrow (onboard, doctor, first-prompt, privacy-scan, index, search, recipe list); still needs real-user walkthroughs.
- **Release engineering:** ~75% — unified release check, CI smoke, link/version checks, fresh-clone validation; needs repeated real release practice.
- **Docs / trust / safety:** ~80% — examples, troubleshooting, known limits, privacy caveats, and a dedicated “what leaves your machine?” trust page.
- **Open-source contributor readiness:** ~80% — tightened contributor guide, issue templates, PR template, and external-user reporting flow are in place; needs real contributor validation.
- **Product coherence:** ~80% — beginner / advanced / maintainer surfaces are explicitly labeled in CLI help and README; recipes are labeled official alpha-supported vs experimental/adapt-yourself.
- **External validation:** ~20–30% — real outside-user walkthroughs have not happened yet.

Overall assessment: **~80% of 100% usable OSS project**. Broader-alpha ready, not production-grade OSS / 1.0 yet.

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
- Examples gallery and troubleshooting guide are linked from README.
- `bun run seed onboard --write-first-win` creates an explicit first useful outcome file.
- `seed first-prompt` points to `user/FIRST-WIN.md` when present.
- Health and privacy scans pass locally.
- Health output now distinguishes clean pass from pass-with-warnings.
- Markdown link checker exists locally and in CI.
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

Status: shipped for alpha. Needs external-user validation before being considered production-grade.

Shipped:

- Examples gallery with fictional profiles: student, founder/operator, researcher/investor, freelancer/consultant.
- Optional onboarding output: `bun run seed onboard --write-first-win`, writing `user/FIRST-WIN.md` only when explicitly requested.
- `seed first-prompt` support for the chosen first win.
- Health output semantics: `passed`, `passed with warnings`, `failed`.

Also shipped:

- README / first-15-minutes “day one / not day one” guidance box.

Exit criteria:

- A new user can pick an example, edit three context files, write a first win, and paste a first prompt with no extra docs.
- `bun run health` no longer says “All checks passed” when warnings exist.

### Milestone 2 — Release engineering

Goal: releases are boring and repeatable.

Status: mostly shipped. Needs repeated real release practice and possibly one more CI packaging-smoke refinement.

Shipped:

- Local Markdown link checker.
- Link checker in CI.
- Unified `bun run seed release-check` / `bun run release:check` maintainer gate.
- Version consistency check for `package.json`, changelog, and release checklist tag instruction.
- CI-safe release check (`--ci --skip-install`) that avoids Drive credentials and fresh-clone recursion.
- Data-room dry-run gate as explicit maintainer-only opt-in (`--with-drive-dry-run --account EMAIL`).
- Consolidated `docs/release-checklist.md` around the single release-check command.

Remaining:

- Run the release check through at least one real tag/release cycle.
- Decide whether to add a CI-safe fresh-clone/package smoke job beyond the current local harness.

Exit criteria:

- Release gate can be run locally and in CI without remembering scattered commands.
- A failed link/version/data-room check blocks release confidence.

### Milestone 3 — Open-source usability

Goal: outside contributors/users can understand, debug, and extend it.

Status: shipped for alpha. Needs real outside issues/PRs before being considered production-grade.

Shipped:

- Tightened `CONTRIBUTING.md` for first-time external contributors.
- `docs/troubleshooting.md` covers Bun, Python/Pillow, Claude/Cursor/Windsurf, Drive/gog, privacy scan false positives, fresh-clone failures, and CI failures.
- Issue templates for bug report, docs confusion, and integration recipe request.
- PR template with privacy, docs, link-check, release-check, and fresh-clone reminders.
- Dedicated trust page: `docs/what-leaves-your-machine.md`.
- Clear beginner / advanced / maintainer-only command taxonomy in CLI help.

Exit criteria:

- A user can file a good issue without prior context.
- A contributor can make a docs/recipe PR without asking how the repo works.

### Milestone 4 — Product coherence

Goal: Digital Seed feels focused rather than like a broad toolbox.

Status: shipped for alpha. Needs real outside-user validation before being considered production-grade.

Shipped:

- `bun run seed help` BEGINNER section is exactly: onboard, doctor, first-prompt, privacy-scan, index, search, recipe list (plus the `--write-first-win` flag).
- README "Useful commands" matches the same beginner surface and explicitly notes that scheduler, digest, repo learning, web/drive tooling, Excel/deck generation, marketplace, and release commands are intentionally not in the day-one list.
- `docs/first-15-minutes.md` "Stop there" names the advanced commands that are not part of day one and points readers to `bun run seed help` for the full list.
- ADVANCED section in CLI help frames scheduler, digest, learn, web, drive, excel, deck, status, task, collab, intro, and recipe openclaw/hermes init as optional power-user tools you skip on day one.
- MAINTAINER / RELEASE section in CLI help groups marketplace publish/install/rate, update, tokens, health alias, visual-qa, Drive publishing, and release-check together with a "not for end users" warning.
- `docs/integration-recipes.md` labels each recipe as **Official alpha-supported** (Obsidian, Claude Code / Cursor / Windsurf) or **Experimental / adapt-yourself** (GitHub, Drive, Telegram/Discord/Slack, OpenClaw/Hermes), with an explicit status legend.

Exit criteria:

- `bun run seed help` is beginner-safe. ✅
- Advanced commands are discoverable but not part of the first-run promise. ✅
- Recipes carry an explicit status label. ✅
- Real outside users confirm the beginner surface still feels right — open.

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

## Immediate next sprint

Focus: prep for Milestone 5 — 1.0 candidate.

1. Run the first-15-minute path cold on a clean macOS and a clean Linux machine; capture any friction.
2. Invite 3–5 external testers to walk through onboarding and report where they got stuck.
3. Decide whether any ADVANCED commands should be deprecated, renamed, or split into a separate "labs" surface before 1.0.
4. Tighten `what-leaves-your-machine.md` with whatever real users surface as confusing.
5. Keep collecting outside-user friction from issues and PRs to validate Milestones 3 and 4.

## Next audit gate

Before calling Digital Seed production-grade or tagging a 1.0 candidate, run another hostile audit focused on external-user usability, not just alpha release gates.

## Release recommendation

Current honest status: `0.4.0-alpha`, broader-alpha ready.

Do **not** call this `1.0` until the production-grade milestones above are complete and validated with external-user walkthroughs.
