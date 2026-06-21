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
