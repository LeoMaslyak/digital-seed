# Calendar Integration

Connect your Google Calendar so your AI knows your schedule.

## Google Calendar MCP

> ⚠️ **Security warning — read before you install anything.**
> Digital Seed does **not** bundle or endorse a specific Google Calendar MCP
> server, and there is **no vetted package name to copy-paste here**. A calendar
> MCP server receives the path to your Google OAuth credentials and runs as your
> user on every agent launch. **Never `npx -y` an unverified name next to OAuth
> credentials.** Several community calendar packages exist but are published by
> individuals, are early-stage, and are not vetted by this project.

### Least-privilege scope

When you create OAuth credentials, request the **minimum** scope your use needs:

- `https://www.googleapis.com/auth/calendar.readonly` — read-only ("what's on my
  calendar?"). Prefer this if you only need to *see* your schedule.
- `https://www.googleapis.com/auth/calendar.events` — read/write **events only**,
  without full calendar/ACL control. Use this only if you need the AI to create
  or edit events.

Avoid the broad `.../auth/calendar` scope unless you genuinely need full calendar
management.

### How to choose and verify a server (manual step)

There is no auto-install command. Pick a calendar MCP server yourself and verify
it before wiring it in:

1. Find a candidate on the [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
   or its source repository.
2. **Confirm the exact npm package name and publisher** with
   `npm view <package-name>` (check the `maintainers` field). Treat unscoped,
   single-maintainer, very-early-version packages as unverified.
3. **Read the code**, especially `postinstall`/`install` scripts. Pin the exact
   version and prefer `npm install --ignore-scripts`.
4. Only then add it to your MCP config with the **exact pinned version**.

### Wiring it in

Copy `.claude/settings.example.json` to `.claude/settings.json` (which is
**gitignored** — never paste real secrets into a tracked file) and add the
server you verified:

```jsonc
// In .claude/settings.json (gitignored; do NOT commit real secrets):
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "<verified-package>@<version>"],
      "env": {
        // Path to (not contents of) your OAuth credentials file:
        "GOOGLE_CALENDAR_CREDENTIALS": "${HOME}/.config/digital-seed/calendar-credentials.json"
      }
    }
  }
}
```

### Setup

1. Enable Calendar API in [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials with the least-privilege scope above
3. Save the credentials with tight permissions:
   ```bash
   mkdir -p -m 700 "$HOME/.config/digital-seed"
   mv ~/Downloads/your-credentials.json "$HOME/.config/digital-seed/calendar-credentials.json"
   chmod 600 "$HOME/.config/digital-seed/calendar-credentials.json"
   ```
4. Authorize on first run

> Some JSON env loaders do **not** expand a literal `~`. Use `$HOME` (or a full
> absolute path) in the `env` values above.

### Usage

```
"What's on my calendar this week?"
"Schedule a project review for Thursday at 3pm"
"Find a free slot for a 1-hour meeting this week"
```
