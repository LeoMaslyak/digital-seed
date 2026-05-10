#!/usr/bin/env bun
/**
 * DAI Pre-Commit Boundary Check
 *
 * Called automatically by .git/hooks/pre-commit.
 * Validates that staged files don't contain personal data or violate the
 * collab/personal separation boundary.
 *
 * Install: bun run collab hook install
 * Manual:  bun run scripts/pre-commit-check.ts
 */

import { execSync } from "child_process";
import { join } from "path";
import { validateShareBoundary } from "../core/src/collaboration.ts";

const root = process.cwd();

// Get staged file list from git
function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
      cwd: root,
    }).trim();
    return output ? output.split("\n").filter(Boolean) : [];
  } catch {
    // Not in a git repo or no staged files — allow commit
    return [];
  }
}

const staged = getStagedFiles();

if (staged.length === 0) {
  // Nothing staged — nothing to check
  process.exit(0);
}

const result = validateShareBoundary(staged, root);
console.log(result.summary);

process.exit(result.safe ? 0 : 1);
