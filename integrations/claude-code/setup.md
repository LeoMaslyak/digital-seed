# Claude Code Integration

Claude Code is the recommended agent for Digital Seed. It supports MCP natively.

## Prerequisites

- Claude Code installed: `npm install -g @anthropic-ai/claude-code`
- An Anthropic API key in your `.env`

## Setup

The kit is pre-configured for Claude Code. The `.claude/` directory contains:

- `CLAUDE.md` — System instructions (your AI's "personality" and rules)
- `settings.json` — MCP server configuration and permissions

## Usage

```bash
cd digital-seed
claude
```

Claude Code will automatically:
1. Load your context files (`user/USER.md`, `user/GOALS.md`, etc.)
2. Connect to the configured MCP servers
3. Have access to your patterns in `patterns/`

## Customizing

Edit `.claude/CLAUDE.md` to change how Claude Code behaves. For learning checkpointple:
- Add domain-specific instructions
- Change the communication style
- Add or remove capabilities

## MCP Servers

To add more MCP servers, edit `.claude/settings.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@some-package/mcp-server"],
      "env": { "API_KEY": "${SOME_API_KEY}" }
    }
  }
}
```
