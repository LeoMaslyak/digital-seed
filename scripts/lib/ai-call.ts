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
import { safeExec } from "./safe-exec.ts";

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

// ── Task 7: single-provider, no-cascade door ────────────────────────
//
// aiCall() above intentionally cascades across providers on failure, and
// its HTTP callers put the Google key in the URL and console.error the
// raw response body. That's unacceptable for callers who must send a
// prompt to exactly ONE named provider and never fan it out further, and
// must never leak key material into a thrown error or a log. resolveProvider()
// and aiCallExact() below are that door. aiCall() and its helpers above are
// untouched.

export interface ProviderInfo {
  label: string;
  vendor: "Anthropic" | "OpenAI" | "Google";
  transport: "claude CLI" | "openai CLI" | "gemini CLI" | "HTTP";
  host: string;
}

/**
 * Pick exactly one provider, presence-only — the returned object never
 * carries a key value, only which vendor/transport would be used.
 * Precedence: local CLIs (claude, openai, gemini) beat HTTP API keys
 * (Anthropic, OpenAI, Google, in that order). Returns null if nothing
 * is configured.
 */
export function resolveProvider(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  opts: { hasCli?: (name: string) => boolean } = {},
): ProviderInfo | null {
  const hasCli = opts.hasCli ?? cliExists;

  if (hasCli("claude")) {
    return { label: "Anthropic (claude CLI)", vendor: "Anthropic", transport: "claude CLI", host: "(local CLI)" };
  }
  if (hasCli("openai")) {
    return { label: "OpenAI (openai CLI)", vendor: "OpenAI", transport: "openai CLI", host: "(local CLI)" };
  }
  if (hasCli("gemini")) {
    return { label: "Google (gemini CLI)", vendor: "Google", transport: "gemini CLI", host: "(local CLI)" };
  }
  if (env.ANTHROPIC_API_KEY) {
    return { label: "Anthropic (HTTP)", vendor: "Anthropic", transport: "HTTP", host: "api.anthropic.com" };
  }
  if (env.OPENAI_API_KEY) {
    return { label: "OpenAI (HTTP)", vendor: "OpenAI", transport: "HTTP", host: "api.openai.com" };
  }
  if (env.GOOGLE_API_KEY) {
    return {
      label: "Google (HTTP)",
      vendor: "Google",
      transport: "HTTP",
      host: "generativelanguage.googleapis.com",
    };
  }
  return null;
}

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]+/g,
  /sk-proj-[A-Za-z0-9_-]+/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /ghp_[0-9A-Za-z]{30,}/g,
  /Bearer\s+[A-Za-z0-9._-]{10,}/g,
];

/** Replace anything that looks like an API key / bearer token with "[redacted]". */
export function redactSecrets(s: string): string {
  let out = s;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out;
}

async function defaultCliExec(argv: string[], input: string): Promise<string> {
  const [cmd, ...args] = argv;
  const result = safeExec(cmd, args, { input, cwd: ROOT, timeout: 120_000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `${cmd} exited with code ${result.exitCode}`);
  }
  return result.stdout.trim();
}

/**
 * Call exactly ONE provider — no cascade, no console output. The prompt
 * goes to CLI transports via stdin (never argv, never a shell string) and
 * to HTTP transports via fetch with the key in a header (never a URL).
 * On ANY failure, the thrown error message is redacted before it leaves
 * this function, so key material can never escape via an error/log.
 */
export async function aiCallExact(
  prompt: string,
  provider: ProviderInfo,
  deps: {
    fetch?: typeof fetch;
    exec?: (argv: string[], input: string) => Promise<string>;
  } = {},
): Promise<{ text: string; served: ProviderInfo }> {
  const doFetch = deps.fetch ?? fetch;
  const exec = deps.exec ?? defaultCliExec;

  try {
    if (provider.transport === "claude CLI") {
      const text = await exec(["claude", "--print"], prompt);
      return { text, served: provider };
    }

    if (provider.transport === "openai CLI") {
      const text = await exec(
        ["openai", "api", "chat.completions.create", "-m", "gpt-4o-mini", "-g", "user", "-"],
        prompt,
      );
      return { text, served: provider };
    }

    if (provider.transport === "gemini CLI") {
      const text = await exec(["gemini"], prompt);
      return { text, served: provider };
    }

    // HTTP transports — exactly one fetch, exactly one host, key in a
    // header (never a query string).
    if (provider.vendor === "Anthropic") {
      const apiKey = getEnvVar("ANTHROPIC_API_KEY") ?? "";
      const res = await doFetch("https://api.anthropic.com/v1/messages", {
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
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      return { text, served: provider };
    }

    if (provider.vendor === "OpenAI") {
      const apiKey = getEnvVar("OPENAI_API_KEY") ?? "";
      const res = await doFetch("https://api.openai.com/v1/chat/completions", {
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
      const text = data.choices[0]?.message?.content ?? "";
      return { text, served: provider };
    }

    // Google — key goes in the x-goog-api-key header, never the URL.
    const apiKey = getEnvVar("GOOGLE_API_KEY") ?? "";
    const res = await doFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    return { text, served: provider };
  } catch (e) {
    throw new Error(redactSecrets("AI call failed: " + (e as Error).message));
  }
}
