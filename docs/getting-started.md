# Getting Started with Digital Seed

Digital Seed helps you create a personal AI operating system: a local workspace where your assistant can understand your goals, remember useful context, and help you build workflows around your own life and work.

## 1. Install prerequisites

You need:

- Git
- Bun or Node.js 20+
- An AI agent such as Claude Code, Cursor, Windsurf, OpenClaw, or another MCP-compatible tool

Recommended:

```bash
curl -fsSL https://bun.sh/install | bash
bun install -g @anthropic-ai/claude-code
```

## 2. Clone and run setup

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
./setup.sh
```

The setup wizard checks your tools, asks about your AI provider, creates your first context files, and installs dependencies.

## 3. Fill the core context files

Start with:

- `user/USER.md` — who you are
- `user/COMPASS.md` — what matters and what direction you want to move in
- `user/GOALS.md` — what you are trying to accomplish
- `user/DOMAINS.md` — projects, responsibilities, work areas, learning areas

Do not try to make these perfect. A rough first draft is enough. The assistant can improve them with you.

## 4. Start your agent

```bash
claude
# or: cursor .
```

Then ask:

```text
Read my USER.md, COMPASS.md, GOALS.md, and DOMAINS.md. Interview me for missing context and improve the files.
```

## 5. Use it on real work immediately

Good first prompts:

```text
Given my goals and current domains, what should I focus on this week?
```

```text
Help me turn my current projects into a clean next-action list.
```

```text
Design a personal knowledge system around my actual tools and files.
```

```text
What repeating problem in my work would be easiest to automate first?
```

## 6. Add notes and documents

You can connect an Obsidian vault or index local folders for search. Start small: one notes folder, one project folder, or one exported document set.

```bash
bun run embed --path ~/Documents/Notes
bun run embed:status
```

## 7. Explore useful commands

```bash
bun run health       # Check local setup health
bun run dashboard    # Start the local dashboard
bun run tokens       # Token usage report
bun run digest       # Summarize pending activity
bun run marketplace  # Browse skill packs and patterns
bun run seed         # Digital Seed helper CLI
```

## What to customize first

- Communication style in `user/PREFERENCES.md`
- Anti-goals in `user/ANTI-GOALS.md`
- Current projects and recurring responsibilities in `user/DOMAINS.md`
- Any durable lessons in `user/MEMORY.md`

## Public/private warning

The `user/` folder is personal by design. Be careful before sharing it. If you publish a fork, strip private context first.
