# Contributing to Digital Seed

Thanks for helping make Digital Seed easier for strangers to use. This is an alpha project, so the best contributions are usually small, practical, and well explained.

## Good first contributions

Start here if you are new to the repo:

- Fix unclear wording, broken links, typos, or stale screenshots in `README.md` and `docs/`.
- Add a fictional example profile under `docs/examples/`.
- Improve a troubleshooting entry with the exact error message you saw and the fix that worked.
- Add or improve an integration recipe under `recipes/` or `docs/integration-recipes.md`.
- Report a reproducible bug with the relevant command output.

You do not need to understand the whole project to improve one page or one recipe.

## Before opening an issue

If GitHub or bug reports feel intimidating, run:

```bash
bun run seed feedback
```

For a copy-paste draft, run:

```bash
bun run seed feedback --write-draft
```

See [Feedback and Small Fixes](docs/feedback.md) for the non-technical path to issues and tiny docs PRs.

Please choose the closest issue template:

- **First-run friction** — the first 15 minutes felt confusing, too technical, scary, or unclear.
- **Bug report** — a command failed, generated the wrong output, or behaved differently on your platform.
- **Docs confusion** — a page was unclear, contradictory, missing context, or too advanced for the first-run path.
- **Integration recipe request** — you want a safe recipe for a tool or workflow Digital Seed does not cover yet.

Good issues include:

- the command you ran,
- your OS and Bun version,
- the exact error output if there was one,
- what you expected to happen,
- whether the problem affects the first-15-minute path or an advanced/optional feature.

## Development setup

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard --plain
bun run seed doctor
```

Bun is required. Running the scripts with plain `node` is not supported. (`bun run health` is an alias for `bun run seed doctor` and is fine to use in scripts.)

## Repo shape

The main surfaces are:

- `agents/` — agent-facing context, routing, and assistant setup material.
- `collab/` — shared-project and collaboration starter surfaces.
- `config/` — local configuration templates and optional runtime settings.
- `core/` — reusable TypeScript core modules.
- `data/` — local runtime indexes and generated data; do not commit private data.
- `docs/` — public guides, troubleshooting, examples, readiness notes, and trust docs.
- `exports/` — generated exports and shareable outputs; review before publishing.
- `integrations/` — optional integration glue and examples.
- `mcp/` — Model Context Protocol server/config helpers.
- `packs/` — reusable packs of context, prompts, or patterns.
- `patterns/` — marketplace pattern sources and examples.
- `recipes/` — optional integration patterns.
- `scripts/` — CLI commands behind `bun run seed ...` and release/health checks.
- `user/` — editable personal context templates; do not add real private data here.
- `.github/` — CI, issue templates, and PR template.

## Contribution types

### Docs fixes

Docs-only PRs are very welcome. Please run:

```bash
bun run check:links
```

If your change touches privacy, security, setup, troubleshooting, or release docs, also run:

```bash
bun run seed privacy-scan
```

### Integration recipes

Recipes should be safe by default:

- explain what the integration can read or write,
- start with local/read-only setup when possible,
- require explicit confirmation before uploading, deleting, sending messages, or publishing,
- avoid paid services in the first-run path,
- use fictional examples and placeholder credentials only.

**Start from the template.** Copy [`recipes/_template/README.md`](recipes/_template/README.md) into a new `recipes/<your-slug>/README.md` and fill in every section. New recipes ship as **Experimental / adapt-yourself**; see [`docs/integration-recipes.md`](docs/integration-recipes.md) for the status legend.

### Code changes

Keep code PRs focused. Include the smallest useful verification set:

```bash
bun run seed doctor          # local setup health (alias: bun run health)
bun run seed privacy-scan
bun run check:links
```

If you change onboarding, release tooling, visual assets, CLI help, or public docs, run the fuller gate:

```bash
bun run seed visual-qa
bun run seed release-check --skip-fresh-clone
```

Before a release or large public-facing change, run:

```bash
bash scripts/fresh-clone-check.sh
```

## Pull request checklist

Before opening a PR:

- Keep it to one focused fix, doc improvement, recipe, or feature.
- Update docs when behavior changes.
- Do not commit secrets, tokens, private notes, real personal data, or local config.
- Use fictional data in examples.
- Run the checks relevant to your change and paste the results in the PR.
- Mention any check you skipped and why.

## Privacy and security expectations

Digital Seed is local-first, but AI agents and optional integrations may send selected content to external providers. Read [What Leaves Your Machine?](docs/what-leaves-your-machine.md) before changing privacy-sensitive docs or integrations.

Do **not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Maintainer expectations

Maintainers should prefer boring, beginner-safe changes:

- protect the 15-minute path from advanced setup creep,
- keep maintainer-only commands out of beginner docs,
- ask for clearer reproduction steps instead of guessing,
- block PRs that add private residue or vague automation risk,
- use `docs/release-checklist.md` before tagging.

## Code of conduct

Be kind. Be concrete. Assume contributors are learning, and make the repo easier for the next person.

The full Code of Conduct lives in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Report Code-of-Conduct issues via a [private GitHub security advisory](https://github.com/LeoMaslyak/digital-seed/security/advisories/new), the same channel used for security issues.
