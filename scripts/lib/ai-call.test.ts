import { test, expect } from "bun:test";
import { aiCall, resolveProvider, aiCallExact, redactSecrets, type ProviderInfo } from "./ai-call.ts";

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
 * CLI can run), all three API keys are fake values (so .env is never consulted),
 * and global fetch is a mock routed by host. Everything is restored afterwards.
 */
async function withCascade<T>(
  route: (host: string) => Response,
  fn: (calls: Call[]) => Promise<T>,
): Promise<T> {
  const saved = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const calls: Call[] = [];
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.GOOGLE_API_KEY = "test-google-key";
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
  expect(b.max_tokens as number).toBeGreaterThanOrEqual(1024); // thinking counts toward max_tokens
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

test("cascade: refusals everywhere end in the setup error, never an empty or partial string", async () => {
  await withCascade(
    (host) => (host === "api.anthropic.com" ? json(REFUSAL_PARTIAL) : json({}, 500)),
    async (calls) => {
      await expect(aiCall("q", NO_CLI)).rejects.toThrow("No AI provider found");
      expect(calls.map((c) => c.host)).toEqual(["api.anthropic.com", "api.openai.com", "generativelanguage.googleapis.com"]);
    },
  );
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
