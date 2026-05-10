# Hostile Audit — Digital Seed

Date: 2026-05-10

## Audit stance

Assume the user is smart but busy, mildly intimidated by terminals, and allergic to vague AI hype. Assume critics will ask:

- Why does this need to exist?
- Why not just use Claude Code, OpenClaw, Hermes, Obsidian, or ChatGPT directly?
- Is this safe?
- Is this actually easy?
- Is it still polluted by its original private/workshop context?
- Does it create more work than it removes?

## Executive verdict

Digital Seed has the right philosophical direction now: guide, seed, glue layer, free-first. But the repo still contains product debt from its origin as a more specific starter kit. The biggest risks are not technical impossibility; they are **confusion, overpromising, leftover naming, and too many half-finished surfaces**.

The strongest version is not a platform. It is a guided map that helps people install a local workspace, understand the ecosystem, and connect the tools they already want to use.

## Critical issues

### 1. The repo still has old naming and conceptual residue

Observed examples:

- docs and scripts still mention `DAI` in several places
- dashboard still says `DAI Cockpit`
- MCP package names still use `@dai/*` and `dai-memory`, `dai-tasks`, etc.
- some docs still refer to study groups, cases, or old examples
- some commands still use `--case` for generic project/deck generation

Why this matters:

People will not trust the repo if it looks half-renamed. It creates a smell of copied material and makes the new positioning feel cosmetic.

Recommendation:

Do a dedicated naming cleanup sprint:

- `DAI` → `Digital Seed` or `Seed`
- `dai-*` MCP names → `seed-*`
- `study group` → `shared project` or `learning group`
- `case` as generic flag → `topic`, `project`, or `subject`
- dashboard folder/component names → `seed/` or `cockpit/`

### 2. The setup wizard is functional but not yet beginner-safe

Current wizard asks reasonable questions, but still assumes comfort with providers, integrations, databases, and terminal tools.

Risk:

A beginner does not know whether they want email, calendar, database, Ollama, Claude subscription, API keys, or MCP. Asking too much too early creates abandonment.

Recommendation:

Add setup profiles:

- Simple local workspace
- Notes/documents search
- Project builder
- Always-on later

Make everything else optional after first success.

### 3. The repo says “agent-neutral,” but some docs still recommend Claude Code

This conflicts with the clarified philosophy. The right stance is not “Claude Code is recommended”; it is “Claude Code is one excellent terminal agent; choose based on workflow.”

Recommendation:

Remove prescriptive recommendation language from FAQ and older docs. Link to `agent-chooser.md` instead.

### 4. The first-run success path is still too implicit

The repo says to run setup and then start an agent, but it should be impossible to miss the next step.

Recommendation:

At the end of setup, print exactly:

```text
Next: open a terminal AI agent in this folder and paste:
Read my Digital Seed context files. Interview me for missing context and help me make this useful this week.
```

Also add:

```bash
bun run seed doctor
bun run seed first-prompt
```

Even if `seed doctor` is basic at first.

### 5. Too many advanced surfaces are visible too early

The repo includes dashboards, MCP servers, collab, marketplace, deck/excel generators, autonomy, scheduler, etc.

Risk:

This looks like a half-built app instead of a clear guide. Beginners may think they need to understand everything.

Recommendation:

Restructure docs around levels:

- Start here
- Context files
- Agent chooser
- Knowledge/notes
- Integrations
- Always-on advanced
- Developer internals

Move advanced docs under `docs/advanced/` or mark them clearly.

### 6. Privacy story is good but not operational enough

The idea is local-first, but users need guardrails, not just warnings.

Recommendation:

Add:

- `bun run seed privacy-scan`
- clearer public/private file map
- red/yellow/green sharing model
- setup warning before indexing Google Drive or Obsidian folders

### 7. Retrieval UX is not beginner-friendly yet

The current retrieval layer is technically useful, but users should not need to understand LanceDB, embeddings, or RAG.

Recommendation:

Expose simple commands:

```bash
bun run seed index ~/Documents/Notes
bun run seed search "what do I know about X?"
```

Internally, use keyword/JSON/local vector as available.

### 8. Dashboard may hurt credibility in current state

Dashboard still has old labels and example content. A visual surface with stale examples is more damaging than hidden stale code.

Recommendation:

Either:

- clean it immediately into a generic Digital Seed dashboard, or
- hide it from beginner docs until polished.

### 9. Public data room needs the same philosophy

The Drive data room should not be a dump of docs. It should be a guided workshop in a box.

Recommendation:

Structure as:

1. What is personal AI infrastructure?
2. Install with an AI agent
3. Choose your agent/interface
4. Fill context files
5. Connect notes/docs
6. Add chat/mobile access
7. Upgrade to always-on
8. Privacy checklist

### 10. There is no crisp “why this exists” test yet

The repo must answer this immediately:

> “Why do I need Digital Seed if I already have Claude Code or OpenClaw?”

Best answer:

> “You do not need another platform. Digital Seed gives your tools a shared personal context and a map for connecting them safely.”

This sentence should appear prominently.

## Security / safety risks

### External integrations

Email, calendar, Drive, and messaging integrations must default to explanation/draft mode. Never imply automatic sending is normal.

### Prompt injection

If Digital Seed teaches people to index Google Drive, web pages, or documents, it should explain prompt injection simply:

> “Documents can contain instructions for your AI. Your assistant should treat documents as information, not commands.”

### Public sharing

Users will accidentally commit private context unless the repo makes boundaries obvious.

Pre-commit hooks help, but are not enough. Add `privacy-scan` and clearer docs.

## Product clarity score

Current: 6.5 / 10

Why not higher:

- good philosophy
- good starting docs
- still inconsistent naming
- too many legacy surfaces
- no productized doctor/recipe commands yet
- setup wizard not yet fully beginner-safe

Target for public confidence: 8.5 / 10

Needed:

- naming cleanup
- setup profiles
- AI-agent install flow
- privacy scan
- seed doctor
- retrieval commands
- dashboard cleanup/hide
- docs hierarchy cleanup

## Recommended next sprint

### P0

- Remove remaining recommendation language for one agent
- Add AI-agent install guide
- Add setup wizard guide
- Add hostile audit to repo
- Update setup final output with first-session prompt
- Update FAQ contradiction

### P1

- `seed doctor`
- `seed first-prompt`
- `seed privacy-scan`
- docs hierarchy cleanup
- dashboard label cleanup

### P2

- `seed index`
- `seed search`
- local embeddings smoother path
- OpenClaw/Hermes recipe skeletons

## Bottom line

Digital Seed is promising because it is not trying to own the whole stack. But to earn trust, it must become radically clear:

- Start free.
- Use your preferred agent.
- Keep private context local.
- Let the agent install and explain it.
- Add integrations only when you understand why.
- Grow from seed to infrastructure at your own pace.


## Response

The cleanup response is tracked in [`audit-response-2026-05-10.md`](audit-response-2026-05-10.md).
