# What Leaves Your Machine?

Digital Seed is local-first: the repo, templates, personal context files, local indexes, logs, and generated outputs live on your computer by default. There is no Digital Seed hosted account, background cloud service, telemetry pipeline, or central database.

The important caveat is that **your AI agent and optional integrations may send data out when you ask them to do work**. This page explains the boundary.

> For a live view of *your* current posture — what's stored, what's configured to leave, and what your agent must ask you before doing — run **`bun run seed whoami`**.

## By default, Digital Seed itself does not upload your files

A fresh clone plus the first-run path keeps your personal data local:

```bash
bun install
bun run seed onboard
bun run seed doctor
bun run seed first-prompt
```

Those commands read local files and print local guidance. They do not create an account, sync your notes, upload your `user/` folder, or send telemetry to this project.

### Digital Seed's own network calls — full list

Digital Seed itself only initiates outbound network traffic in a handful of well-defined places:

| Command / step | Endpoint | What is sent | When |
| --- | --- | --- | --- |
| `bun install` | The public npm registry (default: `https://registry.npmjs.org`) | Package names and versions from `package.json` / `bun.lock`. **Your personal files and `user/` content are not sent.** | Every time you install dependencies. |
| `bun run seed web fetch <url>` / `bun run seed web search "query"` (ADVANCED) | `https://r.jina.ai/…` | The URL you ask to fetch and/or the search query you type. Jina renders the page server-side and returns text. Your `user/` files, prompts, or local notes are **not** sent unless you put them into the query/URL yourself. | Only when you explicitly run `bun run seed web ...`. The 15-minute beginner path does not run these commands. |
| `bun run seed web fetch/research --summarize` (ADVANCED) | Your AI model provider (Anthropic/OpenAI/etc., via your configured agent) | The **fetched web page content** is included in the model prompt so the AI can summarize it. Treat that page text as data sent to your AI provider. | Only when you run a `web` command with summarization. |
| `bun run seed ask "<task>" --run` / `bun run seed chat` (OPT-IN) | Your AI model provider (Anthropic / OpenAI / Google — whichever is configured in `.env` or an installed CLI) | Your question **plus the full text of your `user/*.md` context files**, sent verbatim so the model can answer as you. Requires a one-time typed `yes`; each run shows a banner + receipt; preview the exact bytes with `--dry-run`; revoke with `seed ask --revoke-consent`. Your API key stays in `.env` and is never sent in the prompt. | Only when you run `seed ask --run` or `seed chat`, after you opt in. |
| Cloud RAG embeddings — `bun run seed index` / `bun run embed` **with `RAG_EMBED_CLOUD=1`** (OPT-IN) | OpenAI embeddings API (`https://api.openai.com/v1/embeddings`) | The **full text of the files you index** (`user/`, `patterns/`, `docs/`, and any folder you add). | **Only when you explicitly opt in** by setting `RAG_EMBED_CLOUD=1`. The default provider is **local** (Ollama) and nothing leaves your machine. |
| `bun run seed drive ...` (MAINTAINER) | Google Drive (via the `gog` CLI) | Whatever public materials the publishing command names — not your `user/` folder. Requires an authenticated `gog` account you set up yourself. | Only when you explicitly run a Drive command. |
| `bun run seed update` | The Digital Seed GitHub repo | `git pull` for repo updates. | Only when you run the update command. |

A first-time user on the canonical 15-minute path (`bun install` → `seed onboard` → editing `user/*.md` → `seed first-prompt` → optional `seed index` / `seed search` / `seed recipe list`) does not exercise the Jina, Drive, or update endpoints.

If you want Digital Seed to be fully offline after install, avoid running the `web`, `drive`, and `update` commands — none of them are part of the beginner path. To audit what `bun install` actually pulls, read `package.json` and `bun.lock`.

## What may leave your machine

Content can leave your machine in these situations:

1. **You paste context into an AI chat.** If you copy the first prompt or snippets from `user/` into Claude, ChatGPT, Gemini, Cursor, Windsurf, OpenClaw, or another agent, that provider receives what you paste.
2. **An AI agent reads files for a task.** Terminal-capable agents may include selected file contents in model prompts. Which files are sent depends on the agent, model provider, settings, and task.
3. **You enable optional integrations.** Recipes for Drive, email, calendars, chat, web search, or other services may connect to external APIs that can read or write the data you authorize.
   - When you run `seed ask --run` or `seed chat`, Digital Seed **itself** sends your question **and the full text of your `user/*.md` context files** to your configured AI provider so it can answer as you. This is opt-in (a one-time typed `yes`, bound to that provider), shown before every send, previewable with `seed ask --run --dry-run`, and revocable with `seed ask --revoke-consent`. It is the one place the kit itself calls out to a model — `seed whoami` shows its current on/off state.
   - When you run a `web fetch/research --summarize` command, the **fetched page content** is put into your AI model's prompt — i.e. sent to your AI provider — so it can summarize it.
   - RAG indexing (`seed index` / `bun run embed`) uses **local** embeddings (Ollama) by default and keeps file contents on your machine. It only uploads file text to **OpenAI** if you **explicitly opt in** by setting `RAG_EMBED_CLOUD=1`.
4. **You run maintainer publishing commands.** Commands such as `bun run seed drive publish-data-room` intentionally upload selected public docs/assets to Google Drive.
5. **You add third-party MCP servers or tools.** MCP servers run as **ordinary local processes** (not sandboxed). They can read the same filesystem your shell can read and make any network call your machine can make — Digital Seed does not restrict either. Treat each MCP server as you would any other binary on your machine.

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
- **Local index/search (`bun run seed index`, `seed search`)** — local starter retrieval that stays on your machine **by default** (local Ollama embeddings). If you set `RAG_EMBED_CLOUD=1`, the text of everything you index is sent to OpenAI for embedding — only enable that if you accept it. Do not index folders you are not comfortable exposing to your chosen agent (or, with cloud embeddings, to OpenAI).
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
