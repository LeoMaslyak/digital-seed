#!/usr/bin/env bun
/**
 * Digital Seed Scheduler — Cross-platform scheduled task setup.
 *
 * Detects your OS and generates the right scheduler config:
 *   macOS  → launchd plists in ~/Library/LaunchAgents/
 *   Linux  → crontab entries (printed for manual install)
 *   Any    → raw cron expressions (copy/paste)
 *
 * Usage:
 *   bun run scripts/scheduler.ts               # show current schedule
 *   bun run scripts/scheduler.ts --install     # install for your platform
 *   bun run scripts/scheduler.ts --uninstall   # remove installed jobs
 *   bun run scripts/scheduler.ts --cron        # print raw cron entries
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { safeExec } from "./lib/safe-exec.ts";
import { loadAutonomyConfig, describePermissions } from "../core/src/autonomy.ts";

// Markers delimiting the block this tool owns inside the user's crontab.
// Anything between them is replaced on re-install; everything else is left
// untouched so we never clobber pre-existing cron jobs (M12).
const CRON_BLOCK_BEGIN = "# >>> digital-seed scheduled tasks >>>";
const CRON_BLOCK_END = "# <<< digital-seed scheduled tasks <<<";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const BUN_PATH = process.execPath;  // path to current bun binary

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

interface ScheduledTask {
  id: string;
  name: string;
  category: string;
  description: string;
  cronExpr: string;          // standard cron: min hour dom mon dow
  launchdInterval?: number;  // macOS: run every N seconds (alternative to StartCalendarInterval)
  launchdCalendar?: { Hour: number; Minute: number };  // macOS: run at specific time
}

const DEFAULT_TASKS: ScheduledTask[] = [
  {
    id: "seed-email-triage",
    name: "email-triage",
    category: "email-triage",
    description: "Classify and prioritise incoming emails",
    cronExpr: "0 9,12,17 * * 1-5",          // 9am, noon, 5pm on weekdays
    launchdCalendar: { Hour: 9, Minute: 0 }, // launchd runs at 9am (simplified; edit plist for multiple)
  },
  {
    id: "seed-memory-maintenance",
    name: "memory-maintenance",
    category: "memory-maintenance",
    description: "Compress old sessions, update MEMORY.md with durable facts",
    cronExpr: "0 23 * * *",                  // 11pm daily
    launchdCalendar: { Hour: 23, Minute: 0 },
  },
  {
    id: "seed-daily-digest",
    name: "daily-digest",
    category: "daily-digest",
    description: "Generate end-of-day summary of autonomous actions",
    cronExpr: "0 21 * * *",                  // 9pm daily
    launchdCalendar: { Hour: 21, Minute: 0 },
  },
  {
    id: "seed-note-organization",
    name: "note-organization",
    category: "note-organization",
    description: "Suggest tags, links, and structure for new notes",
    cronExpr: "0 22 * * 0",                  // 10pm Sunday
    launchdCalendar: { Hour: 22, Minute: 0 },
  },
  {
    id: "seed-task-reminders",
    name: "task-reminders",
    category: "task-reminders",
    description: "Check for tasks due soon and surface them",
    cronExpr: "0 8 * * *",                   // 8am daily
    launchdCalendar: { Hour: 8, Minute: 0 },
  },
];

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

type Platform = "macos" | "linux" | "windows" | "unknown";

function detectPlatform(): Platform {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "linux")  return "linux";
  if (platform === "win32")  return "windows";
  return "unknown";
}

// ---------------------------------------------------------------------------
// macOS: launchd plists
// ---------------------------------------------------------------------------

function generateLaunchdPlist(task: ScheduledTask): string {
  const label = `com.digital-seed.${task.id}`;
  const calendarEntry = task.launchdCalendar
    ? `    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>${task.launchdCalendar.Hour}</integer>
      <key>Minute</key>
      <integer>${task.launchdCalendar.Minute}</integer>
    </dict>`
    : `    <key>StartInterval</key>
    <integer>3600</integer>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${BUN_PATH}</string>
    <string>run</string>
    <string>${ROOT}/scripts/run-task.ts</string>
    <string>${task.name}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${ROOT}</string>

${calendarEntry}

  <key>StandardOutPath</key>
  <string>${ROOT}/logs/${task.id}.log</string>

  <key>StandardErrorPath</key>
  <string>${ROOT}/logs/${task.id}.error.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>`;
}

function getPlistPath(task: ScheduledTask): string {
  const home = process.env.HOME || "~";
  return join(home, "Library", "LaunchAgents", `com.digital-seed.${task.id}.plist`);
}

function installMacos(tasks: ScheduledTask[]): void {
  const home = process.env.HOME || "~";
  const launchAgentsDir = join(home, "Library", "LaunchAgents");

  console.log(`\n📦 Installing ${tasks.length} launchd jobs...\n`);

  for (const task of tasks) {
    const plistContent = generateLaunchdPlist(task);
    const plistPath = getPlistPath(task);
    const label = `com.digital-seed.${task.id}`;

    writeFileSync(plistPath, plistContent, "utf-8");

    try {
      // Unload first if already loaded
      execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
      execSync(`launchctl load -w "${plistPath}"`);
      console.log(`  ✅ ${task.name} — ${task.description}`);
    } catch (e) {
      console.log(`  ⚠️  ${task.name} — installed but could not load: ${e}`);
    }
  }

  console.log(`\n✅ Done. Jobs will run on schedule.`);
  console.log(`   Logs: ${ROOT}/logs/`);
  console.log(`   Config: ${ROOT}/config/autonomy.yaml`);
  console.log(`   Uninstall: bun run scripts/scheduler.ts --uninstall\n`);
}

function uninstallMacos(tasks: ScheduledTask[]): void {
  console.log(`\n🗑  Uninstalling ${tasks.length} launchd jobs...\n`);
  for (const task of tasks) {
    const plistPath = getPlistPath(task);
    if (existsSync(plistPath)) {
      try {
        execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
        execSync(`rm "${plistPath}"`);
        console.log(`  ✅ Removed ${task.name}`);
      } catch {
        console.log(`  ⚠️  Could not remove ${task.name}`);
      }
    } else {
      console.log(`  — ${task.name} not installed`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Linux / generic: crontab
// ---------------------------------------------------------------------------

function generateCronEntries(tasks: ScheduledTask[], root: string): string {
  // Wrap our entries in clearly-tagged BEGIN/END markers so install/merge
  // can update only this block and leave the rest of the crontab intact.
  const lines = [
    CRON_BLOCK_BEGIN,
    `# Digital Seed — Scheduled Tasks`,
    `# Generated by scripts/scheduler.ts — edit with crontab -e`,
    `# Install/refresh (append-safe): bun run scripts/scheduler.ts --install`,
    "",
  ];

  for (const task of tasks) {
    lines.push(`# ${task.name}: ${task.description}`);
    lines.push(`${task.cronExpr} ${BUN_PATH} run ${root}/scripts/run-task.ts ${task.name} >> ${root}/logs/${task.id}.log 2>&1`);
    lines.push("");
  }

  lines.push(CRON_BLOCK_END);
  return lines.join("\n");
}

/** Read the current crontab; returns "" if none (or crontab unavailable). */
function readCurrentCrontab(): string {
  try {
    const res = safeExec("crontab", ["-l"]);
    // `crontab -l` exits non-zero when there is no crontab yet — treat as empty.
    return res.exitCode === 0 ? res.stdout : "";
  } catch {
    // `crontab` binary not installed (Docker/minimal distros) — treat as empty
    // so the caller can fall back to printing the block instead of crashing.
    return "";
  }
}

/** Remove any previously-installed digital-seed block from a crontab body. */
function stripOurBlock(crontab: string): string {
  const lines = crontab.split("\n");
  const out: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.trim() === CRON_BLOCK_BEGIN) { inBlock = true; continue; }
    if (line.trim() === CRON_BLOCK_END) { inBlock = false; continue; }
    if (!inBlock) out.push(line);
  }
  return out.join("\n");
}

function installLinux(tasks: ScheduledTask[]): void {
  const block = generateCronEntries(tasks, ROOT);

  // Append-safe install: merge our tagged block into the EXISTING crontab
  // rather than replacing it (M12). Existing user jobs are preserved.
  const existing = readCurrentCrontab();

  // Back up the current crontab before touching it.
  if (existing.trim().length > 0) {
    const logsDir = join(ROOT, "logs");
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    const backupPath = join(logsDir, `crontab.bak.${Date.now()}`);
    writeFileSync(backupPath, existing, "utf-8");
    console.log(`\n💾 Backed up existing crontab → ${backupPath}`);
  }

  // Drop any prior digital-seed block, then append the fresh one.
  const preserved = stripOurBlock(existing).replace(/\n+$/, "");
  const merged = (preserved ? preserved + "\n\n" : "") + block + "\n";

  let res;
  try {
    res = safeExec("crontab", ["-"], { input: merged });
  } catch (e) {
    // `crontab` binary missing — route to the append-safe printed fallback below.
    res = { exitCode: 1, stdout: "", stderr: (e as Error)?.message ?? "crontab not available" };
  }
  if (res.exitCode === 0) {
    console.log("\n✅ Installed digital-seed cron jobs (existing jobs preserved).\n");
    console.log("   Inspect:   crontab -l");
    console.log("   Uninstall: bun run scripts/scheduler.ts --uninstall\n");
    return;
  }

  // crontab not available / write failed — fall back to printing the block
  // with an APPEND-SAFE one-liner (never `| crontab -` which would replace).
  console.log("\n⚠️  Could not write crontab automatically.");
  if (res.stderr.trim()) console.log(`   (${res.stderr.trim()})`);
  console.log("\n📋 Add these lines to your crontab (crontab -e):\n");
  console.log(block);
  console.log("\nOr append safely (preserves your existing jobs):");
  console.log("   (crontab -l 2>/dev/null; bun run scripts/scheduler.ts --cron) | crontab -\n");
}

/** Remove only the digital-seed block from the user's crontab (M12). */
function uninstallLinux(): void {
  const existing = readCurrentCrontab();
  if (existing.trim().length === 0) {
    console.log("No crontab found — nothing to remove.");
    return;
  }
  if (!existing.includes(CRON_BLOCK_BEGIN)) {
    console.log("No digital-seed cron block found. Other jobs left untouched.");
    console.log("Remove manually if needed with: crontab -e");
    return;
  }
  const cleaned = stripOurBlock(existing).replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  const res = safeExec("crontab", ["-"], { input: cleaned });
  if (res.exitCode === 0) {
    console.log("✅ Removed digital-seed cron jobs (your other jobs preserved).");
  } else {
    console.error(`❌ Could not update crontab: ${res.stderr.trim()}`);
    console.error("   Remove the digital-seed block manually with: crontab -e");
  }
}

// ---------------------------------------------------------------------------
// Status / display
// ---------------------------------------------------------------------------

function showStatus(tasks: ScheduledTask[]): void {
  const platform = detectPlatform();
  const config = loadAutonomyConfig(ROOT);

  console.log("\n🗓  Digital Seed Scheduler Status\n");
  console.log(`Platform: ${platform}`);
  console.log(`Config:   ${ROOT}/config/autonomy.yaml\n`);

  console.log(describePermissions(config));

  console.log("\nScheduled Tasks:\n");
  for (const task of tasks) {
    const level = config[task.category] ?? "off";
    const icon = level === "auto" ? "⚡" : level === "notify" ? "🔔" : "⏸";
    const installed = platform === "macos" ? (existsSync(getPlistPath(task)) ? "installed" : "not installed") : "—";
    console.log(`  ${icon} ${task.name.padEnd(24)} ${task.cronExpr.padEnd(20)} [${level}] ${installed}`);
    console.log(`     ${task.description}`);
  }

  console.log(`\nTo install: bun run scripts/scheduler.ts --install`);
  console.log(`To adjust:  edit config/autonomy.yaml\n`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--install")) {
  const platform = detectPlatform();
  if (platform === "macos") {
    installMacos(DEFAULT_TASKS);
  } else if (platform === "linux") {
    installLinux(DEFAULT_TASKS);
  } else {
    console.log("⚠️  Auto-install not supported on this platform. Use --cron for raw entries.");
    console.log(generateCronEntries(DEFAULT_TASKS, ROOT));
  }
} else if (args.includes("--uninstall")) {
  const platform = detectPlatform();
  if (platform === "macos") {
    uninstallMacos(DEFAULT_TASKS);
  } else if (platform === "linux") {
    uninstallLinux();
  } else {
    console.log("Remove cron entries with: crontab -e");
  }
} else if (args.includes("--cron")) {
  console.log(generateCronEntries(DEFAULT_TASKS, ROOT));
} else {
  showStatus(DEFAULT_TASKS);
}

export { DEFAULT_TASKS, detectPlatform, generateCronEntries, generateLaunchdPlist };
