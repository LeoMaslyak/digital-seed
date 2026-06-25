# Changelog

All notable changes to Digital Seed will be documented in this file.

## [Unreleased]

### Added

- **A trust surface — `seed whoami` (roadmap B6).** A read-only local dashboard that plainly shows
  what's stored on this machine (which context + data files exist), what *can* leave it (by default
  nothing automatic; flags cloud embeddings / digest delivery if you've turned them on, and lists the
  on-demand network commands), what your agent must ask you before doing (the high-risk-action list),
  and how to stay in control (plain files you own; `git restore`; `seed privacy-scan`). Makes the
  local-first guarantee visible at the moment it matters. Strictly read-only — no network, no
  subprocess, no mutation; never prints a configured webhook URL or address (on/off only).

- **A "what can it do?" task gallery — `seed examples` (roadmap B5).** A curated set of concrete,
  copy-paste task prompts ("draft my week from my goals", "turn these notes into a recap", "think
  through a decision with me") a newcomer can hand straight to their agent — every one works with
  local context only, nothing leaves the machine. `seed examples <category>` filters (planning /
  writing / learning / research / life-admin / decisions); `seed examples --check` validates the
  gallery. Backed by `examples/examples.yaml` (community-contributable, validated + sanitized on load,
  mirroring the tool catalog); surfaced from `seed start` and the examples docs. Distinct from the
  existing persona profiles in `docs/examples/`.

- **Opt-in daily scheduling + desktop notification for the digest (roadmap B1, follow-up).**
  `seed digest --schedule [HH:MM]` prints a ready-to-use plan (cron line on Linux, launchd on macOS)
  and only touches your system behind an explicit `--install`; the crontab edit is append-safe (a
  tagged block, backup-first) and reversible with `seed digest --unschedule`. `seed digest --notify`
  adds a best-effort desktop ping (the scheduled job uses `--save --notify`). Every subprocess uses
  argv-form `safe-exec` (never a shell string); notifications degrade gracefully when no notifier is
  available. Schedules ONLY the digest — never the advanced autonomy tasks.

- **A zero-config "welcome back" digest (roadmap B1).** `seed guide` now greets a
  returning user with what changed since they were last here ("you filled in your
  context — Phase 1 done ✓", "you indexed your notes", "you parked 2 ideas") — but
  only across a day boundary and only when there's news, so a first run and same-day
  re-runs stay quiet. `seed digest` leads with a plain "Your seed" section (current
  phase + single next step + recent changes) so it's useful for a newcomer whose
  advanced digest sections are still empty; `seed digest --save` writes it to
  `logs/digests/<date>-welcome.md`. `seed guide --no-welcome` opts out. Zero setup,
  no network, no subprocess; the baseline lives in the gitignored
  `data/digest-state.json`. (Opt-in scheduling + desktop notification land in a
  follow-up.)

- **`seed guide` is now a coach, not a status line (roadmap A6).** It shows an
  honest progress bar (▓ done · ▒ current · ░ remaining, ASCII under `--plain`)
  with an "N of 4 done" tally once you've finished a phase, a one-line *why this
  step matters*, and a "Stuck? Run `seed guide --help-me`" footer. The new
  `seed guide --help-me` prints a ready-to-paste prompt for your AI agent ("walk
  me through this next step, one question at a time, I'm not technical") — it is
  print-only (no network, no subprocess) and the pasted block is plain text in
  every mode, so it stays copy-safe.

### Security

- **Terminal-escape hardening for the journey state (found by the A6 hostile
  audit).** Two pre-existing gaps were closed: (1) the parking-lot/`focus`
  sanitizer missed the 8-bit C1 control range (CSI/OSC/ST, `\x80–\x9f`) — now
  stripped alongside C0 + DEL; (2) `seed guide --refresh` bypassed the
  parking-lot sanitizer, so a poisoned/hand-edited `data/journey.json` could
  crash the command (`TypeError` on a `null` entry) or emit raw terminal escapes
  even under `--plain`. `refreshJourney` now routes through the same normalizer as
  the default load path. Both verified fixed end-to-end (exit 0, zero escape bytes
  in output).

- **Catalog CI now verifies repo URLs actually EXIST, not just their format.** A
  quality-gate hostile audit found that `catalog-check` validated the *shape* of
  each `repo:` URL but never checked it resolved — so a community PR could add a
  plausible-but-dead/typosquat GitHub URL (even `tier: vetted`, `accesses:
  [credentials]`) and CI would pass. `catalog-check --repos` now does a real
  existence check (confirmed 404 fails; transient/network errors only warn), and
  the `catalog-check` CI workflow runs `--npm --repos`. Closes the catalog's #1
  safety promise — "every entry points at a real repo".

## [0.6.1-alpha] - 2026-06-24

### Added

- **Broadened the open-source catalog's reference section** to a real index of the
  community "awesome list" ecosystem — so the guide points beginners at the wide
  body of community-researched repos, not just a handful. New verified references:
  `sindresorhus/awesome` (the root index of all awesome lists), `awesome-selfhosted`,
  `awesome-privacy`, `awesome-generative-ai`, `Awesome-LLM`, `awesome-local-ai`,
  `awesome-ai-tools`, `awesome-chatgpt-prompts`, and `awesome-mcp-clients`. Added
  **Ollama** as a real vetted local-AI tool (it powers `seed index` semantic search).
  `seed catalog` now groups these under a "General references" heading; `seed find`
  matches needs like "self-host", "private alternatives", "run AI locally", and
  "learn how to prompt". Every list is a discovery map, not a safety review — the
  guide still says `seed vet` before installing anything from them.

## [0.6.0-alpha] - 2026-06-24

### Added

- **Open-source guide — find the right repos safely, avoid the sketchy ones.**
  Digital Seed now guides newcomers through the open-source world from a curated,
  community-contributable catalog (`catalog/catalog.yaml`) — it recommends only
  from the catalog and **never free-searches the web and invents a repo**.
  - `seed find "<need>"` — match a plain-language need (e.g. "connect my email",
    "always-on agent") to vetted/listed tools, each with a **trust tier**
    (✅ vetted / 🟡 community / ⚠️ unvetted) and a plain-language **blast radius**
    (what it can access — "your-email, credentials, runs-continuously").
  - `seed catalog` — browse the whole catalog by phase.
  - `seed vet <repo-or-package>` — the teach-them-to-fish safety check for ANY
    tool: npm-existence (catches the typosquat/non-existent class), vendor-scope
    impersonation, version-pinning, optional live repo signals (`--online`), and
    the universal "before you install" checklist. Offline by default.
  - Catalog seeded from the community "awesome" lists + real projects incl.
    **OpenClaw** (`openclaw/openclaw`) and **Hermes** (`NousResearch/hermes-agent`),
    plus the official MCP servers. Every entry points at a real repo (CI rejects
    anything else), declares its blast radius from a controlled vocabulary, and
    pins installs. Contribute via PR — see `catalog/CONTRIBUTING.md`.
  - The agent contract (`.claude/CLAUDE.md`) gained a high-precedence "Guiding
    open-source choices" section: recommend only from the catalog, always show
    tier + blast radius, resist scope creep (park later-phase tools), never
    auto-install. New `catalog-check` CI job + `release-check` step validate the
    catalog (schema + blast-radius + repo URLs + npm existence).

## [0.5.0-alpha] - 2026-06-24

### Added

- **`seed start` — one guided first session** (the newcomer on-ramp). A single
  command that: creates your context files, tells you the three to fill in,
  **detects the AI agent you already have and prints the exact command to launch
  it** (no more vague "open your agent"), hands you a ready-to-paste first prompt
  (copied to your clipboard), and records your progress so `seed guide` advances.
  The README and help now lead with `seed start`. (Roadmap item A1–A4.)

## [0.4.7-alpha] - 2026-06-24

### Security

Clears the medium/low footgun backlog from the second hostile re-audit:

- **Prompt-injection fence on `deck-gen --web` / `excel-gen --web`** — scraped web
  text is now wrapped as DATA-not-instructions (shared `scripts/lib/fence.ts`),
  matching the `web` command. (Audit M14.)
- **`seed index` no longer follows symlinks** out of the indexed tree (couldn't
  read/embed an out-of-folder file via a planted link). (M9.)
- **`marketplace install` routes its download through `safeFetch`** (per-hop SSRF
  re-validation) and prints an explicit warning that a downloaded pattern becomes
  agent instructions — review before trusting. (M12/M13.)
- **repo-bot index path traversal closed** — the repo id is now fully sanitized
  (every unsafe run, not just the first slash), so a crafted id can't write/unlink
  an arbitrary `.json`. (M15.)
- **`journey.json` is fully validated on load** — a poisoned parking lot
  (`[null]`, non-objects, control-char/terminal-escape ideas, out-of-range phase)
  is sanitized instead of crashing or terminal-injecting `seed guide`/`seed park`.
  +regression test. (M17 + cli-state lows.)

Remaining (tracked, lower-likelihood — need product/UX decisions): the data-room
publish TOCTOU + destination-folder confirmation (M7/M8) and the default
`seed index` scope question (M10) are documented in the audit docs for a
follow-up.

## [0.4.6-alpha] - 2026-06-22

### Security

A second hostile re-audit found that several earlier fixes were applied to the
hardened *library* path but not to the *CLI path users actually run*. Closed:

- **CRITICAL — `seed index` could silently upload your private notes to OpenAI.**
  The `RAG_EMBED_CLOUD` opt-in gate existed in the MCP rag-server but was missing
  from `scripts/embed.ts` (the path the onboarding tells beginners to run), so a
  user with `OPENAI_API_KEY` set — but who deliberately left cloud embedding OFF
  per the docs — had `user/`/`patterns/`/`docs/` POSTed to OpenAI. Embeddings now
  default to **local Ollama** and require an explicit `RAG_EMBED_CLOUD=1` opt-in,
  matching the documented contract.
- **CRITICAL — `seed import` no longer silently overwrites the agent's Trust
  Boundary.** A malicious/shared archive could replace `.claude/CLAUDE.md` (the
  agent's safety rules) verbatim. Import now extracts everything else and diverts
  an incoming policy file to `.claude/CLAUDE.md.imported` with a loud warning for
  manual review — an imported archive can never rewrite your agent's rules.
- **HIGH — download redirect SSRF.** `downloadFile` validated only the first hop
  then let `fetch()` auto-follow redirects; it now uses `safeFetch` (manual
  redirect + per-hop re-validation), so a public URL can't 30x-bounce into
  loopback/RFC1918/cloud-metadata.
- **HIGH — secret scanners missed Stripe + fine-grained GitHub PATs.** Added
  `sk_live_`/`sk_test_` and `github_pat_` to all four detection layers (privacy
  scan, pre-commit hook, collab boundary, installer hook).
- **HIGH — hardlink bypass of the data-room guard.** The publish guard resolved
  symlinks but not hardlinks (which keep an in-repo path while aliasing a personal
  file's bytes); it now refuses any multiply-linked source.

A medium/low footgun-hardening backlog from the same audit is tracked in the
audit docs (marketplace-install SSRF, `deck-gen/excel-gen --web` fencing,
`journey.json` parking-lot validation, TOCTOU on the publish upload path, etc.).

## [0.4.5-alpha] - 2026-06-22

### Fixed

- **The proactive guide now advances** (tester finding H1). `loadJourney` previously
  returned the cached `data/journey.json` verbatim, so `seed guide`/`what-next`
  stayed frozen at the bootstrap phase even after the user filled their context or
  indexed notes. It now reconciles the cached state against live signals and moves
  forward (never regresses), with a `seed guide --refresh` escape hatch. +regression test.
- **Parking lot & step-completion are now reachable from the CLI** (H3): new
  `seed park "<idea>"` and `seed complete <phase> <step>` commands wrap the existing
  helpers the agent contract relies on; `seed guide` added to the help taxonomy.
- **`seed index` no longer looks broken** (M1): the local JSON keyword index — the
  intended offline default — is announced as friendly info instead of a red
  "Cannot find module @lancedb/lancedb" error, with a one-command path to local
  semantic search.
- **A corrupt `{"phases":{"1":null}}` journey file self-heals** instead of crashing
  `seed guide` (M3). +regression test.
- The Phase 3 next-step nudge no longer contradicts the "integrations are not a
  day-one step" guidance (M2).
- **`seed doctor` flags an unpulled Ollama embedding model** (with the `ollama pull`
  fix), and `seed index` prints a one-time hint when embeddings come back empty,
  instead of silently degrading to keyword-only (M4).
- **`publish-data-room --dry-run` is fully offline** — it prints the resolved plan
  (sources, sizes, PERSONAL-DATA flags) with zero Drive contact, and refuses a
  symlink/`..` to a personal file up-front (M5/M6).
- **`privacy-scan` reports every secret** in a file with line numbers + redacted
  snippets, not just the first match + the raw regex (L4).
- `seed index <missing-folder>` now exits non-zero; `seed recipe <name>` opens the
  recipe (README + setup) instead of erroring; `seed first-prompt --copy` copies to
  the clipboard; `setup.sh` uses a timestamped backup so a second re-run can't
  clobber the first; the dead BigQuery link was replaced (L3/L5/L7/L8/L9).

### Changed

- Post-release hardening follow-ups (residual audit lows):
  - The proactive guide now treats a freshly materialized template as *present*,
    not *filled in* — Phase 1 only counts as done once you actually edit
    `USER.md`/`COMPASS.md`/`GOALS.md` away from their templates.
  - `setup.sh` backs up an existing, user-edited `USER.md`/`GOALS.md` to `*.bak`
    before overwriting it on a re-run (no silent data loss).
  - `deck-gen` Google-Slides upload runs `gog` in argv form (no shell).
  - `publish-data-room` resolves symlinks/`..` and re-checks the real path, so a
    source that lexically looks safe but resolves to a personal file (or outside
    the repo) is still refused; the dry-run PERSONAL-DATA flag is now computed.
  - `SECURITY.md` corrected: pristine starter templates live under
    `docs/data-room/templates/`, and `privacy-scan`'s behavior described accurately.

## [0.4.4-alpha] - 2026-06-22

### Added

- **Proactive, phased guide.** The agent now opens each session with where you
  are in the four-phase journey and your single next step, **parks** off-track
  ideas to keep you on track (deferring the moment you insist), and surfaces
  just-in-time guidance from the existing docs — all backed by a single
  git-ignored `data/journey.json` state read/written through `scripts/lib/journey.ts`
  (which bootstraps from your existing files for current users). New `seed guide`
  command; `seed what-next` now reads the journey; `config/journey.yaml` maps each
  phase to docs. Adds a `## Proactive Guide` section to `.claude/CLAUDE.md` (below
  the Trust Boundary, so the safety rules stay first) and a "Unit tests" +
  "Journey state" gate to `release-check`.
- The Markdown link checker now skips fenced and inline code, so code samples
  containing link-like syntax are no longer misreported as broken links.

### Security

- **Removed non-existent npm package names from integration recipes (audit C2).**
  The email, calendar, obsidian, and database setup recipes plus `mcp/README.md`
  and `mcp/servers.json` previously told users to `npx -y` packages that **do not
  exist** in unclaimed/vendor-impersonating npm scopes
  (`@anthropic/mcp-gmail`, `@anthropic/mcp-install`, `@smithery/mcp-obsidian`,
  `@modelcontextprotocol/server-sqlite`, `example-gmail-mcp-server`) — an
  attacker-registrable slot handed OAuth credentials. Each fictional name is now
  replaced with a clearly-marked **manual "choose and verify a package yourself"**
  step (with a bold security warning, `npm view`/publisher-check guidance, exact
  version pinning, and `--ignore-scripts`). The only packages still referenced by
  name are the official, version-pinned `@modelcontextprotocol/server-postgres`
  and `@modelcontextprotocol/server-github` (both annotated as deprecated). The
  fictional `@anthropic/mcp-install` auto-installer instruction was deleted.
- **New CI workflow `.github/workflows/package-existence.yml`** runs `npm view`
  on every concrete package name referenced in `integrations/*/setup.md` and
  `mcp/servers.json` and **fails the build on a 404** (placeholders are skipped).
- **Database recipe hardened (audit M6/H1).** Leads with a least-privilege
  `GRANT SELECT` read-only role, warns the AI executes arbitrary generated SQL,
  scopes the "read-only by default" claim (it does not cover the writable SQLite
  path or SELECT-based exfiltration), and never inlines a live connection string
  into a tracked file (real secrets stay in gitignored `.env`).
- **Calendar recipe hardened (audit M5).** Recommends least-privilege OAuth scope
  (`calendar.readonly` / `calendar.events`), stores credentials `0600` inside a
  `0700` directory, and uses `$HOME` instead of a literal `~` in JSON env paths
  (which some loaders do not expand). The same `$HOME`/`0600` guidance was added
  to the email recipe.
- **`settings.json` secret-handling contract updated across all recipes.** Every
  "add to `.claude/settings.json`" instruction now says to copy
  `.claude/settings.example.json` to `.claude/settings.json` (gitignored) and
  never paste real secrets into a tracked file.
- **Docs reconciled with behavior.** `docs/what-leaves-your-machine.md` and
  `SECURITY.md` now state that web page content fetched with `--summarize` is
  sent to your AI provider, and that RAG embeddings go to OpenAI **only when
  cloud embedding is explicitly opted in** (`RAG_EMBED_CLOUD=1`); the default is
  now local (Ollama). The `SECURITY.md` data-storage table reflects the new
  gitignore model (`.claude/settings.json`, `config/digest.yaml`, and the whole
  `user/` tree are now ignored). Trust/verify notes were added where docs teach
  `curl … | bash`.
- **Eliminated remote-controlled shell-injection RCE (audit C1/H3/M3).** A remote
  download's `Content-Disposition` filename, an importable `.tar` archive, and
  clipboard content from a shared note all flowed unescaped into a shell
  (`gog drive upload "$f"`, `tar -xzf`, `echo $(...)`). All subprocesses now run
  shell-free via a new `scripts/lib/safe-exec.ts` (argv form); derived filenames
  are sanitized; tar import rejects members that escape the project root **and**
  any symlink/hardlink members (restore still lands files at the root).
- **`crontab` scheduler no longer replaces the user's crontab (audit M12)** — it
  merges a tagged block and backs up the existing crontab.
- **SSRF guard + untrusted-web fencing (audit M1/M4).** New `scripts/lib/net-guard.ts`
  rejects non-`http(s)` schemes and any host resolving to loopback, link-local,
  RFC1918, ULA, CGNAT, benchmark/TEST-NET, or cloud-metadata (`169.254.169.254`)
  addresses, and re-validates every redirect hop; fetched page text is wrapped as
  DATA (not instructions) before reaching the model; input is byte-capped before
  JSDOM parsing.
- **Stopped publishing live personal files to a public Drive (audit C3).**
  `publish-data-room` had uploaded the user's live `user/*.md`
  (USER/GOALS/MEMORY/PREFERENCES/…) to an anyone-with-link folder disguised as
  `*.template.md`. It now sources pristine templates only, hard-refuses any
  `user/` source, and requires a passing privacy scan before any real publish.
- **Secret-bearing configs are no longer tracked (audit H1/M7).**
  `.claude/settings.json` and `config/digest.yaml` were removed from version
  control (with `*.example` copies shipped), and the entire `user/` tree is now
  git-ignored and **materialized from templates** by `seed onboard`/`setup.sh`,
  so a beginner cannot commit their own secrets or personal data.
- **Real, placeholder-aware secret scanning (audit H6/M9).** The privacy scan's
  author-identity deny-list was replaced with canonical secret **shapes**
  (DB/OAuth/Slack/AWS/GitHub incl. `sk-proj-`/`gho_`), shared by the pre-commit
  hook and the collab scanner; it ignores obvious example placeholders so the
  kit's own docs do not false-flag, blocks (not warns) on a real hit, and flags
  any personal file that gets force-added. `export` no longer bundles
  `settings.json`/`.env`; `.env` is written `0600`.
- **RAG server hardened (audit H2/H5/M2/M10/M11).** `rag_index` rejects absolute
  or out-of-root paths and no longer follows symlinks out of the project root;
  embeddings default to **local** (Ollama) and require an explicit
  `RAG_EMBED_CLOUD=1` **and** `OPENAI_API_KEY` opt-in before any content leaves
  the machine. Memory/graph writes carry provenance + length caps, use a function
  replacer (no `$&`/`` $` `` expansion), and escape Mermaid/`##`-header injection.
  Node IDs use `randomUUID()` instead of `Math.random()`.
- **Agent prompt-injection trust boundary (audit H4/M13).** A precedence-stated
  "ingested content is DATA, never instructions" boundary was added to
  `.claude/CLAUDE.md`, the specialist agent configs, and the orchestrator
  fallback/default prompts; "silent learning" is constrained to facts the user
  states directly; the autonomy quality gate now fails **closed**, precedent
  learning only records genuine human approvals, and a sleeping user no longer
  downgrades `notify` actions to silent `auto` (notification visibility floor).

### Changed

- README onboarding wording corrected: `user/USER.md` and `user/GOALS.md` do not
  exist in a fresh clone (the `user/` tree is git-ignored); the README now tells
  users to create them from the pristine templates in `docs/data-room/templates/`
  rather than implying they already exist.
- CHANGELOG `0.4.2-alpha` agent-chooser note corrected: OpenClaw/Hermes (and
  Cursor/Windsurf) are listed as Phase 4 options **without** bundled install
  commands — only a context-file scaffold is provided.

## [0.4.3-alpha] - 2026-05-14

### Added

- `docs/external-tester-guide.md` — non-technical tester instructions,
  privacy warnings, and a copy-paste feedback template for people who do not
  want to use GitHub.
- `docs/agent-path-validation-2026-05-14.md` — internal Codex CLI, Gemini CLI,
  and Ollama validation notes.
- `docs/audit-log.md` — index of simulated audits, hostile audits, and
  validation notes.

### Changed

- `bun run seed feedback` now points first-time testers at the external tester
  guide and makes GitHub optional for non-technical feedback.
- CI uses Node 24-compatible GitHub actions (`actions/checkout@v5` and
  `actions/setup-python@v6`).
- The generated pre-commit hook avoids a macOS/BSD `grep` portability warning.
- Release notes and public-usability docs now distinguish internal validation
  from the real external walkthrough evidence still needed before 1.0.

## [0.4.2-alpha] - 2026-05-12

### Added

- **Phase system** (`docs/phases.md`) — four explicit phases users choose from: Local context (required) → Local search → Integrations → Always-on agent. Replaces the vague "pick a profile" model with a clear, ordered progression.
- **`bun run seed plan`** — prints a paste-ready agent prompt that interviews the user, recommends phases, and runs setup commands. `--write-plan` creates `user/MY-PLAN.md`.
- **`bun run seed what-next`** — reads `user/MY-PLAN.md` and prints exactly one next action. Removes the "I finished Phase 1, now what?" blankness.
- **`bun run seed feedback`** — prints direct GitHub issue-template links for first-run friction, docs confusion, and bugs. `--write-draft` creates `user/FEEDBACK-DRAFT.md`.
- **`.github/ISSUE_TEMPLATE/first_run_friction.yml`** — dedicated non-technical issue template for "I got confused / this felt too technical" reports.
- **`docs/feedback.md`** — non-technical path to GitHub issues and GitHub-web PR edits without local Git knowledge.
- **`docs/install-codex-cli.md`** — complete beginner install guide for Codex CLI (OpenAI): macOS + WSL2 steps, login, first run, troubleshooting.
- **`docs/install-gemini-cli.md`** — complete beginner install guide for Gemini CLI (Google): same structure.
- **`docs/simulated-public-alpha-readiness-2026-05-12.md`** — hostile audit of all 2026-05-12 changes. Verdict: public-alpha usable, not announcement-ready until version drift is resolved (resolved in this release).
- **`docs/public-usability-roadmap.md`** — concrete M1–M8 milestone list for reaching ~95% usability without external users.
- **`docs/releases/v0.4.1-alpha.md`** — draft release notes for v0.4.1-alpha (not yet published as a GitHub Release).

### Changed

- **Agent prerequisite now surfaced first** — README prereqs block reordered (agent first, not last) with a plain warning: without a terminal-capable agent, the guided setup will not work.
- **`docs/agent-chooser.md` fully rewritten** — Claude Code, Codex CLI, Gemini CLI, and Ollama documented with install commands, honest caveats, and a quick-pick table. Cursor/Windsurf and the OpenClaw/Hermes always-on agents are listed as **Phase 4 options without bundled install commands** — Digital Seed only provides a `bun run seed recipe openclaw init` / `... hermes init` context-file scaffold for them, not an installer; you bring and install those agents yourself. Ollama section includes an honest caveat that <30B models are unreliable for guided setup.
- **`docs/install-claude-code.md`** — now opens with a note that Claude Code is one of several options, with links to Codex and Gemini alternatives.
- **`setup.sh` phase chooser** — replaces the flat profile picker with a phase-aware step: explains all four phases, asks which to enable now, prompts for notes folder (Phase 2) and recipe choice (Phase 3) inline.
- **`bun run seed doctor`** — now detects `claude`, `codex`, `gemini`, `cursor`, `windsurf`, and `ollama`. Missing-agent warning lists all four install paths.
- **`bun run seed onboard --plain`** — now includes agent install options (Claude Code, Codex, Gemini, Ollama) in Step 3, and a "Done? Run: `bun run seed what-next`" footer.
- **README prereqs** — AI agent bullet now lists all four agent options with one-line install commands and links to beginner guides.
- **`docs/production-readiness.md`** — scorecard updated to ~85% overall; agent onboarding and feedback/friction reporting areas added.
- **Agent login commands corrected** — `claude login` → `claude auth login`; `gemini auth login` → "run `gemini` and follow the sign-in prompt" (hostile audit finding, `783f001`).
- **`SECURITY.md`** — API Key Management section now references `bun run seed privacy-scan` as the local scanner.
- **`CONTRIBUTING.md`** — Repo shape section now lists all top-level directories including `agents/`, `collab/`, `config/`, `core/`, `data/`, `exports/`, `integrations/`, `mcp/`, `packs/`, `patterns/`.
- **`docs/troubleshooting.md`** — added agent-specific troubleshooting for Codex CLI (`codex: command not found`), Gemini CLI (`gemini: command not found`), and Ollama reliability.

### Notes

- No new runtime dependencies. No new external services on the beginner path.
- This is a documentation, DX, and onboarding release. No changes to core CLI behavior beyond the two new commands (`plan`, `what-next`) and the agent detection improvements in `doctor`.
- The 1.0 gates remain open: real external testers have not yet walked the path.

## [0.4.1-alpha] - 2026-05-11
### Added
- `bun run seed hooks install` — installs the pre-commit secret-scan hook into `.git/hooks/pre-commit`. `bun run seed onboard` warns when the hook is missing. The hook is no longer something only `setup.sh` can install.
- `bun run seed hooks status` — reports whether the Digital Seed pre-commit hook is currently installed.
- `recipes/_template/README.md` — boilerplate for new integration recipes. Linked from `recipes/README.md` and `CONTRIBUTING.md`.
- `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues and points contributors at the docs-confusion template (used as the "ask a question" path) and the GitHub security advisory flow.
- `CODE_OF_CONDUCT.md` — Contributor Covenant-style baseline. Linked from `README.md` and `CONTRIBUTING.md`.
- `docs/simulated-public-alpha-readiness-2026-05-11.md` — consolidates findings from four isolated hostile audits run on `0.4.0-alpha` and records the P0/P1 fixes that became this release.

### Changed
- **README** now leads "Start in 15 minutes" with an explicit Prerequisites block (Git, Bun, terminal-capable AI agent) and links to troubleshooting + AI-agent install. The canonical path is restated as `bun install` + `bun run seed onboard`, with `./setup.sh` explicitly framed as the optional guided wizard. The status badge now links to `docs/known-alpha-limits.md` instead of an empty URL.
- **`docs/getting-started.md`** no longer suggests `./setup.sh` as the primary install step. It now leads with the canonical `bun install` + `bun run seed onboard` path; `setup.sh` is described as optional hand-holding.
- **`bun run seed onboard --plain`** explains, with terminal-anxious users in mind, how to open the three core context files (editor, `open`, `xdg-open`, `code`) and walks through the two-pane / copy-paste flow for `bun run seed first-prompt`.
- **`bun run seed first-prompt`** now prints a clear "copy the prompt below" header with delimiter rulers so beginners do not paste the wrong text.
- **`bun run seed recipe list`** prints a one-line description for each recipe (extracted from the recipe's README) instead of a slug-only blind pick. Lists the `recipes/_template/README.md` location for contributors.
- **`SECURITY.md`** rewritten for honesty: clarifies which `user/*.md` files are tracked starter templates vs. ignored personal data, documents that the pre-commit hook is opt-in via `bun run seed hooks install`, removes the unsubstantiated "every action logged to `logs/audit.jsonl`" claim (no such log is produced today), and clarifies that MCP servers are ordinary local processes with no Digital-Seed sandbox.
- **`docs/what-leaves-your-machine.md`** adds a complete table of Digital Seed's own outbound network calls: the npm registry during `bun install`, `r.jina.ai` during `bun run seed web ...`, Google Drive during maintainer `seed drive ...` commands, and the GitHub repo during `seed update`. The 15-minute beginner path does not hit any of these except npm.
- **`bun run seed web`** usage banner now includes a first-use Jina disclosure pointing at the network-calls doc.
- **`bun run seed privacy-scan`** adds a non-blocking warning for tracked `user/*.md` templates that look filled in (likely-personal `Name:`, `Email:`, `Phone:` lines).
- **`bun run seed doctor` / `bun run health`** updated to recommend `bun run seed hooks install` when the pre-commit hook is missing (was: "Run setup.sh to install").
- **PR template** restructured into scoped groups (docs-only, code, privacy, visual assets, release-impacting). Fresh-clone harness and visual-qa are now explicitly optional unless the relevant scope applies.
- **CONTRIBUTING.md** prefers `bun run seed doctor` as the canonical local health command and notes `bun run health` is an alias. Adds the recipe template pointer.
- **`user/README.md`** is honest about which templates are tracked (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) vs. which user files are ignored (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`), and warns about putting real content in tracked templates.
- **`.github/workflows/ci.yml`** now triggers on `v*` tag pushes and pins `oven-sh/setup-bun@v2` to `bun-version: 1.3.8` instead of `latest`.
- **`docs/release-checklist.md`** tag instruction bumped to `v0.4.1-alpha`.

### Notes
- This is a documentation and developer-experience polish release. It does not change the alpha trust contract: real external-tester walkthroughs and a green CI cycle on a tag commit are still required before any `1.0.0-rc.1` consideration. See `docs/production-readiness.md`.
- No new dependencies. No new external services exercised on the beginner path.

## [0.4.0-alpha] - 2026-05-11
### Added
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs install, health, privacy scan, visual QA, onboard, first-prompt, and Markdown link checks on `ubuntu-latest` and `macos-latest` for every push and PR.
- `scripts/fresh-clone-check.sh` — repeatable fresh-clone validation harness backed by `git archive`, with timing and a clean teardown.
- `docs/fresh-clone-validation.md` — what the harness covers, expected output on a clean clone, last verified run, troubleshooting.
- `docs/examples/` — fictional student, founder/operator, researcher/investor, and freelancer/consultant examples for first-15-minute onboarding.
- `docs/troubleshooting.md` — common fixes for Bun, Python/Pillow, AI agent CLIs, Drive/gog, privacy scan, fresh-clone validation, and CI failures.
- `scripts/check-markdown-links.ts` plus `bun run check:links` for local Markdown link validation.
- `bun run seed onboard --write-first-win` to create `user/FIRST-WIN.md` as an explicit first useful outcome.
- `--no-delete`, `--replace-strategy {delete,skip-delete}`, and `--strict` flags on `scripts/publish-data-room.ts` for publishing into folders with locked legacy files.

### Changed
- Data room publisher now warns and falls back to skip-delete per file when Drive returns a permission error, instead of hard-failing the run.
- README first screen tightened to lead with 15-minute promise → quick start → data room → who-for/not-for; CI badge added.
- README and public data-room starter copy now use `bun install` + `bun run seed onboard` as the low-friction quick start, with `./setup.sh` framed as the optional guided wizard.
- README and `docs/first-15-minutes.md` link to examples and troubleshooting.
- `seed first-prompt` now points to `user/FIRST-WIN.md` when present.
- `seed help` now separates beginner, optional recipes/search, advanced, and maintainer/release commands.
- Health check output now distinguishes clean pass from pass-with-warnings.
- `docs/release-checklist.md` references the fresh-clone harness, CI coverage, and `--no-delete` recovery path.
- `docs/data-room-guide.md` documents the permission-fallback strategy matrix and avoids stale user-facing v0.3 folder labeling.
- `docs/production-readiness.md` and `docs/repo-improvement-roadmap.md` updated to reflect broader-alpha status, ~72% production-grade usability assessment, completed Milestone 2 release engineering, and Milestone 3 open-source usability as the next sprint.

## [0.3.1-alpha] - 2026-05-11
### Added
- Premium generated Digital Seed hero loop with GitHub-dark edge blending, bushier fruit-bearing mature canopy, MP4/WebM/GIF/still/SVG fallbacks, and documented generation notes.
- Terminal-native `bun run seed intro` visual plus `bun run seed onboard --plain`.
- Public data room publisher: `bun run seed drive publish-data-room`.
- Visual QA guardrail: `bun run seed visual-qa`.
- Production readiness and release checklist docs.

### Changed
- README now leads with the 15-minute promise and the live public data room.
- Beginner docs now defer to the first-15-minute path instead of duplicating it.
- Public data room moved to a clean folder owned by the publishing account.

## [0.3.0-alpha] - 2026-05-10
### Changed
- Repositioned Digital Seed as a free-first, local-first, agent-neutral starter kit.
- Added the first-15-minute path: `bun run seed onboard` / `bun run seed init` and `docs/first-15-minutes.md`.
- Hid and then removed the built-in dashboard from the default product surface; added dashboard alternatives guidance.
- Strengthened local retrieval: `bun run seed index <folder>` keeps a JSON search mirror for `bun run seed search`.
- Added public alpha expectation docs and audit-response documentation.
- Cleaned stale DAI-era naming, public placeholders, and private/course-style residue.

### Added
- `bun run seed doctor`
- `bun run seed first-prompt`
- `bun run seed privacy-scan`
- `bun run seed recipe list`
- `bun run seed recipe openclaw init`
- `bun run seed recipe hermes init`
- `docs/known-alpha-limits.md`
- `docs/dashboard-options.md`

## [0.2.0-alpha] - 2026-03-19
### Added
- Excel template generator: `bun run seed excel dcf|ratios|project`
- Slide deck generator: `bun run seed deck project|strategy|finance`
- `--fill` mode: AI-generated topic-specific deck content (model-agnostic)
- `scripts/lib/ai-call.ts`: provider detection chain (Claude → OpenAI → Gemini → direct API)
- Knowledge graph seeding from setup wizard (`scripts/seed-graph.ts`)
- Setup wizard now collects real goals
- `seed update` command with safe version management

## [0.1.0-alpha] - 2026-03-18
### Added
- Initial release
- Core CLI (`bun run seed`)
- Pattern marketplace with bundled patterns and skill packs
- Collaboration layer (shared projects + learning groups)
- Daily digest
- Knowledge graph MCP server
- Activity state detection
- Offline mode
- Repo bot (learn + search)
- Interactive setup wizard
