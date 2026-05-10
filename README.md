<div align="center">

# 🌱 Digital Seed

### Build your own personal AI operating system

**Local-first · agent-friendly · customizable · privacy-aware**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

Digital Seed is a guide and starter kit for people who want more than a chatbot.

It helps you understand and assemble your own personal AI infrastructure: context files, memory, task tracking, local tools, research patterns, integrations, and an onboarding process that teaches your assistant who you are and what you are trying to build.

The goal is not to give everyone the same assistant or reinvent tools that already exist. The goal is to give you a strong starting point, explain what is what, and help you glue together the agents and software that fit your life.

## What you get

After setup, you have an AI workspace that can:

- understand who you are, what you are working on, and where you want to go
- remember durable facts and preferences across sessions
- route work to specialist modes such as research, writing, coding, strategy, finance, operations, and life admin
- help organize notes, goals, projects, tasks, and recurring decisions
- run locally with your files staying under your control
- work with Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or another agent/tool you choose
- grow into a personal operating system for work, learning, and life infrastructure

## Quick start

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
./setup.sh
```

Then open the folder in your AI coding agent:

```bash
claude
# or: cursor .
```

Try:

```text
Read my COMPASS.md, USER.md, and GOALS.md. Help me decide what to focus on this week.
```

## The core idea

Most AI use is stateless. You explain the same context repeatedly. The assistant has no stable model of your goals, values, constraints, tools, projects, or information environment.

Digital Seed flips that around. It gives your assistant a small, explicit, editable operating context:

- who you are
- where you are now
- where you want to be
- what problems repeat in your work or life
- what information sources matter
- what the assistant should remember
- what it should avoid

That context becomes the seed. Your own infrastructure grows from there.

Digital Seed is intentionally **free-first**. Start locally with files, folders, notes, and tools you already have. Add vector databases, hosted infrastructure, always-on agents, or paid services only when you understand why you need them.

## Personal context files

These live in `user/`. They are meant to be edited by you and read by your assistant.

- `USER.md` — identity, role, timezone, background
- `COMPASS.md` — direction, values, priorities, decision principles
- `GOALS.md` — active objectives, milestones, timelines
- `DOMAINS.md` — work domains, projects, learning areas, recurring responsibilities
- `PREFERENCES.md` — communication style, tools, annoyances, defaults
- `ANTI-GOALS.md` — what you explicitly do not want to optimize for
- `MEMORY.md` — durable facts and lessons the assistant should preserve

Start with `COMPASS.md`, `USER.md`, and `GOALS.md`. Improve the rest gradually.

## Main capabilities

- **Onboarding interview** — the assistant asks who you are, where you are, where you want to be, and what problems it should help solve.
- **Memory and context routing** — important facts get stored in the right file instead of disappearing in chat history.
- **Specialist agents** — focused modes for research, writing, code, strategy, finance, operations, learning, and life admin.
- **Skill packs** — reusable bundles of prompts, templates, and agent settings for specific domains.
- **Local retrieval hooks** — start with file reading/keyword search, then add local semantic search when useful.
- **Task and digest loop** — queue tasks, review pending work, and produce lightweight daily summaries.
- **Dashboard** — a simple local status surface for tasks, usage, and system health.
- **Export/import** — move your setup between machines or archive snapshots.

## Recommended first hour

1. Run `./setup.sh`.
2. Fill in `user/USER.md`, `user/COMPASS.md`, and `user/GOALS.md`.
3. Add your current projects and responsibilities to `user/DOMAINS.md`.
4. Start your agent in this repo.
5. Ask it to interview you and improve the context files.
6. Use it on one real problem immediately.

## Helpful guides

- [Architecture Map](docs/architecture-map.md)
- [Free-First Setup](docs/free-first-setup.md)
- [Agent Chooser](docs/agent-chooser.md)
- [Integration Recipes](docs/integration-recipes.md)
- [Personal AI Governance](docs/governance.md)
- [First Session Prompt](docs/first-session-prompt.md)

## Example prompts

```text
Interview me and build a first version of my personal AI operating context.
```

```text
Given my goals and current constraints, what should I stop doing this month?
```

```text
Turn this messy project folder into a clear working context and next-action list.
```

```text
Help me design a personal knowledge system for my work, research, and life admin.
```

```text
Read my DOMAINS.md and suggest three automations that would save me time weekly.
```

## Privacy model

Digital Seed is local-first. Your personal files live on your machine. The kit does not require you to upload private notes to a hosted service.

Important caveat: the AI model or agent you use may send prompts and selected file contents to its provider. Read your provider’s terms and be intentional about what files you expose.

## Repository status

Digital Seed is alpha software. It is useful today, but it is intentionally a starter kit rather than a finished consumer app. Expect to customize it.

## License

MIT. Build on it, fork it, adapt it, and make it yours.
