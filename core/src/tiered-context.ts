/**
 * Digital Seed Tiered Context Loading — Read summaries before full files.
 *
 * L0 (~20 tokens): One-liner per file — "what is this file about?"
 * L1 (~200 tokens): Section headings + key facts — "is this relevant?"
 * L2 (full): Only when L0/L1 confirm relevance
 *
 * Saves 60-80% tokens compared to loading everything.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, relative, extname } from "path";

export interface L0Entry {
  file: string;
  summary: string;       // one-liner
  lastModified: string;
  sizeBytes: number;
}

export interface L1Entry extends L0Entry {
  sections: string[];     // heading names
  keyFacts: string[];     // up to 5 key bullet points
}

const INDEX_DIR = "data/context-index";

/**
 * Build L0 index for a directory. One-liner per file.
 */
export function buildL0Index(root: string, targetDir: string): L0Entry[] {
  const entries: L0Entry[] = [];
  const dir = join(root, targetDir);

  if (!existsSync(dir)) return entries;

  const files = readdirSync(dir).filter(
    (f) => extname(f) === ".md" && !f.startsWith(".")
  );

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf-8");

    // Extract first meaningful line as summary
    const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const summary = lines[0]?.trim().slice(0, 120) || "(empty file)";

    entries.push({
      file: join(targetDir, file),
      summary,
      lastModified: stat.mtime.toISOString(),
      sizeBytes: stat.size,
    });
  }

  return entries;
}

/**
 * Build L1 index for a specific file. Sections + key facts.
 */
export function buildL1Entry(root: string, filePath: string): L1Entry | null {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return null;

  const content = readFileSync(fullPath, "utf-8");
  const stat = statSync(fullPath);
  const lines = content.split("\n");

  // Extract sections (## headings)
  const sections = lines
    .filter((l) => /^#{1,3}\s/.test(l))
    .map((l) => l.replace(/^#+\s*/, "").trim());

  // Extract key facts (lines starting with - that contain bold or important markers)
  const keyFacts = lines
    .filter((l) => /^[-*]\s/.test(l.trim()))
    .map((l) => l.trim().replace(/^[-*]\s*/, ""))
    .filter((l) => l.length > 10 && l.length < 200)
    .slice(0, 5);

  const summaryLine = lines.find((l) => l.trim() && !l.startsWith("#")) || "(empty)";

  return {
    file: filePath,
    summary: summaryLine.trim().slice(0, 120),
    lastModified: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    sections,
    keyFacts,
  };
}

/**
 * Get L0 overview of all user context files.
 * This is what the agent reads first — ~20 tokens per file.
 */
export function getL0Overview(root: string): string {
  const entries = buildL0Index(root, "user");
  if (entries.length === 0) return "No context files found in user/.";

  return entries
    .map((e) => `${e.file} (${(e.sizeBytes / 1024).toFixed(1)}KB): ${e.summary}`)
    .join("\n");
}

/**
 * Get L1 detail for a specific file.
 * Agent reads this when L0 suggests the file is relevant — ~200 tokens.
 */
export function getL1Detail(root: string, filePath: string): string {
  const entry = buildL1Entry(root, filePath);
  if (!entry) return `File not found: ${filePath}`;

  let output = `## ${entry.file}\n`;
  if (entry.sections.length > 0) {
    output += `\nSections: ${entry.sections.join(" · ")}\n`;
  }
  if (entry.keyFacts.length > 0) {
    output += `\nKey facts:\n${entry.keyFacts.map((f) => `- ${f}`).join("\n")}\n`;
  }
  return output;
}

/**
 * Save index to disk for caching.
 */
export function saveIndex(root: string, index: L0Entry[]): void {
  const dir = join(root, INDEX_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "l0-index.json"), JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Load cached index. Returns null if stale or missing.
 */
export function loadCachedIndex(root: string): L0Entry[] | null {
  const path = join(root, INDEX_DIR, "l0-index.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
