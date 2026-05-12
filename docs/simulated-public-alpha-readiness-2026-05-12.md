# Simulated public-alpha readiness audit — 2026-05-12

## Verdict

**public-alpha usable but not announcement-ready**

Digital Seed is usable as a public alpha: the canonical first-run path runs, the phase model is understandable, the feedback loop is approachable, and the local-first boundary is mostly honest. I would not make a broader announcement yet because the 2026-05-12 feature wave is still not reflected in the changelog/version discipline, and the non-Claude agent paths are newly documented but not yet truly walked end-to-end by fresh users.

## Evidence

Commands run from `/Users/leozealous/digital-seed`:

- `git status --short --branch` — PASS. Initial state was clean: `## main...origin/main`.
- `bun install` — PASS. Bun 1.3.8 checked 160 installs, no changes.
- `bun run health` — PASS. User context, agent detection, provider, MCP servers, patterns, and pre-commit hook all passed.
- `bun run seed privacy-scan` — PASS. No common private leftovers found.
- `bun run seed onboard --plain` — PASS. Printed the five-step path without animation; clear enough for a beginner, though it still assumes comfort copying between terminal panes.
- `bun run seed plan` — PASS. Detected `claude`, printed a paste-ready phase-selection prompt, and correctly defaulted Phase 1 first.
- `bun run seed plan --write-plan` — PASS. Created `user/MY-PLAN.md`; removed after inspection so no user draft remains untracked.
- `bun run seed feedback` — PASS. Printed direct GitHub issue-template links.
- `bun run seed feedback --write-draft` — PASS. Created `user/FEEDBACK-DRAFT.md`; removed after inspection so no user draft remains untracked.
- `bun run check:links` — PASS. All 67 Markdown files clean after fixes.
- Agent CLI spot checks:
  - `claude --version` — PASS: `2.1.139 (Claude Code)`.
  - `codex --version` — PASS: `codex-cli 0.128.0`.
  - `gemini --version` — PASS: `0.37.1`.
  - `ollama --version` — PASS: `0.17.5`.
  - `codex login --help` — PASS; command exists.
  - `gemini auth login --help` — FAIL as documented command; current Gemini CLI help does not expose that subcommand.
  - `claude auth --help` — PASS; current Claude Code auth command is `claude auth login`.
- `bun run scripts/post-impl-verify.ts --summary "hostile audit fixed stale Claude/Gemini login commands"` — FAIL because `scripts/post-impl-verify.ts` does not exist in this repo. This workspace-level rule cannot be satisfied here without adding new infra.

## Persona walkthroughs

### A. Student using ChatGPT, likely to pick Codex CLI

The README and agent chooser make Codex visible early, which is good. `codex login` exists in the installed CLI help, so the basic command is accurate. The path is still thinner than Claude Code: there is no full beginner guide equivalent to `docs/install-claude-code.md`, and the docs rely on a one-line install command for a user who may not know npm, PATH, or CLI auth.

Impact: usable for technical students; not yet ideal for non-technical ChatGPT users.

### B. macOS freelancer who has never used a terminal

The README now correctly starts with the agent prerequisite before clone/setup. `docs/install-claude-code.md` is the strongest beginner path and explains terminal basics well. `seed onboard --plain` is friendly, but the freelancer still needs to understand “open a second terminal tab / run an agent / paste the prompt.” This is acceptable for alpha, not polished-consumer quality.

Impact: no P0, but the first 60 seconds still depend on the user choosing Claude Code or already having a patient helper.

### C. Developer with Obsidian who wants notes search

The phases doc is coherent: Phase 1 → Phase 2 → Phase 3 is the right shape. `bun run seed index <folder>` and `bun run seed search "query"` are surfaced in README, onboarding, and phases. Obsidian is marked official alpha-supported in Phase 3. This persona is probably the best fit today.

Impact: ready for alpha.

## Findings

### P0

None found in the tested beginner surface. The repo can still deliver the local first-run path.

### P1

1. **CHANGELOG/version drift is real.** `package.json` is still `0.4.1-alpha`, while `CHANGELOG.md` says “No new changes since 0.4.1-alpha.” That is false after the 2026-05-12 phases, plan, feedback, agent chooser, setup wizard, roadmap, and readiness updates. This is an announcement blocker because public users will use the changelog to judge project honesty.
2. **Agent install command drift existed in the live docs/CLI.** README, `docs/install-claude-code.md`, `setup.sh`, and `seed plan` referenced stale auth commands (`claude login`, `gemini auth login`). I fixed the obvious cases and pushed the fix.
3. **Non-Claude paths are documented but not truly validated as first-run experiences.** Codex and Gemini binaries are present and basic help was checked, but no full fresh-user setup was completed inside Codex/Gemini. This should remain an explicit pre-announcement task.

### P2

1. **Codex/Gemini beginner handholding is weaker than Claude Code.** The roadmap already identifies this as M4. Keep it larger-fix, do not overbuild in this audit.
2. **`seed plan --write-plan` creates a private-ish user draft, but the report does not explicitly remind users that it is local/user-specific.** Not a blocker; the file is under `user/` and created with restrictive permissions locally.
3. **The feedback path is good, but still GitHub-centric.** For non-technical users, “open a GitHub issue” may still feel public/scary despite the good template and privacy warning.
4. **Ollama caveats are honest, but the quick-pick table still makes “stay entirely local” look as easy as cloud agents.** The detailed section corrects this; the table could add “manual setup expected.”

## Small fixes implemented

Committed and pushed:

- `783f001 fix: hostile audit 2026-05-12 — correct agent login commands`

What changed:

- Replaced stale Claude Code login guidance with `claude auth login` where surfaced in README, Claude install guide, setup wizard, and CLI plan output.
- Replaced stale Gemini `gemini auth login` guidance with “run `gemini` and follow the sign-in prompt” where surfaced in README, setup wizard, and CLI/onboarding output.
- Kept the existing agent-chooser caveat that the current Gemini CLI help does not list a separate `gemini auth login` command.

Verification after fix:

- `bun run health` — PASS.
- `bun run seed privacy-scan` — PASS.
- `bun run seed onboard --plain` — PASS.
- `bun run seed plan` — PASS.
- `bun run check:links` — PASS.

## Larger fixes to do next

- Add a `0.4.2-alpha` changelog/release-note/version bump covering the 2026-05-12 feature wave, then run the release gate.
- Fully walk Codex CLI and Gemini CLI from README → install/auth → `bun run seed plan` → Phase 1 commands in a clean-ish environment.
- Add or finish beginner install guides for Codex and Gemini only after the real walkthrough confirms the exact current commands.
- Consider a one-line Ollama warning in the quick-pick table: “local/private, but less reliable and more manual.”

## Final state

- Final `git status --short --branch`: clean on `main...origin/main` after pushing the fix commit.
- No external publishing, messaging, or uploads performed.
