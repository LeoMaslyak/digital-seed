# Obsidian Integration

Connect your Obsidian vault so your AI can read, search, and create notes.

## Option 1: MCP Server (recommended)

Install the community Obsidian MCP server:

```bash
# Add to your Claude Code MCP config (.claude/settings.json):
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "@smithery/mcp-obsidian"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

Set `OBSIDIAN_VAULT_PATH` in your `.env` file during setup, or edit `.claude/settings.json` directly.

## Option 2: Direct File Access

Claude Code can read files directly. Just tell it where your vault is:

```
"My Obsidian vault is at ~/Documents/MyVault. Read my notes on [topic]."
```

This works but doesn't provide search or wiki-link resolution.

## Tips

- **Vault structure:** Keep a consistent folder structure (e.g., `Domains/`, `Projects/`, `Daily/`)
- **Tags:** Use tags consistently — they help AI find related notes
- **Templates:** Create note templates your AI can use for new notes
- **Backlinks:** The MCP server can resolve `[[wiki-links]]` for better context
