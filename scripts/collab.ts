#!/usr/bin/env bun
/**
 * Digital Seed Collaboration CLI
 *
 * Usage:
 *   bun run collab create <name> [--desc "..."] [--members a,b,c] [--tags t1,t2]
 *   bun run collab list
 *   bun run collab note <project> "<note>" [--author handle]
 *   bun run collab context <project>
 *
 *   bun run collab group create <name> [--desc "..."] [--domain "..."] [--topic "..."]
 *   bun run collab group list
 *   bun run collab group add <group> <handle> "<analysis>"
 *   bun run collab group show <group>
 *   bun run collab group prompt <group>
 *
 *   bun run collab hook install
 *   bun run collab check
 *   bun run collab summary
 */

import { execSync } from "child_process";
import {
  createProject, listProjects, getProject, addProjectNote, getProjectContext,
  createStudyGroup, listStudyGroups, getStudyGroup,
  addStudyGroupContribution, getStudyGroupContext, buildStudyGroupPrompt,
  validateShareBoundary, installPreCommitHook, getCollabSummary, initCollabDir,
} from "../core/src/collaboration.ts";

const root = process.cwd();
const args = process.argv.slice(2);

function usage(): void {
  console.log(`
Digital Seed Collaboration Layer

PROJECTS
  bun run collab create <name> [--desc "..."] [--members a,b] [--tags t1,t2]
  bun run collab invite <project> <github-handle>
  bun run collab share <project> [--copy]
  bun run collab sync
  bun run collab list
  bun run collab note <project> "<note>" [--author <handle>]
  bun run collab context <project>

STUDY GROUPS
  bun run collab group create <name> [--desc "..."] [--domain "..."] [--topic "..."]
  bun run collab group list
  bun run collab group add <group> <handle> "<analysis>"
  bun run collab group show <group>
  bun run collab group prompt <group>

GIT SAFETY
  bun run collab hook install      Install pre-commit boundary check
  bun run collab check             Validate staged files now

MISC
  bun run collab summary           Show all projects and groups
`.trim());
}

function flag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

function flagBool(name: string): boolean {
  return args.includes(name);
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

const cmd = args[0];

if (!cmd || cmd === "help" || cmd === "--help") {
  usage();
  process.exit(0);
}

// ── bun run collab create <name> ─────────────────────────────────────────────
if (cmd === "create") {
  const name = args[1];
  if (!name) { console.error("Usage: bun run collab create <name> [--desc \"...\"]"); process.exit(1); }

  try {
    const project = createProject(root, {
      name,
      description: flag("--desc") ?? `Shared project: ${name}`,
      members: flag("--members")?.split(",").map((m) => m.trim()).filter(Boolean) ?? [],
      tags:    flag("--tags")?.split(",").map((t) => t.trim()).filter(Boolean) ?? [],
    });
    console.log(`✅ Created project: ${project.name}`);
    console.log(`   Path: collab/projects/${project.id}/`);
    console.log(`   Shared files: notes.md · decisions.md · tasks.md`);
    console.log(`\n   Commit and push to share with your team.`);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}

// ── bun run collab list ───────────────────────────────────────────────────────
else if (cmd === "list") {
  const projects = listProjects(root);
  const groups   = listStudyGroups(root);

  if (projects.length === 0 && groups.length === 0) {
    console.log("No projects or learning groups yet.");
    console.log("Create one: bun run collab create <name>");
    process.exit(0);
  }

  if (projects.length > 0) {
    console.log("\n📁 Shared Projects");
    for (const p of projects) {
      console.log(`  ${p.name.padEnd(24)} ${p.description}`);
      if (p.members.length > 0) console.log(`  ${"".padEnd(24)} 👥 ${p.members.join(", ")}`);
    }
  }

  if (groups.length > 0) {
    console.log("\n👥 Learning Groups");
    for (const g of groups) {
      const detail = [g.domain, g.topicTitle].filter(Boolean).join(" · ");
      console.log(`  ${g.name.padEnd(24)} ${g.description}${detail ? ` (${detail})` : ""}`);
      if (g.members.length > 0) console.log(`  ${"".padEnd(24)} 👥 ${g.members.join(", ")}`);
    }
  }
  console.log("");
}

// ── bun run collab note <project> "<note>" ────────────────────────────────────
else if (cmd === "note") {
  const projectArg = args[1];
  const noteText   = args[2];
  if (!projectArg || !noteText) {
    console.error("Usage: bun run collab note <project> \"<note>\" [--author <handle>]");
    process.exit(1);
  }
  try {
    const result = addProjectNote(root, projectArg, noteText, flag("--author"));
    if (result === "duplicate") {
      console.log(`⚠️  Note already added — skipping duplicate.`);
    } else {
      console.log(`✅ Note added to ${projectArg}`);
    }
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}

// ── bun run collab context <project> ─────────────────────────────────────────
else if (cmd === "context") {
  const projectArg = args[1];
  if (!projectArg) { console.error("Usage: bun run collab context <project>"); process.exit(1); }

  const ctx = getProjectContext(root, projectArg);
  if (!ctx) { console.error(`No context found for project "${projectArg}"`); process.exit(1); }
  console.log(ctx);
}

// ── bun run collab group ... ──────────────────────────────────────────────────
else if (cmd === "group") {
  const subcmd = args[1];

  // bun run collab group create <name>
  if (subcmd === "create") {
    const name = args[2];
    if (!name) { console.error("Usage: bun run collab group create <name> [--desc ...] [--domain ...] [--topic ...]"); process.exit(1); }

    try {
      const group = createStudyGroup(root, {
        name,
        description: flag("--desc")   ?? `Study group: ${name}`,
        domain:      flag("--domain") ?? undefined,
        topicTitle:   flag("--topic")   ?? undefined,
        members:     flag("--members")?.split(",").map((m) => m.trim()).filter(Boolean) ?? [],
      });
      console.log(`✅ Created learning group: ${group.name}`);
      console.log(`   Path: collab/study-groups/${group.id}/`);
      if (group.domain)    console.log(`   Domain: ${group.domain}`);
      if (group.topicTitle) console.log(`   Topic: ${group.topicTitle}`);
      console.log(`\n   Add your analysis: bun run collab group add ${group.id} <your-handle> "<insight>"`);
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      process.exit(1);
    }
  }

  // bun run collab group list
  else if (subcmd === "list") {
    const groups = listStudyGroups(root);
    if (groups.length === 0) {
      console.log("No learning groups yet. Create one: bun run collab group create <name>");
    } else {
      for (const g of groups) {
        const detail = [g.domain, g.topicTitle].filter(Boolean).join(" · ");
        console.log(`  ${g.name.padEnd(24)} ${g.description}${detail ? ` (${detail})` : ""}`);
        console.log(`  ${"".padEnd(24)} ${g.members.length} member(s) · id: ${g.id}`);
      }
    }
  }

  // bun run collab group add <group> <handle> "<analysis>"
  else if (subcmd === "add") {
    const groupArg = args[2];
    const handle   = args[3];
    const content  = args[4];
    if (!groupArg || !handle || !content) {
      console.error("Usage: bun run collab group add <group> <handle> \"<analysis>\"");
      process.exit(1);
    }
    try {
      addStudyGroupContribution(root, groupArg, handle, content);
      console.log(`✅ Analysis added for ${handle} in group "${groupArg}"`);
      console.log(`   context.md has been updated.`);
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      process.exit(1);
    }
  }

  // bun run collab group show <group>
  else if (subcmd === "show") {
    const groupArg = args[2];
    if (!groupArg) { console.error("Usage: bun run collab group show <group>"); process.exit(1); }

    const ctx = getStudyGroupContext(root, groupArg);
    if (!ctx.group?.id) { console.error(`Study group "${groupArg}" not found.`); process.exit(1); }

    console.log(`\n📚 ${ctx.group.name}`);
    if (ctx.group.domain)    console.log(`   Domain: ${ctx.group.domain}`);
    if (ctx.group.topicTitle) console.log(`   Topic: ${ctx.group.topicTitle}`);
    console.log(`   Members: ${ctx.group.members.join(", ") || "none yet"}`);
    console.log(`   Contributions: ${ctx.memberContributions.length}`);
    console.log("\n--- Shared Context ---");
    console.log(ctx.sharedContext);
  }

  // bun run collab group prompt <group>
  else if (subcmd === "prompt") {
    const groupArg = args[2];
    if (!groupArg) { console.error("Usage: bun run collab group prompt <group>"); process.exit(1); }
    console.log(buildStudyGroupPrompt(root, groupArg));
  }

  else {
    console.error(`Unknown group subcommand: ${subcmd}`);
    usage();
    process.exit(1);
  }
}

// ── bun run collab hook install ───────────────────────────────────────────────
else if (cmd === "hook") {
  if (args[1] === "install") {
    const result = installPreCommitHook(root);
    if (result.installed) {
      console.log(`✅ Pre-commit hook installed at ${result.path}`);
      console.log(`   Every commit will now be scanned for personal data leaks.`);
      console.log(`   Bypass (emergency only): git commit --no-verify`);
    } else {
      console.error("❌ Could not install hook — .git/hooks/ not found. Is this a git repo?");
      process.exit(1);
    }
  } else {
    console.error("Usage: bun run collab hook install");
    process.exit(1);
  }
}

// ── bun run collab check ──────────────────────────────────────────────────────
else if (cmd === "check") {
  let staged: string[] = [];
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
      cwd: root,
    }).trim();
    staged = out ? out.split("\n").filter(Boolean) : [];
  } catch { /* not in git or no staged files */ }

  if (staged.length === 0) {
    // Check all collab/ files even if nothing staged
    const { readdirSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const collabDir = join(root, "collab");
    if (!existsSync(collabDir)) {
      console.log("✅ No collab/ directory yet — nothing to check.");
      process.exit(0);
    }

    // Collect all collab files
    function walkDir(dir: string): string[] {
      const results: string[] = [];
      if (!existsSync(dir)) return results;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkDir(fullPath));
        else results.push(fullPath.replace(root + "/", ""));
      }
      return results;
    }
    staged = walkDir(collabDir);
    console.log(`Checking all ${staged.length} collab/ file(s) (no staged files found)...\n`);
  } else {
    console.log(`Checking ${staged.length} staged file(s)...\n`);
  }

  const result = validateShareBoundary(staged, root);
  console.log(result.summary);
  process.exit(result.safe ? 0 : 1);
}

// ── bun run collab export <id> [--format pdf] ────────────────────────────────
else if (cmd === "export") {
  const id = args[1];
  if (!id) {
    console.error("Usage: bun run collab export <project-or-group> [--format pdf]");
    process.exit(1);
  }

  const { existsSync: exists, mkdirSync: mkdir, writeFileSync: writeFile } = await import("fs");
  const { join: pjoin } = await import("path");
  const today = new Date().toISOString().slice(0, 10);
  const exportDir = pjoin(root, "exports");
  if (!exists(exportDir)) mkdir(exportDir, { recursive: true });
  const outPath = pjoin(exportDir, `${id}-${today}.md`);

  // Try as project first, then as learning group
  let content = "";
  let title = "";
  const project = getProject(root, id);
  if (project) {
    title = project.name;
    content = `# ${project.name}\n\n> ${project.description}\n\n*Exported ${today} · Members: ${project.members.join(", ") || "—"}*\n\n---\n\n`;
    content += getProjectContext(root, id);
  } else {
    const ctx = getStudyGroupContext(root, id);
    if (ctx.group?.id) {
      title = ctx.group.name;
      const detail = [ctx.group.domain, ctx.group.topicTitle].filter(Boolean).join(" · ");
      content = `# ${ctx.group.name}\n\n`;
      if (detail) content += `> ${detail}\n\n`;
      content += `*Exported ${today} · Members: ${ctx.group.members.join(", ") || "—"}*\n\n---\n\n`;
      content += ctx.sharedContext;
    } else {
      console.error(`❌ No project or learning group found with id "${id}".`);
      process.exit(1);
    }
  }

  // Clean up internal metadata noise for submission-ready output
  content = content
    .replace(/\*\*Updated:\*\* \d{4}-\d{2}-\d{2}\n?/g, "")
    .replace(/\n{3,}/g, "\n\n");

  writeFile(outPath, content, "utf-8");
  console.log(`✅ Exported to ${outPath}`);

  if (flag("--format") === "pdf") {
    console.log(`\n   For PDF: pandoc "${outPath}" -o "exports/${id}-${today}.pdf"`);
  }
}

// ── bun run collab summary ────────────────────────────────────────────────────
else if (cmd === "summary") {
  console.log(getCollabSummary(root));
}


// ── bun run collab invite <project> <github-handle> ──────────────────────────
if (cmd === "invite") {
  const projectArg = args[1];
  const handle     = args[2];
  if (!projectArg || !handle) {
    console.error("Usage: bun run collab invite <project> <github-handle>");
    process.exit(1);
  }
  try {
    const project = getProject(root, projectArg);
    if (!project) throw new Error(`Project "${projectArg}" not found.`);
    if (!project.members.includes(handle)) {
      project.members.push(handle);
      const { writeFileSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const metaPath = join(root, "collab", "projects", project.id, "meta.json");
      if (existsSync(metaPath)) {
        writeFileSync(metaPath, JSON.stringify(project, null, 2));
      }
    }
    console.log(`✅ Added ${handle} to "${project.name}"`);
    console.log(`\n   Share the collab/ folder so they can pull it:`);
    console.log(`   git add collab/ && git commit -m "collab: add ${handle}" && git push`);
    console.log(`   Then send them your repo URL and ask them to:`);
    console.log(`   git clone <your-repo> --no-checkout && git sparse-checkout set collab/`);
    console.log(`\n   Or simpler: bun run collab share ${projectArg} --copy`);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}

// ── bun run collab share <project> [--copy] ───────────────────────────────────
// Creates a self-contained markdown snapshot of the project — paste into
// Teams, email, or WhatsApp to share context without a GitHub account.
else if (cmd === "share") {
  const projectArg = args[1];
  if (!projectArg) {
    console.error("Usage: bun run collab share <project> [--copy]");
    process.exit(1);
  }

  let content = "";
  const project = getProject(root, projectArg);
  if (project) {
    content = getProjectContext(root, projectArg) ?? "";
  } else {
    const ctx = getStudyGroupContext(root, projectArg);
    if (ctx.group?.id) {
      content = buildStudyGroupPrompt(root, projectArg);
    } else {
      console.error(`❌ No project or group found: "${projectArg}"`);
      process.exit(1);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const header = `<!-- Digital Seed collaboration snapshot · ${today} -->\n\n`;
  const snapshot = header + content;

  if (flagBool("--copy")) {
    try {
      const { safeExec } = await import("./lib/safe-exec.ts");
      // macOS pbcopy / Linux xclip / Windows clip — argv form, content fed
      // over STDIN (never interpolated into a shell), so collaborator-
      // supplied $()/backticks can't execute (H3).
      const [copyCmd, ...copyArgs] = process.platform === "darwin" ? ["pbcopy"]
        : process.platform === "win32" ? ["clip"]
        : ["xclip", "-selection", "clipboard"];
      const res = safeExec(copyCmd, copyArgs, { input: snapshot });
      if (res.exitCode !== 0) {
        throw new Error(res.stderr.trim() || `${copyCmd} exited with code ${res.exitCode}`);
      }
      console.log(`✅ Copied to clipboard — paste into Teams, email, or WhatsApp.`);
    } catch {
      console.log(snapshot);
      console.log("\n(Could not copy to clipboard — content printed above)");
    }
  } else {
    console.log(snapshot);
  }
}

// ── bun run collab sync ───────────────────────────────────────────────────────
// Pull collab/ updates from the shared git remote (if configured).
else if (cmd === "sync") {
  const { execSync: exec } = await import("child_process");
  const { existsSync } = await import("fs");
  const { join } = await import("path");

  // Check if this repo has a remote
  let hasRemote = false;
  try {
    const remotes = exec("git remote", { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
    hasRemote = remotes.length > 0;
  } catch { /* not a git repo */ }

  if (!hasRemote) {
    console.log("⚠  No git remote configured.");
    console.log("   To sync collab/ with teammates, push this repo to GitHub:");
    console.log("   git remote add origin <your-repo-url>");
    console.log("   git push -u origin main");
    process.exit(0);
  }

  console.log("Syncing collab/ with remote...\n");
  try {
    // Stage and push any local collab changes first
    const status = exec("git status --short collab/", { cwd: root, encoding: "utf8" }).trim();
    if (status) {
      exec("git add collab/", { cwd: root });
      exec('git commit -m "collab: sync"', { cwd: root });
      exec("git push", { cwd: root });
      console.log("  ✓ Pushed local changes");
    }
    // Pull remote changes
    exec("git pull --rebase", { cwd: root });
    console.log("  ✓ Pulled remote changes");

    // Re-index collab for RAG
    try {
      exec(`bun run embed --path "${join(root, "collab")}" --silent`, { cwd: root });
      console.log("  ✓ Collab index updated");
    } catch { /* embed not critical */ }

    console.log("\n✅ Collab synced.");
  } catch (e) {
    console.error(`❌ Sync failed: ${(e as Error).message}`);
    console.error("   Resolve any conflicts in collab/ then try again.");
    process.exit(1);
  }
}

// ── Unknown ───────────────────────────────────────────────────────────────────
else {
  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}
