# Known Alpha Limits

Digital Seed is a public alpha. This page exists to set expectations clearly.

## Not a hosted platform

Digital Seed is a repo you run locally. It does not provide hosted accounts, centralized sync, billing, uptime guarantees, or managed infrastructure.

## Not a dashboard product

Digital Seed does not ship a built-in dashboard. If you want a visual dashboard, use a mature open-source dashboard and adapt it. See [`dashboard-options.md`](dashboard-options.md).

## Integrations are recipes first

Recipes explain how to connect tools safely. They are not a promise that every external service is one-click automated.

Default posture:

- read and explain first
- draft before sending
- confirm before publishing, uploading, deleting, or messaging
- connect credentials only when the local workflow is already useful

## Local retrieval starts simple

`bun run seed index <folder>` and `bun run seed search "query"` provide a local-first retrieval loop. It is intentionally simple. Semantic/vector search can be added later through local embeddings or optional vector stores.

## Always-on agents are advanced

OpenClaw, Hermes, Telegram bots, scheduled tasks, and background automation are powerful later layers. They should not be the first thing a new user configures.

## You still need judgment

Digital Seed helps structure context and workflows. It does not remove the need to review AI output, protect private data, or understand what external tools are allowed to do. For the practical data boundary, read [What Leaves Your Machine?](what-leaves-your-machine.md).

## Platform support is narrow

The alpha is actively tested on macOS and Linux in CI. WSL2 is best-effort
and not in CI. Windows-native (PowerShell / cmd.exe) is not supported. See
[Supported Platforms](supported-platforms.md) for the full stance.

## Current best use case

The best current use case is narrow and practical:

1. create useful context files,
2. ask an AI agent to interview you,
3. index one local folder,
4. solve one real weekly problem,
5. add integrations only after that works.
