# Production Readiness

Digital Seed is now production-stable for public use as an alpha: a new user can clone it, run the first-15-minute path, create local context, and optionally use the public data room. CI runs the gate stack on macOS + Linux, the fresh-clone path is repeatable, and the data room publisher tolerates locked legacy files. It remains intentionally an alpha starter kit, not a polished consumer app.

## Current status: production-stable alpha

Shipped and verified:

- README leads with the 15-minute promise and clear quick start.
- `bun run seed onboard` is the canonical first-run flow.
- `bun run seed onboard --plain` supports no-animation/no-color environments.
- `bun run seed intro` provides the locked terminal visual direction.
- Hero visual is generated, documented, GitHub-dark embedded, and checked by visual QA.
- Mature hero phase now has a visibly bushier canopy plus fruit nodes.
- Public Google Drive data room is live and refreshed from local sources.
- `bun run seed drive publish-data-room` publishes the data room manifest.
- `bun run seed visual-qa` checks hero dimensions, duration, loop flag, edge color, and seam.
- Beginner docs are mostly consolidated around `docs/first-15-minutes.md`.
- Health and privacy scans pass locally.

Current public data room:

<https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG>

## Production-ready definition

Digital Seed should be considered production-ready for public use when these are all true:

1. **First-run reliability** — a fresh user can clone, install, run `bun run seed onboard`, `bun run seed doctor`, and `bun run seed first-prompt` without hand-holding on macOS/Linux.
2. **Safety clarity** — docs consistently explain what stays local, what is optional, and what requires explicit user permission.
3. **No private residue** — privacy scan passes and README/docs contain no private, project-internal, or founder-specific leftovers.
4. **Release repeatability** — visual assets, data room sync, health checks, privacy scan, and changelog update are captured in a release checklist.
5. **Automated guardrails** — at minimum, CI runs health/privacy/visual-QA or clearly documents why CI is deferred.
6. **Support expectations** — alpha limits, security reporting, contribution flow, and known unsupported setups are explicit.

## Remaining blockers before production-stable

### P0 — must fix before calling it production-stable

All P0 items have shipped. Recap:

- **Release checklist** — `docs/release-checklist.md` covers health, privacy, visual QA, data room dry-run/live sync, README/docs review, changelog, tag.
- **Fresh-clone test** — `scripts/fresh-clone-check.sh` and `docs/fresh-clone-validation.md`. Verified on macOS 25.4 arm64 with bun 1.3.8.
- **Cross-platform smoke** — CI runs the gate stack on `ubuntu-latest` and `macos-latest` (`.github/workflows/ci.yml`).
- **CI** — `.github/workflows/ci.yml` runs `bun install`, `bun run health`, `bun run seed privacy-scan`, `bun run seed visual-qa`, `bun run seed onboard --plain`, and `bun run seed first-prompt` on every push and PR.
- **Data room publish hardening** — `scripts/publish-data-room.ts` ships `--no-delete`, `--replace-strategy {delete,skip-delete}`, and `--strict`. The default delete strategy now warns and falls back per-file on permission errors instead of hard-failing.

### P1 — should fix before a larger public announcement

- **README tightening pass:** ✅ — first screen now leads with 15-minute promise, quick start, data room callout, and who-this-is-for/not-for, in that order. CI badge added.
- **Link checker:** add a simple local docs link check for Markdown links and Drive/data-room references.
- **Examples gallery:** add 2-3 tiny user profiles: student, founder, researcher/investor. Each should show which context files to edit first.
- **Onboarding UX polish:** make `seed onboard` optionally write a local checklist file, e.g. `user/FIRST-WIN.md`, after user confirmation.
- **Version metadata:** align `package.json`, changelog, README badges, and release tag for the next alpha.

### P2 — nice later

- Add terminal-demo GIF/MP4 under docs if repo size budget allows.
- Add optional weekly planning and project review templates.
- Add more robust local search ranking or optional semantic search path.
- Add integration-specific validation for recipes.

## Release recommendation

Do not call this `1.0`. With the P0 list complete, the honest next release is `0.4.0-alpha`:

- CI runs the gate stack on macOS + Linux.
- `scripts/fresh-clone-check.sh` makes the clean-environment smoke test repeatable.
- Data room publishing tolerates locked legacy files instead of hard-failing.
- README first screen is focused on outcome, install, and first prompt.

P1 items (link checker, examples gallery, onboarding `FIRST-WIN.md` write, version metadata alignment) remain optional polish before a larger public announcement.
