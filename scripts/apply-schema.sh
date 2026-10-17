#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Applies db/schema.sql to the Supabase project.
#
#   bash scripts/apply-schema.sh            # run db/schema.sql
#   bash scripts/apply-schema.sh path.sql   # run some other file
#
# Reads the connection details from .env.local. The password never appears on
# the command line or in the shell history - it is passed through PGPASSWORD.
#
# schema.sql is written to be re-runnable: every object uses "if not exists" or
# "create or replace", so running it twice is safe and is how you pick up
# changes to the file.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

SQL_FILE="${1:-db/schema.sql}"
[ -f "$SQL_FILE" ] || { echo "ไม่พบไฟล์ $SQL_FILE"; exit 1; }
[ -f .env.local ] || { echo "ไม่พบ .env.local"; exit 1; }

read_env() {
  # Last assignment wins, trailing CR stripped (the file may have CRLF endings).
  grep "^$1=" .env.local | tail -1 | cut -d= -f2- | tr -d '\r'
}

DB_URL=$(read_env SUPABASE_DB_URL)
PASSWORD=$(read_env SUPABASE_DB_PASSWORD)
PROJECT_URL=$(read_env NEXT_PUBLIC_SUPABASE_URL)

export PGSSLMODE=require
export PGCONNECT_TIMEOUT=15

# A full connection string wins over the assembled one.
if [ -n "$DB_URL" ]; then
  echo "กำลังรัน $SQL_FILE ผ่าน SUPABASE_DB_URL …"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
  echo "เสร็จแล้ว"
  exit 0
fi

if [ -z "$PASSWORD" ]; then
  cat <<'MSG'
ยังไม่มีรหัสผ่านฐานข้อมูล

เปิด Supabase Dashboard -> Project Settings -> Database -> Database password
(กด Reset database password ถ้าจำไม่ได้ ตัวเก่าจะใช้ไม่ได้ทันที)
แล้วใส่ใน .env.local บรรทัด SUPABASE_DB_PASSWORD=

หรือกด Connect ที่หัวหน้า Dashboard เลือกแท็บ Session pooler คัดลอก URI
ทั้งเส้นมาใส่บรรทัด SUPABASE_DB_URL= แทนก็ได้
MSG
  exit 1
fi

# Project ref is the first label of the project URL.
REF=$(echo "$PROJECT_URL" | sed -E 's#https?://##; s#\..*##')
[ -n "$REF" ] || { echo "อ่าน project ref จาก NEXT_PUBLIC_SUPABASE_URL ไม่ได้"; exit 1; }

export PGPASSWORD="$PASSWORD"

# The pooler is reachable over IPv4; the direct db.<ref>.supabase.co host is
# IPv6-only on current projects. Which pooler generation a project sits behind
# varies, so try both before giving up.
for HOST in \
  "aws-1-ap-southeast-1.pooler.supabase.com" \
  "aws-0-ap-southeast-1.pooler.supabase.com"
do
  echo "ลองต่อ $HOST …"
  if psql -h "$HOST" -p 5432 -U "postgres.$REF" -d postgres \
       -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null 2>&1
  then
    echo "ต่อได้ — กำลังรัน $SQL_FILE"
    psql -h "$HOST" -p 5432 -U "postgres.$REF" -d postgres \
      -v ON_ERROR_STOP=1 -f "$SQL_FILE"
    echo "เสร็จแล้ว"
    exit 0
  fi
done

echo "ต่อฐานข้อมูลไม่สำเร็จ — ตรวจรหัสผ่าน หรือใช้ SUPABASE_DB_URL แทน"
exit 1
