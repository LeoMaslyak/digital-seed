# First 15 Minutes

This is the smallest useful Digital Seed path. Do this before adding dashboards, databases, automations, or always-on agents.

## Goal

By the end, your AI agent should know enough about you to help with one real problem this week.

## 1. Check the setup

```bash
bun run seed doctor
```

If something is missing, fix that first. Do not connect extra services yet.

## 2. Open the core context files

Start with these:

- `user/USER.md` — who you are
- `user/COMPASS.md` — direction, values, principles
- `user/GOALS.md` — what you are trying to accomplish

Rough notes are fine. The goal is not perfect documentation; it is enough signal for your assistant to ask better questions.

## 3. Start the first agent conversation

```bash
bun run seed first-prompt
```

Paste the printed prompt into Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or whichever terminal-capable agent you prefer.

The agent should interview you, improve the context files, and help you choose one useful workflow.

## 4. Optional: index one local folder

Only index one folder at first.

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what do my notes say about my goals?"
```

This starts local-first. Digital Seed keeps a JSON search mirror, so you do not need hosted vector infrastructure for the first loop.

## 5. Pick one recipe

```bash
bun run seed recipe list
```

Choose one integration path only. Good starting choices:

- Obsidian, if you already use notes
- GitHub repo assistant, if your work is code/project-heavy
- Google Drive, if your useful files live there
- OpenClaw or Hermes only if you want always-on behavior later

## Stop there

Do not add dashboards, messaging bots, email automations, cloud databases, or multi-agent routing until the local workflow is already useful.

The first win should be boring and real: a better weekly plan, a cleaner project list, a searchable notes folder, or a useful first draft.
