# Collaboration Space

This directory contains shared project and learning group content.
It is **git-tracked** and safe to commit — no personal data lives here.

## What lives here

- `projects/` — shared project notes, decisions, and tasks
- `study-groups/` — project analysis analysis and group context

## What stays personal (never committed)

- `user/` — your identity, goals, memory, and preferences
- `data/` — runtime state and personal history
- `logs/` — activity logs
- `.env` — API keys and secrets

The pre-commit hook enforces this boundary automatically.

## Quick Start

```bash
# Install the safety hook (once per clone)
bun run collab hook install

# Create a shared project
bun run collab create "Sample Project" --desc "Strategy project analysis" --members alice,bob

# Add a note
bun run collab note sample-project "Key context: current project has three open decisions..." --author alice

# Create a learning group
bun run collab group create "Finance Group A" --domain "Finance I" --topic "Project Analysis"

# Add your analysis
bun run collab group add finance-group-a alice "DCF terminal value assuming 2% growth..."

# See the merged context
bun run collab group show finance-group-a

# Check for personal data before committing
bun run collab check
```

## Architecture

```
collab/
  projects/<slug>/
    config.json         ← project metadata + members
    shared/
      notes.md          ← append-only shared notes
      decisions.md      ← key decisions log
      tasks.md          ← action items
  study-groups/<slug>/
    config.json         ← group metadata
    context.md          ← auto-rebuilt from member contributions
    members/
      <handle>.md       ← each person's own analysis file
```

Personal data never touches this directory. The pre-commit hook scans for
email addresses, API keys, phone numbers, and file system paths before
any commit reaches the remote.
