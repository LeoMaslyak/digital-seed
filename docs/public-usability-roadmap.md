# Public usability roadmap

Digital Seed is credible public alpha software. The next goal is not "more features" by default — it is making the starter kit obvious, trustworthy, and repairable for strangers.

## What can be done before real external users

These are the useful no-external-user milestones:

1. **Make feedback effortless**
   - Keep `bun run seed feedback` visible in README, troubleshooting, and onboarding docs.
   - Maintain a dedicated first-run friction issue template for non-technical users.
   - Keep GitHub-web PR instructions short enough that a typo fix does not require local Git knowledge.

2. **Keep reducing first-run ambiguity**
   - Audit README, `docs/first-15-minutes.md`, `docs/ai-agent-install.md`, and `bun run seed onboard --plain` together.
   - Every load-bearing step should answer: what command, where to run it, what success looks like, and where to go if it fails.

3. **Preserve the beginner / advanced / maintainer boundary**
   - Beginner: onboard, doctor, first-prompt, privacy-scan, index/search, recipe list, feedback.
   - Advanced: integrations, Drive, web, scheduler, digest, repo learning, Excel/deck generation.
   - Maintainer: release, CI, visual QA, data-room publishing.

4. **Strengthen safety defaults**
   - Keep privacy scan, tracked-template warnings, and pre-commit hook instructions easy to find.
   - Prefer explicit warnings over hidden automation.
   - Do not add sending/uploading/deleting flows to the first-run path.

5. **Make every failure report actionable**
   - Ask for OS, Bun version, command/page, expected behavior, and exact friction.
   - Never require a perfect reproduction from non-technical users.
   - Let maintainers relabel and reshape messy reports.

## What still requires real users

These cannot be honestly closed internally:

- 5+ real external first-15-minute walkthroughs.
- Proof that non-technical users understand what to do after cloning.
- Evidence that issue templates are easy enough for strangers.
- Real objections to the privacy/security explanation.
- Real confirmation that the beginner command surface feels small enough.

Simulated hostile audits are useful, but they do not replace these.

## Useful concepts from the broader personal-AI system

The larger personal AI operating-system idea has several concepts that are useful to public Digital Seed users if kept small and optional:

- **Context files as the source of truth** — `USER.md`, `COMPASS.md`, `GOALS.md`, preferences, anti-goals, and memory are easier for beginners to trust than opaque app state.
- **First-win discipline** — the assistant should help produce one boring real result before integrations or automation.
- **Local-first retrieval** — indexing one local folder is enough for many users; hosted vector databases should stay optional.
- **Recipes instead of monolithic setup** — integrations should be small, inspectable, and labeled official alpha-supported vs experimental.
- **Doctor / privacy-scan / feedback loop** — users need simple commands that answer: is my setup healthy, is this safe to publish, and how do I report friction?
- **Agent-neutral prompts** — the project should keep working with Claude Code, Cursor, Windsurf, OpenClaw, Hermes, or any terminal-capable agent.
- **Draft-before-action safety** — anything that sends, uploads, deletes, publishes, or changes external accounts should start as a draft and require human confirmation.
- **Audit notes as public trust artifacts** — hostile-readiness audits are valuable when they stay honest and do not overclaim 1.0 readiness.

## Feature ideas worth considering later

Only add these if they make the first public-user loop simpler:

- `seed feedback --write-draft` style helpers for other surfaces, such as `seed support-bundle` that prints redacted setup facts without private content.
- A tiny terminal "what now?" command after onboarding that suggests exactly one next action.
- A guided docs-edit flow that opens the right GitHub file URL for small wording fixes.
- Optional example packs for common personas: student, founder, researcher, freelancer, caregiver, investor.
- A local-only onboarding transcript saved under `user/` so users can resume setup without remembering what they answered.

Avoid adding:

- default cloud accounts,
- always-on messaging bots,
- hosted databases,
- complex dashboards,
- email/calendar automation,
- or multi-agent orchestration to the day-one path.

Those are useful later, but they will make the public alpha worse if they crowd the first 15 minutes.
