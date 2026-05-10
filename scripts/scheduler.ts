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
import { loadAutonomyConfig, describePermissions } from "../core/src/autonomy.ts";

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
  const lines = [
    `# Digital Seed — Scheduled Tasks`,
    `# Generated by scripts/scheduler.ts — edit with crontab -e`,
    `# To install: bun run scripts/scheduler.ts --cron | crontab -`,
    "",
  ];

  for (const task of tasks) {
    lines.push(`# ${task.name}: ${task.description}`);
    lines.push(`${task.cronExpr} ${BUN_PATH} run ${root}/scripts/run-task.ts ${task.name} >> ${root}/logs/${task.id}.log 2>&1`);
    lines.push("");
  }

  return lines.join("\n");
}

function installLinux(tasks: ScheduledTask[]): void {
  const cron = generateCronEntries(tasks, ROOT);
  console.log("\n📋 Add these lines to your crontab (crontab -e):\n");
  console.log(cron);
  console.log("Or run: bun run scripts/scheduler.ts --cron | crontab -\n");
  console.log("⚠️  This will REPLACE your existing crontab. Back it up first with: crontab -l > ~/crontab.bak\n");
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
  } else {
    console.log("Remove cron entries with: crontab -e");
  }
} else if (args.includes("--cron")) {
  console.log(generateCronEntries(DEFAULT_TASKS, ROOT));
} else {
  showStatus(DEFAULT_TASKS);
}

export { DEFAULT_TASKS, detectPlatform, generateCronEntries, generateLaunchdPlist };
