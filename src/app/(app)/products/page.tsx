import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DeleteProductButton } from "./delete-product-button";
import { ProductFilters } from "./product-filters";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StockBadge } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canManageProducts, requireUser } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/constants";
import { listCategories, listProducts } from "@/lib/data";
import { formatBaht, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "จัดการข้อมูลสินค้า" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total }, categories] = await Promise.all([
    listProducts({ q, category, page }),
    listCategories(),
  ]);

  const canManage = canManageProducts(user);

  return (
    <>
      <PageHeader
        title="จัดการข้อมูลสินค้า"
        description="ดูและจัดการรายการสินค้าทั้งหมดในคลัง"
        action={
          canManage ? (
            <Button asChild>
              <Link href="/products/new">
                <Plus className="size-4" />
                เพิ่มสินค้า
              </Link>
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden py-0">
        <ProductFilters categories={categories} />

        {/* phones: one card per product */}
        <ul className="divide-y border-t md:hidden">
          {rows.length === 0 ? (
            <li className="py-10 text-center text-sm text-muted-foreground">
              ไม่พบสินค้าที่ตรงกับเงื่อนไข
            </li>
          ) : (
            rows.map((p) => (
              <li key={p.product_id} className="flex gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium leading-snug">{p.product_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.product_barcode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.product_category} · {formatBaht(p.product_price)}/{p.product_unit}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-sm tabular-nums">
                      คงเหลือ <span className="font-semibold">{formatNumber(p.product_qty)}</span>{" "}
                      <span className="text-muted-foreground">
                        / ขั้นต่ำ {formatNumber(p.product_minQty)}
                      </span>
                    </span>
                    <StockBadge qty={p.product_qty} minQty={p.product_minQty} />
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 flex-col items-end">
                    <Button asChild variant="ghost" size="icon" aria-label={`แก้ไข ${p.product_name}`}>
                      <Link href={`/products/${p.product_id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <DeleteProductButton productId={p.product_id} productName={p.product_name} />
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <div className="hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ลำดับ</TableHead>
                <TableHead>บาร์โค้ด</TableHead>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead className="hidden md:table-cell">ประเภท</TableHead>
                <TableHead className="hidden lg:table-cell">หน่วยนับ</TableHead>
                <TableHead className="text-right">ราคา/หน่วย</TableHead>
                <TableHead className="text-right">คงเหลือ</TableHead>
                <TableHead className="text-right hidden sm:table-cell">ขั้นต่ำ</TableHead>
                <TableHead>สถานะ</TableHead>
                {canManage ? <TableHead className="w-24 text-right">จัดการ</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 10 : 9} className="h-28 text-center text-muted-foreground">
                    ไม่พบสินค้าที่ตรงกับเงื่อนไข
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p, index) => (
                  <TableRow key={p.product_id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.product_barcode}</TableCell>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.product_category}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {p.product_unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBaht(p.product_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(p.product_qty)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">
                      {formatNumber(p.product_minQty)}
                    </TableCell>
                    <TableCell>
                      <StockBadge qty={p.product_qty} minQty={p.product_minQty} />
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button asChild variant="ghost" size="icon" aria-label={`แก้ไข ${p.product_name}`}>
                            <Link href={`/products/${p.product_id}`}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                          <DeleteProductButton
                            productId={p.product_id}
                            productName={p.product_name}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          base="/products"
          params={{ q, category }}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </Card>
    </>
  );
}
