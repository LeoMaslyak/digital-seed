# Installing Bun and Claude Code — Complete Beginner's Guide

> **Never used a terminal before?** This guide is for you. We'll walk through every step on macOS and Windows. Takes about 10 minutes.
>
> **Claude Code is one option, not the only one.** If you prefer OpenAI (ChatGPT / GPT-4o), use Codex CLI instead. If you prefer Google, use Gemini CLI. If you want no cloud at all, use Ollama with a local model. All work with Digital Seed. See [docs/agent-chooser.md](agent-chooser.md) for the full comparison.
>
> **Important:** Digital Seed's scripts require **Bun** as the runtime. Running them with plain `node` is not supported. We install Bun first, then Claude Code on top of it.

---

## What Is a Terminal?

A terminal is a text-based interface to your computer. Instead of clicking icons, you type commands. Claude Code runs inside a terminal — that's why we need one.

Don't worry: you only need to learn ~6 commands, and we show you exactly what to type.

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

### Step 2 — Install Bun

Bun is the JavaScript runtime Digital Seed uses. It is free, open source, and runs entirely on your machine.

Paste this into the terminal and press Enter:

```bash
curl -fsSL https://bun.sh/install | bash
```

When the installer finishes, reload your shell so the `bun` command becomes available:

```bash
exec $SHELL -l
```

Verify it worked:

```bash
bun --version   # should print 1.x or newer
```

If you see a version number, Bun is installed.

### Step 3 — Install Claude Code

Claude Code is Anthropic's official terminal-capable AI agent. Install it as a Bun global:

```bash
bun install -g @anthropic-ai/claude-code
```

You may see yellow warning messages about version upgrades — safe to ignore.

> Heads up: running `claude` connects to Anthropic's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 4 — Log In (mandatory)

**Do not skip this step.** Without it, Claude Code will fail with a connection error even if your internet is working fine.

```bash
claude auth login
```

This opens a browser window. Log in with your Anthropic account (or create one at claude.ai). Once authenticated, return to the terminal.

### Step 5 — Launch Claude Code

```bash
claude
```

If you see a prompt or welcome message, you're set.

---

## Windows

> **Important:** Claude Code works best inside **WSL2** (Windows Subsystem for Linux) rather than the standard Windows Command Prompt or PowerShell. Follow these steps carefully.

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

### Step 3 — Install Bun

Inside the Ubuntu terminal, install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
exec $SHELL -l
bun --version   # should print 1.x or newer
```

If `bun --version` prints a number, Bun is installed.

### Step 4 — Install Claude Code

```bash
bun install -g @anthropic-ai/claude-code
```

Yellow warnings about version upgrades — safe to ignore.

> Heads up: running `claude` connects to Anthropic's API and sends the prompts (and any files you explicitly include) to their servers. That is how the agent works. Digital Seed itself does not send your files anywhere — see [What Leaves Your Machine?](what-leaves-your-machine.md).

### Step 5 — Log In (mandatory — do not skip)

```bash
claude auth login
```

This opens a browser window. Log in with your Anthropic account (or create one at claude.ai). Once authenticated, return to the Ubuntu terminal.

> **Why is this mandatory?** Without logging in first, Claude Code fails with:
> ```
> Failed to connect to api.anthropic.com: ETIMEDOUT
> ```
> This looks like a network error but it is actually a missing auth token. Running `claude auth login` once fixes it permanently — this is NOT caused by your region, VPN, or firewall.

### Step 6 — Launch Claude Code

```bash
claude
```

If you see a prompt or welcome message, you're set.

---

## Now Set Up Digital Seed

With Bun installed and Claude Code working, continue with the canonical
short path: [First 15 Minutes](first-15-minutes.md).

The condensed version:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

---

## Troubleshooting

**`bun: command not found` after install**
Reload your shell:
```bash
exec $SHELL -l
```
Or open a new terminal window. If `bun` is still missing, see [troubleshooting.md](troubleshooting.md) → "Bun is missing or the wrong version."

**`ETIMEDOUT` when running `claude`**
You haven't logged in yet. Always run `claude auth login` before first use.

**`claude: command not found` after install**
```bash
source ~/.bashrc   # Linux/WSL
source ~/.zshrc    # macOS
```
Then try `claude` again.

**Ubuntu terminal shows C:\ style paths**
You are in PowerShell or Command Prompt, not WSL. Close and open Ubuntu from the Start Menu.

**Still stuck?**
Open an issue on GitHub using the [docs confusion template](https://github.com/LeoMaslyak/digital-seed/issues/new/choose). Include your OS, the exact error message, and which step you were on.
