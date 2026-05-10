#!/usr/bin/env bun
/**
 * DAI Task Runner — Execute a scheduled autonomous task.
 *
 * Called by the scheduler (cron/launchd). Checks autonomy permissions,
 * queues the task prompt for the next agent session, and logs the decision.
 *
 * Usage:
 *   bun run scripts/run-task.ts <task-name>
 *   bun run scripts/run-task.ts <task-name> --dry-run   # show what would happen
 *   bun run scripts/run-task.ts --list                  # show all tasks
 *
 * Examples:
 *   bun run scripts/run-task.ts email-triage
 *   bun run scripts/run-task.ts memory-maintenance --dry-run
 */

import { join, dirname } from "path";
import {
  loadAutonomyConfig,
  checkPermission,
  logAction,
  queuePendingTask,
} from "../core/src/autonomy.ts";
import { recordOutcome } from "../core/src/precedent-learning.ts";
import { detectActivityState, shouldRunAutonomously, getStateBehaviourGuidance } from "../core/src/activity-state.ts";
import { isOfflineMode, NETWORK_REQUIRED_CATEGORIES } from "../core/src/offline-mode.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

// ---------------------------------------------------------------------------
// Task library — prompts for the agent to use
// ---------------------------------------------------------------------------

interface TaskDefinition {
  name: string;
  category: string;
  description: string;
  priority: "high" | "normal" | "low";
  prompt: string;
}

const TASK_LIBRARY: Record<string, TaskDefinition> = {
  "email-triage": {
    name: "email-triage",
    category: "email-triage",
    description: "Classify and prioritise inbox",
    priority: "normal",
    prompt: `Triage the inbox automatically.
1. Use the email integration (or dai-tasks if no email is connected) to list recent emails
2. Classify each as: urgent/important, important/not-urgent, fyi, or trash
3. Flag anything urgent for the user
4. Archive or label the rest
5. Log what you did with logAction() in the audit trail
Keep it brief — the user will see a summary in the daily digest.`,
  },

  "memory-maintenance": {
    name: "memory-maintenance",
    category: "memory-maintenance",
    description: "Compress session history and update MEMORY.md",
    priority: "low",
    prompt: `Perform memory maintenance.
1. Read user/MEMORY.md — check for stale or redundant entries
2. Check data/sessions/ — summarise sessions older than 7 days into MEMORY.md
3. Remove duplicate facts (keep the most recent / most specific)
4. Check user/GOALS.md — are any goals completed or outdated?
5. Write a one-line change summary to the audit trail
Goal: keep MEMORY.md accurate, compact, and up-to-date.`,
  },

  "daily-digest": {
    name: "daily-digest",
    category: "daily-digest",
    description: "Generate end-of-day summary",
    priority: "normal",
    prompt: `Generate today's daily digest.
1. Read today's autonomous actions from logs/autonomous.jsonl
2. Check data/pending-tasks.json for anything that couldn't run
3. Review any completed tasks from dai-tasks
4. Generate a short, friendly summary (3-7 bullets):
   - What was done automatically
   - Any issues or failures
   - Pending items
   - Suggested focus for tomorrow
Deliver the digest to the user (send as a message if a channel is configured).`,
  },

  "note-organization": {
    name: "note-organization",
    category: "note-organization",
    description: "Suggest tags, links, and structure for recent notes",
    priority: "low",
    prompt: `Review recent notes for organisation improvements.
1. Use rag_search to find notes created or modified in the last 7 days
2. For each note, check:
   - Missing tags that would help retrieval
   - Links to related notes or resources
   - Structure improvements (add headers, bullets)
3. Prepare suggestions (don't auto-apply — this is notify mode by default)
4. Queue suggestions as tasks in dai-tasks for the user to review`,
  },

  "task-reminders": {
    name: "task-reminders",
    category: "task-reminders",
    description: "Surface tasks due soon",
    priority: "high",
    prompt: `Check for upcoming task deadlines.
1. List all tasks from dai-tasks
2. Flag anything due today or tomorrow
3. Flag anything overdue
4. If anything is urgent, notify the user immediately
5. Log the count to the audit trail`,
  },
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log("\n📋 Available Tasks:\n");
  for (const [name, def] of Object.entries(TASK_LIBRARY)) {
    console.log(`  ${name}`);
    console.log(`    Category: ${def.category}`);
    console.log(`    Priority: ${def.priority}`);
    console.log(`    ${def.description}\n`);
  }
  process.exit(0);
}

const taskName = args.find((a) => !a.startsWith("--"));
const dryRun   = args.includes("--dry-run");

if (!taskName) {
  console.error("Usage: bun run scripts/run-task.ts <task-name> [--dry-run]");
  console.error("       bun run scripts/run-task.ts --list");
  process.exit(1);
}

const task = TASK_LIBRARY[taskName];
if (!task) {
  console.error(`Unknown task: "${taskName}"`);
  console.error(`Available tasks: ${Object.keys(TASK_LIBRARY).join(", ")}`);
  process.exit(1);
}

const config  = loadAutonomyConfig(ROOT);
const actState = detectActivityState(ROOT);
const perm    = checkPermission(config, task.category, ROOT);

if (dryRun) {
  console.log(`\n[DRY RUN] Task: ${taskName}`);
  console.log(`  Category:  ${task.category}`);
  console.log(`  User state: ${actState.state} (${(actState.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`  Level:     ${perm.level}`);
  console.log(`  Decision:  ${perm.decision} — ${perm.reason}`);
  console.log(`  Would queue prompt for next agent session.`);
  process.exit(0);
}

// Offline mode: skip network-dependent tasks gracefully
if (isOfflineMode(ROOT) && NETWORK_REQUIRED_CATEGORIES.includes(task.category)) {
  console.log(`⚠️  Offline mode — skipping ${task.name} (requires network)`);
  logAction(ROOT, {
    timestamp:   new Date().toISOString(),
    category:    task.category,
    task:        task.name,
    description: task.description,
    level:       "off",
    decision:    "skip",
    result:      "skipped",
    output:      "Skipped: offline mode active",
  });
  process.exit(0);
}

if (perm.decision === "skip") {
  // Silently log the skip — don't print anything (cron runs in background)
  logAction(ROOT, {
    timestamp: new Date().toISOString(),
    category:  task.category,
    task:      task.name,
    description: task.description,
    level:     perm.level,
    decision:  "skip",
    result:    "skipped",
  });
  process.exit(0);
}

// Queue for next agent session
queuePendingTask(ROOT, {
  name:        task.name,
  category:    task.category,
  scheduledAt: new Date().toISOString(),
  prompt:      task.prompt,
  priority:    task.priority,
});

// Log the queueing
logAction(ROOT, {
  timestamp:   new Date().toISOString(),
  category:    task.category,
  task:        task.name,
  description: task.description,
  level:       perm.level,
  decision:    perm.decision,
  result:      "success",
  output:      `Queued for next agent session (${perm.level} mode)`,
  notified:    perm.level === "notify",
});

// Record as precedent (approved — it was permitted and queued)
recordOutcome(ROOT, task.name, task.category, "approved", `Queued via scheduler (${perm.level})`);

console.log(`[${new Date().toISOString()}] Queued: ${taskName} (${perm.level})`);
