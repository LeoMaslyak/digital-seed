#!/usr/bin/env bun
/**
 * Digital Seed Export — Create a portable archive of your setup.
 *
 * Exports: user context, patterns, config templates, MCP server registry.
 * Does NOT export: .env (secrets), .claude/settings.json (can hold inlined
 *   secrets / connection strings), data/ (runtime), node_modules/.
 *
 * Note: user/ holds your PERSONAL context (USER/GOALS/MEMORY/PREFERENCES).
 *   It is bundled so you can move your setup between your own machines — do
 *   NOT share this archive publicly or send it to others.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const EXPORT_DIR = join(ROOT, "exports");
const timestamp = new Date().toISOString().slice(0, 10);
const archiveName = `digital-seed-export-${timestamp}.tar.gz`;

if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });

console.log("📦 Digital Seed Export\n");

// Files to include.
// Deliberately excludes:
//   - .env / .env.* (secrets) — never bundled, even if present on disk.
//   - .claude/settings.json — the DB/email/calendar recipes inline secrets and
//     credential paths into this file, so it must never travel in an export.
const includes = [
  "user/",
  "patterns/",
  "config/autonomy.example.yaml",
  ".claude/CLAUDE.md",
  "mcp/servers.json",
].filter((p) => existsSync(join(ROOT, p)));

if (includes.length === 0) {
  console.log("Nothing to export.");
  process.exit(1);
}

// Hard guard: refuse to bundle any secret-bearing path, even if a future edit
// re-adds it to `includes` above.
const FORBIDDEN = [".env", ".claude/settings.json"];
const leaked = includes.filter(
  (p) => FORBIDDEN.includes(p) || /(^|\/)\.env(\.|$)/.test(p),
);
if (leaked.length > 0) {
  console.error(`❌ Refusing to export secret-bearing path(s): ${leaked.join(", ")}`);
  process.exit(1);
}

const includeArgs = includes.map((p) => `"${p}"`).join(" ");
const cmd = `cd "${ROOT}" && tar -czf "exports/${archiveName}" ${includeArgs}`;

try {
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Exported to: exports/${archiveName}`);
  console.log(`   Includes: ${includes.join(", ")}`);
  if (includes.includes("user/")) {
    console.log(`\n   ⚠️  This archive contains user/ — your PERSONAL context files.`);
    console.log(`      Keep it private. Do not share it or upload it to a public service.`);
  }
  console.log(`   Excluded: .env and .claude/settings.json (secrets stay on this machine).`);
  console.log(`\n   To import on another machine:`);
  console.log(`   1. Clone the repo`);
  console.log(`   2. tar -xzf ${archiveName}`);
  console.log(`   3. Run ./setup.sh to configure API keys`);
} catch (e) {
  console.error("Export failed:", e);
  process.exit(1);
}
