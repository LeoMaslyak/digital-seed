import { test, expect } from "bun:test";
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runChat } from "./chat-cli.ts";
import { saveChatConsent, loadChatConsent } from "./lib/chat-consent.ts";

const prov = { label: "Anthropic (claude CLI)", vendor: "Anthropic" as const, transport: "claude CLI" as const, host: "(local CLI)" };
function mk(inputs: string[], over: any = {}) {
  const prompts: string[] = []; const outC: string[] = []; const errC: string[] = [];
  const d: any = {
    call: async (p: string) => { prompts.push(p); return { text: "reply-" + prompts.length, served: prov }; },
    resolveProvider: () => prov, isTTY: true, nonce: () => "N", now: () => "t", readLine: async () => "yes",
    lines: (async function* () { for (const i of inputs) yield i; })(),
    stdout: (s: string) => outC.push(s), stderr: (s: string) => errC.push(s), ...over,
  };
  return { prompts, out: () => outC.join(""), err: () => errC.join(""), d };
}
const root = () => mkdtempSync(join(tmpdir(), "chat-"));

test("non-TTY refuses (a REPL needs a terminal), never calls", async () => {
  const r = root(); saveChatConsent(r, prov.label, "t");
  const t = mk(["hi", "/exit"], { isTTY: false });
  expect(await runChat({ root: r }, t.d)).toBe(2);
  expect(t.prompts.length).toBe(0);
});

test("two turns: context sent every turn; turn 2 fences the prior assistant reply", async () => {
  const r = root();
  mkdirSync(join(r, "user"), { recursive: true }); writeFileSync(join(r, "user", "USER.md"), "I am Leo");
  saveChatConsent(r, prov.label, "t");
  const t = mk(["first question", "second question", "/exit"]);
  expect(await runChat({ root: r }, t.d)).toBe(0);
  expect(t.prompts.length).toBe(2);
  expect(t.prompts[0]).toContain("I am Leo");   // context sent turn 1
  expect(t.prompts[1]).toContain("I am Leo");   // context sent EVERY turn
  expect(t.prompts[0]).toContain("first question");
  expect(t.prompts[1]).toContain("reply-1");                       // prior assistant present
  expect(t.prompts[1].toLowerCase()).toContain("prior ai output"); // fenced as DATA
});

test("first-run with no consent discloses, typed yes persists, then loops", async () => {
  const r = root();
  const t = mk(["hello", "/exit"]); // readLine => "yes"
  expect(await runChat({ root: r }, t.d)).toBe(0);
  expect(t.prompts.length).toBe(1);
  expect(loadChatConsent(r)?.provider).toBe(prov.label);
});

test("no-tools invariant: chat-cli.ts source has no subprocess or direct file mutation", () => {
  const src = readFileSync(join(import.meta.dir, "chat-cli.ts"), "utf-8");
  expect(src).not.toMatch(/child_process|execSync|spawnSync|\bspawn\b|safe-?exec/i);
  expect(src).not.toMatch(/writeFileSync|appendFileSync|unlinkSync|renameSync/); // consent writes go through chat-consent.ts
});

test("first-run consent-save failure degrades gracefully (no uncaught throw, nothing sent)", async () => {
  const r = root();
  writeFileSync(join(r, "data"), "not a dir"); // force saveChatConsent's mkdir to fail
  const t = mk(["hello", "/exit"]); // isTTY true, readLine returns "yes"
  expect(await runChat({ root: r }, t.d)).toBe(1); // graceful non-zero, not a raw stacktrace
  expect(t.prompts.length).toBe(0); // never sent
  expect(t.err().toLowerCase()).toContain("consent");
});
