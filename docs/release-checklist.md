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
bash scripts/fresh-clone-check.sh
```

CI (`.github/workflows/ci.yml`) runs the first six on `ubuntu-latest` and `macos-latest` on every push and PR. Run the fresh-clone harness locally before tagging.

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

If Drive deletion fails with `403 insufficientFilePermissions`:

1. **First try `--no-delete`** to push the latest content without disturbing locked files:
   ```bash
   bun run seed drive publish-data-room --account lm@avantgaera.com --no-delete
   ```
   The new uploads coexist with the old; viewers see the newest by "modified" date.
2. If the duplicates become noisy, publish to a clean new folder owned by the publishing account, share it as anyone-with-link reader, then update `README.md`, `docs/data-room-guide.md`, and `DEFAULT_ROOT_NAME` in `scripts/publish-data-room.ts`.

See [`docs/data-room-guide.md`](data-room-guide.md#permission-fallbacks) for the full strategy matrix.

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
