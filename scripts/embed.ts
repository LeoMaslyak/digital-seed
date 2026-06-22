#!/usr/bin/env bun
/**
 * Digital Seed Embedding Pipeline
 *
 * Usage:
 *   bun run embed              — Index all configured paths
 *   bun run embed --watch      — Index + watch for changes
 *   bun run embed --status     — Show current index status
 *   bun run embed --path <p>   — Index a specific path
 */

import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, extname, relative } from "path";
import { createHash } from "crypto";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const DATA_DIR = join(ROOT, "data", "rag");
const DB_DIR = join(DATA_DIR, "lancedb");
const STATUS_FILE = join(DATA_DIR, "status.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

// ─── Config ─────────────────────────────────────────────────────────

interface EmbedConfig {
  provider: "openai" | "ollama";
  model: string;
  dimensions: number;
  paths: string[];
  fileTypes: string[];
  exclude: string[];
  chunkSize: number;
  chunkOverlap: number;
}

function loadConfig(): EmbedConfig {
  const defaults: EmbedConfig = {
    provider: process.env.OPENAI_API_KEY ? "openai" : "ollama",
    model: process.env.OPENAI_API_KEY ? "text-embedding-3-small" : "nomic-embed-text",
    dimensions: process.env.OPENAI_API_KEY ? 1536 : 768,
    paths: ["user/", "patterns/", "docs/"],
    fileTypes: [".md", ".txt", ".json", ".yaml", ".yml"],
    exclude: ["node_modules", ".git", "data/rag", "bun.lock", "*.jsonl", "vectors.json"],
    chunkSize: 1000,
    chunkOverlap: 200,
  };

  const configPath = join(ROOT, "config", "embeddings.yaml");
  if (existsSync(configPath)) {
    try {
      const yaml = require("js-yaml");
      const raw = yaml.load(readFileSync(configPath, "utf-8")) as any;
      if (raw) {
        if (raw.provider) defaults.provider = raw.provider;
        if (raw.model) defaults.model = raw.model;
        if (raw.dimensions) defaults.dimensions = raw.dimensions;
        if (raw.paths) defaults.paths = raw.paths;
        if (raw.fileTypes) defaults.fileTypes = raw.fileTypes;
        if (raw.exclude) defaults.exclude = raw.exclude;
        if (raw.chunkSize) defaults.chunkSize = raw.chunkSize;
        if (raw.chunkOverlap) defaults.chunkOverlap = raw.chunkOverlap;
      }
    } catch {
      // Use defaults
    }
  }

  if (process.env.OLLAMA_ENABLED === "true") {
    defaults.provider = "ollama";
    defaults.model = "nomic-embed-text";
    defaults.dimensions = 768;
  }

  return defaults;
}

// ─── Embedding ──────────────────────────────────────────────────────

async function getEmbedding(text: string, config: EmbedConfig): Promise<number[]> {
  if (config.provider === "openai") {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: config.model, input: text }),
    });
    if (!resp.ok) {
      console.error(`  OpenAI API error: ${resp.status} ${resp.statusText}`);
      return [];
    }
    const data = (await resp.json()) as any;
    return data.data?.[0]?.embedding || [];
  }

  if (config.provider === "ollama") {
    try {
      const resp = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, prompt: text }),
      });
      if (!resp.ok) return [];
      const data = (await resp.json()) as any;
      return data.embedding || [];
    } catch {
      return [];
    }
  }

  return [];
}

// ─── Helpers ────────────────────────────────────────────────────────

function contentHash(content: string): string {
  return createHash("md5").update(content).digest("hex").slice(0, 16);
}

function chunkText(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += maxChars - overlap;
  }
  return chunks;
}

function shouldExclude(filePath: string, config: EmbedConfig): boolean {
  const rel = relative(ROOT, filePath);
  for (const pattern of config.exclude) {
    if (pattern.startsWith("*.")) {
      if (filePath.endsWith(pattern.slice(1))) return true;
    } else if (rel.startsWith(pattern) || rel.includes(`/${pattern}`)) {
      return true;
    }
  }
  return false;
}

function discoverFiles(targetPath: string, config: EmbedConfig): string[] {
  const fullPath = targetPath.startsWith("/") ? targetPath : join(ROOT, targetPath);
  if (!existsSync(fullPath)) return [];

  const stat = statSync(fullPath);
  if (stat.isFile()) {
    if (config.fileTypes.includes(extname(fullPath))) return [fullPath];
    return [];
  }

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fp = join(dir, entry);
      if (shouldExclude(fp, config)) continue;
      const s = statSync(fp);
      if (s.isDirectory() && !entry.startsWith(".")) walk(fp);
      if (s.isFile() && config.fileTypes.includes(extname(entry))) files.push(fp);
    }
  };
  walk(fullPath);
  return files;
}

// ─── LanceDB / Fallback Store ───────────────────────────────────────

let lancedb: any = null;
let db: any = null;
let table: any = null;
let useFallback = false;

const FALLBACK_PATH = join(DATA_DIR, "vectors.json");

interface FallbackDoc {
  id: string; content: string; source: string; hash: string;
  embedding: number[]; indexedAt: string;
}

interface FallbackStore {
  documents: FallbackDoc[];
  lastIndexed: string | null;
}

function loadFallbackStore(): FallbackStore {
  if (!existsSync(FALLBACK_PATH)) return { documents: [], lastIndexed: null };
  try { return JSON.parse(readFileSync(FALLBACK_PATH, "utf-8")); } catch { return { documents: [], lastIndexed: null }; }
}

function saveFallbackStore(store: FallbackStore): void {
  writeFileSync(FALLBACK_PATH, JSON.stringify(store), "utf-8");
}

async function initDB(): Promise<void> {
  try {
    lancedb = await import("@lancedb/lancedb");
    db = await lancedb.connect(DB_DIR);
    const names = await db.tableNames();
    if (names.includes("documents")) {
      table = await db.openTable("documents");
    }
    console.log("✓ LanceDB connected");
  } catch (e) {
    // The JSON keyword index is the intended, supported offline default — not an
    // error. (LanceDB is an optional accelerator and isn't bundled by default.)
    console.log("ℹ Using the local keyword index (JSON) — works offline, no setup needed.");
    console.log("   For local semantic search, run: ollama pull nomic-embed-text  then re-index.");
    useFallback = true;
  }
}

async function getIndexedHashes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (useFallback) {
    for (const doc of loadFallbackStore().documents) map.set(doc.source, doc.hash);
    return map;
  }
  if (!table) return map;
  try {
    const rows = await table.query().select(["source", "hash"]).toArray();
    for (const r of rows) map.set(r.source, r.hash);
  } catch { /* empty table */ }
  return map;
}

async function storeDocuments(docs: Array<{
  id: string; content: string; source: string; hash: string;
  embedding: number[]; indexedAt: string; chunkIndex: number;
}>): Promise<void> {
  // Always maintain a tiny JSON mirror so `bun run seed search` works even
  // when LanceDB is installed but the user wants simple local keyword search.
  // This keeps Digital Seed free-first: no hosted vector DB and no paid API key
  // is required for the first useful retrieval loop.
  const fallbackStore = loadFallbackStore();
  const fallbackSources = new Set(docs.map(d => d.source));
  fallbackStore.documents = fallbackStore.documents.filter(d => !fallbackSources.has(d.source));
  for (const doc of docs) {
    fallbackStore.documents.push({
      id: doc.id, content: doc.content, source: doc.source,
      hash: doc.hash, embedding: doc.embedding, indexedAt: doc.indexedAt,
    });
  }
  fallbackStore.lastIndexed = new Date().toISOString();
  saveFallbackStore(fallbackStore);

  if (useFallback) return;

  const vectorDocs = docs.filter(d => d.embedding.length > 0);
  if (vectorDocs.length === 0) return;

  const records = vectorDocs.map(d => ({
    id: d.id, content: d.content, source: d.source, hash: d.hash,
    vector: d.embedding, indexedAt: d.indexedAt, chunkIndex: d.chunkIndex,
  }));

  // Remove old records for these sources
  const sources = [...new Set(vectorDocs.map(d => d.source))];
  if (table) {
    for (const src of sources) {
      try { await table.delete(`source = '${src.replace(/'/g, "''")}'`); } catch {}
    }
    await table.add(records);
  } else {
    table = await db!.createTable("documents", records);
  }
}

async function getDocCount(): Promise<number> {
  if (useFallback) return loadFallbackStore().documents.length;
  if (!table) return 0;
  try { return await table.countRows(); } catch { return 0; }
}

// ─── Index All ──────────────────────────────────────────────────────

async function indexAll(config: EmbedConfig, specificPath?: string): Promise<void> {
  const paths = specificPath ? [specificPath] : config.paths;
  const existingHashes = await getIndexedHashes();
  let totalIndexed = 0, totalSkipped = 0, totalErrors = 0, totalFiles = 0;

  for (const p of paths) {
    const files = discoverFiles(p, config);
    totalFiles += files.length;
    console.log(`\n📂 ${p} — ${files.length} files`);

    for (const file of files) {
      const rel = relative(ROOT, file);
      try {
        const content = readFileSync(file, "utf-8");
        const hash = contentHash(content);

        if (existingHashes.get(file) === hash) {
          totalSkipped++;
          continue;
        }

        const chunks = chunkText(content, config.chunkSize, config.chunkOverlap);
        const docs: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await getEmbedding(chunks[i], config);
          docs.push({
            id: `${hash}-${i}`, content: chunks[i], source: file,
            hash, embedding, indexedAt: new Date().toISOString(), chunkIndex: i,
          });
        }

        if (docs.length > 0) {
          await storeDocuments(docs);
          totalIndexed++;
          const keywordOnly = docs.every(d => d.embedding.length === 0);
          console.log(`  ✓ ${rel} (${chunks.length} chunks${keywordOnly ? ", keyword-only" : ""})`);
        }
      } catch (e) {
        totalErrors++;
        console.error(`  ✗ ${rel}: ${(e as Error).message}`);
      }
    }
  }

  // Write status
  const totalChunks = await getDocCount();
  writeFileSync(STATUS_FILE, JSON.stringify({
    totalDocuments: totalIndexed + totalSkipped,
    totalChunks,
    lastIndexed: new Date().toISOString(),
    embeddingProvider: config.provider,
    embeddingModel: config.model,
    storage: useFallback ? "json-fallback" : "lancedb",
  }, null, 2), "utf-8");

  console.log(`\n─── Summary ───`);
  console.log(`Files found:    ${totalFiles}`);
  console.log(`Indexed:        ${totalIndexed}`);
  console.log(`Unchanged:      ${totalSkipped}`);
  console.log(`Errors:         ${totalErrors}`);
  console.log(`Total chunks:   ${totalChunks}`);
  console.log(`Storage:        ${useFallback ? "json-fallback" : "lancedb"}`);
  console.log(`Provider:       ${config.provider} (${config.model})`);
}

// ─── Watch Mode ─────────────────────────────────────────────────────

async function watchMode(config: EmbedConfig): Promise<void> {
  const chokidar = await import("chokidar");
  const watchPaths = config.paths.map(p => p.startsWith("/") ? p : join(ROOT, p));

  console.log(`\n👁 Watching for changes in: ${config.paths.join(", ")}`);

  const watcher = chokidar.watch(watchPaths, {
    ignored: config.exclude.map(e =>
      e.startsWith("*.") ? `**/*${e.slice(1)}` : `**/${e}/**`
    ),
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", async (filePath: string) => {
    if (!config.fileTypes.includes(extname(filePath))) return;
    if (shouldExclude(filePath, config)) return;
    const rel = relative(ROOT, filePath);
    console.log(`\n📝 Changed: ${rel}`);
    try {
      const content = readFileSync(filePath, "utf-8");
      const hash = contentHash(content);
      const chunks = chunkText(content, config.chunkSize, config.chunkOverlap);
      const docs: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i], config);
        if (embedding.length === 0) continue;
        docs.push({
          id: `${hash}-${i}`, content: chunks[i], source: filePath,
          hash, embedding, indexedAt: new Date().toISOString(), chunkIndex: i,
        });
      }
      if (docs.length > 0) {
        await storeDocuments(docs);
        console.log(`  ✓ Re-indexed ${rel} (${chunks.length} chunks)`);
      }
    } catch (e) {
      console.error(`  ✗ ${rel}: ${(e as Error).message}`);
    }
  });

  watcher.on("add", async (filePath: string) => {
    if (!config.fileTypes.includes(extname(filePath))) return;
    if (shouldExclude(filePath, config)) return;
    console.log(`\n➕ Added: ${relative(ROOT, filePath)}`);
  });

  watcher.on("unlink", (filePath: string) => {
    console.log(`\n🗑 Removed: ${relative(ROOT, filePath)}`);
  });

  // Keep alive
  await new Promise(() => {});
}

// ─── Status ─────────────────────────────────────────────────────────

function showStatus(): void {
  if (!existsSync(STATUS_FILE)) {
    console.log("No index yet. Run: bun run embed");
    return;
  }
  const status = JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
  console.log("\n─── RAG Index Status ───");
  console.log(`Documents:    ${status.totalDocuments || "?"}`);
  console.log(`Chunks:       ${status.totalChunks || "?"}`);
  console.log(`Last indexed: ${status.lastIndexed || "never"}`);
  console.log(`Provider:     ${status.embeddingProvider} (${status.embeddingModel})`);
  console.log(`Storage:      ${status.storage || "unknown"}`);
}

// ─── Main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--status")) {
  showStatus();
  process.exit(0);
}

const config = loadConfig();

console.log("Digital Seed Embedding Pipeline");
console.log(`Provider: ${config.provider} (${config.model})`);
console.log(`Paths:    ${config.paths.join(", ")}`);

await initDB();

if (args.includes("--path")) {
  const idx = args.indexOf("--path");
  const path = args[idx + 1];
  if (!path) { console.error("Missing path argument"); process.exit(1); }
  await indexAll(config, path);
} else {
  await indexAll(config);
}

if (args.includes("--watch")) {
  await watchMode(config);
}
