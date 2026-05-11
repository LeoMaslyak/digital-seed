# User Context

This directory holds your personal context files.

The repo ships **starter templates** for the three files most beginners pre-fill (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) and **ignores** the rest by default (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`) so your filled-in personal versions stay out of git.

| File | Purpose | Git status |
|------|---------|-----------|
| `USER.md` | Who you are — name, role, timezone | **ignored** (your data) |
| `COMPASS.md` | Direction, values, priorities, decision principles | **tracked** (template) |
| `GOALS.md` | What you're working toward | **ignored** (your data) |
| `DOMAINS.md` | Projects, responsibilities, work areas, learning areas | **tracked** (template) |
| `PREFERENCES.md` | How you like to work | **ignored** (your data) |
| `ANTI-GOALS.md` | What you explicitly do not want to optimize for | **tracked** (template) |
| `MEMORY.md` | Durable facts and lessons your AI should preserve | **ignored** (your data) |

**Honest nuance:** if you fork Digital Seed and put real personal content into a tracked template, `git status` will not warn you and `git commit -a` will commit it. Either keep the templates as starter shapes and put real content into the four ignored files, or run `bun run seed privacy-scan` before pushing — it warns when a tracked template looks filled in.

The optional setup wizard (`./setup.sh`) can create or update these files. The canonical 15-minute path simply opens them in your editor.

> Tip: start rough. Specific, imperfect context beats polished emptiness.
