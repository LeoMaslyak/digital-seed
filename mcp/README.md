# MCP Servers

MCP (Model Context Protocol) servers let your AI agent access external tools and data.

## Built-In Servers

These ship with the starter kit:

| Server | Port | Description |
|--------|------|-------------|
| `dai-memory` | stdio | Persistent memory across sessions |
| `dai-tasks` | stdio | Task management + dashboard feed |

## Adding Community Servers

1. Find a server at [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
2. Install it: `npx @anthropic/mcp-install <package-name>`
3. Add it to `.claude/settings.json` (for Claude Code) or your agent's MCP config
4. Restart your agent

## Creating Your Own

See the `memory-server/` and `tasks-server/` as learning checkpointples. An MCP server needs:

1. A `package.json` with `@modelcontextprotocol/sdk` as a dependency
2. A `src/index.ts` that creates a Server, registers tools, and connects via stdio
3. An entry in `servers.json` and your agent's MCP config

## Security Note

Each MCP server runs as a local process with the permissions of your user account.
Only install servers from sources you trust. Review the code before installing.
