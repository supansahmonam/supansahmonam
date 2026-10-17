"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { demoNextCode, demoStore, isDemo } from "@/lib/demo-store";
import { canMoveStock, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { broadcast, renderTemplate } from "@/lib/line";
import type { TransactionType } from "@/lib/constants";
import type { MoveStockResult } from "@/lib/types";

export type StockLineInput = {
  product_id: string;
  qty: number;
  note?: string;
};

export type StockResultLine = MoveStockResult & { notified: boolean };

export type CommitStockState = {
  error?: string;
  results?: StockResultLine[];
  notifyError?: string;
};

/**
 * Records a batch of receive-in or issue-out lines.
 *
 * With Supabase configured every line goes through the move_stock() function,
 * which locks the product row before changing it - two people scanning the
 * same item at the same time cannot corrupt the balance. After a successful
 * issue-out that leaves an item at or below its minimum order point, a LINE
 * message is sent and the transaction is flagged as notified.
 */
export async function commitStock(
  type: TransactionType,
  lines: StockLineInput[],
): Promise<CommitStockState> {
  const user = await requireUser();
  if (!canMoveStock(user)) {
    return { error: "ระดับผู้ใช้งานของคุณไม่มีสิทธิ์บันทึกรายการรับ-จ่ายสินค้า" };
  }
  if (lines.length === 0) {
    return { error: "ยังไม่มีรายการรอยืนยัน" };
  }
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty <= 0)) {
    return { error: "จำนวนทุกรายการต้องเป็นจำนวนเต็มมากกว่า 0" };
  }

  const results: StockResultLine[] = [];
  let commitError: string | undefined;

  if (isDemo) {
    const store = demoStore();
    const stamp = new Date().toISOString();

    // Validate the whole batch first so a failure leaves nothing half-applied.
    for (const line of lines) {
      const product = store.products.find((p) => p.product_id === line.product_id);
      if (!product) return { error: `ไม่พบสินค้ารหัส ${line.product_id}` };
      if (type === "2" && product.product_qty - line.qty < 0) {
        return {
          error: `"${product.product_name}" คงเหลือ ${product.product_qty} ${product.product_unit} จ่ายออก ${line.qty} ไม่ได้`,
        };
      }
    }

    for (const line of lines) {
      const product = store.products.find((p) => p.product_id === line.product_id)!;
      const before = product.product_qty;
      const after = type === "1" ? before + line.qty : before - line.qty;
      product.product_qty = after;
      product.product_updatedAt = stamp;

      const code = demoNextCode(type);
      store.transactions.unshift({
        transaction_id: `t-${Date.now()}-${results.length}`,
        transaction_code: code,
        transaction_type: type,
        transaction_qty: line.qty,
        transaction_price: line.qty * product.product_price,
        transaction_date: stamp,
        transaction_note: line.note?.trim() || null,
        transaction_status: "1",
        transaction_notify: "0",
        product_id: product.product_id,
        user_id: user.user_id,
        transaction_createdAt: stamp,
        transaction_updatedAt: stamp,
      });

      results.push({
        transaction_id: store.transactions[0].transaction_id,
        transaction_code: code,
        product_name: product.product_name,
        product_unit: product.product_unit,
        qty_before: before,
        qty_after: after,
        min_qty: product.product_minQty,
        below_min: type === "2" && after <= product.product_minQty,
        notified: false,
      });
    }
  } else {
    const supabase = await createClient();

    for (const line of lines) {
      const { data, error } = await supabase.rpc("move_stock", {
        p_product_id: line.product_id,
        p_type: type,
        p_qty: line.qty,
        p_note: line.note?.trim() || null,
      });

      if (error) {
        // Earlier lines are already committed. Stop here, but still notify for
        // them and report them back so the client drops them from the cart.
        commitError = results.length > 0
          ? `บันทึกสำเร็จ ${results.length} จาก ${lines.length} รายการ รายการที่เหลือไม่สำเร็จ: ${error.message}`
          : error.message;
        break;
      }

      const row = (Array.isArray(data) ? data[0] : data) as MoveStockResult;
      results.push({ ...row, notified: false });
    }
  }

  if (results.length === 0) return { error: commitError };

  // --- LINE notification --------------------------------------------------
  let notifyError: string | undefined;
  const lowLines = results.filter((r) => r.below_min);

  if (lowLines.length > 0) {
    try {
      const settings = await getSettings();
      if (settings.line_enabled) {
        for (const line of lowLines) {
          const text = renderTemplate(settings.message_template, {
            product_name: line.product_name,
            qty: line.qty_after,
            unit: line.product_unit,
            min_qty: line.min_qty,
            transaction_code: line.transaction_code,
            user_name: user.user_name,
          });
          await broadcast(text);
          line.notified = true;
          await markNotified(line.transaction_id);
        }
      }
    } catch (e) {
      notifyError = e instanceof Error ? e.message : "ส่งแจ้งเตือน LINE ไม่สำเร็จ";
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/history");
  revalidatePath("/reports");

  return { error: commitError, results, notifyError };
}

async function markNotified(transactionId: string) {
  if (isDemo) {
    const store = demoStore();
    const row = store.transactions.find((t) => t.transaction_id === transactionId);
    if (row) row.transaction_notify = "1";
    return;
  }
  const supabase = await createClient();
  await supabase.rpc("mark_notified", { p_transaction_id: transactionId });
}
