/**
 * Model-agnostic AI call — tries every available provider in order.
 *
 * Chain:
 *   1. claude CLI (claude --print)
 *   2. openai CLI
 *   3. gemini CLI
 *   4. Anthropic API (fetch) using ANTHROPIC_API_KEY
 *   5. OpenAI API (fetch) using OPENAI_API_KEY
 *   6. Google Gemini API (fetch) using GOOGLE_API_KEY
 *   7. Error with setup instructions
 *
 * No external dependencies — .env parsed manually, HTTP via fetch().
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "../..");

// ── .env loader (no deps) ───────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function getEnvVar(key: string): string | undefined {
  return process.env[key] || loadEnv()[key];
}

// ── CLI helpers ─────────────────────────────────────────────────────

function tryCliCommand(cmd: string, prompt: string, timeout = 120_000): string | null {
  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    return execSync(`${cmd} '${escaped}'`, {
      encoding: "utf-8",
      timeout,
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function cliExists(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

// ── API helpers ─────────────────────────────────────────────────────

async function callAnthropicAPI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

async function callOpenAIAPI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function callGoogleAPI(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

// ── Main export ─────────────────────────────────────────────────────

/**
 * Send a prompt to any available AI provider. Returns the text response.
 * Tries CLI tools first (sync), then direct API calls (async).
 */
export async function aiCall(prompt: string): Promise<string> {
  // 1. claude CLI
  if (cliExists("claude")) {
    const result = tryCliCommand("claude --print", prompt);
    if (result) return result;
  }

  // 2. openai CLI
  if (cliExists("openai")) {
    const result = tryCliCommand("openai api chat.completions.create -m gpt-4o-mini -g user", prompt);
    if (result) return result;
  }

  // 3. gemini CLI
  if (cliExists("gemini")) {
    const result = tryCliCommand("gemini", prompt);
    if (result) return result;
  }

  // 4. Anthropic API
  const anthropicKey = getEnvVar("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      return await callAnthropicAPI(prompt, anthropicKey);
    } catch (e) {
      console.error("⚠️  Anthropic API failed:", (e as Error).message?.slice(0, 100));
    }
  }

  // 5. OpenAI API
  const openaiKey = getEnvVar("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      return await callOpenAIAPI(prompt, openaiKey);
    } catch (e) {
      console.error("⚠️  OpenAI API failed:", (e as Error).message?.slice(0, 100));
    }
  }

  // 6. Google API
  const googleKey = getEnvVar("GOOGLE_API_KEY");
  if (googleKey) {
    try {
      return await callGoogleAPI(prompt, googleKey);
    } catch (e) {
      console.error("⚠️  Google API failed:", (e as Error).message?.slice(0, 100));
    }
  }

  // 7. Fallback error
  throw new Error(
    "No AI provider found. Run ./setup.sh to configure one. We recommend Anthropic Claude — console.anthropic.com",
  );
}
