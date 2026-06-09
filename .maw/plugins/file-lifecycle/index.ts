// 🪦 file-lifecycle — maw plugin (Quiz 2, Oracle School) · บ๊องแบ๊ง Oracle 🐆
// "เพราะเรามี Git เรา track ความสามารถของการทำงานได้" — พี่นัท
// ต่อจาก WS03 (digest = commit อะไรเข้ามา) → quiz นี้ตอบ "ไฟล์เป็นยังไงบ้าง":
//   ไฟล์เกิดเมื่อไหร่ · ไฟล์ไหนถูกลบ + กี่ไฟล์ · churn หนักแค่ไหน
// ทุกผลลัพธ์มี 3 ส่วนตามที่พี่นัทสั่ง: 📅 TIMELINE (proof) · 🔄 CHANGES · 📊 SUMMARY
import type { InvokeContext, InvokeResult } from "maw-js/plugin/types";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const R = "\x1b[0m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", GRN = "\x1b[32m";

export const command = {
  name: "file-lifecycle",
  description: "🪦 ไฟล์เกิด-ตาย-โต ใน git — timeline + change + summary",
};

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

interface Life { born: Record<string, string>; died: Record<string, string>; mods: Record<string, number>; }

function analyze(repo: string, since?: string): Life {
  const sinceArgs = since ? ["--since", since] : [];
  // newest→oldest, per-commit date + name-status (A/D/M)
  const log = git(repo, ["log", "--no-renames", "--diff-filter=ADM", "--name-status",
    "--date=short", "--pretty=format:\x01%cd", ...sinceArgs]);
  const born: Record<string, string> = {}, died: Record<string, string> = {}, mods: Record<string, number> = {};
  let cur = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("\x01")) { cur = line.slice(1).trim(); continue; }
    if (!line.trim() || !cur) continue;
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const st = parts[0][0], path = parts[parts.length - 1];
    // log is newest-first → overwriting born ends at the OLDEST add = true birth
    if (st === "A") born[path] = cur;
    else if (st === "D") { if (!(path in died)) died[path] = cur; }
    else if (st === "M") mods[path] = (mods[path] ?? 0) + 1;
  }
  return { born, died, mods };
}

function daysBetween(a: string, b: string): string {
  const d = (Date.parse(b) - Date.parse(a)) / 86400000;
  return Number.isFinite(d) ? ` (${Math.round(d)}d)` : "";
}

function report(repo: string, target: string, since: string | undefined, life: Life, json: boolean) {
  const { born, died, mods } = life;
  const alive = Object.keys(born).filter((p) => !(p in died));
  const tombstones = Object.entries(died).sort((a, b) => b[1].localeCompare(a[1]));
  const churn = Object.entries(mods).sort((a, b) => b[1] - a[1]);
  const created = Object.keys(born).length, deleted = Object.keys(died).length;

  if (json) {
    console.log(JSON.stringify({
      repo: target, since: since ?? "all-history", created, deleted, alive: alive.length,
      death_rate: created ? +(deleted / created * 100).toFixed(1) : 0,
      timeline_tombstones: tombstones.slice(0, 20).map(([f, d]) => ({ file: f, born: born[f] ?? "?", died: d })),
      most_churned: churn.slice(0, 10).map(([f, c]) => ({ file: f, edits: c })),
      newest_alive: alive.map((p) => [p, born[p]] as [string, string]).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 10),
    }, null, 2));
    return;
  }

  console.log(`\n${B}${RED}🪦 ════ FILE LIFECYCLE — ${target} ════ 🪦${R}`);
  console.log(`${DIM}ช่วง: ${since ?? "all-history"}${R}\n`);

  // 📅 TIMELINE (proof) — เรียงตามเวลา ใครเกิด/ตายเมื่อไหร่
  console.log(`${B}${YEL}📅 TIMELINE (proof) — เหตุการณ์ไฟล์ ล่าสุด 12${R}`);
  for (const [f, d] of tombstones.slice(0, 12)) {
    console.log(`   ${RED}✝${R} ${d}  ลบ  ${f.slice(0, 50)}  ${DIM}(เกิด ${born[f] ?? "?"}${daysBetween(born[f] ?? d, d)})${R}`);
  }
  const newestAlive = alive.map((p) => [p, born[p]] as [string, string]).sort((a, b) => b[1].localeCompare(a[1]));
  for (const [f, d] of newestAlive.slice(0, 4)) {
    console.log(`   ${GRN}+${R} ${d}  เกิด ${f.slice(0, 50)}  ${DIM}(ยังอยู่)${R}`);
  }

  // 🔄 CHANGES
  console.log(`\n${B}${YEL}🔄 CHANGES${R}`);
  console.log(`   📂 สร้างขึ้นมา : ${created} ไฟล์`);
  console.log(`   🪦 ถูกลบ       : ${deleted} ไฟล์`);
  console.log(`   💚 ยังอยู่      : ${alive.length} ไฟล์`);
  console.log(`\n   ${DIM}🔥 churn หนักสุด (แก้บ่อย = จุดร้อน):${R}`);
  for (const [f, c] of churn.slice(0, 6)) console.log(`      ${c}× แก้  ${f.slice(0, 56)}`);

  // 📊 SUMMARY
  const rate = created ? (deleted / created * 100).toFixed(0) : "0";
  console.log(`\n${B}${YEL}📊 SUMMARY${R}`);
  console.log(`   เกิด ${created} · ตาย ${deleted} · รอด ${alive.length} · อัตราการลบ ${rate}%`);
  console.log(`   ${DIM}— เพราะมี Git เราเห็นว่าไฟล์ไหน 'เกิด-ตาย-โต' จริง ไม่ใช่แค่ snapshot ปัจจุบัน 🐆${R}`);
}

function cmdHelp() {
  console.log(`${B}${RED}🪦 maw file-lifecycle${R} — ไฟล์เกิด-ตาย-โต ใน git`);
  console.log(`${DIM}─────────────────────────────────────${R}`);
  console.log(`${YEL}maw file-lifecycle <repo-path> ${R}        วิเคราะห์ทั้ง history`);
  console.log(`${YEL}maw file-lifecycle <repo> --since 2026-05-25${R}`);
  console.log(`${YEL}maw file-lifecycle <repo> --json${R}       machine-readable`);
  console.log(`${DIM}ทุกผลมี 📅 timeline (proof) · 🔄 changes · 📊 summary${R}`);
}

export default async function invoke(ctx: InvokeContext): Promise<InvokeResult> {
  const logs: string[] = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a: any[]) => { if ((ctx as any).writer) (ctx as any).writer(...a); else logs.push(a.map(String).join(" ")); };
  console.error = console.log;
  try {
    const args: string[] = (ctx as any).args ?? [];
    if (args[0] === "help" || args.length === 0) { cmdHelp(); return { ok: true, output: logs.join("\n") || undefined }; }
    const json = args.includes("--json");
    let since: string | undefined;
    const si = args.indexOf("--since");
    if (si >= 0 && args[si + 1]) since = args[si + 1];
    const target = args.find((a) => !a.startsWith("--") && a !== since) ?? ".";
    const repo = target;
    if (!existsSync(`${repo}/.git`) && repo !== ".") {
      console.log(`${RED}✗${R} ไม่พบ git repo ที่ ${repo} (ต้องเป็น path ของ local clone)`);
      return { ok: false, error: "not a git repo", output: logs.join("\n") };
    }
    const life = analyze(repo, since);
    report(repo, target, since, life, json);
    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = origLog; console.error = origErr;
  }
}
