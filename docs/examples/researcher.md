# Example: Researcher / Investor

> Fictional profile. Use as a template, not as a real user.

## Who they are

Someone who reads a lot — papers, filings, memos, decks, transcripts — and needs to compare across sources without losing track of provenance. Could be an analyst, a PhD student writing a thesis, a journalist on a beat, or an early-stage investor doing diligence.

They want an assistant that can hold a thesis, ingest new sources, and answer "what do my sources actually say about X?" without making things up.

## What to edit first

1. `user/USER.md` — domain, current thesis or beat, comfort areas vs. learning areas.
2. `user/COMPASS.md` — research principles ("never cite a source I have not opened", "prefer primary documents", etc.).
3. `user/GOALS.md` — the current open question or thesis, with a deadline.
4. `user/MEMORY.md` — durable facts worth not re-deriving (key definitions, recurring counterparties, baseline numbers).

`user/PREFERENCES.md` is important: capture citation style, summary length, and how strict the agent should be about hedging vs. asserting.

## A plausible first win

> "Read these four sources I dropped in `~/research/sources` and tell me where they agree, where they disagree, and what is still missing for my thesis."

The assistant cites file paths in its answer, flags claims that are not actually supported by the underlying text, and asks clarifying questions when sources conflict.

A different boring-but-real win: "Turn my rough thesis bullets into a structured brief with sections and gaps marked TBD."

## Folder to index later (optional)

```bash
bun run seed index ~/research/sources
bun run seed search "what do my sources say about regulation X?"
```

Local indexing is especially useful here because sources are often PDFs that are awkward to paste into a chat surface every time.

## Recipe to try later

- [Google Drive](../../recipes/google-drive/README.md) — if the source library lives there.
- [Obsidian](../../recipes/obsidian/README.md) — if notes already live in a vault.

Skip messaging integrations and always-on agents. Research benefits from a quiet, file-local loop first.
