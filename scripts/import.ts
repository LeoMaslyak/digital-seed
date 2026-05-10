#!/usr/bin/env bun
/**
 * Digital Seed Import — Restore from a portable archive.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const archive = process.argv[2];

if (!archive) {
  console.log("Usage: bun run scripts/import.ts <archive.tar.gz>");
  process.exit(1);
}

if (!existsSync(archive)) {
  console.log(`File not found: ${archive}`);
  process.exit(1);
}

console.log(`📦 Digital Seed Import: ${archive}\n`);

try {
  execSync(`cd "${ROOT}" && tar -xzf "${archive}"`, { stdio: "inherit" });
  console.log("✅ Import complete!");
  console.log("\nNext steps:");
  console.log("1. Run ./setup.sh to configure API keys (secrets are never exported)");
  console.log("2. Run bun install to install dependencies");
  console.log("3. Verify with: bun run health");
} catch (e) {
  console.error("Import failed:", e);
  process.exit(1);
}
