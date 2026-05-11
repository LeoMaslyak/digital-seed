# Example: Freelancer / Consultant

> Fictional profile. Use as a template, not as a real user.

## Who they are

Independent designer, developer, or consultant juggling three to six clients at once. Each engagement has its own scope, timeline, contact person, and deliverable cadence. Context switching is the main tax.

They want an assistant that knows which client is which, what is currently in-scope vs. out-of-scope, and what is due next — so they can stop re-orienting at the start of every session.

## What to edit first

1. `user/USER.md` — practice area, services offered, default working hours.
2. `user/COMPASS.md` — service principles ("scope creep is the enemy", "always confirm deliverables in writing", etc.).
3. `user/DOMAINS.md` — one bullet per active client: name, what you do for them, current phase.
4. `user/GOALS.md` — one outcome per active engagement plus one practice-level goal (e.g. "raise day rate by Q3").
5. `user/ANTI-GOALS.md` — what you refuse to take on (e.g. "no unpaid scoping", "no work without a signed SOW").

## A plausible first win

> "Draft a Monday status email for each active client based on what I shipped last week and what is due next."

The assistant uses `DOMAINS.md` to know who the clients are, asks for last-week notes if missing, and writes one short email per client.

A different boring-but-real win: "Turn this rough call recap into a clean scope summary I can send back for confirmation."

## Folder to index later (optional)

```bash
bun run seed index ~/clients
bun run seed search "what did we agree on for client X's phase 2?"
```

Helpful once each client folder has a few rounds of notes, SOWs, and deliverables.

## Recipe to try later

- [Google Drive](../../recipes/google-drive/README.md) — if client deliverables live there.
- [Claude Code project](../../recipes/claude-code-project/README.md) — if you want a per-client Digital Seed checkout.

Hold off on messaging bots until the per-client weekly loop is reliable.
