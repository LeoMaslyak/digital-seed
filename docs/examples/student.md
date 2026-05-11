# Example: Student

> Fictional profile. Use as a template, not as a real user.

## Who they are

A second-year undergrad juggling four courses, a part-time job, and a research assistantship. Notes live in a mix of Notion, Google Docs, and a `~/school` folder of PDFs.

They want an assistant that knows what classes they are taking, what exams are coming up, and what they have been struggling with — without having to re-explain it every conversation.

## What to edit first

1. `user/USER.md` — name, university, year, courses, research lab.
2. `user/COMPASS.md` — top priority this term, study habits, what "good" looks like for grades.
3. `user/GOALS.md` — one academic goal per course this term plus one personal goal.

Skim `user/PREFERENCES.md` afterwards to capture "I prefer worked examples over abstract proofs."

## A plausible first win

> "Help me draft a study plan for the next two weeks across all four courses, given my actual deadlines."

The assistant reads `GOALS.md` plus the rough deadline list, then drafts a week-by-week plan and asks where to compress.

A different boring-but-real win: "Summarize the four papers in my reading list for Tuesday's seminar."

## Folder to index later (optional)

```bash
bun run seed index ~/school/notes
bun run seed search "what did the lecture on X cover?"
```

Now the agent can pull from class notes when answering instead of guessing.

## Recipe to try later

- [Obsidian](../../recipes/obsidian/README.md) — if class notes already live in a vault.
- [GitHub repo assistant](../../recipes/github-repo-assistant/README.md) — if coursework is on GitHub.

Skip Drive, Telegram, and always-on agents until the local loop is useful.
