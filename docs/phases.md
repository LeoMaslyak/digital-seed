# Digital Seed phases

Phases are the simplest way to decide what to install and when. You do not need to understand every feature. Pick a phase; your AI agent installs it.

The phases are designed so that each one is fully useful on its own. You do not need Phase 3 to get value from Phase 1. Add the next phase only after the current one is actually paying its way.

> Not sure where you are? Run `bun run seed guide` — it tells you your current phase, your single next step, and anything parked for later.

---

## Phase 1 — Local context (always first)

**What you get:** The AI agent knows who you are, what you are working on, and what you do not want it to optimize for. Everything stays on your machine.

**Who this is for:** Everyone. This is always the starting point.

**What it does:**

- Fills in `user/USER.md`, `user/COMPASS.md`, `user/GOALS.md` (guided interview with your AI agent)
- Runs `bun run seed doctor` to confirm local setup is healthy
- Runs `bun run seed first-prompt` to generate the first agent prompt
- Optionally creates `user/FIRST-WIN.md` for one focused goal this week
- Installs the pre-commit secret-scan hook

**What it skips:** No external accounts, no API keys, no uploads, no always-on agents, no dashboards.

**Commands your agent runs:**

```bash
bun run seed doctor
bun run seed onboard --plain
bun run seed first-prompt
# Optional:
bun run seed onboard --write-first-win
bun run seed hooks install
```

**Time to useful:** 15 minutes.

---

## Phase 2 — Local search

**What you get:** Your agent can search your notes, documents, or a GitHub repo locally. No cloud service required.

**Who this is for:** Anyone with a folder of notes, Obsidian vaults, text files, or a local project.

**Requires:** Phase 1 complete.

**What it does:**

- Indexes one local folder (`~/Documents/Notes`, an Obsidian vault, or any directory of files)
- Enables `bun run seed search "..."` for local retrieval
- Optionally indexes a GitHub repo with `bun run seed learn owner/repo`

**What it skips:** No cloud embedding service (uses a local JSON index). No hosted vector database.

**Commands your agent runs:**

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what do my notes say about my goals?"
# Optional:
bun run seed learn owner/repo
```

**Time to useful:** 5–10 minutes after Phase 1.

**Upgrade path:** If the local JSON index becomes slow on very large vaults (>10,000 files), add a local embedding model or a hosted vector store later.

---

## Phase 3 — Integrations (one at a time)

**What you get:** Your agent can work with one external tool you already use — Obsidian, Google Drive, GitHub, Telegram, Slack, Discord, etc.

**Who this is for:** Users who have a specific tool they use daily and want the agent to work alongside it.

**Requires:** Phase 1 complete. Phase 2 recommended.

**How to pick:** You do not install all integrations at once. Pick **one** integration that is already part of your daily workflow. Your agent reads the recipe and walks you through it.

**Available integrations:**

| Integration | Status | What it connects |
|---|---|---|
| Obsidian | Official alpha-supported | local vault indexing, note retrieval |
| Claude Code / Cursor / Windsurf | Official alpha-supported | project context, file editing |
| Google Drive | Experimental | documents, data rooms, file sync |
| GitHub repo assistant | Experimental | repo indexing, issue/PR drafts |
| Telegram bot | Experimental | mobile chat interface, quick capture |
| Discord / Slack | Experimental | team/community chat interface |
| OpenClaw / Hermes | Experimental | always-on agent context (Phase 4 prep) |

**Commands your agent runs:**

```bash
bun run seed recipe list            # Show all available integrations
bun run seed recipe <name>          # Scaffold the chosen recipe
# Then follow the recipe's README
```

**What it skips:** Do not wire up multiple integrations at once. Do not connect anything that can send messages, upload files, or delete data until you have reviewed the recipe carefully.

**Time to useful:** 15–60 minutes per integration, depending on the tool.

---

## Phase 4 — Always-on agent

**What you get:** A continuously running assistant (OpenClaw, Hermes, or a custom agent backend) that can receive messages, run tasks in the background, and send notifications — without you opening a terminal.

**Who this is for:** Advanced users who want persistent automation, not just on-demand sessions.

**Requires:** Phases 1–3 complete. You should already trust the local loop.

**What it does:**

- Drafts an OpenClaw or Hermes context file (`bun run seed recipe openclaw init` or `hermes init`)
- Explains autonomy tiers: what the agent does automatically vs. what requires your approval
- Configures approval-gated actions (nothing sends, deletes, or publishes without your sign-off)
- Optionally enables scheduled tasks, digest messages, and background indexing

**What it skips:** Do not enable Phase 4 without reading `docs/what-leaves-your-machine.md` and understanding which actions are approval-gated.

**Commands your agent runs:**

```bash
bun run seed recipe openclaw init   # Draft OpenClaw context file
# or
bun run seed recipe hermes init     # Draft Hermes context file
bun run seed schedule               # View scheduled tasks
bun run seed digest                 # Run daily digest manually
```

**Time to useful:** Hours to days, depending on your agent backend.

---

## How to choose your phase

If you are not sure which phase to start with:

- **New to personal AI / AI agents:** Start at Phase 1.
- **Already have Claude Code or Cursor:** Start at Phase 1, then add Phase 2 for your notes.
- **Have an Obsidian vault:** Phase 1 → Phase 2 (index your vault) → Phase 3 (Obsidian recipe).
- **Want to connect a tool:** Phase 1 → Phase 2 → Phase 3 (one integration).
- **Want always-on automation:** All previous phases must be working first.

The fastest path to real value is: **Phase 1 fully done → one day of using it → then decide if Phase 2 makes sense.**

---

## Let your AI agent help you choose

Paste this into your agent:

```text
Read my Digital Seed context files and the phases doc at docs/phases.md.
Ask me a few questions to understand my workflow, then recommend which phases I should enable and in what order.
After I confirm, run the setup commands for those phases, one phase at a time.
Do not install anything that requires external accounts or API keys without asking first.
```

Or run:

```bash
bun run seed plan
```

This prints a guided setup prompt you can paste directly into your agent.
