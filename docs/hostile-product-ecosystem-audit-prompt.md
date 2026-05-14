# Hostile Product and Ecosystem Audit Prompt

Copy/paste this into a fresh terminal-capable agent session when you want a
hostile audit of Digital Seed's usefulness, documentation, and next feature
opportunities.

```text
We are continuing work on Digital Seed at /Users/leozealous/digital-seed.

Current status:
- Digital Seed is a public alpha at `v0.4.3-alpha`, not 1.0.
- The GitHub prerelease exists:
  https://github.com/LeoMaslyak/digital-seed/releases/tag/v0.4.3-alpha
- CI is green on main and on the `v0.4.3-alpha` tag.
- The NotebookLM intro video is available through:
  - GitHub Pages player:
    https://leomaslyak.github.io/digital-seed/intro-video.html
  - GitHub Release asset:
    https://github.com/LeoMaslyak/digital-seed/releases/download/v0.4.3-alpha/digital-seed-notebooklm-intro.mp4
  - Google Drive fallback:
    https://drive.google.com/file/d/1EepOk9V3YA1egd7PcW0LsePH0B7NZQo8/view?usp=drivesdk
- The public data room is optional. GitHub is the source of truth:
  https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG
- Real external validation is still the hard gate. Simulated audits,
  maintainer walkthroughs, and agent validations do not count as real outside
  user proof.

Your task:
Run a hostile but constructive audit of the whole repo and product concept.
Find the highest-leverage improvements that would make Digital Seed more useful
for strangers and better at guiding someone from "starter repo" to the personal
AI operating context they actually want.

Start by reading:
- README.md
- docs/first-15-minutes.md
- docs/external-tester-guide.md
- docs/notebooklm-intro-video.md
- docs/production-readiness.md
- docs/public-usability-roadmap.md
- docs/repo-improvement-roadmap.md
- docs/agent-path-validation-2026-05-14.md
- docs/audit-log.md
- docs/phases.md
- docs/first-useful-outcomes.md
- docs/what-leaves-your-machine.md
- docs/integration-recipes.md
- docs/architecture-map.md
- docs/known-alpha-limits.md
- docs/data-room-guide.md
- scripts/seed.ts
- scripts/publish-data-room.ts

Core audit goals:
1. Find contradictions, stale claims, broken links, confusing steps, or hidden
   assumptions in the beginner path.
2. Stress-test whether a mostly non-technical external tester can use the repo,
   watch the intro video, follow the tester guide, and give useful feedback
   without knowing GitHub or terminal culture.
3. Evaluate whether `seed onboard`, `seed first-prompt`, `seed what-next`,
   `seed plan`, and `seed feedback` form a coherent guided path.
4. Look for ways to better guide users from Phase 1 local context into a
   gradually built personal OS without adding broad new features or
   overwhelming beginners.
5. Audit the privacy/trust boundaries. Call out anything that makes local-first,
   free-first, privacy-aware, or agent-neutral claims imprecise.
6. Do not treat simulated audit results, the NotebookLM video, or internal agent
   validation as external validation.

Ecosystem and information-source goals:
1. Identify which open-source projects, frameworks, protocols, and patterns
   Digital Seed should point users toward, and where those references should
   live. Think in categories:
   - agent frameworks and agent CLIs
   - local-first knowledge management
   - personal knowledge bases and notes apps
   - retrieval/search/indexing tools
   - MCP servers and tool protocols
   - local models and offline inference
   - privacy/security practices for personal AI systems
   - workflow automation and integrations
   - evals, observability, and audit logging
2. Separate "safe to mention in beginner docs" from "advanced reference only."
   Beginners should not be pushed into broad framework shopping before their
   first useful output.
3. Recommend a safe information architecture for this material. Examples:
   - a `docs/ecosystem-map.md`
   - a `docs/source-quality-policy.md`
   - a `seed resources` command
   - a recipe index with trust/safety notes
   - a curated "what to learn next" page per phase
4. Define source-quality rules. Prefer official docs, primary repos, active
   maintenance signals, clear licenses, privacy posture, local-first fit, and
   beginner risk notes. Flag stale/unmaintained/security-sensitive projects.
5. Do not add unverified claims about third-party projects. If current facts
   matter, browse or otherwise verify from primary sources before recommending
   a project.

Architecture/product opportunity goals:
1. Context file structure: is it minimal enough for day one but extensible?
2. Phase progression: does each phase have a clear "why now" and "stop here"
   rule?
3. Local search/index loop: is it useful enough, discoverable enough, and safe?
4. Recipes/integrations: are they opt-in, scoped, and ordered by user maturity?
5. Agent-neutral support: does the project avoid overfitting to one agent?
6. Feedback loop: can outside users report friction with minimal effort?
7. Release/readiness docs: are they honest and not performative?
8. Video/data-room path: does it help strangers, or does it add another source
   of drift?

Severity taxonomy:
- P0: blocks first-time use, causes serious trust/safety risk, or creates a
  false validation/production claim.
- P1: likely confusion for many external users or a meaningful adoption blocker.
- P2: polish, wording, structure, or maintainability improvement.
- Strategic: bigger architecture/product opportunities to consider later.

Implementation rules:
- If there are clear P0/P1 fixes, implement narrowly.
- Do not add broad features unless they directly improve the path from first
  useful output to a personal OS.
- Keep beginner surfaces simple.
- Do not make the README into a catalog of tools.
- Do not add paid-service requirements.
- Do not connect, send, upload, or publish external user data.
- Do not treat NotebookLM output as factual authority; it is explanatory media.
- If you add third-party project references, include why they belong, where
  they fit by phase, and what the safety caveat is.

Verification:
- Always run:
  - bun run seed release-check --ci --skip-install
  - bun run check:links
- Also run `bash scripts/fresh-clone-check.sh` if release-path, first-run,
  README, install, Pages/video, or CLI docs changed materially.
- If you modify data-room mapped files, run:
  - bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com
  Do not publish live unless explicitly asked.

Deliverables:
1. Concise hostile findings report with file/line references where possible.
2. P0/P1/P2/Strategic findings, separated clearly.
3. A ranked list of the next 3 implementation moves.
4. A ranked list of ecosystem/resource-map opportunities, including what should
   remain advanced-only.
5. Any implemented fixes, with changed files listed.
6. Verification command results.
7. Clear statement of what still requires real external users.
```

## Expected Output Style

The audit should read like a serious product/security review, not a marketing
recap. Prioritize evidence, user impact, and concrete next moves. Do not invent
third-party project facts from memory when current maintenance, license, or
security posture matters.
