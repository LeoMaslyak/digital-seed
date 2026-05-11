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

const USE_ANSI = Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  clear: "\x1b[2J\x1b[H",
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  mint: "\x1b[38;5;121m",
  aqua: "\x1b[38;5;81m",
  gold: "\x1b[38;5;222m",
  violet: "\x1b[38;5;141m",
  muted: "\x1b[38;5;240m",
  text: "\x1b[38;5;250m",
};

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
}

function terminalSeedFrame(frame: number, total: number): string {
  const width = 54;
  const height = 14;
  const phase = (frame % total) / total;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => " "));
  const color = Array.from({ length: height }, () => Array.from({ length: width }, () => ANSI.muted));
  const cx = Math.floor(width / 2);
  const cy = 8;
  const reset = Math.max(0, Math.min(1, (phase - 0.78) / 0.22));
  const grow = Math.sin(Math.PI * Math.min(1, phase / 0.78));

  function put(x: number, y: number, ch: string, c = ANSI.mint) {
    if (x >= 0 && x < width && y >= 0 && y < height) { grid[y][x] = ch; color[y][x] = c; }
  }

  // GitHub-dark friendly terminal artifact: subtle orbit, seed, then data-tree.
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * Math.PI * 2 + phase * Math.PI * 2;
    const rx = 18 + 2 * Math.sin(phase * Math.PI * 2);
    const ry = 4;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy - 1 + Math.sin(a) * ry);
    if (i % 3 === 0) put(x, y, i % 2 ? "·" : "•", i % 4 ? ANSI.aqua : ANSI.gold);
  }

  const trunk = Math.max(0, Math.min(1, (phase - 0.22) / 0.34)) * (1 - reset);
  const canopy = Math.max(0, Math.min(1, (phase - 0.42) / 0.28)) * (1 - reset);
  const roots = Math.max(0, Math.min(1, (phase - 0.12) / 0.24)) * (1 - reset);

  for (let y = 0; y < Math.round(5 * trunk); y++) {
    const sway = y > 2 ? Math.round(Math.sin(phase * Math.PI * 2 + y * 0.7)) : 0;
    put(cx + sway, cy - y, y % 2 ? "╽" : "│", ANSI.mint);
  }

  // Curved leaves/branches, so the terminal form reads as a plant rather than
  // a vertical stick. The tree still remains simple enough for plain terminals.
  const leafPairs = [
    { t: 0.18, y: -2, left: "╰─✦", right: "✦─╮", c: ANSI.gold },
    { t: 0.36, y: -3, left: "╭──✧", right: "✧──╮", c: ANSI.mint },
    { t: 0.54, y: -4, left: "╰──✦", right: "✦──╯", c: ANSI.aqua },
    { t: 0.72, y: -5, left: "  ✧", right: "✧  ", c: ANSI.gold },
  ];
  for (const leaf of leafPairs) {
    if (canopy < leaf.t) continue;
    const y = cy + leaf.y;
    for (let i = 0; i < leaf.left.length; i++) put(cx - 1 - leaf.left.length + i, y, leaf.left[i], leaf.c);
    for (let i = 0; i < leaf.right.length; i++) put(cx + 2 + i, y, leaf.right[i], leaf.c);
  }
  if (canopy > 0.82) {
    put(cx - 1, cy - 6, "✧", ANSI.mint);
    put(cx, cy - 6, "✦", ANSI.gold);
    put(cx + 1, cy - 6, "✧", ANSI.mint);
  }

  const rootRows = Math.round(4 * roots);
  for (let r = 1; r <= rootRows; r++) {
    put(cx - r * 2, cy + r, "╲", ANSI.aqua);
    put(cx + r * 2, cy + r, "╱", ANSI.aqua);
    if (r > 1) {
      put(cx - r * 2 - 1, cy + r, "·", ANSI.mint);
      put(cx + r * 2 + 1, cy + r, "·", ANSI.mint);
    }
  }

  const seedPulse = phase < 0.18 || phase > 0.82 ? "◉" : "✺";
  put(cx, cy, seedPulse, ANSI.gold);
  put(cx - 1, cy, "(", ANSI.gold);
  put(cx + 1, cy, ")", ANSI.gold);

  const lines = grid.map((row, y) => row.map((ch, x) => `${color[y][x]}${ch}`).join("") + ANSI.reset);
  return [
    `${ANSI.bold}${ANSI.mint}🌱 Digital Seed${ANSI.reset} ${ANSI.dim}— grow your personal AI context${ANSI.reset}`,
    "",
    ...lines,
    "",
    `${ANSI.text}local-first · agent-neutral · privacy-aware${ANSI.reset}`,
  ].join("\n");
}

function printTerminalSeedIntro(options: { animate?: boolean; frames?: number; delayMs?: number } = {}): void {
  const frames = options.frames ?? 54;
  const delayMs = options.delayMs ?? 55;
  const animate = options.animate ?? (process.stdout.isTTY && !process.env.CI);
  if (!animate) {
    const frame = terminalSeedFrame(Math.floor(frames * 0.55), frames);
    console.log(USE_ANSI ? frame : stripAnsi(frame));
    return;
  }
  process.stdout.write(ANSI.hide);
  try {
    for (let i = 0; i < frames; i++) {
      process.stdout.write(ANSI.clear + terminalSeedFrame(i, frames));
      sleep(delayMs);
    }
    process.stdout.write("\n");
  } finally {
    process.stdout.write(ANSI.show + ANSI.reset);
  }
}


function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if ([".git", "node_modules", "exports", "data", "logs"].includes(entry)) continue;
    const full = join(dir, entry);
    const rel = full.startsWith(ROOT) ? full.slice(ROOT.length + 1) : full;
    if (rel === "data/rag" || rel.startsWith("data/rag/")) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (st.isFile()) out.push(full);
  }
  return out;
}


function printOnboard(options: { plain?: boolean } = {}): void {
  const plain = options.plain ?? false;
  if (!plain) {
    printTerminalSeedIntro({ animate: process.stdout.isTTY && !process.env.CI, frames: 48, delayMs: 45 });
    console.log("");
  }
  const h = (text: string) => (plain || !USE_ANSI ? text : `${ANSI.bold}${ANSI.mint}${text}${ANSI.reset}`);
  const cmd = (text: string) => (plain || !USE_ANSI ? text : `${ANSI.gold}${text}${ANSI.reset}`);
  const dim = (text: string) => (plain || !USE_ANSI ? text : `${ANSI.dim}${text}${ANSI.reset}`);
  const lines = [
    h("Digital Seed — first 15 minutes"),
    dim("The five-step canonical path. Stop after step 5 until something is actually useful."),
    "",
    h("1. Check setup"),
    `   ${cmd("bun run seed doctor")}`,
    "",
    h("2. Open the three core context files"),
    "   user/USER.md      who you are",
    "   user/COMPASS.md   direction, values, priorities",
    "   user/GOALS.md     what you are trying to accomplish",
    "",
    h("3. Open your agent in this folder and paste the first prompt"),
    `   ${cmd("claude")}  ${dim("# or: cursor .  · windsurf .  · another terminal-capable agent")}`,
    `   ${cmd("bun run seed first-prompt")}`,
    "",
    h("4. Optional — index one notes folder for local search"),
    `   ${cmd("bun run seed index ~/Documents/Notes")}`,
    `   ${cmd('bun run seed search "what do my notes say about my goals?"')}`,
    "",
    h("5. Pick one recipe and stop"),
    `   ${cmd("bun run seed recipe list")}`,
    "",
    dim("Rule: do not connect email, messaging, or cloud automation until the local workflow is useful."),
    dim("Full guide: docs/first-15-minutes.md"),
  ];
  const text = lines.join("\n");
  console.log(plain || !USE_ANSI ? stripAnsi(text) : text);
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
    /(?:email|mail)\s*[:=]\s*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /(?:phone|mobile|tel)\s*[:=]\s*\+?\d[\d\s().-]{8,}\d/i,
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
  bun run seed onboard                 Show the first 15-minute path (animated)
  bun run seed onboard --plain         Same path, no animation or color
  bun run seed intro                   Show the terminal Digital Seed intro
  bun run seed first-prompt            Print the first agent prompt
  bun run seed privacy-scan            Check for common private leftovers
  bun run seed visual-qa               Check hero GIF dimensions/loop/seam
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
  bun run seed drive publish-data-room             Sync public data room to Drive

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
else if (cmd === "onboard" || cmd === "init") { printOnboard({ plain: rest.includes("--plain") }); }
else if (cmd === "intro") {
  const framesArg = rest.find((arg) => arg.startsWith("--frames="));
  const delayArg = rest.find((arg) => arg.startsWith("--delay="));
  const frames = framesArg ? Number(framesArg.split("=")[1]) : 72;
  const delayMs = delayArg ? Number(delayArg.split("=")[1]) : 55;
  printTerminalSeedIntro({ animate: !rest.includes("--static") && USE_ANSI, frames, delayMs });
}
else if (cmd === "first-prompt") { printFirstPrompt(); }
else if (cmd === "privacy-scan") { privacyScan(); }
else if (cmd === "visual-qa") {
  const result = spawnSync("python3", [join(ROOT, "scripts/visual-qa.py"), ...rest], {
    stdio: "inherit",
    cwd: ROOT,
  });
  process.exit(result.status ?? 0);
}
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
