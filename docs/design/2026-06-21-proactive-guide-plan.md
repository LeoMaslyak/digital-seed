# Proactive Phased Guide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Digital Seed agent a proactive, steering, phased guide backed by one reliable journey state, instead of a reactive assistant.

**Architecture:** A single git-ignored `data/journey.json` is the source of truth, read/written only through a pure-logic helper `scripts/lib/journey.ts`. The CLI (`seed guide`, `seed what-next`) and the agent (`.claude/CLAUDE.md`) both read it; a `config/journey.yaml` maps each phase to existing docs for just-in-time guidance.

**Tech Stack:** Bun + TypeScript (ESM, no tsconfig), `bun test` (built-in), `js-yaml` (already a dependency).

**Spec:** `docs/design/2026-06-21-proactive-guide-design.md`

**Note on a spec refinement:** the spec listed `data/interview-state.json` as a bootstrap signal; the actual code signals (used by `printWhatNext`) are `user/USER.md|COMPASS.md|GOALS.md` fullness, the local RAG index (`data/rag/status.json` / `vectors.json`), and `MY-PLAN.md` `[x] Phase 3`. This plan uses those real signals.

**Base / merge-order note:** this branch is off `main`. The security remediation (PR #1) adds a `## Trust Boundary` section to `.claude/CLAUDE.md` and reworks `user/` handling; this feature only *adds* alongside it (new `## Proactive Guide` section, new `seed guide` branch, new files), so the two are additive. Task 8 anchors on `## Session Startup` (present on every base) rather than on the Trust Boundary, so the plan works whether or not PR #1 has merged yet. Recommended order: merge PR #1 first, then rebase this branch onto `main` (the Proactive Guide section then naturally sits just under the Trust Boundary). A confirmatory `bun test` + `release-check` after the rebase is the gate.

---

## File structure

| File | Responsibility |
|---|---|
| `scripts/lib/journey.ts` (create) | Types, phase model, signal reading, derive/load/save, completeStep, park, nextStep, guidance-map loader. Pure logic + thin IO. |
| `scripts/lib/journey.test.ts` (create) | `bun test` unit tests for the helper. |
| `config/journey.yaml` (create) | Editable phase→docs guidance map (overrides built-in defaults). |
| `scripts/seed.ts` (modify) | New `seed guide` command; `printWhatNext` reads journey; `seed guide --sync` updates MY-PLAN. |
| `scripts/seed.test.ts` (create) | Golden-output tests for `seed guide` / `what-next` over fixtures. |
| `.claude/CLAUDE.md` (modify) | New "Proactive Guide" section under the Trust Boundary. |
| `scripts/release-check.ts` (modify) | Add a "Journey state" + "Unit tests" substep. |
| `docs/phases.md`, `README.md` (modify) | Point users at `seed guide`. |

---

## Task 1: Types, phase model, and guidance map

**Files:**
- Create: `scripts/lib/journey.ts`
- Create: `config/journey.yaml`
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/journey.test.ts`:

```ts
import { test, expect } from "bun:test";
import { PHASES, emptyPhases } from "./journey.ts";

test("PHASES defines all four phases with steps", () => {
  expect(PHASES.map((p) => p.n)).toEqual([1, 2, 3, 4]);
  expect(PHASES[0].steps).toContain("context");
});

test("emptyPhases starts phase 1 not_started and 2-4 locked", () => {
  const p = emptyPhases();
  expect(p["1"].status).toBe("not_started");
  expect(p["2"].status).toBe("locked");
  expect(p["4"].status).toBe("locked");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `Cannot find module './journey.ts'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/lib/journey.ts`:

```ts
/**
 * Journey state — the single source of truth for the user's phase progress.
 * Pure logic + thin IO so the derive/transition functions are unit-testable.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { load as loadYaml } from "js-yaml";

export type PhaseStatus = "not_started" | "in_progress" | "done" | "locked";

export interface PhaseState {
  status: PhaseStatus;
  useful?: boolean;
  completedSteps?: string[];
}

export interface ParkedIdea {
  idea: string;
  phase: number;
  noted: string;
}

export interface Journey {
  schemaVersion: number;
  currentPhase: number;
  phases: Record<string, PhaseState>;
  focus: string;
  parkingLot: ParkedIdea[];
  updatedAt: string;
}

export const JOURNEY_PATH = "data/journey.json";

export const PHASES = [
  { n: 1, title: "Local context", steps: ["context", "first-prompt"] },
  { n: 2, title: "Local search", steps: ["index"] },
  { n: 3, title: "Integrations", steps: ["pick-recipe"] },
  { n: 4, title: "Always-on agent", steps: ["autonomy"] },
] as const;

const FOCUS: Record<number, string> = {
  1: "tell me about yourself so I can fill in USER.md, COMPASS.md and GOALS.md",
  2: "index one notes folder for local search (seed index <folder>)",
  3: "pick one integration recipe (seed recipe list)",
  4: "set up an always-on agent when you're ready (optional)",
};

export function emptyPhases(): Record<string, PhaseState> {
  return {
    "1": { status: "not_started", useful: false, completedSteps: [] },
    "2": { status: "locked", useful: false, completedSteps: [] },
    "3": { status: "locked", useful: false, completedSteps: [] },
    "4": { status: "locked", useful: false, completedSteps: [] },
  };
}

export function focusForPhase(phase: number, phases: Record<string, PhaseState>): string {
  if (phase >= 4 && phases["4"]?.status === "done") {
    return "you've built all four phases — keep using and refining it";
  }
  return FOCUS[phase] ?? FOCUS[1];
}
```

Create `config/journey.yaml`:

```yaml
# Phase → just-in-time guidance map. Each phase points the agent at the existing
# doc(s) to surface (in ≤3 lines) when the user reaches that step. Editing this
# file retunes guidance without touching code.
phases:
  1:
    title: Local context
    guidance:
      - docs/first-15-minutes.md
  2:
    title: Local search
    guidance:
      - docs/phases.md
      - docs/agent-chooser.md
  3:
    title: Integrations
    guidance:
      - docs/phases.md
  4:
    title: Always-on agent
    guidance:
      - docs/phases.md
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts config/journey.yaml
git commit -m "feat(journey): phase model, types, and guidance map"
```

---

## Task 2: Derive journey from signals (bootstrap)

**Files:**
- Modify: `scripts/lib/journey.ts`
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/lib/journey.test.ts`:

```ts
import { deriveJourney } from "./journey.ts";

const NOW = "2026-06-21T00:00:00.000Z";

test("fresh user → phase 1 in_progress", () => {
  const j = deriveJourney({ contextFilled: false, hasIndex: false, phase3Ticked: false }, NOW);
  expect(j.currentPhase).toBe(1);
  expect(j.phases["1"].status).toBe("in_progress");
  expect(j.phases["2"].status).toBe("locked");
});

test("context done → phase 2, phase 1 useful", () => {
  const j = deriveJourney({ contextFilled: true, hasIndex: false, phase3Ticked: false }, NOW);
  expect(j.currentPhase).toBe(2);
  expect(j.phases["1"].status).toBe("done");
  expect(j.phases["1"].useful).toBe(true);
  expect(j.phases["2"].status).toBe("in_progress");
});

test("context + index → phase 3", () => {
  const j = deriveJourney({ contextFilled: true, hasIndex: true, phase3Ticked: false }, NOW);
  expect(j.currentPhase).toBe(3);
  expect(j.phases["2"].status).toBe("done");
});

test("phase 3 ticked → phase 4", () => {
  const j = deriveJourney({ contextFilled: true, hasIndex: true, phase3Ticked: true }, NOW);
  expect(j.currentPhase).toBe(4);
  expect(j.phases["3"].status).toBe("done");
  expect(j.updatedAt).toBe(NOW);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `deriveJourney is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/lib/journey.ts`:

```ts
export interface Signals {
  contextFilled: boolean; // user/USER.md, COMPASS.md, GOALS.md all non-empty
  hasIndex: boolean;      // a local RAG index exists
  phase3Ticked: boolean;  // MY-PLAN.md has a checked "Phase 3" line
}

export function deriveJourney(signals: Signals, now: string): Journey {
  const phases = emptyPhases();
  let currentPhase = 1;

  if (signals.contextFilled) {
    phases["1"] = { status: "done", useful: true, completedSteps: ["context"] };
    phases["2"].status = "in_progress";
    currentPhase = 2;
  } else {
    phases["1"].status = "in_progress";
  }
  if (signals.contextFilled && signals.hasIndex) {
    phases["2"] = { status: "done", useful: true, completedSteps: ["index"] };
    phases["3"].status = "in_progress";
    currentPhase = 3;
  }
  if (signals.phase3Ticked) {
    phases["3"] = { status: "done", useful: true, completedSteps: ["pick-recipe"] };
    phases["4"].status = "in_progress";
    currentPhase = 4;
  }

  return {
    schemaVersion: 1,
    currentPhase,
    phases,
    focus: focusForPhase(currentPhase, phases),
    parkingLot: [],
    updatedAt: now,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts
git commit -m "feat(journey): derive journey state from existing signals"
```

---

## Task 3: Read signals + load/save (persistence with corrupt recovery)

**Files:**
- Modify: `scripts/lib/journey.ts`
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/lib/journey.test.ts`:

```ts
import { loadJourney, saveJourney } from "./journey.ts";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "journey-"));
}

test("loadJourney bootstraps + persists when absent", () => {
  const root = tmpRoot();
  const j = loadJourney(root, NOW);
  expect(j.currentPhase).toBe(1);
  expect(existsSync(join(root, "data/journey.json"))).toBe(true);
});

test("loadJourney reads an existing file verbatim", () => {
  const root = tmpRoot();
  const j = loadJourney(root, NOW);
  j.focus = "custom focus";
  saveJourney(root, j);
  const reloaded = loadJourney(root, "2099-01-01T00:00:00.000Z");
  expect(reloaded.focus).toBe("custom focus");
});

test("loadJourney recovers from a corrupt file by re-bootstrapping", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data/journey.json"), "{ not json", "utf-8");
  const j = loadJourney(root, NOW);
  expect(j.schemaVersion).toBe(1);
});

test("readSignals reflects filled context", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "user"), { recursive: true });
  for (const f of ["USER.md", "COMPASS.md", "GOALS.md"]) {
    writeFileSync(join(root, "user", f), "real content", "utf-8");
  }
  const { readSignals } = require("./journey.ts");
  expect(readSignals(root).contextFilled).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `loadJourney is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/lib/journey.ts`:

```ts
export function readSignals(root: string): Signals {
  const nonEmpty = (rel: string) => {
    try {
      return readFileSync(join(root, rel), "utf-8").trim().length > 0;
    } catch {
      return false;
    }
  };
  const contextFilled = ["user/USER.md", "user/COMPASS.md", "user/GOALS.md"].every(nonEmpty);

  let hasIndex = false;
  try {
    const s = JSON.parse(readFileSync(join(root, "data/rag/status.json"), "utf-8"));
    hasIndex = Number(s.totalDocuments ?? 0) > 0 || Number(s.totalChunks ?? 0) > 0;
  } catch {
    /* no status file */
  }
  if (!hasIndex) {
    try {
      const v = JSON.parse(readFileSync(join(root, "data/rag/vectors.json"), "utf-8"));
      hasIndex = Array.isArray(v.documents) && v.documents.length > 0;
    } catch {
      /* no vectors file */
    }
  }

  let phase3Ticked = false;
  try {
    const plan = readFileSync(join(root, "user/MY-PLAN.md"), "utf-8");
    phase3Ticked = plan
      .split(/\r?\n/)
      .some((l) => /^\s*- \[x\]/i.test(l) && /phase\s*3\b/i.test(l));
  } catch {
    /* no plan file */
  }

  return { contextFilled, hasIndex, phase3Ticked };
}

export function saveJourney(root: string, j: Journey): void {
  mkdirSync(join(root, "data"), { recursive: true });
  const p = join(root, JOURNEY_PATH);
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(j, null, 2) + "\n", "utf-8");
  renameSync(tmp, p);
}

export function loadJourney(root: string, now: string): Journey {
  const p = join(root, JOURNEY_PATH);
  if (existsSync(p)) {
    try {
      const j = JSON.parse(readFileSync(p, "utf-8")) as Journey;
      if (j && j.schemaVersion === 1 && j.phases) return j;
    } catch {
      /* corrupt — fall through and re-bootstrap */
    }
  }
  const j = deriveJourney(readSignals(root), now);
  saveJourney(root, j);
  return j;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts
git commit -m "feat(journey): read signals + load/save with corrupt-file recovery"
```

---

## Task 4: completeStep + park (state transitions)

**Files:**
- Modify: `scripts/lib/journey.ts`
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/lib/journey.test.ts`:

```ts
import { completeStep, park } from "./journey.ts";

test("completeStep advances phase only when all its steps are done", () => {
  const root = tmpRoot();
  loadJourney(root, NOW); // bootstrap fresh (phase 1)
  let j = completeStep(root, 1, "context", NOW);
  expect(j.phases["1"].status).toBe("in_progress"); // first-prompt still pending
  expect(j.phases["1"].useful).toBe(true);
  j = completeStep(root, 1, "first-prompt", NOW);
  expect(j.phases["1"].status).toBe("done");
  expect(j.currentPhase).toBe(2);
  expect(j.phases["2"].status).toBe("in_progress");
});

test("park appends, dedupes case-insensitively, and persists", () => {
  const root = tmpRoot();
  loadJourney(root, NOW);
  park(root, "Telegram bot", 3, NOW);
  const j = park(root, "telegram BOT", 3, NOW); // duplicate
  expect(j.parkingLot.length).toBe(1);
  expect(j.parkingLot[0].idea).toBe("Telegram bot");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `completeStep is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/lib/journey.ts`:

```ts
export function completeStep(root: string, phase: number, step: string, now: string): Journey {
  const j = loadJourney(root, now);
  const key = String(phase);
  const ps: PhaseState =
    j.phases[key] ?? (j.phases[key] = { status: "in_progress", useful: false, completedSteps: [] });
  ps.completedSteps = Array.from(new Set([...(ps.completedSteps ?? []), step]));

  const def = PHASES.find((x) => x.n === phase);
  const allDone = def ? def.steps.every((s) => ps.completedSteps!.includes(s)) : false;
  if (allDone) {
    ps.status = "done";
    ps.useful = true;
    const next = j.phases[String(phase + 1)];
    if (next && next.status === "locked") next.status = "in_progress";
    if (j.currentPhase === phase && phase < 4) j.currentPhase = phase + 1;
  } else {
    ps.status = "in_progress";
    ps.useful = ps.completedSteps!.length > 0;
  }

  j.focus = focusForPhase(j.currentPhase, j.phases);
  j.updatedAt = now;
  saveJourney(root, j);
  return j;
}

export function park(root: string, idea: string, phase: number, now: string): Journey {
  const j = loadJourney(root, now);
  const norm = (s: string) => s.trim().toLowerCase();
  if (!j.parkingLot.some((p) => norm(p.idea) === norm(idea))) {
    j.parkingLot.push({ idea: idea.trim(), phase, noted: now });
  }
  j.updatedAt = now;
  saveJourney(root, j);
  return j;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts
git commit -m "feat(journey): completeStep + park state transitions"
```

---

## Task 5: Guidance map loader + nextStep

**Files:**
- Modify: `scripts/lib/journey.ts`
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/lib/journey.test.ts`:

```ts
import { loadGuidanceMap, nextStep, deriveJourney as dj } from "./journey.ts";

test("loadGuidanceMap falls back to defaults when no yaml present", () => {
  const root = tmpRoot();
  const map = loadGuidanceMap(root);
  expect(map["2"]).toContain("docs/agent-chooser.md");
});

test("nextStep returns current phase focus + guidance docs", () => {
  const j = dj({ contextFilled: true, hasIndex: false, phase3Ticked: false }, NOW); // phase 2
  const ns = nextStep(j, loadGuidanceMap(tmpRoot()));
  expect(ns.phase).toBe(2);
  expect(ns.focus).toContain("index");
  expect(ns.guidanceDocs).toContain("docs/agent-chooser.md");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `loadGuidanceMap is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/lib/journey.ts`:

```ts
export function loadGuidanceMap(root: string): Record<string, string[]> {
  const defaults: Record<string, string[]> = {
    "1": ["docs/first-15-minutes.md"],
    "2": ["docs/phases.md", "docs/agent-chooser.md"],
    "3": ["docs/phases.md"],
    "4": ["docs/phases.md"],
  };
  try {
    const data = loadYaml(readFileSync(join(root, "config/journey.yaml"), "utf-8")) as
      | { phases?: Record<string, { guidance?: unknown }> }
      | undefined;
    const out: Record<string, string[]> = { ...defaults };
    for (const [k, v] of Object.entries(data?.phases ?? {})) {
      if (Array.isArray(v?.guidance)) out[String(k)] = v.guidance.map(String);
    }
    return out;
  } catch {
    return defaults;
  }
}

export function nextStep(
  j: Journey,
  guidance: Record<string, string[]>,
): { phase: number; focus: string; guidanceDocs: string[] } {
  return {
    phase: j.currentPhase,
    focus: j.focus,
    guidanceDocs: guidance[String(j.currentPhase)] ?? [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts
git commit -m "feat(journey): guidance map loader + nextStep"
```

---

## Task 6: `seed guide` command + `what-next` upgrade

**Files:**
- Modify: `scripts/seed.ts` (add `guide` branch near the other `cmd === "..."` branches ~line 1000; rewrite `printWhatNext`)
- Test: `scripts/seed.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `scripts/seed.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, symlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Run `seed` in an isolated copy of the repo so journey.json writes are sandboxed.
// node_modules is symlinked (not copied) so the spawned seed.ts can resolve
// js-yaml while ROOT still resolves to the sandbox copy.
function sandbox(): string {
  const root = mkdtempSync(join(tmpdir(), "seed-"));
  cpSync(process.cwd(), root, {
    recursive: true,
    filter: (src) => !src.includes("/.git/") && !src.includes("/node_modules/"),
  });
  const realNodeModules = join(process.cwd(), "node_modules");
  if (existsSync(realNodeModules)) symlinkSync(realNodeModules, join(root, "node_modules"), "dir");
  return root;
}

async function seed(root: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["bun", "run", join(root, "scripts/seed.ts"), ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  return (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
}

test("seed guide on a fresh workspace shows Phase 1 + a next step", async () => {
  const root = sandbox();
  const out = await seed(root, ["guide", "--plain"]);
  expect(out).toContain("Phase 1");
  expect(out.toLowerCase()).toContain("next");
});

test("seed what-next prints a one-line Next:", async () => {
  const root = sandbox();
  const out = await seed(root, ["what-next"]);
  expect(out).toContain("Next:");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/seed.test.ts`
Expected: FAIL — `seed guide` prints an "Unknown command" / does not contain "Phase 1".

- [ ] **Step 3: Write minimal implementation**

In `scripts/seed.ts`, add the import near the top (after the existing imports):

```ts
import { loadJourney, loadGuidanceMap, nextStep, PHASES } from "./lib/journey.ts";
```

Add a new command branch alongside the other `else if (cmd === ...)` branches (e.g. right after the `what-next` branch):

```ts
else if (cmd === "guide") {
  const plain = rest.includes("--plain");
  const dimIf = (t: string) => (plain || !USE_ANSI ? t : `${ANSI.dim}${t}${ANSI.reset}`);
  const boldIf = (t: string) => (plain || !USE_ANSI ? t : `${ANSI.bold}${ANSI.mint}${t}${ANSI.reset}`);
  const j = loadJourney(ROOT, new Date().toISOString());
  const ns = nextStep(j, loadGuidanceMap(ROOT));
  const def = PHASES.find((p) => p.n === j.currentPhase);

  console.log(boldIf(`You're in Phase ${j.currentPhase} of 4 — ${def?.title ?? ""}`));
  const done = Object.entries(j.phases)
    .filter(([, p]) => p.status === "done")
    .map(([n]) => `Phase ${n}`);
  if (done.length) console.log(dimIf(`  Done: ${done.join(", ")}`));
  console.log(`\n  → Next: ${ns.focus}`);
  if (ns.guidanceDocs.length) console.log(dimIf(`     Guide: ${ns.guidanceDocs.join(" · ")}`));
  if (j.parkingLot.length) {
    console.log(dimIf(`\n  Parked for later (${j.parkingLot.length}): ${j.parkingLot.map((p) => p.idea).join(", ")}`));
  }
}
```

Replace the body of `printWhatNext` with:

```ts
function printWhatNext(): void {
  const j = loadJourney(ROOT, new Date().toISOString());
  const ns = nextStep(j, loadGuidanceMap(ROOT));
  console.log(`Next: ${ns.focus}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/seed.test.ts`
Expected: PASS (2 tests).

Also run a smoke check:
Run: `cd /tmp/ds-feature && bun run scripts/seed.ts guide --plain`
Expected: prints `You're in Phase 1 of 4 — Local context` and a `→ Next:` line.

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/seed.ts scripts/seed.test.ts
git commit -m "feat(seed): add 'seed guide' and route what-next through journey state"
```

---

## Task 7: Sync MY-PLAN.md checkboxes from journey state

**Files:**
- Modify: `scripts/lib/journey.ts` (add `renderMyPlanLine` pure helper)
- Modify: `scripts/seed.ts` (`seed guide --sync` updates MY-PLAN.md in place)
- Test: `scripts/lib/journey.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/lib/journey.test.ts`:

```ts
import { syncMyPlanText } from "./journey.ts";

test("syncMyPlanText ticks phases that are done, leaves others", () => {
  const j = dj({ contextFilled: true, hasIndex: false, phase3Ticked: false }, NOW); // phase 1 done
  const before = [
    "- [ ] Phase 1 — Local context (required)",
    "- [ ] Phase 2 — Local search",
    "- [ ] Phase 3 — Integrations",
  ].join("\n");
  const after = syncMyPlanText(before, j);
  expect(after).toContain("- [x] Phase 1 — Local context (required)");
  expect(after).toContain("- [ ] Phase 2 — Local search");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: FAIL — `syncMyPlanText is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/lib/journey.ts`:

```ts
/** Update only the "- [ ]/[x] Phase N" lines of a MY-PLAN body from journey state. */
export function syncMyPlanText(planText: string, j: Journey): string {
  return planText
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*- \[)[ xX](\](.*\bphase\s*(\d)\b.*))$/i);
      if (!m) return line;
      const phase = Number(m[4]);
      const done = j.phases[String(phase)]?.status === "done";
      return `${m[1]}${done ? "x" : " "}${m[2]}`;
    })
    .join("\n");
}
```

In `scripts/seed.ts`, extend the `guide` branch: when `rest.includes("--sync")`, write MY-PLAN:

```ts
  if (rest.includes("--sync")) {
    const planPath = join(ROOT, "user", "MY-PLAN.md");
    if (existsSync(planPath)) {
      writeFileSync(planPath, syncMyPlanText(readFileSync(planPath, "utf-8"), j), "utf-8");
      console.log(dimIf("\n  (MY-PLAN.md updated to match your journey.)"));
    }
  }
```

Add `syncMyPlanText` to the existing journey import line so it reads:

```ts
import { loadJourney, loadGuidanceMap, nextStep, PHASES, syncMyPlanText } from "./lib/journey.ts";
```

(`readFileSync`, `writeFileSync`, `existsSync`, and `join` are already imported by `scripts/seed.ts` — they are used by `materializeUserContext`/`writeFirstWin` — so no `fs`/`path` import changes are needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/lib/journey.test.ts`
Expected: PASS (15 tests).

Smoke: `cd /tmp/ds-feature && bun run scripts/seed.ts guide --plain --sync` (no error; if `user/MY-PLAN.md` is absent it simply skips).

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/lib/journey.ts scripts/lib/journey.test.ts scripts/seed.ts
git commit -m "feat(journey): sync MY-PLAN.md checkboxes from journey state"
```

---

## Task 8: CLAUDE.md "Proactive Guide" section

**Files:**
- Modify: `.claude/CLAUDE.md` (insert a new section immediately AFTER the "Trust Boundary" section and BEFORE "Session Startup")
- Test: `scripts/seed.test.ts` (a grep-style assertion that the section + key rules exist)

- [ ] **Step 1: Write the failing test**

Append to `scripts/seed.test.ts`:

```ts
import { readFileSync as rf } from "fs";

test("CLAUDE.md defines the Proactive Guide contract", () => {
  const md = rf(join(process.cwd(), ".claude/CLAUDE.md"), "utf-8");
  expect(md).toContain("## Proactive Guide");
  expect(md).toContain("data/journey.json");
  expect(md.toLowerCase()).toContain("parking lot");
  expect(md.toLowerCase()).toContain("single next step");
  // The guide section sits above Session Startup.
  expect(md.indexOf("## Proactive Guide")).toBeLessThan(md.indexOf("## Session Startup"));
  // If the security PR's Trust Boundary is present, it must still come first.
  if (md.includes("Trust Boundary")) {
    expect(md.indexOf("Trust Boundary")).toBeLessThan(md.indexOf("## Proactive Guide"));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ds-feature && bun test scripts/seed.test.ts`
Expected: FAIL — `## Proactive Guide` not found.

- [ ] **Step 3: Write minimal implementation**

In `.claude/CLAUDE.md`, immediately BEFORE the `## Session Startup` section, insert the block below. (When the security PR's `## Trust Boundary` section is present above Session Startup, this lands just under it, preserving precedence; on a base without it, it simply lands above Session Startup.)

```markdown
## Proactive Guide

You are a **steering guide**, not a passive assistant. Digital Seed grows in four phases (1 Local context → 2 Local search → 3 Integrations → 4 Always-on agent); your job is to move the user along that path one step at a time without letting them get lost.

The journey state lives in `data/journey.json` (read it with the `seed guide` command or the `scripts/lib/journey.ts` helper; if it is missing it is bootstrapped from the user's existing files).

**At the start of every session**, read the journey state and open with a short orientation — no more than a few lines:

- which phase the user is in (X of 4) and what is already done,
- the **single next step** (`focus`),
- a one-line note of anything in the **parking lot** for later.

Then hand control back and ask what they want to do.

**Keep them on track (the parking lot):** if the user proposes something from a later phase before the current one is useful, do NOT refuse. Acknowledge it, add it to the parking lot, give one line on why finishing the current phase first pays off, and offer to continue. **If the user insists, do it** — they are always in charge. Never nag more than once.

**Just-in-time guidance:** only when the current step needs an open-source/ecosystem decision (which agent to install, what MCP is, local search vs a cloud vector DB), surface the relevant doc for the phase in 2–3 lines. Do not dump the whole ecosystem at once.

**Update the state** when a step is genuinely completed with the user, or when you park an idea. Writing `data/journey.json` is a local, low-risk action — it is NOT one of the high-risk actions that require fresh approval.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ds-feature && bun test scripts/seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add .claude/CLAUDE.md scripts/seed.test.ts
git commit -m "feat(agent): add Proactive Guide contract to CLAUDE.md"
```

---

## Task 9: Wire into release-check + point docs at `seed guide`

**Files:**
- Modify: `scripts/release-check.ts` (add a "Unit tests" and a "Journey state" substep)
- Modify: `docs/phases.md`, `README.md`
- Test: run `release-check`

- [ ] **Step 1: Add the substeps**

In `scripts/release-check.ts`, find the sequence of `runStep(...)` calls and add (near the other local-command checks):

```ts
runStep("Unit tests", "bun", ["test"]);
runStep("Journey state", "bun", ["run", "scripts/seed.ts", "guide", "--plain"]);
```

- [ ] **Step 2: Point docs at the command**

In `docs/phases.md`, add this line directly under the intro paragraph (before "## Phase 1"):

```markdown
> Not sure where you are? Run `bun run seed guide` — it tells you your current phase, your single next step, and anything parked for later.
```

In `README.md`, in the "Useful commands" area (search for "bun run seed help"), add:

```markdown
- `bun run seed guide` — where you are in the four phases + your single next step
```

- [ ] **Step 3: Run the full gate**

Run: `cd /tmp/ds-feature && bun run scripts/release-check.ts`
Expected: ends with `N passed · 0 failed · …` and `✅ Release check passed` (the new "Unit tests" and "Journey state" steps both pass).

- [ ] **Step 4: Run the whole unit suite once more**

Run: `cd /tmp/ds-feature && bun test`
Expected: all journey + seed tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /tmp/ds-feature
git add scripts/release-check.ts docs/phases.md README.md
git commit -m "feat: wire journey into release-check and point docs at 'seed guide'"
```

---

## Final verification (acceptance scenarios from the spec)

- [ ] **Fresh-clone proactive opener:** in a clean checkout, `bun install` then `bun run seed guide --plain` → shows Phase 1 + a single next step (no journey.json needed up front; it bootstraps).
- [ ] **Parking lot (manual/agent):** open the agent in the workspace, say "set up the telegram bot" while in Phase 1 → it parks the idea (visible in `seed guide`) and redirects, but proceeds if you insist.
- [ ] **Just-in-time guide:** at Phase 2, ask "which agent should I use?" → the agent surfaces `docs/agent-chooser.md` in ≤3 lines.
- [ ] **Consistency:** run `seed guide` twice → identical phase/next-step (state is read, not re-guessed).
- [ ] Open a PR for `feat/proactive-guide` (separate from the security PR #1).
