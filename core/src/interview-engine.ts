/**
 * DAI Interview Engine — Proactive onboarding and ongoing context building.
 *
 * Two modes:
 *   1. Structured onboarding (first run) — walk through key questions
 *   2. Periodic probing — detect gaps and ask follow-ups
 *
 * Also includes a silent observer that detects patterns from conversations.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { routeContext, persistContext, isDuplicate, type ContextCategory } from "./context-router.js";

export interface InterviewQuestion {
  id: string;
  question: string;
  category: ContextCategory;
  section?: string;         // target section in the file
  phase: "onboarding" | "periodic" | "probing";
  priority: number;         // 1 = ask first
  asked: boolean;
  answer?: string;
  skipped?: boolean;
}

export interface InterviewState {
  onboardingComplete: boolean;
  questionsAsked: number;
  lastInterviewDate: string | null;
  detectedPatterns: DetectedPattern[];
  pendingQuestions: string[];   // IDs of questions to ask next
}

export interface DetectedPattern {
  pattern: string;
  occurrences: number;
  firstSeen: string;
  suggested: boolean;        // whether we've already suggested adding this
  category: ContextCategory;
}

// ─── Onboarding Questions ───

const ONBOARDING_QUESTIONS: InterviewQuestion[] = [
  {
    id: "name",
    question: "What's your name? (I'll use this to personalize our conversations)",
    category: "identity",
    section: "Notes",
    phase: "onboarding",
    priority: 1,
    asked: false,
  },
  {
    id: "timezone",
    question: "What timezone are you in? (Helps me with scheduling and knowing when you're likely active)",
    category: "identity",
    phase: "onboarding",
    priority: 1,
    asked: false,
  },
  {
    id: "role",
    question: "What's your current role? (User, professional, entrepreneur — helps me calibrate my responses)",
    category: "identity",
    section: "Notes",
    phase: "onboarding",
    priority: 2,
    asked: false,
  },
  {
    id: "primary-goal",
    question: "What's the #1 thing you're trying to accomplish right now? (Your main goal — could be academic, professional, or personal)",
    category: "goal",
    section: "Active Goals",
    phase: "onboarding",
    priority: 2,
    asked: false,
  },
  {
    id: "tools",
    question: "What tools do you already use daily? (Obsidian, Notion, Gmail, Slack, specific apps — I'll integrate with them)",
    category: "preference",
    phase: "onboarding",
    priority: 3,
    asked: false,
  },
  {
    id: "communication-style",
    question: "How do you prefer I communicate? (Concise vs. detailed? Formal vs. casual? Should I explain my reasoning or just give answers?)",
    category: "preference",
    phase: "onboarding",
    priority: 3,
    asked: false,
  },
  {
    id: "interests",
    question: "What topics are you most interested in? (Academic subjects, industries, hobbies — helps me surface relevant information)",
    category: "identity",
    section: "Notes",
    phase: "onboarding",
    priority: 4,
    asked: false,
  },
  {
    id: "pet-peeves",
    question: "Anything you find annoying about AI assistants? (I'll try to avoid it)",
    category: "preference",
    section: "Pet Peeves",
    phase: "onboarding",
    priority: 5,
    asked: false,
  },
];

// ─── Periodic / Probing Questions ───

const PERIODIC_QUESTIONS: InterviewQuestion[] = [
  {
    id: "goal-check",
    question: "It's been a while since we reviewed your goals. Are your current goals in GOALS.md still accurate, or should we update them?",
    category: "goal",
    phase: "periodic",
    priority: 1,
    asked: false,
  },
  {
    id: "workflow-check",
    question: "I've noticed some patterns in how you work. Would you like me to share what I've observed and see if we should update your preferences?",
    category: "preference",
    phase: "periodic",
    priority: 2,
    asked: false,
  },
  {
    id: "memory-review",
    question: "I've accumulated some context in MEMORY.md. Want to review it together and clean up anything outdated?",
    category: "memory",
    phase: "periodic",
    priority: 3,
    asked: false,
  },
];

// ─── State Management ───

const STATE_FILE = "data/interview-state.json";

export function loadInterviewState(root: string): InterviewState {
  const path = join(root, STATE_FILE);
  if (!existsSync(path)) {
    return {
      onboardingComplete: false,
      questionsAsked: 0,
      lastInterviewDate: null,
      detectedPatterns: [],
      pendingQuestions: ONBOARDING_QUESTIONS.map((q) => q.id),
    };
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {
      onboardingComplete: false,
      questionsAsked: 0,
      lastInterviewDate: null,
      detectedPatterns: [],
      pendingQuestions: [],
    };
  }
}

export function saveInterviewState(root: string, state: InterviewState): void {
  const dir = join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, STATE_FILE), JSON.stringify(state, null, 2), "utf-8");
}

// ─── Core Functions ───

/**
 * Get the next question to ask. Returns null if no questions pending.
 */
export function getNextQuestion(root: string): InterviewQuestion | null {
  const state = loadInterviewState(root);

  if (state.pendingQuestions.length === 0) {
    // Check if periodic questions are due
    if (state.lastInterviewDate) {
      const daysSince = (Date.now() - new Date(state.lastInterviewDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 7) {
        // Time for a periodic check-in
        const unanswered = PERIODIC_QUESTIONS.filter((q) => !q.asked);
        if (unanswered.length > 0) return unanswered[0];
      }
    }
    return null;
  }

  const allQuestions = [...ONBOARDING_QUESTIONS, ...PERIODIC_QUESTIONS];
  const nextId = state.pendingQuestions[0];
  return allQuestions.find((q) => q.id === nextId) || null;
}

/**
 * Record an answer to a question and route it to the right storage.
 */
export function recordAnswer(root: string, questionId: string, answer: string): void {
  const state = loadInterviewState(root);
  const allQuestions = [...ONBOARDING_QUESTIONS, ...PERIODIC_QUESTIONS];
  const question = allQuestions.find((q) => q.id === questionId);

  if (!question) return;

  // Mark as answered
  question.asked = true;
  question.answer = answer;

  // Route to the right file
  persistContext(
    {
      content: answer,
      category: question.category,
      confidence: 1.0,
      source: "interview",
      timestamp: new Date().toISOString(),
    },
    root
  );

  // Update state
  state.pendingQuestions = state.pendingQuestions.filter((id) => id !== questionId);
  state.questionsAsked++;
  state.lastInterviewDate = new Date().toISOString();

  // Check if onboarding is complete
  if (state.pendingQuestions.length === 0 && !state.onboardingComplete) {
    const onboardingIds = ONBOARDING_QUESTIONS.map((q) => q.id);
    const allOnboardingDone = onboardingIds.every(
      (id) => !state.pendingQuestions.includes(id)
    );
    if (allOnboardingDone) state.onboardingComplete = true;
  }

  saveInterviewState(root, state);
}

/**
 * Skip a question (move to next).
 */
export function skipQuestion(root: string, questionId: string): void {
  const state = loadInterviewState(root);
  state.pendingQuestions = state.pendingQuestions.filter((id) => id !== questionId);
  saveInterviewState(root, state);
}

// ─── Silent Observer ───

/**
 * Analyze a user message for implicit information to learn.
 * Returns suggestions for new context entries.
 */
export function observeMessage(
  message: string,
  root: string
): Array<{ suggestion: string; category: ContextCategory; confidence: number }> {
  const suggestions: Array<{ suggestion: string; category: ContextCategory; confidence: number }> = [];
  const state = loadInterviewState(root);

  // Detect topic patterns
  const topicPatterns: Array<{ regex: RegExp; topic: string }> = [
    { regex: /\b(private equity|PE|LBO|buyout|M&A)\b/i, topic: "Private Equity" },
    { regex: /\b(machine learning|ML|deep learning|neural net|AI model)\b/i, topic: "Machine Learning" },
    { regex: /\b(marketing|brand|customer acquisition|CAC|conversion)\b/i, topic: "Marketing" },
    { regex: /\b(finance|DCF|valuation|WACC|IRR|NPV)\b/i, topic: "Finance" },
    { regex: /\b(strategy|competitive advantage|porter|five forces|moat)\b/i, topic: "Strategy" },
    { regex: /\b(entrepreneurship|startup|founder|venture|MVP)\b/i, topic: "Entrepreneurship" },
    { regex: /\b(leadership|management|team|organizational)\b/i, topic: "Leadership" },
    { regex: /\b(data science|analytics|statistics|regression|clustering)\b/i, topic: "Data Science" },
  ];

  for (const { regex, topic } of topicPatterns) {
    if (regex.test(message)) {
      const existing = state.detectedPatterns.find((p) => p.pattern === topic);
      if (existing) {
        existing.occurrences++;
        if (existing.occurrences >= 3 && !existing.suggested) {
          suggestions.push({
            suggestion: `I've noticed you frequently discuss ${topic}. Should I add this to your interests?`,
            category: "identity",
            confidence: 0.85,
          });
          existing.suggested = true;
        }
      } else {
        state.detectedPatterns.push({
          pattern: topic,
          occurrences: 1,
          firstSeen: new Date().toISOString(),
          suggested: false,
          category: "identity",
        });
      }
    }
  }

  // Detect implicit preferences
  if (/\b(too (long|verbose|detailed|wordy))\b/i.test(message)) {
    suggestions.push({
      suggestion: "You seem to prefer concise responses. Should I update your preferences?",
      category: "preference",
      confidence: 0.9,
    });
  }
  if (/\b(explain|why|how does|can you elaborate)\b/i.test(message)) {
    // Don't suggest for one-off questions, track frequency
    const existing = state.detectedPatterns.find((p) => p.pattern === "prefers-explanations");
    if (existing) {
      existing.occurrences++;
    } else {
      state.detectedPatterns.push({
        pattern: "prefers-explanations",
        occurrences: 1,
        firstSeen: new Date().toISOString(),
        suggested: false,
        category: "preference",
      });
    }
  }

  saveInterviewState(root, state);
  return suggestions;
}

/**
 * Get the full onboarding prompt for the AI agent to use on first session.
 */
export function getOnboardingPrompt(root: string): string {
  const state = loadInterviewState(root);

  if (state.onboardingComplete) {
    return "Onboarding is complete. Use periodic check-ins to keep context fresh.";
  }

  const remaining = state.pendingQuestions.length;
  const allQuestions = [...ONBOARDING_QUESTIONS];

  return `# Onboarding Interview

You are conducting an onboarding interview to learn about this user. This helps you provide better, more personalized assistance.

## Guidelines
- Be conversational, not robotic
- If the user answers multiple questions at once, record all the info
- If they want to skip a question, that's fine
- Don't rush — quality of answers matters more than getting through all questions
- After each answer, briefly acknowledge what you learned

## Remaining Questions (${remaining} left)

${state.pendingQuestions
  .map((id) => {
    const q = allQuestions.find((q) => q.id === id);
    return q ? `- **${q.id}**: ${q.question}` : "";
  })
  .filter(Boolean)
  .join("\n")}

## Already Learned

${state.questionsAsked > 0 ? "Review user/USER.md, user/GOALS.md, and user/PREFERENCES.md for context already gathered." : "Nothing yet — this is a fresh start."}
`;
}

export { ONBOARDING_QUESTIONS, PERIODIC_QUESTIONS };
