import { test, expect } from "bun:test";
import { resolveProvider, aiCallExact, redactSecrets, type ProviderInfo } from "./ai-call.ts";

test("redactSecrets strips key-shaped tokens", () => {
  expect(redactSecrets("err sk-ant-api03-SECRETVALUE tail")).not.toContain("SECRETVALUE");
  expect(redactSecrets("AIzaSyD-XYZ_1234567890abcdefghij12345 and Bearer abc.def.ghijklmnop")).toMatch(/\[redacted\]/);
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
  const fakeFetch = (async (url: string) => { hosts.push(new URL(url).host); throw new Error("boom sk-ant-api03-LEAKLEAKLEAK"); }) as unknown as typeof fetch;
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
