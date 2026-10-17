/**
 * Client-side twin of renderTemplate() in lib/line.ts, used for the live
 * preview. lib/line.ts is server-only because it holds the channel token.
 */
export function renderPreview(template: string) {
  const values: Record<string, string> = {
    product_name: "น้ำมันพืชปาล์ม 1 ล.",
    qty: "8",
    unit: "ขวด",
    min_qty: "30",
    transaction_code: "IS-20260925-0007",
    user_name: "มานี พนักงานคลัง",
    date: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
  };

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}
