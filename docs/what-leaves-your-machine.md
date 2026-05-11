# What Leaves Your Machine?

Digital Seed is local-first: the repo, templates, personal context files, local indexes, logs, and generated outputs live on your computer by default. There is no Digital Seed hosted account, background cloud service, telemetry pipeline, or central database.

The important caveat is that **your AI agent and optional integrations may send data out when you ask them to do work**. This page explains the boundary.

## By default, Digital Seed itself does not upload your files

A fresh clone plus the first-run path keeps your personal data local:

```bash
bun install
bun run seed onboard
bun run seed doctor
bun run seed first-prompt
```

Those commands read local files and print local guidance. They do not create an account, sync your notes, upload your `user/` folder, or send telemetry to this project.

One honest nuance: `bun install` itself fetches package tarballs from the public npm registry over the network — that is how any package manager works. It does **not** send your personal files, prompts, or `user/` content anywhere. If you need to audit what gets pulled, see `package.json` and `bun.lock`.

## What may leave your machine

Content can leave your machine in these situations:

1. **You paste context into an AI chat.** If you copy the first prompt or snippets from `user/` into Claude, ChatGPT, Gemini, Cursor, Windsurf, OpenClaw, or another agent, that provider receives what you paste.
2. **An AI agent reads files for a task.** Terminal-capable agents may include selected file contents in model prompts. Which files are sent depends on the agent, model provider, settings, and task.
3. **You enable optional integrations.** Recipes for Drive, email, calendars, chat, web search, or other services may connect to external APIs that can read or write the data you authorize.
4. **You run maintainer publishing commands.** Commands such as `bun run seed drive publish-data-room` intentionally upload selected public docs/assets to Google Drive.
5. **You add third-party MCP servers or tools.** MCP servers run locally, but they can call external services depending on their implementation and credentials.

Digital Seed cannot control the privacy practices of model providers, editors, shells, MCP servers, or APIs you connect. Treat each external tool as its own trust decision.

## What should stay local

Do not commit or publish:

- `.env` files, API keys, OAuth tokens, cookies, private credentials,
- real personal notes in `user/`, `data/`, or `logs/`,
- private calendars, messages, emails, contacts, financial data, or health data,
- real names/details in examples unless you have permission and intend them to be public.

The repo ignores common private paths, and `bun run seed privacy-scan` catches common leaks, but no scanner is perfect. Review public changes manually.

## Data boundary by area

- **Context templates (`user/`)** — local by default; may be sent to your AI provider if your agent reads or pastes them.
- **Local index/search (`bun run seed index`, `seed search`)** — local starter retrieval; do not index folders you are not comfortable exposing to your chosen agent.
- **Recipes and integrations** — opt-in; each recipe should say what it can read/write and what credentials it needs.
- **Drive data room publishing** — maintainer-only; intentionally uploads curated public materials, never your private `user/` folder.
- **Health, visual QA, link checks, release checks** — local checks; CI runs on the public repo contents, not your ignored private files.

## Safe usage checklist

Before using Digital Seed with real personal context:

- Use fictional or minimal data until the flow is useful.
- Read your AI agent/provider privacy settings.
- Keep secrets in `.env`, never in Markdown docs.
- Run `bun run seed privacy-scan` before committing.
- Review `git status --short` and `git diff --staged` before pushing.
- Prefer drafts and confirmations for anything that sends, uploads, deletes, or publishes.

## If you are contributing

Privacy-sensitive PRs should answer:

- Does this command read private local files?
- Does it send anything to an external service?
- Does it write, upload, delete, email, or message anything?
- Is the behavior opt-in and clearly documented?
- Can a beginner safely ignore it during the first 15 minutes?

When in doubt, make the local/read-only path the default and put external writes behind explicit commands.
