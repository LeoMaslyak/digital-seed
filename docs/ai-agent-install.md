# Let an AI Agent Install Digital Seed For You

Digital Seed is designed so a terminal-capable AI agent can set it up for you.

You do not need to understand every command first. The point of Digital Seed is to help you learn by doing: the agent can install the seed, explain each step, and then help you personalize it.

## Best experience

Use an agent that can work in a terminal and read/write files, such as:

- Claude Code
- OpenClaw
- Hermes Agent
- Cursor / Windsurf terminal agent flows
- another terminal-capable coding agent

Digital Seed does not require one specific agent. Use the tool that fits your workflow.

## Prompt to give your agent

Paste this into your terminal-capable AI agent:

```text
Install Digital Seed for me and explain each step briefly as you go.

Goal: set up a free, local-first personal AI infrastructure starter workspace.

Please:
1. Check whether Git and Bun or Node.js are installed.
2. If Bun is missing, explain how to install it and ask before changing my system.
3. Clone https://github.com/LeoMaslyak/digital-seed into a sensible folder.
4. Run ./setup.sh.
5. Help me answer the setup questions.
6. Run bun run health afterward.
7. Read README.md and docs/first-session-prompt.md.
8. Start an onboarding conversation with me to fill USER.md, COMPASS.md, GOALS.md, DOMAINS.md, PREFERENCES.md, and ANTI-GOALS.md.
9. Do not publish, upload, send messages, or connect external accounts without asking me first.
```

## If the agent gets stuck

Ask it:

```text
Run bun run health and explain what is missing in plain English. Do not guess. Read the relevant docs before proposing fixes.
```

## What the agent should not do automatically

It should not:

- create public repos for you
- upload your private files
- connect your email/messages without approval
- send Telegram/Discord/Slack/email messages
- add paid cloud services
- expose your `user/`, `.env`, or private notes

## Why terminal-capable agents are preferred

Digital Seed is a folder-based system. A terminal-capable agent can:

- clone the repo
- run setup
- inspect local files
- edit your context files
- run health checks
- index selected folders
- explain errors while seeing the actual output

A chat-only AI can still explain the concepts, but it cannot reliably set up the system for you.
