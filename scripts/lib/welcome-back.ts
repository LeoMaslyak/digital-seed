/**
 * "Welcome back" digest — the zero-config retention layer (roadmap B1).
 *
 * The advanced daily digest (core/src/daily-digest.ts) reports autonomous
 * actions, token usage and tasks — all empty for a day-one newcomer. This module
 * adds the journey-aware layer: "since you were last here, X changed — your next
 * step is still Y", computed purely from journey state + signals so it is useful
 * with nothing set up. Pure functions + thin IO, mirroring journey.ts.
 *
 * No network, no subprocess. The only side effect is reading/writing the local,
 * gitignored data/digest-state.json baseline.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { type Journey, type Signals, PHASES, readSignals } from "./journey.ts";

export const DIGEST_STATE_PATH = "data/digest-state.json";

/** A point-in-time snapshot we diff against to detect what changed. */
export interface Baseline {
  phase: number;
  signals: Signals;
  parkedCount: number;
  at: string;
}

export interface WelcomeState {
  version: number;
  lastSeenAt: string; // updated every guide run
  baseline: Baseline; // advanced only when a welcome is actually shown (or first run)
}

export interface Welcome {
  isFirstRun: boolean;
  changes: string[];
  hasNews: boolean;
  daysSince: number;
}

/** Strip C0/C1 control chars + DEL so rendered lines can never carry a terminal escape. */
function scrub(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, " ").slice(0, 300);
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  // Calendar-day difference (UTC), NOT elapsed 24h: a user who returns the next
  // day should see their news even if fewer than 24h passed (e.g. 6pm → 9am).
  // Gating on elapsed 24h hid the welcome forever from anyone whose daily cadence
  // was under 24h apart — exactly the returning user this feature is for.
  return Math.max(0, Math.floor(tb / 86_400_000) - Math.floor(ta / 86_400_000));
}

export function baselineOf(journey: Journey, signals: Signals, now: string): Baseline {
  return {
    phase: journey.currentPhase,
    signals: {
      contextFilled: !!signals.contextFilled,
      hasIndex: !!signals.hasIndex,
      phase3Ticked: !!signals.phase3Ticked,
    },
    parkedCount: Array.isArray(journey.parkingLot) ? journey.parkingLot.length : 0,
    at: now,
  };
}

/**
 * Diff the current journey/signals against a baseline into human, encouraging
 * lines. Uses signal transitions (the auto-detected milestones) and parked-idea
 * count; falls back to a generic phase-advance line for manual `seed complete`.
 */
export function computeWelcome(
  baseline: Baseline | null,
  journey: Journey,
  signals: Signals,
  lastSeenAt: string | null,
  now: string,
): Welcome {
  if (!baseline) {
    return { isFirstRun: true, changes: [], hasNews: false, daysSince: 0 };
  }

  const changes: string[] = [];
  const was = baseline.signals ?? ({} as Signals);
  if (signals.contextFilled && !was.contextFilled) changes.push("you filled in your context — Phase 1 done ✓");
  if (signals.hasIndex && !was.hasIndex) changes.push("you indexed your notes for local search — Phase 2 done ✓");
  if (signals.phase3Ticked && !was.phase3Ticked) changes.push("you connected your first integration — Phase 3 done ✓");

  const parkedNow = Array.isArray(journey.parkingLot) ? journey.parkingLot.length : 0;
  if (parkedNow > (baseline.parkedCount ?? 0)) {
    const n = parkedNow - (baseline.parkedCount ?? 0);
    changes.push(`you parked ${n} idea${n === 1 ? "" : "s"} for later`);
  }

  // Manual progress (seed complete) that no signal explains.
  if (changes.length === 0 && journey.currentPhase > (baseline.phase ?? 1)) {
    const def = PHASES.find((p) => p.n === journey.currentPhase);
    changes.push(`you advanced to Phase ${journey.currentPhase}${def ? ` — ${def.title}` : ""}`);
  }

  return {
    isFirstRun: false,
    changes,
    hasNews: changes.length > 0,
    daysSince: lastSeenAt ? daysBetween(lastSeenAt, now) : 0,
  };
}

/** The "Since you were last here (…): …" block, or "" when there is no news. */
export function renderWelcome(w: Welcome): string {
  if (!w.hasNews) return "";
  const when = w.daysSince <= 0 ? "earlier today" : w.daysSince === 1 ? "yesterday" : `${w.daysSince} days ago`;
  const lines = [`Since you were last here (${when}):`];
  for (const c of w.changes) lines.push(`  • ${scrub(c)}`);
  return lines.join("\n");
}

export function loadWelcomeState(root: string): WelcomeState | null {
  const p = join(root, DIGEST_STATE_PATH);
  if (!existsSync(p)) return null;
  try {
    const s = JSON.parse(readFileSync(p, "utf-8")) as WelcomeState;
    const b = s?.baseline as Baseline | undefined;
    // Validate the baseline shape too — a corrupt baseline.signals (null/array/
    // string) must re-baseline rather than be read as all-false, which would emit
    // a misleading "you filled in your context" line on the next run.
    if (
      s &&
      s.version === 1 &&
      typeof s.lastSeenAt === "string" &&
      b &&
      typeof b === "object" &&
      b.signals &&
      typeof b.signals === "object" &&
      !Array.isArray(b.signals)
    ) {
      return s;
    }
  } catch {
    /* corrupt — treat as no baseline */
  }
  return null;
}

export function saveWelcomeState(root: string, s: WelcomeState): void {
  mkdirSync(join(root, "data"), { recursive: true });
  const p = join(root, DIGEST_STATE_PATH);
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(s, null, 2) + "\n", "utf-8");
  renameSync(tmp, p);
}

/**
 * For `seed guide`: compute the welcome block, advance the stored baseline only
 * when a welcome is actually shown, and always record lastSeenAt. Returns the
 * text to print above the coach view, or "" (first run, no news, or same day).
 */
export function welcomeBackForGuide(root: string, journey: Journey, now: string): string {
  const signals = readSignals(root);
  const prev = loadWelcomeState(root);
  const current = baselineOf(journey, signals, now);

  if (!prev) {
    saveWelcomeState(root, { version: 1, lastSeenAt: now, baseline: current });
    return "";
  }

  const w = computeWelcome(prev.baseline, journey, signals, prev.lastSeenAt, now);
  const show = w.hasNews && w.daysSince >= 1;
  saveWelcomeState(root, {
    version: 1,
    lastSeenAt: now,
    baseline: show ? current : prev.baseline, // consume changes only when shown
  });
  return show ? renderWelcome(w) : "";
}

/**
 * Read-only journey section for `seed digest` (does NOT advance the guide's
 * baseline — the digest is an explicit, idempotent pull). Returns markdown lines.
 */
export function journeyDigestSection(root: string, journey: Journey, now: string): string[] {
  const signals = readSignals(root);
  const prev = loadWelcomeState(root);
  const def = PHASES.find((p) => p.n === journey.currentPhase);
  const lines = [
    "## Your seed",
    "",
    `You're in Phase ${journey.currentPhase} of 4 — ${def?.title ?? ""}.`,
    `Next step: ${scrub(journey.focus)}`,
  ];
  const w = computeWelcome(prev?.baseline ?? null, journey, signals, prev?.lastSeenAt ?? null, now);
  if (w.hasNews) {
    lines.push("", "Since you were last here:");
    for (const c of w.changes) lines.push(`- ${scrub(c)}`);
  }
  return lines;
}

/** Write the journey digest to logs/digests/<date>-welcome.md (for `seed digest --save`). */
export function saveWelcomeDigest(root: string, journey: Journey, now: string): string {
  const date = now.slice(0, 10);
  const dir = join(root, "logs", "digests");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${date}-welcome.md`);
  const body = [`# Digital Seed — ${date}`, "", ...journeyDigestSection(root, journey, now), ""].join("\n");
  writeFileSync(path, body, "utf-8");
  return path;
}
