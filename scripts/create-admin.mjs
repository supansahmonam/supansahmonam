/**
 * Creates the first administrator account.
 *
 *   node scripts/create-admin.mjs you@example.com
 *   node scripts/create-admin.mjs you@example.com "your-own-password"
 *
 * Run AFTER db/schema.sql - the account is created through Supabase Auth, and
 * the trigger in the schema is what copies it into the users table (table 3.1).
 * With no password given, a strong one is generated and printed once.
 *
 * Uses the service-role key, so it must only ever be run locally.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

function readEnv(name) {
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = file
    .split(/\r?\n/)
    .filter((l) => l.startsWith(`${name}=`))
    .pop();
  return line ? line.slice(name.length + 1).trim() : "";
}

function generatePassword() {
  // Base64url of 18 random bytes: 24 characters, no ambiguous punctuation.
  return randomBytes(18).toString("base64url");
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
const [email, givenPassword] = process.argv.slice(2);

if (!url || !key) {
  console.error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

if (!email || !email.includes("@")) {
  console.error("ใช้: node scripts/create-admin.mjs you@example.com [password]");
  process.exit(1);
}

const password = givenPassword || generatePassword();
const name = email.split("@")[0];

const headers = {
  "Content-Type": "application/json",
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_name: name, user_level: "0" },
  }),
});

const created = await createRes.json();

if (!createRes.ok) {
  console.error(`สร้างบัญชีไม่สำเร็จ (${createRes.status}):`, created.msg ?? created.message ?? created);
  process.exit(1);
}

// The auth trigger inserts the profile row with the metadata level, but set it
// explicitly so the account is an administrator even if the trigger is missing.
const patchRes = await fetch(
  `${url}/rest/v1/users?user_id=eq.${encodeURIComponent(created.id)}`,
  {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ user_level: "0", user_status: "1", user_name: name }),
  },
);

const profile = await patchRes.json();

if (!patchRes.ok || profile.length === 0) {
  console.error(
    "สร้างบัญชีใน Auth แล้ว แต่ปรับแถวในตาราง users ไม่สำเร็จ",
    "— ตรวจว่ารัน db/schema.sql แล้วหรือยัง",
  );
  console.error(profile);
  process.exit(1);
}

console.log("สร้างบัญชีผู้ดูแลระบบแล้ว\n");
console.log(`  อีเมล    ${email}`);
if (!givenPassword) {
  console.log(`  รหัสผ่าน  ${password}`);
  console.log("\n  รหัสผ่านนี้แสดงครั้งเดียว เก็บไว้แล้วเปลี่ยนหลังเข้าระบบครั้งแรก");
}
console.log(`\n  ระดับ    ${profile[0].user_level} (ผู้ดูแลระบบ)`);
