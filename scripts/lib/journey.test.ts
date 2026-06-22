import { test, expect } from "bun:test";
import { PHASES, emptyPhases } from "./journey.ts";
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

test("loadJourney preserves user data (parking lot) across reloads", () => {
  const root = tmpRoot();
  loadJourney(root, NOW);
  park(root, "telegram bot", 3, NOW);
  const reloaded = loadJourney(root, "2099-01-01T00:00:00.000Z");
  expect(reloaded.parkingLot.map((p) => p.idea)).toContain("telegram bot");
});

test("loadJourney auto-advances when signals show progress past the cached state (H1)", () => {
  const root = tmpRoot();
  // bootstrap at Phase 1 while the context is still empty
  let j = loadJourney(root, NOW);
  expect(j.currentPhase).toBe(1);
  // the user fills in their real context (no templates present here, so non-empty = filled)
  mkdirSync(join(root, "user"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) {
    writeFileSync(join(root, "user", `${n}.md`), `real ${n} content`, "utf-8");
  }
  // reloading the SAME cached journey must notice the progress and advance
  j = loadJourney(root, NOW);
  expect(j.currentPhase).toBe(2);
  expect(j.phases["1"].status).toBe("done");
});

test("loadJourney never regresses below the cached phase", () => {
  const root = tmpRoot();
  const j = loadJourney(root, NOW);
  j.currentPhase = 3;
  j.phases["1"].status = "done";
  j.phases["2"].status = "done";
  saveJourney(root, j);
  // no signals present, but the cache says Phase 3 — must stay at 3, not pull back
  expect(loadJourney(root, NOW).currentPhase).toBe(3);
});

test("normalizeJourney self-heals a null phase entry instead of crashing (M3)", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(
    join(root, "data/journey.json"),
    JSON.stringify({ schemaVersion: 1, currentPhase: 2, phases: { "1": null } }),
    "utf-8",
  );
  const j = loadJourney(root, NOW); // must not throw
  expect(typeof j.phases["1"].status).toBe("string");
  expect(j.phases["4"].status).toBeDefined();
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

test("park does not crash when an existing file lacks parkingLot", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(
    join(root, "data/journey.json"),
    JSON.stringify({ schemaVersion: 1, currentPhase: 1, phases: emptyPhases() }),
    "utf-8",
  );
  const j = park(root, "telegram bot", 3, NOW);
  expect(j.parkingLot.length).toBe(1);
  expect(j.parkingLot[0].idea).toBe("telegram bot");
});

test("park ignores whitespace-only ideas", () => {
  const root = tmpRoot();
  loadJourney(root, NOW);
  const j = park(root, "   ", 3, NOW);
  expect(j.parkingLot.length).toBe(0);
});

test("readSignals: a pristine materialized template does NOT count as filled", () => {
  const root = tmpRoot();
  mkdirSync(join(root, "user"), { recursive: true });
  mkdirSync(join(root, "docs/data-room/templates"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) {
    writeFileSync(join(root, "docs/data-room/templates", `${n}.template.md`), `TEMPLATE ${n}`, "utf-8");
    writeFileSync(join(root, "user", `${n}.md`), `TEMPLATE ${n}`, "utf-8"); // pristine copy
  }
  const { readSignals } = require("./journey.ts");
  expect(readSignals(root).contextFilled).toBe(false);
  // user edits only USER.md away from the template — still not all three filled
  writeFileSync(join(root, "user/USER.md"), "I am a real person with real goals", "utf-8");
  expect(readSignals(root).contextFilled).toBe(false);
  // user edits the remaining two
  for (const n of ["COMPASS", "GOALS"]) writeFileSync(join(root, "user", `${n}.md`), `edited ${n}`, "utf-8");
  expect(readSignals(root).contextFilled).toBe(true);
});
