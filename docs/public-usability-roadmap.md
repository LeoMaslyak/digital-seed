# Public usability roadmap

Digital Seed is credible public alpha software. The next goal is not "more features" — it is making the starter kit obvious, trustworthy, and repairable for strangers.

Last updated: 2026-05-14. Reflects the updated hero visual, current public-alpha posture, and remaining external-user usefulness gaps.

---

## Current scorecard (updated 2026-05-12)

| Area | Score | Status |
|---|---|---|
| Core concept / positioning | ~92% | Clear local-first personal AI context starter kit |
| First-run beginner path | ~88% | Phase system + plan command + agent prereq surfaced; needs real-user proof |
| Agent onboarding | ~85% | Claude Code, Codex CLI, Gemini CLI, Ollama all documented and detected; local model caveats honest |
| Feedback / friction reporting | ~90% | `seed feedback`, first-run friction template, GitHub-web PR path all in place |
| Phases / feature selection | ~85% | Phases doc + `seed plan` + setup wizard phase chooser all shipped |
| Docs / trust / safety | ~83% | Privacy caveats, what-leaves-your-machine, security hooks, agent prereq warnings |
| Release engineering | ~78% | Full release-check gate; CI on tags; fresh-clone harness; needs more real release cycles |
| Open-source contributor readiness | ~80% | Issue templates, PR template, contributing guide, troubleshooting; needs real contributors |
| Product coherence | ~82% | Beginner / advanced / maintainer surfaces labeled in CLI, README, and docs |
| External validation | ~0% | Zero real outside walkthroughs yet — hard gate for 1.0 |

**Overall external-user usefulness score: 8/10 as a public alpha.** It is coherent, installable, documented, CI-gated, and visually credible enough for strangers to try. It is not yet a 9-10 because real outside-user walkthroughs, post-onboarding next-step guidance, and agent-specific end-to-end validation are still thin.

**Overall production-grade OSS readiness: ~85% without external users. External validation is the main remaining gap.**

## Highest-leverage work to make it more useful for strangers

1. **Run 5 real first-time user walkthroughs.** Watch people clone the repo, choose an agent, run `bun run seed onboard`, and produce one useful output. Capture every confusion point as an issue. This is the hard gate for raising the score above 8/10.
2. **Validate `seed what-next` with real users.** The command now prints one concrete next action based on local state; confirm it removes the post-onboarding blank moment.
3. **Verify Codex CLI, Gemini CLI, and Ollama paths end-to-end.** The docs are credible, but the non-Claude paths need real walkthrough proof or honest "unverified" labels.
4. **Validate the first-prompt loop.** The default first session now asks for one artifact and points users to `seed feedback`; confirm it reliably produces a useful output.
5. **Cut a fresh patch alpha release from the current main.** The README visual and docs are ahead of the published release tag; a patch release would make the public story consistent.
6. **Resolve remaining P2 trust polish.** Add the optional/maintainer-published qualifier around the public data room, add the privacy-scan pointer in `SECURITY.md`, and clear old simulated-audit leftovers.

---

## What shipped today (2026-05-12)

- `docs/releases/v0.4.1-alpha.md` — honest release notes for public GitHub Release (draft, not published).
- `bun run seed feedback` + `--write-draft` — effortless friction reporting; links to first-run friction issue template.
- `.github/ISSUE_TEMPLATE/first_run_friction.yml` — non-technical issue template for "I got confused" reports.
- `docs/feedback.md` — non-technical path to GitHub issues and GitHub-web PR edits.
- `docs/phases.md` — canonical four-phase system (Local context → Local search → Integrations → Always-on).
- `bun run seed plan` + `--write-plan` — agent-guided phase-selection prompt; creates `user/MY-PLAN.md`.
- `setup.sh` phase chooser — replaces flat profile picker; includes Phase 2 notes-folder prompt and Phase 3 recipe picker.
- Agent prereq surfaced prominently — README prereqs block reordered; `seed doctor` detects claude, codex, gemini, cursor, windsurf, ollama; `setup.sh` stops on missing agent.
- `docs/agent-chooser.md` rewritten — Claude Code, Codex CLI, Gemini CLI, Ollama, Cursor/Windsurf, OpenClaw/Hermes; quick-pick table; honest Ollama caveat.
- `docs/install-claude-code.md` — now opens with "Claude Code is one option, not the only one."
- `docs/public-usability-roadmap.md` (this file) — updated scorecard and milestone list.

## What shipped today (2026-05-14)

- `bun run seed what-next` now prints exactly one recommended next action based on local state.
- `bun run seed onboard` now points users to `what-next` after Phase 1.
- `bun run seed first-prompt` now asks the agent to produce one concrete useful artifact before ending.
- `bun run seed first-prompt` now points users to `bun run seed feedback` after the first useful output.
- Commit `3eb98e5` passed `bun run seed release-check --ci --skip-install`, `bun run check:links`, and GitHub CI on macOS + Ubuntu.
- `docs/external-tester-guide.md` gives non-technical testers a simple path,
  privacy warning, and copy-paste feedback template.
- Internal Codex CLI, Gemini CLI, and Ollama validation is recorded in
  `docs/agent-path-validation-2026-05-14.md`.
- Old audit docs are indexed in `docs/audit-log.md`.

---

## Milestones to ~95% without external users

These are the remaining concrete tasks achievable without real outside testers. They are ordered by leverage.

### M1 — Run a new simulated hostile audit (2026-05-12 pass)

**Why:** everything has changed since the last audit. The phases system, plan command, agent chooser, and feedback loop are all new. A fresh hostile audit from a non-technical first-time persona will find gaps in the updated flow before real users do.

**What to run:**
- Re-run `docs/hostile-1.0-readiness-audit-prompt.md` against the current main in a fresh session.
- Focus personas: (1) someone who has never used a terminal, (2) someone who uses Gemini/ChatGPT but not Claude, (3) someone who wants notes search and Obsidian but not always-on agents.
- Fix any P0/P1 findings.
- Document result as `docs/simulated-public-alpha-readiness-2026-05-12.md`.

**Exit criteria:** No open P0/P1 blockers on the updated beginner path.

---

### M2 — Verify the Codex CLI and Gemini CLI paths end-to-end

**Status:** Internally validated 2026-05-14; still needs fresh-user proof.
See [Agent Path Validation — 2026-05-14](agent-path-validation-2026-05-14.md).

**Why:** both are now documented and recommended but neither has been walked through in a Digital Seed context. The Claude Code path is proven. The others are not.

**What to do:**
- Walk through `bun run seed plan` output using Codex CLI: does it correctly read the context files, follow the phase prompt, and run the commands?
- Walk through the same with Gemini CLI.
- Walk through the Ollama path with a 8B model (llama3.1:8b or similar) — confirm honest caveats are accurate.
- Fix any commands, wording, or docs that break.
- Add any agent-specific troubleshooting to `docs/troubleshooting.md`.

**Exit criteria:** `docs/agent-chooser.md` install and usage steps verified by a real run. Any path that cannot be verified honestly is labeled "unverified" rather than presented as equivalent.

---

### M3 — Add a `seed what-next` command

**Status:** Shipped 2026-05-14. Needs real-user validation.

**Why:** the most common non-technical user failure point after Phase 1 is "I ran onboard, now what?" There is no gentle push to the next action. `bun run seed plan` requires deliberate opt-in. A small "what should I do next?" output at the end of onboarding removes that moment of blankness.

**What to build:**
- `bun run seed what-next` — reads `user/MY-PLAN.md` (if present), checks which phases are ticked, checks doctor output, and prints exactly one next action.
- If `MY-PLAN.md` is missing: suggest running `bun run seed plan --write-plan`.
- If Phase 1 is done but Phase 2 is not: suggest `bun run seed index <folder>`.
- If all chosen phases are done: suggest one recipe from `bun run seed recipe list` or confirm the local loop is complete.
- Wire it into the onboard output footer: "Done with Phase 1? Run: `bun run seed what-next`".

**Exit criteria:** running `bun run seed what-next` always prints exactly one actionable next step, never a wall of options.

---

### M4 — Honest agent-specific install guides for Codex and Gemini

**Why:** `docs/install-claude-code.md` is a complete beginner guide (terminal intro, macOS + Windows/WSL2, login, first run). Codex and Gemini have only one-liner install commands in `docs/agent-chooser.md`. Non-technical users who choose Codex or Gemini have no equivalent handholding.

**What to build:**
- `docs/install-codex-cli.md` — mirrors the structure of `install-claude-code.md`: what it is, macOS + WSL2 steps, install, login, first run, troubleshooting.
- `docs/install-gemini-cli.md` — same structure for Gemini CLI.
- Link both from `docs/agent-chooser.md` and from the README prereqs block.
- Update `docs/install-claude-code.md` title to make clear it covers only Claude Code (already started; complete the cross-link pass).

**Exit criteria:** a non-technical user can follow any of the three cloud-agent install guides without needing to search externally.

---

### M5 — Tighten the onboarding → first win → feedback loop

**Status:** Shipped 2026-05-14. Needs real-user validation.

**Why:** the gap between "I ran onboard" and "I got something useful" is still implicit. A first-time user who completes Phase 1 and runs `seed first-prompt` should land in a well-defined interview loop with a concrete output, not an open-ended chat.

**What to do:**
- Audit `bun run seed first-prompt` output: does it tell the agent clearly to produce *one* specific output before ending the session?
- Audit the `bun run seed plan` agent prompt: does it instruct the agent to write `user/MY-PLAN.md` and confirm completion?
- If either is vague, tighten the printed prompts.
- Add a "Session done?" footer to the first-prompt output: "When you have your first useful output, run: `bun run seed feedback` to report any friction."

**Exit criteria:** the first-prompt output consistently produces one usable artifact (a weekly plan, a cleaned-up goals file, a searchable index) without requiring the user to know what to ask for.

---

### M6 — Canonicalize the CHANGELOG and update the release draft

**Status:** Shipped through `v0.4.2-alpha`; refreshed for `v0.4.3-alpha`
release prep on 2026-05-14.

**Why:** the `docs/releases/v0.4.1-alpha.md` draft was written before phases, plan, feedback loop, and agent chooser improvements shipped. The CHANGELOG has no entry for today's work. Both need updating before any public announcement.

**What to do:**
- ✅ Added `[0.4.2-alpha]` for the 2026-05-12 feature wave.
- ✅ Added `[0.4.3-alpha]` for external tester guide, internal validation notes,
  audit-log index, CI action bump, and hook cleanup.
- ✅ Bumped `package.json`, `CHANGELOG.md`, and
  `docs/release-checklist.md` together.
- ✅ Drafted `docs/releases/v0.4.3-alpha.md`.
- ✅ Run `bun run seed release-check` before tagging.

**Exit criteria:** CHANGELOG, package.json, and release notes are consistent. A new version tag is ready to cut when Leo approves.

---

### M7 — Reduce simulated-audit P2 backlog

**Status:** Resolved internally. Needs real users to validate whether these
cleanup choices are actually clear.

**Why:** several P2 items from previous audits are still open. They are not blockers but they make the repo look unfinished to a careful reader.

Open P2s (from `docs/hostile-1.0-readiness-audit-2026-05-11.md`):
- ✅ README "Public data room" section carries a "maintainer-published, optional" qualifier.
- ✅ `SECURITY.md` "API Key Management" section references `bun run seed privacy-scan`.
- ✅ `CONTRIBUTING.md` "Repo shape" covers the current top-level directories.
- ✅ Old audit docs are indexed in `docs/audit-log.md`.
- ✅ `seed onboard --plain` step 3 includes a clearer "in a second pane" hint.

**What to do:** fix as many as possible in a single targeted pass. Mark each resolved with a dated inline note.

**Exit criteria:** all documented P2s are either fixed or explicitly deferred with rationale.

---

### M8 — Final pre-announcement checklist

Before any public announcement (social post, HackerNews, Product Hunt):

- [ ] M1–M7 above are complete.
- [ ] `bun run seed release-check` (with fresh-clone harness) is green on the tag commit.
- [ ] A GitHub Release has been published (with Leo's explicit approval) pointing to `docs/releases/v0.4.3-alpha.md`.
- [ ] The public data room is refreshed: `bun run seed drive publish-data-room --account lm@avantgaera.com`.
- [ ] README status badge says "alpha" and links to `docs/known-alpha-limits.md`.
- [ ] No maintainer-only assumptions have leaked into beginner docs.
- [ ] `bun run seed doctor` output on a fresh clone is clean with no warnings.

---

## What still requires real users (cannot be internally closed)

These are honest hard gates:

- **5+ real external first-15-minute walkthroughs.** No simulation substitutes.
- **Proof non-technical users understand what to do after cloning.**
- **Real objections to the privacy/security explanation.**
- **At least one real outside contributor** filing an issue or opening a PR.
- **CI green on a tag commit that a stranger used.** Currently CI is green on maintainer-triggered tags only.

None of these block the public announcement. They block calling it 1.0.

---

## What to avoid adding before real-user validation

- Default cloud accounts.
- Always-on messaging bots.
- Hosted databases.
- Complex dashboards.
- Email/calendar automation.
- Multi-agent orchestration on the day-one path.

These are useful in Phase 3/4. They will make the public alpha worse if they crowd Phases 1/2.
