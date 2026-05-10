/**
 * DAI Daily Digest — Standalone generator that consolidates system activity
 * into a human-readable summary. Extends the basic digest prompt in autonomy.ts
 * with richer content: token costs, precedent promotions, collab activity,
 * upcoming tasks, and a configurable delivery hook.
 *
 * Three output formats:
 *   markdown  — for terminal display and file logging
 *   json      — for the dashboard widget (/api/digest)
 *   text      — for Telegram/email delivery (plain, no markdown)
 *
 * Delivery (optional, config/digest.yaml):
 *   telegram  — POST to a webhook that relays to a chat
 *   email     — POST to a webhook that sends an email
 *   file      — append to logs/digests/YYYY-MM-DD.md
 *
 * Usage:
 *   import { generateDigest, formatDigest } from "core/src/daily-digest.ts";
 *   const digest = generateDigest(root);
 *   console.log(formatDigest(digest, "markdown"));
 *
 * CLI:
 *   bun run digest             — print today's digest
 *   bun run digest --json      — JSON output for dashboard
 *   bun run digest --deliver   — also run configured delivery hooks
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync,
} from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { loadAuditLog, type AuditEntry } from "./autonomy.ts";
import { getUsageReport, loadBudget } from "./token-tracker.ts";
import { loadPendingTasks, type PendingTask } from "./autonomy.ts";
import { listProjects, listStudyGroups } from "./collaboration.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigestConfig {
  enabled: boolean;
  schedule: string;           // e.g. "21:00"
  timezone?: string;
  delivery: {
    telegram?: { enabled: boolean; webhookUrl?: string };
    email?:    { enabled: boolean; address?: string; webhookUrl?: string };
    file?:     { enabled: boolean; path?: string };
  };
}

export interface DigestSection {
  title: string;
  icon: string;
  items: string[];
  empty?: string;             // message when items is empty
}

export interface DailyDigest {
  date: string;
  generatedAt: string;

  // Core sections
  autonomousActions: DigestSection;
  tasksCompleted:    DigestSection;
  tokenUsage:        DigestSection;
  upcomingTasks:     DigestSection;
  precedents:        DigestSection;
  collaboration:     DigestSection;

  // Summary line for telegram/email subject
  headline: string;

  // Raw counts for dashboard widget
  stats: {
    actionsToday:    number;
    tasksCompleted:  number;
    pendingTasks:    number;
    collabProjects:  number;
    studyGroups:     number;
    tokenCostToday?: number;
  };
}

const DIGEST_CONFIG_FILE = "config/digest.yaml";
const LOGS_DIR           = "logs/digests";

// ─── Config ───────────────────────────────────────────────────────────────────

export function loadDigestConfig(root: string): DigestConfig {
  const path = join(root, DIGEST_CONFIG_FILE);

  const defaults: DigestConfig = {
    enabled: true,
    schedule: "21:00",
    delivery: {
      file: { enabled: true, path: "logs/digests" },
    },
  };

  if (!existsSync(path)) return defaults;

  try {
    const raw = yaml.load(readFileSync(path, "utf-8")) as Partial<DigestConfig>;
    return { ...defaults, ...raw, delivery: { ...defaults.delivery, ...(raw.delivery ?? {}) } };
  } catch {
    return defaults;
  }
}

/**
 * Write an learning checkpointple digest config if none exists.
 * Called by generateDigest() on first run.
 */
export function ensureDigestConfig(root: string): void {
  const configDir = join(root, "config");
  const path = join(configDir, DIGEST_CONFIG_FILE.replace("config/", ""));

  if (existsSync(path)) return;
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

  writeFileSync(path, [
    "# DAI Daily Digest Configuration",
    "enabled: true",
    "schedule: \"21:00\"   # 24h local time",
    "",
    "delivery:",
    "  file:",
    "    enabled: true",
    "    path: logs/digests",
    "  telegram:",
    "    enabled: false",
    "    webhookUrl: \"\"  # set your webhook URL",
    "  email:",
    "    enabled: false",
    "    address: \"\"",
    "    webhookUrl: \"\"",
  ].join("\n") + "\n", "utf-8");
}

// ─── Digest Generation ────────────────────────────────────────────────────────

/**
 * Generate today's digest by reading from audit log, tasks, token tracker,
 * pending tasks, and collaboration state.
 */
export function generateDigest(root: string): DailyDigest {
  ensureDigestConfig(root);

  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toISOString();

  // ── Autonomous Actions ────────────────────────────────────────────────
  const auditEntries = loadAuditLog(root, { sinceDate: today });
  const doneEntries  = auditEntries.filter((e) => e.result === "success");
  const failEntries  = auditEntries.filter((e) => e.result === "failure");

  const actionItems: string[] = [];
  for (const e of doneEntries.slice(0, 8)) {
    const time = e.timestamp.slice(11, 16);
    actionItems.push(`[${time}] ${e.category}: ${e.output ?? e.task}`);
  }
  if (failEntries.length > 0) {
    actionItems.push(`⚠️  ${failEntries.length} failure(s): ${failEntries.map((e) => e.task).join(", ")}`);
  }

  // ── Tasks Completed ───────────────────────────────────────────────────
  const tasksPath = join(root, "data", "tasks.json");
  let completedToday: Array<{ title: string; completed?: string }> = [];
  if (existsSync(tasksPath)) {
    try {
      const tasks = JSON.parse(readFileSync(tasksPath, "utf-8")) as Array<{
        title: string; status: string; completed?: string;
      }>;
      completedToday = tasks.filter(
        (t) => t.status === "completed" && t.completed?.startsWith(today)
      );
    } catch { /* ignore */ }
  }

  // ── Token Usage ───────────────────────────────────────────────────────
  const tokenReport = getUsageReport(root);
  const tokenItems  = tokenReport
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("Token Usage"))
    .slice(0, 5);

  // Rough cost estimate for stats
  const tokenCostToday = parseFloat(
    tokenReport.match(/\$(\d+\.\d+)/)?.[1] ?? "0"
  ) || undefined;

  // ── Pending / Upcoming Tasks ──────────────────────────────────────────
  const pending = loadPendingTasks(root);
  const upcomingItems = pending.slice(0, 5).map(
    (t) => `[${t.priority.toUpperCase()}] ${t.name} (${t.category})`
  );

  // ── Precedent Promotions ──────────────────────────────────────────────
  const precedentsPath = join(root, "data", "precedents.json");
  const precedentItems: string[] = [];
  if (existsSync(precedentsPath)) {
    try {
      interface PrecedentRecord { category: string; outcome: string; timestamp: string; }
      const recs = JSON.parse(readFileSync(precedentsPath, "utf-8")) as PrecedentRecord[];
      const todayRecs = recs.filter((r) => r.timestamp?.startsWith(today));
      const byCategory: Record<string, number> = {};
      for (const r of todayRecs) {
        byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      }
      for (const [cat, count] of Object.entries(byCategory)) {
        precedentItems.push(`${cat}: ${count} new record(s)`);
      }
    } catch { /* ignore */ }
  }

  // ── Collaboration Activity ────────────────────────────────────────────
  const projects = listProjects(root);
  const groups   = listStudyGroups(root);
  const collabItems: string[] = [];

  const todayProjects = projects.filter((p) => p.updatedAt.startsWith(today));
  for (const p of todayProjects) collabItems.push(`📁 ${p.name} — updated`);

  const todayGroups = groups.filter((g) => g.updatedAt.startsWith(today));
  for (const g of todayGroups) collabItems.push(`👥 ${g.name} — new contributions`);

  // ── Headline ──────────────────────────────────────────────────────────
  const totalActions = doneEntries.length;
  const totalTasks   = completedToday.length;
  const parts: string[] = [];
  if (totalActions > 0) parts.push(`${totalActions} autonomous action${totalActions !== 1 ? "s" : ""}`);
  if (totalTasks   > 0) parts.push(`${totalTasks} task${totalTasks !== 1 ? "s" : ""} done`);
  if (failEntries.length > 0) parts.push(`⚠️ ${failEntries.length} failure${failEntries.length !== 1 ? "s" : ""}`);

  const headline = parts.length > 0
    ? `Today: ${parts.join(", ")}`
    : "Quiet day — no autonomous actions or completed tasks";

  return {
    date: today,
    generatedAt: now,

    autonomousActions: {
      title: "Autonomous Actions",
      icon: "⚡",
      items: actionItems,
      empty: "No autonomous actions today",
    },
    tasksCompleted: {
      title: "Tasks Completed",
      icon: "✅",
      items: completedToday.map((t) => t.title),
      empty: "No tasks completed today",
    },
    tokenUsage: {
      title: "Token Usage",
      icon: "📊",
      items: tokenItems,
      empty: "No token usage recorded",
    },
    upcomingTasks: {
      title: "Upcoming / Pending",
      icon: "⏳",
      items: upcomingItems,
      empty: "No pending tasks",
    },
    precedents: {
      title: "Precedent Learning",
      icon: "🧠",
      items: precedentItems,
      empty: "No new precedents today",
    },
    collaboration: {
      title: "Collaboration",
      icon: "👥",
      items: collabItems,
      empty: "No collaboration activity today",
    },

    headline,

    stats: {
      actionsToday:   totalActions,
      tasksCompleted: totalTasks,
      pendingTasks:   pending.length,
      collabProjects: projects.length,
      studyGroups:    groups.length,
      tokenCostToday,
    },
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a digest into markdown, JSON, or plain text.
 */
export function formatDigest(digest: DailyDigest, format: "markdown" | "json" | "text"): string {
  if (format === "json") {
    return JSON.stringify(digest, null, 2);
  }

  const sections = [
    digest.autonomousActions,
    digest.tasksCompleted,
    digest.tokenUsage,
    digest.upcomingTasks,
    digest.precedents,
    digest.collaboration,
  ].filter((s) => s.items.length > 0);  // skip empty sections

  if (format === "text") {
    const lines = [
      `📋 Daily Digest — ${digest.date}`,
      `${digest.headline}`,
      "",
    ];

    for (const section of sections) {
      lines.push(`${section.icon} ${section.title}`);
      for (const item of section.items) lines.push(`  • ${item}`);
      lines.push("");
    }

    if (sections.length === 0) {
      lines.push("Everything quiet today. System is healthy.");
    }

    return lines.join("\n").trim();
  }

  // markdown
  const lines = [
    `# 📋 Daily Digest — ${digest.date}`,
    "",
    `> ${digest.headline}`,
    "",
    `*Generated at ${digest.generatedAt.slice(11, 16)} UTC*`,
    "",
  ];

  for (const section of sections) {
    lines.push(`## ${section.icon} ${section.title}`);
    lines.push("");
    for (const item of section.items) lines.push(`- ${item}`);
    lines.push("");
  }

  if (sections.length === 0) {
    lines.push("*Everything quiet today. System is healthy.*");
  }

  // Stats summary
  const { stats } = digest;
  lines.push("---");
  lines.push("");
  lines.push("**Stats:**");
  lines.push(`- Autonomous actions: ${stats.actionsToday}`);
  lines.push(`- Tasks completed: ${stats.tasksCompleted}`);
  lines.push(`- Pending tasks: ${stats.pendingTasks}`);
  if (stats.tokenCostToday != null) lines.push(`- Token cost: ~$${stats.tokenCostToday.toFixed(2)}`);
  lines.push(`- Collab projects: ${stats.collabProjects} · Study groups: ${stats.studyGroups}`);

  return lines.join("\n");
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

/**
 * Deliver a digest according to the configured delivery channels.
 * Returns a summary of what was delivered.
 */
export async function deliverDigest(
  digest: DailyDigest,
  config: DigestConfig,
  root: string
): Promise<string[]> {
  const results: string[] = [];

  // File delivery
  if (config.delivery.file?.enabled !== false) {
    const dirPath = join(root, config.delivery.file?.path ?? LOGS_DIR);
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

    const filePath = join(dirPath, `${digest.date}.md`);
    writeFileSync(filePath, formatDigest(digest, "markdown"), "utf-8");
    results.push(`✅ Saved to ${config.delivery.file?.path ?? LOGS_DIR}/${digest.date}.md`);
  }

  // Telegram webhook
  if (config.delivery.telegram?.enabled && config.delivery.telegram.webhookUrl) {
    try {
      const text = formatDigest(digest, "text");
      const res  = await fetch(config.delivery.telegram.webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      results.push(res.ok ? "✅ Telegram delivery sent" : `⚠️ Telegram delivery failed: HTTP ${res.status}`);
    } catch (e) {
      results.push(`❌ Telegram delivery error: ${(e as Error).message}`);
    }
  }

  // Email webhook
  if (config.delivery.email?.enabled && config.delivery.email.webhookUrl) {
    try {
      const body = JSON.stringify({
        to:      config.delivery.email.address,
        subject: `DAI Digest — ${digest.date}: ${digest.headline}`,
        text:    formatDigest(digest, "text"),
        html:    formatDigest(digest, "markdown"),
      });
      const res = await fetch(config.delivery.email.webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      results.push(res.ok ? "✅ Email delivery sent" : `⚠️ Email delivery failed: HTTP ${res.status}`);
    } catch (e) {
      results.push(`❌ Email delivery error: ${(e as Error).message}`);
    }
  }

  return results;
}

// ─── Dashboard JSON endpoint ──────────────────────────────────────────────────

/**
 * Return digest data formatted for the dashboard /api/digest endpoint.
 * Lightweight — only stats + section summaries, not full content.
 */
export function getDigestWidgetData(root: string): {
  date: string;
  headline: string;
  stats: DailyDigest["stats"];
  sections: Array<{ title: string; icon: string; count: number; preview?: string }>;
} {
  const digest = generateDigest(root);

  return {
    date:     digest.date,
    headline: digest.headline,
    stats:    digest.stats,
    sections: [
      digest.autonomousActions,
      digest.tasksCompleted,
      digest.upcomingTasks,
      digest.collaboration,
    ].map((s) => ({
      title:   s.title,
      icon:    s.icon,
      count:   s.items.length,
      preview: s.items[0],
    })),
  };
}
