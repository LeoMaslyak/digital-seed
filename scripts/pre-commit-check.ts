#!/usr/bin/env bun
/**
 * Digital Seed Pre-Commit Boundary Check
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

// Canonical secret regex set — kept in sync with the bash pre-commit hook
// (seed.ts -> preCommitHookBody) and the privacy-scan in seed.ts. Catches
// provider keys, DB/conn strings, OAuth client_secret JSON, Slack, AWS,
// Telegram bot tokens, and PEM private keys. Each entry is [label, regex].
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["Anthropic/OpenAI key (sk-…, incl. sk-proj-)", /sk-[A-Za-z0-9_-]{20,}/],
  ["Anthropic key (sk-ant-…)", /sk-ant-[A-Za-z0-9-]{20,}/],
  ["Google API key (AIza…)", /AIza[0-9A-Za-z_-]{30,}/],
  ["GitHub token (ghp_…)", /ghp_[A-Za-z0-9_]{20,}/],
  ["GitHub OAuth token (gho_…)", /gho_[A-Za-z0-9_]{20,}/],
  ["GitHub fine-grained PAT (github_pat_…)", /github_pat_[A-Za-z0-9_]{20,}/],
  ["Stripe secret key (sk_live_/sk_test_)", /sk_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["DB/connection string with inline credentials", /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/i],
  ["OAuth client_secret JSON", /"client_secret"\s*:\s*"[^"]+"/],
  ["Slack token (xox…)", /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key id (AKIA…)", /AKIA[0-9A-Z]{16}/],
  ["Telegram bot token", /[0-9]{6,}:[A-Za-z0-9_-]{30,}/],
  ["PEM private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

// Read only +-added lines from the staged diff so that deletions or
// documentation that merely mentions a prefix do not trigger a block.
function getStagedAdditions(): string {
  try {
    const diff = execSync("git diff --cached --diff-filter=ACM", {
      encoding: "utf-8",
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    });
    return diff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .join("\n");
  } catch {
    return "";
  }
}

const additions = getStagedAdditions();
const secretHits: string[] = [];
for (const [label, rx] of SECRET_PATTERNS) {
  if (rx.test(additions)) secretHits.push(label);
}

const result = validateShareBoundary(staged, root);
console.log(result.summary);

if (secretHits.length > 0) {
  console.error("");
  console.error("❌ BLOCKED: staged changes contain likely secret(s):");
  for (const label of secretHits) console.error(`   - ${label}`);
  console.error("   Move the secret to .env (git-ignored) and commit again.");
  console.error("   To override (not recommended): git commit --no-verify ...");
}

process.exit(result.safe && secretHits.length === 0 ? 0 : 1);
