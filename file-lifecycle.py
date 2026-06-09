#!/usr/bin/env python3
"""
🪦 File Lifecycle — ไฟล์เกิด-ตาย-โต ใน git repo
─────────────────────────────────────────────────────────────
Quiz 2 (Oracle School) · บ๊องแบ๊ง Oracle 🐆
ต่อจาก WS03 (digest = "commit อะไรเข้ามา") → quiz นี้ตอบ "ไฟล์เป็นยังไงบ้าง":
  • ไฟล์ถูกสร้างเมื่อไหร่ (born)        • ไฟล์ไหนถูกลบ + ลบกี่ไฟล์ (died)
  • ไฟล์ไหนยังอยู่ (survivors)          • ไฟล์ไหน churn หนัก (แก้บ่อย)

"เพราะเรามี Git เรา track ความสามารถของการทำงานได้" — พี่นัท

Usage:
  ./file-lifecycle.py <path-to-git-repo> [--since 2026-05-25]
  ./file-lifecycle.py <owner/repo>        [--since ...]   # clone ให้ก่อน
  ./file-lifecycle.py .                                   # repo ปัจจุบัน
  add --json เพื่อ machine-readable
Requires: git (+ gh/git สำหรับ clone). No pip deps.
"""
import subprocess, sys, os, json, tempfile, datetime as dt
from collections import defaultdict

args = [a for a in sys.argv[1:] if not a.startswith("--")]
JSON_OUT = "--json" in sys.argv
SINCE = next((a.split("=",1)[1] if "=" in a else sys.argv[sys.argv.index(a)+1]
              for a in sys.argv if a.startswith("--since")), None)
target = args[0] if args else "."

# resolve target → local git path (clone if owner/repo)
if "/" in target and not os.path.isdir(target):
    tmp = tempfile.mkdtemp(prefix="filelife-")
    url = target if target.startswith("http") else f"https://github.com/{target}.git"
    print(f"⏳ cloning {url} …", file=sys.stderr)
    subprocess.run(["git", "clone", "--quiet", url, tmp], check=True)
    repo = tmp
else:
    repo = target

def git(*a):
    return subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True).stdout

since_args = ["--since", SINCE] if SINCE else []

# walk history newest→oldest with per-commit date + name-status (A/D/M/R)
log = git("log", "--no-renames", "--diff-filter=ADM", "--name-status",
          "--date=short", "--pretty=format:%x01%cd", *since_args)

born, died, mods = {}, {}, defaultdict(int)   # path -> date ; path -> count
cur_date = None
for line in log.splitlines():
    if line.startswith("\x01"):
        cur_date = line[1:].strip(); continue
    if not line.strip() or cur_date is None: continue
    parts = line.split("\t")
    if len(parts) < 2: continue
    st, path = parts[0][0], parts[-1]
    # log is newest-first → last write wins = earliest event we keep by overwriting
    if st == "A": born[path] = cur_date
    elif st == "D": died.setdefault(path, cur_date)   # first(=latest) deletion
    elif st == "M": mods[path] += 1

# born is overwritten newest-first so ends at OLDEST add = true birth ✓
alive   = {p:d for p,d in born.items() if p not in died}
deleted = {p:died[p] for p in died}
churn   = sorted(((p,c) for p,c in mods.items()), key=lambda x:-x[1])

result = {
    "repo": target, "since": SINCE or "all-history",
    "created": len(born), "deleted": len(deleted), "alive": len(alive),
    "tombstones": [{"file":p, "died":d, "born":born.get(p,"?")} for p,d in
                   sorted(deleted.items(), key=lambda x:x[1], reverse=True)[:15]],
    "most_churned": [{"file":p, "edits":c} for p,c in churn[:10]],
    "newest_born": sorted(alive.items(), key=lambda x:x[1], reverse=True)[:10],
}

if JSON_OUT:
    print(json.dumps(result, ensure_ascii=False, indent=2)); sys.exit()

print(f"\n🪦 ════ FILE LIFECYCLE — {target} ════ 🪦")
print(f"ช่วง: {result['since']}\n")
print(f"  📂 สร้างขึ้นมาทั้งหมด : {result['created']:5} ไฟล์")
print(f"  🪦 ถูกลบไปแล้ว        : {result['deleted']:5} ไฟล์")
print(f"  💚 ยังอยู่ (survivors) : {result['alive']:5} ไฟล์")
churn_rate = (result['deleted']/result['created']*100) if result['created'] else 0
print(f"  ♻️  อัตราการลบ         : {churn_rate:.0f}%  (ลบ/สร้าง)\n")

print("🪦 สุสานไฟล์ (ลบล่าสุด 12 ไฟล์ — เกิด→ตาย):")
for t in result["tombstones"][:12]:
    life = ""
    try:
        b = dt.date.fromisoformat(t["born"]); d = dt.date.fromisoformat(t["died"])
        life = f" ({(d-b).days}d)"
    except Exception: pass
    print(f"   ✝ {t['file'][:52]:52} {t['born']} → {t['died']}{life}")

print("\n🔥 ไฟล์ churn หนักสุด (แก้บ่อย = จุดร้อน):")
for c in result["most_churned"][:8]:
    print(f"   {c['edits']:3}× แก้   {c['file'][:60]}")

print(f"\n— เพราะมี Git เราเห็นได้ว่าไฟล์ไหน 'เกิด-ตาย-โต' จริง ไม่ใช่แค่ snapshot ปัจจุบัน 🐆")
