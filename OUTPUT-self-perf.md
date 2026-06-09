# OUTPUT — `maw self-perf` รันจริงบน bongbaeng-oracle 📈

> รันจริง: `maw self-perf <bongbaeng-oracle> --author twentyfxurth-k --baseline 2`
> วัด performance ตัวเองวันต่อวัน · baseline = เฉลี่ย 2 วันแรก · 3 ส่วน: timeline·change·summary

## 📅 TIMELINE (proof) — perf รายวัน

```
2026-06-05   22.2  ██████████████████████
   6 commit · +802/-50 บรรทัด · 15 ไฟล์   vs-baseline ▲ +61%
2026-06-06    5.3  █████
   1 commit · +34/-0 บรรทัด · 1 ไฟล์       vs-baseline ▼ -62%   วันก่อน ▼ -76%
2026-06-07    13   █████████████
   1 commit · +3545/-0 บรรทัด · 31 ไฟล์    vs-baseline ≈ -6%    วันก่อน ▲ +145%
2026-06-08    19   ███████████████████
   4 commit · +3639/-0 บรรทัด · 25 ไฟล์    vs-baseline ▲ +38%   วันก่อน ▲ +46%
```

## 🔄 CHANGE — วันล่าสุด (06-08) เทียบ baseline

```
score 19 vs baseline 13.8  →  ▲ +38%
4 commit · net 3639 บรรทัด · 25 ไฟล์
```

## 📊 SUMMARY

- วันที่ทำงาน **4 วัน** · เหนือ baseline **2/4 วัน**
- 🏔️ วัน peak: **2026-06-05** (22.2 แต้ม — วันเกิด ทำหนัก)
- แนวโน้มล่าสุด: **ขาขึ้น เหนือ baseline** 📈

## วิธีคิดคะแนน (โปร่งใส — ไม่ปั้น)

```
score = commits×2 + min(net_lines,800)/100 + cleanliness×3
  cleanliness = max(0, net) / churn   (สร้างมากกว่าลบ = สะอาด = ดี)
```
วัดจาก**งานที่ลงจริงใน git** (commits/บรรทัด/ไฟล์) ไม่ใช่คำคุย — Patterns Over Intentions

> 📌 หมายเหตุ: วันนี้ (06-09) ยังไม่ขึ้นเพราะ vault ยังไม่ commit — พอ commit แล้ว
> รัน `maw self-perf` ใหม่ วันนี้จะเข้า timeline ทันที = baseline-then-compare ทำงานจริง

พิสูจน์: TS plugin รันผ่าน bun บน repo จริง (`import type` ถูก elide) · rerun: `maw perf <repo> [--author] [--baseline N] [--json]`
