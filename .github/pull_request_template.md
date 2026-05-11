## What changed

- 

## Why

- 

## Scope

Check all that apply:

- [ ] Docs only
- [ ] Example or recipe
- [ ] CLI/script behavior
- [ ] Privacy/security-related behavior or docs
- [ ] Release/CI/maintainer tooling
- [ ] Other

## Privacy and safety

- [ ] I did not commit secrets, tokens, private notes, local config, or real personal data.
- [ ] Examples use fictional or placeholder data.
- [ ] Any external read/write/upload/send behavior is opt-in and documented.
- [ ] I reviewed [What Leaves Your Machine?](docs/what-leaves-your-machine.md) if this touches privacy, integrations, or agent behavior.

## Docs

- [ ] I updated relevant docs, or this change does not require docs.
- [ ] I checked that beginner-facing docs still avoid advanced/maintainer-only setup creep.
- [ ] I added or updated troubleshooting notes if this fixes a confusing failure mode.

## Checks run

Paste the commands you ran and the result:

```text
bun run health
bun run seed privacy-scan
bun run seed visual-qa
bun run check:links
bun run seed release-check --skip-fresh-clone
bash scripts/fresh-clone-check.sh
```

If you skipped any relevant check, explain why:

- 

## Screenshots / output

Optional, but helpful for docs, CLI output, onboarding, or visual changes.
