# Production Readiness

Digital Seed is now usable as a public alpha: a new user can clone it, run the first-15-minute path, create local context, and optionally use the public data room. It is not yet a "production-stable" release in the sense of automated CI, versioned releases, and broad cross-platform validation.

## Current status: public-alpha ready

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

- **Release checklist:** add a single checklist for maintainers: health, privacy scan, visual QA, data room dry-run/live sync, README link check, changelog, tag/release.
- **Fresh clone test:** test from a clean directory without existing `node_modules`, local data, or cached credentials; document exact result.
- **Cross-platform smoke:** verify macOS and Linux command behavior, especially ANSI intro fallback and Python/Pillow/ffmpeg assumptions for optional visual generation.
- **CI decision:** either add GitHub Actions for `bun run health`, `bun run seed privacy-scan`, and `bun run seed visual-qa`, or explicitly defer CI with rationale.
- **Data room publish hardening:** support a "replace by upload without delete" fallback or document the clean-folder workflow, because file-level Drive permissions can block deletion in older shared folders.

### P1 — should fix before a larger public announcement

- **README tightening pass:** reduce remaining feature sprawl below the fold; keep the first screen focused on outcome, install, and first prompt.
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

Do not call this `1.0`. The honest next release is:

- `0.4.0-alpha` if we add CI/release checklist/fresh-clone validation.
- `0.3.1-alpha` if we only ship visual/data-room/onboarding polish.

Recommended next move: ship `0.4.0-alpha` after the P0 list is complete.
