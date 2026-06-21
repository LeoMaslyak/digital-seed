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
