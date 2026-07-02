import { test, expect } from "bun:test";
import { scrubLine, scrubBlock } from "./scrub.ts";

const ESC = String.fromCharCode(0x1b), BEL = String.fromCharCode(0x07), DEL = String.fromCharCode(0x7f);

test("scrubLine strips ESC/BEL/DEL and newlines", () => {
  expect(scrubLine(`a${ESC}[2Jb${BEL}\nc${DEL}`)).toBe("a [2Jb  c "); // \x1b and \x07,\x7f -> space; \n -> space
});

test("scrubBlock preserves newlines but strips ESC/BEL/DEL", () => {
  const out = scrubBlock(`line1${ESC}[31m\nline2${BEL}${DEL}`);
  expect(out).toContain("\n");
  expect(out).not.toContain(ESC);
  expect(out).not.toContain(BEL);
  expect(out).not.toContain(DEL);
  expect(out.split("\n").length).toBe(2);
});

test("scrub handles null/undefined", () => {
  expect(scrubLine(undefined as unknown as string)).toBe("");
  expect(scrubBlock(null as unknown as string)).toBe("");
});
