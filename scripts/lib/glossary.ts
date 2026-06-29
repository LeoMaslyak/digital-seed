/**
 * Plain-language glossary — loader + lookup (roadmap A5).
 *
 * glossary/glossary.yaml is the curated, community-contributable set of beginner
 * terms (MCP, RAG, embeddings, …) explained without jargon. This module is the
 * only reader; mirroring the catalog/examples loaders (and the hardening their
 * audits taught us) it strips C0/C1/DEL from EVERY field that can reach output —
 * incl. id and term — and flags a structurally-broken file instead of silently
 * passing it, so a malformed/poisoned file can't terminal-inject `seed explain`.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { load as loadYaml } from "js-yaml";

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  plain: string;
  why?: string;
  see: string[];
}

export const GLOSSARY_PATH = "glossary/glossary.yaml";

/**
 * Strip ALL C0/C1 control chars + DEL (including newline/tab) so a displayed
 * value can neither carry a terminal escape nor forge extra display lines. Every
 * glossary field is rendered on a single line, so collapsing whitespace controls
 * to a space is exactly right.
 */
function scrub(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trimEnd();
}
function scrubList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => scrub(x)).filter((s) => s.length > 0) : [];
}

function validateTerm(raw: unknown, problems: string[]): GlossaryTerm | null {
  if (!raw || typeof raw !== "object") {
    problems.push("term is not an object");
    return null;
  }
  const e = raw as Record<string, unknown>;
  const id = scrub(e.id).trim().toLowerCase();
  if (!id) {
    problems.push("term missing id");
    return null;
  }
  if (typeof e.plain !== "string") {
    problems.push(`${id}: plain must be text`);
    return null;
  }
  const plain = scrub(e.plain);
  if (!plain) {
    problems.push(`${id}: empty plain explanation`);
    return null;
  }
  return {
    id,
    term: (typeof e.term === "string" ? scrub(e.term) : "") || id,
    aliases: scrubList(e.aliases).map((a) => a.toLowerCase()),
    plain,
    why: typeof e.why === "string" ? scrub(e.why) : undefined,
    see: scrubList(e.see).map((s) => s.toLowerCase()),
  };
}

export interface LoadResult {
  terms: GlossaryTerm[];
  problems: string[];
}

export function loadGlossary(root: string): LoadResult {
  const p = join(root, GLOSSARY_PATH);
  const problems: string[] = [];
  if (!existsSync(p)) return { terms: [], problems: [`${GLOSSARY_PATH} not found`] };
  let data: unknown;
  try {
    data = loadYaml(readFileSync(p, "utf-8"));
  } catch (err) {
    return { terms: [], problems: [`${GLOSSARY_PATH} is not valid YAML: ${(err as Error).message}`] };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { terms: [], problems: [`${GLOSSARY_PATH} must be a mapping with a 'terms:' list`] };
  }
  const rawTerms = (data as Record<string, unknown>).terms;
  if (rawTerms === undefined) return { terms: [], problems: [`${GLOSSARY_PATH} is missing the 'terms:' list`] };
  if (!Array.isArray(rawTerms)) return { terms: [], problems: [`${GLOSSARY_PATH} 'terms:' must be a list`] };

  const terms: GlossaryTerm[] = [];
  const seen = new Set<string>();
  for (const r of rawTerms) {
    const t = validateTerm(r, problems);
    if (!t) continue;
    if (seen.has(t.id)) {
      problems.push(`duplicate id: ${t.id}`);
      continue;
    }
    seen.add(t.id);
    terms.push(t);
  }
  return { terms, problems };
}

/** Resolve a query to a term: exact id → alias → case-insensitive term → fuzzy contains. */
export function lookup(terms: GlossaryTerm[], query: string): GlossaryTerm | null {
  const q = scrub(query).trim().toLowerCase();
  if (!q) return null;
  return (
    terms.find((t) => t.id === q) ??
    terms.find((t) => t.aliases.includes(q)) ??
    terms.find((t) => t.term.toLowerCase() === q) ??
    terms.find((t) => t.id.includes(q) || t.term.toLowerCase().includes(q) || t.aliases.some((a) => a.includes(q))) ??
    null
  );
}

/** Closest term names to a miss, for a helpful "did you mean" suggestion. */
export function suggest(terms: GlossaryTerm[], query: string, n = 3): string[] {
  const q = scrub(query).trim().toLowerCase();
  if (!q) return [];
  const scored = terms
    .map((t) => {
      const hay = [t.id, t.term, ...t.aliases].join(" ").toLowerCase();
      let score = 0;
      for (const w of q.split(/[^a-z0-9]+/).filter((x) => x.length > 1)) if (hay.includes(w)) score += 1;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((x) => x.t.term);
}

export function formatTerm(t: GlossaryTerm): string {
  const lines = [t.term, "", `  ${t.plain}`];
  if (t.why) lines.push("", `  Why it matters: ${t.why}`);
  if (t.see.length) lines.push("", `  Related: ${t.see.join(", ")}`);
  return lines.join("\n");
}
