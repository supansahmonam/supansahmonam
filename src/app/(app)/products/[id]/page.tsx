import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "../product-form";
import { PageHeader } from "@/components/page-header";
import { requireLevel } from "@/lib/auth";
import { CAN_MANAGE_PRODUCTS } from "@/lib/constants";
import { getProduct, listCategories } from "@/lib/data";

export const metadata: Metadata = { title: "แก้ไขสินค้า" };

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  await requireLevel(CAN_MANAGE_PRODUCTS);
  const { id } = await params;

  const [product, categories] = await Promise.all([getProduct(id), listCategories()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title="แก้ไขข้อมูลสินค้า"
        description={product.product_name}
      />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
