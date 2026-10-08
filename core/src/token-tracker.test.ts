import { test, expect } from "bun:test";
import { estimateCost } from "./token-tracker.ts";

const perMTok = (model: string) => ({
  input: estimateCost(model, 1_000_000, 0),
  output: estimateCost(model, 0, 1_000_000),
});

test("claude-haiku-5-5 is priced at $0.10 in / $0.50 out per MTok (prompt <=100K card)", () => {
  const p = perMTok("claude-haiku-5-5");
  expect(p.input).toBeCloseTo(0.1, 10);
  expect(p.output).toBeCloseTo(0.5, 10);
  expect(estimateCost("claude-haiku-5-5", 1_000_000, 1_000_000)).toBeCloseTo(0.6, 10);
});

test("claude-haiku-4-5 keeps its own row ($0.80 / $4), dated and undated ids alike", () => {
  for (const id of ["claude-haiku-4-5", "claude-haiku-4-5-20251001"]) {
    const p = perMTok(id);
    expect(p.input).toBeCloseTo(0.8, 10);
    expect(p.output).toBeCloseTo(4.0, 10);
  }
});

test("no Haiku id resolves to the other generation's row", () => {
  expect(perMTok("claude-haiku-5-5").output).not.toBeCloseTo(4.0, 10);
  expect(perMTok("claude-haiku-4-5-20251001").output).not.toBeCloseTo(0.5, 10);
  expect(perMTok("anthropic/CLAUDE-HAIKU-5-5").output).toBeCloseTo(0.5, 10); // case-insensitive, prefixed
});

test("a more specific id is not shadowed by a shorter key listed earlier (gpt-4o-mini vs gpt-4o)", () => {
  expect(perMTok("gpt-4o-mini").output).toBeCloseTo(0.6, 10);
  expect(perMTok("gpt-4o").output).toBeCloseTo(10.0, 10);
});

test("an unknown model costs 0", () => {
  expect(estimateCost("no-such-model", 1_000_000, 1_000_000)).toBe(0);
});
