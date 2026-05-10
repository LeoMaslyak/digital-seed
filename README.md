<div align="center">

# 🌱 Digital Seed

### Build your own personal AI operating context

**Local-first · agent-neutral · free-first · privacy-aware**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

<p align="center">
  <img src="docs/assets/seed-tree-magic.svg" alt="Animated Digital Seed growing into a personal AI tree" width="900">
</p>

---

Digital Seed is a starter kit for people who want their AI tools to understand their life, work, goals, files, and preferences without signing up for another platform.

It gives you:

- editable context files for who you are and what matters
- a first 15-minute onboarding path
- local notes/document search
- integration recipes for tools you already use
- safety defaults for private files and external actions
- a neutral path for Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or another terminal-capable agent

It is **not** a hosted AI platform, dashboard product, or one true agent recommendation. It is glue: a clear starting point for assembling your own personal AI infrastructure.

Audit note: after an independent hostile audit, cleanup actions are tracked in [`docs/audit-response-2026-05-10.md`](docs/audit-response-2026-05-10.md).

## Start in 15 minutes

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
./setup.sh
bun run seed onboard
```

Then open the folder in your preferred AI agent:

```bash
claude
# or: cursor .
# or: another terminal-capable agent you trust
```

Paste the first prompt:

```bash
bun run seed first-prompt
```

The goal is one useful first win: a clearer weekly plan, a better project list, a searchable notes folder, or a useful first draft.

## Ask an AI agent to install it

If you are not comfortable in the terminal, ask a terminal-capable AI agent to do it with you. See [AI Agent Install](docs/ai-agent-install.md).

The agent should explain each step, avoid connecting external accounts by default, and ask before sending, publishing, deleting, uploading, or automating anything.

## What this is for

Digital Seed is useful if you want to:

- stop re-explaining your context to every AI session
- keep goals, preferences, projects, and memory in editable files
- search local notes and documents without starting with paid infrastructure
- understand how tools like agents, MCP, local folders, vector search, Drive, GitHub, and chat surfaces fit together
- gradually grow from local context files into a more capable personal AI setup

## What this is not

Digital Seed does not try to be:

- a polished consumer app
- a hosted SaaS platform
- a replacement for Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or Obsidian
- a dashboard product — see [Dashboard Options](docs/dashboard-options.md) if you want one
- an always-on assistant by default
- a promise that all integrations are fully automated out of the box

Start local. Add complexity only when a real workflow needs it.

## Core files

These live in `user/`. They are meant to be edited by you and read by your assistant.

- `USER.md` — identity, role, timezone, background
- `COMPASS.md` — direction, values, priorities, decision principles
- `GOALS.md` — active objectives, milestones, timelines
- `DOMAINS.md` — work domains, projects, learning areas, recurring responsibilities
- `PREFERENCES.md` — communication style, tools, annoyances, defaults
- `ANTI-GOALS.md` — what you explicitly do not want to optimize for
- `MEMORY.md` — durable facts and lessons the assistant should preserve

Start with `USER.md`, `COMPASS.md`, and `GOALS.md`. Improve the rest gradually.

## Useful commands

```bash
bun run seed onboard          # Show the first 15-minute path
bun run seed doctor           # Check local setup health
bun run seed first-prompt     # Print the first agent prompt
bun run seed privacy-scan     # Check for common private leftovers
bun run seed index <folder>   # Build a local retrieval index
bun run seed search "query"   # Search local indexed notes/docs
bun run seed recipe list      # Show integration recipes
```

## Guides

- [First 15 Minutes](docs/first-15-minutes.md)
- [Getting Started](docs/getting-started.md)
- [Free-First Setup](docs/free-first-setup.md)
- [AI Agent Install](docs/ai-agent-install.md)
- [Agent Chooser](docs/agent-chooser.md)
- [Integration Recipes](docs/integration-recipes.md)
- [Dashboard Options](docs/dashboard-options.md)
- [Known Alpha Limits](docs/known-alpha-limits.md)
- [Audit Response](docs/audit-response-2026-05-10.md)

## Privacy model

Digital Seed is local-first. Your personal files live on your machine. The kit does not require you to upload private notes to a hosted service.

Important caveat: the AI model or agent you use may send prompts and selected file contents to its provider. Read your provider’s terms and be intentional about what files you expose.

## Repository status

Digital Seed is alpha software. It is useful today, but it is intentionally a starter kit rather than a finished consumer app. Expect to customize it.

## License

MIT. Build on it, fork it, adapt it, and make it yours.
