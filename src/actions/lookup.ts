"use server";

import { requireUser } from "@/lib/auth";
import { findProductByBarcode } from "@/lib/data";
import type { Product } from "@/lib/types";

/** Barcode lookup for the receive and issue screens. */
export async function lookupBarcode(
  barcode: string,
): Promise<{ product?: Product; error?: string }> {
  await requireUser();
  const product = await findProductByBarcode(barcode);
  if (!product) {
    return { error: `ไม่พบสินค้าบาร์โค้ด ${barcode} ในระบบ` };
  }
  return { product };
}
