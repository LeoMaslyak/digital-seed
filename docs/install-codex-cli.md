# Installing Codex CLI (OpenAI) — Beginner's Guide

> **Never used a terminal before?** This guide is for you. We'll walk through every step on macOS and Windows. Takes about 10 minutes.
>
> **Codex CLI is one option, not the only one.** If you prefer Anthropic, use Claude Code instead. If you prefer Google, use Gemini CLI. If you want no cloud at all, use Ollama with a local model. All work with Digital Seed. See [docs/agent-chooser.md](agent-chooser.md) for the full comparison.
>
> **Important:** Digital Seed's scripts require **Bun** as the runtime. Running them with plain `node` is not supported. This guide installs Codex CLI; if you have not installed Bun yet, follow [First 15 Minutes](first-15-minutes.md) or the Bun steps in [Installing Bun and Claude Code](install-claude-code.md).

---

## What Is Codex CLI?

Codex CLI is OpenAI's terminal-capable coding agent. You run it in the folder you want help with, then ask it to read files, suggest changes, run commands, or follow Digital Seed's setup prompt.

Don't worry: you only need to learn ~6 commands, and we show you exactly what to type.

---

## Prerequisites

Before you start, you need:

- Node.js and npm installed (`npm --version` should print a number)
- An OpenAI account at [platform.openai.com](https://platform.openai.com)
- Access to a capable OpenAI model such as GPT-4o or o3

---

## Choose Your Operating System

- [I'm on **macOS**](#macos)
- [I'm on **Windows**](#windows)

---

## macOS

### Step 1 — Open Terminal

Press **⌘ (Command) + Space**, type `Terminal`, press Enter.

You'll see something like:
```
yourname@MacBook-Pro ~ %
```
That's the terminal prompt. This is where you'll type commands.

### Step 2 — Install Codex CLI

Codex CLI is published as the npm package `@openai/codex`. Install it globally:

```bash
npm install -g @openai/codex
```

You may see yellow warning messages about version upgrades — safe to ignore.

> Heads up: running `codex` connects to OpenAI's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 3 — Verify the Install

```bash
codex --version
```

If you see a version number, Codex CLI is installed.

### Step 4 — Log In (mandatory)

**Do not skip this step.** Without it, Codex CLI may open but fail when you ask it to use a model.

```bash
codex login
```

Follow the browser or terminal prompts. Log in with your OpenAI account. Once authenticated, return to the terminal.

### Step 5 — Launch Codex CLI

```bash
codex
```

If you see a prompt or welcome message, you're set.

---

## Windows

> **Important:** Codex CLI works best inside **WSL2** (Windows Subsystem for Linux) rather than the standard Windows Command Prompt or PowerShell. Follow these steps carefully.

### Step 1 — Install WSL2 (Ubuntu)

Open **PowerShell as Administrator**:
- Press the Windows key, type `PowerShell`
- Right-click → Run as Administrator

Run:
```powershell
wsl --install
```

This installs Ubuntu. When it finishes, **restart your computer**.

### Step 2 — Open the Ubuntu Terminal

After restart, open Ubuntu — NOT PowerShell or Command Prompt.

- Press the Windows key, type `Ubuntu`, press Enter

**Correct prompt looks like:**
```
yourname@DESKTOP-ABC123:~$
```

**Wrong terminal — do NOT use:**
```
C:\Users\YourName>
```

If you see `C:\`, close that window and open Ubuntu from the Start Menu instead.

### Step 3 — Install Codex CLI

Inside the Ubuntu terminal, install Codex CLI:

```bash
npm install -g @openai/codex
codex --version
```

If `codex --version` prints a number, Codex CLI is installed.

> Heads up: running `codex` connects to OpenAI's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 4 — Log In (mandatory — do not skip)

```bash
codex login
```

Follow the browser or terminal prompts. Log in with your OpenAI account. Once authenticated, return to the Ubuntu terminal.

> **Why is this mandatory?** Without logging in first, Codex CLI may fail when it tries to call OpenAI's models. This can look like a model or network problem, but it is often just missing authentication.

### Step 5 — Launch Codex CLI

```bash
codex
```

If you see a prompt or welcome message, you're set.

---

## Now Use Codex CLI with Digital Seed

With Codex CLI working, open the Digital Seed folder and ask Digital Seed for the guided plan prompt.

The condensed version:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed plan
```

Copy the prompt that `bun run seed plan` prints, launch Codex CLI, and paste it in:

```bash
codex
```

Codex can then read local files in the folder, run `bun run seed doctor`, and follow the same guided path as any other terminal-capable agent.

---

## Honest Model Note

Codex CLI works best with GPT-4o or o3 level models. Weaker or free-tier models may not follow multi-step setup reliably, especially when the task involves reading several files, choosing phases, and running commands in order.

If setup feels confused or repetitive, switch to a stronger model or use Claude Code for the initial setup, then return to Codex CLI for ongoing work.

---

## Troubleshooting

**`codex: command not found` after install**
Reload your shell:
```bash
exec $SHELL -l
```
Or open a new terminal window. If `codex` is still missing, confirm npm's global bin folder is on your PATH.

**Login errors**
Run:
```bash
codex login
```
again and complete the browser or terminal flow. Make sure you are using the OpenAI account that has model access or billing configured.

**Model not responding**
Check your internet connection, account access, and selected model. If the CLI asks for an API key, create one at [platform.openai.com](https://platform.openai.com) and follow Codex CLI's current setup instructions.

**Ubuntu terminal shows C:\ style paths**
You are in PowerShell or Command Prompt, not WSL. Close and open Ubuntu from the Start Menu.

**Still stuck?**
Open an issue on GitHub using the [docs confusion template](https://github.com/LeoMaslyak/digital-seed/issues/new/choose). Include your OS, the exact error message, and which step you were on.
