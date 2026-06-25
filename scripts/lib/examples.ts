/**
 * Task examples gallery — loader + validator (roadmap B5).
 *
 * examples/examples.yaml is the curated, community-contributable list of concrete
 * copy-paste task prompts the newcomer can hand to their AI agent ("what can it
 * do?"). This module is the only reader; it strips C0/C1/DEL control chars from
 * every field that can reach output — id (echoed in problem messages + used as the
 * title fallback), title, prompt, good_for, and the values echoed in validation
 * messages — and flags a structurally-broken file rather than silently passing it,
 * so a malformed/poisoned file can't terminal-inject `seed examples`. Mirrors the
 * catalog loader so the CLI and any future consumer share one source of truth.
 *
 * This is a DIFFERENT thing from docs/examples/*.md (persona profiles = "who am I
 * like"); these are tasks = "what can it do".
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { load as loadYaml } from "js-yaml";

export const CATEGORIES = ["planning", "writing", "learning", "research", "life-admin", "decisions"] as const;
export type Category = (typeof CATEGORIES)[number];

export const NEEDS = ["none", "context", "notes"] as const;
export type Needs = (typeof NEEDS)[number];

export interface ExampleTask {
  id: string;
  title: string;
  category: Category;
  needs: Needs;
  prompt: string;
  good_for?: string;
}

export const EXAMPLES_PATH = "examples/examples.yaml";

const VALID_CATEGORIES = new Set<string>(CATEGORIES);
const VALID_NEEDS = new Set<string>(NEEDS);

/** Strip C0/C1 control chars + DEL so a displayed/pasted prompt can't carry a terminal escape. */
function scrub(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, " ").trimEnd();
}

function validateTask(raw: unknown, problems: string[]): ExampleTask | null {
  if (!raw || typeof raw !== "object") {
    problems.push("example is not an object");
    return null;
  }
  const e = raw as Record<string, unknown>;
  // Scrub the id up front: it is echoed in problem messages AND used as the title
  // fallback, so an unscrubbed control char here would terminal-inject the output.
  const id = scrub(e.id).trim();
  if (!id) {
    problems.push("example missing id");
    return null;
  }
  const category = String(e.category ?? "");
  if (!VALID_CATEGORIES.has(category)) {
    problems.push(`${id}: invalid category "${scrub(category)}" (expected one of: ${CATEGORIES.join(", ")})`);
    return null;
  }
  if (typeof e.prompt !== "string") {
    problems.push(`${id}: prompt must be text`);
    return null;
  }
  const prompt = scrub(e.prompt);
  if (!prompt) {
    problems.push(`${id}: empty prompt`);
    return null;
  }
  const needsRaw = String(e.needs ?? "none");
  const needs = VALID_NEEDS.has(needsRaw) ? (needsRaw as Needs) : "none";
  if (!VALID_NEEDS.has(needsRaw) && e.needs !== undefined) {
    problems.push(`${id}: invalid needs "${scrub(needsRaw)}" (expected one of: ${NEEDS.join(", ")})`);
  }
  return {
    id,
    title: (typeof e.title === "string" ? scrub(e.title) : "") || id,
    category: category as Category,
    needs,
    prompt,
    good_for: typeof e.good_for === "string" ? scrub(e.good_for) : undefined,
  };
}

export interface LoadResult {
  tasks: ExampleTask[];
  problems: string[];
}

export function loadExamples(root: string): LoadResult {
  const p = join(root, EXAMPLES_PATH);
  const problems: string[] = [];
  if (!existsSync(p)) return { tasks: [], problems: [`${EXAMPLES_PATH} not found`] };
  let data: unknown;
  try {
    data = loadYaml(readFileSync(p, "utf-8"));
  } catch (err) {
    return { tasks: [], problems: [`${EXAMPLES_PATH} is not valid YAML: ${(err as Error).message}`] };
  }
  // A structurally-broken file must be flagged, not silently coerced to "0 tasks,
  // all valid" — otherwise `seed examples --check` would green-light garbage.
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { tasks: [], problems: [`${EXAMPLES_PATH} must be a mapping with a 'tasks:' list`] };
  }
  const rawTasks = (data as Record<string, unknown>).tasks;
  if (rawTasks === undefined) {
    return { tasks: [], problems: [`${EXAMPLES_PATH} is missing the 'tasks:' list`] };
  }
  if (!Array.isArray(rawTasks)) {
    return { tasks: [], problems: [`${EXAMPLES_PATH} 'tasks:' must be a list`] };
  }
  const raw = rawTasks;
  const tasks: ExampleTask[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const t = validateTask(r, problems);
    if (!t) continue;
    if (seen.has(t.id)) {
      problems.push(`duplicate id: ${t.id}`);
      continue;
    }
    seen.add(t.id);
    tasks.push(t);
  }
  return { tasks, problems };
}

export function filterByCategory(tasks: ExampleTask[], category: string): ExampleTask[] {
  return tasks.filter((t) => t.category === category);
}

const NEEDS_LABEL: Record<Needs, string> = {
  none: "nothing — works right away",
  context: "your context files (USER/COMPASS/GOALS)",
  notes: "a notes folder you've indexed",
};

/** One paste-ready block for the CLI: title, what it's good for, what it needs, then the prompt. */
export function formatExample(t: ExampleTask): string {
  const lines: string[] = [];
  lines.push(`▸ ${t.title}`);
  if (t.good_for) lines.push(`  good for: ${t.good_for}`);
  lines.push(`  needs:    ${NEEDS_LABEL[t.needs]}`);
  lines.push("  paste this into your agent:");
  for (const l of t.prompt.split("\n")) lines.push(`    ${l}`);
  return lines.join("\n");
}
