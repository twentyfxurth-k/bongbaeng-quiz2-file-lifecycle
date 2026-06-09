# 🪦 file-lifecycle — maw plugin (Quiz 2, Oracle School)

> บ๊องแบ๊ง Oracle 🐆 · *"เพราะเรามี Git เรา track ความสามารถของการทำงานได้"* — พี่นัท

Track **file lifecycle** ใน git repo — ต่อจาก WS03 (digest บอก "commit อะไรเข้ามา")
quiz นี้ตอบ **"ไฟล์เป็นยังไงบ้าง"**: ไฟล์เกิดเมื่อไหร่ · ไฟล์ไหนถูกลบ + กี่ไฟล์ ·
ไฟล์ไหน churn หนัก (แก้บ่อย).

ทุกผลลัพธ์มี 3 ส่วนตามที่พี่นัทสั่ง: **📅 timeline (proof) · 🔄 change · 📊 summary**

## ทำเป็น maw plugin (ไม่ใช่ script เดี่ยว)

ตามที่พี่นัทย้ำ — *"ทำโปรแกรมไว้ใน Maw Engine เสมอ ถ้าจะทำ Command"* — โปรแกรมนี้อยู่ที่
`.maw/plugins/file-lifecycle/` (plugin.json + index.ts) format เดียวกับ Workshop 01.

```
.maw/plugins/file-lifecycle/
├── plugin.json     # manifest (cli command + aliases)
├── index.ts        # maw verb handler (InvokeContext → InvokeResult)
└── tsconfig.json
```

## ใช้ยังไง

```bash
maw file-lifecycle <repo-path>                  # ทั้ง history
maw file-lifecycle <repo-path> --since 2026-05-25
maw file-lifecycle <repo-path> --json           # machine-readable (shrine-consumable)
maw flc <repo-path>                              # alias
```

## วิธีทำงาน (git diff-filter)

อ่าน history ด้วย `git log --diff-filter=ADM --name-status` (A=เกิด, D=ตาย, M=แก้)
แล้วเดินจาก**ใหม่→เก่า** → การเขียนทับ `born` จบที่ add **ที่เก่าที่สุด** = วันเกิดจริง

- **born**: เก็บ add ที่เก่าสุดต่อไฟล์ = วันเกิด
- **died**: เก็บ delete = วันตาย (+ นับจำนวน)
- **mods**: นับ M ต่อไฟล์ = churn
- **survivors** = เกิดแล้วไม่ตาย

## ผลรันจริง

ดู `OUTPUT.md` — รันบน **maw-js** จริง: เกิด 454 / ตาย 107 / รอด 395 · จับได้ว่า
ไฟล์ test ส่วนใหญ่ **เกิด-ตายในวันเดียว** (churn เดียวกับที่ WS03 เจอ แต่เห็นที่ระดับไฟล์)

## standalone reference

`file-lifecycle.py` — อัลกอริทึมเดียวกัน เวอร์ชัน Python (ไม่ต้องมี maw) สำหรับ rerun เร็ว
รับ `<owner/repo>` แล้ว clone ให้เอง

---

🤖 ตอบโดย bongbaeng จาก ก้อง → bongbaeng-oracle (AI, ไม่ใช่คน) · Quiz 2 · 2026-06-09

---

## 📈 plugin #2 — `maw self-perf` (วัด performance ตัวเองวันต่อวัน)

ตามที่พี่นัทสั่ง: คำสั่งวัด perf ตัวเอง — หา **baseline** ก่อน แล้วเทียบ **วันต่อวัน** (เพิ่ม/ลด) ใน Maw Engine
อยู่ที่ `.maw/plugins/self-perf/` · ดูผลจริงที่ `OUTPUT-self-perf.md` (รัน bongbaeng-oracle: baseline 13.8 → 06-08 ▲+38%)

```bash
maw self-perf <repo> --author <you> --baseline 3   # baseline 3 วันแรก
maw perf <repo> --json                              # machine-readable
```
score = commits×2 + net_lines + cleanliness — วัดงานที่ลงจริงใน git
