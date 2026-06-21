#!/usr/bin/env bun
/**
 * Local Markdown link checker.
 *
 * Scans Markdown files under README.md, docs/**, recipes/**, and any other
 * root-level *.md files. Verifies that every relative link points to a file
 * (or directory) that actually exists on disk.
 *
 * External links (http, https, mailto, tel) and intra-page anchors (#section)
 * are ignored. For links with an anchor (foo.md#bar) only the file portion is
 * checked.
 *
 * Exit code 0 if all links resolve, 1 otherwise.
 */

import { readFileSync, statSync, existsSync, readdirSync } from "fs";
import { join, dirname, resolve, relative } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

interface BrokenLink {
  source: string;       // relative path of the file containing the link
  line: number;
  target: string;       // raw link as written in the markdown
  resolved: string;     // resolved absolute path we tried
}

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "exports",
  "logs",
  "data",
]);

function walkMarkdown(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkMarkdown(full, out);
    else if (st.isFile() && entry.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

function collectMarkdownFiles(): string[] {
  const files = new Set<string>();
  // Root-level *.md
  for (const entry of readdirSync(ROOT)) {
    if (entry.toLowerCase().endsWith(".md")) {
      files.add(join(ROOT, entry));
    }
  }
  // docs/**, recipes/**
  for (const subdir of ["docs", "recipes"]) {
    walkMarkdown(join(ROOT, subdir)).forEach((f) => files.add(f));
  }
  return [...files].sort();
}

// Match standard Markdown links: [text](target) and reference [text]: target
// We intentionally ignore image links pointing to remote URLs by treating
// http/https/mailto/tel as external further down.
const INLINE_LINK_RE = /\[(?:[^\]]|\[[^\]]*\])*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE_DEF_RE = /^\s*\[[^\]]+\]:\s*(\S+)/gm;

function isExternal(target: string): boolean {
  return (
    /^https?:\/\//i.test(target) ||
    /^mailto:/i.test(target) ||
    /^tel:/i.test(target) ||
    target.startsWith("//")
  );
}

function stripAnchor(target: string): { path: string; anchor: string | null } {
  const hash = target.indexOf("#");
  if (hash === -1) return { path: target, anchor: null };
  return { path: target.slice(0, hash), anchor: target.slice(hash + 1) };
}

/**
 * Blank out fenced code blocks (``` / ~~~) and inline code spans, preserving
 * newlines so reported line numbers stay accurate. Prevents link-like syntax
 * inside code (e.g. a regex containing `](`) from being parsed as a real link.
 */
export function maskCode(text: string): string {
  let inFence = false;
  let fence = "";
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^\s*(```|~~~)/);
      if (m) {
        if (!inFence) {
          inFence = true;
          fence = m[1];
        } else if (line.trimStart().startsWith(fence)) {
          inFence = false;
          fence = "";
        }
        return " ".repeat(line.length);
      }
      if (inFence) return " ".repeat(line.length);
      return line.replace(/`+[^`]*`+/g, (s) => " ".repeat(s.length));
    })
    .join("\n");
}

function checkFile(file: string): BrokenLink[] {
  const text = readFileSync(file, "utf-8");
  const masked = maskCode(text);
  const fileDir = dirname(file);
  const broken: BrokenLink[] = [];
  const seen = new Set<string>();

  // Build a flat list of {line, target} matches. Doing two passes (inline + ref)
  // keeps the regexes simple and readable.
  type Hit = { line: number; target: string };
  const hits: Hit[] = [];

  // Inline links
  const inlineRe = new RegExp(INLINE_LINK_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(masked)) !== null) {
    const target = m[1];
    const upto = masked.slice(0, m.index);
    const line = upto.split("\n").length;
    hits.push({ line, target });
  }

  // Reference-style link definitions
  const refRe = new RegExp(REFERENCE_DEF_RE.source, "gm");
  let r: RegExpExecArray | null;
  while ((r = refRe.exec(masked)) !== null) {
    const target = r[1];
    const upto = masked.slice(0, r.index);
    const line = upto.split("\n").length;
    hits.push({ line, target });
  }

  for (const { line, target } of hits) {
    if (!target) continue;
    if (isExternal(target)) continue;
    if (target.startsWith("#")) continue; // intra-page anchor
    const { path: rawPath } = stripAnchor(target);
    if (!rawPath) continue; // bare anchor
    // Strip surrounding angle brackets that GitHub sometimes uses for URLs.
    const cleaned = rawPath.replace(/^<|>$/g, "");
    const absoluteBase = cleaned.startsWith("/") ? ROOT : fileDir;
    const resolved = resolve(absoluteBase, cleaned.startsWith("/") ? cleaned.slice(1) : cleaned);
    const dedupeKey = `${line}:${target}:${resolved}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    if (!existsSync(resolved)) {
      broken.push({ source: relative(ROOT, file), line, target, resolved });
    }
  }

  return broken;
}

function main() {
  const files = collectMarkdownFiles();
  const allBroken: BrokenLink[] = [];
  for (const file of files) {
    allBroken.push(...checkFile(file));
  }

  if (allBroken.length === 0) {
    console.log(`✅ Markdown link check: all ${files.length} files clean.`);
    return;
  }

  console.log(`❌ Markdown link check found ${allBroken.length} broken link(s):\n`);
  for (const b of allBroken) {
    console.log(`  ${b.source}:${b.line}`);
    console.log(`    target:   ${b.target}`);
    console.log(`    resolved: ${relative(ROOT, b.resolved)}`);
  }
  process.exit(1);
}

main();
