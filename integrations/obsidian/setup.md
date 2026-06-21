# Obsidian Integration

Connect your Obsidian vault so your AI can read, search, and create notes.

## Option 1: MCP Server

> ⚠️ **Security warning — read before you install anything.**
> Digital Seed does **not** bundle or endorse a specific Obsidian MCP server,
> and there is **no vetted package name to copy-paste here**. An MCP server you
> point at your vault can read (and, if you grant it, write) every note in that
> vault, and it runs as your user on every agent launch. **Never `npx -y` an
> unverified name** — pick and verify a server yourself first.

### How to choose and verify a server (manual step)

There is no auto-install command. Pick an Obsidian MCP server yourself and
verify it before wiring it in:

1. Find a candidate on the [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
   or its source repository.
2. **Confirm the exact npm package name and publisher** with
   `npm view <package-name>` (check the `maintainers` field). Be wary of
   look-alike or unclaimed scopes.
3. **Read the code**, especially any `postinstall`/`install` scripts. Pin the
   exact version and prefer `npm install --ignore-scripts`.
4. Only then add it to your MCP config with the **exact pinned version**.

### Wiring it in

Copy `.claude/settings.example.json` to `.claude/settings.json` (which is
**gitignored** — never paste real secrets into a tracked file) and add the
server you verified:

```jsonc
// In .claude/settings.json (gitignored; do NOT commit real secrets):
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "<verified-package>@<version>"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

You can keep the vault path in your `.env` file (e.g. `OBSIDIAN_VAULT_PATH=...`)
and reference it there, rather than hard-coding it. The vault path is not a
secret, but `.claude/settings.json` is gitignored either way.

## Option 2: Direct File Access (no third-party package)

Claude Code can read files directly — no MCP server, no extra package to vet.
Just tell it where your vault is:

```
"My Obsidian vault is at ~/Documents/MyVault. Read my notes on [topic]."
```

This works but doesn't provide search or wiki-link resolution. It is the safest
option because you install nothing new.

## Tips

- **Vault structure:** Keep a consistent folder structure (e.g., `Domains/`, `Projects/`, `Daily/`)
- **Tags:** Use tags consistently — they help AI find related notes
- **Templates:** Create note templates your AI can use for new notes
- **Backlinks:** A vault-aware MCP server can resolve `[[wiki-links]]` for better context
