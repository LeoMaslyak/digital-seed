# Repo Improvement Roadmap

This is the current practical backlog for making Digital Seed feel more polished and useful without turning it into a heavyweight platform.

## Highest leverage next steps

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

Remaining P1 polish before a larger public push:

- Local Markdown link checker.
- Examples gallery (student / founder / investor / researcher).
- `bun run seed onboard` optionally writes `user/FIRST-WIN.md`.
- Version metadata alignment with the next tag.

## Later, not urgent

- Add a small examples gallery for different user profiles: student, founder, investor, researcher.
- Add optional templates for weekly planning and project review.
- Add terminal demo media to docs only if repo size budget allows.

## Non-goals for now

- Do not turn the repo into a dashboard product.
- Do not require hosted vector databases or paid APIs for the first loop.
- Do not add messaging/email automation as a default setup step.
