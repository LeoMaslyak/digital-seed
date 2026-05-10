# Email Integration

Set up AI-powered email triage and drafting.

## Gmail via MCP

The recommended approach is the Gmail MCP server:

```bash
# Add to .claude/settings.json:
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-gmail"],
      "env": {
        "GMAIL_CREDENTIALS_PATH": "~/.config/digital-seed/gmail-credentials.json"
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
6. Save to `~/.config/digital-seed/gmail-credentials.json`
7. First run will open a browser for authorization

### Usage

```
"Check my email and triage it"
"Draft a reply to the email from [person] about [topic]"
"Find all unread emails about [project]"
```

## Security Notes

- **Never auto-send** — always review AI-drafted emails before sending
- OAuth tokens are stored locally in `~/.config/digital-seed/`
- Revoke access anytime at [Google Account Permissions](https://myaccount.google.com/permissions)
