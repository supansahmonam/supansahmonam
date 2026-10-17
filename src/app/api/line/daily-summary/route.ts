import { NextResponse, type NextRequest } from "next/server";
import { broadcast } from "@/lib/line";
import { getDashboardSummary, getLowStock, getSettings } from "@/lib/data";
import { isDemo } from "@/lib/demo-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht, formatDate, formatNumber } from "@/lib/format";
import type { AppSettings, DashboardSummary, Product } from "@/lib/types";

/**
 * Cron calls arrive without a user session, so RLS would hide every row from
 * the cookie-based client. With Supabase configured the reads go through the
 * service-role client instead; the bearer check below is the gate.
 */
async function loadSummary(): Promise<{
  settings: AppSettings;
  summary: DashboardSummary;
  lowStock: Product[];
}> {
  if (isDemo) {
    const [settings, summary, lowStock] = await Promise.all([
      getSettings(),
      getDashboardSummary(),
      getLowStock(10),
    ]);
    return { settings, summary, lowStock };
  }

  const admin = createAdminClient();
  const [settingsRes, summaryRes, productsRes] = await Promise.all([
    admin.from("app_settings").select("*").eq("id", 1).single(),
    admin.rpc("dashboard_summary"),
    admin.from("products").select("*").order("product_qty", { ascending: true }).limit(200),
  ]);
  if (settingsRes.error) throw settingsRes.error;
  if (summaryRes.error) throw summaryRes.error;
  if (productsRes.error) throw productsRes.error;

  const lowStock = ((productsRes.data ?? []) as Product[])
    .filter((p) => p.product_qty <= p.product_minQty)
    .slice(0, 10);

  return {
    settings: settingsRes.data as AppSettings,
    summary: summaryRes.data as DashboardSummary,
    lowStock,
  };
}

/**
 * Daily summary pushed to LINE. Called by Vercel Cron (see vercel.json), which
 * sends the CRON_SECRET as a bearer token - without it the route refuses, so a
 * public URL cannot burn the message quota.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let data: Awaited<ReturnType<typeof loadSummary>>;
  try {
    data = await loadSummary();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "อ่านข้อมูลไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const { settings, summary, lowStock } = data;
  if (!settings.line_enabled || !settings.daily_summary_enabled) {
    return NextResponse.json({ skipped: "การแจ้งเตือนหรือรายงานสรุปประจำวันถูกปิดอยู่" });
  }

  const lines = [
    `สรุปคลังสินค้าประจำวัน ${formatDate(new Date())}`,
    "",
    `รายการสินค้าทั้งหมด ${formatNumber(summary.total_products)} รายการ`,
    `มูลค่าคงคลัง ${formatBaht(summary.stock_value)}`,
    `รับ-จ่ายวันนี้ ${formatNumber(summary.today_moves)} รายการ`,
    `ต่ำกว่าจุดสั่งซื้อขั้นต่ำ ${formatNumber(summary.below_min)} รายการ`,
  ];

  if (lowStock.length > 0) {
    lines.push("", "รายการที่ต้องสั่งเพิ่ม:");
    for (const p of lowStock) {
      lines.push(
        `• ${p.product_name} — เหลือ ${formatNumber(p.product_qty)} ${p.product_unit} (ขั้นต่ำ ${formatNumber(p.product_minQty)})`,
      );
    }
  }

  try {
    await broadcast(lines.join("\n"));
    return NextResponse.json({ sent: true, lowStock: lowStock.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ" },
      { status: 502 },
    );
  }
}
