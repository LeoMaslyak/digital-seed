import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

export interface ChatConsent {
  version: 1;
  enabled: true;
  at: string;
  provider: string;
}

export function consentPath(root: string): string {
  return join(root, "data", "chat-consent.json");
}

export function loadChatConsent(root: string): ChatConsent | null {
  const p = consentPath(root);
  if (!existsSync(p)) return null;
  try {
    const obj = JSON.parse(readFileSync(p, "utf-8"));
    if (
      obj &&
      obj.version === 1 &&
      obj.enabled === true &&
      typeof obj.at === "string" &&
      typeof obj.provider === "string"
    ) {
      return obj as ChatConsent;
    }
  } catch {
    /* corrupt — treat as no consent */
  }
  return null;
}

export function saveChatConsent(root: string, provider: string, now?: string): ChatConsent {
  mkdirSync(join(root, "data"), { recursive: true });
  const p = consentPath(root);
  const tmp = p + ".tmp";
  const consent: ChatConsent = {
    version: 1,
    enabled: true,
    at: now ?? new Date().toISOString(),
    provider,
  };
  writeFileSync(tmp, JSON.stringify(consent, null, 2) + "\n", "utf-8");
  renameSync(tmp, p);
  return consent;
}

export function revokeChatConsent(root: string): boolean {
  const p = consentPath(root);
  if (existsSync(p)) {
    unlinkSync(p);
    return true;
  }
  return false;
}

export interface ResolveConsentInput {
  persisted: ChatConsent | null;
  resolvedProvider: string | null;
  yesFlag: boolean;
  isTTY: boolean;
}

export interface ResolveConsentOutput {
  allowed: boolean;
  needsFirstRun: boolean;
  providerChanged: boolean;
  source: "file" | "none";
  reason?: string;
}

export function resolveConsent(input: ResolveConsentInput): ResolveConsentOutput {
  const { persisted, resolvedProvider } = input;

  // No persisted consent — needs first-run disclosure
  if (!persisted) {
    return {
      allowed: false,
      needsFirstRun: true,
      providerChanged: false,
      source: "none",
    };
  }

  // Persisted consent exists but provider changed — needs re-disclosure
  if (resolvedProvider && persisted.provider !== resolvedProvider) {
    return {
      allowed: false,
      needsFirstRun: true,
      providerChanged: true,
      source: "file",
    };
  }

  // Persisted consent with matching provider — allowed
  return {
    allowed: true,
    needsFirstRun: false,
    providerChanged: false,
    source: "file",
  };
}
