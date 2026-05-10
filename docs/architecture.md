# Architecture

## Design Philosophy

1. **Glue, not framework** — Connect existing tools rather than reimplementing them
2. **Files as truth** — Your data lives in local markdown + JSON files you control
3. **MCP as universal connector** — Any MCP-compatible agent can use the infrastructure
4. **Token efficiency** — Tiered loading, summaries first, full reads only when needed
5. **Security first** — Personal data never leaves your machine unless you explicitly share it

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your AI Agent                                │
│          Claude Code · Cursor · Windsurf · OpenClaw             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol (stdio)
┌──────────────────────────▼──────────────────────────────────────┐
│                    MCP Layer                                    │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  memory-   │ │  tasks-    │ │  rag-    │ │  graph-      │  │
│  │  server    │ │  server    │ │  server  │ │  server      │  │
│  └────────────┘ └────────────┘ └──────────┘ └──────────────┘  │
│  + Community MCP servers (Obsidian, Gmail, Calendar, GitHub...) │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Core Intelligence Layer                        │
│                                                                 │
│  Routing & Quality                                              │
│  ├── orchestrator.ts     3-layer routing: rules→specialist→QG  │
│  ├── quality-loop.ts     LLM judge, retry until threshold       │
│  └── context-router.ts   Route info to right file              │
│                                                                 │
│  Memory & Learning                                              │
│  ├── tiered-context.ts   L0/L1/L2 loading (60-80% savings)     │
│  ├── session-summarizer  Compress history, shift handoffs       │
│  ├── knowledge-graph.ts  Nodes/edges, BFS path, Mermaid viz     │
│  └── precedent-learning  Track approvals, auto-promote          │
│                                                                 │
│  Autonomy & State                                               │
│  ├── autonomy.ts         Permission levels, audit log           │
│  ├── activity-state.ts   desk/mobile/away/sleeping detection    │
│  └── offline-mode.ts     Graceful degradation, network guard    │
│                                                                 │
│  Collaboration & Output                                         │
│  ├── collaboration.ts    Shared projects, learning groups, boundary│
│  ├── daily-digest.ts     Consolidated daily summary             │
│  └── repo-bot.ts         Index GitHub repos for RAG search      │
│                                                                 │
│  Instrumentation                                                │
│  ├── token-tracker.ts    Per-provider cost tracking             │
│  └── interview-engine.ts Onboarding + periodic check-ins        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Data Layer                                   │
│                                                                 │
│  Personal (gitignored — never shared)                          │
│  user/COMPASS.md  DOMAINS.md  ANTI-GOALS.md                    │
│  user/USER.md  GOALS.md  MEMORY.md  PREFERENCES.md             │
│  data/tasks.json  data/precedents.json  logs/                  │
│                                                                 │
│  Shared (git-tracked — safe to push)                           │
│  collab/projects/  collab/study-groups/                        │
│  patterns/  packs/  agents/                                    │
│                                                                 │
│  Indexed (local cache — not pushed)                            │
│  data/rag/  data/graph.json  data/activity-signals.json        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### Orchestrator (`core/src/orchestrator.ts`)

Three-layer routing for every request:

1. **Router** — Keyword scoring + hard-intent overrides classify requests into specialist categories: `research`, `study`, `email`, `writing`, `code`, `life-admin`, `general`
2. **Specialist** — Load YAML config from `agents/<category>.yaml` → adopt system prompt, tools, patterns
3. **Quality Gate** — Cheap model evaluates output on 4 dimensions (0–1 each). If below threshold, retry with feedback. Up to `maxRetries` iterations.

```typescript
const ctx = prepareOrchestration(userRequest, DIGITAL_SEED_ROOT);
// Layer 1: routing decision with confidence score
// Layer 2: specialist config (systemPrompt, tools, patterns)
// Layer 3: quality evaluation + retry loop
```

### Tiered Context (`core/src/tiered-context.ts`)

Avoids loading everything into context on every session:

| Level | Cost | What you get |
|-------|------|-------------|
| L0 | ~20 tokens/file | One-liner summary |
| L1 | ~200 tokens/file | Section headings + key facts |
| L2 | Full read | Complete file content |

Load L0 first → pick relevant files → L1 those → L2 only if truly needed. Saves 60–80% of context tokens vs always loading everything.

### Autonomy Engine (`core/src/autonomy.ts`)

Every autonomous action flows through:

1. `checkPermission(config, category)` — consults static config + precedent history + activity state (sleeping = auto-downgrade notify→auto)
2. Execute if permitted
3. `logAction(root, entry)` — append to `logs/autonomous.jsonl`
4. Notify user if level = `notify`

Permission levels: `off` (skip) · `notify` (run + tell user) · `auto` (run silently, include in digest)

### Collaboration Layer (`core/src/collaboration.ts`)

Strict separation between shared and personal content:

```
collab/   → git-tracked    → shared safely
user/     → gitignored     → never pushed
data/     → gitignored     → never pushed
```

Pre-commit hook scans 6 patterns: email addresses, international/US phone numbers, API keys (≥20 chars after `sk-`), absolute file paths (`/Users/...`), env var patterns (`KEY=`), password literals.

`buildStudyGroupPrompt()` injects shared context into LLM without touching personal files.

### Activity State (`core/src/activity-state.ts`)

Infers presence from message signals (rolling 100-entry window):

| State | Trigger | Agent behaviour |
|-------|---------|-----------------|
| `active-desk` | Recent + long messages | Full collaboration, ask questions |
| `active-mobile` | Recent + short/voice | Short replies, no tables |
| `away` | >45 min silence | Autonomous, batch for briefing |
| `sleeping` | Night hours + >60 min | Silent, critical only |

Wired into `autonomy.ts`: notify-level tasks auto-downgrade to silent when sleeping.

---

## Data Flow

### Typical request
```
User message
    → orchestrator classifies (research/study/code/etc.)
    → loads specialist YAML (agents/<category>.yaml)
    → builds prompt with patterns + tools
    → agent generates response
    → quality gate evaluates (0–1 score)
    → if below threshold: retry with feedback
    → deliver response
    → recordSignal() updates activity state
```

### Autonomous task (scheduled)
```
Scheduler triggers run-task.ts
    → detectActivityState() — is user sleeping?
    → isOfflineMode() — is internet available?
    → checkPermission() — is category allowed?
    → if permitted: queue prompt to pending-tasks.json
    → logAction() → logs/autonomous.jsonl
    → next agent session: processes pending tasks
    → daily digest consolidates everything
```

### Study group collaboration
```
Member adds analysis
    → addStudyGroupContribution() → members/<handle>.md
    → rebuildStudyGroupContext() → context.md auto-updated
    → git add collab/ → pre-commit hook scans for leaks
    → git push → teammates pull → their agents load context.md
    → buildStudyGroupPrompt() injects shared context into LLM
    → personal user/ files never touched
```

---

## MCP Servers

| Server | Port | Tools | Storage |
|--------|------|-------|---------|
| memory-server | stdio | read, append, search | user/MEMORY.md |
| tasks-server | stdio | add, list, complete, update | data/tasks.json |
| rag-server | stdio | rag_search, rag_index, rag_status | data/rag/ (local JSON mirror, optional LanceDB) |
| graph-server | stdio | graph_search, graph_add, graph_connect, graph_path | data/graph.json |

All servers use stdio transport (no ports) — Claude Code connects via `.claude/settings.json`.

---

## File Layout

```
digital-seed/
│
├── core/src/              ← Intelligence layer (TypeScript)
│   ├── orchestrator.ts    3-layer routing + quality gate
│   ├── autonomy.ts        Permission + audit + daily digest
│   ├── activity-state.ts  Presence detection
│   ├── collaboration.ts   Shared projects + boundary guard
│   ├── daily-digest.ts    Consolidated daily summary
│   ├── repo-bot.ts        GitHub repo indexing
│   ├── offline-mode.ts    Network graceful degradation
│   ├── knowledge-graph.ts File-backed graph DB
│   ├── precedent-learning Approval tracking + auto-promote
│   ├── quality-loop.ts    Generic evaluate-and-retry
│   ├── tiered-context.ts  L0/L1/L2 loading
│   ├── session-summarizer History compression
│   ├── token-tracker.ts   Cost tracking
│   ├── context-router.ts  Route info to right file
│   └── interview-engine.ts Onboarding + check-ins
│
├── mcp/                   ← MCP servers
│   ├── memory-server/
│   ├── tasks-server/
│   ├── rag-server/
│   └── graph-server/
│
├── agents/                ← Specialist YAML configs
│   ├── research.yaml
│   ├── study.yaml
│   ├── finance-study.yaml  (installed with pack:finance)
│   └── ...
│
├── patterns/              ← Prompt patterns (Fabric-style)
│   ├── project-analysis/
│   ├── dcf-analysis/       (installed with pack:finance)
│   └── ...
│
├── packs/                 ← Domain-specific bundles
│   ├── finance/           patterns + agent + templates
│   ├── strategy/
│   └── operations/
│
├── collab/                ← Git-tracked shared content
│   ├── projects/
│   └── study-groups/
│
├── scripts/               ← CLI tools
│   ├── seed.ts             Unified entry point
│   ├── marketplace.ts
│   ├── collab.ts
│   ├── digest.ts
│   ├── repo-bot.ts
│   ├── deck-gen.ts        PPTX slide deck generator
│   ├── excel-gen.ts       Excel workbook generator
│   ├── lib/ai-call.ts     Model-agnostic AI provider chain
│   └── ...
│
├── dashboard/             ← Archived experimental dashboard reference
├── user/                  ← Personal context (gitignored)
├── data/                  ← Runtime state (gitignored)
├── logs/                  ← Audit logs (gitignored)
├── config/                ← Config files (mostly gitignored)
└── .claude/
    ├── CLAUDE.md          ← Agent instructions
    └── settings.json      ← MCP server config
```
