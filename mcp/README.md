# MCP Servers

MCP (Model Context Protocol) servers let your AI agent access external tools and data.

## Built-In Servers

These ship with the starter kit and run from this repo's source (no npm install):

| Server | Transport | Description |
|--------|-----------|-------------|
| `seed-memory` | stdio | Persistent memory across sessions |
| `seed-tasks` | stdio | Task management feed |
| `seed-rag` | stdio | Semantic search over embedded content |
| `seed-graph` | stdio | Knowledge graph |

## Adding Community Servers

> ⚠️ **There is no auto-installer.** Earlier drafts referenced an
> `@anthropic/mcp-install` helper — **no such package exists** (the real
> Anthropic npm scope is `@anthropic-ai`, not `@anthropic`). Do not run it.
> Install community servers manually, and verify each one first.

A community MCP server runs as a local process **with your full user
permissions** and often receives credentials (OAuth tokens, DB strings). Treat
adding one as you would running any other binary on your machine:

1. Find a server at the [MCP Server Directory](https://github.com/modelcontextprotocol/servers).
2. **Verify the package name and publisher** before installing:
   `npm view <package-name>` — check that it exists, look at the `maintainers`
   field, and watch for look-alike or unclaimed scopes (e.g. `@anthropic` vs the
   real `@anthropic-ai`).
3. **Read the source**, especially any `postinstall`/`install` scripts.
4. Install with the **exact version pinned** (`<name>@<version>`) and prefer
   `npm install --ignore-scripts` so install hooks cannot run silently.
5. Copy `.claude/settings.example.json` to `.claude/settings.json` (which is
   **gitignored**) and add the server there. **Never paste real secrets into a
   tracked file.**
6. Restart your agent.

## Creating Your Own

See the `memory-server/` and `tasks-server/` as examples. An MCP server needs:

1. A `package.json` with `@modelcontextprotocol/sdk` as a dependency
2. A `src/index.ts` that creates a Server, registers tools, and connects via stdio
3. An entry in `servers.json` and your agent's MCP config

## Security Note

Each MCP server runs as a local process with the permissions of your user
account — Digital Seed does **not** sandbox them. Only install servers from
sources you trust, verify the package name and publisher (`npm view`), pin the
version, and review the code before installing.
