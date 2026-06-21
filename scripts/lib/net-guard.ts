/**
 * Network guard — SSRF defense for outbound HTTP(S) requests.
 *
 * `web fetch/scrape/bulk/research` and the file downloader can be pointed at
 * (or redirected to) any URL, including a user-typed or agent/injection-supplied
 * one. Without a guard those primitives reach loopback, link-local, RFC1918, ULA
 * and cloud-metadata endpoints (e.g. http://169.254.169.254/) — classic SSRF.
 *
 * This module:
 *   - rejects non-http(s) schemes (file:, gopher:, data:, etc.),
 *   - resolves the host and rejects any address in a private/reserved range,
 *   - exposes `safeFetch`, which validates the URL, follows redirects MANUALLY,
 *     and re-validates every hop (so an allowlisted-looking URL can't bounce
 *     into metadata via a 30x — TOCTOU/redirect SSRF).
 *
 * Local-CLI threat model caps the worst case, but agent-driven / injected URLs
 * make this a real surface, so we fail closed.
 */

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/** Max redirect hops before we give up (matches typical browser/library caps). */
const MAX_REDIRECTS = 5;

/**
 * Is this IP literal (v4 or v6) in a private / reserved / loopback / link-local /
 * ULA / cloud-metadata range that an outbound research fetch must never reach?
 */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  // Not a parseable IP literal — caller resolves the host first, so treat
  // an unparseable value as unsafe rather than silently allowing it.
  return true;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // malformed → unsafe
  }
  const [a, b] = parts;

  if (a === 0) return true;                       // 0.0.0.0/8 "this network"
  if (a === 127) return true;                     // loopback 127.0.0.0/8
  if (a === 10) return true;                      // RFC1918 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 172.16.0.0/12
  if (a === 192 && b === 168) return true;        // RFC1918 192.168.0.0/16
  if (a === 169 && b === 254) return true;        // link-local + metadata 169.254.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 192 && b === 0) return true;          // 192.0.0.0/24 (incl. TEST-NET-1 192.0.2.0/24)
  if (a === 198 && (b === 18 || b === 19)) return true;    // benchmark 198.18.0.0/15
  if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2 198.51.100.0/24
  if (a === 203 && b === 0 && parts[2] === 113) return true;  // TEST-NET-3 203.0.113.0/24
  if (a >= 224) return true;                      // multicast/reserved 224.0.0.0/4 + 240/4

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().split("%")[0]; // strip zone id (fe80::1%eth0)

  if (lower === "::" || lower === "::1") return true; // unspecified + loopback

  // IPv4-mapped / -compatible (::ffff:169.254.169.254, ::127.0.0.1) — recurse on the v4 tail.
  const v4Tail = lower.match(/(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (v4Tail) return isPrivateIPv4(v4Tail[1]);

  // Expand to compare leading bits without a full parser.
  if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;   // ULA fc00::/7
  if (lower.startsWith("ff")) return true;                             // multicast ff00::/8

  return false;
}

/**
 * Validate that `rawUrl` is a safe outbound target: http(s) only, and its host
 * does not (after DNS resolution) point at a private/reserved address.
 *
 * Throws on any violation. Returns the parsed URL on success.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Refusing to fetch invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Refusing to fetch non-http(s) URL (scheme "${parsed.protocol}"): ${rawUrl}`,
    );
  }

  const host = parsed.hostname;
  if (!host) {
    throw new Error(`Refusing to fetch URL with no host: ${rawUrl}`);
  }

  // If the host is an IP literal, check it directly (covers bracketed IPv6).
  const literal = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(literal)) {
    if (isPrivateAddress(literal)) {
      throw new Error(`Refusing to fetch private/reserved address: ${rawUrl}`);
    }
    return parsed;
  }

  // Hostname → resolve every address it maps to and reject if ANY is private.
  // This defeats multi-A-record tricks, but does NOT fully close DNS rebinding:
  // the platform fetch() re-resolves at connect time, so a low-TTL attacker
  // could return a public IP to this lookup and a private/metadata IP to fetch().
  // For this local, single-user CLI that residual is accepted; a hardened
  // deployment should pin the validated IP at connect time (custom dispatcher).
  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error(`Refusing to fetch — DNS resolution failed for host: ${host}`);
  }

  if (records.length === 0) {
    throw new Error(`Refusing to fetch — host did not resolve: ${host}`);
  }

  for (const { address } of records) {
    if (isPrivateAddress(address)) {
      throw new Error(
        `Refusing to fetch — host ${host} resolves to private/reserved address ${address}: ${rawUrl}`,
      );
    }
  }

  return parsed;
}

/**
 * SSRF-safe `fetch`: validates the URL, disables automatic redirects, and
 * re-validates every redirect hop so a 30x can't bounce an allowlisted-looking
 * URL into metadata/localhost. Caps the hop count.
 *
 * Drop-in for `fetch(url, opts)` in research/download paths.
 */
export async function safeFetch(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(currentUrl);

    const res = await fetch(currentUrl, { ...opts, redirect: "manual" });

    // Bun/undici surface manual redirects as status 3xx with a Location header
    // (and sometimes as an opaqueredirect response with status 0).
    const isRedirect =
      (res.status >= 300 && res.status < 400) || res.type === "opaqueredirect";
    if (!isRedirect) {
      return res;
    }

    const location = res.headers.get("location");
    if (!location) {
      // Redirect with no Location — nothing safe to follow; hand it back.
      return res;
    }

    // Resolve relative redirects against the current URL, then re-validate.
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(`Refusing to fetch — too many redirects (>${MAX_REDIRECTS}): ${url}`);
}
