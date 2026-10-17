import "server-only";

/**
 * LINE Messaging API helpers.
 *
 * Everything here runs on the server only - the channel access token must
 * never reach the browser. Chapter 3 calls for an automatic notification when
 * an item drops to or below its minimum order point after an issue-out.
 */

const LINE_API = "https://api.line.me/v2/bot";

type LineTextMessage = { type: "text"; text: string };

function token() {
  const value = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!value) throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN");
  return value;
}

async function callLine(path: string, body: unknown) {
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LINE API ${res.status}: ${detail}`);
  }

  return res;
}

/** Send to every account that has added the Official Account as a friend. */
export async function broadcast(text: string) {
  const messages: LineTextMessage[] = [{ type: "text", text }];
  await callLine("/message/broadcast", { messages });
}

/** Send to specific LINE user IDs (max 500 per call). */
export async function multicast(userIds: string[], text: string) {
  if (userIds.length === 0) return;
  const messages: LineTextMessage[] = [{ type: "text", text }];
  await callLine("/message/multicast", { to: userIds.slice(0, 500), messages });
}

/** How many messages the plan has left this month. */
export async function remainingQuota() {
  const res = await fetch(`${LINE_API}/message/quota/consumption`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LINE API ${res.status}`);
  return (await res.json()) as { totalUsage: number };
}

export type LowStockPayload = {
  product_name: string;
  qty: number;
  unit: string;
  min_qty: number;
  transaction_code?: string;
  user_name?: string;
};

/**
 * Fill the template stored in app_settings. Unknown placeholders are left
 * alone so a typo in the settings screen is visible rather than silent.
 */
export function renderTemplate(template: string, payload: LowStockPayload) {
  const values: Record<string, string> = {
    product_name: payload.product_name,
    qty: String(payload.qty),
    unit: payload.unit,
    min_qty: String(payload.min_qty),
    transaction_code: payload.transaction_code ?? "-",
    user_name: payload.user_name ?? "-",
    date: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
  };

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

export { DEFAULT_TEMPLATE } from "@/lib/constants";
