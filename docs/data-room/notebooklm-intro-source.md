# Digital Seed — NotebookLM Intro Video Source

Use this as the primary source for a short NotebookLM Video Overview. It is
written for a three-minute introductory video, not as a full product spec.

## One-line idea

Digital Seed is a local-first starter repo that helps people build their own
personal AI operating context: plain files, simple commands, safe recipes, and a
guided path from one useful first output to a gradually assembled personal OS.

## Audience

The audience is a curious but not deeply technical person who has used AI chat
tools before and is wondering:

- Why do I keep re-explaining myself to every AI session?
- How do I make AI understand my goals, preferences, files, and current work?
- How do I start without signing up for a new platform or uploading everything?
- How do I grow from a starter repo into a useful personal operating system?

## Core metaphor

Digital Seed is a DIY workshop in a box.

It does not give users a finished hosted app. It gives them the seed of their
own system:

1. A small folder they own.
2. Editable context files that explain who they are and what matters.
3. A command-line guide that keeps the first session focused.
4. Local search before cloud databases.
5. Optional recipes for the tools they already use.
6. Safety boundaries before automation.

The growth path matters: first context, then one useful output, then local
search, then one integration, then optional always-on behavior.

## What problem it solves

Most AI tools start each conversation with almost no durable context. The user
has to re-explain:

- who they are,
- what they are working on,
- what goals matter,
- what tools and files they use,
- what style of help they prefer,
- what they explicitly do not want optimized.

Digital Seed turns that repeated explanation into a local context layer the
user can edit, inspect, and reuse across AI agents.

## What the repo contains

Digital Seed is made of:

- `user/USER.md` — identity, role, timezone, background.
- `user/COMPASS.md` — direction, values, priorities, decision principles.
- `user/GOALS.md` — active objectives, milestones, timelines.
- `user/DOMAINS.md` — work domains, projects, learning areas, recurring responsibilities.
- `user/PREFERENCES.md` — communication style, tools, annoyances, defaults.
- `user/ANTI-GOALS.md` — what the assistant should not optimize for.
- `user/MEMORY.md` — durable facts and lessons worth preserving.
- `scripts/seed.ts` — the beginner-friendly command surface.
- `recipes/` — optional integration paths for tools like Obsidian, Google Drive, GitHub, Telegram, OpenClaw, and Hermes.
- `docs/` — first-run guidance, privacy boundaries, examples, troubleshooting, architecture, phases, and release/readiness notes.

## The first 15 minutes

The canonical first path is intentionally small:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

The five-step onboarding path is:

1. Check setup.
2. Open the three core context files: `USER.md`, `COMPASS.md`, and `GOALS.md`.
3. Print the first prompt and paste it into a terminal-capable AI agent.
4. Optionally index one notes folder for local search.
5. Pick one recipe to try later, then stop.

The goal is not to build a dashboard on day one. The goal is one boring,
recognizable first win: a weekly plan, a cleaner project list, a searchable
notes folder, or a useful first draft.

## The guided command path

The beginner commands form a small loop:

- `bun run seed onboard` shows the first 15-minute path.
- `bun run seed doctor` checks local setup health.
- `bun run seed first-prompt` prints the prompt to paste into the AI agent.
- `bun run seed what-next` prints exactly one next action based on local state.
- `bun run seed plan` prints a phase-selection prompt for the AI agent.
- `bun run seed feedback` helps users report first-run friction.
- `bun run seed privacy-scan` checks for common private leftovers before sharing or committing.
- `bun run seed index <folder>` and `bun run seed search "query"` create a local search loop.
- `bun run seed recipe list` shows optional integration recipes.

The design principle is: fewer choices first, more power later.

## The phase model

Digital Seed grows in four phases.

### Phase 1 — Local context

The assistant learns who the user is, what they want, what they are working on,
and what they do not want. This is always first.

### Phase 2 — Local search

The user indexes one folder of local notes or documents. Search starts as a
local JSON mirror, not a hosted vector database.

### Phase 3 — Integrations

The user connects one tool they already use, such as Obsidian, Drive, GitHub, or
a chat interface. Integrations are optional and one-at-a-time.

### Phase 4 — Always-on agent

Only after the local loop works, the user can consider background agents,
scheduled digests, messaging interfaces, or persistent automation. This is
advanced, not day one.

## Privacy and trust boundaries

Digital Seed is local-first. The repo, templates, generated files, local
indexes, and user context live on the user's machine by default.

The important caveat: the AI agent or model provider may receive prompts and
selected file contents when the user asks it to work. Digital Seed cannot
control Claude, OpenAI, Gemini, Cursor, Windsurf, Ollama front-ends, MCP
servers, Google Drive, Slack, email, or other connected tools.

The safety stance is:

- Start with fake or low-stakes information if unsure.
- Do not commit secrets, private notes, API keys, OAuth tokens, or credentials.
- Run `bun run seed privacy-scan` before sharing or pushing.
- Do not connect email, messaging, cloud drives, or always-on automations until
  the local workflow is useful.
- Anything that sends, uploads, deletes, publishes, emails, or messages should
  be draft-and-confirm by default.

## Agent-neutral stance

Digital Seed is not a bet on one AI provider. The same context files can be used
with Claude Code, Codex CLI, Gemini CLI, Cursor, Windsurf, Ollama through a
front-end, OpenClaw, Hermes, or another terminal-capable agent.

The repo is the shared context layer. The user can change agents without
throwing away their operating context.

## What Digital Seed is not

Digital Seed is not:

- a polished consumer SaaS,
- a hosted account,
- a dashboard product,
- an always-on assistant out of the box,
- a one-click automation platform,
- a reason to upload all private files to a cloud database.

It is a starter kit and guide for people who want to assemble their own personal
AI system deliberately.

## Why the data room exists

The GitHub repo is the source of truth. The public data room is optional. It is
useful when someone needs a workshop-style packet outside GitHub: a start-here
guide, visual story, templates, recipes, safety notes, and NotebookLM source
materials.

If a user is comfortable with GitHub, they can ignore the data room. If GitHub
feels unfamiliar, the data room is a softer introduction.

## Three-minute video narrative

Open with the friction:

"Every AI session starts too blank. You explain who you are, your goals, your
projects, your preferences, and your constraints again and again."

Introduce the answer:

"Digital Seed turns that repeated explanation into a local context layer you
own."

Show the seed:

"It starts as a small folder: plain Markdown files, a few safe commands, and
recipes you can ignore until you need them."

Show the first path:

"In the first 15 minutes, you edit three files, paste one prompt into your AI
agent, and ask for one useful output. Not a dashboard. Not an automation stack.
One real artifact you can use this week."

Show the growth:

"Once the local loop works, you add local search. Then one integration. Then,
only if you need it, always-on behavior."

Show the trust boundary:

"The files start on your machine. You choose which agent reads them. You decide
which tools connect. The system is built around drafts, confirmations, and
privacy checks."

End with the promise:

"Digital Seed is a DIY workshop in a box for building your own personal OS with
AI: local-first, agent-neutral, free-first, and designed to grow only after it
is useful."

## Suggested visual beats

1. A blank AI chat window asking the user to repeat context.
2. A small folder labeled Digital Seed.
3. Three core files: USER, COMPASS, GOALS.
4. A command line running `seed onboard` and `seed first-prompt`.
5. A first useful artifact: weekly plan, project list, searchable notes, or first draft.
6. A four-phase ladder: context, search, integrations, always-on.
7. A privacy boundary: local files first, explicit approval before external actions.
8. A final workshop table: files, recipes, docs, and the user assembling their own system.

## Tone

The video should feel calm, cinematic, practical, and trustworthy. Avoid hype.
Avoid claiming that Digital Seed is finished or production-grade. Say clearly
that it is alpha software and that real external validation remains the gate
before calling it 1.0.
