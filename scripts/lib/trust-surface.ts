/**
 * Trust surface — a read-only, local "what do you know about me / what leaves
 * this machine / what can the agent do / how do I stay in control" dashboard
 * (roadmap B6). Felt-safety is the gate to connecting real things.
 *
 * STRICTLY read-only: no network (it never "tests" egress by calling out), no
 * subprocess (it detects a .git directory, it does not run git), no mutation. It
 * inspects local files + env and formats four plain sections. It never prints
 * secret-ish values (a configured webhook URL / email address is reported as
 * on/off, never echoed), and scrubs every displayed string as defense-in-depth.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { load as loadYaml } from "js-yaml";
import { readSignals } from "./journey.ts";

const CONTEXT_FILES = ["USER", "COMPASS", "GOALS", "DOMAINS", "PREFERENCES", "ANTI-GOALS", "MEMORY"];
const DATA_FILES = ["journey.json", "digest-state.json", "tasks.json", "pending-tasks.json", "interview-state.json"];

export interface TrustReport {
  root: string;
  stored: { contextFilled: string[]; contextEmpty: string[]; dataFiles: string[]; hasIndex: boolean };
  egress: {
    automaticByDefault: boolean;
    cloudEmbeddings: boolean;
    digestTelegram: boolean;
    digestEmail: boolean;
    onDemand: string[];
  };
  leash: string[];
  control: { isGitRepo: boolean };
}

function nonEmpty(p: string): boolean {
  try {
    return readFileSync(p, "utf-8").trim().length > 0;
  } catch {
    return false;
  }
}

/** Strip C0/C1 control chars + DEL so a displayed value can't terminal-inject. */
function scrub(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, " ");
}

function digestChannels(root: string): { telegram: boolean; email: boolean } {
  try {
    const cfg = loadYaml(readFileSync(join(root, "config/digest.yaml"), "utf-8")) as {
      delivery?: {
        telegram?: { enabled?: unknown; webhookUrl?: unknown };
        email?: { enabled?: unknown; webhookUrl?: unknown };
      };
    };
    // A channel only actually SENDS when it's enabled AND has a non-empty
    // webhookUrl — mirror deliverDigest (daily-digest.ts) so we never over-warn.
    const on = (c: { enabled?: unknown; webhookUrl?: unknown } | undefined) =>
      !!c?.enabled && typeof c?.webhookUrl === "string" && c.webhookUrl.length > 0;
    return { telegram: on(cfg?.delivery?.telegram), email: on(cfg?.delivery?.email) };
  } catch {
    return { telegram: false, email: false }; // no config / unreadable → nothing configured
  }
}

export function agentLeash(): string[] {
  return [
    "send or reply to emails or messages",
    "publish, post, or share anything publicly (data rooms, public links)",
    "make git commits, pushes, or pull requests",
    "move money — payments or transfers",
    "delete or overwrite your files or data",
    "run shell commands that change state or reach the network",
    "call any external tool that writes or has side effects",
    "change its own permissions or these safety rules",
  ];
}

export function buildTrustReport(
  root: string,
  env: Record<string, string | undefined> = process.env,
): TrustReport {
  const contextFilled: string[] = [];
  const contextEmpty: string[] = [];
  for (const n of CONTEXT_FILES) {
    const p = join(root, "user", `${n}.md`);
    if (!existsSync(p)) continue;
    (nonEmpty(p) ? contextFilled : contextEmpty).push(`${n}.md`);
  }
  const dataFiles = DATA_FILES.filter((f) => existsSync(join(root, "data", f)));

  let hasIndex = false;
  try {
    hasIndex = readSignals(root).hasIndex;
  } catch {
    /* no index state */
  }

  const ch = digestChannels(root);
  // Match the REAL embed.ts opt-in gate exactly (only 1/true/yes/on count) so the
  // dashboard never falsely claims cloud egress for values like off/no/false/2.
  const cloudEmbeddings = ["1", "true", "yes", "on"].includes((env.RAG_EMBED_CLOUD || "").toLowerCase());
  const automaticByDefault = !(cloudEmbeddings || ch.telegram || ch.email);

  return {
    root,
    stored: { contextFilled, contextEmpty, dataFiles, hasIndex },
    egress: {
      automaticByDefault,
      cloudEmbeddings,
      digestTelegram: ch.telegram,
      digestEmail: ch.email,
      onDemand: [
        "seed web (fetch/search)",
        "seed drive (publish)",
        "seed update",
        "seed index with RAG_EMBED_CLOUD=1",
      ],
    },
    leash: agentLeash(),
    control: { isGitRepo: existsSync(join(root, ".git")) },
  };
}

export function renderTrustReport(r: TrustReport): string {
  const L: string[] = [];
  L.push("Who am I? — your Digital Seed, on this machine");
  L.push("");
  L.push("1) What's stored here — yours");
  L.push(`   Everything lives in ${scrub(r.root)} on this machine. There is no Digital Seed account or cloud.`);
  L.push(`   Context filled in: ${scrub(r.stored.contextFilled.join(", ")) || "(none yet)"}`);
  if (r.stored.contextEmpty.length) L.push(`   Started but empty:  ${scrub(r.stored.contextEmpty.join(", "))}`);
  L.push(`   Local data files:  ${scrub(r.stored.dataFiles.join(", ")) || "(none yet)"}`);
  L.push(`   Local search index: ${r.stored.hasIndex ? "present" : "none"}`);
  L.push("");
  L.push("2) What can leave this machine");
  L.push(
    `   By default, nothing leaves automatically.${
      r.egress.automaticByDefault ? "" : "  ⚠ something below is configured to send data out."
    }`,
  );
  L.push(
    `   Cloud embeddings (RAG_EMBED_CLOUD): ${
      r.egress.cloudEmbeddings ? "ON — text you index is sent to OpenAI" : "off (local only)"
    }`,
  );
  L.push(`   Digest delivery — Telegram: ${r.egress.digestTelegram ? "ON" : "off"}, Email: ${r.egress.digestEmail ? "ON" : "off"}`);
  L.push(`   Only when you run them: ${r.egress.onDemand.join("; ")}.`);
  L.push("   Full detail: docs/what-leaves-your-machine.md");
  L.push("");
  L.push("3) What your agent must ASK you first (a fresh, in-chat OK is required)");
  for (const a of r.leash) L.push(`   • ${scrub(a)}`);
  L.push("");
  L.push("4) Staying in control");
  L.push("   Your context and data are plain files you own — open, edit, or delete any of them freely.");
  if (r.control.isGitRepo) {
    L.push("   This is a git repo: `git status` shows what changed; `git restore <file>` undoes one file.");
  }
  L.push("   Before sharing anything public, run `seed privacy-scan`. Keep secrets in .env, never in docs.");
  return L.join("\n");
}
