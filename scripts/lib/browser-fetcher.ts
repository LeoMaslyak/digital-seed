/**
 * Playwright browser fetcher — for JS-heavy sites that need a real browser.
 *
 * Requires: bunx playwright install chromium
 */

import { assertSafeUrl } from "./net-guard.ts";

/**
 * Hard cap on the text/HTML we pull out of a page before returning it to a
 * caller (which may concatenate it into an AI prompt). A hostile page can grow
 * the DOM without bound; cap so it can't exhaust memory downstream.
 */
const MAX_BROWSER_CHARS = 2_000_000; // ~2M chars

function cap(s: string): string {
  return s.length > MAX_BROWSER_CHARS
    ? s.slice(0, MAX_BROWSER_CHARS) + "\n\n[...truncated]"
    : s;
}

export async function fetchWithBrowser(
  url: string,
  opts?: { selector?: string; timeout?: number },
): Promise<{ text: string; html: string }> {
  // SSRF guard: a real browser bypasses the fetch() guard entirely, so validate
  // the navigation target up front (scheme + private/reserved/metadata host).
  await assertSafeUrl(url);

  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    throw new Error("Playwright not installed. Run: bunx playwright install chromium");
  }

  const timeout = opts?.timeout ?? 30_000;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // Bound the whole interaction (parse/render guard) so a page that never
    // reaches "networkidle" can't hang the CLI indefinitely.
    page.setDefaultTimeout(timeout);
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout,
    });

    let text: string;
    let html: string;

    if (opts?.selector) {
      const elements = await page.$$(opts.selector);
      const texts: string[] = [];
      for (const el of elements) {
        const t = await el.textContent();
        if (t?.trim()) texts.push(t.trim());
      }
      text = texts.join("\n");
      html = await page.content();
    } else {
      text = await page.evaluate(() => document.body.innerText);
      html = await page.content();
    }

    return { text: cap(text), html: cap(html) };
  } finally {
    await browser.close();
  }
}
