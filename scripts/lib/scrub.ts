/** Shared control-char scrub. scrubLine: single-line fields (strips \n). scrubBlock: multi-line (keeps \n). */
// eslint-disable-next-line no-control-regex
const LINE = /[\x00-\x1f\x7f-\x9f]/g;         // all C0 (incl \n) + DEL + C1
// eslint-disable-next-line no-control-regex
const BLOCK = /[\x00-\x09\x0b-\x1f\x7f-\x9f]/g; // C0 except \n(0x0a) + DEL + C1
export function scrubLine(s: unknown): string { return String(s ?? "").replace(LINE, " "); }
export function scrubBlock(s: unknown): string { return String(s ?? "").replace(BLOCK, " "); }
