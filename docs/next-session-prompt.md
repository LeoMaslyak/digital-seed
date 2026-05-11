# Next Session Prompt

Copy/paste this into a fresh Claude Code or terminal-capable agent session.

```text
We are continuing work on Digital Seed at /Users/leozealous/digital-seed.

Current status:
- Repo is at production-stable alpha (`0.4.0-alpha`), not 1.0.
- Latest production gate commit: `7125509 Ship production-stable alpha gates (0.4.0-alpha)`.
- Recent work added:
  - GitHub-dark embedded hero visual with bushier fruit-bearing mature canopy.
  - Locked terminal intro visual (`bun run seed intro`).
  - Public data room publisher and clean Drive folder.
  - CI workflow for macOS/Linux.
  - Fresh-clone validation harness.
  - Visual QA guardrail.
  - Production readiness + release checklist docs.

Your task:
Run the hostile production-alpha audit in `docs/hostile-audit-production-alpha-prompt.md`.

Important:
- Run the required commands for real.
- Check docs and actual behavior.
- Be hostile but constructive.
- Determine whether Digital Seed is ready for a broader alpha announcement.
- Implement only small obvious fixes; otherwise produce a prioritized next-step plan.
- Commit and push any safe fixes.

Start by reading:
- README.md
- docs/hostile-audit-production-alpha-prompt.md
- docs/production-readiness.md
- docs/release-checklist.md
- docs/repo-improvement-roadmap.md
```
