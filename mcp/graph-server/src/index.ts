#!/usr/bin/env bun
/**
 * Digital Seed Knowledge Graph MCP Server
 *
 * Tools:
 *   - graph_search: Find nodes by query, optionally filtered by type
 *   - graph_add: Add a node to the graph
 *   - graph_connect: Create an edge between two nodes
 *   - graph_neighbors: Get all neighbors of a node (configurable depth)
 *   - graph_path: Find shortest path between two nodes
 *   - graph_visualize: Generate Mermaid diagram of the graph or a subgraph
 *   - graph_status: Get graph statistics
 *   - graph_remove: Remove a node or edge
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join, dirname } from "path";

// Import core graph module (relative path to core/src)
const ROOT =
  process.env.DIGITAL_SEED_ROOT ||
  join(dirname(new URL(import.meta.url).pathname), "../../..");

// Inline the graph operations to avoid cross-package import issues with MCP servers
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";

type NodeType = "person" | "topic" | "project" | "note" | "task" | "goal" | "session" | "pattern";
type EdgeType = "related-to" | "depends-on" | "mentioned-in" | "created-by" | "links-to" | "tagged-with" | "part-of";

interface GraphNode {
  id: string; type: NodeType; label: string;
  properties: Record<string, string | number | boolean>;
  createdAt: string; updatedAt: string;
}

interface GraphEdge {
  id: string; source: string; target: string; type: EdgeType;
  weight: number; properties: Record<string, string | number | boolean>;
  createdAt: string;
}

interface KnowledgeGraph {
  nodes: GraphNode[]; edges: GraphEdge[];
  lastModified: string; version: number;
}

const GRAPH_PATH = join(ROOT, "data", "graph.json");

function loadGraph(): KnowledgeGraph {
  if (!existsSync(GRAPH_PATH)) {
    return { nodes: [], edges: [], lastModified: new Date().toISOString(), version: 1 };
  }
  try { return JSON.parse(readFileSync(GRAPH_PATH, "utf-8")); }
  catch { return { nodes: [], edges: [], lastModified: new Date().toISOString(), version: 1 }; }
}

function saveGraph(graph: KnowledgeGraph): void {
  const dir = dirname(GRAPH_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  graph.lastModified = new Date().toISOString();
  graph.version++;
  writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── MCP Server ─────────────────────────────────────────────────────

const server = new Server(
  { name: "seed-graph", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const NODE_TYPES = ["person", "topic", "project", "note", "task", "goal", "session", "pattern"];
const EDGE_TYPES = ["related-to", "depends-on", "mentioned-in", "created-by", "links-to", "tagged-with", "part-of"];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "graph_search",
      description: "Search the knowledge graph for nodes matching a query. Returns matching nodes with relevance scores.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search term (matches labels and properties)" },
          type: { type: "string", enum: NODE_TYPES, description: "Filter by node type (optional)" },
          limit: { type: "number", description: "Max results (default: 10)" },
        },
        required: ["query"],
      },
    },
    {
      name: "graph_add",
      description: "Add a node to the knowledge graph. If a node with the same type+label exists, merges properties.",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: { type: "string", enum: NODE_TYPES, description: "Node type" },
          label: { type: "string", description: "Node label (e.g. person name, topic name)" },
          properties: { type: "object", description: "Additional properties (key-value pairs)" },
        },
        required: ["type", "label"],
      },
    },
    {
      name: "graph_connect",
      description: "Create an edge between two nodes. Use node IDs (from graph_search or graph_add results).",
      inputSchema: {
        type: "object" as const,
        properties: {
          source: { type: "string", description: "Source node ID" },
          target: { type: "string", description: "Target node ID" },
          type: { type: "string", enum: EDGE_TYPES, description: "Relationship type" },
          weight: { type: "number", description: "Edge weight 0-2 (default: 1.0)" },
          properties: { type: "object", description: "Additional edge properties" },
        },
        required: ["source", "target", "type"],
      },
    },
    {
      name: "graph_neighbors",
      description: "Get all nodes connected to a given node, optionally filtered by edge type and traversal depth.",
      inputSchema: {
        type: "object" as const,
        properties: {
          node_id: { type: "string", description: "Node ID to find neighbors of" },
          edge_type: { type: "string", enum: EDGE_TYPES, description: "Filter by edge type (optional)" },
          depth: { type: "number", description: "Traversal depth (default: 1, max: 3)" },
        },
        required: ["node_id"],
      },
    },
    {
      name: "graph_path",
      description: "Find the shortest path between two nodes in the graph.",
      inputSchema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Start node ID" },
          to: { type: "string", description: "End node ID" },
        },
        required: ["from", "to"],
      },
    },
    {
      name: "graph_visualize",
      description: "Generate a Mermaid diagram of the graph or a subgraph around specific nodes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          node_ids: {
            type: "array",
            items: { type: "string" },
            description: "Focus on these nodes + their neighbors (optional, shows full graph if omitted)",
          },
          max_nodes: { type: "number", description: "Max nodes to include (default: 30)" },
        },
      },
    },
    {
      name: "graph_status",
      description: "Get knowledge graph statistics: node/edge counts, types, most connected nodes.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "graph_remove",
      description: "Remove a node (and its edges) or a specific edge from the graph.",
      inputSchema: {
        type: "object" as const,
        properties: {
          node_id: { type: "string", description: "Node ID to remove (removes connected edges too)" },
          edge_id: { type: "string", description: "Edge ID to remove" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, unknown>;
  const graph = loadGraph();

  switch (name) {
    // ─── graph_search ───
    case "graph_search": {
      const query = (a.query as string).toLowerCase();
      const type = a.type as NodeType | undefined;
      const limit = (a.limit as number) || 10;
      const terms = query.split(/\s+/).filter(Boolean);

      const scored = graph.nodes
        .filter((n) => !type || n.type === type)
        .map((node) => {
          let score = 0;
          for (const term of terms) {
            if (node.label.toLowerCase() === term) score += 3;
            else if (node.label.toLowerCase().includes(term)) score += 1.5;
          }
          for (const val of Object.values(node.properties)) {
            for (const term of terms) {
              if (String(val).toLowerCase().includes(term)) score += 0.5;
            }
          }
          const connections = graph.edges.filter(
            (e) => e.source === node.id || e.target === node.id
          ).length;
          score += connections * 0.1;
          return { node, score, connections };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (scored.length === 0) {
        return { content: [{ type: "text", text: "No matching nodes found." }] };
      }

      const formatted = scored
        .map(
          (r) =>
            `**${r.node.label}** [${r.node.type}] (id: ${r.node.id}, connections: ${r.connections}, score: ${r.score.toFixed(1)})` +
            (Object.keys(r.node.properties).length > 0
              ? `\n  Properties: ${JSON.stringify(r.node.properties)}`
              : "")
        )
        .join("\n");
      return { content: [{ type: "text", text: formatted }] };
    }

    // ─── graph_add ───
    case "graph_add": {
      const nodeType = a.type as NodeType;
      const label = a.label as string;
      const props = (a.properties || {}) as Record<string, string | number | boolean>;

      // Deduplicate
      const existing = graph.nodes.find(
        (n) => n.type === nodeType && n.label.toLowerCase() === label.toLowerCase()
      );

      if (existing) {
        existing.properties = { ...existing.properties, ...props };
        existing.updatedAt = new Date().toISOString();
        saveGraph(graph);
        return {
          content: [
            {
              type: "text",
              text: `Updated existing node: **${existing.label}** [${existing.type}] (id: ${existing.id})`,
            },
          ],
        };
      }

      const node: GraphNode = {
        id: genId(),
        type: nodeType,
        label,
        properties: props,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      graph.nodes.push(node);
      saveGraph(graph);

      return {
        content: [
          {
            type: "text",
            text: `Added node: **${node.label}** [${node.type}] (id: ${node.id})`,
          },
        ],
      };
    }

    // ─── graph_connect ───
    case "graph_connect": {
      const sourceId = a.source as string;
      const targetId = a.target as string;
      const edgeType = a.type as EdgeType;
      const weight = (a.weight as number) || 1.0;
      const props = (a.properties || {}) as Record<string, string | number | boolean>;

      if (!graph.nodes.find((n) => n.id === sourceId)) {
        return { content: [{ type: "text", text: `Source node ${sourceId} not found.` }] };
      }
      if (!graph.nodes.find((n) => n.id === targetId)) {
        return { content: [{ type: "text", text: `Target node ${targetId} not found.` }] };
      }

      // Check for existing edge
      const existing = graph.edges.find(
        (e) => e.source === sourceId && e.target === targetId && e.type === edgeType
      );
      if (existing) {
        existing.weight = Math.min(existing.weight + 0.1, 2.0);
        existing.properties = { ...existing.properties, ...props };
        saveGraph(graph);
        return {
          content: [
            {
              type: "text",
              text: `Strengthened existing edge (${edgeType}, weight: ${existing.weight.toFixed(1)})`,
            },
          ],
        };
      }

      const edge: GraphEdge = {
        id: genId(),
        source: sourceId,
        target: targetId,
        type: edgeType,
        weight,
        properties: props,
        createdAt: new Date().toISOString(),
      };
      graph.edges.push(edge);
      saveGraph(graph);

      const srcLabel = graph.nodes.find((n) => n.id === sourceId)?.label || sourceId;
      const tgtLabel = graph.nodes.find((n) => n.id === targetId)?.label || targetId;
      return {
        content: [
          {
            type: "text",
            text: `Connected: **${srcLabel}** —[${edgeType}]→ **${tgtLabel}** (edge id: ${edge.id})`,
          },
        ],
      };
    }

    // ─── graph_neighbors ───
    case "graph_neighbors": {
      const nodeId = a.node_id as string;
      const edgeType = a.edge_type as EdgeType | undefined;
      const depth = Math.min((a.depth as number) || 1, 3);

      const startNode = graph.nodes.find((n) => n.id === nodeId);
      if (!startNode) {
        return { content: [{ type: "text", text: `Node ${nodeId} not found.` }] };
      }

      const visited = new Set<string>();
      const result: Array<{ node: GraphNode; depth: number; via: string }> = [];

      function traverse(id: string, d: number) {
        if (d > depth || visited.has(id)) return;
        visited.add(id);
        for (const edge of graph.edges) {
          let neighborId: string | null = null;
          if (edge.source === id) neighborId = edge.target;
          else if (edge.target === id) neighborId = edge.source;
          if (!neighborId || visited.has(neighborId)) continue;
          if (edgeType && edge.type !== edgeType) continue;
          const node = graph.nodes.find((n) => n.id === neighborId);
          if (node) {
            result.push({ node, depth: d + 1, via: edge.type });
            traverse(neighborId!, d + 1);
          }
        }
      }

      traverse(nodeId, 0);

      if (result.length === 0) {
        return { content: [{ type: "text", text: `No neighbors found for **${startNode.label}**.` }] };
      }

      const formatted = result
        .map(
          (r) =>
            `${"  ".repeat(r.depth - 1)}→ **${r.node.label}** [${r.node.type}] (via: ${r.via}, id: ${r.node.id})`
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Neighbors of **${startNode.label}** (depth ${depth}):\n${formatted}`,
          },
        ],
      };
    }

    // ─── graph_path ───
    case "graph_path": {
      const fromId = a.from as string;
      const toId = a.to as string;

      const fromNode = graph.nodes.find((n) => n.id === fromId);
      const toNode = graph.nodes.find((n) => n.id === toId);
      if (!fromNode) return { content: [{ type: "text", text: `Node ${fromId} not found.` }] };
      if (!toNode) return { content: [{ type: "text", text: `Node ${toId} not found.` }] };

      // BFS
      const visited = new Set<string>();
      const queue: Array<{ id: string; path: string[] }> = [
        { id: fromId, path: [fromId] },
      ];
      let found: string[] | null = null;

      while (queue.length > 0 && !found) {
        const { id, path } = queue.shift()!;
        if (id === toId) { found = path; break; }
        if (path.length > 6 || visited.has(id)) continue;
        visited.add(id);
        for (const edge of graph.edges) {
          let nId: string | null = null;
          if (edge.source === id) nId = edge.target;
          else if (edge.target === id) nId = edge.source;
          if (nId && !visited.has(nId)) {
            queue.push({ id: nId, path: [...path, nId] });
          }
        }
      }

      if (!found) {
        return {
          content: [
            {
              type: "text",
              text: `No path found between **${fromNode.label}** and **${toNode.label}**.`,
            },
          ],
        };
      }

      const pathNodes = found
        .map((id) => graph.nodes.find((n) => n.id === id))
        .filter(Boolean) as GraphNode[];
      const formatted = pathNodes
        .map((n, i) => `${i + 1}. **${n.label}** [${n.type}]`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Path (${pathNodes.length} nodes):\n${formatted}`,
          },
        ],
      };
    }

    // ─── graph_visualize ───
    case "graph_visualize": {
      const nodeIds = a.node_ids as string[] | undefined;
      const maxNodes = (a.max_nodes as number) || 30;

      let nodes = graph.nodes;
      let edges = graph.edges;

      if (nodeIds && nodeIds.length > 0) {
        const ids = new Set(nodeIds);
        for (const edge of graph.edges) {
          if (ids.has(edge.source)) ids.add(edge.target);
          if (ids.has(edge.target)) ids.add(edge.source);
        }
        nodes = graph.nodes.filter((n) => ids.has(n.id));
        edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      }

      if (nodes.length > maxNodes) {
        nodes = nodes.slice(0, maxNodes);
        const nIds = new Set(nodes.map((n) => n.id));
        edges = edges.filter((e) => nIds.has(e.source) && nIds.has(e.target));
      }

      if (nodes.length === 0) {
        return { content: [{ type: "text", text: "Graph is empty. Add some nodes first." }] };
      }

      const typeShapes: Record<string, [string, string]> = {
        person: ["((", "))"], topic: ["{{", "}}"], project: ["[/", "/]"],
        note: ["[", "]"], task: ["([", "])"], goal: [">", "]"],
        session: ["[[", "]]"], pattern: ["(", ")"],
      };

      const lines: string[] = ["graph LR"];
      for (const node of nodes) {
        const [open, close] = typeShapes[node.type] || ["[", "]"];
        lines.push(`  ${node.id}${open}"${node.label.replace(/"/g, "'")}"${close}`);
      }
      for (const edge of edges) {
        lines.push(`  ${edge.source} -->|${edge.type.replace(/-/g, " ")}| ${edge.target}`);
      }

      return {
        content: [
          {
            type: "text",
            text: "```mermaid\n" + lines.join("\n") + "\n```",
          },
        ],
      };
    }

    // ─── graph_status ───
    case "graph_status": {
      const nodesByType: Record<string, number> = {};
      const edgesByType: Record<string, number> = {};
      for (const n of graph.nodes) nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
      for (const e of graph.edges) edgesByType[e.type] = (edgesByType[e.type] || 0) + 1;

      const connCounts = new Map<string, number>();
      for (const e of graph.edges) {
        connCounts.set(e.source, (connCounts.get(e.source) || 0) + 1);
        connCounts.set(e.target, (connCounts.get(e.target) || 0) + 1);
      }
      const mostConnected = graph.nodes
        .map((n) => ({ label: n.label, type: n.type, connections: connCounts.get(n.id) || 0 }))
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 5);

      const status = {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        version: graph.version,
        lastModified: graph.lastModified,
        nodesByType,
        edgesByType,
        mostConnected,
      };
      return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
    }

    // ─── graph_remove ───
    case "graph_remove": {
      const nodeId = a.node_id as string | undefined;
      const edgeId = a.edge_id as string | undefined;

      if (nodeId) {
        const idx = graph.nodes.findIndex((n) => n.id === nodeId);
        if (idx === -1) return { content: [{ type: "text", text: `Node ${nodeId} not found.` }] };
        const removed = graph.nodes[idx];
        graph.nodes.splice(idx, 1);
        const edgesBefore = graph.edges.length;
        graph.edges = graph.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
        const edgesRemoved = edgesBefore - graph.edges.length;
        saveGraph(graph);
        return {
          content: [
            {
              type: "text",
              text: `Removed node **${removed.label}** [${removed.type}] and ${edgesRemoved} connected edges.`,
            },
          ],
        };
      }

      if (edgeId) {
        const idx = graph.edges.findIndex((e) => e.id === edgeId);
        if (idx === -1) return { content: [{ type: "text", text: `Edge ${edgeId} not found.` }] };
        graph.edges.splice(idx, 1);
        saveGraph(graph);
        return { content: [{ type: "text", text: `Removed edge ${edgeId}.` }] };
      }

      return { content: [{ type: "text", text: "Provide either node_id or edge_id to remove." }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
