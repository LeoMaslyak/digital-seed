import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, symlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Run `seed` in an isolated copy of the repo so journey.json writes are sandboxed.
// node_modules is symlinked (not copied) so the spawned seed.ts can resolve
// js-yaml while ROOT still resolves to the sandbox copy.
function sandbox(): string {
  const root = mkdtempSync(join(tmpdir(), "seed-"));
  cpSync(process.cwd(), root, {
    recursive: true,
    filter: (src) => !src.includes("/.git/") && !src.includes("/node_modules/") && !src.endsWith("/node_modules"),
  });
  const realNodeModules = join(process.cwd(), "node_modules");
  if (existsSync(realNodeModules)) symlinkSync(realNodeModules, join(root, "node_modules"), "dir");
  return root;
}

async function seed(root: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["bun", "run", join(root, "scripts/seed.ts"), ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  return (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
}

test("seed guide on a fresh workspace shows Phase 1 + a next step", async () => {
  const root = sandbox();
  const out = await seed(root, ["guide", "--plain"]);
  expect(out).toContain("Phase 1");
  expect(out.toLowerCase()).toContain("next");
});

test("seed what-next prints a one-line Next:", async () => {
  const root = sandbox();
  const out = await seed(root, ["what-next"]);
  expect(out).toContain("Next:");
});

test("seed start runs the guided first session end-to-end", async () => {
  const root = sandbox();
  const out = await seed(root, ["start", "--plain"]);
  expect(out).toContain("Welcome to Digital Seed");
  // materializes context
  expect(existsSync(join(root, "user/USER.md"))).toBe(true);
  // points at the three core files + the paste-prompt step
  expect(out).toContain("user/USER.md");
  expect(out).toContain("paste"); // the first-prompt step
  // detects-or-explains the agent step (one of: a launch hint or the install note)
  expect(out.toLowerCase()).toMatch(/run:|claude|no ai agent detected/);
  // records progress so the guide advances
  expect(existsSync(join(root, "data/journey.json"))).toBe(true);
});

import { readFileSync as rf } from "fs";

test("CLAUDE.md defines the Proactive Guide contract", () => {
  const md = rf(join(process.cwd(), ".claude/CLAUDE.md"), "utf-8");
  expect(md).toContain("## Proactive Guide");
  expect(md).toContain("data/journey.json");
  expect(md.toLowerCase()).toContain("parking lot");
  expect(md.toLowerCase()).toContain("single next step");
  // The guide section sits above Session Startup.
  expect(md.indexOf("## Proactive Guide")).toBeLessThan(md.indexOf("## Session Startup"));
  // If the security PR's Trust Boundary is present, it must still come first.
  if (md.includes("Trust Boundary")) {
    expect(md.indexOf("Trust Boundary")).toBeLessThan(md.indexOf("## Proactive Guide"));
  }
});
