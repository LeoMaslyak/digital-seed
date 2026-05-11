# Hostile 1.0 Readiness Audit — 2026-05-11

> **Audit question:** Would calling Digital Seed 1.0 be dishonest today?
>
> **One-line verdict:** Yes — `1.0` (and `1.0.0-rc.1`) would be dishonest
> today. The repo is honest at `0.4.0-alpha` and should stay there.
>
> **Recommended release target after this audit:** continue at
> `0.4.0-alpha`. Do not bump to `0.5.0-alpha` (no new functionality to
> justify it) and do not cut `1.0.0-rc.1` (Milestone 5 real-validation
> gate is open).

This audit was run against the proposed version under audit `1.0.0-rc.1`,
following the reusable prompt in
[`docs/hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md).
It is read + run + report, with one small targeted fix to remove a
beginner-path contradiction the simulated audit missed.

## Verdict

> **1.0 would be dishonest — do not tag yet.**

Not because the repo is sloppy. The opposite: the repo is honest at
`0.4.0-alpha`, the docs say so plainly, the `Milestone 5` definition in
`docs/production-readiness.md` already names the gates that are open
(real external testers, one green CI release cycle on the tag commit, a
clean hostile-audit verdict), and `package.json`, `CHANGELOG.md`, and
`docs/release-checklist.md` agree on the version string.

1.0 would be dishonest specifically because two of the Milestone 5
"must have" items are not yet true:

- No real outside testers have walked the first-15-minute path. Only one
  simulated three-persona pass (`docs/simulated-external-user-audit-2026-05-11.md`)
  has been done. The audit prompt is explicit: "If a real external user
  encountered it on a fresh clone, would they feel lied to by the 1.0
  label?" Without real outside testers, the answer cannot be "no."
- CI has not been observed green on a tag commit through a full release
  cycle. The workflow exists, the matrix is right, the gates run, but
  the `0.4.0-alpha` tag has not actually been cut, so there is no
  tagged green CI run to point at.

Both items are explicitly named in
[`docs/production-readiness.md` → Milestone 5](production-readiness.md#milestone-5--10-candidate)
as 1.0 prerequisites. They cannot be closed inside an audit. They
require time and other people.

Nothing in this audit changes that. The repo did not lie. The repo also
is not 1.0.

## Evidence — commands run on 2026-05-11

```text
git status --short        →  (clean)
git log --oneline -n 10   →  fd249fc Ship Milestone 5 1.0-candidate readiness prep
                              3f3c7f4 Run simulated external-user audit and fix P0/P1 install-path issues
                              4bb96be Tighten product coherence for Milestone 4
                              3fcdd85 Improve open-source usability
                              434f2a3 Document usability roadmap status
                              ef67799 Add release engineering gate
                              11bc586 Improve beginner production readiness
                              7eeef5d Audit production alpha readiness
                              fd21490 Add hostile production audit handoff
                              7125509 Ship production-stable alpha gates (0.4.0-alpha)

bun run health            →  ✅ User context · ✅ AI provider · ✅ MCP servers
                              ✅ Patterns · ✅ Security hooks · "All checks passed."
bun run seed privacy-scan →  ✅ "Privacy scan clean: no common private leftovers found."
bun run seed visual-qa    →  ✅ dimensions / frame count / duration / loop flag /
                              edge color / loop seam all pass.
bun run check:links       →  ✅ all 58 Markdown files clean.
bun run seed release-check --skip-fresh-clone
                          →  8 passed · 0 failed · 2 skipped
                             (fresh-clone harness + Drive dry-run intentionally skipped)
bash scripts/fresh-clone-check.sh
                          →  ✅ Fresh-clone validation passed (Darwin arm64, bun 1.3.8)
```

Every gate the repo defines for `0.4.0-alpha` passes. Nothing in the
gate stack disagrees with the current version string.

## 1.0 blocker questions — answered

| # | Question | Answer | Evidence |
| - | - | - | - |
| A | README accurate at `1.0`? | **No** at 1.0; **yes** at 0.4.0-alpha. | `README.md` lines 11, 142–143 plainly say "alpha software," "intentionally a starter kit." No 1.0 wording. |
| B | First-15-min path works on a fresh clone with CI evidence? | **Yes** for `0.4.0-alpha` on macOS via local fresh-clone harness; CI matrix exists but no 1.0 tag commit to point at. | `bash scripts/fresh-clone-check.sh` green; `.github/workflows/ci.yml` runs on push/PR. |
| C | macOS + Linux green in CI for the tag commit? | **Not for a 1.0 tag.** Matrix is correct; tag commit does not exist yet. | `.github/workflows/ci.yml` runs `ubuntu-latest` + `macos-latest`; no tag has been cut on this repo (no observed release history). |
| D | Windows/WSL2 stance explicit and honest? | **Yes.** | `docs/supported-platforms.md` table: macOS + Linux supported, WSL2 best-effort, Windows-native not supported. |
| E | Docs contradictions in the beginner path? | **One small one fixed in this pass** (see "Fixes" below). Otherwise none found. | `docs/ai-agent-install.md` previously told the agent to run `./setup.sh` and to fill six context files at once, contradicting the README's "canonical 15-minute experience" + "rough notes are fine" guidance. |
| F | `what-leaves-your-machine.md` accurate for every beginner command? | **Yes.** | The doc names the four beginner commands (`bun install`, `onboard`, `doctor`, `first-prompt`) and clarifies the npm-registry fetch nuance for `bun install`. |
| G | `production-readiness.md` claims status the repo cannot back up? | **No.** | The doc is explicit: ~80% toward production-grade, broader-alpha ready, Milestone 5 prep shipped, **not** 1.0 yet. |
| H | CHANGELOG has a real entry for the proposed version? | **No 1.0 entry exists**, which is the honest state. The `[Unreleased]` block names what is shipped on top of `0.4.0-alpha`. | `CHANGELOG.md` lines 5–22. |
| I | At least 5 real external testers walked the path? | **No.** Only simulated. | `docs/simulated-external-user-audit-2026-05-11.md` is the only outside-user pass; its caveat says it is not a substitute for real testers. |
| J | Alpha-only commands fenced off from the beginner surface? | **Yes.** | `bun run seed help` BEGINNER vs ADVANCED vs MAINTAINER taxonomy; `docs/first-15-minutes.md` "Stop there"; `README.md` "Useful commands" matches the beginner subset. |
| K | Integration recipes labeled Official vs Experimental? | **Yes.** | `docs/integration-recipes.md` status legend; Obsidian + Claude Code/Cursor/Windsurf are Official, GitHub/Drive/Telegram/Discord/Slack/OpenClaw/Hermes are Experimental. |
| L | Any docs overpromise (production-grade, enterprise, audited, multi-tenant)? | **No false claims found.** | `production-grade` only appears as a future goal explicitly **not** yet claimed. No "enterprise," "secure-by-default," "battle-tested," "multi-tenant," or "audited" in user-facing docs. |
| M | Privacy-scan deny-list current and catching what it should? | **Yes.** | `bun run seed privacy-scan` passes on a clean repo and exits non-zero on hits (verified by reading `privacyScan()` in `scripts/seed.ts`). |
| N | Version string consistent across `package.json`, `CHANGELOG.md`, `docs/release-checklist.md`? | **Yes.** | Release-check version consistency gate passes. All three are `0.4.0-alpha`. |
| O | Load-bearing surface documented for a forker? | **Yes.** | Beginner surface is explicitly named in three places; advanced/maintainer commands are labeled "not part of the day-one promise." |

## P0 blockers — `1.0` only

These must be closed before the next hostile-1.0 audit is worth re-running.
None are fixable inside this audit pass.

1. **No real outside testers.** [`production-readiness.md` Milestone 5
   "must have"] requires "at least 5 real external tester walkthroughs."
   The repo has zero. Simulated walkthroughs do not count. Persona it
   would betray: the stranger who clones the repo on the strength of a
   1.0 tag and finds nobody else has actually walked the path.
2. **No CI release-cycle evidence on a tag commit.** [`production-readiness.md`
   "Release candidate discipline"] requires "CI is green on `ubuntu-latest`
   and `macos-latest` for the tag commit." There is no tag commit yet on
   this repo, so this is logically vacant — and it must not stay vacant
   when the time comes to tag 1.0. Persona it would betray: the
   privacy/security skeptic who treats a 1.0 tag as "this passed a real
   release cycle, not just local checks."

## P1 issues — credibility within the first week of `1.0`

Recorded for honesty. None of these block `0.4.0-alpha` and none are
inflated to artificially raise the audit's body count.

1. **`docs/ai-agent-install.md` contradicted the canonical 15-minute path.**
   Step 4 told the agent to run `./setup.sh`; step 7 told it to fill six
   context files in one go. The README and `docs/first-15-minutes.md`
   spent Milestone 4 establishing that `bun install` + `bun run seed
   onboard` is the canonical 15-minute experience and that three rough
   context files are enough for day one. The simulated external-user
   audit caught the same class of contradiction in
   `docs/install-claude-code.md` and fixed it; this file slipped through.
   **Fixed in this pass** — see "Fixes implemented" below.
2. **Two simulated-audit P2s still open, intentionally.** `docs/onboard
   --plain` step 3 ordering, README data-room link not labeled as
   maintainer-only, `SECURITY.md` not pointing at `bun run seed
   privacy-scan`, etc. These remain P2 polish per the simulated audit
   verdict. They are not 1.0 blockers but a hostile reader will notice
   them within the first week.

## P2 polish — do not let these delay anything

Captured for the next polish cycle, not now.

- `seed onboard --plain` step 3 prints `claude` and `bun run seed
  first-prompt` on consecutive lines without an explicit "in a second
  pane" hint.
- README "Public data room" section above the privacy model could carry
  a one-line "maintainer-published, optional" qualifier.
- `SECURITY.md` "API Key Management" section does not reference
  `bun run seed privacy-scan` as the broader local scanner.
- `scripts/seed.ts` `privacyScan()` deny-list obfuscation has no inline
  comment explaining the split-string trick.
- `CONTRIBUTING.md` "Repo shape" omits a few top-level directories
  (`agents/`, `collab/`, `config/`, `core/`, `data/`, `exports/`,
  `integrations/`, `mcp/`, `packs/`, `patterns/`).
- `docs/audit-response-2026-05-10.md` and the newer
  `hostile-audit-production-alpha-2026-05-11.md` /
  `simulated-external-user-audit-2026-05-11.md` could one day be folded
  into a single "audit log" page.

## Claims in `README` / docs / `CHANGELOG` that would be false at 1.0 today

There is no 1.0-claim in user-facing docs to soften. The repo is
internally consistent at `0.4.0-alpha`:

- README header: status badge says `alpha`. Body says "alpha software,"
  "intentionally a starter kit rather than a finished consumer app."
- CHANGELOG `[Unreleased]` Notes section: "Version stays at
  `0.4.0-alpha`. Repo is broader-alpha ready with Milestone 5 *prep*
  shipped; real external-tester validation is still required before any
  `1.0.0-rc.1` consideration."
- `production-readiness.md`: "It is **not** 1.0 yet."

The honest statement to make about today is exactly this audit's verdict.
No softening of existing copy is required, because nothing aspirational
to 1.0 has been written into the repo.

## Re-cut suggestion — what must close before re-running this audit

Concrete work, counted:

- **P0: 2 items** — five real external-tester walkthroughs and one full
  green CI cycle on the tag commit (whatever the eventual tag is).
- **P1: 0 items** (#1 fixed in this pass).
- **P2: 6 items** — left intentionally as polish.

Do not re-run this audit until both P0s can be answered "yes, here is
the evidence." Re-running it earlier wastes the audit's signal.

## Fixes implemented in this audit pass

Only one targeted fix, with no scope creep:

- **`docs/ai-agent-install.md`** — Replaced the `./setup.sh` step with
  the canonical `bun install` + `bun run seed onboard` path, narrowed
  the "fill these files" step to the three core context files (`USER.md`,
  `COMPASS.md`, `GOALS.md`) with "rough notes are fine" guidance, and
  fixed the `docs/first-session-prompt.md` reference to point at
  `bun run seed first-prompt` (the canonical entry point).

The change is small and safe: it removes a contradiction with the
canonical 15-minute path, does not introduce new commands, and does not
add or expand any product surface.

## "If I had to ship 1.0 right now, what would I lie about?"

Two specific lies:

1. I would be implying that strangers have walked the path. They have
   not. Only one simulated AI persona pass exists. A 1.0 label sells
   trust I cannot back up with real outside friction.
2. I would be implying that a release cycle worked. It has not, because
   nothing has been cut as a tag yet — not even the `0.4.0-alpha`
   version that the repo currently advertises. A 1.0 label implies a
   green tag-commit CI run that does not exist in the project's history.

Both are exactly the things that 1.0 is supposed to mean. Until they
are true, the repo stays at `0.4.0-alpha` and this audit's verdict
stands.

## Release recommendation

**Stay at `0.4.0-alpha`.**

- Do not advance to `0.5.0-alpha` — there is no new feature work to
  justify a minor bump beyond the Milestone 5 prep already absorbed
  into the existing alpha. `[Unreleased]` is the right place for the
  shipped Milestone 5 prep until either a 1.0 candidate or a real
  feature add motivates a version move.
- Do not cut `1.0.0-rc.1`. Both Milestone 5 "must have" items above
  are open.

When the two P0s are closed, re-run the prompt in
[`docs/hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md)
against a fresh session, log a new dated audit alongside this one, and
only then consider tagging.

## See also

- [Hostile 1.0 Readiness Audit Prompt](hostile-1.0-readiness-audit-prompt.md)
- [Production Readiness → Milestone 5](production-readiness.md#milestone-5--10-candidate)
- [Production Readiness → Release candidate discipline](production-readiness.md#release-candidate-discipline)
- [Simulated External-User Audit (2026-05-11)](simulated-external-user-audit-2026-05-11.md)
- [Hostile Production-Alpha Audit (2026-05-11)](hostile-audit-production-alpha-2026-05-11.md)
- [Audit Response (2026-05-10)](audit-response-2026-05-10.md)
