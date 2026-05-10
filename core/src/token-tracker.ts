/**
 * Digital Seed Token Tracker — Track spending across providers with budget awareness.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface TokenEvent {
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  context?: string;          // what the tokens were used for
}

export interface TokenBudget {
  dailyLimit?: number;       // dollars
  monthlyLimit?: number;     // dollars
  warnAtPercent: number;     // warn when budget used this much (default 80)
}

export interface TokenUsage {
  total: number;
  estimatedCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byDay: Record<string, { tokens: number; cost: number }>;
  events: TokenEvent[];
}

const USAGE_FILE = "data/token-usage.json";
const BUDGET_FILE = "config/token-budget.json";

// Cost per 1M tokens (rough estimates, update as needed)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
  "claude-opus-4": { input: 15.0, output: 75.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "ollama": { input: 0, output: 0 },          // free
  "local": { input: 0, output: 0 },            // free
};

function loadUsage(root: string): TokenUsage {
  const path = join(root, USAGE_FILE);
  if (!existsSync(path)) {
    return { total: 0, estimatedCost: 0, byProvider: {}, byDay: {}, events: [] };
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { total: 0, estimatedCost: 0, byProvider: {}, byDay: {}, events: [] };
  }
}

function saveUsage(root: string, usage: TokenUsage): void {
  const dir = join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, USAGE_FILE), JSON.stringify(usage, null, 2), "utf-8");
}

export function loadBudget(root: string): TokenBudget {
  const path = join(root, BUDGET_FILE);
  if (!existsSync(path)) return { warnAtPercent: 80 };
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { warnAtPercent: 80 };
  }
}

/**
 * Record a token usage event.
 */
export function recordTokenUsage(root: string, event: TokenEvent): {
  recorded: boolean;
  budgetWarning?: string;
} {
  const usage = loadUsage(root);
  const totalTokens = event.inputTokens + event.outputTokens;

  // Update totals
  usage.total += totalTokens;
  usage.estimatedCost += event.estimatedCost;

  // By provider
  if (!usage.byProvider[event.provider]) {
    usage.byProvider[event.provider] = { tokens: 0, cost: 0 };
  }
  usage.byProvider[event.provider].tokens += totalTokens;
  usage.byProvider[event.provider].cost += event.estimatedCost;

  // By day
  const day = event.timestamp.slice(0, 10);
  if (!usage.byDay[day]) {
    usage.byDay[day] = { tokens: 0, cost: 0 };
  }
  usage.byDay[day].tokens += totalTokens;
  usage.byDay[day].cost += event.estimatedCost;

  // Add event (keep last 1000)
  usage.events.push(event);
  if (usage.events.length > 1000) {
    usage.events = usage.events.slice(-1000);
  }

  saveUsage(root, usage);

  // Check budget
  const budget = loadBudget(root);
  const today = new Date().toISOString().slice(0, 10);
  const todayCost = usage.byDay[today]?.cost || 0;

  if (budget.dailyLimit && todayCost >= budget.dailyLimit * (budget.warnAtPercent / 100)) {
    if (todayCost >= budget.dailyLimit) {
      return { recorded: true, budgetWarning: `⛔ Daily budget exceeded: $${todayCost.toFixed(2)} / $${budget.dailyLimit}` };
    }
    return { recorded: true, budgetWarning: `⚠️ Approaching daily budget: $${todayCost.toFixed(2)} / $${budget.dailyLimit}` };
  }

  return { recorded: true };
}

/**
 * Estimate cost for a model/token count.
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelKey = Object.keys(COST_TABLE).find((k) => model.toLowerCase().includes(k.toLowerCase()));
  if (!modelKey) return 0;
  const costs = COST_TABLE[modelKey];
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}

/**
 * Get a formatted usage report.
 */
export function getUsageReport(root: string): string {
  const usage = loadUsage(root);
  if (usage.total === 0) return "No token usage recorded yet.";

  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = usage.byDay[today];

  let report = `# Token Usage Report\n\n`;
  report += `**Total:** ${usage.total.toLocaleString()} tokens ($${usage.estimatedCost.toFixed(2)})\n\n`;

  if (todayUsage) {
    report += `**Today:** ${todayUsage.tokens.toLocaleString()} tokens ($${todayUsage.cost.toFixed(2)})\n\n`;
  }

  if (Object.keys(usage.byProvider).length > 0) {
    report += `**By Provider:**\n`;
    for (const [provider, data] of Object.entries(usage.byProvider)) {
      report += `- ${provider}: ${data.tokens.toLocaleString()} tokens ($${data.cost.toFixed(2)})\n`;
    }
  }

  return report;
}
