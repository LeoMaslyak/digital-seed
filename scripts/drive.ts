#!/usr/bin/env bun
/**
 * Google Drive file management CLI.
 *
 * Usage:
 *   bun run seed drive upload <path>
 *   bun run seed drive download <url> [--drive]
 *   bun run seed drive bulk <file.txt> [--drive]
 */

import { existsSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { downloadFile, downloadBulk, uploadToDrive, downloadAndUpload } from "./lib/file-downloader.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const EXPORTS_DIR = join(ROOT, "exports");

const args = process.argv.slice(2);
const subcmd = args[0];

function usage(): void {
  console.log(`
Drive & File Management CLI

COMMANDS
  bun run seed drive upload <file>                 Upload file to Google Drive
  bun run seed drive download <url>                Download file to exports/
  bun run seed drive download <url> --drive        Download + upload to Google Drive
  bun run seed drive bulk <file.txt>               Bulk download from URL list
  bun run seed drive bulk <file.txt> --drive       Bulk download + upload to Google Drive
  bun run seed drive publish-data-room [--dry-run] Sync public data room to Drive

NOTES
  Drive uploads require the gog CLI tool.
  Files are saved to the exports/ directory by default.
  publish-data-room reads scripts/publish-data-room.ts; pass --account EMAIL
  to override the default Drive account.
`.trim());
}

function parseFlag(flag: string): boolean {
  return args.includes(flag);
}

function readUrlFile(filePath: string): string[] {
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  return readFileSync(filePath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

// ── Commands ─────────────────────────────────────────────────────────

function cmdUpload(): void {
  const filePath = args[1];
  if (!filePath) {
    console.error("❌ Usage: bun run seed drive upload <file>");
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const link = uploadToDrive(filePath);
  if (link) {
    console.log(`\n🔗 ${link}`);
  } else {
    console.log("\n📋 Manual upload:");
    console.log("   1. Go to drive.google.com");
    console.log("   2. Click '+ New' → 'File upload'");
    console.log(`   3. Upload: ${filePath}`);
    process.exit(1);
  }
}

async function cmdDownload(): Promise<void> {
  const url = args[1];
  if (!url || url.startsWith("--")) {
    console.error("❌ Usage: bun run seed drive download <url> [--drive]");
    process.exit(1);
  }

  if (!existsSync(EXPORTS_DIR)) mkdirSync(EXPORTS_DIR, { recursive: true });

  if (parseFlag("--drive")) {
    console.log(`📥 Downloading and uploading to Drive...\n`);
    const link = await downloadAndUpload(url);
    if (link) {
      console.log(`\n🔗 ${link}`);
    }
  } else {
    console.log(`📥 Downloading to exports/...\n`);
    await downloadFile(url, EXPORTS_DIR);
  }
}

async function cmdBulk(): Promise<void> {
  const filePath = args[1];
  if (!filePath || filePath.startsWith("--")) {
    console.error("❌ Usage: bun run seed drive bulk <file.txt> [--drive]");
    process.exit(1);
  }

  const urls = readUrlFile(filePath);
  console.log(`📋 Loaded ${urls.length} URL(s) from ${filePath}\n`);

  if (!existsSync(EXPORTS_DIR)) mkdirSync(EXPORTS_DIR, { recursive: true });

  if (parseFlag("--drive")) {
    console.log("📥 Downloading and uploading to Drive...\n");
    for (const url of urls) {
      try {
        const link = await downloadAndUpload(url);
        if (link) console.log(`  🔗 ${link}`);
      } catch (e) {
        console.error(`  ❌ ${url}: ${(e as Error).message}`);
      }
    }
  } else {
    const results = await downloadBulk(urls, EXPORTS_DIR);
    const ok = results.filter((r) => r.path).length;
    const fail = results.filter((r) => r.error).length;
    console.log(`\n📊 Done: ${ok} downloaded, ${fail} failed`);
  }
}

// ── Router ───────────────────────────────────────────────────────────

if (!subcmd || subcmd === "help" || subcmd === "--help" || subcmd === "-h") {
  usage();
  process.exit(0);
}

switch (subcmd) {
  case "upload":
    cmdUpload();
    break;
  case "download":
    await cmdDownload();
    break;
  case "bulk":
    await cmdBulk();
    break;
  case "publish-data-room": {
    const { spawnSync } = await import("child_process");
    const result = spawnSync(
      "bun",
      ["run", join(ROOT, "scripts/publish-data-room.ts"), ...args.slice(1)],
      { stdio: "inherit", cwd: ROOT },
    );
    process.exit(result.status ?? 0);
    break;
  }
  default:
    console.error(`Unknown drive command: ${subcmd}`);
    usage();
    process.exit(1);
}
