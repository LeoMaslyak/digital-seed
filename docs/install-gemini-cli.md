# Installing Gemini CLI (Google) — Beginner's Guide

> **Never used a terminal before?** This guide is for you. We'll walk through every step on macOS and Windows. Takes about 10 minutes.
>
> **Gemini CLI is one option, not the only one.** If you prefer Anthropic, use Claude Code instead. If you prefer OpenAI, use Codex CLI. If you want no cloud at all, use Ollama with a local model. All work with Digital Seed. See [docs/agent-chooser.md](agent-chooser.md) for the full comparison.
>
> **Important:** Digital Seed's scripts require **Bun** as the runtime. Running them with plain `node` is not supported. This guide installs Gemini CLI; if you have not installed Bun yet, follow [First 15 Minutes](first-15-minutes.md) or the Bun steps in [Installing Bun and Claude Code](install-claude-code.md).

---

## What Is Gemini CLI?

Gemini CLI is Google's terminal-capable AI agent. You run it in the folder you want help with, then ask it to read files, suggest changes, run commands, or follow Digital Seed's setup prompt.

Don't worry: you only need to learn ~6 commands, and we show you exactly what to type.

---

## Prerequisites

Before you start, you need:

- Node.js and npm installed (`npm --version` should print a number)
- A Google account
- Gemini Advanced or a Google AI Studio API key recommended for best results

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

### Step 2 — Install Gemini CLI

Gemini CLI is published as the npm package `@google/gemini-cli`. Install it globally:

```bash
npm install -g @google/gemini-cli
```

You may see yellow warning messages about version upgrades — safe to ignore.

> Heads up: running `gemini` connects to Google's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 3 — Verify the Install

```bash
gemini --version
```

If you see a version number, Gemini CLI is installed.

### Step 4 — Authenticate (mandatory)

**Do not skip this step.** Without it, Gemini CLI may open but fail when you ask it to use a model.

```bash
gemini
```

Follow the in-app sign-in prompt. Depending on your installed version, Gemini CLI may ask you to log in with a Google account, paste an API key, or configure Google AI Studio access.

### Step 5 — First Run

If Gemini CLI is not already open, launch it again:

```bash
gemini
```

If you see a prompt or welcome message, you're set.

---

## Windows

> **Important:** Gemini CLI works best inside **WSL2** (Windows Subsystem for Linux) rather than the standard Windows Command Prompt or PowerShell. Follow these steps carefully.

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

### Step 3 — Install Gemini CLI

Inside the Ubuntu terminal, install Gemini CLI:

```bash
npm install -g @google/gemini-cli
gemini --version
```

If `gemini --version` prints a number, Gemini CLI is installed.

> Heads up: running `gemini` connects to Google's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 4 — Authenticate (mandatory — do not skip)

```bash
gemini
```

Follow the in-app sign-in prompt. Depending on your installed version, Gemini CLI may ask you to log in with a Google account, paste an API key, or configure Google AI Studio access.

> **Why is this mandatory?** Without authenticating first, Gemini CLI may fail when it tries to call Google's models. This can look like a model or network problem, but it is often just missing authentication.

### Step 5 — First Run

```bash
gemini
```

If you see a prompt or welcome message, you're set.

---

## Now Use Gemini CLI with Digital Seed

With Gemini CLI working, open the Digital Seed folder and ask Digital Seed for the guided plan prompt.

The condensed version:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed plan
```

Copy the prompt that `bun run seed plan` prints, launch Gemini CLI, and paste it in:

```bash
gemini
```

Gemini CLI can then read local files in the folder, run `bun run seed doctor`, and follow the same guided path as any other terminal-capable agent.

---

## Honest Model Note

Gemini 2.5 Pro or Flash are recommended. Smaller Gemini models may struggle with multi-step setup, especially when the task involves reading several files, choosing phases, and running commands in order.

If setup feels confused or repetitive, switch to a stronger model or use Claude Code for the initial setup, then return to Gemini CLI for ongoing work.

---

## Troubleshooting

**`gemini: command not found` after install**
Reload your shell:
```bash
exec $SHELL -l
```
Or open a new terminal window. If `gemini` is still missing, confirm npm's global bin folder is on your PATH.

**Authentication errors**
Run:
```bash
gemini
```
again and complete the sign-in or API-key flow. Make sure you are using the Google account or AI Studio key that has model access.

**Model issues**
Check your internet connection, account access, selected model, and quota. If Gemini CLI asks for an API key, create one in Google AI Studio and follow Gemini CLI's current setup instructions.

**Ubuntu terminal shows C:\ style paths**
You are in PowerShell or Command Prompt, not WSL. Close and open Ubuntu from the Start Menu.

**Still stuck?**
Open an issue on GitHub using the [docs confusion template](https://github.com/LeoMaslyak/digital-seed/issues/new/choose). Include your OS, the exact error message, and which step you were on.
