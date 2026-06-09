// 🪦 file-lifecycle — maw plugin (Quiz 2, Oracle School) · บ๊องแบ๊ง Oracle 🐆
// "เพราะเรามี Git เรา track ความสามารถของการทำงานได้" — พี่นัท
// ต่อจาก WS03 (digest = commit อะไรเข้ามา) → quiz นี้ตอบ "ไฟล์เป็นยังไงบ้าง":
//   ไฟล์เกิดเมื่อไหร่ · ไฟล์ไหนถูกลบ + กี่ไฟล์ · churn หนักแค่ไหน
// ทุกผลลัพธ์มี 3 ส่วน: 📅 TIMELINE (proof) · 🔄 CHANGES · 📊 SUMMARY
// TS rule (พี่นัท 2026-06-09): no any/unknown · no inline type · reusable types ใน types.ts
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { Writer, PluginCtx, PluginResult, Life, Tombstone, Churned, NamedDate, LifecycleReport } from "./types.ts";

const R = "\x1b[0m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", GRN = "\x1b[32m";

export const command = {
  name: "file-lifecycle",
  description: "🪦 ไฟล์เกิด-ตาย-โต ใน git — timeline + change + summary",
};

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function analyze(repo: string, since: string | undefined): Life {
  const sinceArgs: string[] = since ? ["--since", since] : [];
  const log = git(repo, ["log", "--no-renames", "--diff-filter=ADM", "--name-status",
    "--date=short", "--pretty=format:\x01%cd", ...sinceArgs]);
  const born: Record<string, string> = {};
  const died: Record<string, string> = {};
  const mods: Record<string, number> = {};
  let cur = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("\x01")) { cur = line.slice(1).trim(); continue; }
    if (!line.trim() || !cur) continue;
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const st = parts[0][0];
    const path = parts[parts.length - 1];
    if (st === "A") born[path] = cur;                              // newest-first → ลงท้ายที่ add เก่าสุด = วันเกิดจริง
    else if (st === "D") { if (!(path in died)) died[path] = cur; }
    else if (st === "M") mods[path] = (mods[path] ?? 0) + 1;
  }
  return { born, died, mods };
}

function daysBetween(a: string, b: string): string {
  const d = (Date.parse(b) - Date.parse(a)) / 86400000;
  return Number.isFinite(d) ? ` (${Math.round(d)}d)` : "";
}

function buildReport(target: string, since: string | undefined, life: Life): LifecycleReport {
  const alive: string[] = Object.keys(life.born).filter((p) => !(p in life.died));
  const tombstones: Tombstone[] = Object.entries(life.died)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([file, died]): Tombstone => ({ file, born: life.born[file] ?? "?", died }));
  const churned: Churned[] = Object.entries(life.mods)
    .sort((a, b) => b[1] - a[1])
    .map(([file, edits]): Churned => ({ file, edits }));
  const newestAlive: NamedDate[] = alive
    .map((file): NamedDate => ({ file, date: life.born[file] }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const created = Object.keys(life.born).length;
  const deleted = Object.keys(life.died).length;
  return {
    repo: target, since: since ?? "all-history", created, deleted, alive: alive.length,
    death_rate: created ? Number(((deleted / created) * 100).toFixed(1)) : 0,
    timeline_tombstones: tombstones, most_churned: churned, newest_alive: newestAlive,
  };
}

function printReport(rep: LifecycleReport, print: Writer): void {
  print(`\n${B}${RED}🪦 ════ FILE LIFECYCLE — ${rep.repo} ════ 🪦${R}`);
  print(`${DIM}ช่วง: ${rep.since}${R}\n`);

  print(`${B}${YEL}📅 TIMELINE (proof) — เหตุการณ์ไฟล์ ล่าสุด 12${R}`);
  for (const t of rep.timeline_tombstones.slice(0, 12)) {
    print(`   ${RED}✝${R} ${t.died}  ลบ  ${t.file.slice(0, 50)}  ${DIM}(เกิด ${t.born}${daysBetween(t.born, t.died)})${R}`);
  }
  for (const a of rep.newest_alive.slice(0, 4)) {
    print(`   ${GRN}+${R} ${a.date}  เกิด ${a.file.slice(0, 50)}  ${DIM}(ยังอยู่)${R}`);
  }

  print(`\n${B}${YEL}🔄 CHANGES${R}`);
  print(`   📂 สร้างขึ้นมา : ${rep.created} ไฟล์`);
  print(`   🪦 ถูกลบ       : ${rep.deleted} ไฟล์`);
  print(`   💚 ยังอยู่      : ${rep.alive} ไฟล์`);
  print(`\n   ${DIM}🔥 churn หนักสุด (แก้บ่อย = จุดร้อน):${R}`);
  for (const c of rep.most_churned.slice(0, 6)) print(`      ${c.edits}× แก้  ${c.file.slice(0, 56)}`);

  print(`\n${B}${YEL}📊 SUMMARY${R}`);
  print(`   เกิด ${rep.created} · ตาย ${rep.deleted} · รอด ${rep.alive} · อัตราการลบ ${rep.death_rate}%`);
  print(`   ${DIM}— เพราะมี Git เราเห็นว่าไฟล์ไหน 'เกิด-ตาย-โต' จริง ไม่ใช่แค่ snapshot ปัจจุบัน 🐆${R}`);
}

function printHelp(print: Writer): void {
  print(`${B}${RED}🪦 maw file-lifecycle${R} — ไฟล์เกิด-ตาย-โต ใน git`);
  print(`${YEL}maw file-lifecycle <repo-path>${R}        วิเคราะห์ทั้ง history`);
  print(`${YEL}maw file-lifecycle <repo> --since 2026-05-25${R}`);
  print(`${YEL}maw file-lifecycle <repo> --json${R}       machine-readable`);
  print(`${DIM}ทุกผลมี 📅 timeline (proof) · 🔄 changes · 📊 summary${R}`);
}

export default function invoke(ctx: PluginCtx): PluginResult {
  const lines: string[] = [];
  const print: Writer = ctx.writer ?? ((line) => { lines.push(line); });
  const flush = (): string | undefined => (lines.length ? lines.join("\n") : undefined);
  try {
    const args: string[] = ctx.args ?? [];
    if (args[0] === "help" || args.length === 0) { printHelp(print); return { ok: true, output: flush() }; }
    const json = args.includes("--json");
    const sinceIdx = args.indexOf("--since");
    const since: string | undefined = sinceIdx >= 0 ? args[sinceIdx + 1] : undefined;
    const target = args.find((a) => !a.startsWith("--") && a !== since) ?? ".";
    if (!existsSync(`${target}/.git`) && target !== ".") {
      print(`${RED}✗${R} ไม่พบ git repo ที่ ${target} (ต้องเป็น path ของ local clone)`);
      return { ok: false, error: "not a git repo", output: flush() };
    }
    const rep = buildReport(target, since, analyze(target, since));
    if (json) print(JSON.stringify(rep, null, 2));
    else printReport(rep, print);
    return { ok: true, output: flush() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, output: flush() };
  }
}
