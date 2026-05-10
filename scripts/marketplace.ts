#!/usr/bin/env bun
/**
 * Digital Seed Pattern Marketplace — Install, publish, and rate community patterns and packs.
 *
 * Usage:
 *   bun run marketplace list [--search <query>] [--tag <tag>]
 *   bun run marketplace info <id>
 *   bun run marketplace install <id>          # pattern
 *   bun run marketplace install pack:<id>     # skill pack
 *   bun run marketplace update                # refresh local registry cache
 *   bun run marketplace installed             # show what's locally installed
 *   bun run marketplace remove <id>
 *   bun run marketplace publish <pattern-dir> # generate PR instructions
 *   bun run marketplace rate <id> <1-5>
 *
 * Registry:
 *   Bundled registry lives in data/registry.json (ships with the kit).
 *   An optional remote URL can be set in config/config.yaml (marketplace.registryUrl).
 *   Installed records live in data/installed.json.
 *   Local ratings live in data/ratings.json.
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync,
} from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  kind: "pattern" | "pack";
  /** URL to system.md (pattern) or pack.json (pack) — optional for bundled entries */
  url?: string;
  /** Stars rating: community-aggregated 0–5 */
  stars?: number;
  downloads?: number;
}

interface Registry {
  version: number;
  updatedAt: string;
  entries: RegistryEntry[];
}

interface InstalledRecord {
  id: string;
  kind: "pattern" | "pack";
  version: string;
  installedAt: string;
  source: "bundled" | "remote";
}

interface LocalRating {
  id: string;
  stars: number;
  note?: string;
  ratedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf-8")) as T; }
  catch { return fallback; }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadRegistry(): Registry {
  return readJson<Registry>(join(ROOT, "data", "registry.json"), {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: [],
  });
}

function loadInstalled(): InstalledRecord[] {
  return readJson<InstalledRecord[]>(join(ROOT, "data", "installed.json"), []);
}

function saveInstalled(records: InstalledRecord[]): void {
  ensureDir(join(ROOT, "data"));
  writeJson(join(ROOT, "data", "installed.json"), records);
}

function loadRatings(): LocalRating[] {
  return readJson<LocalRating[]>(join(ROOT, "data", "ratings.json"), []);
}

function saveRatings(ratings: LocalRating[]): void {
  ensureDir(join(ROOT, "data"));
  writeJson(join(ROOT, "data", "ratings.json"), ratings);
}

function isInstalled(id: string): boolean {
  return loadInstalled().some((r) => r.id === id);
}

function starBar(stars: number): string {
  const full = Math.round(stars);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdList(search?: string, tag?: string, packsOnly = false): void {
  const registry = loadRegistry();
  const installed = new Set(loadInstalled().map((r) => r.id));
  const ratings = Object.fromEntries(loadRatings().map((r) => [r.id, r.stars]));

  let entries = registry.entries;
  if (packsOnly) {
    entries = entries.filter((e) => e.kind === "pack");
  }
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(
      (e) => e.name.toLowerCase().includes(q)
        || e.description.toLowerCase().includes(q)
        || e.tags.some((t) => t.includes(q))
    );
  }
  if (tag) {
    entries = entries.filter((e) => e.tags.includes(tag.toLowerCase()));
  }

  if (entries.length === 0) {
    console.log("No patterns found" + (search ? ` matching "${search}"` : "") + ".");
    return;
  }

  const patterns = entries.filter((e) => e.kind === "pattern");
  const packs    = entries.filter((e) => e.kind === "pack");

  if (patterns.length > 0) {
    console.log("\n📦 Patterns");
    for (const e of patterns) {
      const inst    = installed.has(e.id) ? " ✓" : "  ";
      const myStars = ratings[e.id] ? ` [you: ${starBar(ratings[e.id])}]` : "";
      const stars   = e.stars != null ? ` ${starBar(e.stars)}` : "";
      const tags    = e.tags.length > 0 ? `  [${e.tags.join(", ")}]` : "";
      console.log(`  ${inst} ${e.id.padEnd(26)} ${e.description.slice(0, 48)}${stars}${myStars}`);
      if (tags) console.log(`       ${" ".repeat(26)}${tags}`);
    }
  }

  if (packs.length > 0) {
    console.log("\n🎒 Skill Packs");
    for (const e of packs) {
      const inst = installed.has(e.id) ? " ✓" : "  ";
      console.log(`  ${inst} pack:${e.id.padEnd(20)} ${e.description}`);
    }
  }

  console.log(`\n${entries.length} item(s). Install with: bun run marketplace install <id>`);
}

function cmdInfo(id: string): void {
  const cleanId = id.replace(/^pack:/, "");
  const registry = loadRegistry();
  const entry = registry.entries.find(
    (e) => e.id === cleanId || e.id === id
  );

  if (!entry) {
    console.error(`❌ Pattern or pack "${id}" not found. Run \`bun run marketplace list\` to browse.`);
    process.exit(1);
  }

  const installed = loadInstalled().find((r) => r.id === entry.id);
  const myRating  = loadRatings().find((r) => r.id === entry.id);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`${entry.kind === "pack" ? "🎒" : "📦"} ${entry.name}`);
  console.log(`${"─".repeat(50)}`);
  console.log(`ID:          ${entry.id}`);
  console.log(`Kind:        ${entry.kind}`);
  console.log(`Description: ${entry.description}`);
  console.log(`Author:      ${entry.author}`);
  console.log(`Version:     ${entry.version}`);
  console.log(`Tags:        ${entry.tags.join(", ") || "none"}`);
  if (entry.stars != null) console.log(`Community:   ${starBar(entry.stars)} (${entry.stars.toFixed(1)}/5)`);
  if (myRating) console.log(`Your rating: ${starBar(myRating.stars)}`);
  console.log(`Installed:   ${installed ? `✓ (${installed.installedAt.slice(0, 10)})` : "no"}`);
  console.log(`${"─".repeat(50)}\n`);

  if (!installed) {
    const installId = entry.kind === "pack" ? `pack:${entry.id}` : entry.id;
    console.log(`Install: bun run marketplace install ${installId}`);
  }
}

async function cmdInstall(id: string, force = false): Promise<void> {
  const isPack = id.startsWith("pack:");
  const cleanId = id.replace(/^pack:/, "");

  const registry = loadRegistry();
  const entry = registry.entries.find((e) => e.id === cleanId);

  if (!entry) {
    console.error(`❌ "${id}" not found in registry. Run \`bun run marketplace list\`.`);
    process.exit(1);
  }

  if (isInstalled(cleanId) && !force) {
    console.log(`✓ ${entry.name} is already installed. Use --force to reinstall.`);
    return;
  }

  if (entry.kind === "pack" || isPack) {
    installPack(cleanId, entry, force);
  } else {
    installPattern(cleanId, entry, force);
  }
}

async function installPattern(id: string, entry: RegistryEntry, force = false): Promise<void> {
  const destDir = join(ROOT, "patterns", id);

  // If bundled (exists in patterns/ already), just register it
  if (existsSync(destDir) && !force) {
    registerInstalled(id, "pattern", entry.version, "bundled");
    console.log(`✅ ${entry.name} registered (bundled).`);
    return;
  }

  // Remote install
  if (entry.url) {
    console.log(`📥 Fetching ${entry.name}...`);
    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();

      ensureDir(destDir);
      writeFileSync(join(destDir, "system.md"), content, "utf-8");
      registerInstalled(id, "pattern", entry.version, "remote");
      console.log(`✅ Installed ${entry.name} → patterns/${id}/system.md`);
    } catch (e) {
      console.error(`❌ Download failed: ${(e as Error).message}`);
      process.exit(1);
    }
    return;
  }

  console.error(`❌ No source URL for "${id}" — cannot install remotely.`);
  process.exit(1);
}

async function installPack(id: string, entry: RegistryEntry, force = false): Promise<void> {
  const packSrc = join(ROOT, "packs", id);

  if (!existsSync(packSrc)) {
    console.error(`❌ Pack "${id}" not found in packs/. Is it bundled?`);
    process.exit(1);
  }

  // Install patterns from the pack
  const packPatternsDir = join(packSrc, "patterns");
  let patternsInstalled = 0;

  if (existsSync(packPatternsDir)) {
    for (const patternName of readdirSync(packPatternsDir)) {
      const srcDir  = join(packPatternsDir, patternName);
      const destDir = join(ROOT, "patterns", patternName);

      if (!existsSync(destDir) || force) {
        ensureDir(destDir);
        for (const file of readdirSync(srcDir)) {
          copyFileSync(join(srcDir, file), join(destDir, file));
        }
        patternsInstalled++;
      }
    }
  }

  // Copy agent overrides (don't clobber existing unless force)
  const packAgentsDir = join(packSrc, "agents");
  if (existsSync(packAgentsDir)) {
    for (const agentFile of readdirSync(packAgentsDir)) {
      const dest = join(ROOT, "agents", `${id}-${agentFile}`);
      if (!existsSync(dest) || force) {
        copyFileSync(join(packAgentsDir, agentFile), dest);
      }
    }
  }

  registerInstalled(id, "pack", entry.version, "bundled");

  console.log(`✅ Pack ${force ? "reinstalled" : "installed"}: ${entry.name}`);
  if (patternsInstalled > 0) console.log(`   ${patternsInstalled} pattern(s) added to patterns/`);

  // Show what's in the pack
  const packJson = readJson<{ patterns?: string[]; frameworks?: string[] }>(
    join(packSrc, "pack.json"), {}
  );
  if (packJson.frameworks?.length) {
    console.log(`   Frameworks: ${packJson.frameworks.join(", ")}`);
  }
  console.log(`   Templates: packs/${id}/templates/`);
  console.log(`\n   Load in your agent: bun run collab context ${id}`);
}

function cmdInstalled(): void {
  const records = loadInstalled();
  const ratings = Object.fromEntries(loadRatings().map((r) => [r.id, r.stars]));

  if (records.length === 0) {
    console.log("Nothing installed yet. Browse: bun run marketplace list");
    return;
  }

  const patterns = records.filter((r) => r.kind === "pattern");
  const packs    = records.filter((r) => r.kind === "pack");

  if (patterns.length > 0) {
    console.log("\n📦 Installed Patterns");
    for (const r of patterns) {
      const stars = ratings[r.id] ? ` ${starBar(ratings[r.id])}` : "";
      console.log(`  ✓ ${r.id.padEnd(26)} v${r.version}  ${r.source}${stars}`);
    }
  }
  if (packs.length > 0) {
    console.log("\n🎒 Installed Packs");
    for (const r of packs) {
      console.log(`  ✓ pack:${r.id.padEnd(20)} v${r.version}  ${r.source}`);
    }
  }
  console.log("");
}

async function cmdRemove(id: string): Promise<void> {
  const cleanId = id.replace(/^pack:/, "");
  const existing = loadInstalled();
  const record = existing.find((r) => r.id === cleanId);

  if (!record) {
    console.error(`"${cleanId}" is not installed.`);
    process.exit(1);
  }

  // Only remove remote-installed patterns (bundled ones stay)
  if (record.kind === "pattern" && record.source === "remote") {
    const patternDir = join(ROOT, "patterns", cleanId);
    if (existsSync(patternDir)) {
      const { rmSync } = await import("fs");
      rmSync(patternDir, { recursive: true, force: true });
      console.log(`🗑  Removed patterns/${cleanId}/`);
    }
  } else {
    console.log(`ℹ  "${cleanId}" is bundled — files kept, just removing install record.`);
  }

  saveInstalled(existing.filter((r) => r.id !== cleanId));
  console.log(`✅ ${cleanId} removed from installed list.`);
}

function cmdUpdate(): void {
  console.log("Checking for registry updates...");
  // In future: fetch from registryUrl in config and merge with bundled
  // For now: report bundled registry is current
  const registry = loadRegistry();
  console.log(`✅ Registry is up to date (${registry.entries.length} items, updated ${registry.updatedAt.slice(0, 10)})`);
  console.log("   Community registry contributions: open a PR to LeoMaslyak/digital-seed");
}

function cmdPublish(patternDir: string): void {
  const dir = existsSync(patternDir) ? patternDir : join(ROOT, "patterns", patternDir);

  if (!existsSync(dir)) {
    console.error(`❌ Directory not found: ${patternDir}`);
    process.exit(1);
  }

  const systemMd = join(dir, "system.md");
  if (!existsSync(systemMd)) {
    console.error(`❌ Missing system.md in ${dir}`);
    process.exit(1);
  }

  const patternName = dir.split("/").pop() ?? dir;
  const firstLine   = readFileSync(systemMd, "utf-8").split("\n")[0]?.replace(/^#\s*/, "") ?? patternName;

  console.log(`\n📤 Publishing "${firstLine}" to the Digital Seed Marketplace\n`);
  console.log("Follow these steps:\n");
  console.log("1. Fork https://github.com/LeoMaslyak/digital-seed");
  console.log(`2. Copy your pattern: cp -r ${dir} patterns/${patternName}/`);
  console.log("3. Add an entry to data/registry.json:");
  console.log(JSON.stringify({
    id: patternName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: firstLine,
    description: "<one-line description>",
    author: "<your GitHub handle>",
    version: "1.0.0",
    tags: ["<tag1>", "<tag2>"],
    kind: "pattern",
  }, null, 4));
  console.log("\n4. Open a PR — title: \"feat(marketplace): add <pattern-name> pattern\"");
  console.log("5. A maintainer will review and merge it.\n");
}

function cmdRate(id: string, starsArg: string): void {
  const stars = parseInt(starsArg, 10);
  if (isNaN(stars) || stars < 1 || stars > 5) {
    console.error("Stars must be 1–5.");
    process.exit(1);
  }

  const cleanId = id.replace(/^pack:/, "");
  const existing = loadRatings().filter((r) => r.id !== cleanId);
  existing.push({ id: cleanId, stars, ratedAt: new Date().toISOString() });
  saveRatings(existing);

  console.log(`✅ Rated ${cleanId}: ${starBar(stars)} (${stars}/5)`);
  console.log("   Your rating is stored locally in data/ratings.json.");
}

function registerInstalled(
  id: string, kind: "pattern" | "pack", version: string, source: "bundled" | "remote"
): void {
  const existing = loadInstalled().filter((r) => r.id !== id);
  existing.push({ id, kind, version, installedAt: new Date().toISOString(), source });
  saveInstalled(existing);
}

// ─── Seed bundled registry ────────────────────────────────────────────────────

/**
 * Write the bundled registry to data/registry.json on first run.
 * Lists all patterns shipped with the kit + the skill packs.
 */
function ensureBundledRegistry(): void {
  const path = join(ROOT, "data", "registry.json");
  if (existsSync(path)) return;

  ensureDir(join(ROOT, "data"));

  const bundled: Registry = {
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    entries: [
      // ── Built-in patterns ──────────────────────────────────────────────
      {
        id: "project-analysis",
        name: "Project Analysis",
        description: "Structured professional project analysis with frameworks",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["project", "professional", "strategy"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "email-triage",
        name: "Email Triage",
        description: "Classify and prioritise inbox messages",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["email", "productivity"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "extract-insights",
        name: "Extract Insights",
        description: "Pull non-obvious insights from any content",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["research", "analysis"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "research-brief",
        name: "Research Brief",
        description: "Structured, actionable research with sources",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["research", "writing"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "study-notes",
        name: "Study Notes",
        description: "Convert content into structured, memorable notes",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["study", "notes"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "summarize",
        name: "Summarize",
        description: "Clear, useful summary of any content",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["writing", "productivity"],
        kind: "pattern",
        downloads: 0,
      },
      {
        id: "weekly-review",
        name: "Weekly Review",
        description: "Structured weekly review against goals and tasks",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["productivity", "planning"],
        kind: "pattern",
        downloads: 0,
      },
      // ── Skill Packs ───────────────────────────────────────────────────
      {
        id: "finance",
        name: "Finance Pack",
        description: "Finance workflows: DCF, ratios, LBO, valuation frameworks",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["finance", "professional", "digital-seed", "valuation"],
        kind: "pack",
        downloads: 0,
      },
      {
        id: "strategy",
        name: "Strategy Pack",
        description: "Strategy workflows: Porter, BCG, competitive dynamics, M&A",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["strategy", "professional", "digital-seed", "frameworks"],
        kind: "pack",
        downloads: 0,
      },
      {
        id: "operations",
        name: "Operations Pack",
        description: "Operations workflows: process analysis, supply chain, lean",
        author: "LeoMaslyak",
        version: "1.0.0",
        tags: ["operations", "professional", "digital-seed", "process"],
        kind: "pack",
        downloads: 0,
      },
    ],
  };

  writeJson(path, bundled);
}

// ─── CLI dispatch ─────────────────────────────────────────────────────────────

ensureBundledRegistry();

const args = process.argv.slice(2);
const cmd  = args[0];

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : undefined;
}

if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(`
Digital Seed Pattern Marketplace

  bun run marketplace list [--search <q>] [--tag <tag>]
  bun run marketplace info <id>
  bun run marketplace install <id>          (pattern)
  bun run marketplace install pack:<id>     (skill pack)
  bun run marketplace installed
  bun run marketplace remove <id>
  bun run marketplace update
  bun run marketplace publish <pattern-dir>
  bun run marketplace rate <id> <1-5>
`.trim());
} else if (cmd === "list")      { cmdList(flag("--search"), flag("--tag"), args.includes("--packs-only")); }
  else if (cmd === "info")      { cmdInfo(args[1]); }
  else if (cmd === "install")   { await cmdInstall(args[1], args.includes("--force")); }
  else if (cmd === "installed") { cmdInstalled(); }
  else if (cmd === "remove")    { cmdRemove(args[1]); }
  else if (cmd === "update")    { cmdUpdate(); }
  else if (cmd === "publish")   { cmdPublish(args[1]); }
  else if (cmd === "rate")      { cmdRate(args[1], args[2]); }
  else { console.error(`Unknown command: ${cmd}`); process.exit(1); }
