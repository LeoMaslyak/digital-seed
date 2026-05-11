<div align="center">

# 🌱 Digital Seed

### Build your own personal AI operating context

**Local-first · agent-neutral · free-first · privacy-aware**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

<p align="center">
  <img src="docs/assets/digital-seed-growth.gif" alt="Abstract loop of a light seed growing into a luminous personal AI tree" width="900">
</p>

<p align="center">
  <sub>Visual fallbacks: <a href="docs/assets/digital-seed-growth.mp4">MP4</a> · <a href="docs/assets/digital-seed-growth.webm">WebM</a> · <a href="docs/assets/seed-tree-magic.svg">SVG</a> · <a href="docs/assets/digital-seed-growth-still.png">still PNG</a> · <a href="docs/visual-assets.md">asset notes</a></sub>
</p>

---

**Get useful personal AI context in 15 minutes — without signing up for another platform.**

Digital Seed is a small repo of editable context files plus a CLI that walks you through them. Point your existing AI agent (Claude Code, Cursor, Windsurf, OpenClaw, Hermes, …) at the folder, and it knows who you are, what you are working on, and what you do not want it to optimize for.

## Start in 15 minutes

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
./setup.sh
bun run seed onboard
```

`seed onboard` is the canonical path: check setup, open three context files, run `seed first-prompt`, optionally index one notes folder, then pick one recipe. Stop after step five until something is actually useful.

Then open the folder in your preferred AI agent and paste the first prompt:

```bash
claude          # or: cursor .  · windsurf .  · another terminal-capable agent
bun run seed first-prompt
```

The goal is **one boring real first win**: a clearer weekly plan, a cleaner project list, a searchable notes folder, or a useful first draft.

## Who this is for

Useful if you want to:

- stop re-explaining yourself to every AI session
- keep goals, preferences, projects, and memory in editable files you own
- start local and free, then upgrade only where you hit a real bottleneck
- understand how agents, MCP, local folders, vector search, Drive, GitHub, and chat surfaces fit together

Probably not useful if you want:

- a polished consumer app or hosted SaaS
- a built-in dashboard product (see [Dashboard Options](docs/dashboard-options.md))
- an always-on assistant out of the box
- one-click cloud automation for every integration

## If the terminal is unfamiliar

Ask a terminal-capable AI agent to install it with you. See [AI Agent Install](docs/ai-agent-install.md). The agent should explain each step and never connect external accounts without asking.

## Public data room

A non-technical walkthrough lives in the [Digital Seed public data room](https://drive.google.com/drive/folders/1G96XS38gcNNUCMcIJCnafG9oIFeknTxW): start-here pack, visual story, guides, templates, recipes, and audit notes. Maintainers refresh it with `bun run seed drive publish-data-room`.

Audit note: cleanup actions from an independent hostile audit are tracked in [`docs/audit-response-2026-05-10.md`](docs/audit-response-2026-05-10.md).

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
bun run seed onboard          # First 15-minute path (--plain for no animation)
bun run seed doctor           # Check local setup health
bun run seed first-prompt     # Print the first agent prompt
bun run seed privacy-scan     # Check for common private leftovers
bun run seed visual-qa        # Verify the hero GIF still loops cleanly
bun run seed index <folder>   # Build a local retrieval index
bun run seed search "query"   # Search local indexed notes/docs
bun run seed recipe list      # Show integration recipes
```

## Guides

Beginner path:

- [First 15 Minutes](docs/first-15-minutes.md) — the canonical short path
- [Getting Started](docs/getting-started.md) — extended walkthrough with optional extras
- [AI Agent Install](docs/ai-agent-install.md) — let a terminal-capable agent install it for you

Reference:

- [Free-First Setup](docs/free-first-setup.md) — how to stay local and unpaid
- [Agent Chooser](docs/agent-chooser.md) — pick an AI agent for your style
- [Integration Recipes](docs/integration-recipes.md) — safe paths to Obsidian, Drive, Telegram, etc.
- [Architecture Map](docs/architecture-map.md) — how the moving parts fit together
- [Dashboard Options](docs/dashboard-options.md) — visual dashboards Digital Seed does not bundle
- [Known Alpha Limits](docs/known-alpha-limits.md) — what you should not expect yet
- [Audit Response](docs/audit-response-2026-05-10.md) — cleanup status

## Privacy model

Digital Seed is local-first. Your personal files live on your machine. The kit does not require you to upload private notes to a hosted service.

Important caveat: the AI model or agent you use may send prompts and selected file contents to its provider. Read your provider’s terms and be intentional about what files you expose.

## Repository status

Digital Seed is alpha software. It is useful today, but it is intentionally a starter kit rather than a finished consumer app. Expect to customize it.

## License

MIT. Build on it, fork it, adapt it, and make it yours.
