import { test, expect, beforeEach, afterEach } from "bun:test";
import { aiCall, resolveProvider, aiCallExact, redactSecrets, type ProviderInfo } from "./ai-call.ts";

// Every test runs with all three provider keys pinned to a fake value. getEnvVar() falls back
// to ROOT/.env when a variable is unset, so without this a developer's real key could end up in
// the (mocked) request header. Tests that need "no key" delete it explicitly; the hook restores
// whatever was there afterwards.
const DUMMY_KEY = "dummy-not-a-key";
const KEY_VARS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY"] as const;
let savedKeys: Record<string, string | undefined> = {};
beforeEach(() => {
  savedKeys = Object.fromEntries(KEY_VARS.map((k) => [k, process.env[k]]));
  for (const k of KEY_VARS) process.env[k] = DUMMY_KEY;
});
afterEach(() => {
  for (const k of KEY_VARS) {
    if (savedKeys[k] === undefined) delete process.env[k];
    else process.env[k] = savedKeys[k];
  }
});

// Secret-shaped inputs are built by concatenation so the repo's own source-level
// privacy-scan doesn't flag these fixtures, while redactSecrets still sees the full
// shape at runtime.
test("redactSecrets strips key-shaped tokens", () => {
  expect(redactSecrets("err " + "sk-ant-" + "api03SECRETVALUE12345" + " tail")).not.toContain("SECRETVALUE");
  expect(redactSecrets("AIza" + "SyD-XYZ_1234567890abcdefghij12345 and Bearer abc.def.ghijklmnop")).toMatch(/\[redacted\]/);
});

test("resolveProvider is presence-only and returns no key value (HTTP path forced)", () => {
  const p = resolveProvider({ ANTHROPIC_API_KEY: "sk-ant-xxx" }, { hasCli: () => false });
  expect(p?.vendor).toBe("Anthropic");
  expect(p?.transport).toBe("HTTP");
  expect(p?.host).toBe("api.anthropic.com");
  expect(JSON.stringify(p)).not.toContain("sk-ant-xxx");
});

test("resolveProvider precedence: a CLI beats an HTTP key", () => {
  const p = resolveProvider({ ANTHROPIC_API_KEY: "k" }, { hasCli: (n) => n === "gemini" });
  expect(p?.transport).toBe("gemini CLI");
  expect(p?.vendor).toBe("Google");
});

test("resolveProvider: nothing configured => null", () => {
  expect(resolveProvider({}, { hasCli: () => false })).toBeNull();
});

test("aiCallExact hits exactly one host and does not fan out on failure; error is redacted", async () => {
  const hosts: string[] = [];
  const fakeFetch = (async (url: string) => { hosts.push(new URL(url).host); throw new Error("boom " + "sk-ant-" + "api03LEAKLEAKLEAK12345"); }) as unknown as typeof fetch;
  const provider: ProviderInfo = { label: "OpenAI (HTTP)", vendor: "OpenAI", transport: "HTTP", host: "api.openai.com" };
  let err: unknown;
  await aiCallExact("hi", provider, { fetch: fakeFetch, exec: async () => "" }).catch((e) => { err = e; });
  expect(hosts).toEqual(["api.openai.com"]); // no cascade to anthropic/google
  expect(String(err)).not.toContain("LEAKLEAKLEAK"); // redacted
});

test("aiCallExact CLI transport uses injected exec (stdin), returns served provider", async () => {
  const provider: ProviderInfo = { label: "Anthropic (claude CLI)", vendor: "Anthropic", transport: "claude CLI", host: "(local CLI)" };
  let sawInput = "";
  const exec = async (_argv: string[], input: string) => { sawInput = input; return "CLI ANSWER"; };
  const r = await aiCallExact("my prompt", provider, { exec });
  expect(r.text).toBe("CLI ANSWER");
  expect(r.served).toEqual(provider);
  expect(sawInput).toContain("my prompt"); // prompt goes via stdin, not argv
});

// ── Claude Haiku 5.5: request body, thinking-first content, refusal ──

const ANTHROPIC_HTTP: ProviderInfo = { label: "Anthropic (HTTP)", vendor: "Anthropic", transport: "HTTP", host: "api.anthropic.com" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const NORMAL = { stop_reason: "end_turn", content: [{ type: "text", text: "HAIKU ANSWER" }] };
const THINKING_FIRST = {
  stop_reason: "end_turn",
  content: [
    { type: "thinking", thinking: "", signature: "sig-abc" },
    { type: "text", text: "ANSWER AFTER THINKING" },
  ],
};
const REFUSAL_PARTIAL = {
  stop_reason: "refusal",
  stop_details: { category: "general_harms" },
  content: [{ type: "text", text: "PARTIAL REFUSED TEXT" }],
};
const REFUSAL_EMPTY = { stop_reason: "refusal", stop_details: { category: "cyber" }, content: [] };

interface Call { host: string; body: Record<string, unknown> | null }

/**
 * Runs fn with aiCall() cascade conditions pinned and no network: no CLI is
 * reported present (so the claude/openai/gemini CLI steps are skipped and no real
 * CLI can run), the API keys named in `keys` (default: all three) are the fake DUMMY_KEY
 * (so .env is never consulted for them; the others are deleted),
 * and global fetch is a mock routed by host. Everything is restored afterwards.
 */
async function withCascade<T>(
  route: (host: string) => Response,
  fn: (calls: Call[]) => Promise<T>,
  keys: readonly (typeof KEY_VARS)[number][] = KEY_VARS,
): Promise<T> {
  const saved = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const calls: Call[] = [];
  for (const k of KEY_VARS) {
    if (keys.includes(k)) process.env[k] = DUMMY_KEY;
    else delete process.env[k];
  }
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const host = new URL(url).host;
    calls.push({ host, body: init?.body ? JSON.parse(String(init.body)) : null });
    return route(host);
  }) as unknown as typeof fetch;
  console.error = () => {};
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const NO_CLI = { hasCli: () => false };
const OPENAI_OK = { choices: [{ message: { content: "OPENAI ANSWER" } }] };
const routeAnthropicThen = (anthropic: () => Response) => (host: string) =>
  host === "api.anthropic.com" ? anthropic() : host === "api.openai.com" ? json(OPENAI_OK) : json({}, 500);

function expectHaiku55Body(body: Record<string, unknown> | null) {
  expect(body).not.toBeNull();
  const b = body as Record<string, unknown>;
  expect(b.model).toBe("claude-haiku-5-5");
  // Haiku 5.5 400s on all of these, so none may be sent.
  for (const banned of ["temperature", "top_p", "top_k", "thinking", "fallbacks"]) expect(b).not.toHaveProperty(banned);
  // Thinking counts toward max_tokens, so the budget is pinned EXACTLY (a floor would let 16000 drop to 1024).
  expect(b.max_tokens).toBe(16_000);
  const messages = b.messages as { role: string; content: string }[];
  expect(messages[messages.length - 1].role).toBe("user"); // no assistant prefill
}

test("aiCall cascade step sends claude-haiku-5-5 with a body Haiku 5.5 accepts", async () => {
  await withCascade(() => json(NORMAL), async (calls) => {
    expect(await aiCall("hello", NO_CLI)).toBe("HAIKU ANSWER");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com"]);
    expectHaiku55Body(calls[0].body);
    expect((calls[0].body!.messages as { content: string }[])[0].content).toBe("hello");
  });
});

test("aiCallExact Anthropic HTTP sends claude-haiku-5-5 with a body Haiku 5.5 accepts", async () => {
  let sent: Record<string, unknown> | null = null;
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return json(NORMAL);
  }) as unknown as typeof fetch;
  const r = await aiCallExact("hello", ANTHROPIC_HTTP, { fetch: fakeFetch });
  expect(r.text).toBe("HAIKU ANSWER");
  expect(r.served).toEqual(ANTHROPIC_HTTP);
  expectHaiku55Body(sent);
});

test("normal Anthropic response returns the same text as before (multiple text blocks still joined)", async () => {
  const multi = { stop_reason: "end_turn", content: [{ type: "text", text: "one " }, { type: "text", text: "two" }] };
  await withCascade(() => json(multi), async () => {
    expect(await aiCall("q", NO_CLI)).toBe("one two");
  });
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: (async () => json(multi)) as unknown as typeof fetch });
  expect(r.text).toBe("one two");
});

test("thinking-first response: the text comes from the text block, not content[0]", async () => {
  await withCascade(() => json(THINKING_FIRST), async () => {
    expect(await aiCall("q", NO_CLI)).toBe("ANSWER AFTER THINKING");
  });
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: (async () => json(THINKING_FIRST)) as unknown as typeof fetch });
  expect(r.text).toBe("ANSWER AFTER THINKING");
});

test("cascade: a refusal WITH partial text is a provider failure, so the next provider answers", async () => {
  await withCascade(routeAnthropicThen(() => json(REFUSAL_PARTIAL)), async (calls) => {
    const out = await aiCall("q", NO_CLI);
    expect(out).toBe("OPENAI ANSWER");
    expect(out).not.toContain("PARTIAL");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com"]);
  });
});

test("cascade: a refusal with EMPTY content is a provider failure, so the next provider answers", async () => {
  await withCascade(routeAnthropicThen(() => json(REFUSAL_EMPTY)), async (calls) => {
    expect(await aiCall("q", NO_CLI)).toBe("OPENAI ANSWER");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com"]);
  });
});

test("cascade: refusal behaves exactly like an HTTP error (same fall-through)", async () => {
  await withCascade(routeAnthropicThen(() => json({ error: { message: "overloaded" } }, 529)), async (calls) => {
    expect(await aiCall("q", NO_CLI)).toBe("OPENAI ANSWER");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com"]);
  });
});

test("cascade: an Anthropic refusal plus failing OpenAI/Google ends in a provider-failure error, never an empty or partial string", async () => {
  await withCascade(
    (host) => (host === "api.anthropic.com" ? json(REFUSAL_PARTIAL) : json({}, 500)),
    async (calls) => {
      const err = await aiCall("q", NO_CLI).then(() => null, (e: Error) => e);
      expect(err).not.toBeNull();
      expect(err!.message).toContain("All configured AI providers failed");
      expect(err!.message).toContain("Google API 500"); // the LAST provider failure
      expect(err!.message).not.toContain("No AI provider found");
      expect(err!.message).not.toContain("PARTIAL");
      expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com", "generativelanguage.googleapis.com"]);
    },
  );
});

// ── F5: the final error names the last provider failure ─────────────

const ONLY_ANTHROPIC = ["ANTHROPIC_API_KEY"] as const;

test("cascade: Anthropic as the only provider and it refuses => the error names the refusal, not the setup hint", async () => {
  await withCascade(() => json(REFUSAL_EMPTY), async (calls) => {
    const err = await aiCall("q", NO_CLI).then(() => null, (e: Error) => e);
    expect(err).not.toBeNull();
    expect(err!.message).toBe("All configured AI providers failed (last: Anthropic API refusal (cyber))");
    expect(err!.message).toContain("refusal");
    expect(err!.message).not.toContain("No AI provider found");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com"]);
  }, ONLY_ANTHROPIC);
});

test("cascade: nothing configured (no CLI, no keys) keeps the setup error and makes no request", async () => {
  await withCascade(() => json({}), async (calls) => {
    await expect(aiCall("q", NO_CLI)).rejects.toThrow("No AI provider found");
    expect(calls).toEqual([]);
  }, []);
});

test("cascade: an Anthropic 401 whose body echoes a key-shaped string => the final error is redacted", async () => {
  const leak = "sk-ant-" + "api03-" + "A".repeat(40);
  await withCascade(() => new Response(`{"error":"invalid x-api-key ${leak}"}`, { status: 401 }), async () => {
    const err = await aiCall("q", NO_CLI).then(() => null, (e: Error) => e);
    expect(err).not.toBeNull();
    expect(err!.message).toContain("All configured AI providers failed");
    expect(err!.message).toContain("401");
    expect(err!.message).not.toContain("sk-ant-api03");
    expect(err!.message).not.toContain("A".repeat(20));
  }, ONLY_ANTHROPIC);
});

test("cascade: the last-failure text in the final error is length-capped", async () => {
  await withCascade(() => new Response("x".repeat(2000), { status: 500 }), async () => {
    const err = await aiCall("q", NO_CLI).then(() => null, (e: Error) => e);
    expect(err).not.toBeNull();
    const prefix = "All configured AI providers failed (last: ";
    expect(err!.message.startsWith(prefix)).toBe(true);
    expect(err!.message.length).toBeLessThanOrEqual(prefix.length + 160 + 1); // 160 chars of detail + ")"
  }, ONLY_ANTHROPIC);
});

test("aiCallExact: a refusal with partial text rejects with an error containing 'refusal', one fetch only", async () => {
  let fetches = 0;
  const fakeFetch = (async () => { fetches++; return json(REFUSAL_PARTIAL); }) as unknown as typeof fetch;
  let err: unknown;
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: fakeFetch }).catch((e) => { err = e; });
  expect(r).toBeUndefined();
  expect((err as Error).message).toContain("refusal");
  expect((err as Error).message).toContain("general_harms");
  expect((err as Error).message).not.toContain("PARTIAL");
  expect(fetches).toBe(1);
});

test("aiCallExact: a refusal with empty content also rejects with 'refusal'", async () => {
  const fakeFetch = (async () => json(REFUSAL_EMPTY)) as unknown as typeof fetch;
  await expect(aiCallExact("q", ANTHROPIC_HTTP, { fetch: fakeFetch })).rejects.toThrow(/refusal/);
});

// ── F4: hermetic keys ──────────────────────────────────────────────
// aiCallExact reads its key through getEnvVar(), which falls back to ROOT/.env when the
// variable is unset. The file-level hook above pins all three keys to a fake value, so an
// ambient or .env key can never reach a (mocked) request header.

test("aiCallExact HTTP requests carry the pinned fake key in the header, for every vendor", async () => {
  const headers: Record<string, Record<string, string>> = {};
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const host = new URL(url).host;
    headers[host] = init?.headers as Record<string, string>;
    if (host === "api.openai.com") return json(OPENAI_OK);
    if (host === "api.anthropic.com") return json(NORMAL);
    return json({ candidates: [{ content: { parts: [{ text: "GOOGLE ANSWER" }] } }] });
  }) as unknown as typeof fetch;
  const OPENAI_HTTP: ProviderInfo = { label: "OpenAI (HTTP)", vendor: "OpenAI", transport: "HTTP", host: "api.openai.com" };
  const GOOGLE_HTTP: ProviderInfo = { label: "Google (HTTP)", vendor: "Google", transport: "HTTP", host: "generativelanguage.googleapis.com" };
  for (const p of [ANTHROPIC_HTTP, OPENAI_HTTP, GOOGLE_HTTP]) await aiCallExact("q", p, { fetch: fakeFetch });
  expect(headers["api.anthropic.com"]["x-api-key"]).toBe(DUMMY_KEY);
  expect(headers["api.openai.com"].authorization).toBe(`Bearer ${DUMMY_KEY}`);
  expect(headers["generativelanguage.googleapis.com"]["x-goog-api-key"]).toBe(DUMMY_KEY);
});

// ── F1: an empty answer is a provider failure, never a success ──────
// Haiku 5.5 thinks by default and thinking counts toward max_tokens, so a reply can end
// with only a thinking block (the budget ran out) or with no / whitespace-only text.

const THINKING_ONLY_MAX_TOKENS = {
  stop_reason: "max_tokens",
  content: [{ type: "thinking", thinking: "PRIVATE CHAIN OF THOUGHT", signature: "sig-abc" }],
};
const WHITESPACE_ONLY_END_TURN = {
  stop_reason: "end_turn",
  content: [{ type: "text", text: " \n\t  " }],
};

test("aiCallExact: thinking-only + max_tokens rejects (no answer text), no response content in the message", async () => {
  const fakeFetch = (async () => json(THINKING_ONLY_MAX_TOKENS)) as unknown as typeof fetch;
  let err: unknown;
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: fakeFetch }).catch((e) => { err = e; });
  expect(r).toBeUndefined();
  expect((err as Error).message).toContain("no answer text");
  expect((err as Error).message).toContain("stop_reason=max_tokens");
  expect((err as Error).message).not.toContain("PRIVATE CHAIN");
});

test("aiCallExact: whitespace-only text + end_turn rejects (no answer text)", async () => {
  const fakeFetch = (async () => json(WHITESPACE_ONLY_END_TURN)) as unknown as typeof fetch;
  let err: unknown;
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: fakeFetch }).catch((e) => { err = e; });
  expect(r).toBeUndefined();
  expect((err as Error).message).toContain("no answer text");
  expect((err as Error).message).toContain("stop_reason=end_turn");
});

test("cascade: a thinking-only Anthropic reply is a provider failure, so OpenAI answers (one Anthropic request)", async () => {
  await withCascade(routeAnthropicThen(() => json(THINKING_ONLY_MAX_TOKENS)), async (calls) => {
    expect(await aiCall("q", NO_CLI)).toBe("OPENAI ANSWER");
    expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com"]);
    expect(calls.filter((c) => c.host === "api.anthropic.com").length).toBe(1);
  });
});

test("regression: thinking + text returns the text exactly as sent (not trimmed) on both sites", async () => {
  const padded = {
    stop_reason: "end_turn",
    content: [
      { type: "thinking", thinking: "some reasoning", signature: "sig-abc" },
      { type: "text", text: "  ANSWER WITH PADDING\n" },
    ],
  };
  await withCascade(() => json(padded), async () => {
    expect(await aiCall("q", NO_CLI)).toBe("  ANSWER WITH PADDING\n");
  });
  const r = await aiCallExact("q", ANTHROPIC_HTTP, { fetch: (async () => json(padded)) as unknown as typeof fetch });
  expect(r.text).toBe("  ANSWER WITH PADDING\n");
});
