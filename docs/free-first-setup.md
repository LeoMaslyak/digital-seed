# Free-First Setup

Digital Seed should be useful before you pay for extra infrastructure.

The default path is local-first and free, or based on subscriptions/accounts you may already have.

## Start with this

Required:

- a computer
- Git
- Bun or Node.js
- an AI interface such as Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or another agent
- the Digital Seed repo

Recommended but optional:

- Obsidian for notes
- Google Drive or another sync folder
- GitHub account
- Telegram/Discord/Slack if you want chat access

## Free starting stack

```text
Digital Seed repo
+ local markdown context files
+ local project/notes folders
+ direct file reading
+ keyword search
+ optional local embeddings
```

This is enough to get value.

## Local retrieval without paid infrastructure

Start with keyword retrieval. It is simple, local, and good enough for the first useful loop:

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what do I know about my goals?"
```

Digital Seed keeps a local JSON search mirror so this works without a hosted vector database. If local embeddings are available, it can also store vectors.

Free semantic-search upgrades:

- Ollama with `nomic-embed-text`
- local embedding models through JavaScript/Python tooling
- embedded local vector stores such as LanceDB or sqlite-vec

If those words sound confusing, skip them at first. Digital Seed should still work.

## Paid or external services are upgrades, not prerequisites

Only consider paid services when you actually need them:

- hosted Postgres / pgvector for cross-device or team sync
- hosted vector databases for larger scale
- VPS or home server for always-on agents
- paid model subscriptions for better reasoning or higher usage
- Google Workspace or other business tooling

## Good rule

Do not buy infrastructure before you know what workflow you are trying to improve.

Start with one real problem, make the assistant useful there, then upgrade only where the bottleneck is obvious.
