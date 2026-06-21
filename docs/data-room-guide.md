# Digital Seed Public Data Room Guide

Use this as the structure for the public Google Drive / learning folder that accompanies the repo.

GitHub is the source of truth. The data room is optional: a public
workshop/share pack for non-GitHub audiences, public handouts, visual assets,
and NotebookLM source material. If the Drive folder ever drifts from the repo,
trust the repo and refresh or retire the stale Drive copy.

**Current public folder:** [Digital Seed — Public Starter Kit](https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG)

> **Your personal files are NEVER published.** The data room only contains the
> repo's public docs, visual assets, recipes, and **pristine blank templates**
> (sourced from `docs/data-room/templates/*.template.md`). The publisher will
> **refuse** to upload anything under `user/` or any `USER/GOALS/MEMORY/`
> `PREFERENCES/COMPASS/DOMAINS/ANTI-GOALS.md` file, and it runs the privacy scan
> as a hard gate before any live upload. Your filled-in `user/*.md` context —
> your identity, goals, and AI memory — stays on your machine. This matches
> `SECURITY.md`: back up `user/` locally, not to a public service.

## Publishing

The folder is owned by `leomaslyak@gmail.com` and shared as "anyone with the link, viewer."
Because that folder is world-readable, the publisher is deliberately conservative
about what it will upload (see the safety guarantees above).

To refresh from the local repo, run:

```bash
bun run seed drive publish-data-room --dry-run   # show the plan (filenames only)
bun run seed drive publish-data-room             # upload for real
```

The script reads the manifest in `scripts/publish-data-room.ts`, finds existing files by name inside each subfolder, moves them to Drive trash, and uploads the current local version. It only touches files inside the matched root folder.

**What the dry-run shows:** the dry-run prints the *plan* — for each file it lists
the source path, the destination filename, the file size, the destination folder
URL, and a `PERSONAL-DATA` flag. It does **not** print the file contents, so it is
not a substitute for opening a file to confirm what is inside it. The
`PERSONAL-DATA` flag will read `NO` for every file the publisher is willing to
upload; anything that would carry personal data is refused outright (and never
appears as an upload at all).

A live publish additionally runs `bun run seed privacy-scan` first and aborts if
that scan finds anything to review.

If you fork the repo, pass `--folder <yourFolderId>` to publish into your own Drive folder, or `--root "Your Folder Name"` to look up by name. The personal-file refusal and the privacy gate apply to forks too.

If the `gog` CLI is unavailable or you cannot get edit access, fall back to the manual upload mapping below.

### Permission fallbacks

Older shared folders sometimes contain files that the current publishing account cannot delete (Drive returns `403 insufficientFilePermissions`). The publisher handles this in three layers:

1. **Default:** try to delete each prior copy; on a permission error, log a warning and continue by uploading the new copy alongside the old one. The run still succeeds, and the summary tells you how many fallbacks happened.
2. **`--no-delete` (alias for `--replace-strategy skip-delete`)**: do not attempt the delete at all. Useful when you know the prior folder is locked and you just want to push the latest copies. Viewers will see two files with the same name; the newest one shows up at the top by "modified" date.
3. **`--strict`**: revert to the old behaviour and hard-fail on any delete error. Use this in CI or release checklists when you want to be told loudly that the folder no longer matches assumptions.

```bash
# Best for ongoing maintenance of a folder you fully own:
bun run seed drive publish-data-room

# Best for a legacy/shared folder where some prior files are locked:
bun run seed drive publish-data-room --no-delete

# Best for a release gate that should fail loudly:
bun run seed drive publish-data-room --strict
```

For a complete reset, create a fresh folder in Drive, share it as "anyone with the link → viewer," then publish into it with `--folder <newFolderId>` and update the README + this guide with the new link.

## Purpose

The data room should help a non-expert understand:

- what personal AI infrastructure is
- why a local-first assistant can be useful
- how to install Digital Seed
- how to personalize it
- how to grow it into their own work system
- how to generate a short NotebookLM overview video from curated sources

It should not contain private, school-specific, employer-specific, or copyrighted workshop materials.

## Recommended folder structure

```text
Digital Seed — Public Starter Kit/
├── 00 Start Here/
│   ├── START HERE.md
│   ├── README — What This Is.md
│   ├── First 15 Minutes.md
│   ├── Let an AI Agent Install It.md
│   └── First Session Prompt.md
├── 01 Visual Story/
│   ├── Digital Seed — Growth Loop.mp4
│   ├── Digital Seed — Growth Loop.webm
│   ├── Digital Seed — Growth Loop.gif
│   ├── Digital Seed — Growth Still.png
│   ├── Digital Seed — Magical Tree.svg
│   └── README.md
├── 02 Guides/
│   ├── Free First Setup.md
│   ├── Agent Chooser.md
│   ├── Architecture Map.md
│   ├── Integration Recipes.md
│   ├── Dashboard Options.md
│   └── Known Alpha Limits.md
├── 03 Templates/          # pristine blank scaffolds — NOT your filled-in user/*.md
│   ├── USER.template.md
│   ├── COMPASS.template.md
│   ├── GOALS.template.md
│   ├── DOMAINS.template.md
│   ├── PREFERENCES.template.md
│   ├── ANTI-GOALS.template.md
│   └── MEMORY.template.md
├── 04 Recipes/
│   ├── Recipes Overview.md
│   ├── obsidian.md
│   ├── google-drive.md
│   ├── telegram-bot.md
│   ├── openclaw-agent.md
│   ├── hermes-agent.md
│   ├── claude-code-project.md
│   └── github-repo-assistant.md
├── 05 Audit and Safety/
│   ├── Governance.md
│   └── Audit Response.md
└── 06 NotebookLM Intro Video/
    ├── Digital Seed - Building a Local-First Personal AI.mp4
    ├── NotebookLM Intro Source.md
    └── NotebookLM Video Instructions.md
```

## Must exclude

- **your filled-in `user/*.md` files** (`USER`, `GOALS`, `MEMORY`, `PREFERENCES`,
  `COMPASS`, `DOMAINS`, `ANTI-GOALS`) — these are your personal context and the
  publisher refuses them; the data room ships only the pristine
  `docs/data-room/templates/*.template.md` scaffolds
- institution-specific workshop files
- classroom, learning, mentor, or user material
- private personal examples
- copyrighted domain/company cases
- private Google Drive links
- tokens, credentials, hidden config, personal IDs

## Public examples to use instead

Use generic examples:

- freelancer building a client/project system
- founder managing research, sales, product, and admin
- user learning independently from public materials
- knowledge worker organizing notes and recurring tasks
- small team creating a shared operating context

## Suggested first public artifacts

1. Short intro deck
2. Setup handout
3. First-session onboarding script
4. Template pack
5. Demo transcript using fictional user data
6. Privacy checklist

## Manual upload fallback (no `gog`)

If you cannot use the publisher script, recreate the folder layout above and upload these local files into each subfolder. Names on the right are exactly what should appear in Drive.

```text
00 Start Here/
  docs/data-room/start-here.md            → START HERE.md
  docs/data-room/readme-what-this-is.md   → README — What This Is.md
  docs/first-15-minutes.md                → First 15 Minutes.md
  docs/ai-agent-install.md                → Let an AI Agent Install It.md
  docs/first-session-prompt.md            → First Session Prompt.md

01 Visual Story/
  docs/assets/digital-seed-growth.mp4     → Digital Seed — Growth Loop.mp4
  docs/assets/digital-seed-growth.webm    → Digital Seed — Growth Loop.webm
  docs/assets/digital-seed-growth.gif     → Digital Seed — Growth Loop.gif
  docs/assets/digital-seed-growth-still.png → Digital Seed — Growth Still.png
  docs/assets/seed-tree-magic.svg         → Digital Seed - Magical Tree.svg
  docs/data-room/visual-story-readme.md   → README.md

02 Guides/
  docs/free-first-setup.md                → Free First Setup.md
  docs/agent-chooser.md                   → Agent Chooser.md
  docs/architecture-map.md                → Architecture Map.md
  docs/integration-recipes.md             → Integration Recipes.md
  docs/dashboard-options.md               → Dashboard Options.md
  docs/known-alpha-limits.md              → Known Alpha Limits.md

03 Templates/   # pristine blank scaffolds ONLY — never upload your filled-in user/*.md
  docs/data-room/templates/USER.template.md        → USER.template.md
  docs/data-room/templates/COMPASS.template.md     → COMPASS.template.md
  docs/data-room/templates/GOALS.template.md       → GOALS.template.md
  docs/data-room/templates/DOMAINS.template.md     → DOMAINS.template.md
  docs/data-room/templates/PREFERENCES.template.md → PREFERENCES.template.md
  docs/data-room/templates/ANTI-GOALS.template.md  → ANTI-GOALS.template.md
  docs/data-room/templates/MEMORY.template.md      → MEMORY.template.md

04 Recipes/
  recipes/README.md                            → Recipes Overview.md
  recipes/obsidian/README.md                   → obsidian.md
  recipes/google-drive/README.md               → google-drive.md
  recipes/telegram-bot/README.md               → telegram-bot.md
  recipes/openclaw-agent/README.md             → openclaw-agent.md
  recipes/hermes-agent/README.md               → hermes-agent.md
  recipes/claude-code-project/README.md        → claude-code-project.md
  recipes/github-repo-assistant/README.md      → github-repo-assistant.md

05 Audit and Safety/
  docs/governance.md                  → Governance.md
  docs/audit-response-2026-05-10.md   → Audit Response.md

06 NotebookLM Intro Video/
  GitHub Release asset                       → Digital Seed - Building a Local-First Personal AI.mp4
  docs/data-room/notebooklm-intro-source.md → NotebookLM Intro Source.md
  docs/notebooklm-intro-video.md            → NotebookLM Video Instructions.md
```

The MP4 itself is not committed to git. It is hosted as a GitHub Release asset
and played through `docs/intro-video.html` on GitHub Pages:
https://leomaslyak.github.io/digital-seed/intro-video.html

Keep the Drive copy as a fallback for people who start in the data room, but
keep the repo and release asset canonical.

After uploading, set the root folder to "Anyone with the link → Viewer" and confirm the link still resolves.
