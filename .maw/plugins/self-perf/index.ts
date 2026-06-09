// 📈 self-perf — maw plugin (Oracle School) · บ๊องแบ๊ง Oracle 🐆
// วัด performance ตัวเองวันต่อวันจาก git: หา baseline ก่อน → เทียบรายวัน เพิ่ม/ลด
// "เพราะเรามี Git เรา track ความสามารถของการทำงานได้" — พี่นัท
// ผลมี 3 ส่วน: 📅 TIMELINE (proof รายวัน) · 🔄 CHANGE (เทียบ baseline) · 📊 SUMMARY (trend)
// TS rule (พี่นัท 2026-06-09): no any/unknown · no inline type · reusable types ใน types.ts
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { Writer, PluginCtx, PluginResult, Day, DayRow, PerfReport } from "./types.ts";

const R = "\x1b[0m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", GRN = "\x1b[32m";

export const command = { name: "self-perf", description: "📈 วัด perf ตัวเองวันต่อวันจาก git" };

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// composite perf score: งานที่ลงจริง (commits) + การสร้าง (net lines) − ความสับสน (churn ratio)
function score(d: Day): number {
  const net = d.add - d.del;
  const churn = d.add + d.del;
  const cleanliness = churn ? Math.max(0, net) / churn : 1;
  return Number((d.commits * 2 + Math.min(net, 800) / 100 + cleanliness * 3).toFixed(1));
}

function collect(repo: string, author: string | undefined): Map<string, Day> {
  const authorArgs: string[] = author ? [`--author=${author}`] : [];
  const log = git(repo, ["log", "--no-renames", "--date=short", "--pretty=format:\x01%cd", "--numstat", ...authorArgs]);
  const days = new Map<string, Day>();
  const seen = new Set<string>();
  let cur = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("\x01")) {
      cur = line.slice(1).trim();
      if (!days.has(cur)) days.set(cur, { commits: 0, files: 0, add: 0, del: 0 });
      const d = days.get(cur);
      if (d) d.commits++;
      continue;
    }
    if (!line.trim() || !cur) continue;
    const m = line.split("\t");
    if (m.length < 3) continue;
    const add = parseInt(m[0], 10) || 0;
    const del = parseInt(m[1], 10) || 0;
    const file = m[2];
    const d = days.get(cur);
    if (!d) continue;
    d.add += add; d.del += del;
    const key = `${cur}|${file}`;
    if (!seen.has(key)) { seen.add(key); d.files++; }
  }
  return days;
}

function buildReport(target: string, author: string | undefined, days: Map<string, Day>, baselineN: number): PerfReport {
  const rows: DayRow[] = [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]): DayRow => ({ date, commits: d.commits, files: d.files, add: d.add, del: d.del, score: score(d) }));
  const base = rows.slice(0, Math.min(baselineN, rows.length));
  const baseline = base.length ? Number((base.reduce((s, r) => s + r.score, 0) / base.length).toFixed(1)) : 0;
  return { repo: target, author: author ?? "all", baseline, baselineDays: base.map((r) => r.date), rows };
}

function arrow(pct: number): string {
  if (pct > 15) return `${GRN}▲ +${pct.toFixed(0)}%${R}`;
  if (pct < -15) return `${RED}▼ ${pct.toFixed(0)}%${R}`;
  return `${DIM}≈ ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%${R}`;
}

function printReport(rep: PerfReport, print: Writer): void {
  if (rep.rows.length === 0) { print(`${RED}✗${R} ไม่มี commit (author=${rep.author})`); return; }
  const last = rep.rows[rep.rows.length - 1];
  print(`\n${B}${RED}📈 ════ SELF-PERF — ${rep.repo} (@${rep.author}) ════ 📈${R}`);
  print(`${DIM}baseline = เฉลี่ย ${rep.baselineDays.length} วันแรก = ${rep.baseline} แต้ม${R}\n`);

  print(`${B}${YEL}📅 TIMELINE (proof) — perf รายวัน${R}`);
  let prev = 0;
  for (const r of rep.rows) {
    const vsBase = rep.baseline ? ((r.score - rep.baseline) / rep.baseline) * 100 : 0;
    const dod = prev ? ((r.score - prev) / prev) * 100 : 0;
    const bar = "█".repeat(Math.min(28, Math.round(r.score)));
    print(`   ${r.date}  ${String(r.score).padStart(5)}  ${bar}`);
    print(`             ${DIM}${r.commits} commit · +${r.add}/-${r.del} บรรทัด · ${r.files} ไฟล์${R}  vs-baseline ${arrow(vsBase)}${prev ? `  วันก่อน ${arrow(dod)}` : ""}`);
    prev = r.score;
  }

  const lastVs = rep.baseline ? ((last.score - rep.baseline) / rep.baseline) * 100 : 0;
  print(`\n${B}${YEL}🔄 CHANGE — วันล่าสุด (${last.date}) เทียบ baseline${R}`);
  print(`   score ${last.score} vs baseline ${rep.baseline}  →  ${arrow(lastVs)}`);
  print(`   ${DIM}${last.commits} commit · net ${last.add - last.del} บรรทัด · ${last.files} ไฟล์${R}`);

  const peak = rep.rows.reduce((a, b) => (b.score > a.score ? b : a));
  const above = rep.rows.filter((r) => r.score >= rep.baseline).length;
  print(`\n${B}${YEL}📊 SUMMARY${R}`);
  print(`   วันที่ทำงาน ${rep.rows.length} วัน · เหนือ baseline ${above}/${rep.rows.length} วัน`);
  print(`   🏔️  วัน peak: ${peak.date} (${peak.score} แต้ม)`);
  const trend = last.score >= rep.baseline ? `${GRN}ขาขึ้น เหนือ baseline${R}` : `${RED}ต่ำกว่า baseline — ต้องเร่ง${R}`;
  print(`   แนวโน้มล่าสุด: ${trend}`);
  print(`   ${DIM}— วัด performance จากงานที่ลงจริง ไม่ใช่คำคุย (Patterns Over Intentions) 🐆${R}`);
}

function printHelp(print: Writer): void {
  print(`${B}${RED}📈 maw self-perf${R} — วัด perf ตัวเองวันต่อวันจาก git`);
  print(`${YEL}maw self-perf <repo-path>${R}                ทุก author`);
  print(`${YEL}maw self-perf <repo> --author twentyfxurth-k${R}`);
  print(`${YEL}maw self-perf <repo> --baseline 3 --json${R}  baseline = 3 วันแรก`);
  print(`${DIM}ผลมี 📅 timeline(proof) · 🔄 change(vs baseline) · 📊 summary(trend)${R}`);
}

export default function invoke(ctx: PluginCtx): PluginResult {
  const lines: string[] = [];
  const print: Writer = ctx.writer ?? ((line) => { lines.push(line); });
  const flush = (): string | undefined => (lines.length ? lines.join("\n") : undefined);
  try {
    const args: string[] = ctx.args ?? [];
    if (args[0] === "help") { printHelp(print); return { ok: true, output: flush() }; }
    const json = args.includes("--json");
    const getVal = (flag: string): string | undefined => {
      const i = args.indexOf(flag);
      return i >= 0 ? args[i + 1] : undefined;
    };
    const author = getVal("--author");
    const baselineN = parseInt(getVal("--baseline") ?? "3", 10) || 3;
    const flags = new Set<string>(["--author", "--baseline", author ?? "", String(baselineN)]);
    const target = args.find((a) => !a.startsWith("--") && !flags.has(a)) ?? ".";
    if (!existsSync(`${target}/.git`) && target !== ".") {
      print(`${RED}✗${R} ไม่พบ git repo ที่ ${target}`);
      return { ok: false, error: "not a git repo", output: flush() };
    }
    const rep = buildReport(target, author, collect(target, author), baselineN);
    if (json) print(JSON.stringify(rep, null, 2));
    else printReport(rep, print);
    return { ok: true, output: flush() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, output: flush() };
  }
}
