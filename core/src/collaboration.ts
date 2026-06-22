/**
 * Digital Seed Collaboration Layer — Shared project spaces with personal context separation.
 *
 * Architecture overview:
 *
 *   collab/                         ← git-tracked (shared with teammates)
 *     projects/<name>/
 *       config.json                 ← project metadata, members
 *       shared/
 *         notes.md                  ← shared notes any member can edit
 *         decisions.md              ← key decisions log
 *         tasks.md                  ← group action items
 *     study-groups/<name>/
 *       config.json                 ← group metadata
 *       context.md                  ← merged shared context
 *       members/
 *         <handle>.md               ← each member's contribution
 *
 *   user/                           ← gitignored (always local)
 *   data/                           ← gitignored (always local)
 *   logs/                           ← gitignored (always local)
 *
 * Personal context NEVER flows into collab/:
 *   - user/USER.md, user/GOALS.md, user/MEMORY.md, user/PREFERENCES.md
 *   - .env files, API keys, data/ runtime files
 *
 * The pre-commit hook (scripts/pre-commit-check.ts) enforces this boundary
 * by scanning staged collab/ files for personal data patterns before every commit.
 *
 * Learning Group Mode:
 *   Each member adds their own analysis under members/<handle>.md.
 *   context.md is auto-merged from all member contributions.
 *   Perfect for general project analysis groups working on the same material.
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  readdirSync, appendFileSync, statSync,
} from "fs";
import { join, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CollabProject {
  id: string;
  name: string;
  description: string;
  members: string[];          // GitHub handles or display names
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  domain?: string;            // e.g. "Finance I", "Strategy"
  topicTitle?: string;         // e.g. "Sample Project"
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroupContext {
  group: StudyGroup;
  memberContributions: Array<{
    handle: string;
    content: string;
    updatedAt: string;
  }>;
  sharedContext: string;      // merged context.md
}

export interface BoundaryViolation {
  file: string;
  reason: string;
  matches: string[];          // snippets that triggered the violation
}

export interface BoundaryValidation {
  safe: boolean;
  violations: BoundaryViolation[];
  summary: string;
}

export interface PersonalDataMatch {
  pattern: string;
  match: string;
  context: string;            // surrounding text snippet
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Paths that must never appear in shared/collab content. */
export const PERSONAL_PATHS = [
  "user/USER.md",
  "user/GOALS.md",
  "user/MEMORY.md",
  "user/PREFERENCES.md",
  "data/interview-state.json",
  "data/precedents.json",
  "data/pending-tasks.json",
  ".env",
];

/**
 * Regex patterns that flag personal data in shared content.
 * Conservative — only high-confidence patterns to minimise false positives.
 */
export const PERSONAL_DATA_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "email address",    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g   },
  { name: "phone (intl)",     pattern: /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/g },
  { name: "phone (US)",       pattern: /\(\d{3}\)[\s]?\d{3}[\-\s]\d{4}/g                     },
  { name: "API key",          pattern: /\b(sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*\S{6,})/gi },
  { name: "Stripe key",       pattern: /\bsk_(live|test)_[a-zA-Z0-9]{16,}/g                     },
  { name: "GitHub PAT",       pattern: /\b(ghp_|gho_|github_pat_)[A-Za-z0-9_]{20,}/g            },
  { name: "personal path",    pattern: /\/Users\/[^/\s]+/g                                      },
  { name: "env variable key", pattern: /\b[A-Z]{3,}_[A-Z_]+_KEY\s*[:=]/g                       },
  { name: "password",         pattern: /\b(password|passwd|secret)\s*[:=]\s*\S{4,}/gi           },
];

const PROJECTS_DIR = "collab/projects";
const GROUPS_DIR   = "collab/study-groups";
const COLLAB_DIR   = "collab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function safeReadFile(path: string): string {
  if (!existsSync(path)) return "";
  try { return readFileSync(path, "utf-8"); }
  catch { return ""; }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf-8")) as T; }
  catch { return fallback; }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Directory Setup ──────────────────────────────────────────────────────────

/**
 * Ensure the collab directory structure exists (idempotent).
 */
export function initCollabDir(root: string): void {
  ensureDir(join(root, PROJECTS_DIR));
  ensureDir(join(root, GROUPS_DIR));

  const readme = join(root, COLLAB_DIR, "README.md");
  if (!existsSync(readme)) {
    writeFileSync(readme, [
      "# Collaboration Space",
      "",
      "This directory contains shared project and learning group content.",
      "It is **git-tracked** and safe to commit — no personal data lives here.",
      "",
      "## What lives here",
      "",
      "- `projects/` — shared project notes, decisions, and tasks",
      "- `study-groups/` — project analysis analysis and group context",
      "",
      "## What stays personal (never committed)",
      "",
      "- `user/` — your identity, goals, memory, and preferences",
      "- `data/` — runtime state and personal history",
      "- `logs/` — activity logs",
      "- `.env` — API keys and secrets",
      "",
      "The pre-commit hook enforces this boundary automatically.",
      "Run `bun run collab check` to validate at any time.",
    ].join("\n") + "\n", "utf-8");
  }
}

// ─── Project Management ───────────────────────────────────────────────────────

/**
 * Create a new shared project space under collab/projects/<id>/.
 */
export function createProject(
  root: string,
  config: { name: string; description: string; members?: string[]; tags?: string[] }
): CollabProject {
  initCollabDir(root);

  const id = slugify(config.name);
  const projectDir = join(root, PROJECTS_DIR, id);

  if (existsSync(projectDir)) {
    throw new Error(`Project "${config.name}" already exists at collab/projects/${id}/`);
  }

  const now = new Date().toISOString();
  const project: CollabProject = {
    id,
    name: config.name,
    description: config.description,
    members: config.members ?? [],
    createdAt: now,
    updatedAt: now,
    tags: config.tags ?? [],
  };

  ensureDir(join(projectDir, "shared"));
  writeJson(join(projectDir, "config.json"), project);

  // Seed default shared files
  writeFileSync(join(projectDir, "shared", "notes.md"), [
    `# ${config.name} — Notes`,
    "",
    `> ${config.description}`,
    "",
    `*Created ${now.slice(0, 10)} · ${project.members.length} member(s)*`,
    "",
    "---",
    "",
  ].join("\n"), "utf-8");

  writeFileSync(join(projectDir, "shared", "decisions.md"), [
    `# ${config.name} — Decisions`,
    "",
    "Key decisions made by the team.",
    "",
    "| Date | Decision | Rationale | Owner |",
    "|------|----------|-----------|-------|",
    "",
  ].join("\n"), "utf-8");

  writeFileSync(join(projectDir, "shared", "tasks.md"), [
    `# ${config.name} — Tasks`,
    "",
    "Action items and open tasks.",
    "",
    "- [ ] *(Add your first task here)*",
    "",
  ].join("\n"), "utf-8");

  return project;
}

/**
 * List all shared projects.
 */
export function listProjects(root: string): CollabProject[] {
  const dir = join(root, PROJECTS_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson<CollabProject | null>(join(dir, d.name, "config.json"), null))
    .filter((p): p is CollabProject => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a project by name or ID (slug).
 */
export function getProject(root: string, idOrName: string): CollabProject | null {
  const byId = readJson<CollabProject | null>(
    join(root, PROJECTS_DIR, slugify(idOrName), "config.json"),
    null
  );
  if (byId) return byId;
  return listProjects(root).find(
    (p) => p.name.toLowerCase() === idOrName.toLowerCase()
  ) ?? null;
}

/**
 * Append a timestamped note to the project's shared notes.md.
 * Returns "duplicate" if the same note text was added within the last 60 seconds.
 */
export function addProjectNote(
  root: string,
  projectId: string,
  note: string,
  author?: string
): "added" | "duplicate" {
  const notesPath = join(root, PROJECTS_DIR, slugify(projectId), "shared", "notes.md");
  if (!existsSync(notesPath)) throw new Error(`Project "${projectId}" not found.`);

  // Dedup: check if the same note text was added in the last 60 seconds
  const existing = readFileSync(notesPath, "utf-8");
  const now = Date.now();
  const recentCutoff = new Date(now - 60_000).toISOString().slice(0, 16).replace("T", " ");
  // Look for the note text in sections timestamped after the cutoff
  const sections = existing.split(/\n## /);
  for (const section of sections) {
    const tsMatch = section.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
    if (tsMatch && tsMatch[1] >= recentCutoff && section.includes(note)) {
      return "duplicate";
    }
  }

  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const header = author ? `\n## ${ts} · ${author}\n` : `\n## ${ts}\n`;
  appendFileSync(notesPath, `${header}\n${note}\n\n---\n`, "utf-8");

  const configPath = join(root, PROJECTS_DIR, slugify(projectId), "config.json");
  const project = readJson<CollabProject | null>(configPath, null);
  if (project) {
    project.updatedAt = new Date().toISOString();
    writeJson(configPath, project);
  }

  return "added";
}

/**
 * Get all shared content for a project as a single string (for LLM context).
 */
export function getProjectContext(root: string, projectId: string): string {
  const sharedDir = join(root, PROJECTS_DIR, slugify(projectId), "shared");
  if (!existsSync(sharedDir)) return "";

  return ["notes.md", "decisions.md", "tasks.md"]
    .map((f) => safeReadFile(join(sharedDir, f)))
    .filter((c) => c.trim())
    .join("\n\n---\n\n");
}

// ─── Learning Group Mode ─────────────────────────────────────────────────────────

/**
 * Create a new learning group under collab/study-groups/<id>/.
 */
export function createStudyGroup(
  root: string,
  config: {
    name: string;
    description: string;
    domain?: string;
    topicTitle?: string;
    members?: string[];
  }
): StudyGroup {
  initCollabDir(root);

  const id = slugify(config.name);
  const groupDir = join(root, GROUPS_DIR, id);

  if (existsSync(groupDir)) {
    throw new Error(`Study group "${config.name}" already exists.`);
  }

  const now = new Date().toISOString();
  const group: StudyGroup = {
    id,
    name: config.name,
    description: config.description,
    domain: config.domain,
    topicTitle: config.topicTitle,
    members: config.members ?? [],
    createdAt: now,
    updatedAt: now,
  };

  ensureDir(join(groupDir, "members"));
  writeJson(join(groupDir, "config.json"), group);

  writeFileSync(join(groupDir, "context.md"), [
    `# ${config.name}`,
    "",
    config.description,
    "",
    ...(config.domain    ? [`**Domain:** ${config.domain}  `]    : []),
    ...(config.topicTitle ? [`**Topic:** ${config.topicTitle}  `]   : []),
    `**Created:** ${now.slice(0, 10)}`,
    "",
    "---",
    "",
    "## Shared Context",
    "",
    "*Contributions appear here automatically after each member adds their analysis.*",
    "",
  ].join("\n"), "utf-8");

  return group;
}

/**
 * List all learning groups.
 */
export function listStudyGroups(root: string): StudyGroup[] {
  const dir = join(root, GROUPS_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson<StudyGroup | null>(join(dir, d.name, "config.json"), null))
    .filter((g): g is StudyGroup => g !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a learning group by name or ID.
 */
export function getStudyGroup(root: string, idOrName: string): StudyGroup | null {
  const byId = readJson<StudyGroup | null>(
    join(root, GROUPS_DIR, slugify(idOrName), "config.json"),
    null
  );
  if (byId) return byId;
  return listStudyGroups(root).find(
    (g) => g.name.toLowerCase() === idOrName.toLowerCase()
  ) ?? null;
}

/**
 * Add a member's contribution to a learning group.
 * Creates collab/study-groups/<id>/members/<handle>.md and rebuilds context.md.
 */
export function addStudyGroupContribution(
  root: string,
  groupIdOrName: string,
  handle: string,
  content: string
): void {
  const id = slugify(groupIdOrName);
  const groupDir = join(root, GROUPS_DIR, id);
  if (!existsSync(groupDir)) throw new Error(`Study group "${groupIdOrName}" not found.`);

  const membersDir = join(groupDir, "members");
  ensureDir(membersDir);

  const memberFile = join(membersDir, `${slugify(handle)}.md`);
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");

  if (!existsSync(memberFile)) {
    writeFileSync(memberFile, [`# ${handle}'s Analysis`, "", "---", ""].join("\n"), "utf-8");

    // Register member
    const cfg = readJson<StudyGroup>(join(groupDir, "config.json"), {} as StudyGroup);
    if (cfg && !cfg.members.includes(handle)) {
      cfg.members.push(handle);
      cfg.updatedAt = new Date().toISOString();
      writeJson(join(groupDir, "config.json"), cfg);
    }
  }

  appendFileSync(memberFile, `\n## ${ts}\n\n${content}\n\n---\n`, "utf-8");
  rebuildStudyGroupContext(root, id);
}

/**
 * Rebuild context.md from all member contributions (called automatically).
 */
function rebuildStudyGroupContext(root: string, groupId: string): void {
  const groupDir = join(root, GROUPS_DIR, groupId);
  const cfg = readJson<StudyGroup>(join(groupDir, "config.json"), {} as StudyGroup);
  const membersDir = join(groupDir, "members");

  const lines = [
    `# ${cfg.name ?? groupId}`,
    "",
    cfg.description ?? "",
    "",
    ...(cfg.domain    ? [`**Domain:** ${cfg.domain}  `]    : []),
    ...(cfg.topicTitle ? [`**Topic:** ${cfg.topicTitle}  `]   : []),
    `**Members:** ${(cfg.members ?? []).join(", ") || "none yet"}`,
    `**Updated:** ${new Date().toISOString().slice(0, 10)}`,
    "",
    "---",
    "",
    "## Member Contributions",
    "",
  ];

  if (existsSync(membersDir)) {
    for (const file of readdirSync(membersDir).filter((f) => f.endsWith(".md")).sort()) {
      const content = safeReadFile(join(membersDir, file));
      if (content.trim()) lines.push(content, "");
    }
  }

  writeFileSync(join(groupDir, "context.md"), lines.join("\n"), "utf-8");
}

/**
 * Get the full learning group context including all member contributions.
 */
export function getStudyGroupContext(root: string, groupIdOrName: string): StudyGroupContext {
  const id = slugify(groupIdOrName);
  const groupDir = join(root, GROUPS_DIR, id);
  const group = readJson<StudyGroup>(join(groupDir, "config.json"), {} as StudyGroup);
  const sharedContext = safeReadFile(join(groupDir, "context.md"));
  const membersDir = join(groupDir, "members");

  const memberContributions: StudyGroupContext["memberContributions"] = [];
  if (existsSync(membersDir)) {
    for (const file of readdirSync(membersDir).filter((f) => f.endsWith(".md")).sort()) {
      const fullPath = join(membersDir, file);
      memberContributions.push({
        handle: file.replace(".md", ""),
        content: safeReadFile(fullPath),
        updatedAt: statSync(fullPath).mtime.toISOString(),
      });
    }
  }

  return { group, memberContributions, sharedContext };
}

/**
 * Build an LLM prompt that injects the learning group's shared context.
 * Personal user context remains separate — only shared knowledge is included.
 */
export function buildStudyGroupPrompt(root: string, groupIdOrName: string): string {
  const { group, sharedContext, memberContributions } = getStudyGroupContext(root, groupIdOrName);
  const memberSummary = memberContributions.length > 0
    ? `Members with contributions: ${memberContributions.map((m) => m.handle).join(", ")}`
    : "No member contributions yet.";

  return [
    `## Learning Group Context: ${group.name}`,
    "",
    group.description ?? "",
    group.domain    ? `Domain: ${group.domain}`       : "",
    group.topicTitle ? `Topic: ${group.topicTitle}`      : "",
    memberSummary,
    "",
    "### Shared Knowledge Index",
    "",
    sharedContext,
    "",
    "---",
    "",
    "Use the above group context to inform your response.",
    "Your personal analysis (from user/) is separate and private to you.",
  ].filter((l) => l !== undefined).join("\n");
}

// ─── Personal Boundary Validation ─────────────────────────────────────────────

/**
 * Return true if a file path is a personal file that must never be committed.
 */
export function isPersonalPath(filePath: string): boolean {
  const n = filePath.replace(/\\/g, "/");
  return PERSONAL_PATHS.some((p) => n.includes(p))
    || n.startsWith("user/")
    || n.startsWith("data/")
    || n.startsWith("logs/")
    || n.endsWith(".env")
    || n.includes("/.env.");
}

/**
 * Scan content for personal data patterns.
 * Returns all matches with surrounding context snippets.
 */
export function scanContentForPersonalData(content: string): PersonalDataMatch[] {
  const matches: PersonalDataMatch[] = [];

  for (const { name, pattern } of PERSONAL_DATA_PATTERNS) {
    const re = new RegExp(pattern.source, "g");
    let m: RegExpExecArray | null;

    while ((m = re.exec(content)) !== null) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(content.length, m.index + m[0].length + 30);
      const snippet = content.slice(start, end).replace(/\n/g, " ").trim();

      matches.push({ pattern: name, match: m[0], context: `...${snippet}...` });
    }
  }

  return matches;
}

/**
 * Validate a list of staged files against the personal/shared boundary.
 * Called by the pre-commit hook before every commit.
 *
 * @param stagedFiles  - file paths relative to repo root (from git diff --cached --name-only)
 * @param root         - absolute path to the repo root
 */
export function validateShareBoundary(
  stagedFiles: string[],
  root: string
): BoundaryValidation {
  const violations: BoundaryViolation[] = [];

  for (const file of stagedFiles) {
    const n = file.replace(/\\/g, "/");

    // Block personal paths entirely
    if (isPersonalPath(n)) {
      violations.push({
        file,
        reason: "Personal file — should not be committed (add to .gitignore)",
        matches: [`Matched personal path: ${file}`],
      });
      continue;
    }

    // Scan collab/ content for embedded personal data
    if (n.startsWith("collab/") && !n.endsWith(".gitkeep")) {
      const content = safeReadFile(join(root, file));
      if (!content) continue;

      const found = scanContentForPersonalData(content);
      if (found.length > 0) {
        violations.push({
          file,
          reason: "Shared file contains potential personal data",
          matches: found.map((m) => `[${m.pattern}] ${m.context}`),
        });
      }
    }
  }

  const safe = violations.length === 0;
  const summary = safe
    ? `✅ ${stagedFiles.length} staged file(s) passed boundary check`
    : [
        `❌ ${violations.length} boundary violation(s) detected in staged files:`,
        ...violations.flatMap((v) => [`  ${v.file}: ${v.reason}`, ...v.matches.map((m) => `    ${m}`)]),
        "",
        "Fix these issues before committing. Run `bun run collab check` for details.",
      ].join("\n");

  return { safe, violations, summary };
}

/**
 * Install the pre-commit git hook.
 * Writes .git/hooks/pre-commit and marks it executable.
 */
export function installPreCommitHook(root: string): { installed: boolean; path: string } {
  const hooksDir = join(root, ".git", "hooks");
  if (!existsSync(hooksDir)) return { installed: false, path: "" };

  const hookPath = join(hooksDir, "pre-commit");
  writeFileSync(hookPath, [
    "#!/bin/sh",
    "# Digital Seed — personal data boundary check",
    "# Auto-generated by: bun run collab hook install",
    "#",
    "# To bypass (emergency only): git commit --no-verify",
    "",
    "bun run scripts/pre-commit-check.ts",
    "exit $?",
  ].join("\n") + "\n", { mode: 0o755 });

  return { installed: true, path: relative(root, hookPath) };
}

// ─── Collab Summary ───────────────────────────────────────────────────────────

/**
 * Return a formatted summary of all collaborative activity.
 * Useful for session startup context.
 */
export function getCollabSummary(root: string): string {
  const projects = listProjects(root);
  const groups   = listStudyGroups(root);

  if (projects.length === 0 && groups.length === 0) {
    return "No collaborative projects or learning groups yet.\nRun `bun run collab create <name>` to start one.";
  }

  const lines: string[] = [];

  if (projects.length > 0) {
    lines.push("### Shared Projects");
    for (const p of projects) {
      lines.push(`- **${p.name}** — ${p.description}`);
      if (p.members.length > 0) lines.push(`  Members: ${p.members.join(", ")}`);
    }
    lines.push("");
  }

  if (groups.length > 0) {
    lines.push("### Learning Groups");
    for (const g of groups) {
      const detail = [g.domain, g.topicTitle].filter(Boolean).join(" · ");
      lines.push(`- **${g.name}**${detail ? ` *(${detail})*` : ""} — ${g.description}`);
      if (g.members.length > 0) lines.push(`  Members: ${g.members.join(", ")}`);
    }
  }

  return lines.join("\n");
}
