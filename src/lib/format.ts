const BANGKOK = "Asia/Bangkok";

export function formatBaht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: BANGKOK,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: BANGKOK,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short label for the 30-day chart axis, e.g. "25 ก.ย." */
export function formatDayLabel(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: BANGKOK,
    day: "numeric",
    month: "short",
  });
}

/** yyyy-mm-dd in Bangkok time, for date inputs. */
export function toDateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(qty: number, minQty: number): StockLevel {
  if (qty <= 0) return "out";
  if (qty <= minQty) return "low";
  return "ok";
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  out: "หมดสต็อก",
  low: "ใกล้หมด",
  ok: "ปกติ",
};
