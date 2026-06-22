#!/usr/bin/env bun
/**
 * Digital Seed Health Check — Quick system status overview.
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

const checks: { name: string; status: "ok" | "warn" | "fail"; detail: string }[] = [];

function check(name: string, fn: () => { ok: boolean; detail: string }) {
  try {
    const result = fn();
    checks.push({ name, status: result.ok ? "ok" : "warn", detail: result.detail });
  } catch (e) {
    checks.push({ name, status: "fail", detail: String(e) });
  }
}

// Async checks resolve into `checks` and are awaited before printing. A check
// that resolves to `null` is a no-op (the check doesn't apply on this machine).
const pendingChecks: Promise<void>[] = [];
function asyncCheck(
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string } | null>
) {
  pendingChecks.push(
    fn()
      .then((result) => {
        if (result) {
          checks.push({ name, status: result.ok ? "ok" : "warn", detail: result.detail });
        }
      })
      .catch((e) => {
        checks.push({ name, status: "fail", detail: String(e) });
      })
  );
}

// Check user context files
check("User context", () => {
  const starterFiles = [
    "COMPASS.md",
    "DOMAINS.md",
    "ANTI-GOALS.md",
    "USER.md",
    "GOALS.md",
    "MEMORY.md",
    "PREFERENCES.md",
  ];
  const existing = starterFiles.filter((f) => existsSync(join(ROOT, "user", f)));
  const coreFiles = ["COMPASS.md", "USER.md", "GOALS.md", "PREFERENCES.md"];
  const corePresent = coreFiles.filter((f) => existsSync(join(ROOT, "user", f)));
  return {
    ok: corePresent.length >= 3,
    detail: `${existing.length}/${starterFiles.length} context files present (${corePresent.length}/${coreFiles.length} core)` ,
  };
});

// Check AI agent CLI
check("AI agent", () => {
  const { spawnSync: sp } = require("child_process");
  const agents = [
    { name: "claude", label: "Claude Code" },
    { name: "codex", label: "Codex CLI" },
    { name: "gemini", label: "Gemini CLI" },
    { name: "cursor", label: "Cursor" },
    { name: "windsurf", label: "Windsurf" },
    { name: "ollama", label: "Ollama (local)" },
  ];
  const found = agents.filter((a) => sp("which", [a.name], { stdio: "pipe" }).status === 0);
  if (found.length > 0) {
    return { ok: true, detail: found.map((a) => a.label).join(", ") + " found" };
  }
  return {
    ok: false,
    detail:
      "No terminal-capable AI agent found (claude, codex, gemini, cursor, windsurf, ollama). " +
      "You need one to use Digital Seed. " +
      "Agent comparison: docs/agent-chooser.md · Claude Code guide: docs/install-claude-code.md",
  };
});

// Check AI provider
check("AI provider", () => {
  const envFile = join(ROOT, ".env");
  const content = existsSync(envFile) ? readFileSync(envFile, "utf-8") : "";

  // Check for claude CLI
  const { spawnSync } = require("child_process");
  const claudeFound = spawnSync("which", ["claude"], { stdio: "pipe" }).status === 0;

  // Parse AI_PROVIDER from .env
  const providerMatch = content.match(/^AI_PROVIDER=(.+)$/m);
  const provider = providerMatch?.[1]?.trim();

  // 1. Claude CLI present + (subscription in .env or no .env)
  if (claudeFound && (provider === "claude-subscription" || !existsSync(envFile))) {
    return { ok: true, detail: "Claude subscription (CLI)" };
  }
  // 2. Subscription providers
  if (provider === "claude-subscription") return { ok: true, detail: "Claude subscription" };
  if (provider === "chatgpt-subscription") return { ok: true, detail: "ChatGPT subscription" };
  if (provider === "gemini-subscription") return { ok: true, detail: "Gemini subscription" };
  // 3. API keys
  const apiKeys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY"];
  const hasKey = apiKeys.some((k) => content.includes(k));
  if (hasKey) return { ok: true, detail: "API key configured" };
  // 4. Ollama
  if (content.includes("OLLAMA_ENABLED")) return { ok: true, detail: "Ollama (local)" };
  // 5. Claude CLI present but no .env config
  if (claudeFound) return { ok: true, detail: "Claude subscription (CLI)" };

  return { ok: false, detail: "Not configured — run ./setup.sh" };
});

// Check the local Ollama embedding model when Ollama is the embeddings provider.
// Ollama can be installed and running while the model itself was never pulled,
// which silently degrades semantic search to keyword-only with no signal.
asyncCheck("Ollama embedding model", async () => {
  // Determine the embeddings provider + model the same way scripts/embed.ts does.
  let provider = process.env.OPENAI_API_KEY ? "openai" : "ollama";
  let model = process.env.OPENAI_API_KEY ? "text-embedding-3-small" : "nomic-embed-text";
  const cfgPath = join(ROOT, "config", "embeddings.yaml");
  if (existsSync(cfgPath)) {
    try {
      const yaml = require("js-yaml");
      const raw = yaml.load(readFileSync(cfgPath, "utf-8")) as any;
      if (raw?.provider) provider = String(raw.provider);
      if (raw?.model) model = String(raw.model);
    } catch {
      // fall back to defaults
    }
  }

  // Only relevant when Ollama provides embeddings.
  if (provider !== "ollama") return null;

  // Query Ollama's tag list; gracefully skip if it isn't reachable.
  let tags: any;
  try {
    const resp = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(1500),
    });
    if (!resp.ok) return null;
    tags = await resp.json();
  } catch {
    // Ollama not running / not installed — leave it to the AI provider check.
    return null;
  }

  // Model names in /api/tags may carry a tag suffix (e.g. "nomic-embed-text:latest").
  const installed: string[] = Array.isArray(tags?.models)
    ? tags.models.map((m: any) => String(m?.name ?? ""))
    : [];
  const base = model.split(":")[0];
  const hasModel = installed.some((n) => n === model || n.split(":")[0] === base);

  if (hasModel) {
    return { ok: true, detail: `${model} pulled` };
  }
  return {
    ok: false,
    detail: `Ollama embedding model not pulled — run: ollama pull ${model}`,
  };
});

// Check MCP servers
check("MCP servers", () => {
  const memServer = existsSync(join(ROOT, "mcp/memory-server/src/index.ts"));
  const taskServer = existsSync(join(ROOT, "mcp/tasks-server/src/index.ts"));
  return {
    ok: memServer && taskServer,
    detail: `memory: ${memServer ? "✓" : "✗"}, tasks: ${taskServer ? "✓" : "✗"}`,
  };
});

// Check patterns
check("Patterns", () => {
  const patternsDir = join(ROOT, "patterns");
  if (!existsSync(patternsDir)) return { ok: false, detail: "patterns/ directory missing" };
  const { readdirSync } = require("fs");
  const patterns = readdirSync(patternsDir).filter((d: string) =>
    existsSync(join(patternsDir, d, "system.md"))
  );
  return { ok: patterns.length > 0, detail: `${patterns.length} patterns available` };
});

// Check git hooks
check("Security hooks", () => {
  const hook = join(ROOT, ".git/hooks/pre-commit");
  const exists = existsSync(hook);
  return { ok: exists, detail: exists ? "Pre-commit hook installed" : "Not installed — run: bun run seed hooks install" };
});

// Wait for any async checks (e.g. the Ollama embedding-model probe) to resolve
// before printing, so their rows aren't dropped.
await Promise.all(pendingChecks);

// Print results
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
console.log(`\n🏥 Digital Seed v${pkg.version}\n`);
const icons = { ok: "✅", warn: "⚠️", fail: "❌" };
for (const c of checks) {
  console.log(`  ${icons[c.status]} ${c.name}: ${c.detail}`);
}
const failures = checks.filter((c) => c.status === "fail");
const warnings = checks.filter((c) => c.status === "warn");
let summary: string;
if (failures.length > 0) {
  summary = `${failures.length} check(s) failed.`;
} else if (warnings.length > 0) {
  summary = `Checks passed with warnings (${warnings.length}).`;
} else {
  summary = "All checks passed.";
}
console.log(`\n${summary}\n`);
