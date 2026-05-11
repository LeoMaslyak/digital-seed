#!/usr/bin/env bun
/**
 * Publish the public Digital Seed data room to Google Drive.
 *
 * Idempotent: reads the manifest below, finds the matching public folder by
 * name (or creates the layout if missing), and replaces each target file with
 * the current local version. Existing files in the data room with the same
 * target name are moved to Drive trash before the new file is uploaded.
 *
 * Requires the `gog` Google CLI authenticated to a Drive account that owns
 * (or has editor access to) the public data room folder.
 *
 * Usage:
 *   bun run scripts/publish-data-room.ts [--dry-run] [--account EMAIL]
 *   bun run scripts/publish-data-room.ts --folder <driveFolderId> [--dry-run]
 *
 * Flags:
 *   --dry-run        Print the plan without uploading or deleting.
 *   --account EMAIL  gog account to use (defaults to gog's default account).
 *   --folder ID      Use a specific Drive folder ID instead of searching by name.
 *   --root NAME      Override the expected root folder name.
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { execFileSync } from "child_process";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

interface ManifestEntry {
  folder: string;
  driveName: string;
  source: string;
}

interface FolderPlan {
  name: string;
  driveId?: string;
}

const DEFAULT_ROOT_NAME = "Digital Seed — Public Starter Kit v0.3 (2026-05-10)";

const MANIFEST: ManifestEntry[] = [
  // 00 Start Here
  { folder: "00 Start Here", driveName: "START HERE.md", source: "docs/data-room/start-here.md" },
  { folder: "00 Start Here", driveName: "README — What This Is.md", source: "docs/data-room/readme-what-this-is.md" },
  { folder: "00 Start Here", driveName: "First 15 Minutes.md", source: "docs/first-15-minutes.md" },
  { folder: "00 Start Here", driveName: "Let an AI Agent Install It.md", source: "docs/ai-agent-install.md" },
  { folder: "00 Start Here", driveName: "First Session Prompt.md", source: "docs/first-session-prompt.md" },

  // 01 Visual Story
  { folder: "01 Visual Story", driveName: "Digital Seed — Growth Loop.mp4", source: "docs/assets/digital-seed-growth.mp4" },
  { folder: "01 Visual Story", driveName: "Digital Seed — Growth Loop.webm", source: "docs/assets/digital-seed-growth.webm" },
  { folder: "01 Visual Story", driveName: "Digital Seed — Growth Loop.gif", source: "docs/assets/digital-seed-growth.gif" },
  { folder: "01 Visual Story", driveName: "Digital Seed — Growth Still.png", source: "docs/assets/digital-seed-growth-still.png" },
  { folder: "01 Visual Story", driveName: "Digital Seed - Magical Tree.svg", source: "docs/assets/seed-tree-magic.svg" },
  { folder: "01 Visual Story", driveName: "README.md", source: "docs/data-room/visual-story-readme.md" },

  // 02 Guides
  { folder: "02 Guides", driveName: "Free First Setup.md", source: "docs/free-first-setup.md" },
  { folder: "02 Guides", driveName: "Agent Chooser.md", source: "docs/agent-chooser.md" },
  { folder: "02 Guides", driveName: "Architecture Map.md", source: "docs/architecture-map.md" },
  { folder: "02 Guides", driveName: "Integration Recipes.md", source: "docs/integration-recipes.md" },
  { folder: "02 Guides", driveName: "Dashboard Options.md", source: "docs/dashboard-options.md" },
  { folder: "02 Guides", driveName: "Known Alpha Limits.md", source: "docs/known-alpha-limits.md" },

  // 03 Templates
  { folder: "03 Templates", driveName: "USER.template.md", source: "user/USER.md" },
  { folder: "03 Templates", driveName: "COMPASS.template.md", source: "user/COMPASS.md" },
  { folder: "03 Templates", driveName: "GOALS.template.md", source: "user/GOALS.md" },
  { folder: "03 Templates", driveName: "DOMAINS.template.md", source: "user/DOMAINS.md" },
  { folder: "03 Templates", driveName: "PREFERENCES.template.md", source: "user/PREFERENCES.md" },
  { folder: "03 Templates", driveName: "ANTI-GOALS.template.md", source: "user/ANTI-GOALS.md" },
  { folder: "03 Templates", driveName: "MEMORY.template.md", source: "user/MEMORY.md" },

  // 04 Recipes
  { folder: "04 Recipes", driveName: "Recipes Overview.md", source: "recipes/README.md" },
  { folder: "04 Recipes", driveName: "obsidian.md", source: "recipes/obsidian/README.md" },
  { folder: "04 Recipes", driveName: "google-drive.md", source: "recipes/google-drive/README.md" },
  { folder: "04 Recipes", driveName: "telegram-bot.md", source: "recipes/telegram-bot/README.md" },
  { folder: "04 Recipes", driveName: "openclaw-agent.md", source: "recipes/openclaw-agent/README.md" },
  { folder: "04 Recipes", driveName: "hermes-agent.md", source: "recipes/hermes-agent/README.md" },
  { folder: "04 Recipes", driveName: "claude-code-project.md", source: "recipes/claude-code-project/README.md" },
  { folder: "04 Recipes", driveName: "github-repo-assistant.md", source: "recipes/github-repo-assistant/README.md" },

  // 05 Audit and Safety
  { folder: "05 Audit and Safety", driveName: "Governance.md", source: "docs/governance.md" },
  { folder: "05 Audit and Safety", driveName: "Audit Response.md", source: "docs/audit-response-2026-05-10.md" },
];

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes("--dry-run"),
  account: argValue("--account"),
  folder: argValue("--folder"),
  rootName: argValue("--root") ?? DEFAULT_ROOT_NAME,
};

function argValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0 || idx === args.length - 1) return undefined;
  return args[idx + 1];
}

function gog(subcmd: string[]): string {
  const base = ["--plain"];
  if (flags.account) base.unshift("--account", flags.account);
  const cmd = [...base, ...subcmd];
  try {
    return execFileSync("gog", cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message: string };
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    throw new Error(`gog ${cmd.join(" ")} failed: ${err.message}\n${stderr || stdout}`);
  }
}

function parseTsv(out: string): Array<Record<string, string>> {
  const lines = out.split("\n").filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return [];
  const header = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    header.forEach((key, i) => (row[key] = cells[i] ?? ""));
    return row;
  });
}

function findRootFolder(): string {
  if (flags.folder) return flags.folder;
  const out = gog(["drive", "search", flags.rootName]);
  const rows = parseTsv(out);
  const folder = rows.find((r) => r.TYPE === "folder" && r.NAME === flags.rootName);
  if (!folder) {
    throw new Error(
      `Could not find Drive folder named "${flags.rootName}". ` +
        `Pass --folder <id> to target a specific folder.`,
    );
  }
  return folder.ID;
}

function listChildren(parent: string): Array<{ id: string; name: string; type: string }> {
  const out = gog(["drive", "ls", "--parent", parent]);
  return parseTsv(out).map((r) => ({ id: r.ID, name: r.NAME, type: r.TYPE }));
}

function ensureFolder(parent: string, name: string): string {
  const existing = listChildren(parent).find((c) => c.type === "folder" && c.name === name);
  if (existing) return existing.id;
  if (flags.dryRun) {
    console.log(`  [dry-run] would create folder: ${name}`);
    return "<dry-run-folder>";
  }
  const out = gog(["drive", "mkdir", name, "--parent", parent]);
  const idMatch = out.match(/([a-zA-Z0-9_-]{20,})/);
  if (!idMatch) throw new Error(`Could not parse new folder id from: ${out}`);
  return idMatch[1];
}

function uploadFile(parent: string, localPath: string, driveName: string): string {
  if (flags.dryRun) {
    const size = statSync(localPath).size;
    console.log(`  [dry-run] would upload ${localPath} -> ${driveName} (${size} bytes)`);
    return "<dry-run-file>";
  }
  const out = gog(["drive", "upload", localPath, "--parent", parent, "--name", driveName]);
  const idMatch = out.match(/([a-zA-Z0-9_-]{25,})/);
  return idMatch ? idMatch[1] : "";
}

function deleteFile(id: string): void {
  if (flags.dryRun) {
    console.log(`  [dry-run] would trash drive file: ${id}`);
    return;
  }
  gog(["drive", "delete", id, "--force"]);
}

function publishEntry(folderId: string, entry: ManifestEntry, existing: Array<{ id: string; name: string; type: string }>): "uploaded" | "skipped" | "failed" {
  const localPath = join(ROOT, entry.source);
  if (!existsSync(localPath)) {
    console.log(`  ⚠️  Missing local source: ${entry.source}`);
    return "skipped";
  }
  const prior = existing.filter((c) => c.type === "file" && c.name === entry.driveName);
  for (const old of prior) deleteFile(old.id);
  try {
    uploadFile(folderId, localPath, entry.driveName);
    console.log(`  ✅ ${entry.folder} / ${entry.driveName}  ← ${entry.source}`);
    return "uploaded";
  } catch (e) {
    console.error(`  ❌ ${entry.folder} / ${entry.driveName}: ${(e as Error).message.split("\n")[0]}`);
    return "failed";
  }
}

function main(): void {
  console.log(`Digital Seed — public data room publisher\n`);
  console.log(`Mode: ${flags.dryRun ? "DRY RUN" : "LIVE"}`);
  if (flags.account) console.log(`Account: ${flags.account}`);

  const rootId = findRootFolder();
  console.log(`Root folder: ${flags.rootName}\n  https://drive.google.com/drive/folders/${rootId}\n`);

  const folderPlans = new Map<string, FolderPlan>();
  for (const entry of MANIFEST) {
    if (!folderPlans.has(entry.folder)) folderPlans.set(entry.folder, { name: entry.folder });
  }

  for (const plan of folderPlans.values()) {
    plan.driveId = ensureFolder(rootId, plan.name);
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const plan of folderPlans.values()) {
    if (!plan.driveId) continue;
    console.log(`\n${plan.name}`);
    const existing = plan.driveId === "<dry-run-folder>" ? [] : listChildren(plan.driveId);
    const entries = MANIFEST.filter((e) => e.folder === plan.name);
    for (const entry of entries) {
      const result = publishEntry(plan.driveId, entry, existing);
      if (result === "uploaded") uploaded++;
      else if (result === "skipped") skipped++;
      else failed++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed.`);
  console.log(`Public link: https://drive.google.com/drive/folders/${rootId}`);
  if (failed > 0) process.exit(1);
}

main();
