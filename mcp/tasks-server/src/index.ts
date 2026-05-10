#!/usr/bin/env bun
/**
 * Digital Seed Tasks Server — MCP server for task management.
 *
 * Tools:
 *   - tasks_list: List all tasks (with optional status filter)
 *   - tasks_add: Add a new task
 *   - tasks_complete: Mark a task as done
 *   - tasks_update: Update a task's details
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
const DATA_DIR = join(ROOT, "data");
const TASKS_FILE = join(DATA_DIR, "tasks.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "high" | "medium" | "low";
  created: string;
  completed?: string;
  tags?: string[];
}

function loadTasks(): Task[] {
  if (!existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TASKS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

function generateId(): string {
  return `t-${Date.now().toString(36)}`;
}

// ─── Server ───

const server = new Server(
  { name: "seed-tasks", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "tasks_list",
      description: "List tasks. Optionally filter by status (todo, in-progress, done) or priority.",
      inputSchema: {
        type: "object" as const,
        properties: {
          status: { type: "string", enum: ["todo", "in-progress", "done", "all"], description: "Filter by status (default: all)" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Filter by priority" },
        },
      },
    },
    {
      name: "tasks_add",
      description: "Add a new task",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority (default: medium)" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
        },
        required: ["title"],
      },
    },
    {
      name: "tasks_complete",
      description: "Mark a task as done",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Task ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "tasks_update",
      description: "Update a task",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Task ID" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          status: { type: "string", enum: ["todo", "in-progress", "done"] },
        },
        required: ["id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, unknown>;

  switch (name) {
    case "tasks_list": {
      let tasks = loadTasks();
      if (a.status && a.status !== "all") tasks = tasks.filter((t) => t.status === a.status);
      if (a.priority) tasks = tasks.filter((t) => t.priority === a.priority);
      const summary = tasks.length === 0
        ? "No tasks found."
        : tasks.map((t) => `[${t.id}] ${t.status === "done" ? "✅" : t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢"} ${t.title} (${t.status})`).join("\n");
      return { content: [{ type: "text", text: summary }] };
    }
    case "tasks_add": {
      const tasks = loadTasks();
      const task: Task = {
        id: generateId(),
        title: a.title as string,
        description: a.description as string | undefined,
        status: "todo",
        priority: (a.priority as Task["priority"]) || "medium",
        created: new Date().toISOString(),
        tags: a.tags as string[] | undefined,
      };
      tasks.push(task);
      saveTasks(tasks);
      return { content: [{ type: "text", text: `Task added: [${task.id}] ${task.title}` }] };
    }
    case "tasks_complete": {
      const tasks = loadTasks();
      const task = tasks.find((t) => t.id === a.id);
      if (!task) return { content: [{ type: "text", text: `Task ${a.id} not found` }] };
      task.status = "done";
      task.completed = new Date().toISOString();
      saveTasks(tasks);
      return { content: [{ type: "text", text: `✅ Completed: ${task.title}` }] };
    }
    case "tasks_update": {
      const tasks = loadTasks();
      const task = tasks.find((t) => t.id === a.id);
      if (!task) return { content: [{ type: "text", text: `Task ${a.id} not found` }] };
      if (a.title) task.title = a.title as string;
      if (a.description) task.description = a.description as string;
      if (a.priority) task.priority = a.priority as Task["priority"];
      if (a.status) task.status = a.status as Task["status"];
      saveTasks(tasks);
      return { content: [{ type: "text", text: `Updated: [${task.id}] ${task.title}` }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
