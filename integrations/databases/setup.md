# Database Integration

Connect your AI to databases for querying and analysis.

## PostgreSQL (Google Cloud SQL, Supabase, Neon, etc.)

```bash
# Add to .claude/settings.json:
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@host:5432/db"
      }
    }
  }
}
```

Store the connection string in `.env`:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## Google Cloud (BigQuery, Firestore)

Use community MCP servers for Google Cloud services:

- **BigQuery:** [mcp-bigquery](https://github.com/ergut/mcp-bigquery)
- **Firestore:** Check [MCP server directory](https://github.com/modelcontextprotocol/servers)

## Microsoft shared drive / OneDrive

For Microsoft 365 integration:

```bash
# Community shared drive MCP server
# Check https://github.com/modelcontextprotocol/servers for current options
```

Requires Azure AD app registration for OAuth. See Microsoft docs for setup.

## SQLite (Local)

For simple local databases:

```bash
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "path/to/db.sqlite"]
    }
  }
}
```

## Security

- **Read-only by default** — configure write access explicitly if needed
- Store connection strings in `.env`, never in code
- Use separate database users with minimal permissions
- Consider using read replicas for AI access to production data
