# Calendar Integration

Connect your Google Calendar so your AI knows your schedule.

## Google Calendar MCP

```bash
# Add to .claude/settings.json:
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "mcp-google-calendar"],
      "env": {
        "GOOGLE_CALENDAR_CREDENTIALS": "~/.config/dai/calendar-credentials.json"
      }
    }
  }
}
```

### Setup

1. Enable Calendar API in [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Save to `~/.config/dai/calendar-credentials.json`
4. Authorize on first run

### Usage

```
"What's on my calendar this week?"
"Schedule a study session for Thursday at 3pm"
"Find a free slot for a 1-hour meeting this week"
```
