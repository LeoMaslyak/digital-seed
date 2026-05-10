# Security Model

> Your personal AI infrastructure handles sensitive data. This document explains our security architecture.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| API key leakage | `.env` git-ignored, pre-commit hooks scan for key patterns |
| Data exfiltration | All storage is local files — no cloud sync by default |
| Cross-user data access | Every instance is fully isolated — no shared components |
| Malicious MCP servers | Only install servers from trusted sources; review permissions |
| Secret in commit history | Pre-commit hooks block patterns matching known key formats |
| Prompt injection via files | Context files are user-controlled; MCP servers validate inputs |

## Data Storage

All data stays on your machine:

```
.env                    # API keys (git-ignored)
config/config.yaml      # Configuration (git-ignored)
user/                   # Your personal context (git-ignored)
data/                   # Runtime data (git-ignored)
logs/                   # Audit logs (git-ignored)
```

**Nothing is sent anywhere** except to the model providers you explicitly configure, for the purpose of AI inference.

## API Key Management

- Store keys only in `.env` (never in code or config files)
- Use a **dedicated API key** for this project (easy to rotate/revoke)
- The pre-commit hook blocks commits containing patterns like `sk-ant-`, `sk-proj-`, etc.
- Never share your `.env` file

## MCP Server Security

MCP servers act as bridges between your AI agent and external services. Each server:

- Runs locally on your machine
- Only accesses the services you configure
- Has no network access beyond what you grant
- Can be individually enabled/disabled

**Before installing a community MCP server:**
1. Review the source code
2. Check for excessive permission requests
3. Prefer servers with active maintenance and community trust
4. Pin to specific versions when possible

## Audit Logging

Every significant AI action is logged to `logs/audit.jsonl`:

```json
{
  "timestamp": "2026-03-18T10:00:00Z",
  "action": "email.draft",
  "summary": "Drafted reply to john@example.com",
  "model": "claude-sonnet-4-6",
  "tokens": 1250
}
```

Review this log periodically to understand what your AI is doing.

## Best Practices

1. **Review before sending** — Never let AI send emails/messages without your review
2. **Rotate keys** — Change API keys periodically (quarterly is reasonable)
3. **Keep updated** — `git pull` to get security patches
4. **Minimal permissions** — Only enable integrations you actually use
5. **Separate concerns** — Don't store work and personal data in the same instance
6. **Backup context** — Periodically back up `user/` and `data/` directories

## Reporting Vulnerabilities

Found a security issue? Open a private security advisory on GitHub for `LeoMaslyak/digital-seed`.

Do NOT open a public issue for security vulnerabilities.
