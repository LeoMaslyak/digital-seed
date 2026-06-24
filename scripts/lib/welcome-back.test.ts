import { test, expect } from "bun:test";
import {
  computeWelcome,
  renderWelcome,
  baselineOf,
  loadWelcomeState,
  saveWelcomeState,
  welcomeBackForGuide,
} from "./welcome-back.ts";
import { deriveJourney, loadJourney } from "./journey.ts";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const NOW = "2026-06-24T00:00:00.000Z";
const sig = (o: Record<string, boolean> = {}) => ({
  contextFilled: false,
  hasIndex: false,
  phase3Ticked: false,
  ...o,
});
const tmpRoot = () => mkdtempSync(join(tmpdir(), "welcome-"));

// ── computeWelcome (pure diff) ──────────────────────────────────────────────
test("computeWelcome: no baseline = first run, no news", () => {
  const j = deriveJourney(sig(), NOW);
  const w = computeWelcome(null, j, sig(), null, NOW);
  expect(w.isFirstRun).toBe(true);
  expect(w.hasNews).toBe(false);
});

test("computeWelcome: context filled since baseline surfaces a change", () => {
  const baseline = baselineOf(deriveJourney(sig(), NOW), sig(), NOW); // phase 1, nothing
  const jNow = deriveJourney(sig({ contextFilled: true }), NOW); // phase 2
  const w = computeWelcome(baseline, jNow, sig({ contextFilled: true }), NOW, NOW);
  expect(w.hasNews).toBe(true);
  expect(w.changes.join(" ")).toMatch(/context/i);
});

test("computeWelcome: indexing notes since baseline surfaces a change", () => {
  const baseline = baselineOf(deriveJourney(sig({ contextFilled: true }), NOW), sig({ contextFilled: true }), NOW);
  const s = sig({ contextFilled: true, hasIndex: true });
  const w = computeWelcome(baseline, deriveJourney(s, NOW), s, NOW, NOW);
  expect(w.changes.join(" ")).toMatch(/index/i);
});

test("computeWelcome: a newly parked idea since baseline surfaces a change", () => {
  const j0 = deriveJourney(sig(), NOW);
  const baseline = baselineOf(j0, sig(), NOW); // parkedCount 0
  const jNow = { ...j0, parkingLot: [{ idea: "connect email", phase: 3, noted: NOW }] };
  const w = computeWelcome(baseline, jNow, sig(), NOW, NOW);
  expect(w.changes.join(" ")).toMatch(/park/i);
});

test("computeWelcome: nothing changed = no news", () => {
  const j = deriveJourney(sig(), NOW);
  const baseline = baselineOf(j, sig(), NOW);
  const w = computeWelcome(baseline, j, sig(), NOW, NOW);
  expect(w.hasNews).toBe(false);
});

test("computeWelcome: daysSince counts whole days from lastSeenAt", () => {
  const baseline = baselineOf(deriveJourney(sig(), NOW), sig(), NOW);
  const w = computeWelcome(
    baseline,
    deriveJourney(sig(), NOW),
    sig(),
    "2026-06-21T00:00:00.000Z",
    "2026-06-24T00:00:00.000Z",
  );
  expect(w.daysSince).toBe(3);
});

// ── renderWelcome (pure render) ─────────────────────────────────────────────
test("renderWelcome: empty string when there is no news", () => {
  expect(renderWelcome({ isFirstRun: false, changes: [], hasNews: false, daysSince: 2 })).toBe("");
});

test("renderWelcome: shows 'since you were last here' + the change + the gap", () => {
  const out = renderWelcome({ isFirstRun: false, changes: ["you indexed your notes"], hasNews: true, daysSince: 2 });
  expect(out).toContain("Since you were last here");
  expect(out).toContain("2 days ago");
  expect(out).toContain("you indexed your notes");
});

test("renderWelcome: scrubs control chars (C0/C1/DEL) from change lines", () => {
  const ESC = String.fromCharCode(0x1b);
  const CSI = String.fromCharCode(0x9b);
  const out = renderWelcome({
    isFirstRun: false,
    changes: ["evil" + ESC + "[2J" + CSI + "x"],
    hasNews: true,
    daysSince: 1,
  });
  const bad = [...out].some((c) => {
    const n = c.charCodeAt(0);
    return (n <= 0x1f && n !== 0x0a) || n === 0x7f || (n >= 0x80 && n <= 0x9f);
  });
  expect(bad).toBe(false);
});

// ── welcomeBackForGuide (state machine) ─────────────────────────────────────
test("welcomeBackForGuide: first run is silent and records a baseline", () => {
  const root = tmpRoot();
  const j = loadJourney(root, NOW);
  expect(welcomeBackForGuide(root, j, NOW)).toBe("");
  expect(loadWelcomeState(root)).not.toBeNull();
});

test("welcomeBackForGuide: surfaces a change only after a day, then stops repeating it", () => {
  const root = tmpRoot();
  // day 0 — baseline
  let j = loadJourney(root, "2026-06-20T00:00:00.000Z");
  welcomeBackForGuide(root, j, "2026-06-20T00:00:00.000Z");
  // user fills their context (phase advances) — a real change now exists
  mkdirSync(join(root, "user"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) writeFileSync(join(root, "user", `${n}.md`), `real ${n}`, "utf-8");
  // same day → must NOT surface (and must not consume the change)
  j = loadJourney(root, "2026-06-20T06:00:00.000Z");
  expect(welcomeBackForGuide(root, j, "2026-06-20T06:00:00.000Z")).toBe("");
  // next day → surfaces the change
  j = loadJourney(root, "2026-06-22T00:00:00.000Z");
  const shown = welcomeBackForGuide(root, j, "2026-06-22T00:00:00.000Z");
  expect(shown).toContain("Since you were last here");
  expect(shown).toMatch(/context/i);
  // following day, nothing new → silent again
  j = loadJourney(root, "2026-06-23T00:00:00.000Z");
  expect(welcomeBackForGuide(root, j, "2026-06-23T00:00:00.000Z")).toBe("");
});

test("loadWelcomeState returns null on a corrupt file (no crash)", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data/digest-state.json"), "{ not json", "utf-8");
  expect(loadWelcomeState(root)).toBeNull();
});

// ── B1 hostile-audit fixes: calendar-day boundary + corrupt-signals validation ──
test("computeWelcome: daysSince crosses a calendar boundary even when <24h elapsed", () => {
  const baseline = baselineOf(deriveJourney(sig(), NOW), sig(), NOW);
  // 6pm one day → 9am the next = 15h elapsed, but a new calendar day = "returning"
  const w = computeWelcome(
    baseline,
    deriveJourney(sig(), NOW),
    sig(),
    "2026-06-24T18:00:00.000Z",
    "2026-06-25T09:00:00.000Z",
  );
  expect(w.daysSince).toBe(1);
});

test("welcomeBackForGuide: a daily (sub-24h) user still sees the change on the next calendar day", () => {
  const root = tmpRoot();
  saveWelcomeState(root, {
    version: 1,
    lastSeenAt: "2026-06-24T18:00:00.000Z",
    baseline: { phase: 1, signals: sig(), parkedCount: 0, at: "2026-06-24T18:00:00.000Z" },
  });
  mkdirSync(join(root, "user"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) writeFileSync(join(root, "user", `${n}.md`), `real ${n}`, "utf-8");
  const j = loadJourney(root, "2026-06-25T09:00:00.000Z");
  const out = welcomeBackForGuide(root, j, "2026-06-25T09:00:00.000Z"); // 15h later, new day
  expect(out).toContain("Since you were last here");
  expect(out).toMatch(/context/i);
});

test("loadWelcomeState rejects a state whose baseline.signals is corrupt (re-baselines)", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(
    join(root, "data/digest-state.json"),
    JSON.stringify({
      version: 1,
      lastSeenAt: "2026-06-24T00:00:00.000Z",
      baseline: { phase: 1, signals: null, parkedCount: 0, at: "x" },
    }),
    "utf-8",
  );
  expect(loadWelcomeState(root)).toBeNull();
});
