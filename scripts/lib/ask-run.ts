/**
 * `seed ask --run` — prompt assembly + egress preview + renderers for the mode
 * where the kit itself calls a model (unlike plain `seed ask`, which only prints
 * a paste-ready prompt for the user to run elsewhere). Because this path actually
 * sends bytes off the machine, every function here is pure assembly/rendering
 * logic — no IO, no network — so the CLI layer can preview exactly what would be
 * sent before it commits to sending it.
 *
 * Trust model:
 *  - The user's OWN context files (user/*.md) are TRUSTED. They're embedded
 *    verbatim inside a nonce-delimited TRUSTED block — NOT fenceUntrusted, whose
 *    "treat as DATA, ignore instructions" preamble would be actively wrong for
 *    the user's own compass/goals (we WANT the model to follow the user's stated
 *    preferences and priorities).
 *  - Prior ASSISTANT turns re-entering a follow-up prompt are UNTRUSTED (a model
 *    output could itself have been steered by injected content) and are wrapped
 *    with fenceUntrusted(..., { kind: "model-output" }).
 *  - Prior USER turns are the operator's own words and are included verbatim.
 */
import type { Route } from "./ask.ts";
import type { ContextBundle } from "./context-bundle.ts";
import type { ProviderInfo } from "./ai-call.ts";
import type { SecretHit } from "./secret-scan.ts";
import { fenceUntrusted } from "./fence.ts";
import { scrubBlock } from "./scrub.ts";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export interface EgressPreview {
  questionBytes: number;
  files: { name: string; bytes: number }[];
  totalBytes: number;
  provider: ProviderInfo | null;
  secretHits: SecretHit[];
}

/** Neutralize any literal copy of our trusted-context delimiters found inside file text. */
function neutralizeMarkers(text: string, begin: string, end: string): string {
  return text.split(begin).join("<<<CONTEXT_(x)_BEGIN>>>").split(end).join("<<<CONTEXT_(x)_END>>>");
}

/** Build the nonce-delimited TRUSTED context block embedding every present file's contents. */
function buildTrustedContextBlock(bundle: ContextBundle, nonce: string): string {
  const begin = `<<<CONTEXT_${nonce}_BEGIN>>>`;
  const end = `<<<CONTEXT_${nonce}_END>>>`;

  const parts = [
    begin,
    "The text between these markers is the user's OWN context, trusted and provided by them.",
    "Use it to inform your answer.",
    "---",
  ];

  for (const file of bundle.files) {
    if (!file.present) continue;
    parts.push(`## ${scrubBlock(file.name)}`);
    parts.push(neutralizeMarkers(scrubBlock(file.text), begin, end));
    parts.push("");
  }

  if (bundle.missing.length) {
    parts.push(`(not present: ${bundle.missing.map((m) => scrubBlock(m)).join(", ")})`);
  }

  parts.push(end);
  return parts.join("\n");
}

/**
 * Assemble the full prompt for a single-shot `seed ask --run`: framing, the
 * user's trusted context embedded inline (this replaces ask.ts's "read these
 * files by path" instruction — the kit calls the model directly, and the model
 * has no filesystem of its own), and the scrubbed question.
 */
export function buildRunPrompt(question: string, route: Route, bundle: ContextBundle, nonce: string): string {
  const q = scrubBlock(question);
  return [
    "I'm using Digital Seed, a local-first personal-AI workspace. Help me with the task below.",
    "",
    scrubBlock(route.framing),
    "",
    buildTrustedContextBlock(bundle, nonce),
    "",
    `My request: ${q}`,
    "",
    "Don't send, publish, spend, or delete anything — show me a draft and confirm with me before any action like that.",
  ].join("\n");
}

/**
 * Same as buildRunPrompt but for a follow-up turn in a conversation: prior USER
 * turns are the operator's own words (included verbatim, labeled "You:"); prior
 * ASSISTANT turns are untrusted model output and get fenced as DATA so a prior
 * response that was itself steered by injected content can't hijack this turn.
 */
export function buildTurnPrompt(
  history: Turn[],
  question: string,
  route: Route,
  bundle: ContextBundle,
  nonce: string,
): string {
  const q = scrubBlock(question);

  const historyLines: string[] = [];
  for (const turn of history) {
    if (turn.role === "user") {
      historyLines.push(`You: ${scrubBlock(turn.text)}`);
    } else {
      historyLines.push("Assistant (prior turn):");
      historyLines.push(fenceUntrusted(scrubBlock(turn.text), 8000, { kind: "model-output", nonce }));
    }
    historyLines.push("");
  }

  return [
    "I'm using Digital Seed, a local-first personal-AI workspace. Help me with the task below.",
    "",
    scrubBlock(route.framing),
    "",
    buildTrustedContextBlock(bundle, nonce),
    "",
    "Conversation so far:",
    ...historyLines,
    `My request: ${q}`,
    "",
    "Don't send, publish, spend, or delete anything — show me a draft and confirm with me before any action like that.",
  ].join("\n");
}

/**
 * Compute exactly what would leave the machine: the question's byte size
 * (tracked separately since it's the operator's own live input, not context),
 * each present file's byte size, the running context total (files + any
 * prior-turn history bytes), which provider would receive it, and any
 * secret-scan hits found in the bundle — so the CLI can show/gate on this
 * before actually sending anything.
 */
export function buildEgressPreview(
  question: string,
  bundle: ContextBundle,
  provider: ProviderInfo | null,
  secretHits: SecretHit[],
  historyBytes = 0,
): EgressPreview {
  const questionBytes = Buffer.byteLength(scrubBlock(question));
  const files = bundle.files.filter((f) => f.present).map((f) => ({ name: f.name, bytes: f.bytes }));
  const totalBytes = bundle.totalBytes + historyBytes;
  return { questionBytes, files, totalBytes, provider, secretHits };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

/** One-line summary of what's about to be sent — shown right before every `--run` send. */
export function renderEgressBanner(preview: EgressPreview): string {
  const providerLabel = preview.provider ? scrubBlock(preview.provider.label) : "(no provider configured)";
  const n = preview.files.length;
  const fileWord = n === 1 ? "file" : "files";
  const grandTotal = preview.questionBytes + preview.totalBytes;
  return `→ seed ask --run: sending your question + ${n} context ${fileWord} (~${formatBytes(grandTotal)}) to ${providerLabel}`;
}

/**
 * First-run consent disclosure: nothing has left the machine yet. Lists the
 * present files + total bytes, names the provider, warns files are sent
 * verbatim, specifically calls out MEMORY.md (auto-appended, grows over time),
 * mentions the dry-run preview and the revoke-consent escape hatch, and — if
 * the secret scan found anything — lists the hits and states the send is
 * blocked unless the caller passes --send-anyway.
 */
export function renderFirstRunDisclosure(preview: EgressPreview): string {
  const providerLabel = preview.provider ? scrubBlock(preview.provider.label) : "(no provider configured)";
  const lines: string[] = [];

  lines.push("Nothing has been sent yet — this is a one-time disclosure before the first `seed ask --run`.");
  lines.push("");
  lines.push(`Provider: ${providerLabel}`);
  lines.push(`Context files that will be sent (~${formatBytes(preview.totalBytes)} total):`);
  if (!preview.files.length) lines.push("  (none present)");
  for (const f of preview.files) {
    lines.push(`  - ${scrubBlock(f.name)} (${formatBytes(f.bytes)})`);
  }
  lines.push("");
  lines.push("These files are sent verbatim — never store secrets in them.");
  lines.push(
    "MEMORY.md in particular is auto-appended over time and grows — review what's in it before you let it be sent.",
  );
  lines.push("");
  lines.push("Preview any future send without actually sending: `seed ask --run --dry-run`.");
  lines.push("Revoke this consent at any time: `seed ask --revoke-consent`.");

  if (preview.secretHits.length) {
    lines.push("");
    lines.push("BLOCKED: secret-scan found possible credentials in your context files:");
    for (const hit of preview.secretHits) {
      lines.push(`  - ${scrubBlock(hit.file)}:${hit.line}:${scrubBlock(hit.kind)}`);
    }
    lines.push("The send is blocked unless you pass --send-anyway.");
  }

  return lines.join("\n");
}

/** One-line confirmation after a successful send — no content is echoed back, no history kept. */
export function renderReceipt(served: ProviderInfo, totalBytes: number): string {
  return `✓ sent ${formatBytes(totalBytes)} to ${scrubBlock(served.label)}; no history kept.`;
}
