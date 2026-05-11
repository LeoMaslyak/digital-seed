# Getting Started

This is the extended walkthrough. If you just want to get to "one useful first win," follow [First 15 Minutes](first-15-minutes.md) instead.

## 1. Install prerequisites

You need:

- Git
- Bun (or Node.js 20+)
- An AI agent: Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or another MCP-compatible tool

Recommended:

```bash
curl -fsSL https://bun.sh/install | bash
bun install -g @anthropic-ai/claude-code
```

## 2. Clone and install

The canonical path is:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

That is the same 15-minute path the README leads with. Use it unless you have a specific reason not to.

`./setup.sh` is an **optional** guided wizard for people who want hand-holding through API keys, profile selection, and email/calendar/database integration choices. It goes past day one and is not required. See [Setup Wizard](setup-wizard.md) for what it touches if you decide to run it later.

Prefer to let an agent run the install for you? See [AI Agent Install](ai-agent-install.md).

## 3. Run the canonical onboarding path

```bash
bun run seed onboard          # animated
bun run seed onboard --plain  # no animation or color
```

The five-step path is the same as [First 15 Minutes](first-15-minutes.md). Stop after step five until something is actually useful.

## 4. Fill the core context files

Start with these. Rough notes are fine.

- `user/USER.md` — who you are
- `user/COMPASS.md` — what matters and what direction you want to move in
- `user/GOALS.md` — what you are trying to accomplish
- `user/DOMAINS.md` — projects, responsibilities, work areas, learning areas

Customize later:

- `user/PREFERENCES.md` — communication style, defaults, annoyances
- `user/ANTI-GOALS.md` — what you do not want to optimize for
- `user/MEMORY.md` — durable lessons and decisions

## 5. Start your agent in this folder

```bash
claude
# or: cursor .
```

Then paste:

```text
Read my USER.md, COMPASS.md, GOALS.md, and DOMAINS.md. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.
```

`bun run seed first-prompt` prints the short version of this prompt.

## 6. Use it on real work immediately

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

## 7. Add notes and documents

Local-first indexing is free:

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what do my notes say about my goals?"
```

Start with one folder. For free vs. paid stacks, see [Free-First Setup](free-first-setup.md).

## 8. Other useful commands

Beginner-safe checks:

```bash
bun run seed doctor          # Local setup health
bun run seed privacy-scan    # Flag common private leftovers
bun run seed recipe list     # Browse integration recipes
bun run seed                 # See the full taxonomy (beginner / advanced / maintainer)
```

Advanced / maintainer commands (skip on day one):

```bash
bun run tokens        # Token usage report (maintainer)
bun run digest        # Summarize pending activity (advanced)
bun run marketplace   # Browse skill packs and patterns (maintainer)
```

These exist but are deliberately not part of the first-15-minute promise. Run `bun run seed help` for the labeled beginner / advanced / maintainer taxonomy. Visual dashboards are intentionally not bundled; see [Dashboard Options](dashboard-options.md).

## 9. Privacy reminder

The `user/` folder is personal by design. Be careful before sharing your fork. Run `bun run seed privacy-scan` to flag common leftovers.

## 10. Status

Digital Seed is alpha. Cleanup state is tracked in [`audit-response-2026-05-10.md`](audit-response-2026-05-10.md). Known limits are in [Known Alpha Limits](known-alpha-limits.md).
