/**
 * DAI Session Summarizer — Compress conversation history and maintain shift handoffs.
 *
 * Detects when context window is growing large, compresses older conversation
 * into structured summaries, and creates handoff notes for session continuity.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime: string;
  topics: string[];
  keyDecisions: string[];
  actionItems: string[];
  factsLearned: string[];
  tokenEstimate: number;
}

export interface ShiftHandoff {
  timestamp: string;
  whatWasDone: string[];
  inProgress: string[];
  needsVerification: string[];
  nextSteps: string[];
}

const SESSIONS_DIR = "data/sessions";
const HANDOFF_FILE = "data/shift-handoff.json";

/**
 * Generate a structured summary from a conversation transcript.
 * This is designed to be called by the AI agent with the transcript as input.
 */
export function generateSummaryPrompt(transcript: string, maxTokens: number): string {
  return `Summarize this conversation into a structured format. Be concise — target ~${maxTokens} tokens.

## Required Sections

### Topics Discussed
- List the main topics (one line each)

### Key Decisions
- Any decisions made (with reasoning)

### Action Items
- Things to do next (with owners if mentioned)

### Facts Learned
- New information about the user that should be remembered

### Open Questions
- Things left unresolved

## Transcript
${transcript}`;
}

/**
 * Save a session summary.
 */
export function saveSessionSummary(root: string, summary: SessionSummary): void {
  const dir = join(root, SESSIONS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, `${summary.sessionId}.json`);
  writeFileSync(file, JSON.stringify(summary, null, 2), "utf-8");
}

/**
 * Create a shift handoff note for session continuity.
 */
export function createHandoff(root: string, handoff: ShiftHandoff): void {
  const dir = join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, HANDOFF_FILE), JSON.stringify(handoff, null, 2), "utf-8");
}

/**
 * Load the last shift handoff (if any).
 */
export function loadHandoff(root: string): ShiftHandoff | null {
  const path = join(root, HANDOFF_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Get a formatted handoff message for the new session to read.
 */
export function getHandoffPrompt(root: string): string {
  const handoff = loadHandoff(root);
  if (!handoff) return "No previous session handoff found. Starting fresh.";

  return `# Session Handoff (from ${handoff.timestamp})

## What Was Done
${handoff.whatWasDone.map((d) => `- ${d}`).join("\n") || "- Nothing recorded"}

## In Progress
${handoff.inProgress.map((d) => `- ${d}`).join("\n") || "- Nothing in progress"}

## Needs Verification
${handoff.needsVerification.map((d) => `- ⚠️ ${d}`).join("\n") || "- Nothing to verify"}

## Suggested Next Steps
${handoff.nextSteps.map((d) => `- ${d}`).join("\n") || "- No specific suggestions"}
`;
}
