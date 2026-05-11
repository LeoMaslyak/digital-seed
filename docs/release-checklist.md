# Release Checklist

Use this before tagging or publicly announcing a Digital Seed release.

## Required checks

```bash
bun install
bun run health
bun run seed privacy-scan
bun run seed visual-qa
bun run seed onboard --plain >/tmp/digital-seed-onboard.txt
bun run seed first-prompt >/tmp/digital-seed-first-prompt.txt
bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com
```

## Optional visual regeneration

Only run this when changing the hero visual:

```bash
python3 scripts/generate-visual-assets.py
bun run seed visual-qa
```

## Data room publish

Current public folder:

<https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG>

Publish after dry-run passes:

```bash
bun run seed drive publish-data-room --account lm@avantgaera.com
```

If Drive deletion fails with `403 insufficientFilePermissions`, publish to a clean new folder owned by the publishing account, share it as anyone-with-link reader, then update README, `docs/data-room-guide.md`, and `scripts/publish-data-room.ts`.

## Manual review

- README first screen is understandable to a new user.
- `docs/first-15-minutes.md` matches `bun run seed onboard`.
- `docs/known-alpha-limits.md` still sets honest expectations.
- `CHANGELOG.md` has a new entry.
- No generated temp files are staged.
- `git status --short` is clean after commit.

## Tagging

```bash
git tag v0.4.0-alpha
git push origin main --tags
```

Use the exact version chosen for the release.
