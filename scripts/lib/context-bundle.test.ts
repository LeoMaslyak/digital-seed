import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadContextBundle } from "./context-bundle.ts";

function seedRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "ctx-"));
  mkdirSync(join(root, "user"), { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(root, "user", name), body);
  return root;
}

test("loads present files with live byte counts; records missing", () => {
  const root = seedRoot({ "USER.md": "I am Leo\n", "GOALS.md": "ship C1\n" });
  const b = loadContextBundle(root);
  const user = b.files.find((f) => f.name === "USER.md")!;
  expect(user.present).toBe(true);
  expect(user.bytes).toBe(Buffer.byteLength("I am Leo\n"));
  expect(b.totalBytes).toBe(b.files.reduce((n, f) => n + f.bytes, 0));
  expect(b.missing).toContain("COMPASS.md");
});

test("only/exclude filter the set", () => {
  const root = seedRoot({ "USER.md": "a", "GOALS.md": "b", "MEMORY.md": "c" });
  expect(loadContextBundle(root, { only: ["USER.md"] }).files.map((f) => f.name)).toEqual(["USER.md"]);
  expect(loadContextBundle(root, { exclude: ["MEMORY.md"] }).files.some((f) => f.name === "MEMORY.md")).toBe(false);
});

test("symlink escaping user/ is refused, never read", () => {
  const root = seedRoot({ "USER.md": "ok" });
  const secret = join(root, "secret.txt");
  writeFileSync(secret, "PRIVATE");
  symlinkSync(secret, join(root, "user", "MEMORY.md"));
  const b = loadContextBundle(root);
  expect(b.files.find((f) => f.name === "MEMORY.md")?.text ?? "").not.toContain("PRIVATE");
  expect(b.missing).toContain("MEMORY.md");
});

test("a symlinked user/ DIRECTORY is refused wholesale (nothing outside the repo is read)", () => {
  const root = mkdtempSync(join(tmpdir(), "ctx-"));
  const outside = mkdtempSync(join(tmpdir(), "outside-"));
  writeFileSync(join(outside, "USER.md"), "OUTSIDE_CANARY");
  symlinkSync(outside, join(root, "user")); // user/ itself is a symlink to an external dir
  const b = loadContextBundle(root);
  expect(b.files.length).toBe(0);
  expect(b.missing).toContain("USER.md");
  expect(JSON.stringify(b)).not.toContain("OUTSIDE_CANARY");
});

test("a hardlinked context file (nlink>1) is refused, contents never read", () => {
  const root = seedRoot({ "USER.md": "ok" });
  const outside = join(root, "outside-secret.txt");
  writeFileSync(outside, "HARDLINK_CANARY");
  linkSync(outside, join(root, "user", "MEMORY.md")); // hardlink a file into user/
  const b = loadContextBundle(root);
  expect(b.files.find((f) => f.name === "MEMORY.md")).toBeUndefined();
  expect(b.missing).toContain("MEMORY.md");
  expect(JSON.stringify(b)).not.toContain("HARDLINK_CANARY");
});
