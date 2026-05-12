# Security Model

> Your personal AI infrastructure handles sensitive data. This document explains, honestly, what Digital Seed does and does not protect.

For a plain-language privacy boundary, start with [What Leaves Your Machine?](docs/what-leaves-your-machine.md).

## Threat model

| Threat | Mitigation in this repo |
|--------|------------------------|
| API key leakage | `.env` is git-ignored; an optional pre-commit hook scans staged diffs for common key patterns. The hook is **not** installed by `bun install` — see below. |
| Data exfiltration by Digital Seed itself | All local commands read/write local files only. `bun install` fetches packages from the public npm registry; `bun run seed web search` (advanced) calls `r.jina.ai`. Both are documented in [What Leaves Your Machine?](docs/what-leaves-your-machine.md). |
| Cross-user data access | Every instance is an isolated local folder. There is no shared backend. |
| Malicious or buggy MCP servers | MCP servers run as ordinary local processes with whatever permissions you start them with — Digital Seed does not sandbox them. Only install MCP servers from sources you trust and review their code. |
| Secret in commit history | The optional pre-commit hook blocks staged diffs containing known key prefixes (`sk-ant-`, `sk-proj-`, etc.) and obvious `*_API_KEY=` lines. It is best-effort, not exhaustive. |
| Prompt injection via files | Context files in `user/` are user-controlled. AI agents that read them will inherit whatever the files say — treat content from third parties as untrusted. |

## Data storage

All data stays on your machine:

| Path | What it holds | Git-tracked? |
|------|---------------|-------------|
| `.env` | API keys | **ignored** |
| `config/config.yaml`, `config/autonomy.yaml`, `config/token-budget.json` | Local configuration | **ignored** |
| `user/USER.md`, `user/GOALS.md`, `user/MEMORY.md`, `user/PREFERENCES.md` | Filled-in personal context (you edit these) | **ignored** by `.gitignore` |
| `user/COMPASS.md`, `user/ANTI-GOALS.md`, `user/DOMAINS.md`, `user/README.md` | Starter **templates** that ship with the repo | **tracked** (they are templates, not your data) |
| `data/`, `logs/`, `exports/` | Runtime data and exports | **ignored** |

**Honest trust-boundary nuance:** the four ignored `user/*.md` files (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`) cover the files you are most likely to fill in with personal information. The other three (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) ship as **starter templates** and are tracked. If you fork Digital Seed and put real personal content into a tracked template, **`git status` will not warn you and a casual `git commit -a` will commit it.** Run `bun run seed privacy-scan` before pushing.

A maintainer-side check inside `privacy-scan` looks for obvious personal content in tracked `user/*.md` files and warns when a template appears to have been filled in.

## API key management

- Store keys only in `.env` (never in code, Markdown, or `config/` files).
- Prefer a **dedicated key** for this project so you can revoke/rotate it without disrupting other tools.
- Install the pre-commit hook (see next section). It is best-effort and not a substitute for review.
- Run `bun run seed privacy-scan` before pushing or sharing a fork; it is the local scanner for common private leftovers.
- Never share your `.env` file.

## Pre-commit secret hook

The pre-commit hook is **not** active by default after `bun install`. To install it:

```bash
bun run seed hooks install
```

That command writes a hook to `.git/hooks/pre-commit` and makes it executable. `bun run seed doctor` and `bun run seed onboard` warn when the hook is missing.

You can also install the hook by running the optional setup wizard (`./setup.sh`), which sets it up as part of its broader configuration. The canonical 15-minute path does not run the wizard; the explicit `seed hooks install` command exists so you do not need the wizard just to get the secret-scan hook.

## MCP server security

MCP servers act as bridges between your AI agent and other tools or files. In Digital Seed:

- They run as **ordinary local processes**, not sandboxed virtual machines.
- They have whatever filesystem and network access the user account running them has — Digital Seed does **not** restrict their network calls.
- They can be individually enabled or disabled in your agent's MCP config.

Before installing a community MCP server:

1. Review the source code (or skip it).
2. Look for excessive permission requests or unexplained network calls.
3. Prefer servers with active maintenance and visible community trust.
4. Pin to specific versions when possible.

## Audit logging — honest status

> **Status: not implemented yet.**

Some early drafts of this repo planned a `logs/audit.jsonl` stream that would record every significant AI action. **That stream does not exist today.** The local CLI commands (`seed onboard`, `seed doctor`, `seed first-prompt`, `seed privacy-scan`, `seed index`, `seed search`, `seed recipe list`) do not write a structured audit log.

If you need auditability today, rely on:

- your AI agent or provider's own usage/conversation logs,
- shell history,
- `git log` for repo changes,
- the source code of any command you run.

If or when Digital Seed adds real audit logging, this section will be replaced with what it actually records, where, and how to read it.

## What leaves your machine

Digital Seed's own commands stay local with a small number of explicit exceptions. The exceptions are documented in [What Leaves Your Machine?](docs/what-leaves-your-machine.md). Highlights:

- `bun install` fetches packages from the public npm registry (no personal data).
- `bun run seed web fetch <url>` / `bun run seed web search "query"` (advanced commands, not part of the 15-minute path) call `r.jina.ai` to render web pages.
- `bun run seed drive ...` (maintainer-only) talks to Google Drive via the `gog` wrapper.
- Anything you paste into your AI agent goes to that provider; that is independent of Digital Seed.

## Best practices

1. **Review before sending.** Treat draft outputs as drafts — read AI-written emails, messages, or commits before they leave your machine.
2. **Rotate keys** periodically (quarterly is a reasonable default).
3. **Keep updated.** `git pull` to receive security and privacy fixes.
4. **Minimal permissions.** Enable only the integrations you actually use.
5. **Separate concerns.** Do not mix work and personal data inside a single instance unless you accept the blast radius.
6. **Backup context.** Periodically back up `user/` and `data/` (locally — not to a public service).
7. **Privacy scan before pushing public forks.** `bun run seed privacy-scan` catches common leftovers but is not a guarantee.

## Reporting vulnerabilities

Found a security issue? Open a private security advisory on GitHub for `LeoMaslyak/digital-seed`.

Do **not** open a public issue for security vulnerabilities.
