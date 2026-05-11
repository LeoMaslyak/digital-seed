# Simulated External-User Audit — 2026-05-11

> **Caveat up front:** this audit is a *simulated* walkthrough done by an AI agent
> reading the repo as if it were a fresh outside user. It is **not** a substitute
> for real external testers. It exists to find low-hanging usability and trust
> gaps before broader announcement, not to declare external-validation done.

## Method

Three hostile fresh-user personas were walked through the canonical entry
points: `README.md` → `docs/first-15-minutes.md` → `bun run seed help`, plus
the relevant side trails each persona is most likely to take.

The personas:

1. **Non-technical beginner** — limited terminal experience, wants one useful
   outcome in 15 minutes, frightened by command-surface creep.
2. **Privacy / security skeptic** — wants to know exactly what leaves the
   machine and whether the project hides cloud or API assumptions.
3. **Open-source contributor** — wants to file an issue or open a small docs
   PR without prior maintainer context.

Findings are classified P0 / P1 / P2:

- **P0** — actively misleads a new user, breaks the promised 15-minute path,
  or contradicts another doc on a load-bearing instruction.
- **P1** — high-confidence usability or trust gap; not a hard blocker but
  costs real first-run trust.
- **P2** — polish or smaller clarity issue; can wait.

## Persona 1 — non-technical beginner

The beginner lands on `README.md`. The 15-minute quick start says
`git clone`, `cd`, `bun install`, `bun run seed onboard`. The beginner does
not have Bun. They scan for the rescue line: *"If the terminal is unfamiliar,
let an AI agent install it for you."*

They click through to `docs/ai-agent-install.md`, which assumes they already
have a terminal-capable agent. They click through to
`docs/install-claude-code.md`. There they are walked through installing
**Node.js v18+ and `npm install -g @anthropic-ai/claude-code`** — not Bun.
The page ends with: *"Once Claude Code is running, go back to
`getting-started.md` and continue from Step 1 — Clone."*

They land on `getting-started.md`, which tells them to run `./setup.sh` (a
seven-step interactive wizard that asks about providers, API keys, Obsidian,
email, calendar, and database integrations). The wizard contradicts the
"day one stops at step 5" rule the rest of the docs are built around. The
beginner now has three contradictory entry points and no Bun.

Specific frictions for this persona:

- The beginner-onboarding rescue path installs the wrong runtime (Node
  instead of Bun) and never mentions Bun. [P0]
- `install-claude-code.md` ends in a non-existent "Digital Seed contributors
  channel" instead of pointing to GitHub Issues or a docs-confusion template.
  [P0]
- `install-claude-code.md` redirects to `getting-started.md` "Step 1 — Clone"
  which no longer exists in that shape; the beginner is dropped into a
  10-section page instead of the canonical 15-minute path. [P1]
- `getting-started.md` step 8 ("Other useful commands") lists `bun run digest`,
  `bun run marketplace`, and `bun run tokens` — explicitly carved out as
  advanced/maintainer in the README and CLI help. A beginner who reads
  getting-started straight through will hit command-surface creep on the
  exact axis Milestone 4 was meant to fix. [P1]
- The README presents two quick-start paths (`bun install` + `bun run seed
  onboard` *or* `./setup.sh`) without making clear that the wizard sets up
  API keys / integrations and goes past day one. Choice paralysis. [P1]
- `seed onboard --plain` step 3 prints `claude` and `bun run seed first-prompt`
  on consecutive lines without an explicit ordering hint, leaving the
  beginner unsure whether the prompt should be printed before or after the
  agent is launched. [P2]
- Step 4 in the same output suggests `~/Documents/Notes` as an index target
  without saying what happens if that folder does not exist. [P2]

## Persona 2 — privacy / security skeptic

The skeptic scans the README front page for trust signals. They notice:

- A prominent **Public data room** link to a *Google Drive* folder, above
  "Privacy model." There is no inline note saying this folder is
  maintainer-published and not required for normal use. [P1]
- The Privacy model section is short and points to
  `docs/what-leaves-your-machine.md`. Good.

In `what-leaves-your-machine.md` they read:

> A fresh clone plus the first-run path stays local:
>
> ```bash
> bun install
> bun run seed onboard
> bun run seed doctor
> bun run seed first-prompt
> ```
>
> Those commands read local files and print local guidance. They do not
> create an account, sync your notes, upload your `user/` folder, or send
> telemetry to this project.

`bun install` does fetch packages from the npm registry. It does not send
your personal data, but it is technically a network operation. The doc
implies the entire block is offline. [P1]

The skeptic then reads `scripts/seed.ts` looking for hidden behavior. They
find a deny-list in `privacyScan()` with obfuscated terms (`"IE" + "SE"`,
`"Leo" + " M"`, `"Co" + "hort"`, etc.). There is no inline comment
explaining that the obfuscation is intentional (to keep the deny-list itself
from triggering the scanner) — a privacy reader could mistake it for stale
private context bleed-through. [P2]

`SECURITY.md` lists pre-commit hooks under "API Key Management" but does
not mention `bun run seed privacy-scan`, the broader local scanner that the
rest of the docs build the trust story around. [P2]

`install-claude-code.md` walks beginners through installing Claude Code
without warning that running `claude` sends prompts to Anthropic. Privacy
is mentioned elsewhere but not at this install moment, which is the first
time a beginner connects an outbound provider. [P2]

## Persona 3 — open-source contributor

The contributor wants to file a docs issue or open a small docs PR.

What works:

- `CONTRIBUTING.md` clearly names "good first contributions" (typos, broken
  links, docs/examples, recipes, troubleshooting entries).
- Issue templates (`bug_report.yml`, `docs_confusion.yml`,
  `integration_recipe_request.yml`) exist and are well structured.
- PR template covers privacy, docs, link-check, release-check, and
  fresh-clone reminders.
- Verification commands (`bun run health`, `bun run seed privacy-scan`,
  `bun run check:links`) are listed in CONTRIBUTING and discoverable.

What still rubs a stranger the wrong way:

- The "Repo shape" section names `user/`, `docs/`, `recipes/`, `scripts/`,
  `.github/`. The actual repo top level also contains `agents/`, `collab/`,
  `config/`, `core/`, `data/`, `exports/`, `integrations/`, `mcp/`,
  `packs/`, `patterns/`. A docs PR contributor does not need to touch
  those, but they will worry about whether their PR is in the right place
  without a one-line explanation. [P2]
- CONTRIBUTING mentions `bun run check:links` but the README's beginner
  command list does not, so a contributor who never read CONTRIBUTING.md
  could legitimately miss it. [P2]
- The "If your change touches privacy, security, setup, troubleshooting, or
  release docs" line is good, but recursive — a first-time contributor may
  not know which category their change falls in. A one-line "when in doubt,
  run all three (`health`, `privacy-scan`, `check:links`)" would be safer.
  [P2]

## Findings summary

| # | Severity | Finding | Persona |
| - | - | - | - |
| 1 | P0 | `install-claude-code.md` installs Node.js, not Bun, contradicting `troubleshooting.md` ("Running JS scripts with plain node is not supported"). | Beginner |
| 2 | P0 | `install-claude-code.md` references a non-existent "Digital Seed contributors channel" as the fallback support venue. | Beginner |
| 3 | P1 | `install-claude-code.md` redirects to `getting-started.md` "Step 1 — Clone" which no longer matches. Should route back to `first-15-minutes.md`. | Beginner |
| 4 | P1 | `getting-started.md` step 8 mixes beginner and advanced commands without labeling, breaking the beginner/advanced separation done in Milestone 4. | Beginner |
| 5 | P1 | README's `./setup.sh` mention does not warn that the wizard goes well past day one (API keys, integrations, profile). | Beginner |
| 6 | P1 | `what-leaves-your-machine.md` treats `bun install` as fully local without clarifying that npm-registry fetch is a network event distinct from "sending your data." | Privacy skeptic |
| 7 | P2 | `seed onboard --plain` step 3 ordering of `claude` and `bun run seed first-prompt` is ambiguous. | Beginner |
| 8 | P2 | README public data room link is not labeled as maintainer-only. | Privacy skeptic |
| 9 | P2 | `scripts/seed.ts` privacy-scan deny-list obfuscation has no inline explanation. | Privacy skeptic |
| 10 | P2 | `SECURITY.md` does not point at `bun run seed privacy-scan` from the API-key section. | Privacy skeptic |
| 11 | P2 | `install-claude-code.md` install moment does not flag that running `claude` sends prompts to Anthropic. | Privacy skeptic |
| 12 | P2 | `CONTRIBUTING.md` "Repo shape" omits several top-level directories. | OSS contributor |
| 13 | P2 | `CONTRIBUTING.md` "which checks to run" guidance is recursive for first-time contributors. | OSS contributor |

## Fixes implemented in this pass

P0 and high-confidence P1 only. No speculative rewrites, no new subsystems.

- **#1 & #2 & #3 (P0/P1):** Rewrote `docs/install-claude-code.md` to install
  Bun first (the actual project runtime), then Claude Code through the Bun
  global install path documented in setup. Removed the non-existent
  "contributors channel" reference; replaced with the existing GitHub
  Issues + docs-confusion template path. Redirected the closing pointer
  back to `first-15-minutes.md` instead of the stale `getting-started.md`
  step.
- **#4 (P1):** Restructured `docs/getting-started.md` step 8 to match the
  README's beginner/advanced split. Beginner-safe aliases stay; `digest`,
  `marketplace`, `tokens`, and friends are now under an "Advanced /
  maintainer" subhead with a "skip on day one" note and a pointer to
  `bun run seed help`.
- **#5 (P1):** README now flags `./setup.sh` as an optional path that goes
  past day one (API keys, integrations, profile) and notes that the
  lightweight `bun install` + `bun run seed onboard` path is the canonical
  15-minute experience.
- **#6 (P1):** `what-leaves-your-machine.md` now distinguishes "npm
  registry fetch during `bun install`" from "sending your personal data"
  in one sentence — preserving the local-first promise while being honest
  about the package-install network event.

## Fixes deferred

P2 items above are not blockers and not addressed in this pass to avoid
sprawl. They are candidates for the next polish cycle. Several were
already covered as P2 in prior audits (`hostile-audit-production-alpha-2026-05-11.md`).

## What this audit does *not* validate

- Real outside-user friction (this audit is simulated).
- Cross-platform behavior on Windows/WSL or older Linux distributions.
- Behavior under failure modes (no network, slow network, locked-down
  corporate machines).
- Trust calibration for skeptical users — that needs actual skeptic
  feedback, not an AI agent role-playing one.

External-tester walkthroughs remain the next real validation gate per
`docs/production-readiness.md` Milestone 5.
