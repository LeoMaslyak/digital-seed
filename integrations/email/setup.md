# Email Integration

Set up AI-powered email triage and drafting.

## Gmail via MCP

> ⚠️ **Security warning — read before you install anything.**
> Digital Seed does **not** bundle or endorse a specific Gmail MCP server, and
> there is **no vetted package name to copy-paste here**. An MCP server you wire
> to Gmail receives the path to your Gmail OAuth credentials and runs as your
> user on every agent launch. A malicious or typo-squatted package can read and
> exfiltrate your inbox and refresh token. **Never `npx -y` an unverified name
> next to OAuth credentials.**

### How to choose and verify a server (manual step)

There is no auto-install command. Pick a Gmail MCP server yourself and verify it
before wiring it in:

1. Find a candidate on the [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
   or its source repository. Prefer one with visible source, active maintenance,
   and community trust.
2. **Confirm the exact npm package name and publisher.** Run
   `npm view <package-name>` and check the `maintainers` field. Be suspicious of
   look-alike scopes (Anthropic publishes under **`@anthropic-ai`**, not
   `@anthropic`). An unclaimed or vendor-impersonating scope is a red flag.
3. **Read the code**, especially any `postinstall`/`install` scripts, before you
   run it. When you install it, pin the exact version (`<name>@<version>`) and
   prefer `npm install --ignore-scripts` so install hooks cannot run silently.
4. Only then add it to your MCP config, using the **exact pinned version**.

### Wiring it in

Copy `.claude/settings.example.json` to `.claude/settings.json` (which is
**gitignored** — never paste real secrets into a tracked file) and add the
server you verified. Use the package name and version you confirmed above in
place of `<verified-package>@<version>`:

```jsonc
// In .claude/settings.json (gitignored; do NOT commit real secrets):
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["-y", "<verified-package>@<version>"],
      "env": {
        // Path to (not contents of) your OAuth credentials file:
        "GMAIL_CREDENTIALS_PATH": "${HOME}/.config/digital-seed/gmail-credentials.json"
      }
    }
  }
}
```

### OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials JSON
6. Save it with tight permissions:
   ```bash
   mkdir -p -m 700 "$HOME/.config/digital-seed"
   mv ~/Downloads/your-credentials.json "$HOME/.config/digital-seed/gmail-credentials.json"
   chmod 600 "$HOME/.config/digital-seed/gmail-credentials.json"
   ```
7. First run will open a browser for authorization

## Security Notes

- **No package is bundled or vetted for you** — you choose and verify one
  yourself (see the warning above). Never auto-`npx -y` an unverified name.
- **Never auto-send** — always review AI-drafted emails before sending.
- OAuth tokens are stored locally in `~/.config/digital-seed/`; keep that
  directory `0700` and the credentials file `0600`.
- Some JSON env loaders do **not** expand a literal `~`. Use `$HOME` (or a full
  absolute path) in the `env` values above.
- Revoke access anytime at [Google Account Permissions](https://myaccount.google.com/permissions).
