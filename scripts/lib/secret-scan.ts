/**
 * Outbound content guard — scans a loaded context bundle for strings that look
 * like credentials before that content is allowed to leave the machine (e.g. a
 * model call to a third party). Two tiers:
 *  - NAMED patterns (vendor key prefixes, inline URL/DSN credentials, credential
 *    markers) — high signal, flagged on match.
 *  - GENERIC high-entropy blobs (long hex/base64 runs) — flagged ONLY when they
 *    actually look random, so long words / IDs / low-entropy runs don't train
 *    users to reflexively pass --send-anyway.
 * Every regex is bounded (no nested quantifiers) so there is no catastrophic
 * backtracking risk. This is a best-effort backstop, not a guarantee — the
 * first-run disclosure also warns the user never to store secrets in user/*.md.
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

// High-signal named patterns — a match here is a hit (non-global; used with .test).
const NAMED: Pattern[] = [
  { re: /sk-ant-[A-Za-z0-9_-]{10,}/, kind: "anthropic-key" },
  { re: /sk-proj-[A-Za-z0-9_-]{10,}/, kind: "openai-project-key" },
  { re: /sk-[A-Za-z0-9]{20,}/, kind: "openai-key" },
  { re: /sk_(?:live|test)_[A-Za-z0-9]{16,}/, kind: "stripe-key" },
  { re: /rk_(?:live|test)_[A-Za-z0-9]{16,}/, kind: "stripe-restricted-key" },
  { re: /AKIA[0-9A-Z]{16}/, kind: "aws-key" },
  { re: /AIza[0-9A-Za-z_-]{20,}/, kind: "google-key" },
  { re: /gh[opusr]_[A-Za-z0-9]{30,}/, kind: "github-token" }, // ghp_/gho_/ghu_/ghs_/ghr_
  { re: /github_pat_[A-Za-z0-9_]{20,}/, kind: "github-pat" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, kind: "slack-token" },
  { re: /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/, kind: "sendgrid-key" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, kind: "private-key" },
  { re: /Bearer\s+[A-Za-z0-9._-]{20,}/, kind: "bearer-token" },
  // credentials embedded inline in a URL / DSN, e.g. postgres://user:pass@host
  { re: /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/i, kind: "url-credential" },
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/, kind: "iban" },
  {
    re: /(?:password|passphrase|secret|api[_ ]?key|access[_ ]?key|secret[_ ]?key|token|seed phrase|mnemonic)\s*[:=]\s*\S{6,}/i,
    kind: "credential-marker",
  },
];

// Generic high-entropy blobs (global; flagged only past the entropy threshold).
const GENERIC: Pattern[] = [
  { re: /\b[A-Fa-f0-9]{32,}\b/g, kind: "hex-secret" },
  { re: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, kind: "base64-secret" },
];

// Shannon entropy (bits/char): high for random secrets, ~0 for repeats/words.
function entropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  let e = 0;
  for (const c in freq) {
    const p = freq[c] / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

const ENTROPY_MIN = 3.0;

export function scanForSecrets(bundle: ContextBundle): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const file of bundle.files) {
    const lines = file.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let matched = false;
      for (const { re, kind } of NAMED) {
        if (re.test(line)) {
          hits.push({ file: file.name, line: i + 1, kind });
          matched = true;
          break;
        }
      }
      if (matched) continue;
      for (const { re, kind } of GENERIC) {
        const ms = line.match(re);
        if (ms && ms.some((m) => entropy(m) >= ENTROPY_MIN)) {
          hits.push({ file: file.name, line: i + 1, kind });
          break;
        }
      }
    }
  }
  return hits;
}
