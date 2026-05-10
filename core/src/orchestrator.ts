/**
 * Digital Seed Multi-Layer Agent Orchestrator
 *
 * Three-layer architecture:
 *
 * Layer 1 — Router
 *   Classifies the incoming request using rule-based scoring. Hard-intent
 *   overrides catch explicit action phrases ("write an email", "add a task")
 *   before keyword scoring runs. Falls back to an LLM prompt for ambiguous cases.
 *
 * Layer 2 — Specialists
 *   Each specialist is a YAML config file in agents/. The config provides a
 *   system prompt, tool list, pattern list, quality threshold, and model hint.
 *   The agent adopts the specialist persona for the response.
 *
 * Layer 3 — Quality Gate
 *   After the specialist generates output, a cheap model evaluates it on four
 *   dimensions. If it falls below the threshold, the agent retries with the
 *   feedback as context.
 *
 * Usage pattern (in agent):
 *   1. const decision = classifyRequest(userMessage, DIGITAL_SEED_ROOT)
 *   2. const config = loadAgentConfig(decision.category, DIGITAL_SEED_ROOT)
 *   3. Adopt config.systemPrompt, use config.tools, apply config.patterns
 *   4. Generate output
 *   5. const evalPrompt = buildQualityGatePrompt(userMessage, output)
 *   6. Ask cheap model → parseQualityResponse(response)
 *   7. If !quality.passed && retries < config.maxRetries → retry with feedback
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { runWithQuality, llmJudge, type LLMCallFn, type QualityReport } from "./quality-loop.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpecialistCategory =
  | "research"   // Web research, synthesis, source analysis
  | "learning"   // learning and knowledge work, project analysis, preparation
  | "email"      // Email drafting, triage, replies
  | "writing"    // Essays, reports, documents
  | "code"       // Programming, debugging, code review
  | "life-admin" // Tasks, scheduling, planning
  | "general";   // Catch-all

export interface AgentConfig {
  name: string;
  category: SpecialistCategory;
  description: string;
  systemPrompt: string;
  patterns: string[];        // Pattern names from patterns/ to apply
  tools: string[];           // MCP tool names to use
  modelPreference?: string;  // Prefer a specific model (empty = default)
  qualityThreshold: number;  // Min quality score 0–1 (default 0.7)
  maxRetries: number;        // Max quality-gate retries (default 2)
}

export interface RoutingDecision {
  category: SpecialistCategory;
  confidence: number;         // 0–1
  reason: string;
  scores: Record<SpecialistCategory, number>;  // Full scoring breakdown
  hardIntent?: boolean;       // true if matched via hard-intent override
}

export interface QualityEvaluation {
  score: number;              // 0–1 (average of four dimensions)
  passed: boolean;
  feedback: string;           // What to improve in the retry
  dimensions: {
    answersQuestion: number;  // 0–1
    accurate: number;         // 0–1
    wellStructured: number;   // 0–1
    appropriate: number;      // 0–1 (tone, length, format match)
  };
}

export interface OrchestrationContext {
  request: string;
  routing: RoutingDecision;
  config: AgentConfig;
  iteration: number;          // Current retry count (0 = first attempt)
}

// ---------------------------------------------------------------------------
// Layer 1: Request Classifier
// ---------------------------------------------------------------------------

/**
 * Hard-intent overrides — explicit action phrases beat keyword scoring.
 *
 * When the user clearly states WHAT they want to do (not just the topic),
 * we honour that intent regardless of content keywords. Checked BEFORE scoring.
 */
const HARD_INTENTS: Array<{ pattern: RegExp; category: SpecialistCategory }> = [
  // Email — "write an email", "draft an email to X", "reply to this email"
  { pattern: /\b(write|draft|send|compose)\s+(?:an?\s+)?email\b/i, category: "email"      },
  { pattern: /\breply\s+(?:to|with)\b.*\bemail\b/i,                category: "email"      },
  // Life-admin — "add a task", "create a reminder", "remind me"
  { pattern: /\b(add|create|new)\s+(?:a\s+)?task\b/i,              category: "life-admin" },
  { pattern: /\b(add|set)\s+(?:a\s+)?reminder\b/i,                 category: "life-admin" },
  { pattern: /\bremind me\b/i,                                      category: "life-admin" },
  // Code — "debug this function", "fix this bug"
  { pattern: /\b(debug|fix)\s+(?:this\s+)?(?:code|function|bug|error)\b/i, category: "code" },
  // Writing — "write a report", "draft an essay"
  { pattern: /\b(write|draft)\s+(?:a\s+|an\s+)?(?:essay|report|document|letter|proposal)\b/i, category: "writing" },
];

/**
 * Signal patterns for each specialist category.
 * Each pattern that matches contributes +1 to that category's score.
 * Hard intents (above) are checked first — they bypass this scoring.
 */
const ROUTING_SIGNALS: Record<SpecialistCategory, RegExp[]> = {
  research: [
    /\b(research|find|look up|search for|what is|who is|explain|tell me about)\b/i,
    /\b(summarize this|overview of|background on|history of|how does|why does)\b/i,
    /\b(source|article|paper|evidence|fact.?check|verify)\b/i,
  ],
  learning: [
    /\b(digital-seed|knowledge work|learning|domain|source|mentor|project)\b/i,
    /\b(finance|strategy|marketing|accounting|operations|economics)\b/i,
    /\b(analyze this project|framework|swot|porter|bcg|prepare for)\b/i,
    /\b(prepare|learn|understand|learning plan)\b/i,
  ],
  email: [
    /\b(email|write an email|draft an email|reply to|send a message)\b/i,
    /\b(inbox|triage|follow.?up|respond to|compose|cc|subject line)\b/i,
  ],
  writing: [
    /\b(write|draft|essay|report|article|document|letter|proposal)\b/i,
    /\b(blog post|write.?up|narrative|content|copy|description)\b/i,
    /\b(summarize|summary of|condense|rewrite|improve this)\b/i,
  ],
  code: [
    /\b(code|debug|function|implement|fix|bug|script|refactor)\b/i,
    /\b(typescript|javascript|python|bash|sql|api|component|test)\b/i,
    /\b(error|exception|crash|failing|not working|broken)\b/i,
    /\b(review this code|optimize|performance|memory leak)\b/i,
  ],
  "life-admin": [
    /\b(schedule|task|reminder|plan|meeting|calendar|to.?do)\b/i,
    /\b(deadline|appointment|organize|prioritize|agenda|next week)\b/i,
    /\b(add a task|remind me|block time|weekly review|goals)\b/i,
  ],
  general: [],  // Default — scores 0, wins only when nothing else matches
};

/**
 * Classify a request into a specialist category.
 *
 * Step 1: Check hard-intent overrides (explicit action phrases).
 * Step 2: Keyword scoring across all categories.
 * Step 3: Pick winner, compute confidence from gap to runner-up.
 */
export function classifyRequest(request: string): RoutingDecision {
  // Step 1: Hard-intent check — explicit action verbs override keyword scoring
  for (const intent of HARD_INTENTS) {
    if (intent.pattern.test(request)) {
      const scores = initScores();
      scores[intent.category] = 99;  // Dominant score for display
      return {
        category: intent.category,
        confidence: 0.95,
        hardIntent: true,
        scores,
        reason: `Hard intent matched: explicit "${intent.category}" action phrase`,
      };
    }
  }

  // Step 2: Keyword scoring
  const scores = initScores();
  const categories = Object.keys(ROUTING_SIGNALS) as SpecialistCategory[];

  for (const category of categories) {
    let score = 0;
    for (const pattern of ROUTING_SIGNALS[category]) {
      if (pattern.test(request)) score++;
    }
    scores[category] = score;
  }

  // Step 3: Find winner and compute confidence
  let best: SpecialistCategory = "general";
  let bestScore = 0;
  let secondBest = 0;

  for (const [cat, score] of Object.entries(scores) as [SpecialistCategory, number][]) {
    if (cat === "general") continue;
    if (score > bestScore) {
      secondBest = bestScore;
      bestScore = score;
      best = cat;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  const gap = bestScore - secondBest;
  const confidence =
    bestScore === 0 ? 0.5
    : gap === 0     ? 0.55
    : gap === 1     ? 0.70
    : gap === 2     ? 0.82
                    : 0.95;

  const category = bestScore === 0 ? "general" : best;

  return {
    category,
    confidence,
    scores,
    reason: buildRoutingReason(category, bestScore, confidence),
  };
}

/**
 * Generate a prompt for the agent to use with an LLM when confidence is low.
 * Use this when routing.confidence < 0.65 and you want the model to decide.
 */
export function buildAmbiguousRoutingPrompt(
  request: string,
  topCandidates: SpecialistCategory[]
): string {
  const candidates = topCandidates
    .map((c) => `- ${c}: ${getCategoryDescription(c)}`)
    .join("\n");

  return `Classify this request into the single best specialist category.

REQUEST: "${request}"

CANDIDATES:
${candidates}

Respond in JSON only:
{
  "category": "<category>",
  "confidence": <0.0-1.0>,
  "reason": "<one sentence>"
}`;
}

// ---------------------------------------------------------------------------
// Layer 2: Specialist Loading
// ---------------------------------------------------------------------------

/**
 * Load a specialist's agent config from agents/<category>.yaml.
 * Falls back to the general config if the specific file doesn't exist.
 */
export function loadAgentConfig(category: SpecialistCategory, root: string): AgentConfig {
  const configPath = join(root, "agents", `${category}.yaml`);

  if (!existsSync(configPath)) {
    const generalPath = join(root, "agents", "general.yaml");
    if (!existsSync(generalPath)) return getDefaultConfig(category);
    return parseAgentConfig(readFileSync(generalPath, "utf-8"), "general");
  }

  return parseAgentConfig(readFileSync(configPath, "utf-8"), category);
}

/**
 * List all available specialist configs.
 */
export function listAgents(root: string): AgentConfig[] {
  const agentsDir = join(root, "agents");
  if (!existsSync(agentsDir)) return [];

  return readdirSync(agentsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const category = f.replace(".yaml", "") as SpecialistCategory;
      return parseAgentConfig(readFileSync(join(agentsDir, f), "utf-8"), category);
    });
}

/**
 * Build the specialist system prompt, injecting patterns and tools context.
 * The agent sets this as its system context for the specialist turn.
 */
export function buildSpecialistPrompt(config: AgentConfig, request: string): string {
  const patternsNote =
    config.patterns.length > 0
      ? `\n\nAPPLY THESE PATTERNS from patterns/:\n${config.patterns.map((p) => `- ${p}`).join("\n")}`
      : "";

  const toolsNote =
    config.tools.length > 0
      ? `\n\nPREFERRED TOOLS for this request:\n${config.tools.map((t) => `- ${t}`).join("\n")}`
      : "";

  return `${config.systemPrompt}${patternsNote}${toolsNote}

---
REQUEST TO HANDLE: ${request}`;
}

// ---------------------------------------------------------------------------
// Layer 3: Quality Gate
// ---------------------------------------------------------------------------

/**
 * Build a quality evaluation prompt.
 *
 * Send this to a cheap model (Haiku, Flash) after the specialist generates output.
 * Parse the response with parseQualityResponse().
 */
export function buildQualityGatePrompt(request: string, output: string): string {
  return `You are a quality reviewer. Score this AI response on four dimensions (0.0–1.0 each).

ORIGINAL REQUEST:
${request}

AI RESPONSE:
${output}

Score each dimension:
- answersQuestion: Does the response fully address what was asked? (0 = ignored, 1 = perfect)
- accurate: Is the information accurate and well-supported? (0 = wrong, 1 = verified/credible)
- wellStructured: Is it clearly organized and easy to follow? (0 = chaotic, 1 = excellent)
- appropriate: Is the tone, length, and format right for the request? (0 = wrong, 1 = perfect)

Respond in JSON only — no explanation outside the JSON:
{
  "answersQuestion": <0.0-1.0>,
  "accurate": <0.0-1.0>,
  "wellStructured": <0.0-1.0>,
  "appropriate": <0.0-1.0>,
  "feedback": "<one sentence: biggest improvement, or 'looks good' if score >= 0.8>"
}`;
}

/**
 * Parse the JSON response from the quality gate model.
 * Handles malformed responses gracefully (passes on parse failure — don't block the user).
 */
export function parseQualityResponse(
  response: string,
  threshold: number = 0.7
): QualityEvaluation {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    const dims = {
      answersQuestion: clamp(Number(parsed.answersQuestion) || 0),
      accurate: clamp(Number(parsed.accurate) || 0),
      wellStructured: clamp(Number(parsed.wellStructured) || 0),
      appropriate: clamp(Number(parsed.appropriate) || 0),
    };
    const score =
      (dims.answersQuestion + dims.accurate + dims.wellStructured + dims.appropriate) / 4;

    return {
      score,
      passed: score >= threshold,
      feedback: String(parsed.feedback || "No specific feedback."),
      dimensions: dims,
    };
  } catch {
    // Parse failure → pass by default (don't block user on evaluation errors)
    return {
      score: 0.75,
      passed: true,
      feedback: "Quality evaluation could not be parsed — passing by default.",
      dimensions: { answersQuestion: 0.75, accurate: 0.75, wellStructured: 0.75, appropriate: 0.75 },
    };
  }
}

/**
 * Build a retry prompt when quality falls below threshold.
 * Provides the original output and targeted feedback for the retry.
 */
export function buildRetryPrompt(
  request: string,
  previousOutput: string,
  evaluation: QualityEvaluation
): string {
  const weakDims = Object.entries(evaluation.dimensions)
    .filter(([, score]) => score < 0.7)
    .map(([dim]) => dim);

  const dimensionHints: Record<string, string> = {
    answersQuestion: "Directly and completely address the question asked.",
    accurate: "Double-check facts and add sources or evidence where possible.",
    wellStructured: "Improve the organization — use clear headers, bullets, or numbered steps.",
    appropriate: "Adjust the tone, length, or format to better match the request.",
  };

  const hints = weakDims
    .map((d) => `- ${dimensionHints[d] || d}`)
    .join("\n") || "- General quality improvement needed.";

  return `Your previous response needs improvement. Please try again.

ORIGINAL REQUEST:
${request}

YOUR PREVIOUS RESPONSE:
${previousOutput}

QUALITY FEEDBACK: ${evaluation.feedback}
SCORE: ${(evaluation.score * 100).toFixed(0)}% (target ≥${(0.7 * 100).toFixed(0)}%)

SPECIFIC IMPROVEMENTS NEEDED:
${hints}

Please generate an improved response addressing these points.`;
}

// ---------------------------------------------------------------------------
// Convenience API
// ---------------------------------------------------------------------------

/**
 * Prepare everything needed for an orchestrated response.
 * The agent handles the actual LLM calls — this returns the full context.
 */
export function prepareOrchestration(request: string, root: string): OrchestrationContext {
  const routing = classifyRequest(request);
  const config = loadAgentConfig(routing.category, root);
  return { request, routing, config, iteration: 0 };
}

/**
 * Run the full orchestration pipeline with quality loop.
 *
 * This replaces the manual Layer 3 flow. The agent provides:
 *   - generate: function that produces output from a prompt
 *   - callLLM: function to call a cheap model for evaluation
 *
 * Returns the quality report with the final output.
 */
export async function runOrchestrated(
  ctx: OrchestrationContext,
  generate: (prompt: string) => Promise<string>,
  callLLM: LLMCallFn
): Promise<QualityReport> {
  const specialistPrompt = buildSpecialistPrompt(ctx.config, ctx.request);

  return runWithQuality(
    ctx.request,
    async (task, feedback) => {
      const prompt = feedback
        ? `${specialistPrompt}\n\n---\nPREVIOUS ATTEMPT FEEDBACK:\n${feedback}`
        : specialistPrompt;
      return generate(prompt);
    },
    [llmJudge(callLLM)],
    {
      maxRetries: ctx.config.maxRetries,
      threshold: ctx.config.qualityThreshold,
    }
  );
}

/**
 * Format a human-readable summary of the orchestration decision.
 */
export function describeOrchestration(ctx: OrchestrationContext): string {
  const { routing, config } = ctx;
  const intentTag = routing.hardIntent ? " [hard intent]" : "";
  return [
    `🎯 Routing: ${config.name} (${(routing.confidence * 100).toFixed(0)}% confidence${intentTag})`,
    `   Reason: ${routing.reason}`,
    `   Tools: ${config.tools.join(", ") || "none"}`,
    `   Patterns: ${config.patterns.join(", ") || "none"}`,
    `   Quality threshold: ${(config.qualityThreshold * 100).toFixed(0)}%`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function parseAgentConfig(raw: string, fallbackCategory: SpecialistCategory): AgentConfig {
  try {
    const parsed = yaml.load(raw) as Record<string, unknown>;
    return {
      name: String(parsed.name || fallbackCategory),
      category: (parsed.category as SpecialistCategory) || fallbackCategory,
      description: String(parsed.description || ""),
      systemPrompt: String(parsed.systemPrompt || "You are a helpful assistant."),
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map(String) : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools.map(String) : [],
      modelPreference: parsed.modelPreference ? String(parsed.modelPreference) : undefined,
      qualityThreshold: Number(parsed.qualityThreshold) || 0.7,
      maxRetries: Number(parsed.maxRetries) || 2,
    };
  } catch {
    return getDefaultConfig(fallbackCategory);
  }
}

function getDefaultConfig(category: SpecialistCategory): AgentConfig {
  return {
    name: `${category} Specialist`,
    category,
    description: getCategoryDescription(category),
    systemPrompt: "You are a helpful assistant. Be accurate, clear, and concise.",
    patterns: [],
    tools: ["rag_search", "seed-memory"],
    qualityThreshold: 0.7,
    maxRetries: 2,
  };
}

function getCategoryDescription(category: SpecialistCategory): string {
  const descriptions: Record<SpecialistCategory, string> = {
    research: "Web research, synthesis, and source analysis",
    learning: "learning and knowledge work, project analysis, and learning prep",
    email: "Email drafting, triage, and replies",
    writing: "Essays, reports, and structured documents",
    code: "Programming, debugging, and code review",
    "life-admin": "Tasks, scheduling, and personal organization",
    general: "General-purpose assistant",
  };
  return descriptions[category];
}

function buildRoutingReason(
  category: SpecialistCategory,
  score: number,
  confidence: number
): string {
  if (score === 0) return "No strong category signals — defaulting to general assistant";
  return `Matched ${category} signals (${(confidence * 100).toFixed(0)}% confidence)`;
}

function initScores(): Record<SpecialistCategory, number> {
  return { research: 0, learning: 0, email: 0, writing: 0, code: 0, "life-admin": 0, general: 0 };
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}
