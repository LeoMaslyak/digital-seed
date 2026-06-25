import { test, expect } from "bun:test";
import { loadExamples, filterByCategory, formatExample, CATEGORIES } from "./examples.ts";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function tmpWith(yaml: string): string {
  const root = mkdtempSync(join(tmpdir(), "examples-"));
  mkdirSync(join(root, "examples"), { recursive: true });
  writeFileSync(join(root, "examples/examples.yaml"), yaml, "utf-8");
  return root;
}

const hasCtrl = (s: string) =>
  [...s].some((c) => {
    const n = c.charCodeAt(0);
    return (n <= 0x1f && n !== 0x0a) || n === 0x7f || (n >= 0x80 && n <= 0x9f);
  });

test("loadExamples: a valid file yields tasks and no problems", () => {
  const root = tmpWith(`tasks:
  - id: weekly-plan
    title: Draft my week
    category: planning
    needs: context
    prompt: Read my goals and draft a week.
    good_for: turning goals into a plan
`);
  const { tasks, problems } = loadExamples(root);
  expect(problems).toEqual([]);
  expect(tasks.length).toBe(1);
  expect(tasks[0].id).toBe("weekly-plan");
  expect(tasks[0].category).toBe("planning");
  expect(tasks[0].needs).toBe("context");
});

test("loadExamples: missing id, unknown category, and duplicate id are all flagged", () => {
  const root = tmpWith(`tasks:
  - title: no id here
    category: planning
    prompt: x
  - id: a
    category: bogus-category
    prompt: x
  - id: dup
    category: writing
    prompt: first
  - id: dup
    category: writing
    prompt: second
`);
  const { tasks, problems } = loadExamples(root);
  expect(problems.length).toBeGreaterThanOrEqual(3);
  expect(tasks.filter((t) => t.id === "dup").length).toBe(1); // deduped
});

test("loadExamples: needs defaults to 'none' when omitted", () => {
  const root = tmpWith(`tasks:
  - id: x
    category: writing
    prompt: do a thing
`);
  expect(loadExamples(root).tasks[0].needs).toBe("none");
});

test("loadExamples: malformed yaml → problems, no throw", () => {
  const root = tmpWith(":\n  - [unbalanced");
  const { tasks, problems } = loadExamples(root);
  expect(tasks).toEqual([]);
  expect(problems.length).toBeGreaterThan(0);
});

test("loadExamples: missing file → a clear problem, no throw", () => {
  const root = mkdtempSync(join(tmpdir(), "examples-empty-"));
  const { tasks, problems } = loadExamples(root);
  expect(tasks).toEqual([]);
  expect(problems.length).toBeGreaterThan(0);
});

test("loadExamples: sanitizes control chars that arrive via yaml \\xNN escapes", () => {
  // Raw control bytes are rejected by yaml itself; the real vector is \xNN escapes
  // (which js-yaml decodes to real control chars). Build them without any source escapes.
  const bs = String.fromCharCode(92); // a backslash
  const esc = bs + "x1b"; // → ESC after yaml decode
  const c1 = bs + "x9b"; //  → C1 CSI after yaml decode
  const root = tmpWith(`tasks:
  - id: x
    title: "T${esc}clr"
    category: writing
    prompt: "P${c1}2J"
    good_for: "G${esc}z"
`);
  const { tasks, problems } = loadExamples(root);
  expect(problems).toEqual([]);
  expect(hasCtrl(tasks[0].title)).toBe(false);
  expect(hasCtrl(tasks[0].prompt)).toBe(false);
  expect(hasCtrl(tasks[0].good_for)).toBe(false);
});

test("filterByCategory: returns only the matching category", () => {
  const root = tmpWith(`tasks:
  - id: a
    category: planning
    prompt: x
  - id: b
    category: writing
    prompt: y
`);
  const { tasks } = loadExamples(root);
  const planning = filterByCategory(tasks, "planning");
  expect(planning.length).toBe(1);
  expect(planning[0].id).toBe("a");
});

test("formatExample: includes the title and the paste-ready prompt", () => {
  const root = tmpWith(`tasks:
  - id: a
    title: My Task
    category: writing
    prompt: Paste me into your agent.
    good_for: a thing
`);
  const out = formatExample(loadExamples(root).tasks[0]);
  expect(out).toContain("My Task");
  expect(out).toContain("Paste me into your agent.");
});

test("CATEGORIES is a non-empty set of known buckets", () => {
  expect(CATEGORIES.length).toBeGreaterThan(0);
  expect(CATEGORIES).toContain("planning");
});

// The real shipped gallery must load cleanly (mirrors the catalog's self-check).
test("the real examples/examples.yaml loads with 0 problems and >= 8 tasks", () => {
  const { tasks, problems } = loadExamples(process.cwd());
  expect(problems).toEqual([]);
  expect(tasks.length).toBeGreaterThanOrEqual(8);
});

// ── B5 hostile-audit fixes: scrub id, validate schema shape + prompt type ──────
test("loadExamples: problem messages never carry control chars from a poisoned id/category", () => {
  const bs = String.fromCharCode(92);
  const esc = bs + "x1b"; // yaml decodes \x1b → ESC
  const root = tmpWith(`tasks:
  - id: "ev${esc}il"
    category: "bog${esc}us"
    prompt: p
`);
  const { problems } = loadExamples(root);
  expect(problems.length).toBeGreaterThan(0);
  expect(hasCtrl(problems.join(" | "))).toBe(false);
});

test("loadExamples: a poisoned id cannot leak control chars into a displayed title", () => {
  const bs = String.fromCharCode(92);
  const esc = bs + "x1b";
  const root = tmpWith(`tasks:
  - id: "ev${esc}il"
    title: ""
    category: writing
    prompt: do a thing
`);
  const { tasks } = loadExamples(root);
  expect(tasks.length).toBe(1);
  expect(hasCtrl(tasks[0].title)).toBe(false);
  expect(tasks[0].title.length).toBeGreaterThan(0); // falls back to a CLEAN id, not empty
});

test("loadExamples: a non-list `tasks` is flagged, not silently treated as empty", () => {
  for (const body of ["tasks: not-a-list", "tasks:\n  a: 1", "just a string", "- 1\n- 2", "42"]) {
    const root = tmpWith(body);
    const { tasks, problems } = loadExamples(root);
    expect(tasks).toEqual([]);
    expect(problems.length).toBeGreaterThan(0);
  }
});

test("loadExamples: a prompt that isn't text is rejected (never rendered as [object Object])", () => {
  const root = tmpWith(`tasks:
  - id: x
    category: writing
    prompt:
      a: b
`);
  const { tasks, problems } = loadExamples(root);
  expect(tasks.length).toBe(0);
  expect(problems.some((p) => /prompt/i.test(p))).toBe(true);
});
