import { test, expect } from "bun:test";
import { scanForSecrets } from "./secret-scan.ts";
import type { ContextBundle } from "./context-bundle.ts";

const bundle = (name: string, text: string): ContextBundle => ({
  files: [{ name, path: name, text, bytes: text.length, present: true }],
  totalBytes: text.length, missing: [],
});

// Fixtures are split (prefix + rest) so the repo's own `seed privacy-scan` — a
// source scanner — doesn't flag these deliberately key-shaped test values as real
// leaks. The runtime string is still a full secret shape scanForSecrets must catch.
test.each([
  ["sk-ant-" + "api03AAAABBBBCCCCDDDDEEEE", "anthropic-key"],
  ["AKIA" + "IOSFODNN7EXAMPLE", "aws-key"],
  ["AIza" + "SyD-EXAMPLE_KEY_1234567890abcdEF", "google-key"],
  ["ghp_" + "0123456789abcdefghijklmnopqrstuvwx", "github-token"],
  ["-----BEGIN OPENSSH " + "PRIVATE KEY-----", "private-key"],
])("detects %s", (secret) => {
  const hits = scanForSecrets(bundle("MEMORY.md", `notes\nkey = ${secret}\n`));
  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0].file).toBe("MEMORY.md");
  expect(hits[0].line).toBe(2);
});

test("clean content yields no hits", () => {
  expect(scanForSecrets(bundle("USER.md", "My name is Leo.\nI live in Spain.\n"))).toEqual([]);
});

test("marker line like 'password: hunter2longenough' is flagged", () => {
  const hits = scanForSecrets(bundle("PREFERENCES.md", "email: leo@example.com\npassword: hunter2longenough\n"));
  expect(hits.some((h) => h.line === 2)).toBe(true);
});

// Broadened detection (hostile-audit MEDIUM #1). Fixtures split so seed privacy-scan
// doesn't flag them, while the runtime value is a full shape scanForSecrets must catch.
test.each([
  ["sk_live_" + "4eC39HqLyjWDarjtT1zdp7dc", "stripe-live-key"],
  ["gho_" + "16C7e42F292c6912E7710c838347Ae178B4a", "github-oauth-token"],
  ["postgres://" + "dbadmin:Pa55w0rdX7@db.internal:5432/app", "url-credential"],
])("detects broadened credential shape %s", (secret) => {
  const hits = scanForSecrets(bundle("MEMORY.md", `notes\nkey = ${secret}\n`));
  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0].line).toBe(2);
});

test("detects a 32-hex token via the lowered, entropy-gated threshold", () => {
  const hex = "a1b2c3d4e5f60718" + "293a4b5c6d7e8f90"; // 32 random-ish hex chars
  const hits = scanForSecrets(bundle("MEMORY.md", `notes\ntoken ${hex}\n`));
  expect(hits.some((h) => h.line === 2)).toBe(true);
});

test("api_key marker with an inline value is flagged", () => {
  const hits = scanForSecrets(bundle("PREFERENCES.md", "notes\napi_key = " + "s8f14e45fceea167a5a36dedd4bea2543" + "\n"));
  expect(hits.some((h) => h.line === 2)).toBe(true);
});

test("entropy gate: a long LOW-entropy run is NOT flagged (avoids reflexive --send-anyway)", () => {
  const boring = "a".repeat(48); // long but zero-entropy → not a secret
  expect(scanForSecrets(bundle("USER.md", `my note ${boring} end\n`))).toEqual([]);
});
