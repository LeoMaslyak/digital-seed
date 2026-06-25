import { test, expect } from "bun:test";
import { loadGlossary, lookup, formatTerm } from "./glossary.ts";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function tmpWith(yaml: string): string {
  const root = mkdtempSync(join(tmpdir(), "glossary-"));
  mkdirSync(join(root, "glossary"), { recursive: true });
  writeFileSync(join(root, "glossary/glossary.yaml"), yaml, "utf-8");
  return root;
}
const hasCtrl = (s: string) =>
  [...s].some((c) => {
    const n = c.charCodeAt(0);
    return (n <= 0x1f && n !== 0x0a) || n === 0x7f || (n >= 0x80 && n <= 0x9f);
  });

const SAMPLE = `terms:
  - id: rag
    term: RAG (Retrieval-Augmented Generation)
    aliases: [retrieval augmented generation]
    plain: A way to let an AI answer using your own notes by finding relevant bits first.
    why: It makes answers about your material, not just general knowledge.
    see: [embeddings]
  - id: embeddings
    term: Embeddings
    plain: Numbers that capture meaning so similar text can be found.
`;

test("loadGlossary: valid file yields terms and no problems", () => {
  const { terms, problems } = loadGlossary(tmpWith(SAMPLE));
  expect(problems).toEqual([]);
  expect(terms.length).toBe(2);
  expect(terms[0].id).toBe("rag");
  expect(terms[0].aliases).toContain("retrieval augmented generation");
});

test("lookup: resolves by id, alias, case-insensitive term, and fuzzy contains", () => {
  const { terms } = loadGlossary(tmpWith(SAMPLE));
  expect(lookup(terms, "rag")?.id).toBe("rag"); // id
  expect(lookup(terms, "retrieval augmented generation")?.id).toBe("rag"); // alias
  expect(lookup(terms, "EMBEDDINGS")?.id).toBe("embeddings"); // case-insensitive
  expect(lookup(terms, "embed")?.id).toBe("embeddings"); // fuzzy contains
  expect(lookup(terms, "nonsense-xyz")).toBeNull();
});

test("loadGlossary: missing id, non-list terms, missing plain, duplicate id are flagged", () => {
  const dup = loadGlossary(tmpWith(`terms:
  - term: no id
    plain: x
  - id: a
    plain: ""
  - id: dup
    plain: one
  - id: dup
    plain: two
`));
  expect(dup.problems.length).toBeGreaterThanOrEqual(3);
  expect(dup.terms.filter((t) => t.id === "dup").length).toBe(1);

  const nonList = loadGlossary(tmpWith("terms: not-a-list"));
  expect(nonList.terms).toEqual([]);
  expect(nonList.problems.length).toBeGreaterThan(0);
});

test("loadGlossary: malformed yaml and missing file → problems, no throw", () => {
  expect(loadGlossary(tmpWith(":\n  - [bad")).problems.length).toBeGreaterThan(0);
  const empty = mkdtempSync(join(tmpdir(), "glossary-empty-"));
  expect(loadGlossary(empty).problems.length).toBeGreaterThan(0);
});

test("loadGlossary: scrubs control chars from every displayed field incl. id/term", () => {
  const bs = String.fromCharCode(92);
  const esc = bs + "x1b";
  const { terms, problems } = loadGlossary(tmpWith(`terms:
  - id: "r${esc}ag"
    term: "T${esc}erm"
    plain: "P${esc}lain text"
    why: "W${esc}hy"
`));
  expect(problems).toEqual([]);
  expect(hasCtrl(terms[0].id)).toBe(false);
  expect(hasCtrl(terms[0].term)).toBe(false);
  expect(hasCtrl(terms[0].plain)).toBe(false);
  expect(hasCtrl(formatTerm(terms[0]))).toBe(false);
});

test("formatTerm: includes the term and the plain explanation", () => {
  const { terms } = loadGlossary(tmpWith(SAMPLE));
  const out = formatTerm(terms[0]);
  expect(out).toContain("RAG");
  expect(out.toLowerCase()).toContain("your own notes");
});

test("the real glossary/glossary.yaml loads with 0 problems and >= 10 terms", () => {
  const { terms, problems } = loadGlossary(process.cwd());
  expect(problems).toEqual([]);
  expect(terms.length).toBeGreaterThanOrEqual(10);
});

// ── A5 audit fix: inline display fields carry no newline either (no line-spoofing) ──
test("loadGlossary: strips newlines from inline fields (term/plain) — no fake lines", () => {
  const bs = String.fromCharCode(92);
  const nl = bs + "x0a"; // yaml decodes \x0a → newline
  const { terms, problems } = loadGlossary(tmpWith(`terms:
  - id: x
    term: "T${nl}fakeline"
    plain: "P${nl}Why it matters: spoofed"
`));
  expect(problems).toEqual([]);
  expect([...terms[0].term].some((c) => c.charCodeAt(0) === 0x0a)).toBe(false);
  expect([...terms[0].plain].some((c) => c.charCodeAt(0) === 0x0a)).toBe(false);
});
