/**
 * Web fetching library — fetch URLs as clean markdown/text.
 *
 * Supports:
 *   - Cloudflare Markdown for Agents (Accept: text/markdown)
 *   - HTML → clean text via @mozilla/readability + jsdom
 *   - CSS selector extraction via cheerio
 *
 * No paywall handling, no playwright, no auth — keeps it simple.
 */

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { safeFetch } from "./net-guard.ts";

export interface FetchOptions {
  timeout?: number;    // ms, default 15000
  userAgent?: string;
  maxChars?: number;   // truncate output
}

const DEFAULT_UA = "Digital-Seed/0.2 (user research tool)";
const DEFAULT_TIMEOUT = 15_000;

/**
 * Hard byte cap on any fetched response body before it is parsed. A hostile or
 * runaway server can otherwise stream gigabytes into JSDOM/cheerio/readability
 * and exhaust memory. We read the stream incrementally and stop at the cap.
 */
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024; // 8 MiB

// ── Core fetch helper ────────────────────────────────────────────────

async function rawFetch(url: string, opts: FetchOptions = {}, accept?: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? DEFAULT_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      "User-Agent": opts.userAgent ?? DEFAULT_UA,
    };
    if (accept) headers["Accept"] = accept;

    // SSRF guard: validates scheme + resolves host (rejects loopback/link-local/
    // RFC1918/ULA/metadata) and re-validates each redirect hop.
    return await safeFetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a response body as text, but stop after MAX_RESPONSE_BYTES so a hostile
 * server can't exhaust memory. Falls back to `res.text()` if the body isn't a
 * readable stream.
 */
async function readCappedText(res: Response): Promise<string> {
  const body = res.body;
  if (!body) return res.text();

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        const allowed = value.byteLength - (received - MAX_RESPONSE_BYTES);
        out += decoder.decode(value.subarray(0, Math.max(0, allowed)), { stream: true });
        truncated = true;
        break;
      }
      out += decoder.decode(value, { stream: true });
    }
  } finally {
    // Stop downloading the rest of an oversized/streaming body.
    await reader.cancel().catch(() => {});
  }
  out += decoder.decode();

  if (truncated) {
    out += `\n\n[...response truncated at ${MAX_RESPONSE_BYTES} bytes]`;
  }
  return out;
}

function truncate(text: string, maxChars?: number): string {
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[...truncated at " + maxChars + " chars]";
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Fetch a URL as markdown. Tries Cloudflare markdown first,
 * then falls back to readability extraction, then raw text.
 */
export async function fetchMarkdown(url: string, opts: FetchOptions = {}): Promise<string> {
  // 1. Try markdown via Accept header (Cloudflare Workers / Jina)
  try {
    const res = await rawFetch(url, opts, "text/markdown");
    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      const body = await readCappedText(res);
      // If server actually returned markdown (not HTML)
      if (ct.includes("markdown") || (!ct.includes("html") && !body.trimStart().startsWith("<"))) {
        return truncate(body, opts.maxChars);
      }
      // Got HTML back — fall through to readability
      return extractWithReadability(url, body, opts);
    }
  } catch {
    // Network error — try normal fetch
  }

  // 2. Normal HTML fetch → readability
  try {
    const res = await rawFetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await readCappedText(res);
    return extractWithReadability(url, html, opts);
  } catch (e) {
    throw new Error(`Failed to fetch ${url}: ${(e as Error).message}`);
  }
}

/**
 * JSDOM options that keep parsing of untrusted HTML inert:
 *  - `runScripts` is left UNSET → no inline/`<script>` execution.
 *  - a no-op `resources` loader (default) → no external sub-resource fetches.
 * We construct DOMs ONLY with these options for attacker-controlled HTML.
 */
const SAFE_JSDOM_OPTS = { pretendToBeVisual: false } as const;

function extractWithReadability(url: string, html: string, opts: FetchOptions): string {
  try {
    const dom = new JSDOM(html, { url, ...SAFE_JSDOM_OPTS });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent) {
      const text = article.title
        ? `# ${article.title}\n\n${article.textContent.trim()}`
        : article.textContent.trim();
      return truncate(text, opts.maxChars);
    }
  } catch {
    // Readability failed — fall through
  }

  // Last resort: strip HTML tags
  return truncate(stripHtmlTags(html), opts.maxChars);
}

/**
 * Fetch a URL and extract article content (title + body text).
 */
export async function fetchArticle(url: string): Promise<{ title: string; content: string }> {
  const res = await rawFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await readCappedText(res);

  const dom = new JSDOM(html, { url, ...SAFE_JSDOM_OPTS });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article) {
    return { title: article.title ?? "", content: article.textContent?.trim() ?? "" };
  }

  // Fallback
  return { title: "", content: stripHtmlTags(html) };
}

/**
 * Fetch a URL and extract elements matching a CSS selector.
 * Returns an array of text content for each matched element.
 */
/**
 * Fetch web context for a company/topic name via Jina search.
 * Returns up to 3000 chars of context, or empty string on failure.
 */
export async function fetchCaseContext(topicName: string): Promise<string> {
  console.log(`🌐 Fetching web context for: ${topicName}...`);
  const searchUrl = `https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(topicName + " company financials overview 2024")}`;
  try {
    const text = await fetchMarkdown(searchUrl, { timeout: 20_000 });
    return text.length > 3000 ? text.slice(0, 3000) : text;
  } catch {
    return "";
  }
}

export async function fetchSelector(
  url: string,
  selector: string,
  opts: FetchOptions = {},
): Promise<string[]> {
  const res = await rawFetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await readCappedText(res);

  const $ = cheerio.load(html);
  const results: string[] = [];
  $(selector).each((_, el) => {
    const text = $(el).text().trim();
    if (text) results.push(text);
  });

  return results;
}
