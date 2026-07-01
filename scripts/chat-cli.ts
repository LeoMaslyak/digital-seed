/**
 * `seed chat` — the conversational REPL driver. Unlike `seed ask --run` (one
 * shot: send, print, forget), this keeps a running conversation: it loads the
 * user's context once, gates on the same secret-scan + first-run consent as
 * `ask --run`, then loops turn-by-turn — every turn re-sends the trusted
 * context (so the model always has it) plus the conversation history, with
 * prior ASSISTANT turns fenced as untrusted DATA (buildTurnPrompt already
 * does this — see scripts/lib/ask-run.ts).
 *
 * CONVERSATIONAL-ONLY: this file must never launch external processes, write
 * a file (persistence goes through scripts/lib/chat-consent.ts), or make any
 * network call other than the injected model `call`. See the "no-tools
 * invariant" test in chat-cli.test.ts for the exact guardrail.
 */
import { randomUUID } from "crypto";
import { createInterface } from "readline";
import { routeSpecialist } from "./lib/ask.ts";
import { loadContextBundle } from "./lib/context-bundle.ts";
import { scanForSecrets } from "./lib/secret-scan.ts";
import { loadChatConsent, saveChatConsent, resolveConsent } from "./lib/chat-consent.ts";
import { resolveProvider, aiCallExact, type ProviderInfo } from "./lib/ai-call.ts";
import { buildTurnPrompt, buildEgressPreview, renderFirstRunDisclosure, renderEgressBanner, type Turn } from "./lib/ask-run.ts";
import { scrubBlock } from "./lib/scrub.ts";

export interface RunChatFlags {
  root: string;
  sendAnyway?: boolean;
  only?: string[];
  exclude?: string[];
}

export interface RunChatDeps {
  call?: (prompt: string) => Promise<{ text: string; served: ProviderInfo }>;
  resolveProvider?: () => ProviderInfo | null;
  isTTY?: boolean;
  nonce?: () => string;
  now?: () => string;
  readLine?: () => Promise<string>;
  lines?: AsyncIterable<string>;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
}

/** Production stdin line source — isolated so tests never touch real stdin. */
function stdinLines(): AsyncIterable<string> {
  return createInterface({ input: process.stdin });
}

export async function runChat(flags: RunChatFlags, deps: RunChatDeps = {}): Promise<number> {
  const out = deps.stdout ?? ((s: string) => process.stdout.write(s));
  const err = deps.stderr ?? ((s: string) => process.stderr.write(s));
  const resolveP = deps.resolveProvider ?? (() => resolveProvider());
  const isTTY = deps.isTTY ?? process.stdin.isTTY ?? false;
  const nonce = deps.nonce ?? (() => randomUUID());
  const now = deps.now ?? (() => new Date().toISOString());
  const readLine = deps.readLine ?? (() => Promise.resolve(""));

  const provider = resolveP();
  const call = deps.call ?? ((p: string) => aiCallExact(p, provider!));

  const bundle = loadContextBundle(flags.root, { only: flags.only, exclude: flags.exclude });
  const hits = scanForSecrets(bundle);

  if (hits.length && !flags.sendAnyway) {
    err(renderFirstRunDisclosure(buildEgressPreview("", bundle, provider, hits)) + "\n");
    return 1;
  }

  if (!isTTY) {
    err("seed chat needs an interactive terminal. Nothing was sent.\n");
    return 2;
  }

  if (!provider) {
    err("No AI provider configured. Add a key to .env or install a provider CLI (claude/openai/gemini). Nothing was sent.\n");
    return 1;
  }

  const decision = resolveConsent({
    persisted: loadChatConsent(flags.root),
    resolvedProvider: provider.label,
    yesFlag: false,
    isTTY,
  });

  if (decision.needsFirstRun) {
    out(renderFirstRunDisclosure(buildEgressPreview("", bundle, provider, hits)) + "\n");
    const ans = (await readLine()).trim().toLowerCase();
    if (ans !== "yes") {
      err("Cancelled. Nothing left your machine.\n");
      return 2;
    }
    saveChatConsent(flags.root, provider.label, now());
  } else if (!decision.allowed) {
    err("Consent required. Nothing was sent.\n");
    return 2;
  }

  err(renderEgressBanner(buildEgressPreview("", bundle, provider, [])) + "\n");
  err("I only talk — I can't run, send, or change anything. Copy anything you want to act on into your own agent. Type /exit to quit.\n");

  const history: Turn[] = [];
  for await (const raw of deps.lines ?? stdinLines()) {
    const line = raw.replace(/\n$/, "");
    if (line.trim() === "/exit") break;
    if (line.trim() === "") continue;
    const prompt = buildTurnPrompt(history, line, routeSpecialist(line), bundle, nonce());
    try {
      const { text } = await call(prompt);
      out(scrubBlock(text) + "\n");
      history.push({ role: "user", text: line }, { role: "assistant", text });
    } catch (e) {
      err("Error: " + (e as Error).message + "\n");
    }
  }
  return 0;
}
