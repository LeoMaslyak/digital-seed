/**
 * `seed ask` — turn any task into one ready-to-run prompt (roadmap B3; the safe,
 * print-only first cut of the C1 "kill the two-pane model" vision).
 *
 * Pure logic only (the CLI does the IO): route the question to a specialist mode,
 * then assemble a paste-ready prompt that tells the agent to READ the user's
 * context files (by reference — never dumping their contents) and answer with the
 * right framing. Every interpolated value (the question, and defensively the
 * framing) is scrubbed of control chars + the question length-capped, so a pasted
 * control sequence can't terminal-inject the output.
 */

export interface Specialist {
  framing: string;
  /** lowercase keyword cues that route to this mode */
  cues: string[];
}

// Order matters: first mode whose cue matches wins. `general` is the fallback.
export const SPECIALISTS: Record<string, Specialist> = {
  planning: {
    framing: "Act as a planning partner: turn this into concrete, prioritized next actions I can actually do.",
    cues: ["plan", "week", "today", "schedule", "priorit", "roadmap", "organize", "next action", "to-do", "todo"],
  },
  writing: {
    framing: "Act as a writing partner: draft clear, well-structured text in my voice; give me an editable draft, never send anything.",
    cues: ["write", "draft", "email", "message", "post", "blog", "essay", "edit", "rewrite", "proofread", "reply"],
  },
  code: {
    framing: "Act as a careful engineer: explain before changing, keep diffs small, and never run anything destructive without asking.",
    cues: ["code", "debug", "function", "bug", "error", "refactor", "typescript", "python", "script", "compile", "test"],
  },
  finance: {
    framing: "Act as a numerate analyst: lay out the numbers and assumptions clearly, and flag what you're unsure about.",
    cues: ["budget", "money", "cost", "invoice", "expense", "revenue", "valuation", "financial", "forecast", "pricing"],
  },
  research: {
    framing: "Act as a researcher: investigate, compare sources, and tell me what's solid vs uncertain — don't pad.",
    cues: ["research", "compare", "find out", "investigate", "sources", "due diligence", "summarize", "summarise", "review the"],
  },
  learning: {
    framing: "Act as a patient teacher: explain in plain language, use an analogy, and check I understood — assume I'm new to it.",
    cues: ["explain", "learn", "understand", "teach", "how does", "what is", "study", "course"],
  },
  decisions: {
    framing: "Act as a decision partner: clarify what I'm optimizing for, lay out the options and trade-offs, then recommend — flag the risks.",
    cues: ["decide", "decision", "should i", "choose", "choice", "between", "pros and cons", "trade-off", "tradeoff", "vs "],
  },
  "life-admin": {
    framing: "Act as a practical organizer: break this logistics task into clear steps and surface anything time-sensitive.",
    cues: ["book", "appointment", "remind", "errand", "logistics", "travel", "trip", "admin", "renew", "cancel"],
  },
  operations: {
    framing: "Act as an operations partner: design a simple, repeatable process and note where it could break.",
    cues: ["process", "workflow", "system", "automate", "operations", "checklist", "standard operating", "procedure"],
  },
  strategy: {
    framing: "Act as a strategist: pressure-test the goal, weigh the trade-offs, and give a clear recommendation with reasoning.",
    cues: ["strategy", "strategic", "business", "go-to-market", "positioning", "long-term", "vision", "tradeoffs"],
  },
  general: {
    framing: "Act as a capable generalist assistant: do the most useful version of this, and ask only if something essential is missing.",
    cues: [],
  },
};

const MAX_QUESTION = 2000;

/** Strip C0/C1/DEL so any interpolated text can't carry a terminal escape; cap length. */
function scrub(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trim().slice(0, MAX_QUESTION);
}

/**
 * The canonical "is this question empty?" definition, shared by the CLI guard and
 * buildAskPrompt so they never disagree — a question that is only whitespace or
 * control characters normalizes to "" (the CLI then shows usage + exits non-zero,
 * rather than printing a placeholder prompt).
 */
export function normalizeQuestion(raw: string): string {
  return scrub(raw);
}

export interface Route {
  mode: string;
  framing: string;
}

export function routeSpecialist(question: string): Route {
  const q = scrub(question).toLowerCase();
  for (const [mode, spec] of Object.entries(SPECIALISTS)) {
    if (mode === "general") continue;
    if (spec.cues.some((c) => q.includes(c))) return { mode, framing: spec.framing };
  }
  return { mode: "general", framing: SPECIALISTS.general.framing };
}

/**
 * Assemble the paste-ready prompt. References context files by path (the agent
 * reads them itself) — never embeds their contents — so this stays print-only and
 * leaks nothing.
 */
export function buildAskPrompt(question: string, route: Route): string {
  const q = scrub(question) || "(no question given — ask me what I need)";
  return [
    "I'm using Digital Seed, a local-first personal-AI workspace. Help me with the task below.",
    "",
    `My request: ${q}`,
    "",
    scrub(route.framing),
    "",
    "First, read my context so your answer fits me: user/USER.md, user/COMPASS.md, and user/GOALS.md (and skim user/PREFERENCES.md for tone). If a file is missing or thin, ask me one or two quick questions rather than guessing.",
    "Then do the task and give me something I can actually use. Don't send, publish, spend, or delete anything — show me a draft and confirm with me before any action like that.",
  ].join("\n");
}
