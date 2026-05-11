#!/usr/bin/env bun
/**
 * Digital Seed — Unified release check.
 *
 * One command to run the gates a maintainer should pass before tagging or
 * announcing a release. Composes the existing scattered checks instead of
 * reimplementing them, so the source of truth stays with each underlying
 * script.
 *
 * Usage:
 *   bun run release:check
 *   bun run seed release-check
 *   bun run seed release-check --skip-fresh-clone
 *   bun run seed release-check --with-drive-dry-run --account lm@avantgaera.com
 *   bun run seed release-check --ci
 *   bun run seed release-check --help
 *
 * Flags:
 *   --skip-fresh-clone        Skip the fresh-clone harness (default in --ci mode).
 *   --with-drive-dry-run      Run a Google Drive publish dry-run (maintainer-only,
 *                             requires `gog` and a Drive account). Skipped silently
 *                             unless this flag is set.
 *   --account EMAIL           Drive account to use with --with-drive-dry-run.
 *   --ci                      CI-safe mode. Implies --skip-fresh-clone and never
 *                             attempts the Drive dry-run, even with credentials.
 *   --skip-install            Skip the `bun install --frozen-lockfile` step. Use
 *                             when deps are already known to be in sync (CI does
 *                             this in a separate step). Default off.
 *   -h, --help                Show this help.
 *
 * Does NOT publish, upload, or delete anything. The optional Drive step is
 * dry-run only and opt-in.
 */

import { spawnSync, type SpawnSyncReturns } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  console.log(readFileSync(new URL(import.meta.url), "utf-8")
    .split("\n")
    .filter((l) => l.startsWith(" *") || l.startsWith("/**") || l.startsWith(" */"))
    .map((l) => l.replace(/^ \*\/?\s?/, "").replace(/^\/\*\*\s?/, ""))
    .join("\n")
    .trim());
  process.exit(0);
}

function flag(name: string): boolean { return args.includes(name); }

function flagValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

const CI_MODE = flag("--ci");
const SKIP_FRESH_CLONE = flag("--skip-fresh-clone") || CI_MODE;
const WITH_DRIVE_DRY_RUN = flag("--with-drive-dry-run") && !CI_MODE;
const DRIVE_ACCOUNT = flagValue("--account");
const SKIP_INSTALL = flag("--skip-install");

interface StepResult {
  name: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
  durationMs: number;
}

const results: StepResult[] = [];

function runStep(name: string, command: string, commandArgs: string[], options: { skip?: { reason: string } } = {}): boolean {
  if (options.skip) {
    console.log(`\n────────────────────────────────────────`);
    console.log(`⏭  ${name} — skipped (${options.skip.reason})`);
    results.push({ name, status: "skip", detail: options.skip.reason, durationMs: 0 });
    return true;
  }
  console.log(`\n────────────────────────────────────────`);
  console.log(`▶ ${name}`);
  console.log(`  $ ${command} ${commandArgs.join(" ")}`);
  console.log(`────────────────────────────────────────`);
  const start = Date.now();
  let result: SpawnSyncReturns<Buffer>;
  try {
    result = spawnSync(command, commandArgs, { stdio: "inherit", cwd: ROOT });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.log(`❌ ${name} could not start: ${err instanceof Error ? err.message : String(err)} (${(durationMs / 1000).toFixed(1)}s)`);
    results.push({ name, status: "fail", detail: `spawn error: ${err instanceof Error ? err.message : String(err)}`, durationMs });
    return false;
  }
  const durationMs = Date.now() - start;
  if (result.status === 0) {
    console.log(`✅ ${name} (${(durationMs / 1000).toFixed(1)}s)`);
    results.push({ name, status: "pass", durationMs });
    return true;
  }
  console.log(`❌ ${name} failed (exit ${result.status ?? "?"}, ${(durationMs / 1000).toFixed(1)}s)`);
  results.push({ name, status: "fail", detail: `exit ${result.status ?? "?"}`, durationMs });
  return false;
}

function which(binary: string): boolean {
  const r = spawnSync("which", [binary], { stdio: "pipe" });
  return r.status === 0;
}

function checkVersionConsistency(): boolean {
  const start = Date.now();
  console.log(`\n────────────────────────────────────────`);
  console.log(`▶ Version consistency check`);
  console.log(`  Inspect package.json against CHANGELOG.md and docs/release-checklist.md`);
  console.log(`────────────────────────────────────────`);
  const issues: string[] = [];
  let pkgVersion = "";
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    pkgVersion = String(pkg.version ?? "");
    if (!pkgVersion) issues.push("package.json has no version field");
  } catch (err) {
    issues.push(`could not read package.json: ${err instanceof Error ? err.message : String(err)}`);
  }

  const changelogPath = join(ROOT, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    issues.push("CHANGELOG.md is missing");
  } else if (pkgVersion) {
    const changelog = readFileSync(changelogPath, "utf-8");
    const headingPattern = new RegExp(`^##\\s+\\[?${escapeRegExp(pkgVersion)}\\]?`, "m");
    if (!headingPattern.test(changelog) && !changelog.includes(pkgVersion)) {
      issues.push(`CHANGELOG.md does not mention package.json version ${pkgVersion}`);
    }
  }

  const checklistPath = join(ROOT, "docs/release-checklist.md");
  if (!existsSync(checklistPath)) {
    issues.push("docs/release-checklist.md is missing");
  } else if (pkgVersion) {
    const checklist = readFileSync(checklistPath, "utf-8");
    const tagMatches = Array.from(checklist.matchAll(/git tag\s+v([0-9][^\s`]*)/g)).map((m) => m[1]);
    if (tagMatches.length > 0) {
      const stale = tagMatches.filter((v) => v !== pkgVersion);
      if (stale.length > 0) {
        issues.push(`docs/release-checklist.md references tag(s) ${stale.map((v) => `v${v}`).join(", ")}, expected v${pkgVersion}`);
      }
    } else {
      issues.push("docs/release-checklist.md has no `git tag vX.Y.Z` instruction to validate");
    }
  }

  const durationMs = Date.now() - start;
  if (issues.length === 0) {
    console.log(`✅ Version consistency check (${(durationMs / 1000).toFixed(1)}s) — package.json v${pkgVersion} matches CHANGELOG and release checklist.`);
    results.push({ name: "Version consistency check", status: "pass", durationMs });
    return true;
  }
  console.log(`❌ Version consistency check failed:`);
  for (const issue of issues) console.log(`   - ${issue}`);
  results.push({ name: "Version consistency check", status: "fail", detail: issues.join("; "), durationMs });
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log(`Digital Seed — release check`);
console.log(`  mode:                ${CI_MODE ? "CI" : "local"}`);
console.log(`  fresh-clone harness: ${SKIP_FRESH_CLONE ? "skipped" : "enabled"}`);
console.log(`  drive dry-run:       ${WITH_DRIVE_DRY_RUN ? `enabled (account: ${DRIVE_ACCOUNT ?? "default"})` : "skipped"}`);
console.log(`  install step:        ${SKIP_INSTALL ? "skipped" : "enabled"}`);

let installResult = true;
if (SKIP_INSTALL) {
  runStep("bun install --frozen-lockfile", "bun", ["install", "--frozen-lockfile"], { skip: { reason: "--skip-install" } });
} else if (!which("bun")) {
  installResult = false;
  runStep("bun install --frozen-lockfile", "bun", ["install", "--frozen-lockfile"], { skip: { reason: "bun not found on PATH" } });
} else {
  installResult = runStep("bun install --frozen-lockfile", "bun", ["install", "--frozen-lockfile"]);
}

const healthOk      = runStep("Health check",          "bun", ["run", "health"]);
const privacyOk     = runStep("Privacy scan",          "bun", ["run", "seed", "privacy-scan"]);
const visualOk      = runStep("Visual QA",             "bun", ["run", "seed", "visual-qa"]);
const onboardOk     = runStep("Onboard (--plain)",     "bun", ["run", "seed", "onboard", "--plain"]);
const firstPromptOk = runStep("First prompt",          "bun", ["run", "seed", "first-prompt"]);
const linksOk       = runStep("Markdown link check",   "bun", ["run", "check:links"]);

const versionOk = checkVersionConsistency();

if (SKIP_FRESH_CLONE) {
  runStep("Fresh-clone harness", "bash", ["scripts/fresh-clone-check.sh"], {
    skip: { reason: CI_MODE ? "--ci (avoid recursive expensive CI)" : "--skip-fresh-clone" },
  });
} else {
  runStep("Fresh-clone harness", "bash", ["scripts/fresh-clone-check.sh"]);
}

if (WITH_DRIVE_DRY_RUN) {
  if (!which("gog")) {
    runStep("Drive publish dry-run", "bun", ["run", "seed", "drive", "publish-data-room", "--dry-run"], {
      skip: { reason: "gog CLI not installed (maintainer-only step)" },
    });
  } else {
    const driveArgs = ["run", "seed", "drive", "publish-data-room", "--dry-run"];
    if (DRIVE_ACCOUNT) driveArgs.push("--account", DRIVE_ACCOUNT);
    runStep("Drive publish dry-run", "bun", driveArgs);
  }
} else {
  runStep("Drive publish dry-run", "bun", ["run", "seed", "drive", "publish-data-room", "--dry-run"], {
    skip: { reason: CI_MODE ? "--ci (Drive credentials never used in public CI)" : "not requested (pass --with-drive-dry-run to enable)" },
  });
}

console.log(`\n────────────────────────────────────────`);
console.log(`Release check summary`);
console.log(`────────────────────────────────────────`);
const passed  = results.filter((r) => r.status === "pass").length;
const failed  = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;
for (const r of results) {
  const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : "⏭ ";
  const time = r.durationMs > 0 ? ` (${(r.durationMs / 1000).toFixed(1)}s)` : "";
  const detail = r.detail ? ` — ${r.detail}` : "";
  console.log(`  ${icon} ${r.name}${time}${detail}`);
}
console.log("");
console.log(`  ${passed} passed · ${failed} failed · ${skipped} skipped`);
if (failed > 0) {
  console.log("\n❌ Release check failed. Fix the items above before tagging or announcing.");
  process.exit(1);
}
console.log("\n✅ Release check passed. Manual steps remain — see docs/release-checklist.md.");
process.exit(0);
