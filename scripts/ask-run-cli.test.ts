import { test, expect } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runAsk } from "./ask-run-cli.ts";
import { loadChatConsent, saveChatConsent } from "./lib/chat-consent.ts";

const prov = { label: "Anthropic (claude CLI)", vendor: "Anthropic" as const, transport: "claude CLI" as const, host: "(local CLI)" };
function mk(over: any = {}) {
  const calls: string[] = []; const outC: string[] = []; const errC: string[] = [];
  const d: any = { call: async (p: string) => { calls.push(p); return { text: "ANSWER", served: prov }; },
    resolveProvider: () => prov, now: () => "t", nonce: () => "N", isTTY: true, readLine: async () => "yes",
    stdout: (s: string) => outC.push(s), stderr: (s: string) => errC.push(s), ...over };
  return { calls, out: () => outC.join(""), err: () => errC.join(""), d };
}
const root = () => mkdtempSync(join(tmpdir(), "run-"));

test("--dry-run prints the prompt, sends nothing, writes no consent", async () => {
  const r = root(); const t = mk();
  const code = await runAsk("plan my week", { root: r, dryRun: true }, t.d);
  expect(code).toBe(0); expect(t.calls.length).toBe(0); expect(loadChatConsent(r)).toBeNull();
  expect(t.out()).toContain("plan my week");
});
test("consent-less + non-TTY refuses (2), never calls, writes no consent", async () => {
  const r = root(); const t = mk({ isTTY: false });
  const code = await runAsk("plan", { root: r, run: true }, t.d);
  expect(code).toBe(2); expect(t.calls.length).toBe(0); expect(loadChatConsent(r)).toBeNull();
});
test("--yes with no prior consent still refuses (yes never mints first-run)", async () => {
  const r = root(); const t = mk({ isTTY: false });
  const code = await runAsk("plan", { root: r, run: true, yes: true }, t.d);
  expect(code).toBe(2); expect(t.calls.length).toBe(0); expect(loadChatConsent(r)).toBeNull();
});
test("first-run typed-yes persists consent and calls the model once", async () => {
  const r = root(); const t = mk();
  const code = await runAsk("plan", { root: r, run: true }, t.d);
  expect(code).toBe(0); expect(t.calls.length).toBe(1);
  expect(loadChatConsent(r)?.provider).toBe(prov.label);
});
test("typed non-yes cancels (2), no call, no consent", async () => {
  const r = root(); const t = mk({ readLine: async () => "no" });
  const code = await runAsk("plan", { root: r, run: true }, t.d);
  expect(code).toBe(2); expect(t.calls.length).toBe(0); expect(loadChatConsent(r)).toBeNull();
});
test("no provider configured => friendly message, exit 1, no send", async () => {
  const r = root(); const t = mk({ resolveProvider: () => null });
  const code = await runAsk("plan", { root: r, run: true }, t.d);
  expect(code).toBe(1); expect(t.calls.length).toBe(0);
  expect(t.err().toLowerCase()).toContain("no ai provider");
});
test("model answer with control chars renders inert on stdout; receipt on stderr", async () => {
  const r = root(); saveChatConsent(r, prov.label, "t");
  const t = mk({ call: async () => ({ text: "hi\x1b[2J\x07 there", served: prov }), yes: true });
  const code = await runAsk("q", { root: r, run: true, yes: true }, t.d);
  expect(code).toBe(0);
  expect(t.out()).toContain("there");
  expect(t.out()).not.toContain("\x1b");
  expect(t.err().toLowerCase()).toContain("sent"); // receipt to stderr
});
