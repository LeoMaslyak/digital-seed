# Next Session Prompt

Copy/paste this into a fresh Claude Code or terminal-capable agent session.

```text
We are continuing work on Digital Seed at /Users/leozealous/digital-seed.

Current status:
- Repo is broader-alpha ready at `0.4.0-alpha`, not 1.0.
- Current estimate: ~72% of “100% usable OSS project”.
- Latest commits:
  - `11bc586 Improve beginner production readiness`
  - `ef67799 Add release engineering gate`
- Recent work shipped:
  - Examples gallery: student, founder/operator, researcher/investor, freelancer/consultant.
  - `bun run seed onboard --write-first-win` and `user/FIRST-WIN.md` flow.
  - `seed first-prompt` points to FIRST-WIN when present.
  - Markdown link checker: `bun run check:links`, wired into CI.
  - Health check pass vs pass-with-warnings semantics.
  - Troubleshooting guide.
  - Help taxonomy cleanup: beginner / optional / advanced / maintainer.
  - Unified release gate: `bun run seed release-check` and `bun run release:check`.
  - Version consistency gate for package/changelog/release checklist.
  - CI-safe release check.
  - Consolidated release checklist.
  - Day-one / not-day-one guidance.

Strategic assessment:
- Core concept / positioning: ~90%.
- First-run beginner path: ~80%.
- Release engineering: ~75%.
- Docs / trust / safety: ~70%.
- Open-source contributor readiness: ~50% — biggest next gap.
- Product coherence: ~65%.
- External validation: ~20–30%.

Your task:
Implement the next milestone: **Milestone 3 — Open-source usability**.

Start by reading:
- README.md
- CONTRIBUTING.md
- SECURITY.md
- docs/production-readiness.md
- docs/repo-improvement-roadmap.md
- docs/troubleshooting.md
- docs/known-alpha-limits.md
- docs/release-checklist.md
- package.json

Scope:
1. Tighten `CONTRIBUTING.md` for first-time external contributors.
   - Explain the simplest contribution paths: docs fixes, examples, recipes, bug reports.
   - Include exact local verification commands.
   - Keep tone beginner-friendly and low-friction.

2. Add GitHub issue templates:
   - `.github/ISSUE_TEMPLATE/bug_report.yml`
   - `.github/ISSUE_TEMPLATE/docs_confusion.yml`
   - `.github/ISSUE_TEMPLATE/integration_recipe_request.yml`
   - Templates should ask for OS, Bun version, command run, expected/actual behavior, logs, and privacy-safe reproduction info where relevant.

3. Add PR template:
   - `.github/pull_request_template.md`
   - Include checklist for privacy, docs, `bun run check:links`, and `bun run seed release-check --skip-fresh-clone`.

4. Add or improve a short security/privacy trust page focused on:
   - What stays local.
   - What may leave the machine through the AI agent/provider.
   - What Drive/email/messaging integrations do and do not do by default.
   - No credentials in repo.
   - Draft/confirm before external actions.
   - Link it from README, known alpha limits, and troubleshooting.

5. Update roadmap/spec/docs after implementation:
   - Mark Milestone 3 items shipped where appropriate.
   - Keep Milestone 4 product coherence as next target.

Constraints:
- Do not add paid-service requirements.
- Do not publish/upload/send anything externally.
- Keep the project local-first, free-first, agent-neutral, privacy-aware.
- Do not overbuild a governance bureaucracy; this is still an alpha starter kit.
- Do not commit or push; leave changes for parent session review unless explicitly told otherwise.

Verification required before finishing:
- bun run health
- bun run seed privacy-scan
- bun run seed visual-qa
- bun run check:links
- bun run seed release-check --skip-fresh-clone
- bash scripts/fresh-clone-check.sh

Deliverable:
- Concise summary of files changed.
- Exact pass/fail status of each verification command.
- Any remaining blockers or recommended next milestone tasks.
```
