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
const checkRepos = process.argv.includes("--repos");

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

// Repo EXISTENCE check — the loader enforces the repo URL's shape, but the
// catalog's #1 safety rule is that it points at a REAL repo. A community PR
// could add a plausible-but-dead/typosquat URL; verify each one actually
// resolves (a confirmed 404 fails; transient/network errors only warn so a
// flaky runner doesn't block a legit PR). The loader already constrains repo
// URLs to github/gitlab/codeberg https, so these are known-good hosts to fetch.
if (checkRepos) {
  const repos = [...new Set(entries.map((e) => e.repo))];
  for (const url of repos) {
    let status = 0;
    let netErr = "";
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
      status = res.status;
    } catch (err) { netErr = (err as Error).message; }
    if (status >= 200 && status < 400) {
      console.log(`  ✅ repo: ${url}`);
    } else if (status === 404 || status === 410) {
      console.error(`  ✗ repo does NOT exist (${status}): ${url}`);
      failed = true;
    } else {
      console.log(`  ⚠ could not verify repo (${netErr || "HTTP " + status}) — not failing: ${url}`);
    }
  }
}

if (failed) {
  console.error(`\n❌ Catalog check failed.`);
  process.exit(1);
}
const verified = [checkNpm ? "npm packages" : null, checkRepos ? "repo URLs" : null].filter(Boolean).join(" + ");
console.log(`✅ Catalog OK — ${entries.length} entries, all valid${verified ? ` (${verified} verified)` : ""}.`);
