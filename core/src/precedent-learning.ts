/**
 * DAI Precedent Learning — Track human approvals/rejections of autonomous actions.
 *
 * Over time, builds confidence profiles per action category. When a category
 * reaches ≥95% approval with ≥8 samples, it can be auto-promoted to a higher
 * autonomy tier (off→notify, notify→auto). High-risk actions are never
 * auto-promoted.
 *
 * Storage: data/precedents.json
 *
 * Integration points:
 *   - autonomy.ts: checkPermission() consults precedents before static rules
 *   - run-task.ts: logs task outcomes as precedents
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrecedentRecord {
  id: string;
  action: string;
  category: string;
  outcome: "approved" | "rejected" | "modified";
  timestamp: string;
  context?: string;
  confidence: number;  // Computed confidence at time of recording
}

export interface PrecedentCheck {
  confidence: number;         // 0–1 based on historical outcomes
  recommendation: "allow" | "deny" | "ask";
  sampleCount: number;
  approvalRate: number;
  reason: string;
}

export interface CategoryStats {
  category: string;
  total: number;
  approved: number;
  rejected: number;
  modified: number;
  approvalRate: number;
  confidence: number;
  canPromote: boolean;
}

export interface PrecedentSummary {
  totalDecisions: number;
  categories: CategoryStats[];
  promotedCategories: string[];
}

// Categories that should never be auto-promoted regardless of approval rate
const HIGH_RISK_CATEGORIES = new Set([
  "email-send",
  "file-delete",
  "external-api",
  "payment",
  "publish",
  "deploy",
]);

const PRECEDENTS_FILE = "data/precedents.json";
const DATA_DIR = "data";

// Promotion thresholds
const PROMOTE_APPROVAL_RATE = 0.95;
const PROMOTE_MIN_SAMPLES = 8;

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Record the outcome of an autonomous action.
 */
export function recordOutcome(
  root: string,
  action: string,
  category: string,
  outcome: "approved" | "rejected" | "modified",
  context?: string
): PrecedentRecord {
  const records = loadPrecedents(root);
  const confidence = computeConfidence(records, category);

  const record: PrecedentRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    category,
    outcome,
    timestamp: new Date().toISOString(),
    context,
    confidence,
  };

  records.push(record);
  savePrecedents(root, records);
  return record;
}

/**
 * Check precedent history for an action category.
 * Returns a confidence level and recommendation.
 */
export function checkPrecedent(
  root: string,
  action: string,
  category: string
): PrecedentCheck {
  const records = loadPrecedents(root);
  const categoryRecords = records.filter((r) => r.category === category);

  if (categoryRecords.length === 0) {
    return {
      confidence: 0,
      recommendation: "ask",
      sampleCount: 0,
      approvalRate: 0,
      reason: "No precedent history for this category",
    };
  }

  const approved = categoryRecords.filter((r) => r.outcome === "approved").length;
  const approvalRate = approved / categoryRecords.length;
  const confidence = computeConfidence(records, category);

  // Also check action-specific precedents for more targeted recommendations
  const actionRecords = categoryRecords.filter((r) => r.action === action);
  const actionApproved = actionRecords.filter((r) => r.outcome === "approved").length;
  const actionRate = actionRecords.length > 0 ? actionApproved / actionRecords.length : approvalRate;

  // Use the more conservative of category-level and action-level rates
  const effectiveRate = Math.min(approvalRate, actionRate);

  let recommendation: "allow" | "deny" | "ask";
  let reason: string;

  if (effectiveRate >= PROMOTE_APPROVAL_RATE && categoryRecords.length >= PROMOTE_MIN_SAMPLES) {
    recommendation = "allow";
    reason = `High confidence: ${(effectiveRate * 100).toFixed(0)}% approval over ${categoryRecords.length} decisions`;
  } else if (effectiveRate < 0.3 && categoryRecords.length >= 3) {
    recommendation = "deny";
    reason = `Low approval rate: ${(effectiveRate * 100).toFixed(0)}% over ${categoryRecords.length} decisions`;
  } else {
    recommendation = "ask";
    reason = `Moderate confidence: ${(effectiveRate * 100).toFixed(0)}% approval over ${categoryRecords.length} decisions`;
  }

  return {
    confidence,
    recommendation,
    sampleCount: categoryRecords.length,
    approvalRate,
    reason,
  };
}

/**
 * Check if a category qualifies for autonomy promotion.
 * Promotes off→notify or notify→auto.
 * Never auto-promotes high-risk categories.
 *
 * Returns the new level if promoted, null otherwise.
 */
export function autoPromote(
  root: string,
  category: string
): { promoted: boolean; from?: string; to?: string; reason: string } {
  if (HIGH_RISK_CATEGORIES.has(category)) {
    return { promoted: false, reason: "High-risk category — never auto-promoted" };
  }

  const records = loadPrecedents(root);
  const categoryRecords = records.filter((r) => r.category === category);

  if (categoryRecords.length < PROMOTE_MIN_SAMPLES) {
    return {
      promoted: false,
      reason: `Insufficient samples: ${categoryRecords.length}/${PROMOTE_MIN_SAMPLES}`,
    };
  }

  const approved = categoryRecords.filter((r) => r.outcome === "approved").length;
  const approvalRate = approved / categoryRecords.length;

  if (approvalRate < PROMOTE_APPROVAL_RATE) {
    return {
      promoted: false,
      reason: `Approval rate ${(approvalRate * 100).toFixed(0)}% < ${(PROMOTE_APPROVAL_RATE * 100).toFixed(0)}% threshold`,
    };
  }

  // Qualified for promotion — determine current and next level
  // Read current autonomy config to know what level to promote from
  const autonomyPath = join(root, "config", "autonomy.yaml");
  let currentLevel = "off";
  if (existsSync(autonomyPath)) {
    try {
      const yaml = require("js-yaml");
      const config = yaml.load(readFileSync(autonomyPath, "utf-8")) as Record<string, string>;
      currentLevel = config[category] || "off";
    } catch {
      // Fall through with "off"
    }
  }

  const nextLevel = currentLevel === "off" ? "notify" : currentLevel === "notify" ? "auto" : null;

  if (!nextLevel) {
    return { promoted: false, reason: "Already at maximum autonomy level (auto)" };
  }

  return {
    promoted: true,
    from: currentLevel,
    to: nextLevel,
    reason: `${(approvalRate * 100).toFixed(0)}% approval over ${categoryRecords.length} decisions → promoting ${currentLevel}→${nextLevel}`,
  };
}

/**
 * Get summary statistics across all categories.
 */
export function getPrecedentStats(root: string): PrecedentSummary {
  const records = loadPrecedents(root);

  // Group by category
  const byCategory: Record<string, PrecedentRecord[]> = {};
  for (const r of records) {
    (byCategory[r.category] ||= []).push(r);
  }

  const categories: CategoryStats[] = Object.entries(byCategory).map(([category, recs]) => {
    const approved = recs.filter((r) => r.outcome === "approved").length;
    const rejected = recs.filter((r) => r.outcome === "rejected").length;
    const modified = recs.filter((r) => r.outcome === "modified").length;
    const approvalRate = recs.length > 0 ? approved / recs.length : 0;
    const confidence = computeConfidence(records, category);
    const canPromote =
      !HIGH_RISK_CATEGORIES.has(category) &&
      approvalRate >= PROMOTE_APPROVAL_RATE &&
      recs.length >= PROMOTE_MIN_SAMPLES;

    return { category, total: recs.length, approved, rejected, modified, approvalRate, confidence, canPromote };
  });

  // Sort by total decisions descending
  categories.sort((a, b) => b.total - a.total);

  const promotedCategories = categories
    .filter((c) => c.canPromote)
    .map((c) => c.category);

  return {
    totalDecisions: records.length,
    categories,
    promotedCategories,
  };
}

/**
 * Check if a category is high-risk (never auto-promoted).
 */
export function isHighRisk(category: string): boolean {
  return HIGH_RISK_CATEGORIES.has(category);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadPrecedents(root: string): PrecedentRecord[] {
  const path = join(root, PRECEDENTS_FILE);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

function savePrecedents(root: string, records: PrecedentRecord[]): void {
  ensureDir(join(root, DATA_DIR));
  writeFileSync(
    join(root, PRECEDENTS_FILE),
    JSON.stringify(records, null, 2),
    "utf-8"
  );
}

// ---------------------------------------------------------------------------
// Confidence computation
// ---------------------------------------------------------------------------

/**
 * Compute confidence for a category based on sample size and consistency.
 *
 * Uses a simple Bayesian-inspired formula:
 *   confidence = approvalRate × (1 - 1/(sampleCount + 1))
 *
 * This rewards both high approval rates AND sufficient sample sizes.
 * With 0 samples → 0, with 8 samples at 100% → ~0.89, with 20 at 95% → ~0.90.
 */
function computeConfidence(records: PrecedentRecord[], category: string): number {
  const categoryRecords = records.filter((r) => r.category === category);
  if (categoryRecords.length === 0) return 0;

  const approved = categoryRecords.filter((r) => r.outcome === "approved").length;
  const approvalRate = approved / categoryRecords.length;
  const sampleFactor = 1 - 1 / (categoryRecords.length + 1);

  return approvalRate * sampleFactor;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
