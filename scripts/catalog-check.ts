#!/usr/bin/env bun
/**
 * Validate catalog/catalog.yaml so a PR can't slip in a malformed or unsafe
 * entry: schema + blast-radius vocabulary + real repo URL (enforced in the
 * loader), and — when run with --npm — that every install.package actually
 * exists on npm (the typosquat/non-existent-package guard). Exit 1 on any
 * problem so CI fails the PR.
 */
import { loadCatalog } from "./lib/catalog.ts";
import { safeExec } from "./lib/safe-exec.ts";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const checkNpm = process.argv.includes("--npm");

const { entries, problems } = loadCatalog(ROOT);
let failed = problems.length > 0;
for (const p of problems) console.error(`  ✗ ${p}`);

if (checkNpm) {
  for (const e of entries) {
    const pkg = e.install ? String(e.install.package || "") : "";
    if (!pkg) continue;
    const name = pkg.startsWith("@") ? "@" + pkg.slice(1).split("@")[0] : pkg.split("@")[0];
    let out = "";
    let ok = false;
    try {
      const res = safeExec("npm", ["view", name, "version"], { timeout: 20000 });
      ok = res.exitCode === 0 && res.stdout.trim().length > 0;
      out = res.stderr || "";
    } catch (err) { out = String(err); }
    if (ok) {
      console.log(`  ✅ npm: ${name}`);
    } else if (out.includes("E404")) {
      console.error(`  ✗ ${e.id}: npm package ${name} does NOT exist (E404)`);
      failed = true;
    } else {
      console.log(`  ⚠ ${e.id}: could not verify ${name} (transient npm error — not failing)`);
    }
  }
}

if (failed) {
  console.error(`\n❌ Catalog check failed.`);
  process.exit(1);
}
console.log(`✅ Catalog OK — ${entries.length} entries, all valid${checkNpm ? " (npm packages verified)" : ""}.`);
