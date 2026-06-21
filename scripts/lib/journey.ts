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
