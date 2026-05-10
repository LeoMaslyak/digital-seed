#!/usr/bin/env bun
/**
 * Digital Seed Token Report — View token usage across providers.
 */

import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const USAGE_FILE = join(ROOT, "data", "token-usage.json");

interface TokenUsage {
  total: number;
  estimatedCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byDay: Record<string, number>;
}

function loadUsage(): TokenUsage {
  if (!existsSync(USAGE_FILE)) {
    return { total: 0, estimatedCost: 0, byProvider: {}, byDay: {} };
  }
  try {
    return JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
  } catch {
    return { total: 0, estimatedCost: 0, byProvider: {}, byDay: {} };
  }
}

const usage = loadUsage();

console.log("\n💰 Digital Seed Token Usage Report\n");

if (usage.total === 0) {
  console.log("  No usage recorded yet. Start using your AI agent to see stats here.");
  console.log("  Token tracking will update as you use MCP-connected tools.\n");
} else {
  console.log(`  Total tokens:    ${usage.total.toLocaleString()}`);
  console.log(`  Estimated cost:  $${usage.estimatedCost.toFixed(2)}`);
  console.log("");

  if (Object.keys(usage.byProvider).length > 0) {
    console.log("  By provider:");
    for (const [provider, data] of Object.entries(usage.byProvider)) {
      console.log(`    ${provider}: ${data.tokens.toLocaleString()} tokens ($${data.cost.toFixed(2)})`);
    }
  }
  console.log("");
}
