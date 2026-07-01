/**
 * `seed ask --run` CLI driver — the single-turn orchestration that actually
 * gates egress: loads the user's context, routes it to a specialist, previews
 * exactly what would be sent, blocks on secrets, requires explicit first-run
 * consent (typed "yes" in a real terminal — never minted by --yes or a
 * non-interactive environment), and only then calls the model exactly once.
 *
 * No IO/network logic lives here beyond what's necessary to wire the pure
 * building blocks in scripts/lib/*.ts together; every side effect (file
 * reads, the model call, stdin/stdout) is behind the RunAskDeps seam so
 * tests never touch the real network.
 */
import { randomUUID } from "crypto";
import { routeSpecialist } from "./lib/ask.ts";
import { loadContextBundle } from "./lib/context-bundle.ts";
import { scanForSecrets } from "./lib/secret-scan.ts";
import { loadChatConsent, saveChatConsent, resolveConsent } from "./lib/chat-consent.ts";
import { resolveProvider, aiCallExact, type ProviderInfo } from "./lib/ai-call.ts";
import {
  buildRunPrompt,
  buildEgressPreview,
  renderFirstRunDisclosure,
  renderEgressBanner,
  renderReceipt,
} from "./lib/ask-run.ts";
import { scrubBlock } from "./lib/scrub.ts";

export interface RunAskFlags {
  root: string;
  run?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  sendAnyway?: boolean;
  only?: string[];
  exclude?: string[];
}

export interface RunAskDeps {
  call?: (prompt: string) => Promise<{ text: string; served: ProviderInfo }>;
  resolveProvider?: () => ProviderInfo | null;
  now?: () => string;
  nonce?: () => string;
  isTTY?: boolean;
  readLine?: () => Promise<string>;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
}

export async function runAsk(question: string, flags: RunAskFlags, deps: RunAskDeps = {}): Promise<number> {
  const out = deps.stdout ?? ((s: string) => process.stdout.write(s));
  const err = deps.stderr ?? ((s: string) => process.stderr.write(s));
  const resolveP = deps.resolveProvider ?? (() => resolveProvider());
  const nonce = deps.nonce ?? (() => randomUUID());
  const now = deps.now ?? (() => new Date().toISOString());
  const isTTY = deps.isTTY ?? process.stdin.isTTY ?? false;

  const provider = resolveP();
  const call = deps.call ?? ((p: string) => aiCallExact(p, provider!));

  const bundle = loadContextBundle(flags.root, { only: flags.only, exclude: flags.exclude });
  const route = routeSpecialist(question);
  const hits = scanForSecrets(bundle);
  const preview = buildEgressPreview(question, bundle, provider, hits);

  // Secret block — never send.
  if (hits.length && !flags.sendAnyway) {
    err(renderFirstRunDisclosure(preview) + "\n");
    return 1;
  }

  // Dry-run — print the prompt + banner, send nothing, no consent check.
  if (flags.dryRun) {
    out(buildRunPrompt(question, route, bundle, nonce()) + "\n");
    err(renderEgressBanner(preview) + "\n");
    err("(dry run — nothing was sent)\n");
    return 0;
  }

  // No provider configured — never echo .env.
  if (!provider) {
    err(
      "No AI provider configured. Add a key to .env (e.g. ANTHROPIC_API_KEY=...) or install a provider CLI (claude/openai/gemini). Nothing was sent.\n",
    );
    return 1;
  }

  // Consent.
  const decision = resolveConsent({
    persisted: loadChatConsent(flags.root),
    resolvedProvider: provider.label,
    yesFlag: !!flags.yes,
    isTTY,
  });

  if (decision.needsFirstRun) {
    if (!isTTY) {
      err(
        `This sends your context to ${provider.label} for the first time. Run it once in a terminal to consent (you'll type 'yes'). Nothing was sent.\n`,
      );
      return 2;
    }
    out(renderFirstRunDisclosure(preview) + "\n");
    const readLine = deps.readLine ?? (() => Promise.resolve(""));
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

  // Send.
  err(renderEgressBanner(preview) + "\n");
  try {
    const { text, served } = await call(buildRunPrompt(question, route, bundle, nonce()));
    out(scrubBlock(text) + "\n");
    err(renderReceipt(served, preview.totalBytes) + "\n");
    return 0;
  } catch (e) {
    err("Error: " + (e as Error).message + "\n");
    return 1;
  }
}
