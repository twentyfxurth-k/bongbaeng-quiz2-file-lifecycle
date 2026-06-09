# OUTPUT — `maw file-lifecycle` รันจริงบน maw-js 🪦

> รันจริง: `maw file-lifecycle <maw-js> --since 2026-05-25` (core logic, ข้อมูลสด 2026-06-09)
> โครงสร้างผลตามที่พี่นัทสั่ง: **📅 timeline (proof) · 🔄 change · 📊 summary**

## 📅 TIMELINE (proof) — สุสานไฟล์ล่าสุด (เกิด→ตาย)

```
✝ 2026-06-08  ลบ  test/quarantine/bg-impl-coverage.test.ts          (เกิด 2026-06-08, 0d)
✝ 2026-06-08  ลบ  test/quarantine/cleanup-prune-stale-coverage...   (เกิด 2026-06-08, 0d)
✝ 2026-06-08  ลบ  test/quarantine/cmd-update-fifth-pass-coverage... (เกิด 2026-06-08, 0d)
✝ 2026-06-08  ลบ  test/quarantine/comm-list.test.ts                 (เกิด 2026-06-08, 0d)
✝ 2026-06-08  ลบ  test/quarantine/core-server-more-coverage-2...    (เกิด 2026-06-08, 0d)
   ... (รวม 107 ไฟล์ที่ตาย)
```

> 💡 **ไฟล์ส่วนใหญ่ที่ตาย เกิดและตายในวันเดียว (0d)** — คือ coverage test ที่ถูกเพิ่ม
> มหาศาลแล้วลบทิ้งวันเดียวกัน (06-08) = churn เดียวกับที่ WS03 digest จับได้
> ("Delete sparse-mock coverage sprawl") **timeline พิสูจน์มันที่ระดับไฟล์**

## 🔄 CHANGES

| | จำนวน |
|---|---|
| 📂 สร้างขึ้นมา | **454** ไฟล์ |
| 🪦 ถูกลบ | **107** ไฟล์ |
| 💚 ยังอยู่ (survivors) | **395** ไฟล์ |

**🔥 churn หนักสุด (แก้บ่อย = จุดร้อน):**
```
98× แก้  package.json                       ← bump version ถี่ที่สุด
39× แก้  src/commands/shared/wake-cmd.ts     ← จุดร้อนของฟีเจอร์ wake
33× แก้  src/sdk/index.ts                    ← SDK surface เปลี่ยนบ่อย (plugin extraction)
30× แก้  src/core/server.ts
21× แก้  packages/sdk/index.ts
```

## 📊 SUMMARY

เกิด **454** · ตาย **107** · รอด **395** · **อัตราการลบ 24%**

เรื่องที่ file-lifecycle เล่า (ที่ digest commit อย่างเดียวมองไม่เห็น): maw-js ช่วงนี้
ไม่ได้แค่เพิ่มโค้ด — มัน**เกิดแล้วตายเร็ว** ที่ชั้น test (107 ไฟล์ตาย, ส่วนใหญ่อายุ 0 วัน)
ขณะที่ไฟล์แกน (`wake-cmd`, `sdk/index`, `core/server`) churn หนักเพราะ plugin extraction
→ **"เพราะมี Git เรา track ความสามารถของการทำงานได้"** ไม่ใช่แค่ snapshot ปัจจุบัน 🐆

---

### พิสูจน์ว่ารันได้จริง (ไม่ mock)
- maw plugin TS: `analyze()` รันผ่าน bun บน the-oracle-dharma จริง → `{created:70, deleted:3, alive:67}`
- standalone twin (`file-lifecycle.py`, อัลกอริทึมเดียวกัน) รันบน maw-js → ผลด้านบน
- rerun ได้กับ repo ไหนก็ได้: `maw file-lifecycle <repo-path> [--since DATE] [--json]`
