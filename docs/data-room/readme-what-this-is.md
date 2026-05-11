# 🌱 Digital Seed — What This Is

**Build your own personal AI operating context.**
Local-first · agent-neutral · free-first · privacy-aware.

> Image previews of the growth loop live in `01 Visual Story/` next to this folder.

Digital Seed is a starter kit for people who want their AI tools to understand their life, work, goals, files, and preferences — without signing up for another platform.

It gives you:

- editable context files for who you are and what matters
- a first 15-minute onboarding path
- local notes and document search
- integration recipes for tools you already use
- safety defaults for private files and external actions
- a neutral path for Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or any terminal-capable agent

It is **not** a hosted AI platform, dashboard product, or one true agent recommendation. It is glue: a clear starting point for assembling your own personal AI infrastructure.

## Start in 15 minutes

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

Prefer a guided wizard? Run `./setup.sh` after cloning instead of `bun install`.

Then open the folder in an AI agent you trust:

```bash
claude
# or: cursor .
# or: another terminal-capable agent
```

Paste the first prompt:

```bash
bun run seed first-prompt
```

The goal is one real first win: a clearer weekly plan, a better project list, a searchable notes folder, or a useful first draft.

## If the terminal is unfamiliar

See `Let an AI Agent Install It.md`. A terminal-capable AI agent can install Digital Seed for you, explain each step, and avoid connecting external accounts by default.

## Core files

These live in `user/` inside the repo. They are meant to be edited by you and read by your assistant.

- `USER.md` — identity, role, timezone, background
- `COMPASS.md` — direction, values, priorities, decision principles
- `GOALS.md` — active objectives, milestones, timelines
- `DOMAINS.md` — projects, learning areas, recurring responsibilities
- `PREFERENCES.md` — communication style, tools, annoyances, defaults
- `ANTI-GOALS.md` — what you explicitly do not want to optimize for
- `MEMORY.md` — durable facts and lessons your assistant should preserve

Start with `USER.md`, `COMPASS.md`, and `GOALS.md`. Improve the rest gradually.

## What this data room contains

- `00 Start Here/` — the orientation pack you are reading
- `01 Visual Story/` — the growth-loop assets you can embed anywhere
- `02 Guides/` — free-first setup, agent chooser, architecture map
- `03 Templates/` — copy-paste personal context files
- `04 Recipes/` — small, safe integration paths
- `05 Audit and Safety/` — governance and audit notes

## Privacy model

Digital Seed is local-first. Your personal files stay on your machine.

Important caveat: the AI model or agent you use may still send prompts and selected file contents to its provider. Read your provider's terms and be intentional about what files you expose.

## Status

Alpha. Useful today, intentionally a starter kit rather than a finished consumer app. Expect to customize it.

MIT licensed. Build on it, fork it, adapt it.
