# Setup Wizard

Digital Seed's setup wizard is meant to make the first step feel like being guided by a helpful technical friend, not like configuring infrastructure.

Run it with:

```bash
./setup.sh
```

Or ask a terminal-capable AI agent to run it for you. See [AI Agent Install](ai-agent-install.md).

## What the wizard does

1. Checks prerequisites
   - Git
   - Bun or Node.js
   - available AI interfaces such as Claude Code or Cursor

2. Asks about your AI provider
   - subscription-based options
   - API-key options
   - local Ollama option

3. Asks about integrations
   - Obsidian
   - email
   - calendar
   - database

4. Creates personal context files
   - `user/USER.md`
   - `user/GOALS.md`
   - supporting files already present in `user/`

5. Installs dependencies

6. Configures the local agent workspace

7. Installs a basic pre-commit safety hook

## What the wizard should become

The current wizard is functional but still too technical. The target experience should be:

```text
Welcome to Digital Seed.
I will help you create a small local AI workspace.
You can skip anything and improve it later.

How do you want to start?
1. Simple local workspace
2. Notes and documents search
3. Project/GitHub helper
4. Always-on assistant later
```

Then it should explain each choice in plain language.

## Product principles

- Default to free and local.
- Never require a hosted database on day one.
- Never require a specific AI agent.
- Ask before external connections.
- Explain unfamiliar words when they appear.
- Give the user one next action, not ten.

## First-session handoff

At the end, the wizard should guide the user into the first real assistant session:

```text
Open your AI agent in this folder and paste:

Read my Digital Seed context files. Interview me for missing context and help me turn this into a useful personal AI workspace.
```

The important moment is not installation. The important moment is when the user sees the assistant understand their actual life/work context.
