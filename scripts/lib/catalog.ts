/**
 * Open-source tool catalog — loader, matcher, and validator.
 *
 * The catalog (catalog/catalog.yaml) is the curated, community-contributable map
 * of vetted open-source tools the guide recommends FROM. This module is the only
 * reader; it validates entries on load so a malformed/poisoned file can't drive
 * the guide to a bad recommendation, and exposes plain matching/formatting so the
 * CLI and the agent share one source of truth.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { load as loadYaml } from "js-yaml";

export type TrustTier = "vetted" | "community" | "unvetted";
export type Category = "agent-runtime" | "mcp-server" | "integration" | "reference" | "utility";

export const BLAST_RADIUS_VOCAB = [
  "local-only", "filesystem", "network", "shell", "credentials", "runs-continuously",
  "spends-money", "your-email", "your-calendar", "your-files", "your-messages",
  "your-code", "your-notes",
] as const;
export type BlastRadius = (typeof BLAST_RADIUS_VOCAB)[number];

export interface CatalogEntry {
  id: string;
  name: string;
  category: Category;
  serves: string[];
  phase: number;
  repo: string;
  install?: Record<string, unknown>;
  trust: { tier: TrustTier; provenance?: string; reviewed?: string };
  accesses: string[];
  when_to_use?: string;
  caution?: string;
  alternatives?: string[];
}

export const CATALOG_PATH = "catalog/catalog.yaml";

const VALID_TIERS = new Set(["vetted", "community", "unvetted"]);
const VALID_CATEGORIES = new Set(["agent-runtime", "mcp-server", "integration", "reference", "utility"]);

/** Validate one raw entry; return a normalized CatalogEntry or null (with reason pushed). */
function validateEntry(raw: unknown, problems: string[]): CatalogEntry | null {
  if (!raw || typeof raw !== "object") { problems.push("entry is not an object"); return null; }
  const e = raw as Record<string, unknown>;
  const id = String(e.id ?? "").trim();
  if (!id) { problems.push("entry missing id"); return null; }
  const repo = String(e.repo ?? "").trim();
  // Hard rule: every entry must point at a real https repo URL (never a bare
  // package name or an invented path) — the catalog's whole job is to not send
  // a newcomer somewhere unverifiable.
  if (!/^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[^\s]+$/i.test(repo)) {
    problems.push(`${id}: repo must be an https github/gitlab/codeberg URL (got "${repo}")`);
    return null;
  }
  const tier = String((e.trust as Record<string, unknown>)?.tier ?? "");
  if (!VALID_TIERS.has(tier)) { problems.push(`${id}: invalid trust.tier "${tier}"`); return null; }
  const category = String(e.category ?? "");
  if (!VALID_CATEGORIES.has(category)) { problems.push(`${id}: invalid category "${category}"`); return null; }
  const accesses = Array.isArray(e.accesses) ? e.accesses.map(String) : [];
  const unknown = accesses.filter((a) => !(BLAST_RADIUS_VOCAB as readonly string[]).includes(a));
  if (unknown.length) problems.push(`${id}: unknown blast-radius term(s): ${unknown.join(", ")}`);
  return {
    id,
    name: String(e.name ?? id),
    category: category as Category,
    serves: Array.isArray(e.serves) ? e.serves.map(String) : [],
    phase: Number.isFinite(e.phase) ? Number(e.phase) : 0,
    repo,
    install: (e.install as Record<string, unknown>) ?? undefined,
    trust: {
      tier: tier as TrustTier,
      provenance: (e.trust as Record<string, unknown>)?.provenance ? String((e.trust as Record<string, unknown>).provenance) : undefined,
      reviewed: (e.trust as Record<string, unknown>)?.reviewed ? String((e.trust as Record<string, unknown>).reviewed) : undefined,
    },
    accesses,
    when_to_use: e.when_to_use ? String(e.when_to_use) : undefined,
    caution: e.caution ? String(e.caution) : undefined,
    alternatives: Array.isArray(e.alternatives) ? e.alternatives.map(String) : [],
  };
}

export interface LoadResult { entries: CatalogEntry[]; problems: string[]; }

export function loadCatalog(root: string): LoadResult {
  const p = join(root, CATALOG_PATH);
  const problems: string[] = [];
  if (!existsSync(p)) return { entries: [], problems: ["catalog/catalog.yaml not found"] };
  let data: { tools?: unknown[] } | undefined;
  try {
    data = loadYaml(readFileSync(p, "utf-8")) as { tools?: unknown[] };
  } catch (err) {
    return { entries: [], problems: [`catalog.yaml is not valid YAML: ${(err as Error).message}`] };
  }
  const tools = Array.isArray(data?.tools) ? data!.tools : [];
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();
  for (const raw of tools) {
    const e = validateEntry(raw, problems);
    if (!e) continue;
    if (seen.has(e.id)) { problems.push(`duplicate id: ${e.id}`); continue; }
    seen.add(e.id);
    entries.push(e);
  }
  return { entries, problems };
}

/** Score an entry against a free-text need (simple token overlap on serves/name/id). */
export function matchNeed(entries: CatalogEntry[], need: string): CatalogEntry[] {
  const words = need.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];
  const scored = entries.map((e) => {
    const hay = [e.id, e.name, ...(e.serves || []), e.category].join(" ").toLowerCase();
    let score = 0;
    for (const w of words) if (hay.includes(w)) score += 1;
    // a phrase match on a `serves` line is a strong signal
    for (const s of e.serves || []) if (s.toLowerCase().includes(need.toLowerCase().trim())) score += 3;
    return { e, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.e);
}

const TIER_BADGE: Record<TrustTier, string> = {
  vetted: "✅ Vetted",
  community: "🟡 Community — verify before trusting",
  unvetted: "⚠️ Unvetted — evaluate it yourself",
};

export function tierBadge(tier: TrustTier): string { return TIER_BADGE[tier]; }

/** One-block, plain-language description of an entry for the CLI / agent. */
export function formatEntry(e: CatalogEntry): string {
  const lines: string[] = [];
  lines.push(`${e.name}  [${TIER_BADGE[e.trust.tier]}]`);
  lines.push(`  what it's for: ${(e.serves || []).slice(0, 3).join("; ") || e.category}`);
  lines.push(`  can access:    ${e.accesses.length ? e.accesses.join(", ") : "—"}`);
  lines.push(`  repo:          ${e.repo}`);
  if (e.when_to_use) lines.push(`  when:          ${e.when_to_use}`);
  if (e.caution) lines.push(`  ⚠ caution:     ${e.caution}`);
  return lines.join("\n");
}
