/**
 * Context bundle loader — reads the user's context files (`user/*.md`) into a
 * bundle, guarding against symlinks that could escape `user/` and read arbitrary
 * files on the machine. A path is only ever read after confirming (via lstat +
 * realpath) that it is a real file living inside the resolved `user/` directory.
 */
import { lstatSync, realpathSync, readFileSync, existsSync } from "fs";
import { join, sep } from "path";
import { CONTEXT_FILES } from "./trust-surface.ts";

export interface ContextFile {
  name: string;
  path: string;
  text: string;
  bytes: number;
  present: boolean;
}

export interface ContextBundle {
  files: ContextFile[];
  totalBytes: number;
  missing: string[];
}

export function loadContextBundle(
  root: string,
  opts: { only?: string[]; exclude?: string[] } = {},
): ContextBundle {
  let names = CONTEXT_FILES.map((base) => base + ".md");
  if (opts.only) {
    const only = new Set(opts.only);
    names = names.filter((n) => only.has(n));
  }
  if (opts.exclude) {
    const exclude = new Set(opts.exclude);
    names = names.filter((n) => !exclude.has(n));
  }

  const userDir = join(root, "user");
  let safeRoot: string;
  try {
    safeRoot = realpathSync(userDir);
  } catch {
    safeRoot = userDir;
  }

  const files: ContextFile[] = [];
  const missing: string[] = [];

  for (const name of names) {
    const path = join(userDir, name);
    try {
      if (!existsSync(path)) {
        missing.push(name);
        continue;
      }
      const st = lstatSync(path);
      if (st.isSymbolicLink() || !st.isFile()) {
        missing.push(name);
        continue;
      }
      const real = realpathSync(path);
      if (!real.startsWith(safeRoot + sep)) {
        missing.push(name);
        continue;
      }
      const text = readFileSync(path, "utf-8");
      files.push({ name, path, text, bytes: Buffer.byteLength(text), present: true });
    } catch {
      missing.push(name);
    }
  }

  const totalBytes = files.reduce((n, f) => n + f.bytes, 0);
  return { files, totalBytes, missing };
}
