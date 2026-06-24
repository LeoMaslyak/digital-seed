# Release Checklist

Use this before tagging or publicly announcing a Digital Seed release.

> **Release-candidate discipline.** Before tagging anything that looks
> like a 1.0 (`1.0.0-rc.1` or `1.0.0`), read
> [Production Readiness → Release candidate discipline](production-readiness.md#release-candidate-discipline)
> and run [`docs/hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md).
> The gates below cover every release; the 1.0 gates are stricter and
> live in that section.

## 1. Run the release check

One command runs every automated gate:

```bash
bun run seed release-check
```

That composes, in order:

1. `bun install --frozen-lockfile`
2. `bun run health`
3. `bun run seed privacy-scan`
4. `bun run seed visual-qa`
5. `bun run seed onboard --plain`
6. `bun run seed first-prompt`
7. `bun run check:links`
8. Version consistency check (package.json ↔ CHANGELOG.md ↔ this file's tag instruction)
9. Fresh-clone harness (`scripts/fresh-clone-check.sh`)

Useful flags:

- `--skip-fresh-clone` — fast local re-runs and CI mode skip the clone harness automatically; run it at least once before tagging.
- `--with-drive-dry-run --account EMAIL` — maintainer-only Drive publish dry-run (requires the `gog` CLI authenticated against an account that owns the public folder). Skipped by default and never run in public CI.
- `--ci` — CI-safe mode: implies `--skip-fresh-clone` and never touches Drive.

CI (`.github/workflows/ci.yml`) runs `bun run seed release-check --ci --skip-install` on `ubuntu-latest` and `macos-latest` for every push and PR. The fresh-clone harness and Drive dry-run stay local/maintainer-only.

## 2. Optional visual regeneration

Only run this when changing the hero visual:

```bash
python3 scripts/generate-visual-assets.py
bun run seed visual-qa
```

## 3. Maintainer-only Drive dry-run

Skip this if you are not the maintainer publishing the public data room — the rest of the release does not depend on it.

```bash
bun run seed release-check --with-drive-dry-run --account lm@avantgaera.com
```

Or run the dry-run on its own:

```bash
bun run seed drive publish-data-room --dry-run --account lm@avantgaera.com
```

Both require the `gog` CLI authenticated against an account with editor access to the public folder. Public CI never runs this — credentials are not stored in the repo.

## 4. Manual review

- README first screen is understandable to a new user.
- `docs/first-15-minutes.md` matches `bun run seed onboard`.
- `docs/known-alpha-limits.md` still sets honest expectations.
- `CHANGELOG.md` has a new entry for this version.
- No generated temp files are staged.
- `git status --short` is clean after commit.

## 5. Live publish (maintainer-only)

The live publish is opt-in and never runs as part of `release-check`:

Current public folder:

<https://drive.google.com/drive/folders/1EYfexEOzKKY4NJzBb_mNXEBc8FZLfVpG>

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

## 6. Tag and push

For an alpha release:

```bash
git tag v0.5.0-alpha
git push origin main --tags
```

The version consistency check inside `release-check` will fail if `package.json`, `CHANGELOG.md`, and the `git tag vX.Y.Z` instruction above drift apart — bump them together.

For a `1.0.0-rc.1` or `1.0.0` tag, do **not** treat this checklist as
sufficient. Run, in order:

1. The full release-check including a fresh-clone harness run on the tag
   commit (`bun run seed release-check` without `--skip-fresh-clone`).
2. The reusable hostile 1.0 audit prompt at
   [`docs/hostile-1.0-readiness-audit-prompt.md`](hostile-1.0-readiness-audit-prompt.md).
3. The Milestone 5 "must have" list in
   [`docs/production-readiness.md`](production-readiness.md#milestone-5--10-candidate)
   and the [release-candidate discipline](production-readiness.md#release-candidate-discipline)
   section.

If any of those return open P0/P1 blockers, do **not** tag 1.0.
