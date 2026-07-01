/**
 * Outbound content guard — scans a loaded context bundle for strings that look
 * like credentials before that content is allowed to leave the machine (e.g. in
 * a digest, a published artifact, or a model call to a third party). Every
 * regex here is deliberately non-global (no `g` flag) so repeated `.test()`
 * calls across many lines never trip on stale `lastIndex` state, and every
 * pattern is a small bounded match with no nested quantifiers, so there is no
 * catastrophic-backtracking risk.
 */
import type { ContextBundle } from "./context-bundle.ts";

export interface SecretHit {
  file: string;
  line: number;
  kind: string;
}

interface Pattern {
  re: RegExp;
  kind: string;
}

const PATTERNS: Pattern[] = [
  { re: /sk-ant-[A-Za-z0-9_-]{10,}/, kind: "anthropic-key" },
  { re: /sk-proj-[A-Za-z0-9_-]{10,}/, kind: "openai-project-key" },
  { re: /sk-[A-Za-z0-9]{20,}/, kind: "openai-key" },
  { re: /AKIA[0-9A-Z]{16}/, kind: "aws-key" },
  { re: /AIza[0-9A-Za-z_-]{20,}/, kind: "google-key" },
  { re: /ghp_[0-9A-Za-z]{30,}/, kind: "github-token" },
  { re: /xox[baprs]-[0-9A-Za-z-]{10,}/, kind: "slack-token" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, kind: "private-key" },
  { re: /Bearer\s+[A-Za-z0-9._-]{20,}/, kind: "bearer-token" },
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/, kind: "iban" },
  { re: /(?:password|secret|passphrase|seed phrase)\s*[:=]\s*\S{6,}/i, kind: "password-marker" },
  { re: /\b[A-Fa-f0-9]{40,}\b/, kind: "hex-secret" },
  { re: /\b[A-Za-z0-9+/]{40,}={0,2}\b/, kind: "base64-secret" },
];

export function scanForSecrets(bundle: ContextBundle): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const file of bundle.files) {
    const lines = file.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { re, kind } of PATTERNS) {
        if (re.test(line)) {
          hits.push({ file: file.name, line: i + 1, kind });
          break;
        }
      }
    }
  }
  return hits;
}
