/**
 * Digital Seed Precedent Learning — Track human approvals/rejections of autonomous actions.
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

/**
 * Outcomes:
 *   approved  — a HUMAN explicitly approved the action (the ONLY outcome that
 *               builds confidence / can lead to promotion).
 *   rejected  — a human rejected it.
 *   modified  — a human changed it before accepting.
 *   auto-ran  — the action ran autonomously and completed; this is NOT a human
 *               approval and does NOT count toward the approval rate or
 *               promotion. Recording success as "approved" would be a
 *               self-approving loop (the system grading its own homework).
 */
export type PrecedentOutcome = "approved" | "rejected" | "modified" | "auto-ran";

/** Where the outcome came from. Only "human" approvals build promotion confidence. */
export type PrecedentSource = "human" | "auto";

export interface PrecedentRecord {
  id: string;
  action: string;
  category: string;
  outcome: PrecedentOutcome;
  source: PrecedentSource;  // Provenance — only "human" outcomes are trusted for promotion
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

// Categories that should never be auto-promoted regardless of approval rate.
//
// These must match the autonomy config category names (see config/autonomy.yaml
// and core/src/autonomy.ts getDefaultConfig) or the guard is a no-op. The
// generic action names below (email-send, payment, …) are kept as belt-and-
// braces in case callers pass action-level categories, but the LIVE config
// categories are the ones that actually gate promotion.
const HIGH_RISK_CATEGORIES = new Set([
  // Live autonomy config categories that can touch the outside world / mutate state:
  "email-triage",        // reads inbox; any send/label path is externally visible
  "memory-maintenance",  // rewrites durable MEMORY.md — re-read every session
  "research-updates",    // fetches untrusted web content
  "daily-digest",        // can POST to a user-set webhook
  // Generic action-level names (defensive — match if a caller uses them):
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
 * Record the outcome of an action.
 *
 * Provenance is enforced here: only outcomes that come from a REAL human
 * (`source: "human"`) are trusted. An `"approved"` outcome with a non-human
 * source is NOT a human approval — it is just an autonomous run that
 * completed — so it is downgraded to `"auto-ran"`, which does not count toward
 * the approval rate or promotion. This closes the self-approving loop where a
 * task that was merely *permitted and queued* recorded itself as "approved" and
 * thereby escalated its own autonomy.
 *
 * `source` DEFAULTS to `"auto"` so any caller that does not explicitly assert a
 * human approval cannot accidentally manufacture one.
 */
export function recordOutcome(
  root: string,
  action: string,
  category: string,
  outcome: PrecedentOutcome,
  context?: string,
  source: PrecedentSource = "auto"
): PrecedentRecord {
  const records = loadPrecedents(root);
  const confidence = computeConfidence(records, category);

  // Provenance gate: an "approved" outcome only counts if a human actually
  // approved it. Anything else recorded as "approved" is reclassified.
  let effectiveOutcome = outcome;
  if (outcome === "approved" && source !== "human") {
    effectiveOutcome = "auto-ran";
  }

  const record: PrecedentRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    category,
    outcome: effectiveOutcome,
    source,
    timestamp: new Date().toISOString(),
    context,
    confidence,
  };

  records.push(record);
  savePrecedents(root, records);
  return record;
}

/**
 * Convenience: record a genuine human approval/rejection/modification.
 * This is the ONLY path that produces promotion-eligible "approved" records.
 * Use this from interactive flows where the live user actually confirmed.
 */
export function recordHumanDecision(
  root: string,
  action: string,
  category: string,
  outcome: "approved" | "rejected" | "modified",
  context?: string
): PrecedentRecord {
  return recordOutcome(root, action, category, outcome, context, "human");
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
  // Only real human decisions count toward trust — autonomous "auto-ran"
  // outcomes are excluded so the system cannot vouch for itself.
  const categoryRecords = humanDecisions(records, category);

  if (categoryRecords.length === 0) {
    return {
      confidence: 0,
      recommendation: "ask",
      sampleCount: 0,
      approvalRate: 0,
      reason: "No human-approval history for this category",
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
 * Check whether a category has earned an autonomy-promotion SUGGESTION
 * (off→notify or notify→auto), based on real human approvals only.
 *
 * IMPORTANT: this function is ADVISORY. It never writes config and never
 * changes what the agent is allowed to do — it returns a recommendation a human
 * must explicitly accept before any autonomy level actually changes. Promotion
 * must remain a human decision; the system must not silently widen its own
 * permissions. High-risk categories are never even suggested.
 *
 * Returns `{ promoted: true, from, to }` only when a human-approval track record
 * justifies SUGGESTING the next level.
 */
export function autoPromote(
  root: string,
  category: string
): { promoted: boolean; from?: string; to?: string; reason: string } {
  if (HIGH_RISK_CATEGORIES.has(category)) {
    return { promoted: false, reason: "High-risk category — never auto-promoted" };
  }

  const records = loadPrecedents(root);
  // Only genuine human approvals justify a promotion suggestion. Autonomous
  // "auto-ran" outcomes are excluded so the system can't promote itself.
  const categoryRecords = humanDecisions(records, category);

  if (categoryRecords.length < PROMOTE_MIN_SAMPLES) {
    return {
      promoted: false,
      reason: `Insufficient human approvals: ${categoryRecords.length}/${PROMOTE_MIN_SAMPLES}`,
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
    // Approval rate and promotion eligibility are computed from HUMAN decisions
    // only — autonomous "auto-ran" records are not approvals and must not count.
    const decisions = humanDecisions(records, category);
    const approved = decisions.filter((r) => r.outcome === "approved").length;
    const rejected = decisions.filter((r) => r.outcome === "rejected").length;
    const modified = decisions.filter((r) => r.outcome === "modified").length;
    const approvalRate = decisions.length > 0 ? approved / decisions.length : 0;
    const confidence = computeConfidence(records, category);
    const canPromote =
      !HIGH_RISK_CATEGORIES.has(category) &&
      approvalRate >= PROMOTE_APPROVAL_RATE &&
      decisions.length >= PROMOTE_MIN_SAMPLES;

    // `total` reports all recorded activity (including auto-ran) for visibility.
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
 * Records for a category that represent a real HUMAN decision.
 *
 * Only human-sourced approve/reject/modify outcomes are evidence of trust.
 * Autonomous successes ("auto-ran") are excluded entirely — they are neither
 * approvals nor rejections, just things the system did on its own, and must
 * never inflate (or deflate) the approval rate that gates promotion.
 */
function humanDecisions(records: PrecedentRecord[], category: string): PrecedentRecord[] {
  return records.filter(
    (r) => r.category === category && r.source === "human" && r.outcome !== "auto-ran"
  );
}

/**
 * Compute confidence for a category based on sample size and consistency.
 *
 * Uses a simple Bayesian-inspired formula:
 *   confidence = approvalRate × (1 - 1/(sampleCount + 1))
 *
 * Only genuine human decisions count. This rewards both high approval rates AND
 * sufficient sample sizes. With 0 human decisions → 0.
 */
function computeConfidence(records: PrecedentRecord[], category: string): number {
  const decisions = humanDecisions(records, category);
  if (decisions.length === 0) return 0;

  const approved = decisions.filter((r) => r.outcome === "approved").length;
  const approvalRate = approved / decisions.length;
  const sampleFactor = 1 - 1 / (decisions.length + 1);

  return approvalRate * sampleFactor;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
