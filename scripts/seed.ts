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
    dim("   How to open these:"),
    dim("   - In your editor (recommended): open the digital-seed folder in VS Code,"),
    dim("     Cursor, Windsurf, or any editor, then click each file under user/."),
    dim("   - From the terminal: `open user/USER.md` (macOS) or"),
    dim("     `xdg-open user/USER.md` (Linux). On any system, `code user/USER.md`"),
    dim("     works if VS Code or Cursor is on PATH."),
    dim("   Rough notes are fine. You can come back and edit any time."),
    "",
    h("3. Open your agent in this folder and paste the first prompt"),
    dim("   Need to install an agent first?"),
    dim("   • Claude Code (easiest): docs/install-claude-code.md   claude.ai account required"),
    dim("   • Codex CLI (OpenAI):   npm install -g @openai/codex   OpenAI account required"),
    dim("   • Gemini CLI (Google):  npm install -g @google/gemini-cli, then run gemini   Google account required"),
    dim("   • Ollama (local/free):  https://ollama.ai   no account, no cloud"),
    dim("   Full comparison: docs/agent-chooser.md"),
    `   ${cmd("claude")}  ${dim("# or: cursor .  · windsurf .  · another terminal-capable agent")}`,
    `   ${cmd("bun run seed first-prompt")}`,
    "",
    dim("   Two-pane / copy-paste flow:"),
    dim("   - Pane A (this shell): run `bun run seed first-prompt`. The full prompt prints."),
    dim("   - Pane B (your agent): in a second terminal tab (or split pane), run"),
    dim("     `claude` (or `cursor .` / `windsurf .`) from inside this folder."),
    dim("   - Copy the printed prompt from Pane A, paste it into the agent in Pane B,"),
    dim("     and let it interview you. No keyboard tricks required — just select the"),
    dim("     text in your terminal and copy/paste."),
    "",
    h("4. Optional — index one notes folder for local search"),
    `   ${cmd("bun run seed index ~/Documents/Notes")}`,
    `   ${cmd('bun run seed search "what do my notes say about my goals?"')}`,
    "",
    h("5. Pick one recipe and stop"),
    `   ${cmd("bun run seed recipe list")}`,
    "",
    h("Optional — write a first-win prompt"),
    `   ${cmd("bun run seed onboard --write-first-win")}  ${dim("# creates user/FIRST-WIN.md if missing")}`,
    "",
    dim("Rule: do not connect email, messaging, or cloud automation until the local workflow is useful."),
    dim("Stuck? Run: bun run seed feedback"),
    dim("Full guide: docs/first-15-minutes.md · Examples: docs/examples/README.md"),
  ];
  const text = lines.join("\n");
  console.log(plain || !USE_ANSI ? stripAnsi(text) : text);
}

function firstWinTemplate(): string {
  return `# First Win

> Goal: one boring, real first win this week. Edit this file freely — your assistant will read it.

Pick **one** outcome you can finish in under an hour. Resist scope creep.

## The win

_What is the smallest useful thing your assistant can help with this week?_

Examples (delete the ones that do not apply, replace the rest):

- Draft a one-page weekly plan for myself.
- Summarize three documents I have not had time to read.
- Turn rough meeting notes into a clean recap.
- Outline a draft of <thing I keep putting off>.

## Why this one

_One or two sentences. The "why" is what stops the assistant from over-engineering._

## What "done" looks like

_A specific, recognizable end state. If you cannot describe "done", the win is still too vague._

## Constraints

- Time budget: under an hour of my time.
- No new tools, no new accounts, no new automations.
- Stay inside this repo and any local folders I already have.

## Notes after attempting it

_Fill this in after. What worked, what did not, what to try next._
`;
}

function writeFirstWin(options: { force?: boolean } = {}): void {
  const target = join(ROOT, "user", "FIRST-WIN.md");
  if (existsSync(target) && !options.force) {
    console.log(`user/FIRST-WIN.md already exists — leaving it alone.`);
    console.log(`Use --force to overwrite (this replaces your edits).`);
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, firstWinTemplate(), "utf-8");
  console.log(`✅ Wrote user/FIRST-WIN.md`);
  console.log(`   Open it, pick one boring real win, then run: bun run seed first-prompt`);
}

function printFirstPrompt(): void {
  const firstWinPath = join(ROOT, "user", "FIRST-WIN.md");
  const hasFirstWin = existsSync(firstWinPath);
  const base = "Read my Digital Seed context files. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.";
  const prompt = hasFirstWin
    ? `${base} Start from user/FIRST-WIN.md — help me finish that specific win before suggesting anything else.`
    : base;

  const header = USE_ANSI ? `${ANSI.bold}${ANSI.mint}# Copy the prompt below and paste it into your AI agent${ANSI.reset}` : "# Copy the prompt below and paste it into your AI agent";
  const subHeader = USE_ANSI ? `${ANSI.dim}# (open a terminal in this folder and run \`claude\`, or \`cursor .\`, or \`windsurf .\` — then paste.)${ANSI.reset}` : "# (open a terminal in this folder and run `claude`, or `cursor .`, or `windsurf .` — then paste.)";
  const ruler = USE_ANSI ? `${ANSI.dim}----- copy from below this line -----${ANSI.reset}` : "----- copy from below this line -----";
  const endRuler = USE_ANSI ? `${ANSI.dim}----- copy from above this line -----${ANSI.reset}` : "----- copy from above this line -----";

  console.log(header);
  console.log(subHeader);
  console.log(ruler);
  console.log(prompt);
  console.log(endRuler);
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

  // Extra check: tracked user/*.md templates that look filled-in.
  // Heuristic only — flags lines like "Name: Real Name" or "Email: ..." in any
  // user/*.md template still in the working tree. False positives are fine;
  // the check is meant as a "did you mean to commit this?" nudge before pushing.
  const trackedTemplates = ["user/COMPASS.md", "user/ANTI-GOALS.md", "user/DOMAINS.md"];
  const fillIndicators = [
    /^\s*-\s*\*\*Name:\*\*\s+\S/i,
    /^\s*-\s*Name:\s+\S/i,
    /^\s*-\s*Email:\s+\S/i,
    /^\s*-\s*Phone:\s+\S/i,
    /^\s*-\s*\*\*Email:\*\*\s+\S/i,
    /^\s*-\s*\*\*Phone:\*\*\s+\S/i,
  ];
  const templateWarnings: string[] = [];
  for (const rel of trackedTemplates) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    let text = "";
    try { text = readFileSync(full, "utf-8"); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (fillIndicators.some((rx) => rx.test(line))) {
        templateWarnings.push(`${rel}: looks filled in (e.g., '${line.trim().slice(0, 80)}')`);
        break;
      }
    }
  }

  if (hits.length === 0 && templateWarnings.length === 0) {
    console.log("✅ Privacy scan clean: no common private leftovers found.");
    return;
  }
  if (hits.length > 0) {
    console.log("⚠️  Privacy scan found items to review:\n");
    for (const h of hits.slice(0, 50)) console.log(`  - ${h}`);
    if (hits.length > 50) console.log(`  …and ${hits.length - 50} more`);
  }
  if (templateWarnings.length > 0) {
    console.log("");
    console.log("ℹ️  Tracked user/* templates that look filled in (warning, not blocking):");
    for (const w of templateWarnings) console.log(`  - ${w}`);
    console.log("");
    console.log("   These files are git-tracked starter templates. If you put real personal");
    console.log("   content into one, decide whether to keep it private (move the content to");
    console.log("   user/USER.md / GOALS.md / MEMORY.md / PREFERENCES.md, which are ignored)");
    console.log("   or to reset the template to its starter form before pushing.");
  }
  if (hits.length > 0) process.exit(1);
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

function preCommitHookBody(): string {
  // Patterns require an actual key-shaped suffix so that documentation
  // mentioning the prefix (e.g., in SECURITY.md or this hook source) does not
  // trigger the block. Only +-added lines are scanned, so a deletion does not
  // re-flag a removed reference.
  return `#!/usr/bin/env bash
# Digital Seed pre-commit secret-scan hook.
# Installed by: bun run seed hooks install
# Best-effort scan of staged additions for likely API keys / private keys.

ADDED=$(git diff --cached --diff-filter=ACM | grep -E '^\\+' | grep -v '^\\+\\+\\+')
if [ -z "$ADDED" ]; then exit 0; fi

PATTERNS=(
  'ANTHROPIC_API_KEY[[:space:]]*=[[:space:]]*.*sk-[A-Za-z0-9_-]{20,}'
  'OPENAI_API_KEY[[:space:]]*=[[:space:]]*.*sk-[A-Za-z0-9_-]{20,}'
  'GOOGLE_API_KEY[[:space:]]*=[[:space:]]*.*AI[A-Za-z0-9_-]{20,}'
  'sk-ant-[A-Za-z0-9_-]{24,}'
  'sk-proj-[A-Za-z0-9_-]{24,}'
  'ghp_[A-Za-z0-9]{30,}'
  'BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY'
)

for pattern in "\${PATTERNS[@]}"; do
  if echo "$ADDED" | grep -Eq "$pattern"; then
    echo ""
    echo "❌ BLOCKED by Digital Seed pre-commit hook:"
    echo "   A staged addition matches a likely-secret pattern: $pattern"
    echo "   Move the secret to .env (git-ignored) and commit again."
    echo "   To override (not recommended): git commit --no-verify ..."
    echo ""
    exit 1
  fi
done

exit 0
`;
}

function hooksInstall(options: { force?: boolean } = {}): void {
  const gitDir = join(ROOT, ".git");
  if (!existsSync(gitDir)) {
    console.error("❌ This folder is not a git working tree (no .git directory found).");
    console.error("   Clone the repo with git before installing hooks.");
    process.exit(1);
  }
  const hooksDir = join(gitDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });
  const target = join(hooksDir, "pre-commit");
  if (existsSync(target) && !options.force) {
    const current = readFileSync(target, "utf-8");
    if (current.includes("Digital Seed pre-commit secret-scan hook")) {
      console.log("✅ Digital Seed pre-commit hook already installed at .git/hooks/pre-commit");
      console.log("   Pass --force to overwrite.");
      return;
    }
    console.log("⚠️  A non-Digital-Seed pre-commit hook is already installed.");
    console.log(`   Path: ${target}`);
    console.log("   Re-run with --force to replace it (your existing hook will be overwritten).");
    process.exit(1);
  }
  writeFileSync(target, preCommitHookBody(), "utf-8");
  try {
    const { chmodSync } = require("fs");
    chmodSync(target, 0o755);
  } catch (err) {
    console.error(`⚠️  Wrote the hook but could not chmod +x: ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log("✅ Installed Digital Seed pre-commit secret-scan hook.");
  console.log(`   Location: .git/hooks/pre-commit`);
  console.log("   It will refuse commits that contain obvious API-key patterns.");
  console.log("   Remove anytime with: rm .git/hooks/pre-commit");
}

function preCommitHookInstalled(): boolean {
  // Accept any executable pre-commit hook. setup.sh and `seed hooks install`
  // produce different bodies; both qualify as "installed" for the
  // onboard/doctor warning. `seed hooks install --force` still uses the
  // Digital-Seed-specific marker to decide whether to overwrite safely.
  const target = join(ROOT, ".git/hooks/pre-commit");
  return existsSync(target);
}

function recipeDescription(entry: string): string {
  // Extract a one-line description from the first non-heading paragraph of the
  // recipe's README. Falls back to a generic label if the file is missing.
  const readme = join(ROOT, "recipes", entry, "README.md");
  if (!existsSync(readme)) return "(no README — adapt yourself)";
  let text = "";
  try { text = readFileSync(readme, "utf-8"); } catch { return "(could not read README)"; }
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("```")) continue;
    // First narrative line — return its first sentence, capped at 90 chars.
    const sentenceMatch = trimmed.match(/^(.{1,200}?[\.!?])(\s|$)/);
    const sentence = (sentenceMatch ? sentenceMatch[1] : trimmed).replace(/\*+/g, "");
    return sentence.length > 90 ? sentence.slice(0, 87) + "..." : sentence;
  }
  return "(no description in README)";
}

function recipe(args: string[]): void {
  const recipesDir = join(ROOT, "recipes");
  if (args[0] === "list" || !args[0]) {
    console.log("Digital Seed recipes:\n");
    const entries = readdirSync(recipesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => !name.startsWith("_") && !name.startsWith("."))
      .sort();
    const maxLen = entries.reduce((acc, e) => Math.max(acc, e.length), 0);
    for (const entry of entries) {
      const padded = entry.padEnd(maxLen, " ");
      console.log(`  - ${padded}  ${recipeDescription(entry)}`);
    }
    console.log("\nRead one with: open recipes/<name>/README.md");
    console.log("Each recipe explains what it connects to, what stays local, and what to do first.");
    console.log("Recipe template (for contributors): recipes/_template/README.md");
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


function feedbackDraftTemplate(): string {
  return `# Digital Seed Feedback Draft

> Copy this into a GitHub issue, or paste it into your AI agent and ask it to help you clean it up.
> Remove secrets, tokens, private notes, real names, email addresses, and private file paths first.

## What I was trying to do

I was trying to...

## Where I got stuck

- Page or command:
- What happened:
- What I expected:

## Steps I took

1. \`git clone https://github.com/LeoMaslyak/digital-seed.git\`
2. \`cd digital-seed\`
3. \`bun install\`
4. \`bun run seed onboard\`
5. ...

## Output or screenshot

Paste the smallest useful error output here. Remove private data first.

\`\`\`text

\`\`\`

## My setup

- OS: macOS / Linux / WSL2 / other
- Bun version (\`bun --version\`):
- Agent used, if any: Claude Code / Cursor / Windsurf / OpenClaw / Hermes / other

## Impact

- [ ] Blocks the first 15-minute path
- [ ] Makes the docs confusing
- [ ] Affects optional integrations only
- [ ] I am not sure

## Privacy check

- [ ] I removed secrets, tokens, private notes, personal data, and local-only config from this report.
`;
}

function printFeedback(options: { writeDraft?: boolean } = {}): void {
  const issueBase = "https://github.com/LeoMaslyak/digital-seed/issues/new/choose";
  const docsConfusion = "https://github.com/LeoMaslyak/digital-seed/issues/new?template=docs_confusion.yml";
  const firstRun = "https://github.com/LeoMaslyak/digital-seed/issues/new?template=first_run_friction.yml";
  const bug = "https://github.com/LeoMaslyak/digital-seed/issues/new?template=bug_report.yml";
  console.log("Digital Seed feedback — fastest paths");
  console.log("");
  console.log("If the first 15 minutes were confusing:");
  console.log(`  ${firstRun}`);
  console.log("");
  console.log("If a doc page sent you the wrong way:");
  console.log(`  ${docsConfusion}`);
  console.log("");
  console.log("If a command failed:");
  console.log(`  ${bug}`);
  console.log("");
  console.log("Not sure? Choose from all templates:");
  console.log(`  ${issueBase}`);
  console.log("");
  console.log("Want to suggest a wording fix without Git? Open the page on GitHub, click the pencil icon, edit the text, and GitHub will offer to create a PR for you.");
  console.log("Full guide: docs/feedback.md");

  if (options.writeDraft) {
    const outDir = join(ROOT, "user");
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, "FEEDBACK-DRAFT.md");
    writeFileSync(out, feedbackDraftTemplate(), "utf-8");
    console.log("");
    console.log(`✅ Wrote ${out}`);
    console.log("Fill it in, remove private data, then paste it into the matching GitHub issue template.");
  }
}



function printPlan(options: { writePlan?: boolean } = {}): void {
  const phasePrompt = `You are helping a user set up Digital Seed — a local-first personal AI context starter kit.

Read the phases doc at docs/phases.md before starting.

Your job:
1. Ask 4–6 short questions to understand the user's workflow, tools, and goals.
   Good questions to cover:
   - What AI agent do you use or plan to use? (Claude Code, Cursor, Windsurf, other, not sure)
   - Do you have a folder of notes you already use? (Obsidian, plain text, Notion export, etc.)
   - Is there a specific tool you use daily that you want the AI to work alongside? (Drive, GitHub, Telegram, etc.)
   - Do you want always-on automation (background tasks, scheduled messages) eventually?
   - Are you comfortable with terminals, or do you prefer to be guided step by step?

2. Based on their answers, recommend which phases to enable and in what order.
   - Phase 1 (Local context) is always first and required.
   - Phase 2 (Local search) only if they have notes or documents worth searching.
   - Phase 3 (Integrations) only if a specific tool matters to them now.
   - Phase 4 (Always-on agent) only if they explicitly want background automation.

3. After they confirm the plan, run the setup commands for Phase 1 first:
   - bun run seed doctor
   - bun run seed onboard --plain
   - bun run seed hooks install
   - bun run seed first-prompt

4. For each additional phase they chose, read the relevant recipe or docs section and walk them through it one step at a time. Do not install anything that requires API keys, external accounts, or credentials without explicitly telling them what it connects to and asking for confirmation first.

5. After setup, write a short summary of what was installed to user/MY-PLAN.md.

Rules:
- Default to local-first. Prefer commands that stay on the user's machine.
- Never install multiple integrations at once.
- Never send, upload, delete, or publish anything without user confirmation.
- If the user does not understand a concept, explain it in one sentence before asking.
- Keep the whole conversation short. This should take under 20 minutes.`;

  const issueBase = "https://github.com/LeoMaslyak/digital-seed/issues/new/choose";
  // Check whether any agent CLI is available
  const { spawnSync: sp } = require("child_process");
  const agentCLIs = ["claude", "codex", "gemini", "cursor", "windsurf", "ollama"];
  const foundAgent = agentCLIs.find((a) => sp("which", [a], { stdio: "pipe" }).status === 0);

  console.log("Digital Seed — guided setup plan");
  console.log("");
  if (!foundAgent) {
    console.log("⚠️  No terminal-capable AI agent detected on your PATH.");
    console.log("");
    console.log("   You need one before this prompt will work. Options:");
    console.log("     Claude Code (Anthropic)  — bun install -g @anthropic-ai/claude-code + claude auth login");
    console.log("     Codex CLI (OpenAI)        — npm install -g @openai/codex + codex login");
    console.log("     Gemini CLI (Google)       — npm install -g @google/gemini-cli, then run gemini and follow the sign-in prompt");
    console.log("     Ollama (local, no cloud)  — https://ollama.ai");
    console.log("");
    console.log("   Full comparison: docs/agent-chooser.md");
    console.log("   Beginner guide (Claude Code): docs/install-claude-code.md");
    console.log("");
    console.log("   After you install and log in, re-run: bun run seed plan");
    console.log("");
  } else {
    console.log(`✅ AI agent detected: ${foundAgent}`);
    console.log("");
  }
  console.log("Paste the prompt below into your AI agent (Claude Code, Cursor, Windsurf, etc.).");
  console.log("The agent will ask you a few questions, recommend phases, and run setup for you.");
  console.log("");
  console.log("----- copy from below this line -----");
  console.log(phasePrompt);
  console.log("----- copy from above this line -----");
  console.log("");
  console.log("Phases reference: docs/phases.md");
  console.log("Recipes available: bun run seed recipe list");
  console.log("Stuck? " + issueBase);

  if (options.writePlan) {
    const outDir = join(ROOT, "user");
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, "MY-PLAN.md");
    if (!existsSync(out)) {
      writeFileSync(out, `# My Digital Seed Plan\n\n> Ask your agent to fill this in after guided setup, or edit it yourself.\n\n## Phases I am enabling\n\n- [ ] Phase 1 — Local context (required)\n- [ ] Phase 2 — Local search\n- [ ] Phase 3 — Integrations (which tools?):\n- [ ] Phase 4 — Always-on agent\n\n## What I use daily\n\n- AI agent: \n- Notes: \n- Main tools: \n\n## First win\n\nThe one useful thing I want from this week:\n\n## Notes from setup\n\n`, "utf-8");
      console.log("");
      console.log(`✅ Created user/MY-PLAN.md — edit it or ask your agent to fill it in.`);
    } else {
      console.log("");
      console.log("user/MY-PLAN.md already exists — open it and update as needed.");
    }
  }
}

function usage(): void {
  console.log(`
Digital Seed — Personal AI Infrastructure

The BEGINNER section is the whole first-15-minute promise. Everything below
that is optional or maintainer-only. Skip on day one. Add only after the
local loop (context files + first prompt + local search) is already useful.

BEGINNER — first 15 minutes
  bun run seed onboard                 Show the first 15-minute path (animated)
  bun run seed onboard --plain         Same path, no animation or color
  bun run seed doctor                  Friendly setup health check
  bun run seed first-prompt            Print the first agent prompt
  bun run seed privacy-scan            Check for common private leftovers
  bun run seed index <folder>          Build a local retrieval index
  bun run seed search "<query>"        Search your local retrieval index
  bun run seed recipe list             List integration recipes
  bun run seed plan                    Print the AI-guided phase-selection prompt
  bun run seed feedback                Show the easiest ways to report friction
  bun run seed hooks install           Install pre-commit secret-scan hook
  bun run seed hooks status            Show pre-commit hook status

  Optional flags on the beginner path:
  bun run seed onboard --write-first-win        Create user/FIRST-WIN.md if missing
  bun run seed onboard --write-first-win --force    Overwrite user/FIRST-WIN.md
  bun run seed plan --write-plan               Create user/MY-PLAN.md
  bun run seed feedback --write-draft           Create user/FEEDBACK-DRAFT.md

ADVANCED — optional power-user workflows
  Not part of the first-run promise. Skip on day one. Each command has its
  own setup and may require external accounts, credentials, or judgment.

  bun run seed recipe openclaw init    Draft OpenClaw always-on setup context
  bun run seed recipe hermes init      Draft Hermes always-on setup context
  bun run seed intro                   Replay the animated terminal intro

  bun run seed collab [...]            Shared projects / learning groups
  bun run seed digest [...]            Daily digest (markdown / text / deliver)
  bun run seed schedule [clear]        View / clear pending background tasks
  bun run seed task <name>             Run an autonomous task
  bun run seed status                  Activity state + offline mode

  bun run seed learn owner/repo        Index a GitHub repo for search
  bun run seed web [...]               Fetch / scrape / research URLs
  bun run seed drive [...]             Upload, download, sync Drive folders
  bun run seed excel [...]             Generate Excel templates
  bun run seed deck [...]              Generate slide decks

MAINTAINER / RELEASE — project maintainers only
  Not for end users. These commands publish, release, or change the repo.

  bun run seed health                  Same as 'doctor' (maintainer alias)
  bun run seed visual-qa               Verify the hero GIF still loops cleanly
  bun run seed tokens                  Token usage report
  bun run seed update [--yes]          Check and apply seed updates

  bun run seed install <id>            Install pattern or pack from marketplace
  bun run seed publish <pattern-dir>   Publish a pattern (opens PR flow)
  bun run seed rate <id> <1-5>         Rate a pattern
  bun run seed patterns                Browse all marketplace patterns
  bun run seed packs                   Browse marketplace skill packs

  bun run seed drive publish-data-room    Sync public data room to Drive
  bun run seed release-check              Run all release gates (one command)
  bun run seed release-check --skip-fresh-clone     Faster local run
  bun run seed release-check --with-drive-dry-run --account EMAIL    Drive dry-run
  bun run seed release-check --ci         CI-safe: no clone harness, no Drive
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
else if (cmd === "hooks") {
  const sub = rest[0];
  if (sub === "install") {
    hooksInstall({ force: rest.includes("--force") });
  } else if (sub === "status" || !sub) {
    if (preCommitHookInstalled()) {
      console.log("✅ Digital Seed pre-commit hook is installed.");
    } else {
      console.log("⚠️  Pre-commit hook is NOT installed.");
      console.log("   Install with: bun run seed hooks install");
    }
  } else {
    console.error(`Unknown hooks subcommand: ${sub}`);
    console.log("Try: bun run seed hooks install");
    process.exit(1);
  }
}
else if (cmd === "onboard" || cmd === "init") {
  if (rest.includes("--write-first-win")) {
    writeFirstWin({ force: rest.includes("--force") });
  } else {
    printOnboard({ plain: rest.includes("--plain") });
    if (!preCommitHookInstalled()) {
      console.log("");
      console.log("ℹ️  Optional security step: the pre-commit secret-scan hook is not installed.");
      console.log("   Install with: bun run seed hooks install");
      console.log("   It blocks commits that contain obvious API-key patterns.");
    }
  }
}
else if (cmd === "intro") {
  const framesArg = rest.find((arg) => arg.startsWith("--frames="));
  const delayArg = rest.find((arg) => arg.startsWith("--delay="));
  const frames = framesArg ? Number(framesArg.split("=")[1]) : 72;
  const delayMs = delayArg ? Number(delayArg.split("=")[1]) : 55;
  printTerminalSeedIntro({ animate: !rest.includes("--static") && USE_ANSI, frames, delayMs });
}
else if (cmd === "first-prompt") { printFirstPrompt(); }
else if (cmd === "plan") { printPlan({ writePlan: rest.includes("--write-plan") }); }
else if (cmd === "feedback") { printFeedback({ writeDraft: rest.includes("--write-draft") }); }
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
else if (cmd === "release-check") { run("scripts/release-check.ts", rest); }

// ── Unknown ───────────────────────────────────────────────────────────────────
else {
  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}
