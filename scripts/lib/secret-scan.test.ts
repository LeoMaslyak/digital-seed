import { test, expect } from "bun:test";
import { scanForSecrets } from "./secret-scan.ts";
import type { ContextBundle } from "./context-bundle.ts";

const bundle = (name: string, text: string): ContextBundle => ({
  files: [{ name, path: name, text, bytes: text.length, present: true }],
  totalBytes: text.length, missing: [],
});

test.each([
  ["sk-ant-api03-AAAABBBBCCCCDDDDEEEE", "anthropic-key"],
  ["AKIAIOSFODNN7EXAMPLE", "aws-key"],
  ["AIzaSyD-EXAMPLE_KEY_1234567890abcdEF", "google-key"],
  ["ghp_0123456789abcdefghijklmnopqrstuvwx", "github-token"],
  ["-----BEGIN OPENSSH PRIVATE KEY-----", "private-key"],
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
  const hits = scanForSecrets(bundle("PREFERENCES.md", "email: leo@x.com\npassword: hunter2longenough\n"));
  expect(hits.some((h) => h.line === 2)).toBe(true);
});
