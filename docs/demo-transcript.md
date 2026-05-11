# Demo Transcript

A short, fictional walkthrough of the first 15 minutes with Digital Seed.
Everything below — the user, the goals, the notes folder, the agent
responses — is made up. Use it to see what the path *feels* like before
you clone the repo.

If you want the underlying instructions, follow
[First 15 Minutes](first-15-minutes.md) instead.

## The fictional user

**Sam** is a part-time freelance writer juggling two clients, a side blog,
and an evening graduate course. They have rough notes scattered across
plain text files. They want one weekly plan they actually trust.

Operating system: macOS, recent Apple Silicon. Bun is not installed yet.
No Claude Code yet. They open a fresh terminal.

## 00:00 — Install Bun and clone the repo

```bash
$ curl -fsSL https://bun.sh/install | bash
... (bun installer output)
$ exec $SHELL -l
$ bun --version
1.1.x
$ git clone https://github.com/LeoMaslyak/digital-seed.git
$ cd digital-seed
$ bun install
... (installs dependencies)
```

## 03:00 — Check the local setup

```bash
$ bun run seed doctor
✅ Bun runtime ok
✅ Repo layout ok
⚠️  No AI agent CLI detected on PATH (claude, cursor, windsurf) — that is
    fine; install one when you are ready.
✅ user/ folder writable
✅ data/ folder writable
```

Sam decides to install Claude Code next, following
[install-claude-code.md](install-claude-code.md). Five minutes later
`claude --version` works.

## 05:00 — Edit the three core context files

Sam opens the repo in their editor and writes rough drafts:

**`user/USER.md`**
```markdown
# Sam — freelance writer + grad student
Timezone: America/Toronto
Currently: 2 freelance clients, side blog, part-time MA in history.
Tools: plain text notes in ~/notes, Google Docs for client drafts,
Calendar for deadlines.
```

**`user/COMPASS.md`**
```markdown
# Direction
- Prioritize paid client work that compounds my portfolio.
- Protect 2 evenings a week for coursework.
- Do not optimize for follower count on the side blog.
- Default to one weekly plan, not daily firefighting.
```

**`user/GOALS.md`**
```markdown
# Active goals (next 6 weeks)
1. Ship client A's quarterly retrospective deck by Friday Mar 15.
2. Finish course paper draft (8 pages) by Mar 22.
3. Publish one side-blog post — quality > velocity.
```

Sam writes a one-line first win:

```bash
$ bun run seed onboard --write-first-win
✅ Wrote user/FIRST-WIN.md
   Open it, pick one boring real win, then run: bun run seed first-prompt
```

In `user/FIRST-WIN.md` they fill in:

```markdown
## The win
A one-page weekly plan covering this week. Client A retro deck must be
in there. Course paper progress must be in there. Side blog can be
demoted if needed.
```

## 09:00 — Launch the agent and paste the first prompt

```bash
$ claude
```

In a second pane:

```bash
$ bun run seed first-prompt
Read my Digital Seed context files. Interview me for missing context,
explain anything I do not understand, and help me make this useful this
week. Start from user/FIRST-WIN.md — help me finish that specific win
before suggesting anything else.
```

Sam pastes that into the Claude Code session. The agent reads the three
context files plus `FIRST-WIN.md` and replies (illustrative, not a
verbatim model output):

> I see one goal at risk — client A's retro deck is due Friday and you
> have not blocked time for it. Course paper has more runway. Two
> clarifying questions before I draft the plan: (1) is "by Friday" a
> hard external deadline or your internal target? (2) do you have the
> raw data for the retro yet, or does that need its own sub-task?

Sam answers: hard external deadline; raw data is in `~/notes/client-a/`.

The agent drafts a one-page plan with three blocks per day, flags the
Friday deadline as the load-bearing item, and suggests demoting the
side-blog post to next week. Sam edits the plan, saves it to
`~/notes/weekly/2026-03-11.md`, and prints it out.

## 13:00 — Optional: index the notes folder

Sam wants the assistant to find old retro material next time:

```bash
$ bun run seed index ~/notes
Indexed 142 files (text only). Saved to data/rag/notes.json.
$ bun run seed search "what did I write about quarterly retros last year?"
Top 3 matches:
1. ~/notes/client-a/2025-q3-retro.md (score 0.81)
2. ~/notes/weekly/2025-12-09.md (score 0.62)
3. ~/notes/blog/draft-retro-templates.md (score 0.55)
```

Sam stops here. They do not install Telegram. They do not turn on
scheduled digests. They do not connect Google Drive yet. The first
boring real win is in hand.

## 15:00 — What Sam did *not* do

- No always-on agent.
- No vector database.
- No dashboard.
- No email automation.
- No multi-agent setup.
- No marketplace browsing.

Those exist (`bun run seed help` shows the full taxonomy) but were not
needed for the first win. Sam will revisit them only after the weekly
plan has actually helped for two or three weeks.

## How to read this transcript

This is a *walkthrough*, not a benchmark. Real first runs will differ:

- Your context files will look different.
- Your AI agent will phrase its replies differently.
- Your first useful outcome will probably not be a weekly plan — see
  [First Useful Outcomes](first-useful-outcomes.md) for other shapes.
- Your timing will differ. 15 minutes is a target, not a guarantee.

What should *not* differ:

- The repo stays local. No personal files leave your machine because of
  Digital Seed itself. See [What Leaves Your Machine?](what-leaves-your-machine.md).
- The beginner surface stays narrow (`onboard`, `doctor`, `first-prompt`,
  `privacy-scan`, `index`, `search`, `recipe list`).
- You stop after one boring real win.

If your first 15 minutes diverged in a way that surprised you, please
open a docs-confusion issue.
