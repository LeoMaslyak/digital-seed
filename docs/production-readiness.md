# Production Readiness

Digital Seed is production-stable for public use as an alpha: a new user can clone it, run the first-15-minute path, create local context, and optionally use the public data room. CI runs the gate stack on macOS + Linux, the fresh-clone path is repeatable, and the data room publisher tolerates locked legacy files.

It is **not** 1.0 yet. The next objective is to turn the useful alpha into a production-grade, easy-to-use open-source project for strangers.

## Current status: broader-alpha ready (8/10 external-user usefulness; ~85% production-grade OSS readiness)

*Scorecard updated 2026-05-14 after the final hero visual pass and current external-user usefulness review. See `docs/public-usability-roadmap.md` for the full milestone list.*

Digital Seed is no longer in "make it work" mode. It is now in **make it trustworthy, obvious, and boringly maintainable for strangers** mode.

Current usability scorecard:

- **Core concept / positioning:** ~92% — clear local-first personal AI context starter kit.
- **First-run beginner path:** ~88% — phases system, plan command, and agent prereq surfacing all shipped; still needs real-user walkthroughs to confirm.
- **Agent onboarding:** ~85% — Claude Code, Codex CLI, Gemini CLI, and Ollama all documented, detected by doctor, and covered in agent-chooser; honest Ollama caveats in place.
- **Feedback / friction reporting:** ~90% — `seed feedback`, first-run friction template, and GitHub-web PR path all live.
- **Phases / feature selection:** ~85% — phases doc, `seed plan`, setup wizard phase chooser all shipped.
- **Release engineering:** ~78% — unified release check, CI smoke, link/version checks, fresh-clone validation; needs repeated real release practice and a version bump for 2026-05-12 changes.
- **Docs / trust / safety:** ~83% — examples, troubleshooting, known limits, privacy caveats, what-leaves-your-machine, agent prereq warnings.
- **Open-source contributor readiness:** ~80% — issue templates, PR template, contributing guide, troubleshooting guide all in place; needs real contributor validation.
- **Product coherence:** ~82% — beginner / advanced / maintainer surfaces labeled in CLI, README, and docs.
- **External validation:** ~0% — zero real outside-user walkthroughs yet. This is the main remaining gap and the hard gate for any 1.0 tag.

Overall assessment: **8/10 as a public alpha for external users** and **~85% of 100% production-grade OSS readiness** without external users. External validation is the ceiling on the remaining 15%.

Next score-raising work, in priority order:

1. **Run 5 real first-time user walkthroughs.** Watch people clone the repo, choose an agent, run `bun run seed onboard`, and produce one useful output. Simulated audits do not count.
2. **Validate `seed what-next`.** After onboarding, users now get exactly one clear next action based on local state; real users need to confirm it helps.
3. **Verify Codex CLI, Gemini CLI, and Ollama end-to-end.** Keep any unverified path honestly labeled.
4. **Validate `seed first-prompt`.** The default first session now asks for one useful artifact; real users need to confirm it lands.
5. **Cut a fresh patch alpha release from current `main`.** The public release should match the improved README visual and docs.
6. **Close remaining P2 trust polish.** Make the public data room qualifier explicit and point `SECURITY.md` at `privacy-scan`.

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
- `bun run seed what-next` prints one local-state-based next action; onboarding
  now points users there after Phase 1.
- `seed first-prompt` now asks the agent to produce one concrete useful
  artifact before ending and points users to `seed feedback` after the first
  useful output.
- Commit `3eb98e5` (`feat: guide users to one next action`) passed
  `bun run seed release-check --ci --skip-install`, `bun run check:links`, and
  GitHub CI on macOS + Ubuntu.
- Codex CLI and Gemini CLI were internally validated on 2026-05-14 with
  headless read-only repo checks; Ollama was validated as a local model runner.
  See `docs/agent-path-validation-2026-05-14.md`.
- `docs/external-tester-guide.md` gives non-technical testers one path to try,
  clear privacy boundaries, and a copy-paste feedback template.
- `v0.4.3-alpha` release notes are drafted from current `main` so the public
  release can point at the tester guide, internal validation, CI cleanup, and
  hook cleanup without rewriting the existing `v0.4.2-alpha` tag.
- Health and privacy scans pass locally.
- Health output now distinguishes clean pass from pass-with-warnings.
- Markdown link checker exists locally and in CI.
- Hostile production-alpha audit verdict: **ready for broader alpha announcement** (`docs/hostile-audit-production-alpha-2026-05-11.md`).
- Simulated external-user audit: three hostile fresh-user personas walked through README → first-15-minutes → CLI help (`docs/simulated-external-user-audit-2026-05-11.md`). P0/P1 contradictions in the beginner install path were fixed in the same pass. This is *not* a substitute for real outside-tester walkthroughs.
- Hostile 1.0 readiness audit: verdict **1.0 would be dishonest - do not tag yet** (`docs/hostile-1.0-readiness-audit-2026-05-11.md`). Two P0s remain (real external testers; one green CI cycle on the tag commit) and one P1 contradiction in `docs/ai-agent-install.md` was fixed in the same pass. Repo subsequently shipped a public-alpha readiness pass and now sits at `0.4.1-alpha`; the 1.0 gates remain open.

Current public data room:

<https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG>

## Production-grade definition

Digital Seed should be considered production-grade open source when these are all true:

1. **Beginner first win** - a stranger can understand the project in 60 seconds and get one useful outcome in 15 minutes without premature complexity.
2. **First-run reliability** - a fresh user can clone, install, run `bun run seed onboard`, `bun run seed doctor`, and `bun run seed first-prompt` without hand-holding on macOS/Linux.
3. **Safety clarity** - docs consistently explain what stays local, what is optional, what leaves the machine, and what requires explicit permission.
4. **No private residue** - privacy scan passes and README/docs contain no private, project-internal, or founder-specific leftovers.
5. **Release repeatability** - visual assets, data room sync, health checks, privacy scan, link checks, fresh-clone validation, and changelog update are captured in automated or checklist gates.
6. **Open-source usability** - issue templates, PR template, contributing guide, troubleshooting guide, and command taxonomy make it easy for external users to report problems and contribute.
7. **Product coherence** - beginner commands stay simple; advanced/legacy commands are clearly separated from the first-run path.
8. **Support expectations** - alpha limits, security reporting, contribution flow, supported platforms, and unsupported setups are explicit.

## Milestones to production-grade OSS

### Milestone 1 - Beginner trust + first win

Goal: a stranger understands what to do and gets one useful result quickly.

Status: shipped for alpha. Needs external-user validation before being considered production-grade.

Shipped:

- Examples gallery with fictional profiles: student, founder/operator, researcher/investor, freelancer/consultant.
- Optional onboarding output: `bun run seed onboard --write-first-win`, writing `user/FIRST-WIN.md` only when explicitly requested.
- `seed first-prompt` support for the chosen first win.
- Health output semantics: `passed`, `passed with warnings`, `failed`.

Also shipped:

- README / first-15-minutes "day one / not day one" guidance box.

Exit criteria:

- A new user can pick an example, edit three context files, write a first win, and paste a first prompt with no extra docs.
- `bun run health` no longer says "All checks passed" when warnings exist.

### Milestone 2 - Release engineering

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

### Milestone 3 - Open-source usability

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

### Milestone 4 - Product coherence

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
- Real outside users confirm the beginner surface still feels right - open.

### Milestone 5 - 1.0 candidate

Goal: stable enough to recommend widely, not merely alpha-useful.

Status: **prep in progress.** Repo-side scaffolding for the 1.0 candidate
(supported-platform stance, fictional demo transcript, first-use outcome
examples, RC discipline doc, reusable hostile 1.0 audit prompt) is shipped.
Real external validation is still the gating step before any `1.0.0-rc.1` tag.

Shipped (repo-side prep, 2026-05-11):

- [Supported Platforms](supported-platforms.md) - explicit stance:
  macOS + Linux supported in CI, WSL2 best-effort, Windows-native out of
  scope.
- [Demo Transcript](demo-transcript.md) - fictional first 15-minute
  walkthrough that a stranger can read end-to-end before cloning.
- [First Useful Outcomes](first-useful-outcomes.md) - concrete examples
  of the boring real win the alpha is built around.
- [Release Candidate Discipline](#release-candidate-discipline) (this
  doc) - what must be true before tagging `1.0.0-rc.1` or `1.0.0`.
- [Hostile 1.0 Readiness Audit Prompt](hostile-1.0-readiness-audit-prompt.md)
  - reusable audit prompt for the final pre-RC gate.

Must have before `1.0.0-rc.1`:

- Reliable install on supported macOS + Linux versions (CI green on at
  least one full release cycle).
- Clear Windows/WSL stance (shipped).
- CI green across supported platforms.
- No known P0/P1 docs contradictions in the beginner path.
- Security/privacy page strong enough for skeptical users (see
  [What Leaves Your Machine?](what-leaves-your-machine.md)).
- At least 5 **real** external tester walkthroughs or equivalent
  fresh-user sessions. Simulated persona audits do not count.
- Changelog + semver discipline (no silent version drift).
- Public examples/demo transcript using fictional data only (shipped).
- Precise "what data leaves your machine?" explanation (shipped).
- No maintainer-only assumptions in the beginner path.
- A final hostile 1.0 readiness audit answering: "would calling this 1.0
  be dishonest?" (prompt shipped; the audit itself is the gate).

Exit criteria:

- Tagging `1.0.0-rc.1` would feel honest, not aspirational.
- Tagging `1.0.0` after a 2-4 week RC soak would feel honest, not
  aspirational.

## Release candidate discipline

The jump from `0.x.y-alpha` to `1.0.0` is not a polish exercise - it is a
trust contract. This section defines the discipline that protects that
contract.

### What `1.0.0-rc.1` means

`1.0.0-rc.1` is the **first** version that says: "if we ship this exact
state as 1.0, we would not be lying." It is not a marketing milestone.

To tag `1.0.0-rc.1`, all of these must be true:

1. The Milestone 5 "must have" list above is satisfied.
2. The release-check gate
   (`bun run seed release-check --skip-fresh-clone` + at least one local
   `scripts/fresh-clone-check.sh` run) is green on the tag commit.
3. CI is green on `ubuntu-latest` and `macos-latest` for the tag commit.
4. The reusable hostile 1.0 audit prompt
   ([`hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md))
   has been run in a fresh session and produced a "ready for 1.0" verdict
   with no open P0/P1 blockers.
5. At least 5 real external testers have walked the first-15-minute path
   (any platform combination of macOS + Linux + WSL2), with their
   friction captured in issues or PRs and either fixed or explicitly
   deferred with rationale.
6. `CHANGELOG.md` has an `[1.0.0-rc.1]` section that names everything
   shipped since the last alpha and links to relevant issues/PRs.

### What `1.0.0` means

`1.0.0` is `1.0.0-rc.1` after a 2-4 week RC soak in which **no P0
regressions** were reported, all P1 fixes from the RC period are merged,
and at least one additional fresh external tester confirms the path.

`1.0.0` does **not** mean:

- "the project is done" - alpha-style improvement continues.
- "every command is supported" - beginner/advanced/maintainer split is
  load-bearing, and only the beginner surface carries the 1.0 trust
  contract.
- "every integration recipe is production-grade" - recipes keep their
  "Official alpha-supported" vs "Experimental / adapt-yourself" labels.

### Honest red flags that block `1.0.0`

Stop and re-cut RCs if any of these is true the day before tagging:

- README or `docs/first-15-minutes.md` was edited in the last 7 days
  in a way that changes the first-run path.
- Any docs contradict each other on a load-bearing command.
- The fresh-clone harness has not been run on the tag commit.
- The audit prompt has not been re-run against the tag commit.
- No external tester has walked the path on the current main in the
  last 30 days.

### How to bump the version

Version strings live in three places and must move together:

- `package.json` → `"version"`
- `CHANGELOG.md` → new `## [X.Y.Z] - YYYY-MM-DD` entry
- `docs/release-checklist.md` → the `git tag vX.Y.Z` instruction

The release-check enforces this. Do not bump just one.

### Until then

The current honest version is `0.4.1-alpha`. Do not change it without
either (a) tagging another `0.4.x-alpha` follow-up patch with a clear
justification in `CHANGELOG.md`, or (b) cutting `1.0.0-rc.1` with the
discipline above. There is no in-between.

## Immediate next sprint

Focus: prep for Milestone 5 - 1.0 candidate. Repo-side prep is shipped
(2026-05-11). The remaining work is real-user validation.

1. Run the first-15-minute path cold on a clean macOS and a clean Linux machine; capture any friction.
2. Invite 3-5 **real** external testers to walk through onboarding and report where they got stuck. Simulated persona audits are useful for cleanup but cannot replace real friction.
3. Decide whether any ADVANCED commands should be deprecated, renamed, or split into a separate "labs" surface before 1.0.
4. Tighten `what-leaves-your-machine.md` with whatever real users surface as confusing.
5. Keep collecting outside-user friction from issues and PRs to validate Milestones 3 and 4.
6. Periodically re-run a simulated hostile-persona audit (cheap) but treat it strictly as a sanity check, not validation.
7. When the external-tester bar is met, run the reusable hostile 1.0 audit prompt and only then consider tagging `1.0.0-rc.1`.

## Next audit gate

Before calling Digital Seed production-grade or tagging a 1.0 candidate,
run the reusable hostile 1.0 audit prompt at
[`hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md).
The audit must explicitly answer "would calling this 1.0 be dishonest?"
and focus on blockers, not polish.

The most recent run of that audit
([`docs/hostile-1.0-readiness-audit-2026-05-11.md`](hostile-1.0-readiness-audit-2026-05-11.md))
returned **"1.0 would be dishonest - do not tag yet"** with two open
P0s: (1) no real external testers, and (2) no green CI cycle on a tag
commit. Re-run the prompt only after both can be answered with
evidence.

## Release recommendation

Current honest status: `0.4.1-alpha`, broader-alpha ready with Milestone 5
repo-side prep shipped and a consolidated simulated public-alpha audit
applied (see [`simulated-public-alpha-readiness-2026-05-11.md`](simulated-public-alpha-readiness-2026-05-11.md)).

Do **not** call this `1.0` (or even `1.0.0-rc.1`) until:

1. The Milestone 5 "must have" list is satisfied.
2. The release-candidate discipline above is followed.
3. The hostile 1.0 readiness audit returns a clean verdict.
