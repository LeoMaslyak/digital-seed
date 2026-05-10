/**
 * Digital Seed Activity State Detection — Infer user presence from message signals.
 *
 * States (ordered by specificity):
 *   active-desk   — recent messages, desktop-length content → collaborative mode
 *   active-mobile — recent messages, short/voice → execution mode, minimal interruption
 *   away          — no signals for >45 min → full autonomy, batch for briefing
 *   sleeping      — night hours + no signals for >60 min → silence, critical only
 *
 * Signal recording:
 *   Call recordSignal() whenever the user sends a message.
 *   Signals are stored in data/activity-signals.json (rolling 100-entry window).
 *
 * Usage:
 *   import { recordSignal, detectActivityState } from "core/src/activity-state.ts";
 *
 *   // On every incoming user message:
 *   recordSignal(root, { messageLength: msg.length, isVoice: false });
 *
 *   // Before deciding whether to interrupt:
 *   const state = detectActivityState(root);
 *   if (state.state === "sleeping") return; // don't interrupt
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityStateValue =
  | "active-desk"    // at computer, longer messages, full collaboration mode
  | "active-mobile"  // on phone, short messages or voice, minimal interruptions
  | "away"           // no recent signals, agent acts autonomously, batches results
  | "sleeping";      // night hours + extended silence, critical-only alerts

export interface ActivitySignal {
  timestamp: string;
  messageLength: number;
  isVoice: boolean;           // voice transcription (short but not mobile-disengaged)
  channelType?: string;       // telegram, discord, cli, etc.
}

export interface ActivityStateResult {
  state: ActivityStateValue;
  confidence: number;         // 0–1
  reason: string;
  lastSignalMinutesAgo: number;
  signalsInWindow: number;    // how many signals in the last 30 min
  avgMessageLength: number;
  voiceRatio: number;         // 0–1 fraction of recent messages that are voice
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNALS_FILE       = "data/activity-signals.json";
const MAX_SIGNALS        = 100;       // rolling window cap
const RECENT_WINDOW_MIN  = 30;        // minutes to look back for "recent" signals
const ACTIVE_THRESHOLD   = 10;        // minutes: last signal within this → active
const AWAY_THRESHOLD     = 45;        // minutes: beyond this → away
const SLEEPING_THRESHOLD = 60;        // minutes without signal during night hours

/** Hour range (local) considered "sleeping" — 23:00 to 07:00 */
const SLEEP_START = 23;
const SLEEP_END   = 7;

/** Short message = likely mobile (characters) */
const MOBILE_MSG_LENGTH = 80;

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadSignals(root: string): ActivitySignal[] {
  const path = join(root, SIGNALS_FILE);
  if (!existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return []; }
}

function saveSignals(root: string, signals: ActivitySignal[]): void {
  const dir = join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, SIGNALS_FILE), JSON.stringify(signals, null, 2), "utf-8");
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Record a new activity signal. Call this on every incoming user message.
 * Automatically trims the rolling window to MAX_SIGNALS entries.
 */
export function recordSignal(
  root: string,
  signal: Omit<ActivitySignal, "timestamp">
): void {
  const signals = loadSignals(root);
  signals.push({ timestamp: new Date().toISOString(), ...signal });

  // Keep rolling window
  const trimmed = signals.slice(-MAX_SIGNALS);
  saveSignals(root, trimmed);
}

/**
 * Detect the current activity state from recent signals.
 * Returns the state, confidence score, and diagnostic info.
 */
export function detectActivityState(root: string): ActivityStateResult {
  const signals  = loadSignals(root);
  const now      = new Date();
  const nowMs    = now.getTime();
  const hour     = now.getHours();

  // Helper: minutes since a signal
  const minutesAgo = (s: ActivitySignal) =>
    (nowMs - new Date(s.timestamp).getTime()) / 60_000;

  // Most recent signal
  const lastSignal = signals.at(-1);
  const lastSignalMin = lastSignal ? minutesAgo(lastSignal) : Infinity;

  // Recent signals in the analysis window
  const recentSignals = signals.filter((s) => minutesAgo(s) <= RECENT_WINDOW_MIN);
  const signalsInWindow = recentSignals.length;

  // Message length and voice stats (recent window)
  const avgMessageLength = signalsInWindow > 0
    ? recentSignals.reduce((sum, s) => sum + s.messageLength, 0) / signalsInWindow
    : 0;

  const voiceCount = recentSignals.filter((s) => s.isVoice).length;
  const voiceRatio = signalsInWindow > 0 ? voiceCount / signalsInWindow : 0;

  // ── State logic (ordered: most specific first) ────────────────────────────

  // Sleeping: night hours + extended silence
  const isNightHour = hour >= SLEEP_START || hour < SLEEP_END;
  if (isNightHour && lastSignalMin > SLEEPING_THRESHOLD) {
    return {
      state: "sleeping",
      confidence: Math.min(0.95, 0.6 + (lastSignalMin - SLEEPING_THRESHOLD) / 200),
      reason: `Night hours (${hour}:xx) + no signals for ${Math.round(lastSignalMin)}m`,
      lastSignalMinutesAgo: lastSignalMin,
      signalsInWindow,
      avgMessageLength,
      voiceRatio,
    };
  }

  // Away: no recent activity
  if (lastSignalMin > AWAY_THRESHOLD) {
    const conf = Math.min(0.95, 0.5 + (lastSignalMin - AWAY_THRESHOLD) / 120);
    return {
      state: "away",
      confidence: conf,
      reason: `No signals for ${lastSignalMin === Infinity ? "∞" : Math.round(lastSignalMin)}m (threshold: ${AWAY_THRESHOLD}m)`,
      lastSignalMinutesAgo: lastSignalMin,
      signalsInWindow,
      avgMessageLength,
      voiceRatio,
    };
  }

  // Active — differentiate mobile vs desk
  if (lastSignalMin <= ACTIVE_THRESHOLD) {
    const isMobile =
      avgMessageLength < MOBILE_MSG_LENGTH || voiceRatio >= 0.4;

    if (isMobile) {
      const conf = 0.6
        + (MOBILE_MSG_LENGTH - Math.min(avgMessageLength, MOBILE_MSG_LENGTH)) / (MOBILE_MSG_LENGTH * 2)
        + voiceRatio * 0.2;
      return {
        state: "active-mobile",
        confidence: Math.min(0.92, conf),
        reason: isMobile && voiceRatio >= 0.4
          ? `Voice ratio ${(voiceRatio * 100).toFixed(0)}% (phone/voice mode)`
          : `Short messages (avg ${Math.round(avgMessageLength)} chars < ${MOBILE_MSG_LENGTH})`,
        lastSignalMinutesAgo: lastSignalMin,
        signalsInWindow,
        avgMessageLength,
        voiceRatio,
      };
    }

    return {
      state: "active-desk",
      confidence: Math.min(0.92, 0.65 + signalsInWindow * 0.03),
      reason: `Recent signal ${Math.round(lastSignalMin)}m ago, avg ${Math.round(avgMessageLength)} chars`,
      lastSignalMinutesAgo: lastSignalMin,
      signalsInWindow,
      avgMessageLength,
      voiceRatio,
    };
  }

  // Between ACTIVE_THRESHOLD and AWAY_THRESHOLD — fading activity
  const fadeFraction = (lastSignalMin - ACTIVE_THRESHOLD) / (AWAY_THRESHOLD - ACTIVE_THRESHOLD);
  return {
    state: "away",
    confidence: 0.4 + fadeFraction * 0.3,
    reason: `Fading — last signal ${Math.round(lastSignalMin)}m ago`,
    lastSignalMinutesAgo: lastSignalMin,
    signalsInWindow,
    avgMessageLength,
    voiceRatio,
  };
}

/**
 * Should the agent surface a non-critical notification in this state?
 * Use this before interrupting the user with anything non-urgent.
 */
export function shouldSurfaceNotification(state: ActivityStateValue): boolean {
  return state === "active-desk";   // only interrupt at the desk
}

/**
 * Should the agent run autonomous tasks right now?
 * Returns true for away/sleeping (full autonomy) and notify-level active states.
 */
export function shouldRunAutonomously(state: ActivityStateValue): boolean {
  return state === "away" || state === "sleeping" || state === "active-mobile";
}

/**
 * Behaviour guidance for agents based on current state.
 */
export function getStateBehaviourGuidance(state: ActivityStateValue): string {
  const guidance: Record<ActivityStateValue, string> = {
    "active-desk": [
      "User is at their computer. Surface results, ask clarifying questions, be collaborative.",
      "Non-critical notifications are welcome. Quality over speed.",
    ].join(" "),
    "active-mobile": [
      "User is on mobile. Keep responses short. No long lists or formatted tables.",
      "Batch non-urgent items for later. Avoid unnecessary follow-up questions.",
    ].join(" "),
    "away": [
      "User is away. Execute autonomous tasks, log everything, batch for briefing.",
      "Only surface critical issues. Prepare a digest for when they return.",
    ].join(" "),
    "sleeping": [
      "User is sleeping. SILENCE — no interruptions unless P1 outage or critical data loss.",
      "Log all actions. Prepare morning briefing.",
    ].join(" "),
  };
  return guidance[state];
}

/**
 * Human-readable state label with icon.
 */
export function describeState(result: ActivityStateResult): string {
  const icons: Record<ActivityStateValue, string> = {
    "active-desk":   "💻",
    "active-mobile": "📱",
    "away":          "🌙",
    "sleeping":      "😴",
  };
  return [
    `${icons[result.state]} ${result.state} (${(result.confidence * 100).toFixed(0)}% confidence)`,
    `   Last signal: ${result.lastSignalMinutesAgo === Infinity ? "never" : `${Math.round(result.lastSignalMinutesAgo)}m ago`}`,
    `   Signals/30m: ${result.signalsInWindow}  avg length: ${Math.round(result.avgMessageLength)} chars  voice: ${(result.voiceRatio * 100).toFixed(0)}%`,
    `   ${result.reason}`,
  ].join("\n");
}

/**
 * Convenience: detect state and return just the value (for simple guards).
 */
export function getState(root: string): ActivityStateValue {
  return detectActivityState(root).state;
}
