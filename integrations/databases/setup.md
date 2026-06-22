# Database Integration

Connect your AI to databases for querying and analysis.

> ⚠️ **The AI runs SQL it generates itself.** A database MCP server lets the AI
> compose and execute arbitrary SQL against your database. Even "read-only"
> access can be used to **read every row it can SELECT** (exfiltration), and a
> write-capable role can modify or delete data. Always connect with a
> **least-privilege, read-only role** scoped to only the data the AI needs.

## Step 1 (do this first): create a least-privilege read-only role

Run this against your database **before** wiring up the MCP server. It creates a
dedicated role that can only `SELECT` from the schema you choose:

```sql
-- PostgreSQL: a read-only role scoped to the `public` schema
CREATE ROLE ai_readonly WITH LOGIN PASSWORD 'choose-a-strong-password';
GRANT CONNECT ON DATABASE your_db TO ai_readonly;
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;
-- so future tables are readable too:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_readonly;
```

Use **this** role's credentials below — never your owner/superuser URL. Prefer a
**read replica** for any production database.

## Step 2: keep the connection string out of tracked files

> ⚠️ **Never paste a live connection string into a tracked file.**
> `.claude/settings.json` is **gitignored** (copy it from
> `.claude/settings.example.json`), but it is still easy to leak a secret by
> exporting, syncing, or screen-sharing it. Keep the real connection string in
> `.env` (also gitignored) and reference it from there. Do **not** commit a real
> `postgresql://user:pass@host/db` string anywhere.

Store the connection string in `.env` (gitignored), using the read-only role:

```
# .env  (gitignored — real secret lives only here)
DATABASE_URL=postgresql://ai_readonly:<password>@host:5432/db?sslmode=require
```

## PostgreSQL (Google Cloud SQL, Supabase, Neon, etc.)

Copy `.claude/settings.example.json` to `.claude/settings.json` (gitignored) and
add the server. The official `@modelcontextprotocol/server-postgres` package
opens a **read-only transaction** for queries:

```jsonc
// In .claude/settings.json (gitignored; never paste a real password here):
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres@0.6.2"],
      "env": {
        // Use the same read-only DATABASE_URL you put in .env.
        // Set the real value here at install time; do not commit it.
        "POSTGRES_CONNECTION_STRING": "postgresql://ai_readonly:<password>@host:5432/db?sslmode=require"
      }
    }
  }
}
```

> Note: `@modelcontextprotocol/server-postgres@0.6.2` is the last published
> version and is **marked deprecated** by its maintainers. Confirm with
> `npm view @modelcontextprotocol/server-postgres` and read its README before
> relying on it; you may prefer a currently-maintained alternative you have
> vetted yourself.

## Google Cloud (BigQuery, Firestore)

Use community MCP servers for Google Cloud services (vet and pin them yourself,
see the verification steps in the [MCP README](../../mcp/README.md)):

- **BigQuery:** search the [official MCP servers list](https://github.com/modelcontextprotocol/servers)
  and npm for a maintained BigQuery MCP, then verify it with
  `npm view <name>` (check the publisher, last-publish date, and README) and pin
  the version before use. Do not `npx -y` an unverified name.
- **Firestore:** Check [MCP server directory](https://github.com/modelcontextprotocol/servers)

## Microsoft shared drive / OneDrive

For Microsoft 365 integration:

```bash
# Community shared drive MCP server
# Check https://github.com/modelcontextprotocol/servers for current options
```

Requires Azure AD app registration for OAuth. See Microsoft docs for setup.

## SQLite (Local)

> ⚠️ **No vetted SQLite MCP package is bundled.** A SQLite MCP server typically
> opens the database file **read/write** — the "read-only by default" note below
> does **not** apply to a writable SQLite file. There is no official
> `@modelcontextprotocol/server-sqlite` package on npm. **Choose and verify a
> SQLite MCP server yourself** (`npm view <name>`, read the code, pin the
> version, prefer `--ignore-scripts`), or use a read-only copy of the database
> file. Never `npx -y` an unverified name.

```jsonc
// In .claude/settings.json (gitignored), using a server you verified:
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "<verified-sqlite-mcp-package>@<version>", "path/to/db.sqlite"]
    }
  }
}
```

## Security

- **Use a least-privilege role (Step 1).** The PostgreSQL MCP runs queries in a
  read-only transaction, but that only constrains *writes* — a `SELECT`-only
  role is what actually limits what the AI can read. The SQLite path above is
  **writable** unless you point it at a read-only copy.
- **Read-only does not mean exfiltration-safe.** The AI can read any row your
  role can `SELECT`. Do not connect it to tables containing secrets or other
  people's personal data.
- **Never inline a live secret in a tracked file.** Keep connection strings in
  `.env` (gitignored); `.claude/settings.json` is gitignored but is still not a
  place for production passwords you would not want exported.
- Use separate database users with minimal permissions.
- Consider using read replicas for AI access to production data.
