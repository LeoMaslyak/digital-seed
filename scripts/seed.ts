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
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
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


function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if ([".git", "node_modules", "exports", "data/rag"].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (st.isFile()) out.push(full);
  }
  return out;
}


function printOnboard(): void {
  const lines = [
    "Digital Seed — first 15 minutes",
    "",
    "1. Check setup",
    "   bun run seed doctor",
    "",
    "2. Open the three core context files",
    "   user/USER.md",
    "   user/COMPASS.md",
    "   user/GOALS.md",
    "",
    "3. Paste this into your AI agent",
    "   Read my Digital Seed context files. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.",
    "",
    "4. Pick one real folder to search, if you have one",
    "   bun run seed index ~/Documents/Notes",
    "   bun run seed search \"what do my notes say about my goals?\"",
    "",
    "5. Choose one next recipe only",
    "   bun run seed recipe list",
    "",
    "Rule: do not connect email, messaging, or cloud automation until the local workflow is useful.",
    "",
    "Full guide: docs/first-15-minutes.md",
  ];
  console.log(lines.join("\n"));
}

function printFirstPrompt(): void {
  console.log("Read my Digital Seed context files. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.");
}

function privacyScan(): void {
  const denyTerms = [
    "IE" + "SE",
    "D&" + "AI",
    "Leo" + " M",
    "Co" + "hort",
    "PE" + " career",
    "bu" + "lge" + "-bracket",
    "Ex" + "change",
  ];
  const escapeRegExp = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const risky = [
    ...denyTerms.map((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")),
    /passport\s*[:=]/i,
    /ghp_[A-Za-z0-9_]+/,
    /sk-[A-Za-z0-9]{20,}/,
    /BEGIN (RSA|OPENSSH) PRIVATE KEY/,
    /(api[_-]?key|secret|token)\s*[:=]\s*[\'"][^\'"]{8,}/i,
  ];
  const allow = ["docs/hostile-audit-2026-05-10.md"];
  const hits: string[] = [];
  for (const file of walkFiles(ROOT)) {
    const rel = file.slice(ROOT.length + 1);
    if (allow.includes(rel) || /\.(png|jpg|jpeg|gif|webp|pdf|lock)$/i.test(rel)) continue;
    let text = "";
    try { text = readFileSync(file, "utf-8"); } catch { continue; }
    for (const rx of risky) {
      if (rx.test(text)) { hits.push(`${rel}: ${rx}`); break; }
    }
  }
  if (hits.length === 0) {
    console.log("✅ Privacy scan clean: no common private leftovers found.");
  } else {
    console.log("⚠️ Privacy scan found items to review:\n");
    for (const h of hits.slice(0, 50)) console.log(`  - ${h}`);
    if (hits.length > 50) console.log(`  …and ${hits.length - 50} more`);
    process.exit(1);
  }
}


function localSearch(query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) {
    console.error('Usage: bun run seed search "what do I know about X?"');
    process.exit(1);
  }
  const fallbackPath = join(ROOT, "data", "rag", "vectors.json");
  if (!existsSync(fallbackPath)) {
    console.log("No local index found yet.");
    console.log("Create one with: bun run seed index <folder>");
    return;
  }
  let docs: Array<{content: string; source: string; indexedAt?: string}> = [];
  try {
    const store = JSON.parse(readFileSync(fallbackPath, "utf-8"));
    docs = Array.isArray(store.documents) ? store.documents : [];
  } catch {
    console.error("Could not read data/rag/vectors.json. Rebuild with: bun run seed index <folder>");
    process.exit(1);
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = docs.map(d => {
    const text = `${d.source}\n${d.content}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = text.split(term).length - 1;
      score += matches;
    }
    if (text.includes(q)) score += 10;
    return { ...d, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

  if (scored.length === 0) {
    console.log(`No local matches for: ${query}`);
    console.log("Try fewer words, or run: bun run seed index <folder>");
    return;
  }

  console.log(`\nLocal search results for: ${query}\n`);
  for (const [i, d] of scored.entries()) {
    const rel = d.source.startsWith(ROOT) ? d.source.slice(ROOT.length + 1) : d.source;
    const snippet = d.content.replace(/\s+/g, " ").slice(0, 260);
    console.log(`${i + 1}. ${rel}`);
    console.log(`   ${snippet}${d.content.length > 260 ? "…" : ""}`);
    console.log("");
  }
}

function recipe(args: string[]): void {
  const recipesDir = join(ROOT, "recipes");
  if (args[0] === "list" || !args[0]) {
    console.log("Digital Seed recipes:\n");
    for (const entry of readdirSync(recipesDir).filter(x => x !== "README.md").sort()) {
      console.log(`  - ${entry}`);
    }
    console.log("\nOpen one with: open recipes/<name>/README.md");
    return;
  }
  const name = args[0];
  const action = args[1];
  if ((name === "openclaw" || name === "hermes") && action === "init") {
    const outDir = join(ROOT, "user", "agent-drafts");
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `${name}-context.md`);
    writeFileSync(out, `# ${name[0].toUpperCase() + name.slice(1)} Digital Seed Context Draft\n\nUse this as a starting point. Review before connecting external accounts.\n\n- Project root: ${ROOT}\n- First prompt: Read my Digital Seed context files. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.\n- Default safety: draft/confirm before sending, publishing, uploading, or deleting.\n- Local-first retrieval: start with local folders before hosted vector databases.\n`, "utf-8");
    console.log(`✅ Wrote ${out}`);
    return;
  }
  console.error(`Unknown recipe command: ${args.join(" ")}`);
  console.log("Try: bun run seed recipe list");
  process.exit(1);
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

BEGINNER SETUP
  bun run seed doctor                  Friendly setup health check
  bun run seed onboard                 Show the first 15-minute path
  bun run seed first-prompt            Print the first agent prompt
  bun run seed privacy-scan            Check for common private leftovers
  bun run seed recipe list             List integration recipes
  bun run seed recipe openclaw init    Draft OpenClaw setup context
  bun run seed recipe hermes init      Draft Hermes setup context
  bun run seed index <folder>          Build local retrieval index

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
  bun run seed search "<query>"        Search your local retrieval index

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
  bun run seed excel dcf --fill --topic 'Sample project'  AI-generated assumptions
  bun run seed excel dcf --fill --topic 'Sample project' --web    Fetch live web context before AI fill
  bun run seed excel                   List available templates
  bun run seed deck project|strategy|finance  Generate slide deck (rich layouts)
  bun run seed deck project --fill --topic 'project roadmap'  Claude-generated content
  bun run seed deck project --fill --topic 'Sample project' --web    Same for slide decks
  bun run seed deck project --fill --topic 'Sample project' --format google-slides  Upload to Google Slides
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
else if (cmd === "doctor")  { run("scripts/health-check.ts", rest); }
else if (cmd === "onboard" || cmd === "init") { printOnboard(); }
else if (cmd === "first-prompt") { printFirstPrompt(); }
else if (cmd === "privacy-scan") { privacyScan(); }
else if (cmd === "recipe") { recipe(rest); }
else if (cmd === "index") {
  if (rest[0] && !rest[0].startsWith("--")) run("scripts/embed.ts", ["--path", rest[0], ...rest.slice(1)]);
  else run("scripts/embed.ts", rest);
}

// ── Collaboration ──────────────────────────────────────────────────────────────
else if (cmd === "collab")  { run("scripts/collab.ts", rest); }

// ── Daily digest ──────────────────────────────────────────────────────────────
else if (cmd === "digest")  { run("scripts/digest.ts", rest); }

// ── Repo bot ──────────────────────────────────────────────────────────────────
else if (cmd === "learn")   { run("scripts/repo-bot.ts", ["learn", ...rest]); }
else if (cmd === "search")  {
  if (rest.length === 0) { console.error("Usage: bun run seed search \"query\""); process.exit(1); }
  localSearch(rest.join(" "));
}
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
