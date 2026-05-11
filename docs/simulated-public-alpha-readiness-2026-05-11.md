# Simulated public-alpha readiness audit — 2026-05-11

> **Status:** Internal audit run. Findings consolidated and shipped as `0.4.1-alpha`.
>
> **What this is:** four isolated hostile Claude Code audits were run against `0.4.0-alpha` from a fresh-clone-style starting point and asked to flag P0/P1 issues across the beginner path, privacy/security posture, contributor flow, and release engineering. This document records the consolidated findings and the concrete fixes that landed.
>
> **What this is not:** real external-tester validation. Simulated persona audits are useful as a sanity-check pass but **do not** count toward the 5-real-tester gate in `docs/production-readiness.md → Milestone 5`. Do not interpret this audit as a 1.0 signal.

## Scope of the simulated audit

Each of the four audits independently inspected:

- the README first screen,
- `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`,
- `package.json`, `.gitignore`, `.github/workflows/ci.yml`, `.github/pull_request_template.md`,
- `docs/what-leaves-your-machine.md`, `docs/getting-started.md`, `docs/first-15-minutes.md`, `docs/ai-agent-install.md`, `docs/release-checklist.md`, `docs/production-readiness.md`, `docs/repo-improvement-roadmap.md`, `docs/troubleshooting.md`,
- `scripts/seed.ts`, `scripts/health-check.ts`, `scripts/release-check.ts`,
- `recipes/README.md`, `docs/integration-recipes.md`.

The findings below merge the four audits and drop overlaps.

## Consolidated findings and fixes

### Beginner path — P0/P1

| # | Finding | Fix shipped in `0.4.1-alpha` |
|---|---------|------------------------------|
| 1 | README "Start in 15 minutes" did not name prerequisites. A stranger could try `bun install` before knowing Bun was required. | README now has an explicit **Prerequisites** block (Git, Bun, terminal-capable AI agent) above the `git clone` lines, linking to troubleshooting and the AI-agent install doc. |
| 2 | `README.md` said "canonical path = `bun install` + `bun run seed onboard`" but `docs/getting-started.md` still led with `./setup.sh`, contradicting it. | `docs/getting-started.md` rewritten to lead with the canonical install path. `./setup.sh` is now described only as an optional guided wizard. |
| 3 | `bun run seed onboard --plain` told terminal-anxious users to "open the three core context files" without explaining how. | The onboard output now includes a "How to open these" block (editor / `open` / `xdg-open` / `code`) and a "Two-pane / copy-paste flow" block for `seed first-prompt`. |
| 4 | `bun run seed first-prompt` printed the prompt with no framing — easy to copy the wrong text or paste the literal `$` shell prompt. | `seed first-prompt` now prints a clear "Copy the prompt below" header, "open a terminal in this folder" hint, and `----- copy from below this line -----` rulers. |
| 5 | `bun run seed recipe list` printed slug-only entries — a blind pick for new users. | The recipe list now extracts a one-line description from each recipe's README and prints `<slug>  <description>`. The `_template/` directory is excluded from the list and surfaced as a contributor pointer. |

### Privacy and security — P0/P1

| # | Finding | Fix shipped in `0.4.1-alpha` |
|---|---------|------------------------------|
| 6 | `SECURITY.md` implied `user/` is git-ignored. In reality, `user/COMPASS.md`, `user/ANTI-GOALS.md`, `user/DOMAINS.md`, and `user/README.md` are tracked starter templates. A fork that filled in a tracked template and ran `git commit -a` would publish personal data. | `SECURITY.md` and `user/README.md` rewritten to be explicit about which files are tracked templates vs. ignored personal data. `bun run seed privacy-scan` now emits a non-blocking warning if a tracked template looks filled in (e.g., real `Name:` / `Email:` / `Phone:` lines). |
| 7 | The canonical install path (`bun install` + `bun run seed onboard`) did not install or even mention the pre-commit secret-scan hook. `SECURITY.md` implied the hook was active. Only `./setup.sh` installed it, and the wizard is optional. | New `bun run seed hooks install` command writes the hook into `.git/hooks/pre-commit`. `bun run seed onboard` warns when the hook is missing. `SECURITY.md` is honest: the hook is opt-in and best-effort. `bun run seed doctor`'s "Security hooks" check now points at the new command instead of `setup.sh`. |
| 8 | Digital Seed's own network calls (npm during `bun install`, `r.jina.ai` during `seed web search`) were not fully disclosed. | `docs/what-leaves-your-machine.md` now contains an explicit table of every outbound call Digital Seed itself makes (npm registry, Jina, Google Drive via `gog`, GitHub via `seed update`), with what is sent and when. `bun run seed web --help` carries a first-use disclosure pointing at the doc. |
| 9 | `SECURITY.md` claimed "every significant AI action is logged to `logs/audit.jsonl`". No such log is produced today. | `SECURITY.md` now has an honest "Audit logging — honest status: not implemented yet" section. The aspirational JSON sample is removed. |
| 10 | The MCP server section in `SECURITY.md` used language that implied sandboxing/permission scoping. MCP servers are ordinary local processes with whatever access the user has. | `SECURITY.md` and `docs/what-leaves-your-machine.md` now state plainly: "MCP servers run as ordinary local processes — Digital Seed does not sandbox them." |

### Contributor flow — P1

| # | Finding | Fix shipped in `0.4.1-alpha` |
|---|---------|------------------------------|
| 11 | The PR template asked every PR (including one-line docs typos) to run visual-qa and the fresh-clone harness. That made the checklist feel scary and got skipped wholesale. | PR template restructured into scoped groups: docs-only, code/CLI, privacy/security, visual assets, release-impacting. Visual QA and fresh-clone harness are explicitly optional unless the relevant scope is checked. |
| 12 | `recipes/` had no template. New recipes drifted in shape. | Added `recipes/_template/README.md` with required sections (when to use, what stays local, simplest setup, first-prompt suggestion, troubleshooting). Linked from `recipes/README.md` and `CONTRIBUTING.md`. |
| 13 | `.github/ISSUE_TEMPLATE/` had three templates but no `config.yml`, so a contributor could still open an unstructured "blank" issue. | Added `.github/ISSUE_TEMPLATE/config.yml` with `blank_issues_enabled: false` and contact links pointing at the docs-confusion template (for questions) and the GitHub security advisory flow (for vulnerabilities). |
| 14 | Some public docs said `bun run health`, others said `bun run seed doctor`. Both work, but the inconsistency confused contributors. | Public docs now canonicalize on `bun run seed doctor` and explicitly mention `bun run health` as an alias. |

### Release engineering — P0/P1

| # | Finding | Fix shipped in `0.4.1-alpha` |
|---|---------|------------------------------|
| 15 | The repo had substantial unreleased public-readiness changes on top of `0.4.0-alpha`. Tag/changelog drift was a real risk. | Bumped to `0.4.1-alpha`: `package.json`, `CHANGELOG.md` (new `[0.4.1-alpha]` section), and the `git tag v0.4.1-alpha` instruction in `docs/release-checklist.md` all moved together. Still well below `0.5`/`1.0`. |
| 16 | CI ran on `push` to main and on PRs, but not on `v*` tags. Tagging a release would not exercise CI on the tag commit. | `.github/workflows/ci.yml` now triggers on `tags: ["v*"]` in addition to main-branch pushes and PRs. |
| 17 | CI used `bun-version: latest`. A breaking Bun release could break CI without a corresponding repo change. | Pinned to `bun-version: "1.3.8"`. Bump deliberately when validated locally. |
| 18 | No `CODE_OF_CONDUCT.md`. Contributor expectations were not documented for strangers. | Added `CODE_OF_CONDUCT.md` (Contributor Covenant-style), linked from `CONTRIBUTING.md` and `README.md`. |
| 19 | The status badge in `README.md` pointed at an empty link. | Status badge now links to `docs/known-alpha-limits.md`. |

## Verification run for this audit

Run on `0.4.1-alpha` after the fixes above:

```bash
bun run health
bun run seed privacy-scan
bun run seed visual-qa
bun run check:links
bun run seed release-check --skip-fresh-clone
bash scripts/fresh-clone-check.sh
```

The result of that run, recorded at release time, is summarized in the commit message for `0.4.1-alpha` and in the corresponding `CHANGELOG.md` entry. Any partial passes are explicitly called out.

## What this audit did **not** validate

- **Real external testers** still have not walked through the first-15-minute path on a clean machine. This remains the Milestone 5 P0 gate. See `docs/production-readiness.md → Milestone 5`.
- **A green CI cycle on a tag commit** still has not happened. The CI tag trigger added in this release is a prerequisite, not a substitute, for that gate.
- **Windows-native** is still out of scope. WSL2 is best-effort. See `docs/supported-platforms.md`.

## Release recommendation

After this pass, the honest status is:

- **`0.4.1-alpha`** — broader-alpha ready, with a meaningfully tighter public-readiness story than `0.4.0-alpha`.
- **Not** `0.5`-flavored: scope here was correctness, honesty, and contributor experience, not new features.
- **Not** `1.0.0-rc.1`: the two Milestone 5 P0 gates from `docs/hostile-1.0-readiness-audit-2026-05-11.md` (real testers + green CI on tag) are still open.

The next release decision is real-user validation, not more docs.
