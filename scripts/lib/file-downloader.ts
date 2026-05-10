/**
 * File download library — download files from URLs, upload to Google Drive.
 *
 * Uses native fetch() for downloads and `gog` CLI for Drive uploads
 * (same pattern as deck-gen.ts).
 */

import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";
import { Writable } from "stream";

export interface DownloadOptions {
  timeout?: number;       // ms, default 60000
  filename?: string;      // override output filename
  overwrite?: boolean;    // overwrite existing files (default false)
}

export interface BulkOptions extends DownloadOptions {
  concurrency?: number;   // parallel downloads, default 3
}

const DEFAULT_TIMEOUT = 60_000;

// ── Helpers ──────────────────────────────────────────────────────────

function gogAvailable(): boolean {
  try {
    execSync("which gog", { stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathName = parsed.pathname.split("/").pop();
    if (pathName && pathName.includes(".")) return pathName;
  } catch { /* ignore */ }
  return "download-" + Date.now();
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : null;
}

function uniquePath(dir: string, name: string): string {
  let outPath = join(dir, name);
  if (!existsSync(outPath)) return outPath;

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (existsSync(outPath)) {
    outPath = join(dir, `${base}-${i}${ext}`);
    i++;
  }
  return outPath;
}

// ── Download ─────────────────────────────────────────────────────────

/**
 * Download a single file from a URL to destDir.
 * Returns the path of the downloaded file.
 */
export async function downloadFile(
  url: string,
  destDir: string,
  opts: DownloadOptions = {},
): Promise<string> {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? DEFAULT_TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

    // Determine filename
    const cdName = filenameFromContentDisposition(res.headers.get("content-disposition"));
    const name = opts.filename ?? cdName ?? filenameFromUrl(url);
    const outPath = opts.overwrite ? join(destDir, name) : uniquePath(destDir, name);

    // Stream response body to file
    const fileStream = createWriteStream(outPath);
    const body = res.body;
    if (!body) throw new Error("Empty response body");

    const reader = body.getReader();
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        fileStream.write(chunk, callback);
      },
    });

    let totalBytes = 0;
    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writable.write(value);
      totalBytes += value.byteLength;

      // Progress reporting
      if (contentLength > 0) {
        const pct = Math.round((totalBytes / contentLength) * 100);
        process.stdout.write(`\r  📥 ${name}: ${pct}% (${(totalBytes / 1024).toFixed(0)} KB)`);
      } else {
        process.stdout.write(`\r  📥 ${name}: ${(totalBytes / 1024).toFixed(0)} KB`);
      }
    }

    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    console.log(`\n  ✅ Saved: ${outPath}`);
    return outPath;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download multiple files in parallel with a concurrency limit.
 * Returns array of { url, path?, error? } results.
 */
export async function downloadBulk(
  urls: string[],
  destDir: string,
  opts: BulkOptions = {},
): Promise<{ url: string; path?: string; error?: string }[]> {
  const concurrency = opts.concurrency ?? 3;
  const results: { url: string; path?: string; error?: string }[] = [];
  const queue = [...urls];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const url = queue.shift()!;
      try {
        const path = await downloadFile(url, destDir, opts);
        results.push({ url, path });
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`  ❌ Failed: ${url} — ${msg}`);
        results.push({ url, error: msg });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Google Drive ─────────────────────────────────────────────────────

/**
 * Upload a local file to Google Drive via gog CLI.
 * Returns the Drive link or null if upload failed.
 */
export function uploadToDrive(filePath: string): string | null {
  if (!gogAvailable()) {
    console.log("  ⚠️  gog CLI not found. Install it for Drive uploads:");
    console.log("     https://github.com/skratchdot/open-golang or use manual upload.");
    return null;
  }

  try {
    console.log(`  📤 Uploading to Google Drive: ${basename(filePath)}...`);
    const output = execSync(`gog drive upload "${filePath}"`, {
      encoding: "utf-8",
      timeout: 120_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Parse file ID from gog output
    const idMatch = output.match(/(?:id[:\s]+|\/d\/|fileId[:\s]+)([a-zA-Z0-9_-]{20,})/i)
      || output.match(/([a-zA-Z0-9_-]{25,})/);
    if (idMatch) {
      const link = `https://drive.google.com/file/d/${idMatch[1]}/view`;
      console.log(`  ✅ Drive link: ${link}`);
      return link;
    }

    console.log("  📤 Upload output:", output);
    return output || null;
  } catch (e) {
    console.error("  ❌ Drive upload failed:", (e as Error).message?.slice(0, 150));
    return null;
  }
}

/**
 * Download a URL to /tmp, then upload to Google Drive.
 * Returns the Drive link or null.
 */
export async function downloadAndUpload(
  url: string,
  opts: DownloadOptions = {},
): Promise<string | null> {
  const tmpDir = join(process.env.TMPDIR ?? "/tmp", "digital-seed-downloads");
  const localPath = await downloadFile(url, tmpDir, opts);
  return uploadToDrive(localPath);
}
