import { test, expect } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadChatConsent, saveChatConsent, revokeChatConsent, resolveConsent } from "./chat-consent.ts";

const root = () => mkdtempSync(join(tmpdir(), "consent-"));

test("save/load/revoke round-trip", () => {
  const r = root();
  expect(loadChatConsent(r)).toBeNull();
  const c = saveChatConsent(r, "Anthropic (claude CLI)", "2026-07-01T00:00:00Z");
  expect(c).toEqual({ version: 1, enabled: true, at: "2026-07-01T00:00:00Z", provider: "Anthropic (claude CLI)" });
  expect(loadChatConsent(r)?.provider).toBe("Anthropic (claude CLI)");
  expect(revokeChatConsent(r)).toBe(true);
  expect(loadChatConsent(r)).toBeNull();
  expect(revokeChatConsent(r)).toBe(false); // idempotent
});

test("corrupt or wrong-shape file loads as null (fail-closed)", () => {
  const r = root();
  const { mkdirSync, writeFileSync } = require("fs");
  mkdirSync(join(r, "data"), { recursive: true });
  writeFileSync(join(r, "data", "chat-consent.json"), "{ not json");
  expect(loadChatConsent(r)).toBeNull();
  writeFileSync(join(r, "data", "chat-consent.json"), JSON.stringify({ version: 2, enabled: true, at: "t", provider: "x" }));
  expect(loadChatConsent(r)).toBeNull(); // wrong version
  writeFileSync(join(r, "data", "chat-consent.json"), JSON.stringify({ enabled: true }));
  expect(loadChatConsent(r)).toBeNull(); // missing fields
});

test("resolveConsent: env/--yes never mint first-run; non-TTY without persisted refuses", () => {
  const r1 = resolveConsent({ persisted: null, resolvedProvider: "X", yesFlag: true, isTTY: false });
  expect(r1.allowed).toBe(false);
  expect(r1.needsFirstRun).toBe(true);
  const r2 = resolveConsent({ persisted: null, resolvedProvider: "X", yesFlag: false, isTTY: true });
  expect(r2.allowed).toBe(false);
  expect(r2.needsFirstRun).toBe(true); // first-run disclosure required even in a TTY
});

test("resolveConsent: provider change forces re-disclosure", () => {
  const persisted = { version: 1 as const, enabled: true as const, at: "t", provider: "Anthropic (claude CLI)" };
  const r = resolveConsent({ persisted, resolvedProvider: "OpenAI (HTTP)", yesFlag: false, isTTY: true });
  expect(r.providerChanged).toBe(true);
  expect(r.needsFirstRun).toBe(true);
  expect(r.allowed).toBe(false);
});

test("resolveConsent: persisted + matching provider is allowed (even non-TTY, for scripted --run)", () => {
  const persisted = { version: 1 as const, enabled: true as const, at: "t", provider: "Anthropic (claude CLI)" };
  const r = resolveConsent({ persisted, resolvedProvider: "Anthropic (claude CLI)", yesFlag: true, isTTY: false });
  expect(r.allowed).toBe(true);
  expect(r.source).toBe("file");
});
