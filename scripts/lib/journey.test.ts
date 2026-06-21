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
