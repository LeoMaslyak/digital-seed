/**
 * DAI GitHub Repo Learning Bot — Index any GitHub repo into the RAG system.
 *
 * Fetches README, docs, and key source files from a GitHub repo via the
 * GitHub API, chunks them, and stores them in the local RAG index (same
 * JSON fallback used by the rag-server). Once indexed, content is searchable
 * via the `rag_search` MCP tool.
 *
 * Usage:
 *   bun run repo-bot learn <owner/repo>         — public repo
 *   bun run repo-bot learn <owner/repo> --token <PAT> — private repo
 *   bun run repo-bot list                       — show indexed repos
 *   bun run repo-bot forget <owner/repo>        — remove from index
 *   bun run repo-bot search <owner/repo> <query> — quick search
 *
 * What gets indexed:
 *   README.md, *.md in root and docs/, key config files (package.json,
 *   pyproject.toml), top-level source files up to MAX_FILES limit.
 *   Binary files, node_modules, lock files are skipped.
 *
 * Storage: data/rag/repo-index/ — one JSON per repo, compatible with
 *   the rag-server's JSON fallback vector store.
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
} from "fs";
import { join } from "path";
import { createHash } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RepoFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface RepoChunk {
  id: string;
  repoId: string;           // "owner/repo"
  filePath: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  indexedAt: string;
}

export interface RepoIndex {
  repoId: string;
  description?: string;
  defaultBranch: string;
  indexedAt: string;
  fileCount: number;
  chunkCount: number;
  chunks: RepoChunk[];
}

export interface RepoBotOptions {
  token?: string;           // GitHub PAT (required for private repos)
  maxFiles?: number;        // default 40
  chunkSize?: number;       // default 800 chars
  chunkOverlap?: number;    // default 100 chars
  branch?: string;          // default: repo's default branch
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPO_INDEX_DIR  = "data/rag/repo-index";
const GITHUB_API      = "https://api.github.com";
const DEFAULT_MAX_FILES   = 40;
const DEFAULT_CHUNK_SIZE  = 800;
const DEFAULT_OVERLAP     = 100;

/** File extensions to index. */
const INDEXABLE_EXTENSIONS = new Set([
  ".md", ".txt", ".rst", ".yaml", ".yml", ".json", ".toml",
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs",
]);

/** Paths/patterns to skip even if extension matches. */
const SKIP_PATTERNS = [
  "node_modules", ".git", "dist", "build", "coverage",
  "bun.lock", "package-lock.json", "yarn.lock", "poetry.lock",
  ".min.js", ".min.css", "vectors.json",
];

// ─── GitHub API helpers ───────────────────────────────────────────────────────

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "digital-seed-repo-bot/1.0",
  };
  if (token) h.Authorization = `token ${token}`;
  return h;
}

async function githubGet(path: string, token?: string): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, { headers: githubHeaders(token) });

  if (res.status === 404) throw new Error(`Not found: ${url} — if this is a private repo, set GITHUB_TOKEN in your .env file or pass --token <PAT>.`);
  if (res.status === 403) throw new Error("Rate limited or auth required. Pass --token <PAT>.");
  if (!res.ok) throw new Error(`GitHub API error: HTTP ${res.status} for ${url}`);

  return res.json();
}

async function getRepoMeta(
  owner: string, repo: string, token?: string
): Promise<{ defaultBranch: string; description: string | null }> {
  const data = await githubGet(`/repos/${owner}/${repo}`, token) as {
    default_branch: string;
    description: string | null;
  };
  return { defaultBranch: data.default_branch, description: data.description };
}

async function getTree(
  owner: string, repo: string, branch: string, token?: string
): Promise<Array<{ path: string; type: string; size?: number; sha: string; url: string }>> {
  const data = await githubGet(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token
  ) as { tree: Array<{ path: string; type: string; size?: number; sha: string; url: string }> };
  return data.tree.filter((f) => f.type === "blob");
}

async function getFileContent(
  blobUrl: string, token?: string
): Promise<string> {
  const data = await githubGet(blobUrl, token) as { content: string; encoding: string };
  if (data.encoding === "base64") {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
  }
  return data.content ?? "";
}

// ─── File selection ───────────────────────────────────────────────────────────

function shouldIndex(filePath: string, size?: number): boolean {
  // Skip binary/large files
  if (size && size > 200_000) return false;

  const lower = filePath.toLowerCase();
  if (SKIP_PATTERNS.some((p) => lower.includes(p))) return false;

  const ext = "." + lower.split(".").pop();
  if (!INDEXABLE_EXTENSIONS.has(ext)) return false;

  return true;
}

/**
 * Score files by importance — higher = fetch first, stop at maxFiles.
 * Priority: README > docs/*.md > root *.md > config files > source files
 */
function scoreFile(path: string): number {
  const lower = path.toLowerCase();
  if (lower === "readme.md") return 100;
  if (lower.startsWith("docs/") && lower.endsWith(".md")) return 80;
  if (!lower.includes("/") && lower.endsWith(".md")) return 70;
  if (lower === "package.json" || lower === "pyproject.toml") return 60;
  if (lower.endsWith(".md")) return 50;
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return 30;
  return 10;
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
): string[] {
  const chunks: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    const end = Math.min(pos + chunkSize, text.length);
    const chunk = text.slice(pos, end).trim();
    if (chunk.length > 30) chunks.push(chunk);  // skip near-empty chunks
    pos += chunkSize - overlap;
  }

  return chunks;
}

// ─── Index storage ────────────────────────────────────────────────────────────

function indexPath(root: string, repoId: string): string {
  return join(root, REPO_INDEX_DIR, repoId.replace("/", "__") + ".json");
}

function saveRepoIndex(root: string, index: RepoIndex): void {
  const dir = join(root, REPO_INDEX_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(indexPath(root, index.repoId), JSON.stringify(index, null, 2), "utf-8");
}

function loadRepoIndex(root: string, repoId: string): RepoIndex | null {
  const path = indexPath(root, repoId);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return null; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Index a GitHub repo into the local RAG store.
 * Returns the completed RepoIndex with chunk count.
 */
export async function learnRepo(
  root: string,
  repoId: string,
  options: RepoBotOptions = {},
  onProgress?: (msg: string) => void
): Promise<RepoIndex> {
  const [owner, repo] = repoId.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo ID: "${repoId}". Expected format: owner/repo`);

  const log = onProgress ?? console.log;
  const { token, maxFiles = DEFAULT_MAX_FILES, chunkSize = DEFAULT_CHUNK_SIZE,
          chunkOverlap = DEFAULT_OVERLAP } = options;

  log(`📥 Fetching repo metadata: ${repoId}`);
  const meta   = await getRepoMeta(owner, repo, token);
  const branch = options.branch ?? meta.defaultBranch;

  log(`   Branch: ${branch}${meta.description ? ` — ${meta.description}` : ""}`);
  log("🗂  Fetching file tree...");
  const tree = await getTree(owner, repo, branch, token);

  // Select and rank files
  const candidates = tree
    .filter((f) => shouldIndex(f.path, f.size))
    .sort((a, b) => scoreFile(b.path) - scoreFile(a.path))
    .slice(0, maxFiles);

  log(`   ${candidates.length} files selected (${tree.length} total, limit ${maxFiles})`);

  const chunks: RepoChunk[] = [];
  let fileCount = 0;

  for (const file of candidates) {
    try {
      const content = await getFileContent(file.url, token);
      if (!content.trim()) continue;

      const textChunks = chunkText(content, chunkSize, chunkOverlap);
      for (let i = 0; i < textChunks.length; i++) {
        const text = textChunks[i];
        chunks.push({
          id: createHash("sha256")
            .update(`${repoId}/${file.path}/${i}`)
            .digest("hex")
            .slice(0, 16),
          repoId,
          filePath: file.path,
          chunkIndex: i,
          content: `[${repoId} · ${file.path}]\n\n${text}`,
          contentHash: createHash("sha256").update(text).digest("hex").slice(0, 12),
          indexedAt: new Date().toISOString(),
        });
      }
      fileCount++;
    } catch {
      // Skip unreadable files silently
    }
  }

  log(`✅ Indexed ${fileCount} files → ${chunks.length} chunks`);

  const index: RepoIndex = {
    repoId,
    description: meta.description ?? undefined,
    defaultBranch: branch,
    indexedAt: new Date().toISOString(),
    fileCount,
    chunkCount: chunks.length,
    chunks,
  };

  saveRepoIndex(root, index);
  return index;
}

/**
 * List all indexed repos.
 */
export function listIndexedRepos(root: string): Array<Omit<RepoIndex, "chunks">> {
  const dir = join(root, REPO_INDEX_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const idx = JSON.parse(readFileSync(join(dir, f), "utf-8")) as RepoIndex;
        const { chunks: _, ...meta } = idx;
        return meta;
      } catch { return null; }
    })
    .filter((x): x is Omit<RepoIndex, "chunks"> => x !== null)
    .sort((a, b) => a.repoId.localeCompare(b.repoId));
}

/**
 * Remove a repo from the index.
 */
export function forgetRepo(root: string, repoId: string): boolean {
  const path = indexPath(root, repoId);
  if (!existsSync(path)) return false;
  const { unlinkSync } = require("fs");
  unlinkSync(path);
  return true;
}

/**
 * Simple keyword search over indexed repo chunks (no embeddings needed).
 * Returns up to `limit` chunks containing the query string.
 */
export function searchRepo(
  root: string,
  repoId: string,
  query: string,
  limit = 5
): RepoChunk[] {
  const index = loadRepoIndex(root, repoId);
  if (!index) return [];

  const q = query.toLowerCase();
  return index.chunks
    .filter((c) => c.content.toLowerCase().includes(q))
    .slice(0, limit);
}

/**
 * Search across ALL indexed repos.
 */
export function searchAllRepos(
  root: string,
  query: string,
  limit = 10
): Array<RepoChunk & { score: number }> {
  const dir = join(root, REPO_INDEX_DIR);
  if (!existsSync(dir)) return [];

  const q = query.toLowerCase();
  const results: Array<RepoChunk & { score: number }> = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const index = JSON.parse(readFileSync(join(dir, file), "utf-8")) as RepoIndex;
      for (const chunk of index.chunks) {
        const content = chunk.content.toLowerCase();
        if (!content.includes(q)) continue;

        // Simple TF-like score: count occurrences, boost title matches
        const occurrences = (content.match(new RegExp(q, "g")) ?? []).length;
        const titleBoost  = chunk.filePath.toLowerCase().includes(q) ? 3 : 0;
        results.push({ ...chunk, score: occurrences + titleBoost });
      }
    } catch { /* skip corrupt files */ }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
