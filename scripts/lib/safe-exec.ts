/**
 * Safe subprocess helpers — run external commands WITHOUT a shell.
 *
 * Every command here is executed via Bun.spawnSync with `shell: false`
 * semantics (argv form), so user/remote-derived strings are passed as
 * literal argv elements and can never be reinterpreted by /bin/sh
 * (no $(...), backticks, ;, |, &&, redirection, globbing, etc.).
 *
 * Use these instead of `execSync(`cmd "${x}"`)` anywhere an argument
 * could contain attacker-influenced content (filenames from remote
 * headers, collaborator notes, archive members, …).
 */

export interface SafeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SafeExecOptions {
  /** ms; process is killed if it exceeds this. */
  timeout?: number;
  /** working directory for the child process. */
  cwd?: string;
  /** data to feed on the child's stdin. */
  input?: string;
  /** if true, inherit parent stdio (interactive / streaming output). */
  inherit?: boolean;
}

/**
 * Run a command with explicit argv — NEVER through a shell.
 *
 * @param cmd  The executable name (looked up on PATH) or absolute path.
 * @param argv The arguments, passed verbatim — no shell interpretation.
 */
export function safeExec(
  cmd: string,
  argv: string[] = [],
  opts: SafeExecOptions = {},
): SafeExecResult {
  const proc = Bun.spawnSync([cmd, ...argv], {
    cwd: opts.cwd,
    timeout: opts.timeout,
    stdin: opts.input !== undefined ? new TextEncoder().encode(opts.input) : undefined,
    stdout: opts.inherit ? "inherit" : "pipe",
    stderr: opts.inherit ? "inherit" : "pipe",
  });

  const decoder = new TextDecoder();
  return {
    stdout: opts.inherit ? "" : decoder.decode(proc.stdout ?? new Uint8Array()),
    stderr: opts.inherit ? "" : decoder.decode(proc.stderr ?? new Uint8Array()),
    exitCode: proc.exitCode ?? (proc.success ? 0 : 1),
  };
}

/**
 * Returns true if a command is resolvable on PATH (no shell).
 * Replaces `execSync("which <cmd>")`.
 */
export function commandExists(cmd: string): boolean {
  try {
    const res = safeExec("which", [cmd]);
    return res.exitCode === 0 && res.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Reduce an arbitrary (possibly remote-derived) name to a safe basename:
 *   - strip any directory component (no path separators escape the dir)
 *   - allow only [A-Za-z0-9._-]
 *   - collapse leading dots so the result can never be "", "." or ".."
 *
 * The result is safe to use both as a filesystem name and as a literal
 * argv element to a subprocess.
 */
export function sanitizeFilename(name: string): string {
  // Drop any directory portion — keep only the final path segment.
  // Split on both POSIX and Windows separators.
  const base = name.split(/[\\/]/).pop() ?? "";

  // Replace every character outside the safe class with "_".
  let safe = base.replace(/[^A-Za-z0-9._-]/g, "_");

  // Never allow a name that is empty, all dots, or starts with a dot
  // (avoids "", ".", "..", and accidental dotfiles / traversal).
  safe = safe.replace(/^\.+/, "");

  if (safe.length === 0) {
    safe = "download-" + Date.now();
  }
  return safe;
}
