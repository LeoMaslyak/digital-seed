/**
 * Digital Seed Autonomy Engine — Permission checking, audit logging, and daily digest.
 *
 * Every autonomous action flows through this module:
 *   1. Load config from config/autonomy.yaml
 *   2. Check permission for the action's category
 *   3. Execute (or skip, or notify-only)
 *   4. Log the decision to logs/autonomous.jsonl
 *
 * Permission levels:
 *   off    — always skip, never execute
 *   notify — execute AND tell the user what was done
 *   auto   — execute silently, include in daily digest only
 *
 * The daily digest reads the audit log and summarises everything done today.
 * Use buildDailyDigestPrompt() to generate an LLM prompt for the agent.
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync,
} from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { detectActivityState, shouldSurfaceNotification } from "./activity-state.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutonomyLevel = "off" | "notify" | "auto";
export type PermissionDecision = "run" | "notify" | "skip";

export interface AutonomyConfig {
  [category: string]: AutonomyLevel;
}

/** What the autonomy engine decides before executing a task. */
export interface PermissionResult {
  decision: PermissionDecision;
  level: AutonomyLevel;
  category: string;
  reason: string;
}

/** One entry in the audit log. */
export interface AuditEntry {
  id: string;
  timestamp: string;
  category: string;
  task: string;
  description: string;
  level: AutonomyLevel;
  decision: PermissionDecision;
  result?: "success" | "failure" | "skipped";
  output?: string;          // brief summary of what was done
  error?: string;
  notified?: boolean;       // true if user was sent a notification
  durationMs?: number;
}

/** A pending task written by the scheduler for the next agent session. */
export interface PendingTask {
  id: string;
  name: string;
  category: string;
  scheduledAt: string;
  prompt: string;
  priority: "high" | "normal" | "low";
}

const CONFIG_FILE   = "config/autonomy.yaml";
const AUDIT_FILE    = "logs/autonomous.jsonl";
const PENDING_FILE  = "data/pending-tasks.json";
const LOGS_DIR      = "logs";
const DATA_DIR      = "data";

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

/** Load autonomy config from config/autonomy.yaml */
export function loadAutonomyConfig(root: string): AutonomyConfig {
  const path = join(root, CONFIG_FILE);
  if (!existsSync(path)) {
    // Auto-bootstrap: copy example config if present, otherwise use defaults
    const examplePath = join(root, 'config', 'autonomy.example.yaml');
    if (existsSync(examplePath)) {
      mkdirSync(join(root, 'config'), { recursive: true });
      const { copyFileSync } = require('fs');
      copyFileSync(examplePath, path);
    } else {
      return getDefaultConfig();
    }
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = yaml.load(raw) as Record<string, string>;
    const config: AutonomyConfig = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      if (isAutonomyLevel(value)) {
        config[key] = value;
      }
    }
    return { ...getDefaultConfig(), ...config };
  } catch {
    return getDefaultConfig();
  }
}

/** Human-readable summary of current autonomy settings. */
export function describePermissions(config: AutonomyConfig): string {
  const lines = Object.entries(config).map(([cat, level]) => {
    const icon = level === "auto" ? "⚡" : level === "notify" ? "🔔" : "⏸";
    return `  ${icon} ${cat.padEnd(24)} ${level}`;
  });
  return `Autonomy Permissions:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Permission checking
// ---------------------------------------------------------------------------

/**
 * Check if a category is permitted to run.
 * Consults precedent history first — if the category has strong precedent
 * (≥95% approval, ≥8 samples), it can override a lower static permission.
 * Returns the decision and the reason.
 */
export function checkPermission(
  config: AutonomyConfig,
  category: string,
  root?: string
): PermissionResult {
  const level = config[category] ?? "off";

  // Consult precedent history if root is provided
  if (root && level === "off") {
    try {
      const { checkPrecedent } = require("./precedent-learning.ts");
      const precedent = checkPrecedent(root, "", category);
      if (precedent.recommendation === "allow") {
        return {
          decision: "notify",
          level: "notify",
          category,
          reason: `Precedent override: ${precedent.reason}`,
        };
      }
    } catch {
      // Precedent module not available — fall through to static rules
    }
  }

  // Gate "notify" actions when user is sleeping — queue silently instead
  if (level === "notify" && root) {
    try {
      const actState = detectActivityState(root);
      if (actState.state === "sleeping") {
        return {
          decision: "run",       // still execute, just don't wake them
          level: "auto",
          category,
          reason: `Downgraded notify→auto (user sleeping, ${Math.round(actState.lastSignalMinutesAgo)}m since last signal)`,
        };
      }
    } catch { /* activity state unavailable — proceed with static rules */ }
  }

  const decision: PermissionDecision =
    level === "auto"   ? "run"    :
    level === "notify" ? "notify" : "skip";

  const reason =
    level === "auto"   ? "Permitted to run silently"     :
    level === "notify" ? "Will run and notify user"      :
                         "Category is off — skipping";

  return { decision, level, category, reason };
}

/** True if a task for this category should be executed (auto or notify). */
export function canExecute(config: AutonomyConfig, category: string): boolean {
  const { decision } = checkPermission(config, category);
  return decision !== "skip";
}

/** True if the user should be notified after execution. */
export function shouldNotify(config: AutonomyConfig, category: string): boolean {
  const { level } = checkPermission(config, category);
  return level === "notify";
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/**
 * Log an autonomous action to logs/autonomous.jsonl.
 * Each line is a JSON object — easy to grep, stream, and analyse.
 */
export function logAction(root: string, entry: Omit<AuditEntry, "id">): AuditEntry {
  ensureDir(join(root, LOGS_DIR));

  const full: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
  };

  appendFileSync(
    join(root, AUDIT_FILE),
    JSON.stringify(full) + "\n",
    "utf-8"
  );

  return full;
}

/**
 * Load audit entries, optionally filtered to today or a date range.
 */
export function loadAuditLog(
  root: string,
  options: { sinceDate?: string; category?: string; limit?: number } = {}
): AuditEntry[] {
  const path = join(root, AUDIT_FILE);
  if (!existsSync(path)) return [];

  try {
    const lines = readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);

    let filtered = lines;

    if (options.sinceDate) {
      filtered = filtered.filter((e) => e.timestamp >= options.sinceDate!);
    }
    if (options.category) {
      filtered = filtered.filter((e) => e.category === options.category);
    }

    const sorted = filtered.reverse(); // newest first
    return options.limit ? sorted.slice(0, options.limit) : sorted;
  } catch {
    return [];
  }
}

/**
 * Get today's autonomous actions as a formatted string.
 * Useful for session startup ("here's what happened while you were away").
 */
export function getTodaySummary(root: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = loadAuditLog(root, { sinceDate: today });

  if (entries.length === 0) {
    return "No autonomous actions taken today.";
  }

  const byCategory: Record<string, AuditEntry[]> = {};
  for (const e of entries) {
    (byCategory[e.category] ||= []).push(e);
  }

  const lines: string[] = [`📋 Autonomous Actions — Today (${today})\n`];
  for (const [cat, catEntries] of Object.entries(byCategory)) {
    const done = catEntries.filter((e) => e.result === "success").length;
    const skipped = catEntries.filter((e) => e.result === "skipped").length;
    lines.push(`  ${cat}: ${done} done${skipped > 0 ? `, ${skipped} skipped` : ""}`);
    for (const e of catEntries.filter((e) => e.output)) {
      lines.push(`    → ${e.output}`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Daily Digest
// ---------------------------------------------------------------------------

/**
 * Build a prompt for the agent to generate the daily digest.
 * The agent sends this to an LLM and delivers the result to the user.
 */
export function buildDailyDigestPrompt(root: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = loadAuditLog(root, { sinceDate: today });
  const summary = getTodaySummary(root);

  const pending = loadPendingTasks(root);
  const pendingText =
    pending.length > 0
      ? `\nPENDING TASKS (queued, not yet run):\n${pending.map((t) => `- [${t.category}] ${t.name}`).join("\n")}`
      : "";

  return `Generate a concise daily digest for the user.

AUTONOMOUS ACTIONS TODAY:
${summary}

RAW AUDIT LOG (${entries.length} entries):
${entries
  .filter((e) => e.result !== "skipped")
  .map((e) => `[${e.timestamp.slice(11, 16)}] ${e.category}/${e.task}: ${e.output || e.result || "done"}`)
  .join("\n") || "None"}
${pendingText}

Write a brief, friendly digest (3–8 bullet points). Format:
- What was done automatically (keep it short, not exhaustive)
- Any issues or failures to flag
- Pending tasks waiting to run
- One sentence: suggested focus for tomorrow

Be conversational, not robotic. Skip anything with no user value.`;
}

// ---------------------------------------------------------------------------
// Pending tasks (for next-session execution)
// ---------------------------------------------------------------------------

/**
 * Queue a task to run at the start of the next agent session.
 * The agent reads pending tasks in CLAUDE.md session startup sequence.
 */
export function queuePendingTask(root: string, task: Omit<PendingTask, "id">): PendingTask {
  ensureDir(join(root, DATA_DIR));

  const existing = loadPendingTasks(root);
  const full: PendingTask = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...task,
  };

  // Don't queue duplicates of the same task name (idempotent)
  const deduped = existing.filter((t) => t.name !== task.name);
  deduped.push(full);

  writeFileSync(
    join(root, PENDING_FILE),
    JSON.stringify(deduped, null, 2),
    "utf-8"
  );

  return full;
}

/** Load all pending tasks. */
export function loadPendingTasks(root: string): PendingTask[] {
  const path = join(root, PENDING_FILE);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

/** Remove a task from the pending queue (mark it as consumed). */
export function consumePendingTask(root: string, taskId: string): void {
  const existing = loadPendingTasks(root);
  const updated = existing.filter((t) => t.id !== taskId);
  writeFileSync(join(root, PENDING_FILE), JSON.stringify(updated, null, 2), "utf-8");
}

/** Clear all pending tasks (e.g., after session startup processes them). */
export function clearPendingTasks(root: string): void {
  writeFileSync(join(root, PENDING_FILE), "[]", "utf-8");
}

/** Format pending tasks for the agent to read at session startup. */
export function getPendingTasksPrompt(root: string): string {
  const tasks = loadPendingTasks(root);
  if (tasks.length === 0) return "";

  const lines = tasks.map(
    (t) => `- [${t.priority.toUpperCase()}] ${t.name} (${t.category}): ${t.prompt}`
  );

  return `## Pending Autonomous Tasks (from scheduler)

The following tasks were queued while you were away. Check autonomy permissions before running each one:

${lines.join("\n")}

Process them in priority order (high first). Log results with logAction().`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultConfig(): AutonomyConfig {
  return {
    "email-triage":       "off",
    "memory-maintenance": "notify",
    "note-organization":  "off",
    "daily-digest":       "notify",
    "task-reminders":     "notify",
    "research-updates":   "off",
  };
}

function isAutonomyLevel(value: unknown): value is AutonomyLevel {
  return value === "off" || value === "notify" || value === "auto";
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
