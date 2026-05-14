# Audit Log

Digital Seed uses audits as working notes, not as proof of production quality.
Simulated audits are useful for finding contradictions; they do not replace
real external users.

## Current posture

- [Production Readiness](production-readiness.md) — current scorecard,
  shipped gates, and 1.0 criteria.
- [Public Usability Roadmap](public-usability-roadmap.md) — current
  stranger-usefulness backlog.
- [Agent Path Validation — 2026-05-14](agent-path-validation-2026-05-14.md)
  — internal Codex CLI, Gemini CLI, and Ollama validation notes.

## Recent simulated audits

- [Simulated Public Alpha Readiness — 2026-05-12](simulated-public-alpha-readiness-2026-05-12.md)
  — updated beginner-path audit after phases, plan, feedback, and agent chooser work.
- [Simulated Public Alpha Readiness — 2026-05-11](simulated-public-alpha-readiness-2026-05-11.md)
  — consolidated public-alpha audit whose fixes shipped in `0.4.1-alpha`.
- [Simulated External User Audit — 2026-05-11](simulated-external-user-audit-2026-05-11.md)
  — hostile three-persona audit focused on first-use contradictions.

## Production / 1.0 audits

- [Production Alpha Hostile Audit — 2026-05-11](hostile-audit-production-alpha-2026-05-11.md)
  — broader-alpha readiness verdict.
- [Hostile 1.0 Readiness Audit — 2026-05-11](hostile-1.0-readiness-audit-2026-05-11.md)
  — explicit "do not tag 1.0 yet" verdict and remaining gates.
- [Hostile 1.0 Readiness Audit Prompt](hostile-1.0-readiness-audit-prompt.md)
  — reusable pre-RC audit prompt.

## Earlier cleanup audits

- [Hostile Audit — 2026-05-10](hostile-audit-2026-05-10.md)
  — early hostile audit of privacy, safety, and first-run gaps.
- [Audit Response — 2026-05-10](audit-response-2026-05-10.md)
  — response plan and cleanup status from the first audit.
- [Hostile Audit — 2026-05-11](hostile-audit-2026-05-11.md)
  — follow-up audit notes after data-room and visual changes.

## Audit prompts

- [Production Alpha Hostile Audit Prompt](hostile-audit-production-alpha-prompt.md)
- [Hostile 1.0 Readiness Audit Prompt](hostile-1.0-readiness-audit-prompt.md)
- [Hostile Product and Ecosystem Audit Prompt](hostile-product-ecosystem-audit-prompt.md)
  — reusable alpha audit prompt for product usefulness, beginner coherence, and
  safe ecosystem/resource-map opportunities.

## What still counts most

The hard gate remains real external validation: at least five first-time users
running the README → first-15-minutes → `bun run seed onboard` →
`bun run seed first-prompt` path cold and reporting where they hesitate.
