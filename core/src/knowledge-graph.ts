/**
 * DAI Knowledge Graph — Connects people, topics, projects, notes, tasks, goals, and sessions
 * into a queryable graph. File-based storage (data/graph.json).
 *
 * Node types: person, topic, project, note, task, goal, session, pattern
 * Edge types: related-to, depends-on, mentioned-in, created-by, links-to, tagged-with, part-of
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ─── Types ──────────────────────────────────────────────────────────

export type NodeType =
  | "person"
  | "topic"
  | "project"
  | "note"
  | "task"
  | "goal"
  | "session"
  | "pattern";

export type EdgeType =
  | "related-to"
  | "depends-on"
  | "mentioned-in"
  | "created-by"
  | "links-to"
  | "tagged-with"
  | "part-of";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastModified: string;
  version: number;
}

// ─── Storage ────────────────────────────────────────────────────────

function graphPath(root: string): string {
  return join(root, "data", "graph.json");
}

export function loadGraph(root: string): KnowledgeGraph {
  const p = graphPath(root);
  if (!existsSync(p)) {
    return { nodes: [], edges: [], lastModified: new Date().toISOString(), version: 1 };
  }
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return { nodes: [], edges: [], lastModified: new Date().toISOString(), version: 1 };
  }
}

export function saveGraph(root: string, graph: KnowledgeGraph): void {
  const p = graphPath(root);
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  graph.lastModified = new Date().toISOString();
  graph.version++;
  writeFileSync(p, JSON.stringify(graph, null, 2), "utf-8");
}

// ─── Node Operations ────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function addNode(
  graph: KnowledgeGraph,
  type: NodeType,
  label: string,
  properties: Record<string, string | number | boolean> = {}
): GraphNode {
  // Check for duplicate (same type + label)
  const existing = graph.nodes.find(
    (n) => n.type === type && n.label.toLowerCase() === label.toLowerCase()
  );
  if (existing) {
    // Merge properties
    existing.properties = { ...existing.properties, ...properties };
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const node: GraphNode = {
    id: generateId(),
    type,
    label,
    properties,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  graph.nodes.push(node);
  return node;
}

export function updateNode(
  graph: KnowledgeGraph,
  nodeId: string,
  updates: { label?: string; properties?: Record<string, string | number | boolean> }
): GraphNode | null {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  if (updates.label) node.label = updates.label;
  if (updates.properties) node.properties = { ...node.properties, ...updates.properties };
  node.updatedAt = new Date().toISOString();
  return node;
}

export function removeNode(graph: KnowledgeGraph, nodeId: string): boolean {
  const idx = graph.nodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return false;
  graph.nodes.splice(idx, 1);
  // Remove connected edges
  graph.edges = graph.edges.filter(
    (e) => e.source !== nodeId && e.target !== nodeId
  );
  return true;
}

export function findNode(
  graph: KnowledgeGraph,
  query: string,
  type?: NodeType
): GraphNode[] {
  const lower = query.toLowerCase();
  return graph.nodes.filter((n) => {
    if (type && n.type !== type) return false;
    if (n.label.toLowerCase().includes(lower)) return true;
    // Search properties
    for (const val of Object.values(n.properties)) {
      if (String(val).toLowerCase().includes(lower)) return true;
    }
    return false;
  });
}

// ─── Edge Operations ────────────────────────────────────────────────

export function addEdge(
  graph: KnowledgeGraph,
  sourceId: string,
  targetId: string,
  type: EdgeType,
  weight: number = 1.0,
  properties: Record<string, string | number | boolean> = {}
): GraphEdge | null {
  // Verify both nodes exist
  if (!graph.nodes.find((n) => n.id === sourceId)) return null;
  if (!graph.nodes.find((n) => n.id === targetId)) return null;

  // Check for duplicate edge
  const existing = graph.edges.find(
    (e) => e.source === sourceId && e.target === targetId && e.type === type
  );
  if (existing) {
    existing.weight = Math.min(existing.weight + 0.1, 2.0); // Strengthen on repeat
    existing.properties = { ...existing.properties, ...properties };
    return existing;
  }

  const edge: GraphEdge = {
    id: generateId(),
    source: sourceId,
    target: targetId,
    type,
    weight,
    properties,
    createdAt: new Date().toISOString(),
  };
  graph.edges.push(edge);
  return edge;
}

export function removeEdge(graph: KnowledgeGraph, edgeId: string): boolean {
  const idx = graph.edges.findIndex((e) => e.id === edgeId);
  if (idx === -1) return false;
  graph.edges.splice(idx, 1);
  return true;
}

// ─── Graph Queries ──────────────────────────────────────────────────

export function getNeighbors(
  graph: KnowledgeGraph,
  nodeId: string,
  edgeType?: EdgeType,
  depth: number = 1
): GraphNode[] {
  const visited = new Set<string>();
  const result: GraphNode[] = [];

  function traverse(id: string, currentDepth: number) {
    if (currentDepth > depth || visited.has(id)) return;
    visited.add(id);

    for (const edge of graph.edges) {
      let neighborId: string | null = null;
      if (edge.source === id) neighborId = edge.target;
      else if (edge.target === id) neighborId = edge.source;

      if (!neighborId || visited.has(neighborId)) continue;
      if (edgeType && edge.type !== edgeType) continue;

      const node = graph.nodes.find((n) => n.id === neighborId);
      if (node) {
        result.push(node);
        traverse(neighborId, currentDepth + 1);
      }
    }
  }

  traverse(nodeId, 0);
  return result;
}

export function findPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string,
  maxDepth: number = 5
): GraphNode[] | null {
  // BFS shortest path
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [
    { id: fromId, path: [fromId] },
  ];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (id === toId) {
      return path
        .map((pid) => graph.nodes.find((n) => n.id === pid))
        .filter(Boolean) as GraphNode[];
    }
    if (path.length > maxDepth || visited.has(id)) continue;
    visited.add(id);

    for (const edge of graph.edges) {
      let neighborId: string | null = null;
      if (edge.source === id) neighborId = edge.target;
      else if (edge.target === id) neighborId = edge.source;
      if (neighborId && !visited.has(neighborId)) {
        queue.push({ id: neighborId, path: [...path, neighborId] });
      }
    }
  }
  return null;
}

// ─── Graph Search (text-based) ──────────────────────────────────────

export function graphSearch(
  graph: KnowledgeGraph,
  query: string,
  options: { type?: NodeType; limit?: number } = {}
): Array<{ node: GraphNode; score: number; connections: number }> {
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/).filter(Boolean);
  const limit = options.limit || 10;

  const scored = graph.nodes
    .filter((n) => !options.type || n.type === options.type)
    .map((node) => {
      let score = 0;

      // Label match
      for (const term of terms) {
        if (node.label.toLowerCase() === term) score += 3;
        else if (node.label.toLowerCase().includes(term)) score += 1.5;
      }

      // Property match
      for (const val of Object.values(node.properties)) {
        const sv = String(val).toLowerCase();
        for (const term of terms) {
          if (sv.includes(term)) score += 0.5;
        }
      }

      // Connection count (more connected = more relevant)
      const connections = graph.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      ).length;
      score += connections * 0.1;

      return { node, score, connections };
    })
    .filter((r) => r.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ─── Visualization (Mermaid) ────────────────────────────────────────

export function toMermaid(
  graph: KnowledgeGraph,
  options: { nodeIds?: string[]; maxNodes?: number } = {}
): string {
  const maxNodes = options.maxNodes || 30;
  let nodes = graph.nodes;
  let edges = graph.edges;

  // Filter to specific nodes + their neighbors
  if (options.nodeIds && options.nodeIds.length > 0) {
    const ids = new Set(options.nodeIds);
    // Include neighbors
    for (const edge of graph.edges) {
      if (ids.has(edge.source)) ids.add(edge.target);
      if (ids.has(edge.target)) ids.add(edge.source);
    }
    nodes = graph.nodes.filter((n) => ids.has(n.id));
    edges = graph.edges.filter(
      (e) => ids.has(e.source) && ids.has(e.target)
    );
  }

  // Limit nodes
  if (nodes.length > maxNodes) {
    nodes = nodes.slice(0, maxNodes);
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  }

  const typeShapes: Record<NodeType, [string, string]> = {
    person: ["((", "))"],
    topic: ["{{", "}}"],
    project: ["[/", "/]"],
    note: ["[", "]"],
    task: ["([", "])"],
    goal: [">", "]"],
    session: ["[[", "]]"],
    pattern: ["(", ")"],
  };

  const lines: string[] = ["graph LR"];

  for (const node of nodes) {
    const [open, close] = typeShapes[node.type] || ["[", "]"];
    const safeLabel = node.label.replace(/"/g, "'");
    lines.push(`  ${node.id}${open}"${safeLabel}"${close}`);
  }

  for (const edge of edges) {
    const label = edge.type.replace(/-/g, " ");
    lines.push(`  ${edge.source} -->|${label}| ${edge.target}`);
  }

  return lines.join("\n");
}

// ─── Auto-extraction Helpers ────────────────────────────────────────

export function extractEntitiesFromText(
  text: string
): Array<{ label: string; type: NodeType }> {
  const entities: Array<{ label: string; type: NodeType }> = [];

  // Simple heuristic extraction
  // @mentions → person
  const mentions = text.match(/@(\w+)/g);
  if (mentions) {
    for (const m of mentions) {
      entities.push({ label: m.slice(1), type: "person" });
    }
  }

  // #tags → topic
  const tags = text.match(/#(\w[\w-]*)/g);
  if (tags) {
    for (const t of tags) {
      entities.push({ label: t.slice(1), type: "topic" });
    }
  }

  // [[wiki links]] → note
  const wikiLinks = text.match(/\[\[([^\]]+)\]\]/g);
  if (wikiLinks) {
    for (const w of wikiLinks) {
      entities.push({ label: w.slice(2, -2), type: "note" });
    }
  }

  return entities;
}

// ─── Stats ──────────────────────────────────────────────────────────

export function graphStats(graph: KnowledgeGraph): {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  mostConnected: Array<{ label: string; type: NodeType; connections: number }>;
} {
  const nodesByType: Record<string, number> = {};
  const edgesByType: Record<string, number> = {};

  for (const n of graph.nodes) {
    nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
  }
  for (const e of graph.edges) {
    edgesByType[e.type] = (edgesByType[e.type] || 0) + 1;
  }

  // Most connected nodes
  const connectionCounts = new Map<string, number>();
  for (const e of graph.edges) {
    connectionCounts.set(e.source, (connectionCounts.get(e.source) || 0) + 1);
    connectionCounts.set(e.target, (connectionCounts.get(e.target) || 0) + 1);
  }

  const mostConnected = graph.nodes
    .map((n) => ({
      label: n.label,
      type: n.type,
      connections: connectionCounts.get(n.id) || 0,
    }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    nodesByType,
    edgesByType,
    mostConnected,
  };
}
