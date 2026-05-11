## What changed

-

## Why

-

## Scope (check what applies)

- [ ] Docs only
- [ ] Example, recipe, or template
- [ ] CLI/script behavior
- [ ] Privacy/security-related behavior or docs
- [ ] Visual asset (hero GIF, screenshots, terminal art)
- [ ] Release-impacting (version bump, CHANGELOG, release scripts, CI)
- [ ] Other:

The checklists below are organized by scope. Only fill in the groups that match the boxes you checked. Skipping a group is fine when it does not apply.

---

### Docs-only changes

If this PR only edits Markdown and does not touch CLI behavior, privacy semantics, or releases, the smallest useful check set is:

```bash
bun run check:links
```

- [ ] Links pass.
- [ ] Beginner docs still avoid advanced/maintainer-only setup creep.
- [ ] If wording around privacy/security/setup changed, I also ran `bun run seed privacy-scan`.

### Code or CLI changes

If this PR changes scripts under `scripts/` or other runtime behavior:

```bash
bun run health
bun run seed privacy-scan
bun run check:links
```

- [ ] Health, privacy scan, and link check pass.
- [ ] I updated CLI `--help` / `bun run seed help` if the surface changed.
- [ ] I updated relevant docs (or this change does not require docs).

### Privacy or security changes

If this PR touches `user/`, `.env` handling, the privacy scan, `docs/what-leaves-your-machine.md`, or `SECURITY.md`:

- [ ] I read [What Leaves Your Machine?](docs/what-leaves-your-machine.md).
- [ ] No new outbound network calls without disclosure in `docs/what-leaves-your-machine.md`.
- [ ] No new commands modify the user's machine outside the repo without explicit user-visible output.
- [ ] `bun run seed privacy-scan` passes.

### Visual asset changes

If this PR edits the hero GIF, MP4, WebM, SVG, PNG, or other visual assets under `docs/assets/`:

```bash
bun run seed visual-qa
```

- [ ] Visual QA passes.
- [ ] Fallback assets (MP4 / WebM / SVG / still PNG) still match.

If you did NOT touch visual assets, you can skip the visual-qa step — CI runs it anyway.

### Release-impacting changes

If this PR bumps the version, edits `CHANGELOG.md`, touches `scripts/release-check.ts` or `scripts/fresh-clone-check.sh`, or modifies `.github/workflows/`:

```bash
bun run seed release-check --skip-fresh-clone
bash scripts/fresh-clone-check.sh
```

- [ ] Release check passes locally.
- [ ] Fresh-clone harness passes (or I explained why I skipped it).
- [ ] `package.json`, `CHANGELOG.md`, and the `git tag vX.Y.Z` instruction in `docs/release-checklist.md` all match.

If the PR is not release-impacting, skip this entire group. The fresh-clone harness is **optional** for normal PRs — it is meant as a release gate, not a per-PR hurdle.

---

## Privacy and safety

- [ ] No secrets, tokens, private notes, real personal data, or local config in the diff.
- [ ] Examples use fictional or placeholder data.

## Checks I actually ran

Paste what you ran and the result. Be honest about what you skipped and why:

```text
e.g.
bun run check:links   → ✅
bun run seed privacy-scan → ✅
(skipped visual-qa — no asset changes)
(skipped fresh-clone harness — not release-impacting)
```

## Screenshots / output (optional)

Helpful for docs, CLI output, onboarding, or visual changes.
