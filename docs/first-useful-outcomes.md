# First Useful Outcomes

The first 15-minute path is built around **one boring real win**. This
page makes that concrete. Each outcome below is small, recognizable when
finished, and avoids new accounts, new automations, or premature
integrations.

Treat the list as a shopping menu. Pick the one that fits *this week*.

## Why "boring" is the bar

Beginners often try to make Digital Seed do something impressive on day
one — a dashboard, a multi-agent setup, an always-on Telegram bot. None
of those are useful if the local context loop is not yet pulling its
weight. A boring outcome is the proof that the loop works.

If the outcomes below feel too small, the path is working as intended.
Save the bigger ambitions for after the third boring win.

## Outcome 1 — A one-page weekly plan

**Shape:** a Markdown file you actually use this week.

```text
Prompt to your agent (after first-prompt):
"Read my USER.md, COMPASS.md, GOALS.md. Draft a one-page weekly plan
for the next 5 working days. Flag anything that conflicts with my
anti-goals."
```

Done when: you can read the plan without feeling lied to. The plan
references your actual goals, not abstractions.

Why it works: forces your context files to be specific enough to plan
against. If the plan is vague, the files are vague.

## Outcome 2 — A clean project priority list

**Shape:** a short list of your live projects, ordered, with one
next-action each.

```text
Prompt to your agent:
"Here are my domains (DOMAINS.md). Help me turn each active project
into a single next-action. Rank by leverage given my goals."
```

Done when: there is exactly one next-action per project, and you know
which one to do first.

Why it works: exposes projects that you cannot articulate as one
next-action. Those are the projects that quietly stall.

## Outcome 3 — A useful notes search loop

**Shape:** local index + a few searches that actually surface old
material you had forgotten.

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what did I say about <topic from last quarter>?"
```

Done when: you find a real note you had forgotten, and you can imagine
using `seed search` weekly.

Why it works: tests whether your existing notes were ever worth keeping.
If `seed search` returns nothing useful, the answer is "not yet" — and
that is a useful signal.

## Outcome 4 — One useful first draft

**Shape:** a draft of something you have been putting off.

```text
Prompt to your agent:
"I have been avoiding writing X. Here is what I know
(<bullet list>). Draft a first version. Keep it under 400 words.
Mark anything you are guessing at."
```

Done when: there is a draft you can edit, not a blank page.

Why it works: the assistant is doing the easy 60% so you can do the hard
40%.

## Outcome 5 — A weekly reflection

**Shape:** a short retro of the past week, written with the assistant.

```text
Prompt to your agent:
"Based on my GOALS.md and last week's calendar/notes (paste or list
them), write a 5-bullet retrospective: what moved, what stalled,
what to drop, what to commit to next week."
```

Done when: you have one decision you would not have made without the
retro.

Why it works: forces the assistant to compare *promised priorities*
against *actual time spent*. The contradictions are where the value is.

## Outcomes that are *not* first wins

These look like good first wins. They are not.

| Shape | Why to defer |
| --- | --- |
| "Set up an always-on Telegram bot." | Premature surface area. Local loop must be useful first. |
| "Wire up email + calendar + Slack." | Premature integrations. See [`integration-recipes.md`](integration-recipes.md). |
| "Generate a slide deck or Excel model." | Built-in commands exist (`bun run seed deck`, `seed excel`) but are ADVANCED. Not a day-one win. |
| "Spin up the marketplace." | MAINTAINER-only surface. Skip on day one. |
| "Index 10 folders at once." | Start with one. Indexing is cheap; trust in the results is not. |
| "Tune the privacy scan deny-list." | Only after a real false positive on a real file. |

## How to pick

If you do not know which outcome fits this week:

1. Open `user/GOALS.md`.
2. Find the goal with the nearest deadline.
3. Pick the outcome above that produces a tangible artifact for that
   goal.
4. Stop after that artifact is in hand.

If your goals do not yet have deadlines, the first useful outcome is
giving them deadlines.

## See also

- [First 15 Minutes](first-15-minutes.md) — the canonical short path.
- [Demo Transcript](demo-transcript.md) — fictional walkthrough of
  Outcome 1.
- [Examples Gallery](examples/README.md) — fictional profiles with their
  own first wins.
- [Known Alpha Limits](known-alpha-limits.md) — what *not* to expect.
