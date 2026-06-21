# Design — Proactive, phased guide for Digital Seed

**Status:** Draft for review · **Date:** 2026-06-21 · **Branch:** `feat/proactive-guide`

## 1. Problem

A tester found the Digital Seed agent **reactive** — it only helps when asked directly, which "defeats the purpose a bit." Digital Seed is meant to *guide* a non-technical person through the open-source world of building their own personal AI infrastructure, in **phases**, keeping them on track without getting lost in the jungle. Today the agent does none of that proactively:

- `.claude/CLAUDE.md` (the agent's operating contract) is reactive + safety-focused. Its "Session Startup" loads context and routes work, but **never tells the agent to assess where the user is and propose the next step.**
- The Phase 1→4 model exists (`docs/phases.md`, `MY-PLAN.md`, `setup.sh`) but is **not a spine the agent drives**.
- "Where am I / what's next" is re-derived each session from scattered, fragile signals (`data/interview-state.json`, `user/*.md` fullness, `MY-PLAN.md` checkboxes, RAG status), so it can't be stated reliably.

## 2. Goal

Turn the agent into a **proactive *steering* guide** that drives the existing Phase 1→4 journey — anchored on one reliable journey state, surfacing just-in-time ecosystem guidance from existing docs, and using a "parking lot" to keep the user on track **without hard-blocking them**.

## 3. Decisions (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Assertiveness | **Steering guide** | Proactively opens with where-you-are + the single next step and gently redirects drift, but always defers if the user insists. (Not gentle/opt-in; not directive/pushy.) |
| Guide depth | **Just-in-time, curated** | Surface only the guidance relevant to the current step, pulled from existing docs (`docs/phases.md`, `docs/agent-chooser.md`, …). No new long-form curriculum. |
| Architecture | **Journey state + behavior** | One canonical `data/journey.json` as source of truth, so proactivity is accurate and consistent — not re-guessed from 4 fragile heuristics each session. |

## 4. Success criteria (behavioral, testable)

1. A fresh tester who just opens their agent gets — *unprompted* — where they are (Phase X of 4), what's done, the **single** next step, and a one-line note on what's deferred.
2. When the user drifts ("let me wire up the Telegram bot" during Phase 1), the agent **parks** the idea and redirects to the current phase — but proceeds if the user insists.
3. "Where am I / what's next" is **consistent session-to-session** (read from state, not re-derived).
4. When a step needs an ecosystem decision (which agent, what's MCP, local search vs cloud vector DB), the agent surfaces the relevant existing doc in ≤3 lines.

## 5. Architecture

Five small, independently-testable units.

### 5.1 Journey state — `data/journey.json`
Single source of truth. `data/` is already git-ignored (matches `interview-state.json`), so personal journey data never leaves the machine.

```jsonc
{
  "schemaVersion": 1,
  "currentPhase": 2,                       // 1..4
  "phases": {
    "1": { "status": "done",        "useful": true,  "completedSteps": ["context","first-prompt"] },
    "2": { "status": "in_progress", "useful": false, "completedSteps": [] },
    "3": { "status": "locked" },
    "4": { "status": "locked" }
  },
  "focus": "index one notes folder",       // the current single next action
  "parkingLot": [                          // off-track ideas captured, not chased
    { "idea": "telegram bot", "phase": 3, "noted": "2026-06-21" }
  ],
  "updatedAt": "2026-06-21T00:00:00Z"
}
```

- `status` ∈ `not_started | in_progress | done | locked`. `locked` = guidance only (never enforced).
- `useful` is set true when the phase has delivered its first real value (Phase 1: the user produced a first artifact / ran `first-prompt`; Phase 2: ≥1 doc indexed; Phase 3: ≥1 recipe live). It is the signal behind the soft "don't add the next phase until this one is paying off" nudge — it gates the *suggestion* to advance, not the ability to.
- **Soft gating:** later phases are `locked` to *inform*, never to block. The guide explains why a phase is premature and proceeds the moment the user insists.

### 5.2 `scripts/lib/journey.ts` — the state helper
The only module that reads/writes `journey.json`, used by both the CLI and (via documented shape) the agent. API:

- `loadJourney(root): Journey` — reads `journey.json`; if absent, **bootstraps** by deriving an initial state from existing signals (`interview-state.json`, `user/*.md` fullness, RAG status, `MY-PLAN.md` checkboxes), writes it, returns it. After bootstrap, the file is authoritative.
- `saveJourney(root, j)` — atomic write (temp + rename), stamps `updatedAt`.
- `completeStep(root, phase, step)` — marks a step done, recomputes `currentPhase`/`focus`, advances phase when its steps are complete.
- `park(root, idea, phase)` — append to `parkingLot` (dedup by normalized idea text).
- `nextStep(root): { phase, focus, guidanceDocs }` — the computed "one next action" + the doc pointers for it (from the phase→guidance map).

Pure functions over an injected `root`; no global state. Timestamps are injected by the caller (no `Date.now()` inside pure logic) to keep it testable.

### 5.3 `.claude/CLAUDE.md` — "Proactive Guide" section
A new section placed **below the Trust Boundary** (so the highest-precedence safety rules are unchanged). It instructs the agent to:

- **Session-start ritual:** read `data/journey.json` (bootstrap if missing) and open with a compact orientation — *"You're in Phase X — done: … · next: <single step> · parked: N for later."* One short orientation, then hand control back.
- **One-step focus:** propose the *single* next action, never a menu.
- **Soft gate / anti-rabbit-hole:** if the user reaches for a later-phase thing → acknowledge → `park` it → one line on why finishing the current phase first pays off → offer to continue. If they say "do it anyway," do it.
- **Just-in-time guidance:** only when a step needs an ecosystem decision, surface the relevant doc(s) from the phase→guidance map in ≤3 lines.
- **State updates:** when a step completes with the user or an idea is parked, update `journey.json` via the helper. (Local file write — **not** one of the high-risk actions requiring approval; explicitly noted so it doesn't trip the safety rules.)
- **Defer-on-insist:** never nag more than once; the user is always in charge.

### 5.4 CLI surface — `scripts/seed.ts`
- **`seed guide`** (new) — renders the journey: where you are · what's done · the single next step · parked items · the just-in-time doc pointer for the current step. Human-friendly; this is also what the agent mirrors. (`seed status` is left untouched — it reports activity/offline state.)
- **`seed what-next`** (upgraded) — now reads `journey.json` via the helper; keeps its terse one-line "Next:" form (back-compatible).
- **`MY-PLAN.md`** stays as the friendly human checklist, **synced from `journey.json`** (the journey file is canonical; `MY-PLAN.md` is a rendered view).

### 5.5 Phase→guidance map — `config/journey.yaml`
A small curated index: each phase/step → the existing doc(s) to surface + a one-line "why now."

```yaml
phases:
  1:
    title: Local context
    steps: [context, first-prompt]
    guidance: [docs/first-15-minutes.md]
  2:
    title: Local search
    steps: [index]
    guidance: [docs/phases.md#phase-2, docs/agent-chooser.md]
  3:
    title: Integrations
    steps: [pick-recipe]
    guidance: [docs/phases.md#phase-3]
  4:
    title: Always-on agent
    steps: [autonomy]
    guidance: [docs/phases.md#phase-4]
```

Reuses existing docs — no new curriculum content. Adding/retuning guidance = editing this file.

## 6. Data flow

```
seed onboard / index / recipe ─┐
agent completes a step ────────┼─▶ journey.ts (load→modify→save) ─▶ data/journey.json
agent parks a drifting idea ───┘                                          │
                                                                          ▼
agent session start  ─reads─▶ journey.ts.loadJourney ─▶ orientation + next step + parked
seed guide / what-next ─reads─▶ journey.ts ─▶ rendered view  ; MY-PLAN.md ⟵ synced
```

## 7. Error handling / edge cases

- **Missing/corrupt `journey.json`:** treat as absent → re-bootstrap from signals (never crash; never block the user).
- **Existing users (no journey file):** bootstrap derives a sensible phase from what they already have, so the guide works on day one of the upgrade.
- **Concurrent writes (CLI + agent):** atomic temp-rename writes; last-writer-wins is acceptable (state is small and idempotent-ish); `completeStep`/`park` are read-modify-write through the single helper.
- **User skips ahead anyway:** allowed — record the later-phase activity, advance state to match reality rather than fighting it.
- **No personal data leakage:** `journey.json` lives in git-ignored `data/`; `parkingLot` ideas are user-stated, consistent with the Context Routing rules.

## 8. Testing & quality gates

- **Unit (`bun`):** `journey.ts` — bootstrap derivation (signals → correct phase), `completeStep`/phase-advance, `park` dedup, atomic save, corrupt-file recovery.
- **CLI golden tests:** `seed guide` / `what-next` rendered output for **fresh / mid-Phase-2 / Phase-3** fixtures (snapshot the text).
- **`release-check` integration:** add a "journey" substep so it stays in the existing green gate (target **10→11 passed · 0 failed**).
- **Acceptance scenarios (human-runnable, documented):**
  1. Fresh clone → `seed onboard` → open agent → **unprompted** Phase-1 orientation + single next step. ✅ = proactive opener.
  2. Mid-Phase-1, user says "set up the telegram bot" → agent parks + redirects + defers on insist. ✅ = parking lot.
  3. Phase-2 "which agent?" → `docs/agent-chooser.md` surfaced in ≤3 lines. ✅ = just-in-time guide.
- **KPI:** the original tester re-runs and reports the agent "told me what to do next without me asking" — the qualitative bar that triggered this work.

## 9. Scope

**In:** `data/journey.json` + `scripts/lib/journey.ts`, the `CLAUDE.md` Proactive Guide section, `seed guide` + `what-next` upgrade, `config/journey.yaml`, `MY-PLAN.md` sync, tests, doc updates.

**Out (YAGNI):** a code-driven hard-gate stepper (rejected as over-engineered/rigid); any new long-form curriculum (reuse existing docs); changes to the autonomy engine.

## 10. Rollout

- Separate feature branch `feat/proactive-guide` off `main` and its own PR — **independent of the security remediation (PR #1).**
- Land behind the existing test/release-check gate.
- Privacy: no new egress; `journey.json` is local + git-ignored, consistent with the gitignore/templates model shipped in the security work.
