# Digital Seed Architecture Map

Digital Seed is a guide and seed for building your own personal AI infrastructure. It does not try to replace the tools you already like. It helps you understand the layers, choose what fits your needs, and glue things together safely.

## The basic stack

```text
You
  ↓
AI interface
  Claude Code / OpenClaw / Hermes / Cursor / Windsurf / Telegram
  ↓
Digital Seed context
  USER / COMPASS / GOALS / DOMAINS / MEMORY / PREFERENCES / ANTI-GOALS
  ↓
Knowledge surfaces
  Obsidian / Google Drive / local folders / GitHub repos / web clips
  ↓
Retrieval
  direct file reading / keyword search / local vectors / optional cloud vectors
  ↓
Workflow layer
  tasks / digests / project workflows / scripts / reminders
  ↓
Optional always-on infrastructure
  OpenClaw / Hermes / home server / Mac mini / VPS / Tailscale / cron
```

## What Digital Seed provides

- a starting workspace
- context-file templates
- onboarding questions
- privacy boundaries
- integration recipes
- explanations of what each tool does
- upgrade paths from simple local use to always-on infrastructure

## What Digital Seed does not try to own

- the AI agent
- your notes app
- your cloud drive
- your messaging app
- your vector database
- your automation platform
- your long-term infrastructure choices

The point is to help you understand and assemble your own system.

## Layers explained

### 1. AI interface

This is how you talk to the assistant.

Examples:

- Claude Code for terminal/project work
- Cursor or Windsurf for coding inside an editor
- OpenClaw or Hermes for always-on agent workflows
- Telegram, Discord, Slack, or similar tools for chat-style access

Digital Seed does not prescribe one. Pick based on how you work.

### 2. Personal context

These are plain markdown files that explain who you are and what matters.

This is the most important layer. Without it, the assistant is just a generic chatbot.

### 3. Knowledge surfaces

These are places where your information already lives:

- notes
- PDFs
- project folders
- Google Drive
- GitHub repos
- saved articles
- meeting notes

Digital Seed helps you connect them gradually.

### 4. Retrieval

Retrieval is how your assistant finds relevant information.

Start simple:

- read files directly
- use keyword search
- add local vector search later
- only use cloud vector databases when you actually need scale or sync

### 5. Workflow layer

This turns your assistant from a chat window into a working system:

- tasks
- daily/weekly reviews
- project checklists
- recurring scripts
- research flows
- drafts and summaries

### 6. Always-on layer

Optional advanced mode. This is for when you want agents to run in the background, monitor things, or interact through messaging apps.

You do not need this on day one.
