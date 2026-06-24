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
  3: "Phases 1-2 are set up — use them for a few days before adding integrations (not a day-one step). When ready: seed recipe list",
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

export function readSignals(root: string): Signals {
  // A context file counts as "filled" only if it exists, is non-empty, AND
  // diverges from its pristine template — a freshly materialized template is
  // "present", not "filled in by the user", so the guide must not treat Phase 1
  // as done just because `seed onboard` scaffolded the files.
  const filled = (name: string) => {
    let content: string;
    try {
      content = readFileSync(join(root, "user", `${name}.md`), "utf-8");
    } catch {
      return false;
    }
    if (content.trim().length === 0) return false;
    try {
      const tpl = readFileSync(join(root, "docs/data-room/templates", `${name}.template.md`), "utf-8");
      if (content.trim() === tpl.trim()) return false; // pristine, not yet filled in
    } catch {
      /* no template on disk — any non-empty content counts as filled */
    }
    return true;
  };
  const contextFilled = ["USER", "COMPASS", "GOALS"].every(filled);

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

/**
 * Fill in any missing optional fields on a loaded journey so consumers never
 * dereference undefined on a hand-edited or partially-written file (e.g. a
 * valid schemaVersion-1 object that lacks `parkingLot`).
 */
/** Strip ASCII control chars (incl. terminal escapes) from a string field. */
function sanitizeText(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 500);
}

function normalizeJourney(j: Journey): Journey {
  if (typeof j.currentPhase !== "number" || !Number.isFinite(j.currentPhase)) j.currentPhase = 1;
  j.currentPhase = Math.min(4, Math.max(1, Math.floor(j.currentPhase)));
  // Validate every parking-lot entry: drop non-objects, coerce/sanitize fields,
  // so a poisoned journal.json (e.g. parkingLot:[null] or a control-char idea)
  // can't crash or terminal-inject `seed guide`/`seed park`.
  if (!Array.isArray(j.parkingLot)) {
    j.parkingLot = [];
  } else {
    j.parkingLot = j.parkingLot
      .filter((p): p is ParkedIdea => !!p && typeof p === "object")
      .map((p) => ({
        idea: sanitizeText((p as ParkedIdea).idea),
        phase: Number.isFinite((p as ParkedIdea).phase) ? Number((p as ParkedIdea).phase) : j.currentPhase,
        noted: sanitizeText((p as ParkedIdea).noted),
      }))
      .filter((p) => p.idea.length > 0);
  }
  if (!j.phases || typeof j.phases !== "object") j.phases = emptyPhases();
  // Repair any null / non-object / status-less phase entry, so a sticky
  // {"phases":{"1":null}} self-heals instead of crashing `seed guide`.
  for (const k of ["1", "2", "3", "4"]) {
    const p = (j.phases as Record<string, unknown>)[k] as PhaseState | undefined;
    if (!p || typeof p !== "object" || typeof p.status !== "string") {
      j.phases[k] = { status: k === "1" ? "not_started" : "locked", useful: false, completedSteps: [] };
    }
  }
  if (typeof j.focus !== "string") j.focus = focusForPhase(j.currentPhase, j.phases);
  return j;
}

export function loadJourney(root: string, now: string): Journey {
  const p = join(root, JOURNEY_PATH);
  if (existsSync(p)) {
    try {
      const cached = JSON.parse(readFileSync(p, "utf-8")) as Journey;
      if (cached && cached.schemaVersion === 1 && cached.phases) {
        return reconcile(normalizeJourney(cached), readSignals(root), root, now);
      }
    } catch {
      /* corrupt — fall through and re-bootstrap */
    }
  }
  const j = deriveJourney(readSignals(root), now);
  saveJourney(root, j);
  return j;
}

/**
 * Advance a cached journey when the user's real progress (signals) has moved
 * PAST the persisted state — so `seed guide` notices when you fill your context
 * or index notes. Never regresses: manual `seed complete`/`park` progress and
 * the parking lot are preserved; this only moves forward.
 */
function reconcile(cached: Journey, signals: Signals, root: string, now: string): Journey {
  const derived = deriveJourney(signals, now);
  let changed = false;
  for (const k of ["1", "2", "3", "4"]) {
    if (derived.phases[k]?.status === "done" && cached.phases[k]?.status !== "done") {
      cached.phases[k] = { ...cached.phases[k], status: "done", useful: true };
      changed = true;
    }
  }
  const target = Math.max(cached.currentPhase || 1, derived.currentPhase);
  if (target !== cached.currentPhase) {
    cached.currentPhase = target;
    changed = true;
  }
  const cur = cached.phases[String(cached.currentPhase)];
  if (cur && cur.status === "locked") {
    cur.status = "in_progress";
    changed = true;
  }
  const newFocus = focusForPhase(cached.currentPhase, cached.phases);
  if (cached.focus !== newFocus) {
    cached.focus = newFocus;
    changed = true;
  }
  if (changed) {
    cached.updatedAt = now;
    saveJourney(root, cached);
  }
  return cached;
}

/** Force a full re-derive from signals, preserving the parking lot (`seed guide --refresh`). */
export function refreshJourney(root: string, now: string): Journey {
  let parkingLot: ParkedIdea[] = [];
  try {
    const cached = JSON.parse(readFileSync(join(root, JOURNEY_PATH), "utf-8")) as Journey;
    if (Array.isArray(cached?.parkingLot)) parkingLot = cached.parkingLot;
  } catch {
    /* no prior file */
  }
  const j = deriveJourney(readSignals(root), now);
  j.parkingLot = parkingLot;
  saveJourney(root, j);
  return j;
}

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
  if (!idea.trim()) return j;
  const norm = (s: string) => s.trim().toLowerCase();
  if (!j.parkingLot.some((p) => norm(p.idea) === norm(idea))) {
    j.parkingLot.push({ idea: idea.trim(), phase, noted: now });
  }
  j.updatedAt = now;
  saveJourney(root, j);
  return j;
}

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

/** Update only the "- [ ]/[x] Phase N" lines of a MY-PLAN body from journey state. */
export function syncMyPlanText(planText: string, j: Journey): string {
  return planText
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*- \[)[ xX](\](.*\bphase\s*(\d+)\b.*))$/i);
      if (!m) return line;
      const phase = Number(m[4]);
      const done = j.phases[String(phase)]?.status === "done";
      return `${m[1]}${done ? "x" : " "}${m[2]}`;
    })
    .join("\n");
}
