/**
 * Enum values mirror the Data Dictionary in chapter 3 (tables 3.1 and 3.3).
 * Keep the keys as strings - the database columns are Postgres enums of
 * character values, not integers.
 */

export const USER_STATUS = {
  "0": "ระงับการใช้งาน",
  "1": "ใช้งานอยู่",
  "2": "รอยืนยัน",
} as const;

export const USER_LEVEL = {
  "0": "ผู้ดูแลระบบ",
  "1": "หัวหน้าคลังสินค้า",
  "2": "พนักงานปฏิบัติงาน",
  "3": "ผู้ดูรายงาน",
} as const;

export const TRANSACTION_TYPE = {
  "1": "รับเข้า",
  "2": "จ่ายออก",
} as const;

export const TRANSACTION_STATUS = {
  "1": "สำเร็จ",
  "2": "รอยืนยัน",
  "3": "ยกเลิก",
} as const;

export const TRANSACTION_NOTIFY = {
  "0": "ยังไม่แจ้งเตือน",
  "1": "แจ้งเตือนแล้ว",
} as const;

export type UserStatus = keyof typeof USER_STATUS;
export type UserLevel = keyof typeof USER_LEVEL;
export type TransactionType = keyof typeof TRANSACTION_TYPE;
export type TransactionStatus = keyof typeof TRANSACTION_STATUS;
export type TransactionNotify = keyof typeof TRANSACTION_NOTIFY;

/** Levels allowed to create, edit and delete products. */
export const CAN_MANAGE_PRODUCTS: UserLevel[] = ["0", "1"];
/** Levels allowed to record stock movements. */
export const CAN_MOVE_STOCK: UserLevel[] = ["0", "1", "2"];
/** Levels allowed to manage users and notification settings. */
export const CAN_ADMIN: UserLevel[] = ["0"];

export const PAGE_SIZE = 20;

/** Default LINE message body. Placeholders are filled by renderTemplate(). */
export const DEFAULT_TEMPLATE = "⚠️ แจ้งเตือนสินค้าใกล้หมด\n{product_name}\nคงเหลือ {qty} {unit} (ขั้นต่ำ {min_qty})";
