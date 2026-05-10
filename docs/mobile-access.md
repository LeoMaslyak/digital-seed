# Mobile Access Guide

Use your Digital Seed from any device — phone, tablet, or a machine you don't own.

## Option 1: SSH + Blink Shell (iPhone/iPad)

The cleanest mobile experience. Full terminal, persistent sessions.

**Setup (one time):**
1. Install [Blink Shell](https://blink.sh) on your iPhone or iPad
2. Add your machine as a host: `Settings → Hosts → +`
3. If your machine isn't publicly reachable, use [Tailscale](#tailscale) (Option 3 below)

**Usage:**
```bash
# Connect to your machine
ssh your-machine

# Run Digital Seed commands normally
cd ~/digital-seed
bun run digest --text       # mobile-safe output
bun run collab group show finance-group-a
bun run marketplace list
```

**Tips for mobile:**
- Use `--text` flag on `digest` — no markdown tables, Telegram-safe format
- `bun run collab summary` gives a quick overview without long output
- Alias common commands in your `~/.zshrc`:
  ```bash
  alias seed-status='bun run digest --text'
  alias seed-check='bun run collab check'
  ```

---

## Option 2: OpenClaw Mobile

If you use [OpenClaw](https://github.com/openclaw/openclaw), your Digital Seed kit is
accessible through any OpenClaw-connected channel (Telegram, WhatsApp, etc.).

The `CLAUDE.md` agent instructions tell the agent how to use all Digital Seed tools,
so you can interact naturally:

- *"Show me the daily digest"* → `bun run digest --text`
- *"Add a note to my project"* → `bun run collab note sample-project "..."`
- *"What patterns are installed?"* → `bun run marketplace installed`

The activity state detector (`core/src/activity-state.ts`) automatically
identifies when you're on mobile (short messages, voice notes) and adjusts
response length accordingly.

---

## Option 3: Tailscale (Secure Remote Access) {#tailscale}

Expose your machine to any device over a private encrypted network —
no port forwarding, no VPN configuration.

**Setup:**
```bash
# On your main machine (macOS)
brew install tailscale
open /Applications/Tailscale.app
# Sign in → machine gets a stable 100.x.x.x address

# On your phone: install Tailscale app → sign in to the same account
```

**Connect from anywhere:**
```bash
# From Blink Shell (or any SSH client) using Tailscale address
ssh user@100.x.x.x   # your machine's Tailscale IP

# Or use the MagicDNS hostname
ssh your-machine-name
```

**MCP over Tailscale:**
If you run a remote Claude Code or another MCP client, you can expose the
Digital Seed MCP servers over Tailscale:
```bash
# Start MCP servers bound to Tailscale interface
DIGITAL_SEED_ROOT=~/digital-seed bun run mcp/memory-server/src/index.ts

# The servers are accessible at: 100.x.x.x:<port>
```

---

## Option 4: VS Code Remote / Cursor SSH

Edit and run Digital Seed scripts remotely from VS Code or Cursor using their built-in
SSH extension:

1. Install "Remote - SSH" extension
2. Connect to your machine: `Cmd+Shift+P → Remote-SSH: Connect to Host`
3. Open `~/digital-seed` as your workspace
4. All terminal commands run on your machine

---

## Activity State & Mobile Behaviour

The kit detects when you're on mobile and adjusts:

| State | Detection | Agent behaviour |
|-------|-----------|-----------------|
| `active-desk` | Long messages, frequent | Full collaboration mode |
| `active-mobile` | Short messages / voice | Short replies, no tables |
| `away` | >45 min silence | Autonomous, batches results |
| `sleeping` | Night hours + silence | Silent, critical-only alerts |

You can check the current state:
```bash
bun -e "
import { detectActivityState, describeState } from './core/src/activity-state.ts';
console.log(describeState(detectActivityState('.')));
"
```

---

## Quick Reference

| Goal | Command |
|------|---------|
| Today's digest (mobile) | `bun run digest --text` |
| Check collab activity | `bun run collab summary` |
| List installed patterns | `bun run marketplace installed` |
| Search indexed repos | `bun run repo-bot search-all "<query>"` |
| Check offline mode | `bun -e "import {describeOfflineMode} from './core/src/offline-mode.ts'; console.log(describeOfflineMode('.'))"` |
