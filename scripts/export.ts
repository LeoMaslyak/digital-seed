#!/usr/bin/env bun
/**
 * Digital Seed Export — Create a portable archive of your setup.
 *
 * Exports: user context, patterns, config templates, MCP configs
 * Does NOT export: .env (secrets), data/ (runtime), node_modules/
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

// Files to include
const includes = [
  "user/",
  "patterns/",
  "config/autonomy.example.yaml",
  ".claude/CLAUDE.md",
  ".claude/settings.json",
  "mcp/servers.json",
].filter((p) => existsSync(join(ROOT, p)));

if (includes.length === 0) {
  console.log("Nothing to export.");
  process.exit(1);
}

const includeArgs = includes.map((p) => `"${p}"`).join(" ");
const cmd = `cd "${ROOT}" && tar -czf "exports/${archiveName}" ${includeArgs}`;

try {
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Exported to: exports/${archiveName}`);
  console.log(`   Includes: ${includes.join(", ")}`);
  console.log(`\n   To import on another machine:`);
  console.log(`   1. Clone the repo`);
  console.log(`   2. tar -xzf ${archiveName}`);
  console.log(`   3. Run ./setup.sh to configure API keys`);
} catch (e) {
  console.error("Export failed:", e);
  process.exit(1);
}
