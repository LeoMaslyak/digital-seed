/**
 * DAI Dashboard — Local server for the DAI Cockpit.
 * Serves the static dashboard and live API endpoints for tasks, tokens, and health.
 *
 * Run with:  bun run dev
 * Then open: http://localhost:3000
 */

import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname, extname } from "path";

const ROOT         = process.env.DIGITAL_SEED_ROOT || join(dirname(new URL(import.meta.url).pathname), "../..");
const DASHBOARD    = join(dirname(new URL(import.meta.url).pathname), "..");
const PORT         = parseInt(process.env.DAI_DASHBOARD_PORT || "3000");

// ── Data loaders ─────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created: string;
  completed?: string;
}

function loadTasks(): Task[] {
  const file = join(ROOT, "data", "tasks.json");
  if (!existsSync(file)) return [];
  try { return JSON.parse(readFileSync(file, "utf-8")); } catch { return []; }
}

function loadTokenUsage() {
  const file = join(ROOT, "data", "token-usage.json");
  if (!existsSync(file)) return { total: 0, byProvider: {}, estimatedCost: 0 };
  try { return JSON.parse(readFileSync(file, "utf-8")); } catch { return { total: 0, estimatedCost: 0 }; }
}

function loadGoals(): string {
  const file = join(ROOT, "user", "GOALS.md");
  if (!existsSync(file)) return "No goals set yet.";
  return readFileSync(file, "utf-8");
}

// Rough check for whether a data file was modified in the last N minutes
function freshWithinMinutes(path: string, minutes: number): boolean {
  if (!existsSync(path)) return false;
  const age = (Date.now() - statSync(path).mtimeMs) / 60000;
  return age < minutes;
}

// ── Static file server ───────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jsx":  "text/javascript; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

function serveStatic(pathname: string): Response | null {
  // Normalise: / → /index.html
  const rel = pathname === "/" ? "/index.html" : pathname;

  // Only allow files within the dashboard directory
  const filePath = join(DASHBOARD, rel.replace(/^\//, ""));
  if (!filePath.startsWith(DASHBOARD)) return null;
  if (!existsSync(filePath)) return null;

  const ext  = extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? "text/plain; charset=utf-8";
  return new Response(readFileSync(filePath), { headers: { "Content-Type": mime } });
}

// ── Request handler ──────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,

  fetch(req) {
    const url = new URL(req.url);

    // ── API routes ─────────────────────────────────────────────────────────

    if (url.pathname === "/api/tasks") {
      return Response.json(loadTasks());
    }

    if (url.pathname === "/api/tokens") {
      const raw = loadTokenUsage();
      // Compute a rough weekly estimate (last 7 days worth from total)
      const weeklyTokens = Math.round((raw.total || 0) * 0.25);
      return Response.json({ ...raw, weeklyTokens });
    }

    if (url.pathname === "/api/goals") {
      return new Response(loadGoals(), { headers: { "Content-Type": "text/plain" } });
    }

    if (url.pathname === "/api/health") {
      const memoryFile  = join(ROOT, "data", "tasks.json");
      const ragFile     = join(ROOT, "data", "rag-index.json");
      const knowledge baseMeta = join(ROOT, "data", "knowledge base-meta.json");

      let ragDocs = 0;
      if (existsSync(ragFile)) {
        try { ragDocs = JSON.parse(readFileSync(ragFile, "utf-8")).count ?? 0; } catch {}
      }

      let knowledge baseSyncAge = "—";
      if (existsSync(knowledge baseMeta)) {
        try {
          const meta = JSON.parse(readFileSync(knowledge baseMeta, "utf-8"));
          if (meta.lastSync) {
            const ageMin = Math.round((Date.now() - new Date(meta.lastSync).getTime()) / 60000);
            knowledge baseSyncAge = ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`;
          }
        } catch {}
      }

      return Response.json({
        status:         "ok",
        timestamp:      Date.now(),
        claudeVersion:  process.env.CLAUDE_VERSION || "v1.x",
        memory:         existsSync(memoryFile),
        rag:            existsSync(ragFile),
        ragDocs,
        knowledge base:        existsSync(knowledge baseMeta) && freshWithinMinutes(knowledge baseMeta, 720),
        knowledge baseSyncAge: knowledge baseSyncAge !== "—" ? knowledge baseSyncAge : "Not synced",
      });
    }

    // ── Static files (dashboard UI) ────────────────────────────────────────

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    return new Response("Not found", { status: 404 });
  },
});

console.log(`\n  ⚡ DAI Cockpit  →  http://localhost:${server.port}\n`);
