#!/usr/bin/env bun
/**
 * Digital Seed Import — Restore from a portable archive.
 */

import { existsSync, writeFileSync } from "fs";
import { resolve, join, dirname, sep } from "path";
import { safeExec } from "./lib/safe-exec.ts";

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

const ROOT_RESOLVED = resolve(ROOT);
const ROOT_PREFIX = ROOT_RESOLVED.endsWith(sep) ? ROOT_RESOLVED : ROOT_RESOLVED + sep;

/**
 * Reject any archive member that would resolve outside ROOT
 * (tar-slip / path traversal), absolute paths, or "..".
 */
function memberEscapesRoot(member: string): boolean {
  const name = member.trim();
  if (!name) return false; // ignore blank lines from `tar -t`
  // Absolute members or any ".." segment are rejected outright.
  if (name.startsWith("/")) return true;
  const segments = name.split("/");
  if (segments.includes("..")) return true;
  // Final safety net: resolve relative to ROOT and confirm containment.
  const dest = resolve(ROOT_RESOLVED, name);
  return dest !== ROOT_RESOLVED && !dest.startsWith(ROOT_PREFIX);
}

try {
  // 1. List members WITHOUT extracting (argv form, no shell) and reject any
  //    that escape ROOT before writing a single byte (M3 / C1 secondary).
  const listed = safeExec("tar", ["-tzf", archive]);
  if (listed.exitCode !== 0) {
    throw new Error(listed.stderr.trim() || `tar list failed (code ${listed.exitCode})`);
  }
  const members = listed.stdout.split("\n").map((m) => m.trim()).filter(Boolean);
  const unsafe = members.filter(memberEscapesRoot);
  if (unsafe.length > 0) {
    console.error("❌ Refusing to import — archive contains unsafe paths:");
    for (const m of unsafe.slice(0, 10)) console.error(`     ${m}`);
    if (unsafe.length > 10) console.error(`     …and ${unsafe.length - 10} more`);
    process.exit(1);
  }

  // 2. Reject symlink / hardlink members outright. A link whose target points
  //    outside ROOT lets a LATER member write through it (symlink-traversal
  //    tar-slip) — the name-only check in step 1 cannot catch that. A legitimate
  //    Digital Seed export (see export.ts) contains only regular files and
  //    directories, so refusing links costs nothing. In tar's verbose listing
  //    the first column encodes the member type: 'l' = symlink, 'h' = hardlink.
  const verbose = safeExec("tar", ["-tvzf", archive]);
  if (verbose.exitCode === 0) {
    const links = verbose.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l[0] === "l" || l[0] === "h"));
    if (links.length > 0) {
      console.error("❌ Refusing to import — archive contains symlink/hardlink members:");
      for (const l of links.slice(0, 10)) console.error(`     ${l}`);
      if (links.length > 10) console.error(`     …and ${links.length - 10} more`);
      process.exit(1);
    }
  }

  // 3. Never silently overwrite the agent's policy file: .claude/CLAUDE.md holds
  //    the Trust Boundary (the agent's safety rules). If the archive carries one,
  //    extract everything ELSE and divert the incoming policy to a *.imported file
  //    for manual review — importing an untrusted archive must NOT be able to
  //    rewrite your agent's safety rules.
  const POLICY = ".claude/CLAUDE.md";
  const hasPolicy = members.includes(POLICY) || members.includes("./" + POLICY);

  const tarArgs = ["-xzf", archive, "-C", ROOT_RESOLVED];
  if (hasPolicy) tarArgs.push("--exclude", POLICY, "--exclude", "./" + POLICY);
  const res = safeExec("tar", tarArgs, { inherit: true });
  if (res.exitCode !== 0) {
    throw new Error(`tar extraction failed (code ${res.exitCode})`);
  }

  if (hasPolicy) {
    // Extract just the incoming policy to stdout and stage it for review.
    const got = safeExec("tar", ["-xOzf", archive, POLICY]);
    const incoming = got.exitCode === 0 && got.stdout
      ? got.stdout
      : safeExec("tar", ["-xOzf", archive, "./" + POLICY]).stdout || "";
    if (incoming) writeFileSync(join(ROOT_RESOLVED, POLICY + ".imported"), incoming, "utf-8");
    console.error("\n⚠  AGENT POLICY NOT REPLACED.");
    console.error(`   This archive contained a new ${POLICY} (your agent's Trust Boundary / rules).`);
    console.error(`   It was saved to ${POLICY}.imported — review the diff and replace it MANUALLY,`);
    console.error("   only if you fully trust the source. An imported archive must never rewrite your agent's safety rules.");
  }

  console.log("✅ Import complete!");
  console.log("\nNext steps:");
  console.log("1. Run ./setup.sh to configure API keys (secrets are never exported)");
  console.log("2. Run bun install to install dependencies");
  console.log("3. Verify with: bun run health");
} catch (e) {
  console.error("Import failed:", e);
  process.exit(1);
}
