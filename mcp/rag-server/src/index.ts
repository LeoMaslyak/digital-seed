#!/usr/bin/env bun
/**
 * Digital Seed RAG Server — Semantic search MCP server backed by LanceDB.
 *
 * Tools:
 *   - rag_search: Semantic search over embedded content
 *   - rag_index: Trigger re-indexing of a path
 *   - rag_status: Get embedding stats
 *
 * Supports: OpenAI text-embedding-3-small, Ollama nomic-embed-text
 * Storage: LanceDB (local, file-based — zero infrastructure)
 * Config: config/embeddings.yaml
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join, dirname, extname, relative, resolve, sep } from "path";
import { createHash } from "crypto";

const ROOT =
  process.env.DIGITAL_SEED_ROOT ||
  join(dirname(new URL(import.meta.url).pathname), "../../..");
const DATA_DIR = join(ROOT, "data", "rag");
const DB_DIR = join(DATA_DIR, "lancedb");
const STATUS_FILE = join(DATA_DIR, "status.json");
const TABLE_NAME = "documents";

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

// ─── Embedding Config ───────────────────────────────────────────────

interface EmbeddingsConfig {
  provider: "openai" | "ollama";
  model: string;
  dimensions: number;
  paths: string[];
  fileTypes: string[];
  exclude: string[];
  chunkSize: number;
  chunkOverlap: number;
}

// Cloud embeddings (OpenAI) send your content off the machine. They are
// OFF by default — even when OPENAI_API_KEY is set — and require an explicit
// opt-in (RAG_EMBED_CLOUD=1) so private notes never leave the machine silently.
function cloudOptIn(): boolean {
  const v = (process.env.RAG_EMBED_CLOUD || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function loadEmbeddingsConfig(): Promise<EmbeddingsConfig> {
  // Default to LOCAL (Ollama) regardless of key presence. Cloud requires opt-in.
  const useCloud = cloudOptIn() && !!process.env.OPENAI_API_KEY;
  const defaults: EmbeddingsConfig = {
    provider: useCloud ? "openai" : "ollama",
    model: useCloud ? "text-embedding-3-small" : "nomic-embed-text",
    dimensions: useCloud ? 1536 : 768,
    paths: ["user/", "patterns/", "data/"],
    fileTypes: [".md", ".txt", ".json", ".yaml", ".yml"],
    exclude: [
      "node_modules",
      ".git",
      "data/rag",
      "bun.lock",
      "*.jsonl",
      "vectors.json",
    ],
    chunkSize: 1000,
    chunkOverlap: 200,
  };

  const configPath = join(ROOT, "config", "embeddings.yaml");
  if (existsSync(configPath)) {
    try {
      const yaml = await import("js-yaml");
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
      // Use defaults on parse error
    }
  }

  // Environment overrides
  if (process.env.OLLAMA_ENABLED === "true") {
    defaults.provider = "ollama";
    defaults.model = "nomic-embed-text";
    defaults.dimensions = 768;
  }

  // Hard privacy gate: cloud (OpenAI) is only ever used with an explicit opt-in,
  // even if config/embeddings.yaml requests provider: openai. A committed/poisoned
  // config can never silently ship private content off the machine.
  if (defaults.provider === "openai" && !cloudOptIn()) {
    console.error(
      "Cloud embedding (OpenAI) requested but RAG_EMBED_CLOUD is not set — falling back to local Ollama (nomic-embed-text). Set RAG_EMBED_CLOUD=1 to enable cloud."
    );
    defaults.provider = "ollama";
    defaults.model = "nomic-embed-text";
    defaults.dimensions = 768;
  }

  return defaults;
}

// ─── Embedding Provider ─────────────────────────────────────────────

async function getEmbedding(
  text: string,
  config: EmbeddingsConfig
): Promise<number[]> {
  if (config.provider === "openai") {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: config.model, input: text }),
    });
    if (!resp.ok) return [];
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

// ─── Content Hashing ────────────────────────────────────────────────

function contentHash(content: string): string {
  return createHash("md5").update(content).digest("hex").slice(0, 16);
}

// ─── Chunking ───────────────────────────────────────────────────────

function chunkText(
  text: string,
  maxChars: number = 1000,
  overlap: number = 200
): string[] {
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

// ─── LanceDB Store ──────────────────────────────────────────────────

let lancedb: typeof import("@lancedb/lancedb") | null = null;
let db: any = null;
let table: any = null;
let useFallback = false;

// Fallback JSON store (used if LanceDB can't load)
interface FallbackDoc {
  id: string;
  content: string;
  source: string;
  hash: string;
  embedding: number[];
  indexedAt: string;
}

interface FallbackStore {
  documents: FallbackDoc[];
  lastIndexed: string | null;
}

const FALLBACK_PATH = join(DATA_DIR, "vectors.json");

function loadFallbackStore(): FallbackStore {
  if (!existsSync(FALLBACK_PATH))
    return { documents: [], lastIndexed: null };
  try {
    return JSON.parse(readFileSync(FALLBACK_PATH, "utf-8"));
  } catch {
    return { documents: [], lastIndexed: null };
  }
}

function saveFallbackStore(store: FallbackStore): void {
  writeFileSync(FALLBACK_PATH, JSON.stringify(store), "utf-8");
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function initDB(config: EmbeddingsConfig): Promise<void> {
  try {
    lancedb = await import("@lancedb/lancedb");
    db = await lancedb.connect(DB_DIR);

    // Check if table exists
    const tableNames = await db.tableNames();
    if (tableNames.includes(TABLE_NAME)) {
      table = await db.openTable(TABLE_NAME);
    }
  } catch (e) {
    console.error(
      "LanceDB not available, using JSON fallback:",
      (e as Error).message
    );
    useFallback = true;
  }
}

async function ensureTable(config: EmbeddingsConfig): Promise<void> {
  if (useFallback || table) return;
  if (!db) await initDB(config);
  if (useFallback) return;
  // Table will be created on first insert
}

async function upsertDocuments(
  docs: Array<{
    id: string;
    content: string;
    source: string;
    hash: string;
    embedding: number[];
    indexedAt: string;
    chunkIndex: number;
  }>,
  config: EmbeddingsConfig
): Promise<void> {
  if (useFallback) {
    const store = loadFallbackStore();
    for (const doc of docs) {
      store.documents = store.documents.filter((d) => d.id !== doc.id);
      store.documents.push({
        id: doc.id,
        content: doc.content,
        source: doc.source,
        hash: doc.hash,
        embedding: doc.embedding,
        indexedAt: doc.indexedAt,
      });
    }
    store.lastIndexed = new Date().toISOString();
    saveFallbackStore(store);
    return;
  }

  await ensureTable(config);

  const records = docs.map((d) => ({
    id: d.id,
    content: d.content,
    source: d.source,
    hash: d.hash,
    vector: d.embedding,
    indexedAt: d.indexedAt,
    chunkIndex: d.chunkIndex,
  }));

  if (!table) {
    // Create table with first batch
    table = await db!.createTable(TABLE_NAME, records);
  } else {
    // Delete old records for these sources, then add new ones
    const sources = [...new Set(docs.map((d) => d.source))];
    for (const src of sources) {
      try {
        await table.delete(`source = '${src.replace(/'/g, "''")}'`);
      } catch {
        // Table might be empty or source not found
      }
    }
    await table.add(records);
  }
}

async function searchDocuments(
  queryEmbedding: number[],
  topK: number,
  config: EmbeddingsConfig
): Promise<Array<{ content: string; source: string; score: number }>> {
  if (useFallback) {
    const store = loadFallbackStore();
    if (store.documents.length === 0) return [];
    const scored = store.documents.map((doc) => ({
      content: doc.content,
      source: doc.source,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  await ensureTable(config);
  if (!table) return [];

  try {
    const results = await table
      .vectorSearch(queryEmbedding)
      .limit(topK)
      .toArray();

    return results.map((r: any) => ({
      content: r.content,
      source: r.source,
      score: 1 - (r._distance || 0), // LanceDB returns distance, convert to similarity
    }));
  } catch {
    return [];
  }
}

async function removeSource(
  source: string,
  config: EmbeddingsConfig
): Promise<void> {
  if (useFallback) {
    const store = loadFallbackStore();
    store.documents = store.documents.filter((d) => d.source !== source);
    saveFallbackStore(store);
    return;
  }

  await ensureTable(config);
  if (!table) return;

  try {
    await table.delete(`source = '${source.replace(/'/g, "''")}'`);
  } catch {
    // Ignore
  }
}

async function getDocumentCount(): Promise<number> {
  if (useFallback) {
    return loadFallbackStore().documents.length;
  }
  if (!table) return 0;
  try {
    return await table.countRows();
  } catch {
    return 0;
  }
}

async function getIndexedHashes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  if (useFallback) {
    const store = loadFallbackStore();
    for (const doc of store.documents) {
      map.set(doc.source, doc.hash);
    }
    return map;
  }

  if (!table) return map;

  try {
    // Read all source+hash pairs for dedup checking
    const rows = await table
      .query()
      .select(["source", "hash"])
      .toArray();
    for (const r of rows) {
      map.set(r.source, r.hash);
    }
  } catch {
    // Empty table
  }
  return map;
}

// ─── File Discovery ─────────────────────────────────────────────────

// Confine a (possibly absolute or relative) target to the project ROOT.
// Absolute paths previously bypassed ROOT entirely (and shouldExclude, which is
// relative-to-ROOT), enabling out-of-root file read + cloud upload. Resolve the
// path and reject anything that is not ROOT itself or a descendant of ROOT.
function resolveUnderRoot(targetPath: string): string | null {
  const rootResolved = resolve(ROOT);
  const full = resolve(rootResolved, targetPath);
  if (full === rootResolved || full.startsWith(rootResolved + sep)) {
    return full;
  }
  return null;
}

function shouldExclude(filePath: string, config: EmbeddingsConfig): boolean {
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

function discoverFiles(
  targetPath: string,
  config: EmbeddingsConfig
): string[] {
  // Reject paths that resolve outside ROOT (absolute escapes, ../ traversal).
  const fullPath = resolveUnderRoot(targetPath);
  if (!fullPath) {
    console.error(
      `rag_index: refusing path outside project root: ${targetPath}`
    );
    return [];
  }
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
      if (s.isFile() && config.fileTypes.includes(extname(entry)))
        files.push(fp);
    }
  };
  walk(fullPath);
  return files;
}

// ─── Indexing ───────────────────────────────────────────────────────

async function indexPath(
  path: string,
  config: EmbeddingsConfig
): Promise<{ indexed: number; skipped: number; errors: number }> {
  await ensureTable(config);

  const files = discoverFiles(path, config);
  if (files.length === 0) return { indexed: 0, skipped: 0, errors: 1 };

  const existingHashes = await getIndexedHashes();
  let indexed = 0,
    skipped = 0,
    errors = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const hash = contentHash(content);

      // Skip if already indexed with same hash
      if (existingHashes.get(file) === hash) {
        skipped++;
        continue;
      }

      const chunks = chunkText(content, config.chunkSize, config.chunkOverlap);
      const docs: Array<{
        id: string;
        content: string;
        source: string;
        hash: string;
        embedding: number[];
        indexedAt: string;
        chunkIndex: number;
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i], config);
        if (embedding.length === 0) {
          errors++;
          continue;
        }
        docs.push({
          id: `${hash}-${i}`,
          content: chunks[i],
          source: file,
          hash,
          embedding,
          indexedAt: new Date().toISOString(),
          chunkIndex: i,
        });
      }

      if (docs.length > 0) {
        await upsertDocuments(docs, config);
        indexed++;
      }
    } catch {
      errors++;
    }
  }

  // Update status file
  const totalChunks = await getDocumentCount();
  writeFileSync(
    STATUS_FILE,
    JSON.stringify(
      {
        totalDocuments: indexed + skipped,
        totalChunks,
        lastIndexed: new Date().toISOString(),
        embeddingProvider: config.provider,
        embeddingModel: config.model,
        storage: useFallback ? "json-fallback" : "lancedb",
      },
      null,
      2
    ),
    "utf-8"
  );

  return { indexed, skipped, errors };
}

// ─── Search ─────────────────────────────────────────────────────────

async function semanticSearch(
  query: string,
  topK: number,
  config: EmbeddingsConfig
): Promise<Array<{ content: string; source: string; score: number }>> {
  const queryEmbedding = await getEmbedding(query, config);
  if (queryEmbedding.length === 0) return [];
  return searchDocuments(queryEmbedding, topK, config);
}

// ─── File Watcher ───────────────────────────────────────────────────

let watcherActive = false;

async function startWatcher(config: EmbeddingsConfig): Promise<string> {
  if (watcherActive) return "Watcher already running";

  try {
    const chokidar = await import("chokidar");
    // Confine watched paths to ROOT — drop any configured path that escapes it.
    const watchPaths = config.paths
      .map((p) => resolveUnderRoot(p))
      .filter((p): p is string => p !== null);
    const globs = config.fileTypes.map((ext) => `**/*${ext}`);

    const watcher = chokidar.watch(watchPaths, {
      ignored: config.exclude.map((e) =>
        e.startsWith("*.") ? `**/*${e.slice(1)}` : `**/${e}/**`
      ),
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("change", async (filePath: string) => {
      if (!config.fileTypes.includes(extname(filePath))) return;
      if (shouldExclude(filePath, config)) return;
      await indexPath(filePath, config);
    });

    watcher.on("add", async (filePath: string) => {
      if (!config.fileTypes.includes(extname(filePath))) return;
      if (shouldExclude(filePath, config)) return;
      await indexPath(filePath, config);
    });

    watcher.on("unlink", async (filePath: string) => {
      await removeSource(filePath, config);
    });

    watcherActive = true;
    return `Watching ${watchPaths.length} paths for changes`;
  } catch (e) {
    return `Failed to start watcher: ${(e as Error).message}`;
  }
}

// ─── MCP Server ─────────────────────────────────────────────────────

const embeddingsConfig = await loadEmbeddingsConfig();
await initDB(embeddingsConfig);

const server = new Server(
  { name: "seed-rag", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "rag_search",
      description:
        "Semantic search over your embedded content (notes, documents, etc.)",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "What to search for" },
          top_k: {
            type: "number",
            description: "Number of results (default: 5)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "rag_index",
      description:
        "Index (or re-index) a file or directory for semantic search",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description:
              "Path to index (relative to project root or absolute)",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "rag_status",
      description:
        "Get the status of the embedding index (document count, last indexed, health)",
      inputSchema: { type: "object" as const, properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, unknown>;

  switch (name) {
    case "rag_search": {
      const results = await semanticSearch(
        a.query as string,
        (a.top_k as number) || 5,
        embeddingsConfig
      );
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No results found. Have you indexed any content? Use rag_index first.",
            },
          ],
        };
      }
      const formatted = results
        .map(
          (r, i) =>
            `**[${i + 1}]** (score: ${r.score.toFixed(3)}) — ${r.source}\n${r.content.slice(0, 300)}...`
        )
        .join("\n\n");
      return { content: [{ type: "text", text: formatted }] };
    }

    case "rag_index": {
      const result = await indexPath(a.path as string, embeddingsConfig);
      return {
        content: [
          {
            type: "text",
            text: `Indexing complete: ${result.indexed} indexed, ${result.skipped} unchanged, ${result.errors} errors (storage: ${useFallback ? "json-fallback" : "lancedb"})`,
          },
        ],
      };
    }

    case "rag_status": {
      const totalChunks = await getDocumentCount();
      const status = {
        totalChunks,
        lastIndexed: existsSync(STATUS_FILE)
          ? JSON.parse(readFileSync(STATUS_FILE, "utf-8")).lastIndexed
          : null,
        embeddingProvider: embeddingsConfig.provider,
        embeddingModel: embeddingsConfig.model,
        storage: useFallback ? "json-fallback" : "lancedb",
        configuredPaths: embeddingsConfig.paths,
        fileTypes: embeddingsConfig.fileTypes,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
