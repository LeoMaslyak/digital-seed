# Agent Path Validation — 2026-05-14

This is an internal validation pass for the non-Claude agent paths. It is not
a substitute for a fresh external user running the first-15-minute path cold.

## Summary

| Path | Result | What was verified |
|---|---|---|
| Codex CLI | Internally verified | CLI installed, login active, read-only headless run could read `README.md` from the repo. |
| Gemini CLI | Internally verified | CLI installed, headless prompt mode works, plan/read-only mode could read `README.md` from the repo. |
| Ollama | Partially verified | Ollama installed, local models present, local model prompt works. Ollama is still not a file-editing terminal agent by itself. |

## Commands run

```bash
codex --version
codex login status
codex exec --sandbox read-only --cd /Users/leozealous/digital-seed \
  --output-last-message /tmp/digital-seed-codex-check.txt \
  "Read README.md only. Do not edit files. Reply with the project H1 and the exact first command in the Start in 15 minutes code block."

gemini --version
gemini --approval-mode plan --prompt \
  "Read README.md. Do not edit files. Reply with the project H1 and the exact first command in the Start in 15 minutes code block."

ollama --version
ollama list
printf 'Read this project name: Digital Seed. Reply with only the two words of the project name.\n' | ollama run qwen2.5:14b
```

## Observed results

- Codex CLI: `codex-cli 0.130.0`; `codex login status` reported
  `Logged in using ChatGPT`; the read-only headless run correctly returned
  `🌱 Digital Seed` and `git clone https://github.com/LeoMaslyak/digital-seed.git`.
- Gemini CLI: `0.37.1`; headless prompt mode returned the expected README
  heading and first quick-start command.
- Ollama: `0.17.5`; local models are installed, including `qwen2.5:14b`,
  `qwen3.5:35b`, `deepseek-r1:14b`, `llama3.2:3b`, and
  `nomic-embed-text`; a local model prompt returned `Digital Seed`.

## Honest remaining limits

- This pass verifies local CLI operation and basic repo reading. It does not
  prove that a first-time user can install, authenticate, and complete setup
  without help.
- Codex CLI and Gemini CLI were not asked to modify files or run the full
  `seed plan` interview. That should be tested in a separate fresh-user or
  clean-profile walkthrough.
- Ollama remains a local model runner, not a complete file-editing agent by
  itself. The current docs are accurate to keep recommending a front-end such
  as Continue.dev, Open WebUI, or Aider for full agent behavior.

## Documentation conclusion

The docs should describe Codex CLI and Gemini CLI as internally validated on a
maintainer machine. They should still avoid claiming fresh-user proof until
outside testers run the path cold.
