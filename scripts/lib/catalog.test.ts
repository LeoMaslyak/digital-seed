import { test, expect } from "bun:test";
import { loadCatalog, matchNeed, BLAST_RADIUS_VOCAB } from "./catalog.ts";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";

const REPO_ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");

test("the shipped catalog loads with zero validation problems", () => {
  const { entries, problems } = loadCatalog(REPO_ROOT);
  expect(problems).toEqual([]);
  expect(entries.length).toBeGreaterThan(5);
});

test("every shipped entry has a real https repo URL and known blast-radius terms", () => {
  const { entries } = loadCatalog(REPO_ROOT);
  for (const e of entries) {
    expect(e.repo).toMatch(/^https:\/\/(github|gitlab|codeberg)/);
    for (const a of e.accesses) expect(BLAST_RADIUS_VOCAB).toContain(a as never);
  }
});

test("OpenClaw and Hermes are catalog entries pointing at their real repos", () => {
  const { entries } = loadCatalog(REPO_ROOT);
  const oc = entries.find((e) => e.id === "openclaw");
  const hm = entries.find((e) => e.id === "hermes");
  expect(oc?.repo).toBe("https://github.com/openclaw/openclaw");
  expect(hm?.repo).toBe("https://github.com/NousResearch/hermes-agent");
  expect(oc?.phase).toBe(4); // always-on agent is a Phase-4 step
});

function tmpCatalog(yaml: string): string {
  const root = mkdtempSync(join(tmpdir(), "cat-"));
  mkdirSync(join(root, "catalog"), { recursive: true });
  writeFileSync(join(root, "catalog/catalog.yaml"), yaml, "utf-8");
  return root;
}

test("loader REJECTS an entry without a real repo URL (anti-fabrication rule)", () => {
  const root = tmpCatalog(
    "tools:\n  - id: bad\n    name: Bad\n    category: mcp-server\n    repo: not-a-url\n    trust: { tier: vetted }\n    accesses: []\n",
  );
  const { entries, problems } = loadCatalog(root);
  expect(entries.length).toBe(0);
  expect(problems.join(" ")).toContain("repo must be an https");
});

test("loader flags an unknown blast-radius term", () => {
  const root = tmpCatalog(
    "tools:\n  - id: x\n    name: X\n    category: mcp-server\n    repo: https://github.com/a/b\n    trust: { tier: vetted }\n    accesses: [telepathy]\n",
  );
  const { problems } = loadCatalog(root);
  expect(problems.join(" ")).toContain("telepathy");
});

test("matchNeed surfaces the right tool for a plain-language need", () => {
  const { entries } = loadCatalog(REPO_ROOT);
  const email = matchNeed(entries, "connect my email");
  expect(email[0]?.accesses).toContain("your-email");
  const agent = matchNeed(entries, "always-on agent");
  expect(agent.map((e) => e.id)).toContain("openclaw");
});
