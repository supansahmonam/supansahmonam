import type { Metadata } from "next";
import { ProductForm } from "../product-form";
import { PageHeader } from "@/components/page-header";
import { requireLevel } from "@/lib/auth";
import { CAN_MANAGE_PRODUCTS } from "@/lib/constants";
import { listCategories } from "@/lib/data";

export const metadata: Metadata = { title: "เพิ่มสินค้า" };

export default async function NewProductPage() {
  await requireLevel(CAN_MANAGE_PRODUCTS);
  const categories = await listCategories();

  return (
    <>
      <PageHeader
        title="เพิ่มข้อมูลสินค้า"
        description="บันทึกสินค้าใหม่เข้าสู่ฐานข้อมูล"
      />
      <ProductForm categories={categories} />
    </>
  );
}
