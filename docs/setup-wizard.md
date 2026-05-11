# Setup Wizard

`./setup.sh` is Digital Seed's first-run wizard. It is meant to feel like a helpful technical friend, not a control panel.

To run it:

```bash
./setup.sh
```

Or ask a terminal-capable AI agent to run it: [AI Agent Install](ai-agent-install.md).

## What the wizard does

1. Checks prerequisites — Git, Bun or Node.js, available AI interfaces (Claude Code, Cursor, …).
2. Asks about your AI provider — subscription, API key, or local Ollama.
3. Asks about integrations — Obsidian, email, calendar, database.
4. Creates the personal context files in `user/` if they are missing.
5. Installs dependencies.
6. Configures the local agent workspace.
7. Installs a basic pre-commit safety hook.

After the wizard, run `bun run seed onboard` to follow the five-step first-15-minutes path.

## Product principles

The wizard is allowed to ask, but it must:

- Default to free and local.
- Never require a hosted database on day one.
- Never require a specific AI agent.
- Ask before connecting external services.
- Explain unfamiliar words when they appear.
- Give the user one next action, not ten.

## Where the user lands after setup

```text
Open your AI agent in this folder and paste:

  Read my Digital Seed context files. Interview me for missing context
  and help me turn this into a useful personal AI workspace.
```

The important moment is not installation — it is when the assistant first reflects the user's actual context back to them.

## Related docs

- [First 15 Minutes](first-15-minutes.md) — what to do after `./setup.sh` finishes
- [Getting Started](getting-started.md) — extended walkthrough with optional extras
- [Free-First Setup](free-first-setup.md) — staying local and unpaid
