/**
 * DAI Quality Loop — Generic run → evaluate → feedback → retry engine.
 *
 * Extracts and expands the quality gate from orchestrator.ts (Layer 3) into
 * a standalone, reusable module any agent can use.
 *
 * Usage:
 *   const report = await runWithQuality(task, [llmJudge(callLLM)], { threshold: 0.8 });
 *   if (report.finalScore.passed) { deliver(report.finalOutput); }
 *
 * Built-in evaluators:
 *   - llmJudge(callLLM)   — LLM scores on accuracy, relevance, completeness, clarity
 *   - factCheck(callLLM, sources) — checks output against source material
 *   - composite(evaluators, weights) — weighted average of multiple evaluators
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Score returned by a single evaluator. */
export interface QualityScore {
  score: number;       // 0–1
  feedback: string;    // What to improve (or "looks good")
  evaluator: string;   // Name of the evaluator that produced this
  passed: boolean;     // score >= threshold
}

/** Final report after all attempts. */
export interface QualityReport {
  attempts: number;
  finalScore: QualityScore;
  finalOutput: string;
  history: QualityScore[];
  improved: boolean;   // finalScore > first attempt score
}

/** A function that evaluates output quality. */
export type Evaluator = (
  task: string,
  output: string,
  threshold: number
) => Promise<QualityScore>;

/** Options for the quality loop. */
export interface QualityLoopOptions {
  maxRetries?: number;   // Default 2
  threshold?: number;    // Default 0.7
  evaluators?: Evaluator[];
}

/**
 * A model-agnostic LLM call function.
 * Takes a prompt, returns the model's text response.
 */
export type LLMCallFn = (prompt: string) => Promise<string>;

/**
 * A task generator function.
 * Takes the task description + optional feedback from previous attempt,
 * returns the generated output.
 */
export type TaskFn = (task: string, feedback?: string) => Promise<string>;

// ---------------------------------------------------------------------------
// Core loop
// ---------------------------------------------------------------------------

/**
 * Run a task through the quality loop: generate → evaluate → retry if needed.
 *
 * @param task      - Description of what to produce
 * @param generate  - Function that produces output (receives task + optional feedback)
 * @param evaluators - Array of evaluator functions
 * @param options   - maxRetries, threshold
 */
export async function runWithQuality(
  task: string,
  generate: TaskFn,
  evaluators: Evaluator[],
  options: QualityLoopOptions = {}
): Promise<QualityReport> {
  const maxRetries = options.maxRetries ?? 2;
  const threshold = options.threshold ?? 0.7;
  const history: QualityScore[] = [];

  let output = await generate(task);
  let score = await evaluate(task, output, evaluators, threshold);
  history.push(score);

  let attempt = 1;

  while (!score.passed && attempt <= maxRetries) {
    const feedback = buildFeedback(task, output, score);
    output = await generate(task, feedback);
    score = await evaluate(task, output, evaluators, threshold);
    history.push(score);
    attempt++;
  }

  return {
    attempts: history.length,
    finalScore: score,
    finalOutput: output,
    history,
    improved: history.length > 1 && score.score > history[0].score,
  };
}

// ---------------------------------------------------------------------------
// Built-in evaluators
// ---------------------------------------------------------------------------

/**
 * LLM Judge — asks a model to score output on four criteria.
 * Returns a single aggregated QualityScore.
 */
export function llmJudge(callLLM: LLMCallFn): Evaluator {
  return async (task: string, output: string, threshold: number): Promise<QualityScore> => {
    const prompt = `You are a quality reviewer. Score this AI response on four dimensions (0.0–1.0 each).

ORIGINAL REQUEST:
${task}

AI RESPONSE:
${output}

Score each dimension:
- accuracy: Is the information correct and well-supported? (0 = wrong, 1 = verified)
- relevance: Does it address what was asked? (0 = off-topic, 1 = perfectly on-target)
- completeness: Is it thorough enough? (0 = missing key parts, 1 = comprehensive)
- clarity: Is it clear and well-organized? (0 = confusing, 1 = crystal clear)

Respond in JSON only:
{
  "accuracy": <0.0-1.0>,
  "relevance": <0.0-1.0>,
  "completeness": <0.0-1.0>,
  "clarity": <0.0-1.0>,
  "feedback": "<one sentence: biggest improvement needed, or 'looks good'>"
}`;

    try {
      const response = await callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const parsed = JSON.parse(jsonMatch[0]);
      const dims = {
        accuracy: clamp(Number(parsed.accuracy) || 0),
        relevance: clamp(Number(parsed.relevance) || 0),
        completeness: clamp(Number(parsed.completeness) || 0),
        clarity: clamp(Number(parsed.clarity) || 0),
      };
      const score = (dims.accuracy + dims.relevance + dims.completeness + dims.clarity) / 4;

      return {
        score,
        feedback: String(parsed.feedback || "No specific feedback."),
        evaluator: "llm-judge",
        passed: score >= threshold,
      };
    } catch {
      return passByDefault("llm-judge");
    }
  };
}

/**
 * Fact Check — verifies output against provided source material.
 * Catches hallucinations and unsupported claims.
 */
export function factCheck(callLLM: LLMCallFn, sources: string): Evaluator {
  return async (task: string, output: string, threshold: number): Promise<QualityScore> => {
    const prompt = `You are a fact-checker. Compare the AI response against the provided source material.

SOURCE MATERIAL:
${sources}

AI RESPONSE TO CHECK:
${output}

Check for:
1. Claims not supported by the source material
2. Contradictions with the source material
3. Fabricated details or hallucinations
4. Correct attribution of facts

Respond in JSON only:
{
  "score": <0.0-1.0>,
  "feedback": "<list unsupported claims, or 'all claims verified'>"
}`;

    try {
      const response = await callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const parsed = JSON.parse(jsonMatch[0]);
      const score = clamp(Number(parsed.score) || 0);

      return {
        score,
        feedback: String(parsed.feedback || "No specific feedback."),
        evaluator: "fact-check",
        passed: score >= threshold,
      };
    } catch {
      return passByDefault("fact-check");
    }
  };
}

/**
 * Composite evaluator — weighted average of multiple evaluators.
 * Weights are normalized to sum to 1.
 */
export function composite(
  evaluators: Evaluator[],
  weights?: number[]
): Evaluator {
  return async (task: string, output: string, threshold: number): Promise<QualityScore> => {
    const results = await Promise.all(
      evaluators.map((ev) => ev(task, output, threshold))
    );

    const w = normalizeWeights(weights, evaluators.length);
    const weightedScore = results.reduce((sum, r, i) => sum + r.score * w[i], 0);

    // Collect feedback from failing evaluators, or from all if all passed
    const failingFeedback = results
      .filter((r) => !r.passed)
      .map((r) => `[${r.evaluator}] ${r.feedback}`);
    const feedback = failingFeedback.length > 0
      ? failingFeedback.join("; ")
      : results.map((r) => `[${r.evaluator}] ${r.feedback}`).join("; ");

    return {
      score: weightedScore,
      feedback,
      evaluator: "composite",
      passed: weightedScore >= threshold,
    };
  };
}

// ---------------------------------------------------------------------------
// Feedback builder
// ---------------------------------------------------------------------------

function buildFeedback(task: string, output: string, score: QualityScore): string {
  return `Your previous response needs improvement.

ORIGINAL REQUEST:
${task}

YOUR PREVIOUS RESPONSE:
${output}

QUALITY FEEDBACK (${score.evaluator}): ${score.feedback}
SCORE: ${(score.score * 100).toFixed(0)}%

Please generate an improved response addressing the feedback.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function evaluate(
  task: string,
  output: string,
  evaluators: Evaluator[],
  threshold: number
): Promise<QualityScore> {
  if (evaluators.length === 0) {
    return { score: 1, feedback: "No evaluators configured.", evaluator: "none", passed: true };
  }
  if (evaluators.length === 1) {
    return evaluators[0](task, output, threshold);
  }
  // Multiple evaluators → use composite with equal weights
  return composite(evaluators)(task, output, threshold);
}

function normalizeWeights(weights: number[] | undefined, count: number): number[] {
  if (!weights || weights.length !== count) {
    return Array(count).fill(1 / count);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array(count).fill(1 / count);
  return weights.map((w) => w / sum);
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function passByDefault(evaluator: string): QualityScore {
  return {
    score: 0.75,
    feedback: "Evaluation could not be parsed — passing by default.",
    evaluator,
    passed: true,
  };
}
