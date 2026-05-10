/**
 * Digital Seed Offline Mode — Graceful degradation when no internet is available.
 *
 * When offline mode is active:
 *   - Network-dependent tasks (email-triage, research-updates) are skipped
 *   - RAG embedding is disabled (uses cached vectors only)
 *   - Token tracking still works (local only)
 *   - All local operations (memory, tasks, collab, digest) continue normally
 *
 * Enable offline mode:
 *   config/config.yaml → offline: true
 *   OR set environment variable: DAI_OFFLINE=true
 *
 * Auto-detection:
 *   Call detectConnectivity() to test reachability and auto-update config.
 *   The scheduler calls this once at startup.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Task categories that require network connectivity. */
export const NETWORK_REQUIRED_CATEGORIES = [
  "email-triage",
  "research-updates",
  "daily-digest",   // only if delivery hooks are enabled
] as const;

/** Quick connectivity check targets (tried in order, first success = online). */
const CONNECTIVITY_CHECKS = [
  "https://1.1.1.1",
  "https://dns.google",
];

const CONFIG_FILE = "config/config.yaml";

// ─── Config ───────────────────────────────────────────────────────────────────

interface AppConfig {
  offline?: boolean;
  [key: string]: unknown;
}

function loadAppConfig(root: string): AppConfig {
  const path = join(root, CONFIG_FILE);
  if (!existsSync(path)) return {};
  try {
    return (yaml.load(readFileSync(path, "utf-8")) as AppConfig) ?? {};
  } catch {
    return {};
  }
}

function saveAppConfig(root: string, config: AppConfig): void {
  const dir = join(root, "config");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, CONFIG_FILE), yaml.dump(config), "utf-8");
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Returns true if offline mode is currently active.
 * Checks: env var DAI_OFFLINE → config/config.yaml → default (false).
 */
export function isOfflineMode(root: string): boolean {
  if (process.env.DAI_OFFLINE === "true") return true;
  if (process.env.DAI_OFFLINE === "false") return false;
  return loadAppConfig(root).offline === true;
}

/**
 * Enable or disable offline mode in config/config.yaml.
 */
export function setOfflineMode(root: string, offline: boolean): void {
  const config = loadAppConfig(root);
  config.offline = offline;
  saveAppConfig(root, config);
}

/**
 * Test network connectivity by fetching a lightweight URL.
 * Returns true if any check target responds within 3 seconds.
 */
export async function detectConnectivity(timeoutMs = 3000): Promise<boolean> {
  for (const url of CONNECTIVITY_CHECKS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok || res.status < 500) return true;
    } catch {
      // try next
    }
  }
  return false;
}

/**
 * Auto-detect connectivity and update offline mode config if it changed.
 * Returns the detected state.
 */
export async function autoDetectAndApply(root: string): Promise<{
  online: boolean;
  changed: boolean;
  previous: boolean;
}> {
  const previous = isOfflineMode(root);
  const online   = await detectConnectivity();
  const current  = !online;

  if (current !== previous) {
    setOfflineMode(root, current);
  }

  return { online, changed: current !== previous, previous };
}

/**
 * Returns a status string for CLI display.
 */
export function describeOfflineMode(root: string): string {
  const offline = isOfflineMode(root);
  const envOverride = process.env.DAI_OFFLINE !== undefined;

  if (offline) {
    return [
      "⚠️  Offline mode ACTIVE",
      `   Source: ${envOverride ? "DAI_OFFLINE env var" : "config/config.yaml"}`,
      `   Skipped categories: ${NETWORK_REQUIRED_CATEGORIES.join(", ")}`,
      "   Local operations (memory, tasks, collab, digest) continue normally.",
      "   To disable: set offline: false in config/config.yaml",
    ].join("\n");
  }

  return [
    "✅ Online mode (default)",
    "   All tasks enabled. Set offline: true in config/config.yaml to disable network tasks.",
  ].join("\n");
}
