# Agent Chooser

Digital Seed works with any terminal-capable AI agent. This guide helps you pick the right one for your setup. You do not need to use Claude Code — it is just the easiest starting point for most people.

## Quick pick

| I want to... | Start with |
|---|---|
| Easiest first-time setup, no config | Claude Code |
| Use OpenAI / ChatGPT | Codex CLI |
| Use Google / Gemini | Gemini CLI |
| Stay entirely local (no cloud, free) | Ollama + any local model |
| Work inside an editor (not terminal) | Cursor or Windsurf |
| Always-on background agent | OpenClaw or Hermes |

---

## Claude Code

**Best for:** terminal workflows, project-level reasoning, editing repos and docs.

**Account required:** claude.ai (free tier available).

**Install:**
```bash
bun install -g @anthropic-ai/claude-code
claude auth login
claude
```

Full guide: [docs/install-claude-code.md](install-claude-code.md)

**What it sends to the cloud:** your prompts and any files you explicitly include go to Anthropic's API. Digital Seed itself does not send anything — see [What Leaves Your Machine?](what-leaves-your-machine.md).

---

## Codex CLI (OpenAI)

**Best for:** users who already have an OpenAI account or prefer GPT models.

**Account required:** OpenAI account (platform.openai.com). Requires an API key or ChatGPT Plus subscription.

**Install (verified against npm package `@openai/codex`, which exposes the `codex` binary):**
```bash
npm install -g @openai/codex
codex login
codex
```

Or via bun:
```bash
bun install -g @openai/codex
```

Verified locally: `codex` is on PATH after install. `codex login` is available in the current CLI help.

**Use with Digital Seed:** open the `digital-seed` folder in your terminal and run `codex` there. Paste the output of `bun run seed first-prompt` as your first message. Codex can read local files in the folder, run `bun run seed doctor`, and follow the same guided path as any other agent.

**Notes:**
- Codex works best with GPT-4o or o3 level models. Weaker models may not follow multi-step setup instructions reliably.
- Some Codex features require the `OPENAI_API_KEY` environment variable in `.env`.
- What it sends to the cloud: prompts and included files go to OpenAI's API.

---

## Gemini CLI (Google)

**Best for:** users who already use Google Workspace or prefer Gemini models.

**Account required:** Google account. Gemini Advanced subscription or a Google AI Studio API key for best results.

**Install (verified against npm package `@google/gemini-cli`, which exposes the `gemini` binary):**
```bash
npm install -g @google/gemini-cli
gemini
```

Then follow the in-app authentication prompt. The current CLI help does not list a separate `gemini auth login` command, so start with `gemini` unless Google's official docs for your installed version say otherwise.

**Use with Digital Seed:** same as any other agent — open the folder, run `gemini`, paste the first-prompt output. Gemini CLI can read local files and run shell commands.

**Notes:**
- Gemini 2.5 Pro or Flash are recommended. Smaller Gemini models may struggle with multi-step reasoning.
- What it sends to the cloud: prompts and included files go to Google's API.

---

## Local models with Ollama (fully offline, free)

**Best for:** users who want no cloud dependency, maximum privacy, or are experimenting without an account.

**Account required:** none. Runs entirely on your machine.

**Install:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a capable model (choose one)
ollama pull llama3.1:70b       # strong, needs ~40GB RAM
ollama pull llama3.1:8b        # lighter, needs ~8GB RAM
ollama pull mistral:7b         # good balance, needs ~8GB RAM
ollama pull qwen2.5-coder:14b  # strong at code + file editing

# Run it
ollama run llama3.1:8b
```

**Use with Digital Seed:** Ollama is a model server, not a terminal agent with file-editing tools out of the box. To use it as a full agent that can read/write files, you need a front-end like:
- **Continue.dev** (VS Code / Cursor extension)
- **Open WebUI** (browser-based, includes file access)
- **Aider** (`pip install aider-chat` — terminal agent with local model support)

Alternatively, point `bun run seed first-prompt` output at your Ollama model via Open WebUI and do the context-file editing manually.

**Honest caveat:** local models below ~30B parameters often struggle with multi-step guided setup, especially reasoning about which phases to enable and running commands correctly. This caveat matches local testing: Ollama may be installed and have capable models available, but smaller models can still be slow or unreliable for agentic repo setup. If setup feels unreliable, try a stronger model or switch to a cloud agent for the initial setup, then use the local model for ongoing conversations.

**What it sends to the cloud:** nothing. All data stays on your machine.

---

## Cursor / Windsurf

**Best for:** coding inside an editor, visual project navigation, interactive file editing.

**Account required:** Cursor or Windsurf account (both have free tiers).

**Use with Digital Seed:** open the `digital-seed` folder in Cursor or Windsurf. Use the built-in terminal to run `bun run seed onboard --plain` and `bun run seed first-prompt`. Paste the first-prompt output into the chat panel.

**Notes:** Cursor and Windsurf are editors first, agents second. They work well for ongoing work inside the repo but are less suited to the initial interactive guided setup than a terminal agent.

---

## OpenClaw

**Best for:** always-on personal AI infrastructure, messaging-based assistant access, background tasks, multi-tool orchestration.

**Account required:** varies by setup (self-hosted or managed).

**Use with Digital Seed:** `bun run seed recipe openclaw init` generates a starting context file. OpenClaw reads your Digital Seed context files as part of its agent config.

**Notes:** This is a Phase 4 integration. Get the local loop working first.

---

## Hermes Agent

**Best for:** structured agentic personal assistant workflows, persistent assistant with your own tools and context.

**Use with Digital Seed:** `bun run seed recipe hermes init` generates a starting context file.

**Notes:** Phase 4, same as OpenClaw. Not a first-day tool.

---

## How to choose

**I am new to this, I just want to get started fast:**
→ Claude Code or Codex CLI. Both have free tiers, install in one command, and work well with the `bun run seed plan` guided setup.

**I already have an OpenAI account:**
→ Codex CLI. Same flow as Claude Code.

**I already use Google / Gemini:**
→ Gemini CLI.

**I care about privacy and do not want any cloud:**
→ Ollama + a 13B+ model. Expect some manual steps; local models are less reliable for guided setup.

**I want an editor experience, not a terminal:**
→ Cursor or Windsurf for ongoing work. Use a terminal agent for the initial setup.

**I want background automation or a chat interface:**
→ Start with any of the above. Add OpenClaw or Hermes as Phase 4 after the local loop works.

---

## Combining agents

Digital Seed is agent-neutral. Your context files work with any agent. A common setup:

- Use Claude Code / Codex CLI for initial setup and project work.
- Use Cursor / Windsurf for daily code editing.
- Add OpenClaw or Hermes later for always-on access.

You can combine tools. Digital Seed is the shared context layer that helps them all understand you.
