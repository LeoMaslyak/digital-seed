# Next Session Prompt

Copy/paste this into a fresh Claude Code or terminal-capable agent session.

```text
We are continuing work on Digital Seed at /Users/leozealous/digital-seed.

Current status:
- Repo is public-alpha ready at `0.4.3-alpha`, not 1.0.
- `v0.4.3-alpha` is published as a GitHub prerelease and CI is green on main
  and the tag.
- Current estimate: 8/10 external-user usefulness as a public alpha and ~85%
  production-grade OSS readiness without external validation.
- Real external validation is still the hard gate: simulated audits and
  maintainer agent checks do not count as outside-user proof.
- Recent work shipped:
  - External tester guide and feedback template.
  - Codex CLI, Gemini CLI, and Ollama internal validation notes.
  - Audit log index.
  - `seed what-next` and tightened `seed first-prompt`.
  - Public-alpha release notes and release gate cleanup.

Strategic assessment:
- Core concept / positioning: ~92%.
- First-run beginner path: ~88%.
- Release engineering: ~82%.
- Docs / trust / safety: ~83%.
- Open-source contributor readiness: ~80%.
- Product coherence: ~82%.
- External validation: ~0%.

Your task:
Run the next hostile audit or external-tester preparation pass. Prioritize real
first-time user walkthroughs and fix any P0/P1 beginner-path contradictions
before adding features.

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
1. Re-read the current beginner path: README, first-15-minutes, external tester
   guide, phases, first useful outcomes, production readiness, public usability
   roadmap, repo improvement roadmap, audit log, and `scripts/seed.ts`.
2. Look for stale status claims, confusing non-technical tester steps, and gaps
   between `seed onboard`, `seed first-prompt`, `seed what-next`, `seed plan`,
   and `seed feedback`.
3. Fix clear P0/P1 issues narrowly.
4. Run `bun run seed release-check --ci --skip-install`, `bun run check:links`,
   and `bash scripts/fresh-clone-check.sh` if release-path or first-run docs
   changed materially.

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
