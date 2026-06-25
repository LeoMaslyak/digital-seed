# Examples Gallery

Two kinds of examples:

- **"What can it do?" — task prompts.** Run **`bun run seed examples`** for a set of concrete,
  copy-paste prompts you can hand straight to your AI agent ("draft my week from my goals", "turn
  these notes into a recap"). Every one works with local context only — no accounts, nothing leaves
  your machine. Filter with `bun run seed examples <category>` (planning, writing, learning, research,
  life-admin, decisions). These live in `examples/examples.yaml`.
- **"Who am I like?" — persona profiles** (below). Four fictional users showing what a first 15
  minutes might look like.

## Profiles — what a first 15 minutes might look like

Four fictional Digital Seed users. Use these as templates — copy the parts that match your situation,
ignore the rest. These profiles are made up. None of them are based on real people.

- [Student](student.md) — coursework, papers, study notes, exam prep
- [Founder / Operator](founder.md) — small startup or solo operator running multiple priorities
- [Researcher / Investor](researcher.md) — deep reading, due diligence, comparing sources
- [Freelancer / Consultant](freelancer.md) — multiple clients, scoped engagements, deliverables

## How to use a profile

1. Read the profile that feels closest to your situation.
2. Open `user/USER.md`, `user/COMPASS.md`, and `user/GOALS.md`.
3. Copy the spirit of the example into your own files (do **not** copy the example user verbatim — it is fictional context for illustration only).
4. Run `bun run seed first-prompt` and let your agent interview you for the rest.

If none of the four profiles fit, just run `bun run seed onboard` and let the agent help you build context from scratch.

## What every profile shares

- A short identity sketch (one paragraph in `USER.md`).
- A direction sketch (3–5 bullets in `COMPASS.md`).
- 1–3 active goals (in `GOALS.md`).
- One plausible first win that takes under an hour.
- One folder they might index later (optional).
- One recipe they might try later (optional).

Stop after the first win. Connecting more tools before that is usually wasted setup.
