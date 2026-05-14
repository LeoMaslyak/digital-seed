<div align="center">

# 🌱 Digital Seed

### Build your own personal AI operating context

**Local-first · agent-neutral · free-first · privacy-aware**

[![CI](https://github.com/LeoMaslyak/digital-seed/actions/workflows/ci.yml/badge.svg)](https://github.com/LeoMaslyak/digital-seed/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](docs/known-alpha-limits.md)
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

Digital Seed is a small repo of editable context files plus a CLI that walks you through them. Point any AI agent (Claude Code, Cursor, Windsurf, OpenClaw, Hermes, …) at the folder, and it knows who you are, what you are working on, and what you do not want it to optimize for.

## Watch the overview

[![NotebookLM overview video poster: a cardboard Digital Seed box of local context files](docs/assets/notebooklm-intro-poster.jpg)](https://leomaslyak.github.io/digital-seed/intro-video.html)

[Watch on GitHub Pages](https://leomaslyak.github.io/digital-seed/intro-video.html), [download the release MP4](https://github.com/LeoMaslyak/digital-seed/releases/download/v0.4.3-alpha/digital-seed-notebooklm-intro.mp4), or use the [Google Drive fallback](https://drive.google.com/file/d/1EepOk9V3YA1egd7PcW0LsePH0B7NZQo8/view?usp=drivesdk). The setup path below is still the source of truth.

## Start in 15 minutes

**Prerequisites (one-time):**

> **Start here if you are new.** The most common first blocker is not having an AI agent installed. Digital Seed is a folder your AI agent reads and works in — without one, you can read the files but not run the guided setup. Install one before you clone.

- **A terminal-capable AI agent** — this is what actually uses your context files. Pick whichever you already have an account with:
  - **Claude Code** (Anthropic) — `bun install -g @anthropic-ai/claude-code` + `claude auth login`. Full guide: [docs/install-claude-code.md](docs/install-claude-code.md).
  - **Codex CLI** (OpenAI) — `npm install -g @openai/codex` + `codex login` (guide: [docs/install-codex-cli.md](docs/install-codex-cli.md)).
  - **Gemini CLI** (Google) — `npm install -g @google/gemini-cli`, then run `gemini` and follow the sign-in prompt (guide: [docs/install-gemini-cli.md](docs/install-gemini-cli.md)).
  - **Ollama** (local, no cloud, no account) — https://ollama.ai, then `ollama pull llama3.1:8b`. See caveat in [docs/agent-chooser.md](docs/agent-chooser.md) about local model reliability.
  - Not sure? [docs/agent-chooser.md](docs/agent-chooser.md) has a quick pick table.
- **Bun** — the JS runtime Digital Seed uses (`curl -fsSL https://bun.sh/install | bash`, then `exec $SHELL -l`). Plain `node` is not supported. See [Troubleshooting → Bun is missing](docs/troubleshooting.md#bun-is-missing-or-the-wrong-version) if `bun --version` does not work.
- **Git** — to clone the repo (most systems have it; install via `xcode-select --install` on macOS or your distro's package manager on Linux).

Then:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

The five-step `seed onboard` path: check setup → open three context files → paste the first prompt → optionally index one notes folder → pick one recipe. Stop after step five until something is actually useful.

**Canonical path:** `bun install` + `bun run seed onboard`. That is the supported 15-minute experience.

`./setup.sh` is an **optional** guided wizard that goes past day one — it also asks about API keys, picks a setup profile, and walks through email/calendar/database integrations. You do **not** need to run it to use Digital Seed. Run it only if you want that hand-holding now and understand it will prompt you for things the canonical path does not.

```bash
claude          # or: cursor .  · windsurf .  · another terminal-capable agent
bun run seed first-prompt
```

The goal: **one boring real first win** — a clearer weekly plan, a cleaner project list, a searchable notes folder, or a useful first draft.

If the terminal is unfamiliar, [let an AI agent install it for you](docs/ai-agent-install.md).

### Day one vs not day one

**Day one:** edit `USER.md`, `COMPASS.md`, `GOALS.md`; run `seed onboard` and `seed first-prompt`; optionally index one notes folder; optionally write `user/FIRST-WIN.md`.

**Not day one:** wiring email/Slack/calendar, hosted vector DBs, always-on agents, dashboards, multi-agent setups. Add those only after the local loop is already useful. ([full breakdown](docs/first-15-minutes.md#day-one--not-day-one))

## Public data room

The [Digital Seed public data room](https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG) is an optional workshop/share pack for people who do not want to start in GitHub: start-here notes, visual story, guides, templates, recipes, audit notes, and the NotebookLM intro video. GitHub remains the source of truth. Refresh the data room with `bun run seed drive publish-data-room` (see [data room guide](docs/data-room-guide.md) for the `--no-delete` fallback).

(maintainer-published, optional)

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

The beginner surface is intentionally short. Everything else is optional, advanced, or maintainer-only — run `bun run seed help` to see the full taxonomy.

```bash
bun run seed plan             # Get the AI-guided phase-selection prompt (paste into your agent)
bun run seed onboard          # First 15-minute path (--plain for no animation)
bun run seed doctor           # Check local setup health
bun run seed first-prompt     # Print the first agent prompt
bun run seed what-next        # Print exactly one recommended next action
bun run seed privacy-scan     # Check for common private leftovers
bun run seed feedback         # Report first-run friction or docs confusion
bun run seed index <folder>   # Build a local retrieval index
bun run seed search "query"   # Search local indexed notes/docs
bun run seed recipe list      # Show integration recipes
```

Day one stops here. Scheduler, digest, repo learning, web/drive tooling, Excel/deck generation, marketplace, and release commands are deliberately not in this list — they live under `bun run seed help` once the local loop is useful.

## Guides

Beginner path:

- [First 15 Minutes](docs/first-15-minutes.md) — the canonical short path
- [Demo Transcript](docs/demo-transcript.md) — fictional first 15-minute walkthrough you can read before cloning
- [First Useful Outcomes](docs/first-useful-outcomes.md) — concrete examples of the boring real win
- [Examples Gallery](docs/examples/README.md) — fictional student, founder, researcher, and freelancer profiles
- [External Tester Guide](docs/external-tester-guide.md) — simple instructions for non-technical testers and feedback
- [NotebookLM Intro Video](docs/notebooklm-intro-video.md) — GitHub-hosted 3-minute overview and production notes
- [Getting Started](docs/getting-started.md) — extended walkthrough with optional extras
- [AI Agent Install](docs/ai-agent-install.md) — let a terminal-capable agent install it for you
- [Troubleshooting](docs/troubleshooting.md) — when something does not work

Reference:

- [Free-First Setup](docs/free-first-setup.md) — how to stay local and unpaid
- [Agent Chooser](docs/agent-chooser.md) — pick an AI agent for your style
- [Integration Recipes](docs/integration-recipes.md) — safe paths to Obsidian, Drive, Telegram, etc.
- [Architecture Map](docs/architecture-map.md) — how the moving parts fit together
- [Dashboard Options](docs/dashboard-options.md) — visual dashboards Digital Seed does not bundle
- [Known Alpha Limits](docs/known-alpha-limits.md) — what you should not expect yet
- [Phases](docs/phases.md) — what phases are available and how to choose them
- [Feedback and Small Fixes](docs/feedback.md) — easiest way to report friction or suggest a docs fix
- [Public Usability Roadmap](docs/public-usability-roadmap.md) — what remains before 100% public usability
- [Supported Platforms](docs/supported-platforms.md) — what is tested, what is best-effort, what is not supported
- [What Leaves Your Machine?](docs/what-leaves-your-machine.md) — local-first privacy and external-data boundaries
- [Production Readiness](docs/production-readiness.md) — public-ready gaps and release criteria
- [Release Checklist](docs/release-checklist.md) — maintainer release gate
- [Fresh-Clone Validation](docs/fresh-clone-validation.md) — clean-environment smoke test
- [Audit Log](docs/audit-log.md) — simulated audits, hostile audits, and validation notes
- [Audit Response](docs/audit-response-2026-05-10.md) — cleanup status
- [Public-Alpha Readiness Audit](docs/simulated-public-alpha-readiness-2026-05-11.md) — consolidated 2026-05-11 simulated audit (the fixes shipped in `0.4.1-alpha`)
- [Hostile Product and Ecosystem Audit Prompt](docs/hostile-product-ecosystem-audit-prompt.md) — next-session prompt for usefulness, resource-map, and safe ecosystem audit

## Privacy model

Digital Seed is local-first. Your personal files live on your machine. The kit does not require you to upload private notes to a hosted service.

Important caveat: the AI model or agent you use may send prompts and selected file contents to its provider. Read [What Leaves Your Machine?](docs/what-leaves-your-machine.md), check your provider’s terms, and be intentional about what files you expose.

## Repository status

Digital Seed is alpha software. It is useful today, but it is intentionally a starter kit rather than a finished consumer app. Expect to customize it.

## Contributing & code of conduct

See [Feedback and Small Fixes](docs/feedback.md) if something is confusing, [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor flow, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations. Security issues should go through a private GitHub security advisory — see [SECURITY.md](SECURITY.md).

## License

MIT. Build on it, fork it, adapt it, and make it yours.
