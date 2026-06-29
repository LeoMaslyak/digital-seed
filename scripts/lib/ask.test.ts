import { test, expect } from "bun:test";
import { routeSpecialist, buildAskPrompt, SPECIALISTS } from "./ask.ts";

const hasCtrl = (s: string) =>
  [...s].some((c) => {
    const n = c.charCodeAt(0);
    return (n <= 0x1f && n !== 0x0a) || n === 0x7f || (n >= 0x80 && n <= 0x9f);
  });

test("routeSpecialist: routes representative questions to the right mode", () => {
  expect(routeSpecialist("draft my week from my goals").mode).toBe("planning");
  expect(routeSpecialist("write a cold email to a client").mode).toBe("writing");
  expect(routeSpecialist("debug this typescript function").mode).toBe("code");
  expect(routeSpecialist("build a budget for next quarter").mode).toBe("finance");
  expect(routeSpecialist("help me decide between two job offers").mode).toBe("decisions");
  expect(routeSpecialist("explain how transformers work").mode).toBe("learning");
});

test("routeSpecialist: unknown topic falls back to general with a framing", () => {
  const r = routeSpecialist("asdfqwerty zzz");
  expect(r.mode).toBe("general");
  expect(r.framing.length).toBeGreaterThan(0);
});

test("routeSpecialist: every specialist mode has a non-empty framing", () => {
  for (const mode of Object.keys(SPECIALISTS)) {
    expect(SPECIALISTS[mode].framing.length).toBeGreaterThan(10);
  }
});

test("routeSpecialist: empty/whitespace question → general (no crash)", () => {
  expect(routeSpecialist("").mode).toBe("general");
  expect(routeSpecialist("   ").mode).toBe("general");
});

test("buildAskPrompt: includes the question, the framing, and the read-your-context instruction", () => {
  const q = "draft my week from my goals";
  const out = buildAskPrompt(q, routeSpecialist(q));
  expect(out).toContain(q);
  expect(out.toLowerCase()).toContain("user/goals.md"); // points at context files
  expect(out.toLowerCase()).toMatch(/plan|priorit/); // planning framing
  expect(out.toLowerCase()).toMatch(/confirm|before/); // standing guardrail
});

test("buildAskPrompt: does NOT dump file contents — references files by path only", () => {
  const out = buildAskPrompt("anything", routeSpecialist("anything"));
  // it should ask the agent to READ the files, not embed their bodies
  expect(out.toLowerCase()).toMatch(/read .*user\//);
});

test("buildAskPrompt: scrubs control chars from the embedded question", () => {
  const ESC = String.fromCharCode(0x1b);
  const q = "draft my week" + ESC + "[2J" + String.fromCharCode(0x07);
  const out = buildAskPrompt(q, routeSpecialist(q));
  expect(hasCtrl(out)).toBe(false);
});

test("buildAskPrompt: a huge question does not crash and is bounded", () => {
  const q = "plan ".repeat(10000);
  const out = buildAskPrompt(q, routeSpecialist(q));
  expect(typeof out).toBe("string");
  expect(out.length).toBeLessThan(5000); // question is length-capped
});

// ── B3 audit fixes: unified empty-check + framing scrubbed ──────────────────
import { normalizeQuestion } from "./ask.ts";

test("normalizeQuestion: a control-char-only question is treated as empty", () => {
  expect(normalizeQuestion(String.fromCharCode(1) + String.fromCharCode(2))).toBe("");
  expect(normalizeQuestion("   ")).toBe("");
  expect(normalizeQuestion("  plan my week  ")).toBe("plan my week");
});

test("buildAskPrompt: a poisoned framing cannot inject control chars either", () => {
  const ESC = String.fromCharCode(0x1b);
  const out = buildAskPrompt("plan", { mode: "x", framing: "do" + ESC + "[2J" + " a thing" });
  expect([...out].some((c) => c.charCodeAt(0) === 0x1b)).toBe(false);
});
