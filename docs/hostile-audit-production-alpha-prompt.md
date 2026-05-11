# Hostile Audit Prompt — Production-Stable Alpha

Use this prompt in a fresh terminal-capable AI session to audit Digital Seed after the `0.4.0-alpha` production-stable gates.

```text
You are auditing the Digital Seed repo as a hostile but constructive reviewer.

Repository: /Users/leozealous/digital-seed
Current intended status: production-stable alpha, not 1.0.

Your task:
1. Treat the repo as if a real public user will clone it today.
2. Verify whether the repo actually delivers on the promise: "useful personal AI context in 15 minutes, local-first, free-first, agent-neutral, privacy-aware."
3. Run real checks, not just document review.
4. Identify what is confusing, brittle, overpromised, unsafe, too founder-specific, too complex, or insufficiently useful.
5. Produce a prioritized next-steps plan to make it better and more useful for potential users.

Required context to inspect:
- README.md
- docs/first-15-minutes.md
- docs/production-readiness.md
- docs/release-checklist.md
- docs/repo-improvement-roadmap.md
- docs/known-alpha-limits.md
- docs/data-room-guide.md
- CHANGELOG.md
- package.json
- scripts/seed.ts
- scripts/publish-data-room.ts
- scripts/visual-qa.py
- scripts/fresh-clone-check.sh
- .github/workflows/ci.yml

Required tests/checks:
- git status --short
- bun install
- bun run health
- bun run seed privacy-scan
- bun run seed visual-qa
- bun run seed onboard --plain
- bun run seed first-prompt
- scripts/fresh-clone-check.sh
- bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com
- Inspect the GitHub Actions workflow for correctness and likely failure modes.
- Check all README quick-start commands are accurate.
- Check that public data room links point to the current clean folder.
- Check whether docs are coherent for a beginner and not duplicative.
- Check whether any private/personal residue remains.
- Check whether the visual/terminal polish supports the product rather than distracting from it.

Hostile audit questions:
- Would a non-expert understand what to do in the first 60 seconds?
- Does the first 15-minute path actually avoid premature complexity?
- Is anything pretending to be automated when it is still a recipe/manual process?
- Are there hidden assumptions: macOS-only, installed Bun, installed Claude, installed Python/Pillow/ffmpeg, Google Drive credentials, existing node_modules?
- Are local-first/privacy claims precise enough?
- Are there broken links, stale names, old Drive folder references, outdated version strings, or docs that contradict each other?
- Is the repo too broad for its promise? What should be cut, hidden, or deferred?
- What would make a user trust it more?
- What would make a user get one useful win faster?

Deliverables:
1. Verdict: one of
   - "ready for broader alpha announcement"
   - "public-alpha usable but not announcement-ready"
   - "not ready"
2. Evidence: commands run and exact pass/fail status.
3. Top 10 findings, ranked by severity and user impact.
4. Top 10 improvements, ranked by leverage/effort.
5. A concrete next implementation plan split into:
   - P0: must fix before announcement
   - P1: should fix soon
   - P2: later polish
6. If safe, implement small obvious fixes during the audit, then commit and push.
7. If larger changes are needed, do not overbuild; document the plan and create crisp tasks.

Constraints:
- Do not send messages/emails or publish anything externally except safe Drive dry-runs.
- Do not upload private files.
- Do not add paid-service requirements to the first-run path.
- Keep integrations opt-in.
- Preserve the accepted terminal visual direction unless there is a serious issue.
- Keep the repo beginner-friendly and honest.
```

## Expected output style

The audit should be blunt, evidence-based, and prioritized. Avoid vague praise. Every major claim should point to a file, command, or observed behavior.
