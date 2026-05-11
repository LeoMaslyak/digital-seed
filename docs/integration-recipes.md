# Integration Recipes

Digital Seed is meant to help you connect tools, not replace them. Recipes are **optional** — they exist for when your local loop (context files + first prompt + local search) is already useful and you want to extend it.

> Day one stops at the [first 15 minutes](first-15-minutes.md). Come back here only after the local workflow is paying its way.

Each recipe should answer:

- What is this tool for?
- When should I use it?
- What does it connect to?
- What is the simplest free setup?
- What should I avoid sharing?

## Status legend

| Status | Meaning |
| --- | --- |
| **Official alpha-supported** | Recipe is exercised in the alpha gate stack and the CLI has scaffolding. Treat the recipe as the supported path. |
| **Experimental / adapt-yourself** | Recipe is a sketch. Expect to read it, adapt to your environment, and provide your own credentials, accounts, and judgment. |

Even "official alpha-supported" recipes still require your judgment on what to expose. See [What Leaves Your Machine?](what-leaves-your-machine.md).

## Core recipes

### Obsidian — **Official alpha-supported**

Use for:

- personal notes, knowledge index, project logs, learning notes

Digital Seed role:

- explain folder structure
- index selected notes via `bun run seed index <vault>` and search via `bun run seed search "..."`
- help write and update context files

### Claude Code / Cursor / Windsurf — **Official alpha-supported**

Use for:

- project work, code and docs, local file editing with a terminal-capable agent

Digital Seed role:

- provide the context files these agents should read
- explain how to ask good first-session prompts
- keep private context local

### GitHub repo assistant — **Experimental / adapt-yourself**

Use for:

- public repos, private project repos, versioned docs, issue tracking

Digital Seed role:

- index a repo with `bun run seed learn owner/repo` (advanced)
- make repos understandable to agents
- prevent private files from being committed

Requires you to bring repo access and judgment about what to index. Treat issues/PRs/releases/comments as draft-first.

### Google Drive — **Experimental / adapt-yourself**

Use for:

- documents and PDFs, synced folders, data rooms, sharing public resources

Digital Seed role:

- explain what is safe to index
- help create public/private folder boundaries
- generate Drive-ready learning materials

Requires the `gog` wrapper and a Google account you have explicitly authenticated. Uploads, deletes, and data-room publishing are advanced/maintainer paths — never the first thing you wire up.

### Telegram / Discord / Slack — **Experimental / adapt-yourself**

Use for:

- chat interface, mobile access, notifications, quick capture

Digital Seed role:

- explain how chat connects to an agent backend
- provide safe bot setup sketches
- default to draft/confirm for external messages

There is no built-in bot. Treat these as integration sketches you adapt to your own deployment.

### OpenClaw / Hermes always-on agents — **Experimental / adapt-yourself**

Use for:

- always-on agent workflows, background tasks, messaging front-ends, tool orchestration

Digital Seed role:

- `bun run seed recipe openclaw init` / `... hermes init` generate a draft context file (no credentials, no connections)
- explain autonomy tiers
- keep external actions approval-gated

Always-on agents are powerful but they are not a beginner integration. Get the local loop useful first, then layer in autonomy deliberately.

## Recipe sources

This file is the map. The actual recipe folders live under `recipes/` and are listed by `bun run seed recipe list`. Treat them as starting points to read and adapt — not as one-click installers.
