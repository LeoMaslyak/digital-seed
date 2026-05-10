#!/usr/bin/env bun
/**
 * Digital Seed Memory Server — MCP server for persistent file-backed memory.
 *
 * Tools:
 *   - memory_read: Read the current memory file
 *   - memory_append: Append a new entry with timestamp
 *   - memory_search: Search memory for a keyword
 *   - memory_update_section: Update a specific section
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const ROOT = process.env.DIGITAL_SEED_ROOT || join(dirname(new URL(import.meta.url).pathname), "../../..");
const MEMORY_FILE = join(ROOT, "user", "MEMORY.md");
const DATA_DIR = join(ROOT, "data");
const USER_DIR = join(ROOT, "user");

// Ensure runtime directories exist
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(USER_DIR)) mkdirSync(USER_DIR, { recursive: true });

function readMemory(): string {
  if (!existsSync(MEMORY_FILE)) return "# Memory\n\n*No entries yet.*\n";
  return readFileSync(MEMORY_FILE, "utf-8");
}

function appendMemory(entry: string, section?: string): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const content = readMemory();
  const newEntry = `\n- [${timestamp}] ${entry}`;

  if (section) {
    const sectionHeader = `## ${section}`;
    if (content.includes(sectionHeader)) {
      const updated = content.replace(
        sectionHeader,
        `${sectionHeader}${newEntry}`
      );
      writeFileSync(MEMORY_FILE, updated, "utf-8");
    } else {
      writeFileSync(MEMORY_FILE, `${content}\n${sectionHeader}${newEntry}\n`, "utf-8");
    }
  } else {
    writeFileSync(MEMORY_FILE, `${content}${newEntry}\n`, "utf-8");
  }

  return `Memory updated: ${entry}`;
}

function searchMemory(query: string): string {
  const content = readMemory();
  const lines = content.split("\n");
  const matches = lines.filter((line) =>
    line.toLowerCase().includes(query.toLowerCase())
  );

  if (matches.length === 0) return `No results for "${query}"`;
  return `Found ${matches.length} match(es):\n${matches.join("\n")}`;
}

// ─── Server ───

const server = new Server(
  { name: "seed-memory", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "memory_read",
      description: "Read the full persistent memory file",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "memory_append",
      description: "Append a new timestamped entry to memory",
      inputSchema: {
        type: "object" as const,
        properties: {
          entry: { type: "string", description: "The memory entry to add" },
          section: { type: "string", description: "Optional section name (e.g., 'Key Facts', 'Decisions')" },
        },
        required: ["entry"],
      },
    },
    {
      name: "memory_search",
      description: "Search memory for a keyword or phrase",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search term" },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "memory_read":
      return { content: [{ type: "text", text: readMemory() }] };
    case "memory_append":
      return {
        content: [{ type: "text", text: appendMemory(args?.entry as string, args?.section as string | undefined) }],
      };
    case "memory_search":
      return { content: [{ type: "text", text: searchMemory(args?.query as string) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
