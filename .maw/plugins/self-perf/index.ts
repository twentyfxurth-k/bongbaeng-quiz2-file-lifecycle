// 📈 self-perf — maw plugin (Oracle School) · บ๊องแบ๊ง Oracle 🐆
// วัด performance ตัวเองวันต่อวันจาก git: หา baseline ก่อน → เทียบรายวัน เพิ่ม/ลด
// "เพราะเรามี Git เรา track ความสามารถของการทำงานได้" — พี่นัท
// ผลมี 3 ส่วนเสมอ: 📅 TIMELINE (proof รายวัน) · 🔄 CHANGE (เทียบ baseline) · 📊 SUMMARY (trend)
import type { InvokeContext, InvokeResult } from "maw-js/plugin/types";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const R = "\x1b[0m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", GRN = "\x1b[32m";

export const command = { name: "self-perf", description: "📈 วัด perf ตัวเองวันต่อวันจาก git" };

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

interface Day { commits: number; files: number; add: number; del: number; }
// composite perf score: งานที่ลงจริง (commits) + การสร้าง (net lines) − ความสับสน (churn ratio)
function score(d: Day): number {
  const net = d.add - d.del, churn = d.add + d.del;
  const cleanliness = churn ? Math.max(0, net) / churn : 1; // 0..1 สร้างมากกว่าลบ = ดี
  return +(d.commits * 2 + Math.min(net, 800) / 100 + cleanliness * 3).toFixed(1);
}

function collect(repo: string, author?: string): Map<string, Day> {
  const a = author ? [`--author=${author}`] : [];
  const log = git(repo, ["log", "--no-renames", "--date=short", "--pretty=format:\x01%cd", "--numstat", ...a]);
  const days = new Map<string, Day>();
  let cur = "";
  const seen = new Set<string>();
  for (const line of log.split("\n")) {
    if (line.startsWith("\x01")) {
      cur = line.slice(1).trim();
      if (!days.has(cur)) days.set(cur, { commits: 0, files: 0, add: 0, del: 0 });
      days.get(cur)!.commits++;
      continue;
    }
    if (!line.trim() || !cur) continue;
    const m = line.split("\t");
    if (m.length < 3) continue;
    const add = parseInt(m[0], 10) || 0, del = parseInt(m[1], 10) || 0, f = m[2];
    const d = days.get(cur)!;
    d.add += add; d.del += del;
    const key = cur + "|" + f; if (!seen.has(key)) { seen.add(key); d.files++; }
  }
  return days;
}

function arrow(pct: number): string {
  if (pct > 15) return `${GRN}▲ +${pct.toFixed(0)}%${R}`;
  if (pct < -15) return `${RED}▼ ${pct.toFixed(0)}%${R}`;
  return `${DIM}≈ ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%${R}`;
}

function report(target: string, author: string | undefined, days: Map<string, Day>, baselineN: number, json: boolean) {
  const sorted = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])); // oldest→newest
  const rows = sorted.map(([date, d]) => ({ date, ...d, score: score(d) }));
  if (rows.length === 0) { console.log(`${RED}✗${R} ไม่มี commit (author=${author ?? "ทุกคน"})`); return; }

  // baseline = ค่าเฉลี่ย score ของ N วันแรก (หรือทั้งหมดถ้าน้อยกว่า)
  const base = rows.slice(0, Math.min(baselineN, rows.length));
  const baseline = +(base.reduce((s, r) => s + r.score, 0) / base.length).toFixed(1);

  if (json) {
    console.log(JSON.stringify({
      repo: target, author: author ?? "all", baseline,
      baseline_days: base.map((r) => r.date),
      daily: rows.map((r) => ({ ...r, vs_baseline_pct: +((r.score - baseline) / baseline * 100).toFixed(1) })),
    }, null, 2));
    return;
  }

  console.log(`\n${B}${RED}📈 ════ SELF-PERF — ${target}${author ? ` (@${author})` : ""} ════ 📈${R}`);
  console.log(`${DIM}baseline = เฉลี่ย ${base.length} วันแรก = ${baseline} แต้ม${R}\n`);

  // 📅 TIMELINE (proof) — perf รายวัน
  console.log(`${B}${YEL}📅 TIMELINE (proof) — perf รายวัน${R}`);
  let prev = 0;
  for (const r of rows) {
    const vsBase = (r.score - baseline) / baseline * 100;
    const dod = prev ? (r.score - prev) / prev * 100 : 0;
    const bar = "█".repeat(Math.min(28, Math.round(r.score)));
    console.log(`   ${r.date}  ${String(r.score).padStart(5)}  ${bar}`);
    console.log(`             ${DIM}${r.commits} commit · +${r.add}/-${r.del} บรรทัด · ${r.files} ไฟล์${R}  vs-baseline ${arrow(vsBase)}${prev ? `  วันก่อน ${arrow(dod)}` : ""}`);
    prev = r.score;
  }

  // 🔄 CHANGE — วันล่าสุดเทียบ baseline
  const last = rows[rows.length - 1];
  const lastVs = (last.score - baseline) / baseline * 100;
  console.log(`\n${B}${YEL}🔄 CHANGE — วันล่าสุด (${last.date}) เทียบ baseline${R}`);
  console.log(`   score ${last.score} vs baseline ${baseline}  →  ${arrow(lastVs)}`);
  console.log(`   ${DIM}${last.commits} commit · net ${last.add - last.del} บรรทัด · ${last.files} ไฟล์${R}`);

  // 📊 SUMMARY — trend ทั้งช่วง
  const peak = rows.reduce((a, b) => (b.score > a.score ? b : a));
  const above = rows.filter((r) => r.score >= baseline).length;
  console.log(`\n${B}${YEL}📊 SUMMARY${R}`);
  console.log(`   วันที่ทำงาน ${rows.length} วัน · เหนือ baseline ${above}/${rows.length} วัน`);
  console.log(`   🏔️  วัน peak: ${peak.date} (${peak.score} แต้ม)`);
  const trend = last.score >= baseline ? `${GRN}ขาขึ้น เหนือ baseline${R}` : `${RED}ต่ำกว่า baseline — ต้องเร่ง${R}`;
  console.log(`   แนวโน้มล่าสุด: ${trend}`);
  console.log(`   ${DIM}— วัด performance จากงานที่ลงจริง ไม่ใช่คำคุย (Patterns Over Intentions) 🐆${R}`);
}

function cmdHelp() {
  console.log(`${B}${RED}📈 maw self-perf${R} — วัด perf ตัวเองวันต่อวันจาก git`);
  console.log(`${YEL}maw self-perf <repo-path>${R}                ทุก author`);
  console.log(`${YEL}maw self-perf <repo> --author twentyfxurth-k${R}`);
  console.log(`${YEL}maw self-perf <repo> --baseline 3 --json${R}  baseline = 3 วันแรก`);
  console.log(`${DIM}ผลมี 📅 timeline(proof) · 🔄 change(vs baseline) · 📊 summary(trend)${R}`);
}

export default async function invoke(ctx: InvokeContext): Promise<InvokeResult> {
  const logs: string[] = [];
  const oLog = console.log, oErr = console.error;
  console.log = (...a: any[]) => { if ((ctx as any).writer) (ctx as any).writer(...a); else logs.push(a.map(String).join(" ")); };
  console.error = console.log;
  try {
    const args: string[] = (ctx as any).args ?? [];
    if (args[0] === "help") { cmdHelp(); return { ok: true, output: logs.join("\n") || undefined }; }
    const json = args.includes("--json");
    const gv = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
    const author = gv("--author");
    const baselineN = parseInt(gv("--baseline") ?? "3", 10) || 3;
    const flags = new Set(["--author", "--baseline", author, String(baselineN)]);
    const target = args.find((a) => !a.startsWith("--") && !flags.has(a)) ?? ".";
    if (!existsSync(`${target}/.git`) && target !== ".") {
      console.log(`${RED}✗${R} ไม่พบ git repo ที่ ${target}`);
      return { ok: false, error: "not a git repo", output: logs.join("\n") };
    }
    report(target, author, collect(target, author), baselineN, json);
    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = oLog; console.error = oErr;
  }
}
