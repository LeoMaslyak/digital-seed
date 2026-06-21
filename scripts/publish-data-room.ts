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
 *   --dry-run                    Print the plan without uploading or deleting.
 *   --account EMAIL              gog account to use (defaults to gog's default account).
 *   --folder ID                  Use a specific Drive folder ID instead of searching by name.
 *   --root NAME                  Override the expected root folder name.
 *   --replace-strategy STRATEGY  How to handle existing same-named files.
 *                                  delete (default) — trash old file, then upload. On a
 *                                                     permission error this falls back to
 *                                                     skip-delete for that file unless
 *                                                     --strict is set.
 *                                  skip-delete     — leave old file in place, just upload
 *                                                     the new copy. Drive allows duplicate
 *                                                     names; viewers see the newest by
 *                                                     "modified" date.
 *   --no-delete                  Alias for --replace-strategy skip-delete. Use this when
 *                                publishing into a folder where you do not own all of the
 *                                prior files (e.g. an older shared folder where deletion
 *                                fails with insufficientFilePermissions).
 *   --strict                     Hard-fail if a delete attempt fails. Default is to warn
 *                                and fall back to skip-delete for that file so a single
 *                                permission error does not block the rest of the publish.
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

const DEFAULT_ROOT_NAME = "Digital Seed — Public Starter Kit";

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
  // IMPORTANT: these MUST point at the pristine scaffolds in docs/data-room/templates/,
  // NEVER at the live user/*.md files. The user/ files hold real personal context (and
  // some are gitignored). Sourcing public "templates" from user/ would publish a person's
  // identity, goals, and AI memory to the "anyone with the link" data room. See the
  // hard refusal in publishEntry() and the privacy gate in main().
  { folder: "03 Templates", driveName: "USER.template.md", source: "docs/data-room/templates/USER.template.md" },
  { folder: "03 Templates", driveName: "COMPASS.template.md", source: "docs/data-room/templates/COMPASS.template.md" },
  { folder: "03 Templates", driveName: "GOALS.template.md", source: "docs/data-room/templates/GOALS.template.md" },
  { folder: "03 Templates", driveName: "DOMAINS.template.md", source: "docs/data-room/templates/DOMAINS.template.md" },
  { folder: "03 Templates", driveName: "PREFERENCES.template.md", source: "docs/data-room/templates/PREFERENCES.template.md" },
  { folder: "03 Templates", driveName: "ANTI-GOALS.template.md", source: "docs/data-room/templates/ANTI-GOALS.template.md" },
  { folder: "03 Templates", driveName: "MEMORY.template.md", source: "docs/data-room/templates/MEMORY.template.md" },

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

  // 06 NotebookLM Intro Video
  { folder: "06 NotebookLM Intro Video", driveName: "NotebookLM Intro Source.md", source: "docs/data-room/notebooklm-intro-source.md" },
  { folder: "06 NotebookLM Intro Video", driveName: "NotebookLM Video Instructions.md", source: "docs/notebooklm-intro-video.md" },
];

type ReplaceStrategy = "delete" | "skip-delete";

const args = process.argv.slice(2);
const requestedStrategy = (argValue("--replace-strategy") ?? "delete") as ReplaceStrategy;
const replaceStrategy: ReplaceStrategy = args.includes("--no-delete") ? "skip-delete" : requestedStrategy;

if (!["delete", "skip-delete"].includes(replaceStrategy)) {
  console.error(`Unknown --replace-strategy: ${replaceStrategy}`);
  console.error("Expected one of: delete, skip-delete");
  process.exit(2);
}

const flags = {
  dryRun: args.includes("--dry-run"),
  account: argValue("--account"),
  folder: argValue("--folder"),
  rootName: argValue("--root") ?? DEFAULT_ROOT_NAME,
  replaceStrategy,
  strict: args.includes("--strict"),
};

let permissionFallbacks = 0;

function argValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0 || idx === args.length - 1) return undefined;
  return args[idx + 1];
}

/**
 * Personal-data guard.
 *
 * The public data room is shared "anyone with the link, viewer." Never source a
 * published file from the user's live personal context. This matches both the
 * `user/` directory and the specific gitignored personal files the project labels
 * "personal, never committed" (see `.gitignore`: USER/GOALS/MEMORY/PREFERENCES),
 * regardless of where they live. Returns a human-readable reason if the source is
 * personal, or null if it is safe to publish.
 */
const PERSONAL_SOURCE_PATTERNS: RegExp[] = [
  // Anything under the user/ context directory.
  /(^|\/)user\//i,
  // The gitignored personal files by name, wherever they appear.
  /(^|\/)(USER|GOALS|MEMORY|PREFERENCES|COMPASS|DOMAINS|ANTI-GOALS)\.md$/i,
];

function personalDataReason(source: string): string | null {
  const normalized = source.replace(/\\/g, "/");
  for (const rx of PERSONAL_SOURCE_PATTERNS) {
    if (rx.test(normalized)) {
      return `source "${source}" looks like live personal context (matched ${rx})`;
    }
  }
  return null;
}

/**
 * Run the project's privacy scan as a hard gate before any live publish.
 * `bun run seed privacy-scan` exits non-zero when it finds private leftovers
 * (the same gate release-check.ts uses). We refuse to upload anything if it fails.
 */
function privacyScanPasses(): boolean {
  try {
    execFileSync("bun", ["run", "seed", "privacy-scan"], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "inherit", "inherit"],
    });
    return true;
  } catch {
    return false;
  }
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
    // The per-entry dry-run line (name, PERSONAL-DATA flag, source, size, destination
    // URL) is printed in publishEntry(); avoid a duplicate line here.
    return "<dry-run-file>";
  }
  const out = gog(["drive", "upload", localPath, "--parent", parent, "--name", driveName]);
  const idMatch = out.match(/([a-zA-Z0-9_-]{25,})/);
  return idMatch ? idMatch[1] : "";
}

function isPermissionError(message: string): boolean {
  return /insufficientFilePermissions|forbidden|permission/i.test(message);
}

function deleteFile(id: string, driveName: string): "deleted" | "skipped" {
  if (flags.dryRun) {
    console.log(`  [dry-run] would trash drive file: ${id}`);
    return "deleted";
  }
  try {
    gog(["drive", "delete", id, "--force"]);
    return "deleted";
  } catch (e) {
    const msg = (e as Error).message;
    if (!flags.strict && isPermissionError(msg)) {
      console.warn(
        `  ⚠️  Could not delete prior "${driveName}" (${id}): permission denied. ` +
          `Uploading alongside it instead.`,
      );
      permissionFallbacks++;
      return "skipped";
    }
    throw e;
  }
}

function publishEntry(
  folderId: string,
  entry: ManifestEntry,
  existing: Array<{ id: string; name: string; type: string }>,
): "uploaded" | "skipped" | "failed" {
  // Hard refusal: never publish live personal context to a public folder, even
  // if a future manifest edit (or a forker) repoints a driveName back at user/*.md.
  // This guard is the last line of defense and applies in dry-run too.
  const personalReason = personalDataReason(entry.source);
  if (personalReason) {
    console.error(
      `  ⛔ REFUSED ${entry.folder} / ${entry.driveName}: ${personalReason}.\n` +
        `     Public data-room sources must NEVER be live personal files. Point this\n` +
        `     entry at a pristine scaffold under docs/data-room/templates/ instead.`,
    );
    return "failed";
  }

  const localPath = join(ROOT, entry.source);
  if (!existsSync(localPath)) {
    console.log(`  ⚠️  Missing local source: ${entry.source}`);
    return "skipped";
  }

  if (flags.dryRun) {
    const size = statSync(localPath).size;
    const destUrl =
      folderId && folderId !== "<dry-run-folder>"
        ? `https://drive.google.com/drive/folders/${folderId}`
        : "(folder will be created on first live publish)";
    console.log(`  → ${entry.driveName}  [PERSONAL-DATA: NO]  ← ${entry.source} (${size} bytes)`);
    console.log(`      destination folder: ${destUrl}`);
  }

  const prior = existing.filter((c) => c.type === "file" && c.name === entry.driveName);

  if (flags.replaceStrategy === "delete") {
    for (const old of prior) deleteFile(old.id, entry.driveName);
  } else if (flags.replaceStrategy === "skip-delete" && prior.length > 0) {
    console.log(
      `  ↪︎ ${entry.driveName}: leaving ${prior.length} prior copy/copies in place (--no-delete).`,
    );
  }

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
  console.log(`Replace strategy: ${flags.replaceStrategy}${flags.strict ? " (strict)" : ""}`);
  if (flags.account) console.log(`Account: ${flags.account}`);

  // Manifest self-check: never start with a manifest that would publish live
  // personal context, even in dry-run. Fails closed.
  const personalEntries = MANIFEST.filter((e) => personalDataReason(e.source) !== null);
  if (personalEntries.length > 0) {
    console.error(`\n⛔ Refusing to run: the manifest sources live personal data.`);
    for (const e of personalEntries) {
      console.error(`   - ${e.folder} / ${e.driveName}  ← ${e.source}`);
    }
    console.error(
      `\n   Public data-room entries must point at pristine scaffolds under\n` +
        `   docs/data-room/templates/, never at user/*.md. Fix the manifest and re-run.`,
    );
    process.exit(2);
  }

  // Privacy gate: before any LIVE upload, require the project privacy scan to pass.
  // Dry-run is exempt (it uploads nothing) but still benefits from the manifest
  // self-check above.
  if (!flags.dryRun) {
    console.log(`\nRunning privacy scan before publishing…`);
    if (!privacyScanPasses()) {
      console.error(
        `\n⛔ Refusing to publish: privacy scan did not pass. Fix the reported items\n` +
          `   (or run "bun run seed privacy-scan" to inspect) and re-run.`,
      );
      process.exit(2);
    }
    console.log(`Privacy scan passed; continuing with publish.\n`);
  }

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
  if (permissionFallbacks > 0) {
    console.log(
      `⚠️  ${permissionFallbacks} prior file(s) could not be deleted due to ` +
        `Drive permissions; new copies were uploaded alongside them. ` +
        `Re-run with --strict to fail loudly instead, or with --no-delete ` +
        `to skip the delete attempt entirely.`,
    );
  }
  console.log(`Public link: https://drive.google.com/drive/folders/${rootId}`);
  if (failed > 0) process.exit(1);
}

main();
