# Supported Platforms

Digital Seed is alpha software. This page is the honest stance on which
platforms the maintainers actively run and test, and what users should
expect on everything else.

## Status at a glance

| Platform | Status | Tested by | Notes |
| --- | --- | --- | --- |
| macOS (Apple Silicon, recent macOS) | Supported alpha | CI (`macos-latest`) + maintainer dev box | First-15-minute path, health, privacy scan, visual QA, link check, onboard, first-prompt all pass. |
| Linux (Ubuntu LTS, x86_64) | Supported alpha | CI (`ubuntu-latest`) | Same release-check gates as macOS. Other modern glibc-based distros should work but are not in CI. |
| Windows via WSL2 (Ubuntu) | Best-effort | Documented path, not in CI | Use the Ubuntu shell inside WSL2; treat as Linux. Documented in [`docs/install-claude-code.md`](install-claude-code.md). Not exercised on every release. |
| Windows-native (PowerShell / cmd.exe) | Not supported | — | Digital Seed depends on Bun + POSIX shell behavior. Use WSL2 instead. |
| Other Unixes (BSD, niche distros) | Not supported | — | May work if Bun and `bash` are available; not tested. |

"Supported alpha" means the platform runs in CI on every push and PR, and
maintainers actively notice when it breaks. It does **not** mean
production-grade or 1.0-ready — see [Production Readiness](production-readiness.md)
for the full definition.

## What "supported alpha" requires

A platform is supported alpha if all of these are true:

1. The fresh-clone path (`git clone` → `bun install` → `bun run seed onboard`
   → `bun run seed doctor` → `bun run seed first-prompt`) succeeds on a
   clean machine.
2. The release-check gate (`bun run seed release-check --skip-fresh-clone`)
   passes in CI.
3. `bun run health`, `bun run seed privacy-scan`, `bun run seed visual-qa`,
   and `bun run check:links` pass.
4. There is at least one fresh-clone smoke run in CI in the last 30 days
   for that platform.

## What "best-effort" means for WSL2

WSL2 is documented and known to work, but:

- It is not on the CI matrix.
- Maintainers do not test every release on WSL2.
- Bugs that are WSL2-specific (path handling, line endings, network
  weirdness inside corporate Windows installs) may take longer to fix.

If you use WSL2, please file issues with the docs-confusion or bug-report
template — those reports are how WSL2 graduates to supported alpha.

## What about Docker / devcontainers?

There is no maintained Docker image. The repo is small enough that a
local Bun install is the path of least resistance. A devcontainer or
Dockerfile is welcome as a community contribution, but it is not part of
the 1.0 scope.

## Hardware and resource expectations

Digital Seed itself is light: cloning the repo, running `bun install`, and
keeping a local JSON index for one notes folder fits comfortably on a
modern laptop with a few GB of free disk.

Resource cost grows when you opt into:

- larger indexed folders (`bun run seed index`),
- generated visual assets (Python + Pillow),
- AI agents and their model providers (each agent has its own runtime cost).

None of those are required for the first 15 minutes.

## How this stance changes before 1.0

Before a `1.0.0-rc` tag, the following must be true:

- macOS and Linux remain green in CI for at least one release cycle.
- The WSL2 path is either promoted to supported alpha (in CI) or
  explicitly downgraded with a clear note.
- A Windows-native stance is either added (with CI coverage) or
  reaffirmed as out of scope.
- At least one fresh-clone walkthrough on each supported platform is
  documented in `docs/fresh-clone-validation.md`.

See [Production Readiness](production-readiness.md#milestone-5--10-candidate)
for the full Milestone 5 exit criteria.

## See also

- [Known Alpha Limits](known-alpha-limits.md)
- [Fresh-Clone Validation](fresh-clone-validation.md)
- [Troubleshooting](troubleshooting.md)
- [Install Claude Code (Bun first)](install-claude-code.md)
