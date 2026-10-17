import type { AppSettings, Product, Transaction, User } from "@/lib/types";
import { DEFAULT_TEMPLATE } from "@/lib/constants";

/**
 * In-memory dataset used while NEXT_PUBLIC_SUPABASE_URL is empty, so the whole
 * UI can be demonstrated before the Supabase project exists. Every mutation
 * lands here instead of the database and is lost when the dev server restarts.
 *
 * As soon as the Supabase environment variables are set, `isDemo` flips to
 * false and nothing in this file is imported at runtime any more.
 */

export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const DEMO_PASSWORD = "demo1234";

/** Deterministic pseudo-random numbers, so the demo data never shifts. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const now = new Date();

function daysAgo(days: number, hour = 9, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// --- users -----------------------------------------------------------------

const seedUsers: User[] = [
  {
    user_id: "11111111-1111-4111-8111-111111111111",
    user_name: "กานต์ ผู้ดูแลระบบ",
    user_email: "admin@motherstock.local",
    user_status: "1",
    user_level: "0",
    user_createdAt: daysAgo(120),
    user_updatedAt: daysAgo(120),
  },
  {
    user_id: "22222222-2222-4222-8222-222222222222",
    user_name: "สมชาย หัวหน้าคลัง",
    user_email: "supervisor@motherstock.local",
    user_status: "1",
    user_level: "1",
    user_createdAt: daysAgo(90),
    user_updatedAt: daysAgo(90),
  },
  {
    user_id: "33333333-3333-4333-8333-333333333333",
    user_name: "มานี พนักงานคลัง",
    user_email: "staff@motherstock.local",
    user_status: "1",
    user_level: "2",
    user_createdAt: daysAgo(60),
    user_updatedAt: daysAgo(60),
  },
  {
    user_id: "44444444-4444-4444-8444-444444444444",
    user_name: "วิภา ฝ่ายจัดซื้อ",
    user_email: "purchase@motherstock.local",
    user_status: "1",
    user_level: "3",
    user_createdAt: daysAgo(45),
    user_updatedAt: daysAgo(45),
  },
  {
    user_id: "55555555-5555-4555-8555-555555555555",
    user_name: "ประสิทธิ์ (ลาออก)",
    user_email: "former@motherstock.local",
    user_status: "0",
    user_level: "2",
    user_createdAt: daysAgo(200),
    user_updatedAt: daysAgo(30),
  },
];

// --- products --------------------------------------------------------------

type Seed = [
  barcode: string,
  name: string,
  category: string,
  unit: string,
  price: number,
  qty: number,
  minQty: number,
];

const productSeeds: Seed[] = [
  ["8850001110019", "น้ำดื่มตราสิงห์ 600 มล. (แพ็ค 12)", "เครื่องดื่ม", "แพ็ค", 62, 140, 40],
  ["8850001110026", "น้ำอัดลมโค้ก 1.25 ล.", "เครื่องดื่ม", "ขวด", 28, 96, 48],
  ["8850001110033", "นมสดหนองโพ 200 มล. (ยกลัง)", "เครื่องดื่ม", "ลัง", 285, 18, 20],
  ["8850001110040", "กาแฟเนสกาแฟ เรดคัพ 200 ก.", "เครื่องดื่ม", "กระปุก", 129, 64, 24],
  ["8850002220017", "บะหมี่กึ่งสำเร็จรูปมาม่า หมูสับ (ยกลัง)", "อาหารแห้ง", "ลัง", 330, 42, 15],
  ["8850002220024", "ข้าวหอมมะลิ 5 กก.", "อาหารแห้ง", "ถุง", 189, 56, 20],
  ["8850002220031", "น้ำมันพืชปาล์ม 1 ล.", "อาหารแห้ง", "ขวด", 54, 8, 30],
  ["8850002220048", "น้ำตาลทรายขาว 1 กก.", "อาหารแห้ง", "ถุง", 26, 210, 60],
  ["8850002220055", "ซอสหอยนางรมแม่ครัว 600 ก.", "อาหารแห้ง", "ขวด", 48, 37, 18],
  ["8850003330014", "ผงซักฟอกบรีส 2500 ก.", "ของใช้ในครัวเรือน", "ถุง", 149, 31, 12],
  ["8850003330021", "น้ำยาล้างจานซันไลต์ 800 มล.", "ของใช้ในครัวเรือน", "ขวด", 59, 44, 20],
  ["8850003330038", "น้ำยาปรับผ้านุ่มดาวน์นี่ 1.3 ล.", "ของใช้ในครัวเรือน", "ถุง", 119, 5, 15],
  ["8850003330045", "ถุงขยะดำ 30x40 นิ้ว (แพ็ค)", "ของใช้ในครัวเรือน", "แพ็ค", 45, 88, 25],
  ["8850004440011", "ยาสีฟันคอลเกต 150 ก.", "ของใช้ส่วนตัว", "หลอด", 69, 72, 24],
  ["8850004440028", "แชมพูซันซิล 450 มล.", "ของใช้ส่วนตัว", "ขวด", 139, 26, 18],
  ["8850004440035", "สบู่เหลวโพรเทคส์ 450 มล.", "ของใช้ส่วนตัว", "ขวด", 99, 11, 12],
  ["8850004440042", "กระดาษชำระเซลล็อกซ์ (แพ็ค 12)", "ของใช้ส่วนตัว", "แพ็ค", 165, 34, 15],
  ["8850005550018", "ขนมปังฟาร์มเฮ้าส์ แผ่นหนา", "เบเกอรี่", "ถุง", 42, 24, 30],
  ["8850005550025", "คุกกี้เดนิช บัตเตอร์ 454 ก.", "เบเกอรี่", "กล่อง", 219, 16, 10],
  ["8850006660015", "ถ่านไฟฉายพานาโซนิค AA (แพ็ค 4)", "เบ็ดเตล็ด", "แพ็ค", 65, 52, 20],
  ["8850006660022", "หลอดไฟ LED 9W ฟิลิปส์", "เบ็ดเตล็ด", "หลอด", 89, 40, 16],
  ["8850006660039", "เทปใสกาว 1 นิ้ว", "เบ็ดเตล็ด", "ม้วน", 22, 130, 40],
  ["8850006660046", "ถุงมือยางอเนกประสงค์ ไซส์ M", "เบ็ดเตล็ด", "คู่", 35, 3, 20],
  ["8850006660053", "กล่องกระดาษลูกฟูก เบอร์ 3", "เบ็ดเตล็ด", "ใบ", 18, 265, 80],
];

const seedProducts: Product[] = productSeeds.map(
  ([barcode, name, category, unit, price, qty, minQty], index) => ({
    product_id: `p-${String(index + 1).padStart(3, "0")}`,
    product_barcode: barcode,
    product_name: name,
    product_category: category,
    product_unit: unit,
    product_price: price,
    product_qty: qty,
    product_minQty: minQty,
    product_image: null,
    product_createdAt: daysAgo(120 - index),
    product_updatedAt: daysAgo(Math.max(0, 30 - (index % 30))),
  }),
);

// --- transactions ----------------------------------------------------------

function buildTransactions(): Transaction[] {
  const random = makeRandom(20260925);
  const rows: Transaction[] = [];
  const counters = new Map<string, number>();

  const nextCode = (type: "1" | "2", date: Date) => {
    const day = bangkokDayStamp(date);
    const key = `${type}-${day}`;
    const seq = (counters.get(key) ?? 0) + 1;
    counters.set(key, seq);
    return `${type === "1" ? "RC" : "IS"}-${day}-${String(seq).padStart(4, "0")}`;
  };

  for (let d = 29; d >= 0; d--) {
    const perDay = 2 + Math.floor(random() * 5);
    for (let i = 0; i < perDay; i++) {
      const product = seedProducts[Math.floor(random() * seedProducts.length)];
      const type: "1" | "2" = random() > 0.45 ? "2" : "1";
      const qty = 1 + Math.floor(random() * (type === "1" ? 40 : 15));
      const user = seedUsers[Math.floor(random() * 3)];
      const hour = 8 + Math.floor(random() * 10);
      const minute = Math.floor(random() * 60);
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(hour, minute, 0, 0);

      rows.push({
        transaction_id: `t-${rows.length + 1}`,
        transaction_code: nextCode(type, date),
        transaction_type: type,
        transaction_qty: qty,
        transaction_price: qty * product.product_price,
        transaction_date: date.toISOString(),
        transaction_note:
          type === "1" ? "รับจากซัพพลายเออร์" : random() > 0.6 ? "เบิกหน้าร้าน" : null,
        transaction_status: "1",
        transaction_notify:
          type === "2" && product.product_qty <= product.product_minQty ? "1" : "0",
        product_id: product.product_id,
        user_id: user.user_id,
        transaction_createdAt: date.toISOString(),
        transaction_updatedAt: date.toISOString(),
      });
    }
  }

  return rows.sort(
    (a, b) => Date.parse(b.transaction_date) - Date.parse(a.transaction_date),
  );
}

// --- mutable store ---------------------------------------------------------

type Store = {
  users: User[];
  products: Product[];
  transactions: Transaction[];
  settings: AppSettings;
  session: string | null;
};

/**
 * Held on globalThis so it survives the module reloads that happen on every
 * edit in dev. Without this every save would reset the demo data.
 */
const globalStore = globalThis as unknown as { __smartStockDemo?: Store };

export function demoStore(): Store {
  if (!globalStore.__smartStockDemo) {
    globalStore.__smartStockDemo = {
      users: seedUsers.map((u) => ({ ...u })),
      products: seedProducts.map((p) => ({ ...p })),
      transactions: buildTransactions(),
      settings: {
        id: 1,
        line_enabled: true,
        line_recipient_scope: "broadcast",
        daily_summary_enabled: false,
        daily_summary_time: "09:00",
        message_template: DEFAULT_TEMPLATE,
        updated_at: now.toISOString(),
      },
      session: null,
    };
  }
  return globalStore.__smartStockDemo;
}

/** yyyymmdd in Bangkok time, matching next_transaction_code() in schema.sql. */
function bangkokDayStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
}

export function demoNextCode(type: "1" | "2") {
  const store = demoStore();
  const day = bangkokDayStamp();
  const prefix = type === "1" ? "RC" : "IS";
  const seq =
    store.transactions.filter((t) => t.transaction_code.startsWith(`${prefix}-${day}-`))
      .length + 1;
  return `${prefix}-${day}-${String(seq).padStart(4, "0")}`;
}
