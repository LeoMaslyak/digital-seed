# Hostile 1.0 Readiness Audit Prompt

A reusable prompt for the final pre-1.0 audit. The point is not polish.
The point is to honestly answer:

> **Would calling this 1.0 be dishonest?**

If the answer is "yes" or "maybe," the repo is not ready, no matter how
nice the README looks.

## When to run this

- Before tagging `1.0.0-rc.1`.
- Again before tagging `1.0.0` after the RC soak.
- Any time someone proposes promoting the alpha tag to a 1.0 tag.

Do **not** run this as a vanity exercise on an alpha. The companion
hostile-alpha audit (`docs/hostile-audit-production-alpha-prompt.md`)
exists for that.

## How to run it

1. Start a fresh terminal-capable AI session against this repo.
2. Paste the prompt block below verbatim.
3. Let the agent inspect files and run checks.
4. Read the verdict skeptically. Re-run if the agent dodges blockers.
5. File any new P0/P1 findings as issues before the tag.

## The prompt

```text
You are conducting a hostile 1.0 readiness audit of the Digital Seed
repo. Your only job is to decide: would calling this 1.0 be dishonest?

Repository: /Users/leozealous/digital-seed
Proposed version under audit: <FILL IN: 1.0.0-rc.1 or 1.0.0>

Ground rules:
- Focus on blockers, not polish.
- Reward honesty about scope. Punish overpromising.
- If you are uncertain, default to "not yet."
- A simulated walkthrough is not real validation. Treat it as a sanity
  check at best.
- The current public version of this repo is an alpha. Anything that
  looks 1.0-aspirational but is not actually true is a P0 blocker.

Required context to inspect (read fully):
- README.md
- docs/first-15-minutes.md
- docs/first-useful-outcomes.md
- docs/demo-transcript.md
- docs/supported-platforms.md
- docs/known-alpha-limits.md
- docs/what-leaves-your-machine.md
- docs/production-readiness.md (especially Milestone 5 + RC discipline)
- docs/release-checklist.md
- docs/repo-improvement-roadmap.md
- docs/troubleshooting.md
- CHANGELOG.md
- SECURITY.md
- package.json
- scripts/seed.ts
- scripts/release-check.ts
- scripts/fresh-clone-check.sh
- .github/workflows/ci.yml

Required checks (run, do not just describe):
- git status --short
- git log --oneline -n 20
- bun install --frozen-lockfile
- bun run health
- bun run seed privacy-scan
- bun run seed visual-qa
- bun run seed onboard --plain
- bun run seed first-prompt
- bun run check:links
- bun run seed release-check --skip-fresh-clone
- bash scripts/fresh-clone-check.sh

1.0 blocker questions (the audit must answer each, with evidence):

A. Does the README, on a cold read, accurately describe what this repo
   is at the proposed version? Or is it pitching aspirations?
B. Does the first-15-minute path work end-to-end on a fresh clone on at
   least one supported platform, as evidenced by a real CI run on the
   tag commit?
C. Are macOS and Linux both green in CI for the tag commit?
D. Is the Windows/WSL2 stance explicit and honest?
E. Are there any docs contradictions in the beginner path? Even one is a
   P0.
F. Does `what-leaves-your-machine.md` accurately reflect every command
   in the beginner surface? Anything that sends data without explicit
   user action is a P0.
G. Does `production-readiness.md` claim status the repo cannot back up?
H. Does the CHANGELOG have a real entry for the proposed version,
   linked to real changes since the previous tag?
I. Have at least 5 real external testers walked the path? If the answer
   is "simulated personas only," 1.0 is dishonest.
J. Are alpha-only commands (scheduler, marketplace, digest, learn,
   excel, deck, etc.) still clearly fenced off from the beginner
   surface? Or has scope crept?
K. Are integration recipes still labeled "Official alpha-supported" vs
   "Experimental / adapt-yourself"? At 1.0, every recipe in the
   "official" bucket must actually be load-bearing on a fresh clone.
L. Does any command, doc, or asset in the repo overpromise (e.g. claim
   production-grade, enterprise-ready, multi-tenant, secure-by-default,
   audited) without proof?
M. Is the privacy-scan deny-list current and is the scanner actually
   catching the things it is supposed to catch?
N. Does the version string match in package.json, CHANGELOG.md, and
   docs/release-checklist.md?
O. If a stranger forked this today and removed everything they did not
   need, what would break first? That is the load-bearing surface; is
   it documented?

Hostile counter-arguments to consider:
- "But the alpha has been useful for me." → Personal usefulness is not
  1.0 trust. Distinct standards.
- "But we already audited it." → The previous audits were alpha audits.
  1.0 is a different bar.
- "But fixing this would delay 1.0." → That is exactly why you ask now,
  not after the tag.
- "But the docs are clear." → Clear on what? Clear vs accurate are
  different.

Deliverables (in this order):

1. Verdict: one of
   - "1.0 would be honest — proceed with tag" (rare).
   - "1.0 would be aspirational — do not tag yet."
   - "1.0 would be dishonest — explicit blockers below."

2. Evidence: commands run, exact pass/fail, file references.

3. P0 blockers: anything that, if a real external user encountered it
   on a fresh clone, would make them feel lied to by the 1.0 label.
   Each P0 must point to a file or command.

4. P1 issues: high-trust gaps that are not strictly dishonest but
   would erode credibility within the first week of 1.0.

5. P2 polish: things to fix eventually. Do not let P2s delay 1.0.

6. Explicit list of claims in README/docs/CHANGELOG that would be
   false at 1.0 today and must be either backed up or softened.

7. A re-cut suggestion: if the verdict is not "proceed," what concrete
   work (count by P0 / P1) must close before re-running this audit?

8. Honest one-paragraph answer: "If I had to ship 1.0 right now, what
   would I lie about?" Be specific.

Constraints:
- Do not send messages, emails, or external publishes.
- Do not modify code in this audit pass; this is read + run + report.
- Do not allow "would be nice" items to dilute P0/P1 findings.
- Do not accept "trust me, it works" without evidence.
```

## Expected output style

The audit should read like a deposition, not a marketing recap:

- Each finding cites a file path or a command output.
- Each P0/P1 names the specific user it would betray (the beginner, the
  privacy-skeptical user, the open-source contributor).
- The verdict is one sentence, defended by the body.
- The honest closing paragraph names the lie, if there is one.

## What this audit does *not* replace

- Real external-tester walkthroughs. Even a perfect audit verdict does
  not substitute for five real users running `bun run seed onboard` on
  their own machines.
- Long-running CI history. One green CI run is necessary but not
  sufficient — Milestone 5 requires a green release cycle, not a single
  pass.
- The 2–4 week RC soak between `1.0.0-rc.1` and `1.0.0`.

## See also

- [Production Readiness → Release candidate discipline](production-readiness.md#release-candidate-discipline)
- [Release Checklist](release-checklist.md)
- [Supported Platforms](supported-platforms.md)
- [Hostile Alpha Audit Prompt](hostile-audit-production-alpha-prompt.md)
  — the lower-bar alpha equivalent.
