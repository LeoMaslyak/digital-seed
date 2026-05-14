# First 15 Minutes

![Abstract loop of a light seed growing into a luminous personal AI tree](assets/digital-seed-growth.gif)

Fallback visual assets: [MP4](assets/digital-seed-growth.mp4), [WebM](assets/digital-seed-growth.webm), [SVG](assets/seed-tree-magic.svg), [still PNG](assets/digital-seed-growth-still.png). See [visual asset notes](visual-assets.md) for generation and loop-audit details.

This is the smallest useful Digital Seed path. Do this before adding dashboards, databases, automations, or always-on agents.

## Day one / Not day one

| Day one | Not day one |
| --- | --- |
| Edit `USER.md`, `COMPASS.md`, `GOALS.md` with rough notes. | Polish every context file before using it. |
| Run `bun run seed onboard` and `bun run seed first-prompt`. | Wire up email, Slack, calendar, or always-on agents. |
| Optionally index **one** local notes folder. | Stand up a hosted vector database. |
| Pick one recipe to try later. | Install every recipe at once. |
| Optionally write a `FIRST-WIN.md` for one boring real win this week. | Build a dashboard, a multi-agent setup, or new automations. |

If you finish day one and the local loop is already useful, you have permission to expand. If it is not yet useful, more tools will not fix that.

## Goal

By the end, your AI agent should know enough about you to help with one real problem this week.

> Want a head start? The [Examples Gallery](examples/README.md) shows fictional student, founder, researcher, and freelancer profiles — copy the shape that fits your situation. To see the full path acted out before you start, read the [Demo Transcript](demo-transcript.md). For concrete first-win shapes, see [First Useful Outcomes](first-useful-outcomes.md). Not sure what to install beyond day one? Run `bun run seed plan` and paste the output into your agent — it will interview you, recommend [phases](phases.md), and run setup for you.

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

Done with step 5? Run `bun run seed what-next` for exactly one recommended next action.

## Optional: write a first-win prompt

If you want a place to capture *the* boring real win for this week, run:

```bash
bun run seed onboard --write-first-win
```

This creates `user/FIRST-WIN.md` (only if missing — pass `--force` to overwrite). Edit it, then run `bun run seed first-prompt` again. The prompt now includes a pointer to that file so your agent works on the specific win you wrote down.

## Stop there

Do not add dashboards, messaging bots, email automations, cloud databases, scheduler/digest tasks, repo-bot learning, Excel/deck generation, the marketplace, Drive publishing, or multi-agent routing until the local workflow is already useful. Those commands exist (run `bun run seed help`) but are deliberately not part of the first-run promise.

The first win should be boring and real: a better weekly plan, a cleaner project list, a searchable notes folder, or a useful first draft. See [First Useful Outcomes](first-useful-outcomes.md) for five concrete shapes (and the shapes that look like first wins but are not).

If you get stuck or something feels too technical, run `bun run seed feedback` or read [Feedback and Small Fixes](feedback.md). First-run friction is a valid issue even when no command crashed.
