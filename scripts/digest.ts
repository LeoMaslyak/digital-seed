#!/usr/bin/env bun
/**
 * Digital Seed Daily Digest CLI
 *
 * Usage:
 *   bun run digest              — print today's digest in markdown
 *   bun run digest --text       — plain text (Telegram-safe)
 *   bun run digest --json       — JSON output for dashboard
 *   bun run digest --deliver    — generate + run delivery hooks
 *   bun run digest --save       — save to logs/digests/YYYY-MM-DD.md
 */

import { join, dirname } from "path";
import {
  generateDigest,
  formatDigest,
  deliverDigest,
  loadDigestConfig,
} from "../core/src/daily-digest.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);

const wantJson    = args.includes("--json");
const wantText    = args.includes("--text");
const wantDeliver = args.includes("--deliver");
const wantSave    = args.includes("--save");

const digest = generateDigest(ROOT);

const format = wantJson ? "json" : wantText ? "text" : "markdown";
console.log(formatDigest(digest, format));

if (wantDeliver || wantSave) {
  const config = loadDigestConfig(ROOT);
  if (wantSave && !config.delivery.file?.enabled) {
    config.delivery.file = { enabled: true };
  }
  const results = await deliverDigest(digest, config, ROOT);
  if (results.length > 0) {
    console.log("\nDelivery:");
    results.forEach((r) => console.log(" ", r));
  }
}
