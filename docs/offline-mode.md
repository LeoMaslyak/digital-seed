# Offline Mode

The Digital Seed works without internet for all local operations.
Offline mode disables tasks that require network connectivity.

## What works offline

✅ Everything local:
- Memory operations (read/write user/, MEMORY.md)
- Task management (data/tasks.json)
- Collaboration (collab/ projects and learning groups)
- Daily digest generation (reads local logs)
- Pattern application (all patterns are local files)
- Knowledge graph (data/graph.json)
- Token tracking (data/token-usage.json)
- Activity state detection (data/activity-signals.json)

## What requires internet

⚠️ Network-dependent (automatically skipped in offline mode):
- `email-triage` — email API access
- `research-updates` — web search
- `daily-digest` delivery hooks (Telegram/email webhooks)
- RAG embedding — new embeddings need OpenAI or Ollama API
- `bun run repo-bot learn` — GitHub API

## Enable Offline Mode

**Option 1: Config file** (persistent)
```yaml
# config/config.yaml
offline: true
```

**Option 2: Environment variable** (per-session)
```bash
SEED_OFFLINE=true bun run task email-triage
# → Skips the task, logs the skip
```

**Option 3: Auto-detect** (programmatic)
```typescript
import { autoDetectAndApply } from "core/src/offline-mode.ts";

const { online, changed } = await autoDetectAndApply(root);
if (!online) console.log("No internet — running in offline mode");
```

## Scheduler Behaviour

When the scheduler runs a task in offline mode:

```
⚠️  Offline mode — skipping email-triage (requires network)
```

The skip is logged to `logs/autonomous.jsonl` and appears in the next
daily digest under "Skipped tasks".

Local tasks (memory-maintenance, note-organization, task-reminders)
still run normally — offline mode only blocks network-dependent categories.

## Check Current Mode

```bash
bun -e "
import { describeOfflineMode } from './core/src/offline-mode.ts';
console.log(describeOfflineMode('.'));
"
```

Output when online:
```
✅ Online mode (default)
   All tasks enabled. Set offline: true in config/config.yaml to disable network tasks.
```

Output when offline:
```
⚠️  Offline mode ACTIVE
   Source: config/config.yaml
   Skipped categories: email-triage, research-updates, daily-digest
   Local operations (memory, tasks, collab, digest) continue normally.
   To disable: set offline: false in config/config.yaml
```

## RAG in Offline Mode

The rag-server uses a local JSON fallback store — existing embeddings are
always available for search, even without internet.

Only **new indexing** requires the embedding API. The rag-server gracefully
returns empty results for new content when offline rather than crashing.

Previously indexed repos (`bun run repo-bot learn`) use keyword search
(`searchAllRepos`) which works fully offline.

## Restore Online Mode

```yaml
# config/config.yaml
offline: false  # or delete the line
```

Or: `SEED_OFFLINE=false bun run task email-triage`
