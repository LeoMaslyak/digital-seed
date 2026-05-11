#!/usr/bin/env bun
/**
 * Web fetching & research CLI.
 *
 * Usage:
 *   bun run seed web fetch <url> [--summarize]
 *   bun run seed web scrape <url> --selector <css> [--json]
 *   bun run seed web bulk <file.txt> [--download] [--drive] [--summarize]
 *   bun run seed web research "<query>"
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fetchMarkdown, fetchSelector } from "./lib/web-fetcher.ts";
import { fetchWithBrowser } from "./lib/browser-fetcher.ts";
import { downloadFile, downloadBulk, downloadAndUpload } from "./lib/file-downloader.ts";
import { aiCall } from "./lib/ai-call.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const EXPORTS_DIR = join(ROOT, "exports");

const args = process.argv.slice(2);
const subcmd = args[0];

function usage(): void {
  console.log(`
Web & Research CLI

⚠ Network disclosure: \`fetch\`, \`scrape\`, \`bulk\`, and \`research\` route
   requests through https://r.jina.ai/ . The URL you ask to fetch and any
   search query you type are sent to that endpoint. See:
   docs/what-leaves-your-machine.md → "Digital Seed's own network calls".
   These commands are NOT part of the 15-minute beginner path.

COMMANDS
  bun run seed web fetch <url>                     Fetch URL as AI-readable markdown
  bun run seed web fetch <url> --summarize         Fetch + AI summary
  bun run seed web scrape <url> --selector <css>   Extract CSS-selected elements
  bun run seed web scrape <url> --selector <css> --json   Output as JSON
  bun run seed web bulk <file.txt>                 Batch fetch from URL list
  bun run seed web bulk <file.txt> --download      Batch download files
  bun run seed web bulk <file.txt> --drive         Batch download + upload to Drive
  bun run seed web bulk <file.txt> --summarize     Batch fetch + AI summary each
  bun run seed web research "<query>"              Web research + AI summary

BROWSER MODE
  bun run seed web fetch <url> --browser              Use real browser (JS-heavy sites)
  bun run seed web scrape <url> --selector <css> --browser
`.trim());
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseFlag(flag: string): boolean {
  return args.includes(flag);
}

function parseFlagValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
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

async function cmdFetch(): Promise<void> {
  const url = args[1];
  if (!url || url.startsWith("--")) {
    console.error("❌ Usage: bun run seed web fetch <url> [--summarize] [--browser]");
    process.exit(1);
  }

  console.log(`🔍 Fetching: ${url}`);
  let content: string;
  if (parseFlag("--browser")) {
    try {
      const result = await fetchWithBrowser(url);
      content = result.text;
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      process.exit(1);
    }
  } else {
    content = await fetchMarkdown(url, { maxChars: 50_000 });
  }

  if (parseFlag("--summarize")) {
    console.log("🤖 Summarizing with AI...\n");
    try {
      const summary = await aiCall(
        `Summarize the following web page content in a clear, structured way. Use bullet points for key takeaways.\n\n${content.slice(0, 30_000)}`,
      );
      console.log(summary);
    } catch (e) {
      console.error("⚠️  AI summary failed, showing raw content:", (e as Error).message);
      console.log(content);
    }
  } else {
    console.log(content);
  }
}

async function cmdScrape(): Promise<void> {
  const url = args[1];
  const selector = parseFlagValue("--selector");

  if (!url || url.startsWith("--") || !selector) {
    console.error("❌ Usage: bun run seed web scrape <url> --selector <css> [--json]");
    process.exit(1);
  }

  console.log(`🔍 Scraping: ${url}`);
  console.log(`   Selector: ${selector}`);

  let results: string[];
  if (parseFlag("--browser")) {
    try {
      const browserResult = await fetchWithBrowser(url, { selector });
      results = browserResult.text ? browserResult.text.split("\n").filter(Boolean) : [];
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      process.exit(1);
    }
  } else {
    results = await fetchSelector(url, selector);
  }

  if (results.length === 0) {
    console.log("⚠️  No elements matched that selector.");
    process.exit(0);
  }

  console.log(`✅ Found ${results.length} element(s)\n`);

  if (parseFlag("--json")) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const [i, text] of results.entries()) {
      console.log(`  ${i + 1}. ${text}`);
    }
  }
}

async function cmdBulk(): Promise<void> {
  const filePath = args[1];
  if (!filePath || filePath.startsWith("--")) {
    console.error("❌ Usage: bun run seed web bulk <file.txt> [--download] [--drive] [--summarize]");
    process.exit(1);
  }

  const urls = readUrlFile(filePath);
  console.log(`📋 Loaded ${urls.length} URL(s) from ${filePath}\n`);

  const doDownload = parseFlag("--download") || parseFlag("--drive");
  const doDrive = parseFlag("--drive");
  const doSummarize = parseFlag("--summarize");

  if (doDownload) {
    // Download mode
    if (!existsSync(EXPORTS_DIR)) mkdirSync(EXPORTS_DIR, { recursive: true });

    if (doDrive) {
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
  } else {
    // Fetch content mode
    for (const url of urls) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`🔍 ${url}`);
      try {
        const content = await fetchMarkdown(url, { maxChars: 20_000 });
        if (doSummarize) {
          const summary = await aiCall(
            `Summarize this web page briefly (3-5 bullet points):\n\n${content.slice(0, 15_000)}`,
          );
          console.log(summary);
        } else {
          console.log(content.slice(0, 2000));
          if (content.length > 2000) console.log(`\n  [...${content.length} total chars]`);
        }
      } catch (e) {
        console.error(`  ❌ ${(e as Error).message}`);
      }
    }
  }
}

async function cmdResearch(): Promise<void> {
  const query = args.slice(1).filter((a) => !a.startsWith("--")).join(" ");
  if (!query) {
    console.error("❌ Usage: bun run seed web research \"<query>\"");
    process.exit(1);
  }

  console.log(`🔍 Researching: "${query}"\n`);

  const searchUrl = `https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(query)}`;
  try {
    const results = await fetchMarkdown(searchUrl, { maxChars: 30_000 });

    console.log("🤖 Analyzing results...\n");
    const summary = await aiCall(
      `You are a research assistant for a professional user. Based on the following search results, provide a well-structured research summary with:\n1. Key findings (bullet points)\n2. Notable sources worth reading further\n3. Any conflicting information or caveats\n\nSearch query: "${query}"\n\nSearch results:\n${results.slice(0, 25_000)}`,
    );
    console.log(summary);
  } catch (e) {
    console.error(`❌ Research failed: ${(e as Error).message}`);
    console.log("\nTip: Try a different query or check your internet connection.");
    process.exit(1);
  }
}

// ── Router ───────────────────────────────────────────────────────────

if (!subcmd || subcmd === "help" || subcmd === "--help" || subcmd === "-h") {
  usage();
  process.exit(0);
}

switch (subcmd) {
  case "fetch":
    await cmdFetch();
    break;
  case "scrape":
    await cmdScrape();
    break;
  case "bulk":
    await cmdBulk();
    break;
  case "research":
    await cmdResearch();
    break;
  default:
    console.error(`Unknown web command: ${subcmd}`);
    usage();
    process.exit(1);
}
