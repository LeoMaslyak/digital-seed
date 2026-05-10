/**
 * Playwright browser fetcher — for JS-heavy sites that need a real browser.
 *
 * Requires: bunx playwright install chromium
 */

export async function fetchWithBrowser(
  url: string,
  opts?: { selector?: string; timeout?: number },
): Promise<{ text: string; html: string }> {
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    throw new Error("Playwright not installed. Run: bunx playwright install chromium");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: opts?.timeout ?? 30_000,
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

    return { text, html };
  } finally {
    await browser.close();
  }
}
