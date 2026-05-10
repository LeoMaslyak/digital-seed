#!/usr/bin/env bun
/**
 * Seed the knowledge graph with initial user data from setup wizard.
 *
 * Usage:
 *   bun run scripts/seed-graph.ts --name "Name" --goal "Goal" --vision "Vision" --current "Current" --packs "a,b,c"
 */

import { join, dirname } from "path";
import { loadGraph, saveGraph, addNode, addEdge } from "../core/src/knowledge-graph.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

const opts = parseArgs();
const { name, goal, vision, current, packs } = opts;

if (!name) {
  console.error("Usage: seed-graph.ts --name <name> [--goal <goal>] [--vision <vision>] [--current <current>] [--packs <csv>]");
  process.exit(1);
}

const graph = loadGraph(ROOT);
const added: string[] = [];

// Person node
const personNode = addNode(graph, "person", name, { source: "setup-wizard" });
added.push(`person: ${name}`);

// Goal node (combines goal + vision)
if (goal || vision) {
  const goalLabel = goal || "Unnamed goal";
  const goalNode = addNode(graph, "goal", goalLabel, {
    ...(vision ? { vision } : {}),
    source: "setup-wizard",
  });
  added.push(`goal: ${goalLabel}`);
  addEdge(graph, personNode.id, goalNode.id, "related-to");
}

// Topic nodes from current (split on spaces)
if (current) {
  const words = current.split(/\s+/).filter((w) => w.length > 1);
  for (const word of words) {
    const topicNode = addNode(graph, "topic", word, { source: "setup-current" });
    added.push(`topic: ${word}`);
    addEdge(graph, personNode.id, topicNode.id, "related-to");
  }
}

// Topic nodes from packs
if (packs) {
  const packNames = packs.split(",").map((p) => p.trim()).filter(Boolean);
  for (const pack of packNames) {
    const topicNode = addNode(graph, "topic", pack, { source: "setup-pack" });
    added.push(`topic: ${pack}`);
    addEdge(graph, personNode.id, topicNode.id, "related-to");
  }
}

saveGraph(ROOT, graph);

console.log(`✅ Knowledge graph seeded with ${added.length} nodes:`);
for (const item of added) {
  console.log(`   • ${item}`);
}
console.log(`   Graph saved to data/graph.json (v${graph.version})`);
