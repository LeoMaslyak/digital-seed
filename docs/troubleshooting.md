# Troubleshooting

Common problems and what to try. If something here is wrong or missing, open an issue or a PR.

> Quick sanity check first: `bun run seed doctor`. It catches most setup problems and tells you what to install.
>
> If your question is privacy-related, read [What Leaves Your Machine?](what-leaves-your-machine.md) before connecting an AI agent or optional integration.

## Bun is missing or the wrong version

**Symptom:** `bun: command not found`, or `bun install` fails with cryptic errors.

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
exec $SHELL -l
bun --version   # should print 1.x or newer
```

If `bun` runs but a script errors with "unknown flag" or "unexpected token", upgrade:

```bash
bun upgrade
```

If you cannot install Bun globally, run the JS scripts with `node` is **not** supported — Digital Seed depends on Bun's runtime. Use [AI Agent Install](ai-agent-install.md) to have an agent install Bun for you.

## Python or Pillow missing (visual-qa fails)

**Symptom:** `bun run seed visual-qa` exits with `ModuleNotFoundError: No module named 'PIL'` or `python3: command not found`.

Install Python 3 (pre-installed on macOS, available via apt/dnf on Linux) and Pillow:

```bash
python3 -m pip install --upgrade Pillow
```

If you do not need visual QA right now (you are not editing the hero GIF), you can skip the command. It is required only for the release gate.

## AI agent CLI not installed

**Symptom:** `bun run seed first-prompt` works, but you do not know what to paste it into. Or `claude` / `cursor` / `windsurf` is "command not found".

Pick one terminal-capable agent:

- **Claude Code:** see [Install Claude Code](install-claude-code.md).
- **Cursor:** install Cursor, then run `cursor .` from inside the repo.
- **Windsurf:** install Windsurf, then open the folder.
- **OpenClaw / Hermes:** see the recipes under `recipes/`.

Any agent works as long as it can read the local Markdown files in `user/`.

## Google Drive or `gog` wrapper unavailable

**Symptom:** `bun run seed drive ...` errors with missing credentials, or `gmail-*` / `outlook-*` wrappers fail.

These are **opt-in** integrations and not required for the first-15-minute path. Skip them.

If you want them later:

- Drive: install `gog` and authenticate against the Google account you want to use. See [`docs/web-and-drive.md`](web-and-drive.md).
- Email: configure Gmail and Outlook wrappers separately. They are stored under `~/.claude/scripts/gmail/` and are not part of this repo.

Digital Seed never sends mail or uploads files without an explicit command.

## Privacy scan flags something that is not actually private

**Symptom:** `bun run seed privacy-scan` exits non-zero on content you consider safe — for example a generic phrase or a quoted hostile-audit excerpt.

Options:

1. **Edit the file.** Privacy is a habit, not a syntax. If the scanner flagged it, ask whether it really belongs in a public repo.
2. **Allow the file explicitly.** Open `scripts/seed.ts`, find the `allow` array inside `privacyScan()`, and add the relative path of the file. Use this sparingly — every allow-list entry weakens future scans.
3. **Tighten the rule.** If a regex is too aggressive, tweak it in `privacyScan()` and re-run. Treat changes as opt-in conservatism, not loosening.

For false positives on hostile-audit notes, prefer keeping the audit file inside `docs/` and adding it to the allow-list rather than redacting it.

## Fresh-clone validation fails

**Symptom:** `bash scripts/fresh-clone-check.sh` errors on one of the gates.

Diagnose in order:

1. **`bun install` step fails** → check that `bun.lock` is committed and that your Bun version is current.
2. **`bun run health` fails** → run `bun run seed doctor` in the source repo, fix what it points to (usually `.env` or a missing MCP server), and re-run.
3. **`bun run seed privacy-scan` fails** → see the previous section.
4. **`bun run seed visual-qa` fails** → see Python/Pillow section.
5. **`bun run seed onboard --plain` fails** → likely a syntax error in `scripts/seed.ts`. Run `bun run scripts/seed.ts onboard --plain` directly to see the real error.

Re-run with `--keep` to inspect the temporary clone:

```bash
bash scripts/fresh-clone-check.sh --keep
```

## CI failures

**Symptom:** GitHub Actions red, local checks pass.

Most common causes:

- **OS-specific:** CI runs both `ubuntu-latest` and `macos-latest`. A path or shell-quoting issue may pass on one and fail on the other.
- **Frozen lockfile:** CI uses `bun install --frozen-lockfile`. If `bun.lock` is out of sync with `package.json`, the install step fails. Run `bun install` locally and commit the updated lockfile.
- **Python missing in the link-check or visual-qa job:** the workflow installs Python 3 and Pillow explicitly. If you forked and stripped a step, re-add it.
- **Broken link in docs:** `bun run check:links` is part of CI. Run it locally before pushing.

## "It still does not work"

Open `bun run seed doctor` output, copy it, and ask your agent: "Here is the Digital Seed doctor output — what is wrong and how do I fix it?" The doctor output is designed to be paste-ready for an AI agent.
