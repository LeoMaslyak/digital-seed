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

test("seed guide coaches: shows why-this-matters and points a stuck user at recovery", async () => {
  const root = sandbox();
  const out = await seed(root, ["guide", "--plain"]);
  expect(out).toContain("Why this matters");
  expect(out).toContain("--help-me");
});

test("seed guide --help-me prints a paste-ready unblock prompt", async () => {
  const root = sandbox();
  const out = await seed(root, ["guide", "--help-me", "--plain"]);
  expect(out.toLowerCase()).toContain("paste"); // tells them to paste it into their agent
  expect(out).toContain("Phase 1 of 4"); // the prompt names where they are
  expect(out.toLowerCase()).toContain("one question at a time");
});

test("seed guide --refresh survives a poisoned parkingLot (no crash, no escape leak)", async () => {
  const root = sandbox();
  const ESC = String.fromCharCode(0x1b);
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(
    join(root, "data/journey.json"),
    JSON.stringify({
      schemaVersion: 1,
      currentPhase: 1,
      phases: { "1": { status: "in_progress" }, "2": { status: "locked" }, "3": { status: "locked" }, "4": { status: "locked" } },
      parkingLot: [null, { idea: "evil" + ESC + "[2Jnote", phase: 3, noted: "n" }],
      focus: "x",
      updatedAt: "n",
    }),
    "utf-8",
  );
  const out = await seed(root, ["guide", "--refresh", "--plain"]);
  expect(out).not.toContain("TypeError"); // refreshJourney bypass used to crash here
  expect(out).toContain("Phase 1"); // still renders the guide
  expect([...out].some((c) => c.charCodeAt(0) === 0x1b)).toBe(false); // no raw ESC leak
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

// ── B1: welcome-back digest (passive surfacing + `seed digest` journey section) ──
test("seed guide shows no welcome-back block on a first run", async () => {
  const root = sandbox();
  const out = await seed(root, ["guide", "--plain"]);
  expect(out).not.toContain("Since you were last here");
});

test("seed guide surfaces a welcome-back block after a day once something changed", async () => {
  const root = sandbox();
  await seed(root, ["guide", "--plain"]); // first run records the baseline
  // back-date lastSeenAt so the next run crosses a day boundary
  const statePath = join(root, "data/digest-state.json");
  const st = JSON.parse(rf(statePath, "utf-8"));
  st.lastSeenAt = "2020-01-01T00:00:00.000Z";
  writeFileSync(statePath, JSON.stringify(st), "utf-8");
  // a real change: fill the three context files
  mkdirSync(join(root, "user"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) writeFileSync(join(root, "user", `${n}.md`), `real ${n}`, "utf-8");
  const out = await seed(root, ["guide", "--plain"]);
  expect(out).toContain("Since you were last here");
  expect(out.toLowerCase()).toContain("context");
});

test("seed guide --no-welcome suppresses the welcome-back block", async () => {
  const root = sandbox();
  await seed(root, ["guide", "--plain"]);
  const statePath = join(root, "data/digest-state.json");
  const st = JSON.parse(rf(statePath, "utf-8"));
  st.lastSeenAt = "2020-01-01T00:00:00.000Z";
  writeFileSync(statePath, JSON.stringify(st), "utf-8");
  mkdirSync(join(root, "user"), { recursive: true });
  for (const n of ["USER", "COMPASS", "GOALS"]) writeFileSync(join(root, "user", `${n}.md`), `real ${n}`, "utf-8");
  const out = await seed(root, ["guide", "--plain", "--no-welcome"]);
  expect(out).not.toContain("Since you were last here");
});

test("seed digest leads with the journey section (phase + next step)", async () => {
  const root = sandbox();
  const out = await seed(root, ["digest"]);
  expect(out).toContain("Your seed");
  expect(out.toLowerCase()).toContain("next step");
});

// ── B1 PR-2: opt-in schedule + notify ───────────────────────────────────────
test("seed digest --schedule prints a plan and installs nothing", async () => {
  const root = sandbox();
  const out = await seed(root, ["digest", "--schedule", "--plain"]);
  expect(out).toContain("* * *"); // a cron expression
  expect(out).toContain("--install");
  expect(out.toLowerCase()).toContain("nothing has been installed");
});

test("seed digest --schedule 07:30 --notify reflects the time + notify in the plan", async () => {
  const root = sandbox();
  const out = await seed(root, ["digest", "--schedule", "07:30", "--notify"]);
  expect(out).toContain("30 7 * * *");
  expect(out).toContain("--notify");
});

test("seed digest --notify reports a desktop-notification outcome and exits cleanly", async () => {
  const root = sandbox();
  const out = await seed(root, ["digest", "--notify"]);
  expect(out.toLowerCase()).toContain("notification"); // sent OR gracefully skipped
});

// ── B5: task examples gallery ───────────────────────────────────────────────
test("seed examples lists task prompts with a paste hint", async () => {
  const root = sandbox();
  const out = await seed(root, ["examples", "--plain"]);
  expect(out).toContain("Draft my week from my goals"); // a known task title
  expect(out.toLowerCase()).toContain("paste"); // paste-into-your-agent hint
});

test("seed examples <category> filters to that category", async () => {
  const root = sandbox();
  const out = await seed(root, ["examples", "planning", "--plain"]);
  expect(out).toContain("Draft my week from my goals"); // planning
  expect(out).not.toContain("Run my Friday review"); // life-admin → filtered out
});

test("seed examples --check passes on the shipped gallery", async () => {
  const root = sandbox();
  const out = await seed(root, ["examples", "--check"]);
  expect(out.toLowerCase()).toContain("ok");
});

// ── B6: trust surface (seed whoami) ─────────────────────────────────────────
test("seed whoami shows the four trust sections and the local-first default", async () => {
  const root = sandbox();
  const out = await seed(root, ["whoami", "--plain"]);
  expect(out.toLowerCase()).toContain("on this machine");
  expect(out.toLowerCase()).toContain("leave this machine");
  expect(out.toLowerCase()).toMatch(/ask you first|approval/);
  expect(out.toLowerCase()).toContain("staying in control");
  expect(out.toLowerCase()).toContain("nothing leaves automatically");
});

test("seed whoami --json emits valid JSON with the report shape", async () => {
  const root = sandbox();
  const out = await seed(root, ["whoami", "--json"]);
  const j = JSON.parse(out);
  expect(j.egress.automaticByDefault).toBe(true);
  expect(Array.isArray(j.leash)).toBe(true);
});

// ── A5: just-in-time glossary (seed explain) ────────────────────────────────
test("seed explain <term> shows the plain explanation; an alias resolves", async () => {
  const root = sandbox();
  const out = await seed(root, ["explain", "rag", "--plain"]);
  expect(out.toLowerCase()).toContain("your own notes");
  const alias = await seed(root, ["explain", "model context protocol", "--plain"]);
  expect(alias).toContain("MCP");
});

test("seed explain with no argument lists the glossary terms", async () => {
  const root = sandbox();
  const out = await seed(root, ["explain", "--plain"]);
  expect(out).toContain("RAG");
  expect(out).toContain("Embeddings");
});

test("seed explain on an unknown term reports no match (with the full-list hint)", async () => {
  const root = sandbox();
  const out = await seed(root, ["explain", "zxqw", "--plain"]);
  expect(out.toLowerCase()).toContain("no glossary entry");
});

test("seed explain --check passes on the shipped glossary", async () => {
  const root = sandbox();
  const out = await seed(root, ["explain", "--check"]);
  expect(out.toLowerCase()).toContain("ok");
});

// ── B3: seed ask (one-command task router) ──────────────────────────────────
test("seed ask builds a paste-ready prompt with the question + an agent/launch hint", async () => {
  const root = sandbox();
  const out = await seed(root, ["ask", "draft my week from my goals", "--plain"]);
  expect(out).toContain("draft my week from my goals");
  expect(out.toLowerCase()).toContain("user/goals.md"); // references context, doesn't dump it
  expect(out.toLowerCase()).toMatch(/run:|claude|cursor|no ai agent|paste/); // launch-or-paste hint
});

test("seed ask with no question exits non-zero with usage", async () => {
  const root = sandbox();
  const proc = Bun.spawn(["bun", "run", join(root, "scripts/seed.ts"), "ask"], { cwd: root, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
  expect(proc.exitCode).not.toBe(0);
  const err = (await new Response(proc.stderr).text()) + (await new Response(proc.stdout).text());
  expect(err.toLowerCase()).toContain("usage");
});

test("seed ask with a control-char-only question exits non-zero (guard matches scrub)", async () => {
  const root = sandbox();
  const C = String.fromCharCode(1) + String.fromCharCode(2);
  const proc = Bun.spawn(["bun", "run", join(root, "scripts/seed.ts"), "ask", C], { cwd: root, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
  expect(proc.exitCode).not.toBe(0);
});

// ── C1: seed ask --run / seed chat (live in-kit AI, opt-in egress) ───────────
// Spawn with stdin explicitly ignored so the child is deterministically non-TTY
// (never blocks on a consent prompt, and provably never sends without consent),
// regardless of whether the test runner itself has a TTY.
async function seedNoTTY(root: string, args: string[]): Promise<{ out: string; code: number | null }> {
  const proc = Bun.spawn(["bun", "run", join(root, "scripts/seed.ts"), ...args], {
    cwd: root, stdout: "pipe", stderr: "pipe", stdin: "ignore",
  });
  await proc.exited;
  const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
  return { out, code: proc.exitCode };
}

test("seed ask --run --dry-run prints the assembled prompt and sends nothing", async () => {
  const root = sandbox();
  const { out, code } = await seedNoTTY(root, ["ask", "plan my week", "--run", "--dry-run"]);
  expect(out).toContain("plan my week");
  expect(out.toLowerCase()).toMatch(/dry run|nothing was sent/);
  expect(code).toBe(0);
});

test("seed chat with no interactive terminal refuses cleanly (never sends, never hangs)", async () => {
  const root = sandbox();
  const { out, code } = await seedNoTTY(root, ["chat"]);
  expect(out.toLowerCase()).toMatch(/terminal|interactive/);
  expect(code).toBe(2);
});

test("seed ask --run with no consent + no TTY refuses (does not send, does not hang)", async () => {
  const root = sandbox();
  const { out, code } = await seedNoTTY(root, ["ask", "what should I do today", "--run"]);
  expect(out.toLowerCase()).toMatch(/terminal|nothing was sent|no ai provider/);
  expect(code).not.toBe(0); // refused — nothing left the machine
});

test("seed ask --revoke-consent is idempotent and reports the consent state", async () => {
  const root = sandbox();
  const { out, code } = await seedNoTTY(root, ["ask", "--revoke-consent"]);
  expect(out.toLowerCase()).toContain("consent");
  expect(code).toBe(0);
});

test("bare seed ask stays print-only after the --run wiring (no regression)", async () => {
  const root = sandbox();
  const { out } = await seedNoTTY(root, ["ask", "draft my week", "--plain"]);
  expect(out).toContain("draft my week");
  expect(out.toLowerCase()).toContain("copy"); // the print-and-paste copy rulers, not a live send
});

test("seed help surfaces the in-kit AI commands (chat + ask --run) as opt-in egress", async () => {
  const root = sandbox();
  const { out } = await seedNoTTY(root, ["help"]);
  expect(out).toContain("seed chat");
  expect(out).toContain("--run");
  expect(out.toLowerCase()).toMatch(/opt-in|send/);
});

test("seed ask scrubs a control-char-laced question (no raw escape in output)", async () => {
  const root = sandbox();
  const ESC = String.fromCharCode(0x1b);
  const out = await seed(root, ["ask", "plan my week" + ESC + "[2Jx", "--plain"]);
  expect([...out].some((c) => c.charCodeAt(0) === 0x1b)).toBe(false);
  expect(out).toContain("plan my week"); // question still shown, just sanitized
});
