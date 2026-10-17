# Smart Stock — ระบบคลังสินค้าอัจฉริยะ

กรณีศึกษา บริษัท มาเธอร์ มาร์เก็ตติ้ง จำกัด (มหาชน)
ทำตาม spec ในบทที่ 3 (`docs/บทที่ 3.docx`) — 10 หน้าจอ, 3 ตาราง, แจ้งเตือน LINE

## รันบนเครื่อง

```bash
npm install
npm run dev     # http://localhost:3000
```

ยังไม่ได้ตั้งค่า Supabase → ระบบเข้า **โหมดสาธิต** อัตโนมัติ ใช้ข้อมูลตัวอย่างในหน่วยความจำ
ล็อกอินด้วยบัญชีใดก็ได้ในหน้า login รหัสผ่าน `demo1234`

| บัญชี | ระดับ |
|---|---|
| `admin@motherstock.local` | ผู้ดูแลระบบ |
| `supervisor@motherstock.local` | หัวหน้าคลังสินค้า |
| `staff@motherstock.local` | พนักงานปฏิบัติงาน |
| `purchase@motherstock.local` | ผู้ดูรายงาน |

ข้อมูลโหมดสาธิตหายเมื่อ restart dev server

## Stack

| ส่วน | ใช้ |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind 4 + shadcn/ui (radix-nova) |
| ฐานข้อมูล / Auth / Storage | Supabase (Postgres) |
| กราฟ | Recharts |
| สแกนบาร์โค้ด | BarcodeDetector API + ZXing fallback |
| ส่งออก Excel | SheetJS |
| ส่งออก PDF | jsPDF + autoTable + ฟอนต์ Sarabun ฝังในไฟล์ |
| แจ้งเตือน | LINE Messaging API (broadcast) |

## โครงสร้าง

```
db/schema.sql               สคีมาฐานข้อมูล ตรง Data Dictionary บทที่ 3
docs/                       ไฟล์ .docx ต้นฉบับ
public/fonts/               ฟอนต์ Sarabun สำหรับ PDF ภาษาไทย
src/actions/                Server Actions (auth, products, stock, users, settings)
src/app/(app)/              หน้าที่ต้องล็อกอิน
src/app/login/              หน้าเข้าสู่ระบบ
src/app/api/line/           route สำหรับ Vercel Cron ส่งสรุปรายวัน
src/components/             UI ที่ใช้ร่วมกัน (shell, charts, scanner, workspace)
src/lib/                    data access, types, constants, LINE, auth
src/proxy.ts                middleware กันคนไม่ได้ล็อกอิน
```

## ตั้งค่า Supabase

1. สร้าง project ที่ supabase.com
2. เปิด **SQL Editor → New query** วางทั้งไฟล์ `db/schema.sql` แล้วกด Run
3. คัดลอกค่าจาก **Project Settings → API Keys** ใส่ใน `.env.local`
4. สร้างบัญชีผู้ดูแลระบบคนแรกที่ **Authentication → Users → Add user**
   (ติ๊ก Auto Confirm User) แล้วรัน SQL นี้เพื่อยกระดับเป็น admin:

   ```sql
   update public.users set user_level = '0' where user_email = 'อีเมลที่เพิ่งสร้าง';
   ```

5. restart dev server — แถบ "โหมดสาธิต" จะหายไปเอง

## Deploy

ตั้ง environment variables ชุดเดียวกับ `.env.local` บน Vercel
`vercel.json` ตั้ง cron ไว้ 02:00 UTC (09:00 เวลาไทย) เรียก `/api/line/daily-summary`
route นี้ต้องมี header `Authorization: Bearer $CRON_SECRET`

## หมายเหตุสำคัญ

**ตัดสต็อกแบบ atomic** — การรับเข้า/จ่ายออกทุกครั้งวิ่งผ่าน Postgres function `move_stock()`
ที่ `SELECT ... FOR UPDATE` ล็อกแถวสินค้าไว้ก่อนแก้ยอด สองคนสแกนสินค้าตัวเดียวกันพร้อมกัน
ยอดจะไม่เพี้ยน — ตรงเกณฑ์ประเมิน "ความถูกต้องของยอดสินค้าคงเหลือ" ในบทที่ 3

**กล้องต้องใช้ HTTPS** — `getUserMedia` ทำงานบน `localhost` ได้ แต่ถ้าเปิดจากมือถือผ่าน IP
ในวง LAN (เช่น `192.168.1.5:3000`) เบราว์เซอร์จะบล็อกกล้อง ทดสอบบนมือถือจริงต้อง deploy
ขึ้น HTTPS หรือใช้ tunnel ทุกหน้าสแกนมีช่องพิมพ์บาร์โค้ดมือสำรองไว้เสมอ

**โควตา LINE** — แพ็กเกจฟรี 200 ข้อความ/เดือน นับแยกตามผู้รับ
ปิดสวิตช์ในหน้าตั้งค่าไว้ระหว่างทดสอบ

## ส่วนที่เพิ่มจาก Data Dictionary (ต้องแก้เอกสารด้วย)

1. `products.product_image` — spec หน้า 4 ต้องอัปโหลดรูป แต่ตารางที่ 3.2 ไม่มีคอลัมน์นี้
   ให้เพิ่มเป็นลำดับที่ 9 ของตารางที่ 3.2
2. ตาราง `app_settings` — spec หน้า 9 ต้องเก็บการตั้งค่าแจ้งเตือน เป็นตารางใหม่
   ที่ไม่อยู่ใน Data Dictionary
3. รหัสผ่านเก็บใน `auth.users` ของ Supabase ส่วนตาราง `users` ตามตารางที่ 3.1
   เป็น profile ที่ใช้ primary key ร่วมกัน — ทุกคอลัมน์ในเอกสารยังอยู่ครบ
