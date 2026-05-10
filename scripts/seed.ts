#!/usr/bin/env bun
/**
 * Digital Seed — Unified CLI entry point.
 *
 * One command to rule them all. Delegates to the appropriate sub-CLI.
 *
 * Usage:
 *   bun run seed <command> [args...]
 *
 * Commands:
 *   install  <id>        Install a pattern or pack  (→ marketplace install)
 *   publish  <dir>       Publish a pattern to community (→ marketplace publish)
 *   rate     <id> <n>    Rate a pattern 1–5        (→ marketplace rate)
 *   patterns             List all patterns         (→ marketplace list)
 *   packs                List all skill packs     (→ marketplace list --tag professional)
 *
 *   collab   [...]       All collaboration commands (→ collab)
 *   digest   [flags]     Daily digest              (→ digest)
 *   status               Activity state + offline mode
 *
 *   learn    <owner/repo> Index a GitHub repo       (→ repo-bot learn)
 *   search   <query>     Search all indexed repos  (→ repo-bot search-all)
 *
 *   task     <name>      Run an autonomous task    (→ run-task)
 *   tokens               Token usage report        (→ token-report)
 *   health               System health check       (→ health-check)
 */

import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { detectActivityState, describeState } from "../core/src/activity-state.ts";
import { describeOfflineMode } from "../core/src/offline-mode.ts";

const ROOT   = join(dirname(new URL(import.meta.url).pathname), "..");
const args   = process.argv.slice(2);
const cmd    = args[0];
const rest   = args.slice(1);

function run(script: string, scriptArgs: string[]): void {
  const result = spawnSync("bun", ["run", script, ...scriptArgs], {
    stdio: "inherit",
    cwd: ROOT,
  });
  process.exit(result.status ?? 0);
}

function usage(): void {
  console.log(`
Digital Seed — Personal AI Infrastructure

PATTERNS
  bun run seed install <id>            Install pattern or pack
  bun run seed install pack:finance    Install Finance skill pack
  bun run seed publish <pattern-dir>   Publish pattern (opens PR flow)
  bun run seed rate <id> <1-5>         Rate a pattern
  bun run seed patterns                Browse all patterns
  bun run seed packs                   Browse skill packs

COLLABORATION
  bun run seed collab create <name>    New shared project
  bun run seed collab group create ..  New shared learning group
  bun run seed collab export <id>      Export project/group to markdown
  bun run seed collab summary          Overview of all collab activity
  bun run seed collab [...]            All collab commands

DAILY DIGEST
  bun run seed digest                  Today's digest (markdown)
  bun run seed digest --text           Plain text (Telegram-safe)
  bun run seed digest --deliver        Generate + deliver

REPO LEARNING
  bun run seed learn owner/repo        Index a GitHub repo for search
  bun run seed search "<query>"        Search all indexed repos

WEB & RESEARCH
  bun run seed web fetch <url>                     Fetch URL as AI-readable markdown
  bun run seed web fetch <url> --summarize         Fetch + AI summary
  bun run seed web scrape <url> --selector h2      Extract CSS-selected elements
  bun run seed web bulk urls.txt                   Batch fetch from URL list
  bun run seed web bulk urls.txt --download        Batch download files
  bun run seed web research "<query>"              Web research + AI summary

FILE MANAGEMENT
  bun run seed drive upload <file>                 Upload file to Google Drive
  bun run seed drive download <url>                Download file locally
  bun run seed drive download <url> --drive        Download + upload to Google Drive
  bun run seed drive bulk urls.txt --drive         Bulk download → Google Drive

ANALYSIS
  bun run seed excel dcf|ratios|project   Generate Excel template
  bun run seed excel dcf --fill --case 'Nestlé'  AI-generated assumptions
  bun run seed excel dcf --fill --case 'Nestlé' --web    Fetch live web context before AI fill
  bun run seed excel                   List available templates
  bun run seed deck project|strategy|finance  Generate slide deck (rich layouts)
  bun run seed deck project --fill --case 'Nestlé sustainability'  Claude-generated content
  bun run seed deck project --fill --case 'Nestlé' --web    Same for slide decks
  bun run seed deck project --fill --case 'Nestlé' --format google-slides  Upload to Google Slides
  bun run seed deck                    List available templates

SYSTEM
  bun run seed update                  Check and apply updates
  bun run seed update --yes            Skip confirmation
  bun run seed status                  Activity state + offline mode
  bun run seed schedule                View pending/upcoming tasks
  bun run seed schedule clear          Remove completed tasks
  bun run seed task <name>             Run an autonomous task
  bun run seed tokens                  Token usage report
  bun run seed health                  System health check
`.trim());
}

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  usage();
  process.exit(0);
}

// ── Pattern marketplace shortcuts ─────────────────────────────────────────────
if (cmd === "install")  { run("scripts/marketplace.ts", ["install", ...rest]); }
else if (cmd === "publish") { run("scripts/marketplace.ts", ["publish", ...rest]); }
else if (cmd === "rate")    { run("scripts/marketplace.ts", ["rate", ...rest]); }
else if (cmd === "patterns"){ run("scripts/marketplace.ts", ["list"]); }
else if (cmd === "packs")   { run("scripts/marketplace.ts", ["list", "--packs-only"]); }

// ── Collaboration ──────────────────────────────────────────────────────────────
else if (cmd === "collab")  { run("scripts/collab.ts", rest); }

// ── Daily digest ──────────────────────────────────────────────────────────────
else if (cmd === "digest")  { run("scripts/digest.ts", rest); }

// ── Repo bot ──────────────────────────────────────────────────────────────────
else if (cmd === "learn")   { run("scripts/repo-bot.ts", ["learn", ...rest]); }
else if (cmd === "search")  { run("scripts/repo-bot.ts", ["search-all", ...rest]); }
else if (cmd === "repos")   { run("scripts/repo-bot.ts", ["list"]); }

// ── Web & Drive ──────────────────────────────────────────────────────────────
else if (cmd === "web")   { run("scripts/web.ts", rest); }
else if (cmd === "drive") { run("scripts/drive.ts", rest); }

// ── Analysis ──────────────────────────────────────────────────────────────────
else if (cmd === "excel") { run("scripts/excel-gen.ts", rest); }
else if (cmd === "deck")  { run("scripts/deck-gen.ts", rest); }

// ── System ────────────────────────────────────────────────────────────────────
else if (cmd === "update") { run("scripts/update.ts", rest); }
else if (cmd === "status") {
  const state = detectActivityState(ROOT);
  console.log(describeState(state));
  console.log("");
  console.log(describeOfflineMode(ROOT));
}
else if (cmd === "schedule") {
  const pendingPath = join(ROOT, "data", "pending-tasks.json");
  if (!existsSync(pendingPath)) {
    console.log("No scheduled tasks. Add tasks via config/autonomy.yaml or: bun run task <name>");
    process.exit(0);
  }

  interface PendingTask {
    id: string; name: string; category: string;
    scheduledAt: string; prompt: string; priority: string;
    status?: string;
  }

  let tasks: PendingTask[] = [];
  try { tasks = JSON.parse(readFileSync(pendingPath, "utf-8")); } catch { /* empty or invalid */ }

  if (rest[0] === "clear") {
    const before = tasks.length;
    tasks = tasks.filter((t) => t.status !== "completed");
    writeFileSync(pendingPath, JSON.stringify(tasks, null, 2) + "\n", "utf-8");
    console.log(`✅ Cleared ${before - tasks.length} completed task(s). ${tasks.length} remaining.`);
    process.exit(0);
  }

  if (tasks.length === 0) {
    console.log("No scheduled tasks. Add tasks via config/autonomy.yaml or: bun run task <name>");
    process.exit(0);
  }

  console.log(`\n📅 Scheduled Tasks (${tasks.length})\n`);
  for (const t of tasks) {
    const time = t.scheduledAt ? new Date(t.scheduledAt).toLocaleString() : "—";
    const status = t.status ?? "pending";
    const icon = status === "completed" ? "✅" : status === "running" ? "🔄" : "⏳";
    console.log(`  ${icon} ${t.name.padEnd(24)} ${t.category.padEnd(18)} ${time}  [${t.priority}]`);
  }
  console.log("\n  Clear completed: bun run seed schedule clear");
}
else if (cmd === "task")    { run("scripts/run-task.ts", rest); }
else if (cmd === "tokens")  { run("scripts/token-report.ts", rest); }
else if (cmd === "health")  { run("scripts/health-check.ts", rest); }

// ── Unknown ───────────────────────────────────────────────────────────────────
else {
  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}
