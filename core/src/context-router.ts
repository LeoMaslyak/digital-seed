/**
 * DAI Context Router — Intelligently decides where new information should be stored.
 *
 * Routes information to the correct file based on content classification:
 *   - Identity facts → USER.md
 *   - Goals/aspirations → GOALS.md
 *   - Workflow preferences → PREFERENCES.md
 *   - Durable cross-session facts → MEMORY.md
 *   - Task-specific context → ephemeral (not persisted)
 *   - Temporal info → tasks/calendar
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export type ContextCategory =
  | "identity"       // → USER.md
  | "goal"           // → GOALS.md
  | "preference"     // → PREFERENCES.md
  | "memory"         // → MEMORY.md
  | "task"           // → tasks server
  | "ephemeral";     // → don't persist

export interface ContextEntry {
  content: string;
  category: ContextCategory;
  confidence: number;       // 0-1
  source: string;           // where it came from ("interview", "conversation", "silent-learning")
  timestamp: string;
}

export interface RoutingResult {
  category: ContextCategory;
  confidence: number;
  targetFile: string | null;  // null for ephemeral
  section?: string;           // suggested section within the file
  reason: string;
}

// Rule-based classifier — fast, deterministic, no LLM needed
const ROUTING_RULES: Array<{
  patterns: RegExp[];
  category: ContextCategory;
  section?: string;
  reason: string;
}> = [
  // Identity
  {
    patterns: [/\b(my name|i am|i'm|i work|my role|my job|my title|i live|my timezone|my email|my phone)\b/i],
    category: "identity",
    section: "Notes",
    reason: "Contains identity/demographic information",
  },
  // Goals
  {
    patterns: [/\b(my goal|i want to|i'm trying to|i aim|my objective|my mission|my vision|working toward|milestone|deadline)\b/i],
    category: "goal",
    section: "Active Goals",
    reason: "Contains goal or aspiration",
  },
  // Preferences
  {
    patterns: [/\b(i prefer|i like|i don't like|i hate|always use|never use|my style|pet peeve|i want you to|don't ever)\b/i],
    category: "preference",
    reason: "Contains workflow or communication preference",
  },
  // Temporal / task
  {
    patterns: [/\b(tomorrow|next week|by friday|due date|meeting at|deadline|remind me|schedule|appointment)\b/i],
    category: "task",
    reason: "Contains temporal/task information",
  },
  // Memory (durable facts)
  {
    patterns: [/\b(i learned|key takeaway|important|remember that|note to self|decision|we decided|the answer is)\b/i],
    category: "memory",
    section: "Key Facts",
    reason: "Contains durable fact worth remembering",
  },
];

/**
 * Classify a piece of information and route it to the right storage.
 */
export function routeContext(content: string, root: string): RoutingResult {
  // Try rule-based classification first
  for (const rule of ROUTING_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(content)) {
        return {
          category: rule.category,
          confidence: 0.8,
          targetFile: getTargetFile(rule.category, root),
          section: rule.section,
          reason: rule.reason,
        };
      }
    }
  }

  // Default: ephemeral (don't persist unless explicitly asked)
  return {
    category: "ephemeral",
    confidence: 0.5,
    targetFile: null,
    reason: "No strong signal for persistence — treating as ephemeral",
  };
}

/**
 * Persist a context entry to its target file.
 */
export function persistContext(entry: ContextEntry, root: string): boolean {
  const routing = routeContext(entry.content, root);
  if (!routing.targetFile) return false;

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const line = `- [${timestamp}] ${entry.content}`;

  const filePath = routing.targetFile;
  if (!existsSync(filePath)) return false;

  let fileContent = readFileSync(filePath, "utf-8");

  if (routing.section) {
    const sectionHeader = `## ${routing.section}`;
    if (fileContent.includes(sectionHeader)) {
      fileContent = fileContent.replace(sectionHeader, `${sectionHeader}\n${line}`);
    } else {
      fileContent += `\n\n${sectionHeader}\n${line}\n`;
    }
  } else {
    fileContent += `\n${line}\n`;
  }

  writeFileSync(filePath, fileContent, "utf-8");
  return true;
}

/**
 * Check if a fact already exists in the target file (deduplication).
 */
export function isDuplicate(content: string, root: string): boolean {
  const routing = routeContext(content, root);
  if (!routing.targetFile || !existsSync(routing.targetFile)) return false;

  const fileContent = readFileSync(routing.targetFile, "utf-8").toLowerCase();
  // Simple substring check — can be enhanced with embedding similarity
  const normalized = content.toLowerCase().trim();
  return fileContent.includes(normalized);
}

function getTargetFile(category: ContextCategory, root: string): string | null {
  const map: Record<ContextCategory, string | null> = {
    identity: join(root, "user", "USER.md"),
    goal: join(root, "user", "GOALS.md"),
    preference: join(root, "user", "PREFERENCES.md"),
    memory: join(root, "user", "MEMORY.md"),
    task: null,       // goes to tasks MCP server, not a file
    ephemeral: null,  // not persisted
  };
  return map[category];
}

export { ROUTING_RULES };
