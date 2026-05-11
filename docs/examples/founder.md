# Example: Founder / Operator

> Fictional profile. Use as a template, not as a real user.

## Who they are

Solo founder or early operator running a small product with one or two collaborators. Switches between sales calls, hiring, product decisions, fundraising notes, and customer interviews in the same day. Context lives in Notion, a Drive folder, Slack DMs, and their head.

They want an assistant that holds the through-line: what is the company trying to do, what is the current sprint, what are the open decisions, what should never be optimized for.

## What to edit first

1. `user/USER.md` — role, company name, stage, team size.
2. `user/COMPASS.md` — north-star problem, current quarter focus, decision principles ("never trade trust for velocity", etc.).
3. `user/GOALS.md` — 1–3 active goals with deadlines. Keep these specific.
4. `user/ANTI-GOALS.md` — explicit "do not optimize for" list (e.g. "do not optimize for vanity metrics, headcount, or premature features").

`user/DOMAINS.md` is useful here too: list the 3–5 areas you context-switch between (product, sales, hiring, fundraising, ops).

## A plausible first win

> "Draft a one-page weekly plan from my goals and current open threads. Flag anything that conflicts with my anti-goals."

The assistant reads the context, asks a few clarifying questions, and produces a single-page plan you can actually hand to the team or hang on a wall.

A different boring-but-real win: "Turn these five rough customer-interview notes into a structured summary I can share."

## Folder to index later (optional)

```bash
bun run seed index ~/work/company-notes
bun run seed search "what did customer X say about pricing?"
```

Useful once weekly notes, interview transcripts, and decision memos accumulate.

## Recipe to try later

- [Google Drive](../../recipes/google-drive/README.md) — if shared docs live there.
- [GitHub repo assistant](../../recipes/github-repo-assistant/README.md) — if engineering wants the assistant to know the codebase.

Hold off on Telegram, OpenClaw, Hermes, and multi-agent automation until weekly planning + decisions actually move faster.
