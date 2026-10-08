/**
 * Model-agnostic AI call — tries every available provider in order.
 *
 * Chain:
 *   1. claude CLI (claude --print)
 *   2. openai CLI
 *   3. gemini CLI
 *   4. Anthropic API (fetch, Claude Haiku 5.5) using ANTHROPIC_API_KEY
 *   5. OpenAI API (fetch) using OPENAI_API_KEY
 *   6. Google Gemini API (fetch) using GOOGLE_API_KEY
 *   7. Error: the last provider failure (redacted) if one was tried, else setup instructions
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

// One model id and one request body for BOTH Anthropic sites below. claude-haiku-5-5
// has no date suffix. Sampling params (temperature, top_p, top_k),
// an assistant prefill and thinking.budget_tokens are all HTTP 400 on this model,
// so the request carries none of them. Thinking is on by default and counts
// toward max_tokens, so the cap leaves room for thinking plus the answer.
const ANTHROPIC_MODEL = "claude-haiku-5-5";
const ANTHROPIC_MAX_TOKENS = 16_000;

function anthropicBody(prompt: string): string {
  return JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    output_config: { effort: "medium" }, // = the model default, pinned so it is explicit
    messages: [{ role: "user", content: prompt }],
  });
}

interface AnthropicMessage {
  content: { type: string; text?: string }[];
  stop_reason?: string | null;
  stop_details?: { category?: string } | null;
}

/**
 * True when an answer is empty after removing whitespace and the zero-width characters
 * U+200B, U+200C, U+200D, U+2060 and U+FEFF. A non-string (null, undefined) is blank.
 */
function isBlankAnswer(s: string | null | undefined): boolean {
  return typeof s !== "string" || /^[\s\u200B\u200C\u200D\u2060\uFEFF]*$/.test(s);
}

/** The answer text unchanged, or a thrown "no answer text" failure for a blank one (OpenAI and Google). */
function requireAnswer(vendor: "OpenAI" | "Google", text: string | null | undefined): string {
  if (isBlankAnswer(text)) throw new Error(`${vendor} API returned no answer text`);
  return text as string;
}

/**
 * Text of an Anthropic Messages response. A decline arrives as HTTP 200 with
 * stop_reason "refusal" (and no server-side fallback): it is a FAILURE of this
 * provider, thrown before any content is read, so a cascade moves on instead
 * of returning an empty or partial string as if it were the answer. Content is
 * read by block type, never by position: a response may start with thinking
 * blocks.
 *
 * A TRUNCATED answer is a failure too: stop_reason "max_tokens" throws whatever
 * text is present, after the refusal check and before the empty check. Haiku 5.5
 * thinks by default and thinking counts toward max_tokens, so a cut-off reply can
 * carry partial text (e.g. truncated JSON) that must not pass as an answer.
 *
 * An EMPTY answer is a failure as well, whatever the other stop_reason: end_turn
 * with a thinking block only, or with no, whitespace-only or zero-width-only text
 * (see isBlankAnswer). The messages carry the stop_reason (capped) and never
 * response content. The returned text is not trimmed.
 */
function anthropicText(data: AnthropicMessage): string {
  if (data.stop_reason === "refusal") {
    const category = data.stop_details?.category;
    throw new Error(
      `Anthropic API refusal${typeof category === "string" ? ` (${category.slice(0, 40)})` : ""}`,
    );
  }
  if (data.stop_reason === "max_tokens") {
    throw new Error("Anthropic API answer truncated (stop_reason=max_tokens)");
  }
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  if (isBlankAnswer(text)) {
    throw new Error(
      `Anthropic API returned no answer text (stop_reason=${String(data.stop_reason).slice(0, 40)})`,
    );
  }
  return text;
}

async function callAnthropicAPI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: anthropicBody(prompt),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  return anthropicText((await res.json()) as AnthropicMessage);
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
  const data = (await res.json()) as { choices: { message: { content: string | null } }[] };
  return requireAnswer("OpenAI", data.choices[0]?.message?.content);
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
  return requireAnswer("Google", data.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""));
}

// ── Main export ─────────────────────────────────────────────────────

/** Null-safe message of whatever was thrown or rejected (null, undefined and non-Errors included). */
function errorMessage(e: unknown): string {
  return String((e as Error | null | undefined)?.message ?? e);
}

/**
 * Send a prompt to any available AI provider. Returns the text response.
 * Tries CLI tools first (sync), then direct API calls (async).
 */
export async function aiCall(
  prompt: string,
  opts: { hasCli?: (name: string) => boolean } = {},
): Promise<string> {
  const hasCli = opts.hasCli ?? cliExists; // seam for tests, as in resolveProvider()

  // 1. claude CLI
  if (hasCli("claude")) {
    const result = tryCliCommand("claude --print", prompt);
    if (result) return result;
  }

  // 2. openai CLI
  if (hasCli("openai")) {
    const result = tryCliCommand("openai api chat.completions.create -m gpt-4o-mini -g user", prompt);
    if (result) return result;
  }

  // 3. gemini CLI
  if (hasCli("gemini")) {
    const result = tryCliCommand("gemini", prompt);
    if (result) return result;
  }

  // The last HTTP provider failure (null = no HTTP provider was attempted). Steps 4-6 record it
  // so the final error can say what actually failed instead of sending the user to setup.
  let lastFailure: string | null = null;

  // 4. Anthropic API
  const anthropicKey = getEnvVar("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      return await callAnthropicAPI(prompt, anthropicKey);
    } catch (e) {
      lastFailure = errorMessage(e);
      console.error("⚠️  Anthropic API failed:", redactSecrets(lastFailure).slice(0, 100));
    }
  }

  // 5. OpenAI API
  const openaiKey = getEnvVar("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      return await callOpenAIAPI(prompt, openaiKey);
    } catch (e) {
      lastFailure = errorMessage(e);
      console.error("⚠️  OpenAI API failed:", redactSecrets(lastFailure).slice(0, 100));
    }
  }

  // 6. Google API
  const googleKey = getEnvVar("GOOGLE_API_KEY");
  if (googleKey) {
    try {
      return await callGoogleAPI(prompt, googleKey);
    } catch (e) {
      lastFailure = errorMessage(e);
      console.error("⚠️  Google API failed:", redactSecrets(lastFailure).slice(0, 100));
    }
  }

  // 7. Fallback error. A provider WAS configured and tried but failed: say so (redacted, capped);
  // "run setup" is only right when nothing is configured at all.
  if (lastFailure !== null) {
    throw new Error(`All configured AI providers failed (last: ${redactSecrets(lastFailure).slice(0, 160)})`);
  }
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
// and aiCallExact() below are that door. aiCall() above keeps its cascade.

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
  /sk-[A-Za-z0-9_-]{20,}/g, // sk-svcacct-..., sk-admin-...: the pattern above stops at the dash
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
        body: anthropicBody(prompt),
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      const text = anthropicText((await res.json()) as AnthropicMessage);
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
      const data = (await res.json()) as { choices: { message: { content: string | null } }[] };
      const text = requireAnswer("OpenAI", data.choices[0]?.message?.content);
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
    const text = requireAnswer("Google", data.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""));
    return { text, served: provider };
  } catch (e) {
    throw new Error(redactSecrets("AI call failed: " + errorMessage(e)));
  }
}
