"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoStore, isDemo } from "@/lib/demo-store";
import { canManageProducts, requireUser } from "@/lib/auth";
import type { Product } from "@/lib/types";

const schema = z.object({
  product_barcode: z
    .string()
    .trim()
    .min(1, "กรอกบาร์โค้ดสินค้า")
    .max(50, "บาร์โค้ดยาวเกิน 50 ตัวอักษร"),
  product_name: z.string().trim().min(1, "กรอกชื่อสินค้า").max(255),
  product_category: z.string().trim().min(1, "เลือกหรือกรอกประเภทสินค้า").max(100),
  product_unit: z.string().trim().min(1, "กรอกหน่วยนับ").max(50),
  product_price: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  product_qty: z.coerce.number().int("จำนวนต้องเป็นจำนวนเต็ม").min(0, "จำนวนต้องไม่ติดลบ"),
  product_minQty: z.coerce.number().int().min(0, "จุดสั่งซื้อขั้นต่ำต้องไม่ติดลบ"),
  // Either a Storage URL or, in demo mode, a small inline data: URL.
  product_image: z.string().trim().max(600_000).optional(),
});

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  /** What was submitted, so the form can refill itself after React resets it. */
  values?: Record<string, string>;
};

function submitted(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && key !== "product_image") out[key] = value;
  }
  return out;
}

function parse(formData: FormData) {
  return schema.safeParse({
    product_barcode: formData.get("product_barcode"),
    product_name: formData.get("product_name"),
    product_category: formData.get("product_category"),
    product_unit: formData.get("product_unit"),
    product_price: formData.get("product_price"),
    product_qty: formData.get("product_qty"),
    product_minQty: formData.get("product_minQty"),
    product_image: formData.get("product_image") ?? "",
  });
}

function toFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveProduct(
  productId: string | null,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const result = await persistProduct(productId, formData);
  return result.ok ? result : { ...result, values: submitted(formData) };
}

async function persistProduct(
  productId: string | null,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser();
  if (!canManageProducts(user)) {
    return { error: "ระดับผู้ใช้งานของคุณไม่มีสิทธิ์จัดการข้อมูลสินค้า" };
  }

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ครบถ้วน", fieldErrors: toFieldErrors(parsed.error) };
  }

  const values = {
    ...parsed.data,
    product_image: parsed.data.product_image ? parsed.data.product_image : null,
  };

  if (isDemo) {
    const store = demoStore();
    const clash = store.products.find(
      (p) => p.product_barcode === values.product_barcode && p.product_id !== productId,
    );
    if (clash) {
      return {
        error: "บาร์โค้ดนี้มีอยู่แล้ว",
        fieldErrors: { product_barcode: `ซ้ำกับสินค้า "${clash.product_name}"` },
      };
    }

    const stamp = new Date().toISOString();
    if (productId) {
      const index = store.products.findIndex((p) => p.product_id === productId);
      if (index === -1) return { error: "ไม่พบสินค้าที่ต้องการแก้ไข" };
      store.products[index] = {
        ...store.products[index],
        ...values,
        product_updatedAt: stamp,
      };
    } else {
      store.products.push({
        product_id: `p-${Date.now()}`,
        ...values,
        product_createdAt: stamp,
        product_updatedAt: stamp,
      } as Product);
    }
  } else {
    const supabase = await createClient();

    const { data: clash } = await supabase
      .from("products")
      .select("product_id, product_name")
      .eq("product_barcode", values.product_barcode)
      .maybeSingle();

    if (clash && (clash as { product_id: string }).product_id !== productId) {
      return {
        error: "บาร์โค้ดนี้มีอยู่แล้ว",
        fieldErrors: {
          product_barcode: `ซ้ำกับสินค้า "${(clash as { product_name: string }).product_name}"`,
        },
      };
    }

    const { error } = productId
      ? await supabase.from("products").update(values).eq("product_id", productId)
      : await supabase.from("products").insert(values);

    if (error) return { error: error.message };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!canManageProducts(user)) {
    return { error: "ระดับผู้ใช้งานของคุณไม่มีสิทธิ์ลบข้อมูลสินค้า" };
  }

  if (isDemo) {
    const store = demoStore();
    const used = store.transactions.some((t) => t.product_id === productId);
    if (used) {
      return { error: "ลบไม่ได้ สินค้านี้มีประวัติการรับ-จ่ายแล้ว" };
    }
    store.products = store.products.filter((p) => p.product_id !== productId);
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("products").delete().eq("product_id", productId);
    if (error) {
      return {
        error: error.code === "23503"
          ? "ลบไม่ได้ สินค้านี้มีประวัติการรับ-จ่ายแล้ว"
          : error.message,
      };
    }
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return {};
}
