# Installing Claude Code — Complete Beginner's Guide

> **Never used a terminal before?** This guide is for you. We'll walk through every step on Windows and macOS. Takes about 10 minutes.

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

### Step 2 — Install Node.js (via Homebrew)

First, check if Homebrew is already installed:
```bash
brew --version
```

If it says `command not found`, install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the prompts — it may ask for your password (normal, nothing will be shown as you type).

Then install Node.js:
```bash
brew install node
```

Verify it worked:
```bash
node --version   # should show v18 or higher
npm --version    # should show a number
```

### Step 3 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

You may see yellow warning messages about version upgrades — safe to ignore.

### Step 4 — Log In (mandatory)

**Do not skip this step.** Without it, Claude Code will fail with a connection error even if your internet is working fine.

```bash
claude login
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

### Step 3 — Install nvm and Node.js

Inside the Ubuntu terminal, paste this:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Then activate nvm without restarting (paste the whole block):
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Now install Node.js:
```bash
nvm install --lts && nvm use --lts
```

Verify:
```bash
node --version   # should show v18 or higher
npm --version    # should show a number
```

> If you get a Windows npm error referencing C:\Users\...\AppData\Roaming\npm — ignore it. You have a separate Windows-native npm that won't interfere as long as you stay inside Ubuntu.

### Step 4 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Yellow warnings about version upgrades — safe to ignore.

### Step 5 — Log In (mandatory — do not skip)

```bash
claude login
```

This opens a browser window. Log in with your Anthropic account (or create one at claude.ai). Once authenticated, return to the Ubuntu terminal.

> **Why is this mandatory?** Without logging in first, Claude Code fails with:
> ```
> Failed to connect to api.anthropic.com: ETIMEDOUT
> ```
> This looks like a network error but it is actually a missing auth token. Running `claude login` once fixes it permanently — this is NOT caused by your region, VPN, or firewall.

### Step 6 — Launch Claude Code

```bash
claude
```

If you see a prompt or welcome message, you're set.

---

## Now Set Up the Digital Seed

Once Claude Code is running, go back to [getting-started.md](getting-started.md) and continue from Step 1 — Clone.

---

## Troubleshooting

**`nvm: command not found` after installing nvm**
nvm needs activation in each new session until restart. Run:
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**`ETIMEDOUT` when running `claude`**
You haven't logged in yet. Always run `claude login` before first use.

**`claude: command not found` after install**
```bash
source ~/.bashrc   # Linux/WSL
source ~/.zshrc    # macOS
```
Then try `claude` again.

**Ubuntu terminal shows C:\ style paths**
You are in PowerShell or Command Prompt, not WSL. Close and open Ubuntu from the Start Menu.

**Node version below 18**
```bash
nvm install --lts && nvm use --lts
```

**Still stuck?**
Post in the Digital Seed contributors channel with: your OS, exact error message, and which step you're on.
