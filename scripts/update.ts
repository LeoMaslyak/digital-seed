#!/usr/bin/env bun
/**
 * Digital Seed update helper — safe self-update from origin/main.
 *
 * Usage:
 *   bun run update
 *   bun run update --yes
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const skipConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

function getVersion(): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  return pkg.version ?? "unknown";
}

function exec(cmd: string, args: string[], opts?: { silent?: boolean }): { ok: boolean; output: string } {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf-8" });
  const output = ((result.stdout ?? "") + (result.stderr ?? "")).trim();
  if (!opts?.silent && result.status !== 0 && output) console.error(output);
  return { ok: result.status === 0, output };
}

const oldVersion = getVersion();
console.log(`\nDigital Seed v${oldVersion}\n`);

console.log("Checking for updates...");
const fetch = exec("git", ["fetch", "origin", "main", "--quiet"]);
if (!fetch.ok) {
  console.error("Failed to fetch from origin. Check your network connection.");
  process.exit(1);
}

const log = exec("git", ["log", "HEAD..origin/main", "--oneline"]);
const incoming = log.output.trim();

if (!incoming) {
  console.log(`Already up to date (v${oldVersion})`);
  console.log("Your personal files (user/, data/, .env) are preserved.\n");
  process.exit(0);
}

console.log("\nIncoming changes:\n");
for (const line of incoming.split("\n")) console.log(`  ${line}`);
console.log("");

if (!skipConfirm) {
  process.stdout.write("Apply update? [y/N] ");
  const buf = Buffer.alloc(64);
  const bytesRead = require("fs").readSync(0, buf, 0, 64, null);
  const answer = buf.toString("utf-8", 0, bytesRead).trim().toLowerCase();
  if (answer !== "y" && answer !== "yes") {
    console.log("Update cancelled.");
    process.exit(0);
  }
}

console.log("Pulling updates...");
const pull = exec("git", ["pull", "--rebase", "origin", "main"]);
if (!pull.ok) {
  console.error("Pull failed. Resolve conflicts manually, or run: git rebase --abort");
  process.exit(1);
}

console.log("Installing dependencies...");
exec("bun", ["install", "--frozen-lockfile"], { silent: true });

const newVersion = getVersion();
console.log(newVersion !== oldVersion ? `\nUpdated v${oldVersion} → v${newVersion}` : `\nUpdated to latest (v${newVersion})`);
console.log("Your personal files (user/, data/, .env) are preserved.\n");

console.log("Running health check...\n");
exec("bun", ["run", "scripts/health-check.ts"]);
