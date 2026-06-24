import { test, expect } from "bun:test";
import {
  digestCronExpr,
  digestCommand,
  digestCronLine,
  digestLaunchdPlist,
  mergeCronBlock,
  stripCronBlock,
  notifyCommand,
  planText,
  CRON_BEGIN,
  CRON_END,
} from "./digest-schedule.ts";

// ── cron expression ─────────────────────────────────────────────────────────
test("digestCronExpr: HH:MM → cron; default + invalid fall back to 09:00", () => {
  expect(digestCronExpr("07:30")).toBe("30 7 * * *");
  expect(digestCronExpr()).toBe("0 9 * * *");
  expect(digestCronExpr("99:99")).toBe("0 9 * * *");
  expect(digestCronExpr("notatime")).toBe("0 9 * * *");
  expect(digestCronExpr("23:59")).toBe("59 23 * * *");
});

// ── command argv ────────────────────────────────────────────────────────────
test("digestCommand: argv runs `seed digest --save`; adds --notify only when asked", () => {
  const a = digestCommand("/x", {});
  expect(a).toContain("digest");
  expect(a).toContain("--save");
  expect(a.some((s) => s.endsWith("scripts/seed.ts"))).toBe(true);
  expect(a).not.toContain("--notify");
  expect(digestCommand("/x", { notify: true })).toContain("--notify");
});

// ── cron line + launchd plist ───────────────────────────────────────────────
test("digestCronLine: starts with the cron expr and invokes the digest", () => {
  const line = digestCronLine("/x", { time: "08:00" });
  expect(line.startsWith("0 8 * * *")).toBe(true);
  expect(line).toContain("scripts/seed.ts");
  expect(line).toContain("digest");
});

test("digestLaunchdPlist: argv-form ProgramArguments + welcome-digest label + time", () => {
  const plist = digestLaunchdPlist("/x", { time: "09:00" });
  expect(plist).toContain("com.digital-seed.welcome-digest");
  expect(plist).toContain("<integer>9</integer>");
  expect(plist).toContain("scripts/seed.ts");
});

test("digestLaunchdPlist: XML-escapes interpolated paths (no tag forgery, valid XML)", () => {
  // a hostile root carrying XML metacharacters
  const plist = digestLaunchdPlist('/x&y<z>"q</string><key>EVIL</key>', { time: "09:00" });
  expect(plist).toContain("&amp;"); // & escaped
  expect(plist).toContain("&lt;"); //  < escaped
  expect(plist).toContain("&gt;"); //  > escaped
  expect(plist).not.toContain("</string><key>EVIL</key>"); // no forged element survives
});

// ── crontab block edit (append-safe, idempotent, reversible) ─────────────────
test("mergeCronBlock: append-safe + idempotent; stripCronBlock leaves other lines", () => {
  const existing = "0 0 * * * other-job\n";
  const m1 = mergeCronBlock(existing, "0 9 * * * FIRST_RUN");
  expect(m1).toContain("other-job"); // pre-existing job preserved
  expect(m1).toContain(CRON_BEGIN);
  expect(m1).toContain(CRON_END);
  expect(m1).toContain("FIRST_RUN");
  // re-scheduling replaces our block in place — never duplicates it
  const m2 = mergeCronBlock(m1, "0 9 * * * SECOND_RUN");
  expect((m2.match(new RegExp(CRON_BEGIN, "g")) || []).length).toBe(1);
  expect(m2).toContain("SECOND_RUN");
  expect(m2).not.toContain("FIRST_RUN");
  // unschedule removes only our block
  const stripped = stripCronBlock(m2);
  expect(stripped).toContain("other-job");
  expect(stripped).not.toContain(CRON_BEGIN);
  expect(stripped).not.toContain("SECOND_RUN");
});

// ── desktop notification command ────────────────────────────────────────────
test("notifyCommand: argv form per platform; windows/unknown → null", () => {
  const linux = notifyCommand("linux", "Title", "Body");
  expect(linux?.cmd).toBe("notify-send");
  expect(linux?.argv).toEqual(["Title", "Body"]);
  const mac = notifyCommand("macos", "Title", "Body");
  expect(mac?.cmd).toBe("osascript");
  expect(mac?.argv[0]).toBe("-e");
  expect(notifyCommand("windows", "T", "B")).toBeNull();
  expect(notifyCommand("unknown", "T", "B")).toBeNull();
});

test("notifyCommand: osascript payload keeps exactly its 4 wrapper quotes even if title/body inject quotes/escapes", () => {
  const ESC = String.fromCharCode(0x1b);
  const clean = notifyCommand("macos", "Title", "Body");
  expect((clean!.argv[1].match(/"/g) || []).length).toBe(4);
  const dirty = notifyCommand("macos", 'Ti"tle' + ESC, 'Bo"dy"; rm -rf ~');
  expect((dirty!.argv[1].match(/"/g) || []).length).toBe(4); // injected quotes stripped
  expect([...dirty!.argv[1]].some((c) => c.charCodeAt(0) === 0x1b)).toBe(false); // no control chars
});

test("notifyCommand: notify-send argv strips control chars from title/body", () => {
  const ESC = String.fromCharCode(0x1b);
  const linux = notifyCommand("linux", "Ti" + ESC + "tle", "Bo" + ESC + "dy");
  expect([...linux!.argv.join("")].some((c) => c.charCodeAt(0) === 0x1b)).toBe(false);
});

// ── printed plan (default --schedule, no mutation) ──────────────────────────
test("planText: shows the cron line + the explicit --install path (no blind crontab replace)", () => {
  const p = planText("/x", { time: "09:00" });
  expect(p).toContain("0 9 * * *");
  expect(p).toContain("--install");
  expect(p.toLowerCase()).toContain("crontab");
});
