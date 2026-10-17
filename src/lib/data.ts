import "server-only";

import { createClient } from "@/lib/supabase/server";
import { demoNextCode, demoStore, isDemo } from "@/lib/demo-store";
import { PAGE_SIZE } from "@/lib/constants";
import type {
  AppSettings,
  CategoryBreakdown,
  DashboardSummary,
  MovementPoint,
  Product,
  TransactionDetail,
  User,
} from "@/lib/types";

/**
 * Every read the pages need, in one place. Each function has two branches:
 * the in-memory demo dataset, and the real Supabase query. Pages never talk
 * to Supabase directly, so switching between the two is invisible to them.
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** yyyy-mm-dd of a timestamp, in Bangkok time. */
function bangkokDay(iso: string) {
  return new Date(Date.parse(iso) + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (isDemo) {
    const { products, transactions } = demoStore();
    const today = bangkokDay(new Date().toISOString());
    return {
      total_products: products.length,
      stock_value: products.reduce((sum, p) => sum + p.product_price * p.product_qty, 0),
      below_min: products.filter((p) => p.product_qty <= p.product_minQty).length,
      today_moves: transactions.filter(
        (t) => bangkokDay(t.transaction_date) === today && t.transaction_status === "1",
      ).length,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_summary");
  if (error) throw error;
  return data as DashboardSummary;
}

export async function getMovementLast30Days(): Promise<MovementPoint[]> {
  if (isDemo) {
    const { transactions } = demoStore();
    const days: MovementPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = bangkokDay(d.toISOString());
      days.push({ day: key, received: 0, issued: 0 });
    }
    const index = new Map(days.map((d) => [d.day, d]));
    for (const t of transactions) {
      if (t.transaction_status !== "1") continue;
      const point = index.get(bangkokDay(t.transaction_date));
      if (!point) continue;
      if (t.transaction_type === "1") point.received += t.transaction_qty;
      else point.issued += t.transaction_qty;
    }
    return days;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("movement_last_30_days");
  if (error) throw error;
  return (data ?? []) as MovementPoint[];
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  if (isDemo) {
    const map = new Map<string, CategoryBreakdown>();
    for (const p of demoStore().products) {
      const row = map.get(p.product_category) ?? {
        category: p.product_category,
        items: 0,
        qty: 0,
        value: 0,
      };
      row.items += 1;
      row.qty += p.product_qty;
      row.value += p.product_qty * p.product_price;
      map.set(p.product_category, row);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("category_breakdown");
  if (error) throw error;
  return (data ?? []) as CategoryBreakdown[];
}

/** Items at or below their minimum order point, lowest first. */
export async function getLowStock(limit = 10): Promise<Product[]> {
  if (isDemo) {
    return demoStore()
      .products.filter((p) => p.product_qty <= p.product_minQty)
      .sort((a, b) => a.product_qty - b.product_qty)
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("product_qty", { ascending: true })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Product[])
    .filter((p) => p.product_qty <= p.product_minQty)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductQuery = {
  q?: string;
  category?: string;
  page?: number;
  lowOnly?: boolean;
};

export async function listProducts({ q, category, page = 1, lowOnly }: ProductQuery) {
  const from = (page - 1) * PAGE_SIZE;

  if (isDemo) {
    let rows = demoStore().products;
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.product_name.toLowerCase().includes(needle) ||
          p.product_barcode.includes(needle) ||
          p.product_category.toLowerCase().includes(needle),
      );
    }
    if (category) rows = rows.filter((p) => p.product_category === category);
    if (lowOnly) rows = rows.filter((p) => p.product_qty <= p.product_minQty);
    rows = [...rows].sort((a, b) => a.product_name.localeCompare(b.product_name, "th"));
    return { rows: rows.slice(from, from + PAGE_SIZE), total: rows.length };
  }

  const supabase = await createClient();
  let query = supabase.from("products").select("*", { count: "exact" });
  // PostgREST parses `,` `(` `)` inside or() as syntax, so strip them first.
  const needle = q?.replace(/[,()*\\]/g, " ").trim();
  if (needle) {
    query = query.or(
      `product_name.ilike.%${needle}%,product_barcode.ilike.%${needle}%,product_category.ilike.%${needle}%`,
    );
  }
  if (category) query = query.eq("product_category", category);

  const { data, error, count } = await query
    .order("product_name", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  let rows = (data ?? []) as Product[];
  if (lowOnly) rows = rows.filter((p) => p.product_qty <= p.product_minQty);
  return { rows, total: count ?? rows.length };
}

export async function listCategories(): Promise<string[]> {
  if (isDemo) {
    return [...new Set(demoStore().products.map((p) => p.product_category))].sort((a, b) =>
      a.localeCompare(b, "th"),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("product_category");
  if (error) throw error;
  const values = (data ?? []).map((r) => (r as { product_category: string }).product_category);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "th"));
}

export async function getProduct(id: string): Promise<Product | null> {
  if (isDemo) {
    return demoStore().products.find((p) => p.product_id === id) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("product_id", id).single();
  return (data as Product | null) ?? null;
}

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const value = barcode.trim();
  if (!value) return null;

  if (isDemo) {
    return demoStore().products.find((p) => p.product_barcode === value) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("product_barcode", value)
    .maybeSingle();
  return (data as Product | null) ?? null;
}

/** All products, used by the receive / issue screens for offline lookup. */
export async function listAllProducts(): Promise<Product[]> {
  if (isDemo) return demoStore().products.map((p) => ({ ...p }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("product_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionQuery = {
  from?: string;
  to?: string;
  type?: "1" | "2";
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listTransactions({
  from,
  to,
  type,
  q,
  page = 1,
  pageSize = PAGE_SIZE,
}: TransactionQuery) {
  const offset = (page - 1) * pageSize;

  if (isDemo) {
    const store = demoStore();
    const productById = new Map(store.products.map((p) => [p.product_id, p]));
    const userById = new Map(store.users.map((u) => [u.user_id, u]));

    let rows = store.transactions.map<TransactionDetail>((t) => {
      const p = productById.get(t.product_id);
      const u = userById.get(t.user_id);
      return {
        ...t,
        products: p
          ? {
              product_name: p.product_name,
              product_barcode: p.product_barcode,
              product_unit: p.product_unit,
            }
          : null,
        users: u ? { user_name: u.user_name } : null,
      };
    });

    if (from) rows = rows.filter((t) => bangkokDay(t.transaction_date) >= from);
    if (to) rows = rows.filter((t) => bangkokDay(t.transaction_date) <= to);
    if (type) rows = rows.filter((t) => t.transaction_type === type);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.transaction_code.toLowerCase().includes(needle) ||
          (t.products?.product_name ?? "").toLowerCase().includes(needle) ||
          (t.products?.product_barcode ?? "").includes(needle),
      );
    }

    return { rows: rows.slice(offset, offset + pageSize), total: rows.length };
  }

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "*, products(product_name, product_barcode, product_unit), users(user_name)",
      { count: "exact" },
    );

  if (from) query = query.gte("transaction_date", `${from}T00:00:00+07:00`);
  if (to) query = query.lte("transaction_date", `${to}T23:59:59+07:00`);
  if (type) query = query.eq("transaction_type", type);
  if (q) query = query.ilike("transaction_code", `%${q}%`);

  const { data, error, count } = await query
    .order("transaction_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;

  return { rows: (data ?? []) as TransactionDetail[], total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<User[]> {
  if (isDemo) {
    return [...demoStore().users].sort((a, b) =>
      a.user_level.localeCompare(b.user_level) || a.user_name.localeCompare(b.user_name, "th"),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("user_level", { ascending: true })
    .order("user_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as User[];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<AppSettings> {
  if (isDemo) return { ...demoStore().settings };

  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as AppSettings;
}

// ---------------------------------------------------------------------------
// Document numbers
// ---------------------------------------------------------------------------

/**
 * The number the next receive / issue document would get. Shown on screen for
 * reference only - the authoritative number is generated inside move_stock()
 * when the batch is confirmed.
 */
export async function previewDocumentCode(type: "1" | "2"): Promise<string> {
  if (isDemo) return demoNextCode(type);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_transaction_code", { p_type: type });
  if (error) return type === "1" ? "RC-…" : "IS-…";
  return String(data);
}

// ---------------------------------------------------------------------------
// Stock report
// ---------------------------------------------------------------------------

export type ReportRow = {
  product_id: string;
  product_barcode: string;
  product_name: string;
  product_category: string;
  product_unit: string;
  product_price: number;
  product_qty: number;
  product_minQty: number;
  received: number;
  issued: number;
  value: number;
  below_min: boolean;
};

export type ReportQuery = { from?: string; to?: string; category?: string };

/**
 * Current balance per product, plus how much moved in or out during the chosen
 * period. Used by the report screen and both export formats.
 */
export async function getStockReport({ from, to, category }: ReportQuery): Promise<ReportRow[]> {
  const products = (await listAllProducts()).filter(
    (p) => !category || p.product_category === category,
  );

  const movement = new Map<string, { received: number; issued: number }>();

  // Supabase caps a response at 1000 rows, so read the period in pages.
  const PAGE = 1000;
  const rows: TransactionDetail[] = [];
  for (let page = 1; ; page++) {
    const batch = await listTransactions({ from, to, page, pageSize: PAGE });
    rows.push(...batch.rows);
    if (batch.rows.length < PAGE || rows.length >= batch.total) break;
  }

  for (const t of rows) {
    if (t.transaction_status !== "1") continue;
    const entry = movement.get(t.product_id) ?? { received: 0, issued: 0 };
    if (t.transaction_type === "1") entry.received += t.transaction_qty;
    else entry.issued += t.transaction_qty;
    movement.set(t.product_id, entry);
  }

  return products
    .map<ReportRow>((p) => {
      const m = movement.get(p.product_id) ?? { received: 0, issued: 0 };
      return {
        product_id: p.product_id,
        product_barcode: p.product_barcode,
        product_name: p.product_name,
        product_category: p.product_category,
        product_unit: p.product_unit,
        product_price: p.product_price,
        product_qty: p.product_qty,
        product_minQty: p.product_minQty,
        received: m.received,
        issued: m.issued,
        value: p.product_qty * p.product_price,
        below_min: p.product_qty <= p.product_minQty,
      };
    })
    .sort(
      (a, b) =>
        a.product_category.localeCompare(b.product_category, "th") ||
        a.product_name.localeCompare(b.product_name, "th"),
    );
}
