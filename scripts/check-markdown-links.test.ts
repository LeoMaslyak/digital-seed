import { test, expect } from "bun:test";
import { maskCode } from "./check-markdown-links.ts";

test("maskCode blanks link-like syntax inside fenced code blocks", () => {
  const md = ["before", "```ts", 'x.match(/\\](.*\\bphase/)', "```", "after"].join("\n");
  const masked = maskCode(md);
  expect(masked).not.toContain("](");
  // line count preserved so reported line numbers stay accurate
  expect(masked.split("\n").length).toBe(md.split("\n").length);
});

test("maskCode keeps real links outside code intact", () => {
  const md = "see [the guide](docs/phases.md) for details";
  expect(maskCode(md)).toContain("](docs/phases.md)");
});

test("maskCode blanks inline code spans", () => {
  const md = "use the `seed guide](x)` command";
  expect(maskCode(md)).not.toContain("](x)");
});
