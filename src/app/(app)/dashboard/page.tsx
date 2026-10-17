import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Package,
  Repeat,
} from "lucide-react";
import { CategoryChart, MovementChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StockBadge } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import {
  getCategoryBreakdown,
  getDashboardSummary,
  getLowStock,
  getMovementLast30Days,
} from "@/lib/data";
import { formatBaht, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "หน้าแรก" };

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Package;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              tone === "warning" ? "text-amber-600" : ""
            }`}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [summary, movement, categories, lowStock] = await Promise.all([
    getDashboardSummary(),
    getMovementLast30Days(),
    getCategoryBreakdown(),
    getLowStock(8),
  ]);

  return (
    <>
      <PageHeader
        title={`สวัสดี ${user.user_name}`}
        description="ภาพรวมสถานะคลังสินค้าแบบเรียลไทม์"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="รายการสินค้าทั้งหมด"
          value={formatNumber(summary.total_products)}
          hint="จำนวน SKU ในระบบ"
          icon={Package}
        />
        <StatCard
          label="มูลค่าสินค้าคงคลัง"
          value={formatBaht(summary.stock_value)}
          hint="ราคาต่อหน่วย × จำนวนคงเหลือ"
          icon={Coins}
        />
        <StatCard
          label="ต่ำกว่าจุดสั่งซื้อขั้นต่ำ"
          value={formatNumber(summary.below_min)}
          hint="ต้องสั่งซื้อเพิ่ม"
          icon={AlertTriangle}
          tone={summary.below_min > 0 ? "warning" : "default"}
        />
        <StatCard
          label="รายการรับ-จ่ายวันนี้"
          value={formatNumber(summary.today_moves)}
          hint="นับเฉพาะรายการที่สำเร็จ"
          icon={Repeat}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ความเคลื่อนไหวของสินค้า 30 วันย้อนหลัง</CardTitle>
            <CardDescription>จำนวนหน่วยที่รับเข้าและจ่ายออกในแต่ละวัน</CardDescription>
          </CardHeader>
          <CardContent>
            <MovementChart data={movement} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนสินค้าตามประเภท</CardTitle>
            <CardDescription>คิดจากมูลค่าคงคลังของแต่ละประเภท</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart data={categories} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>แจ้งเตือนสินค้าใกล้หมด</CardTitle>
            <CardDescription>
              สินค้าที่คงเหลือถึงหรือต่ำกว่าจุดสั่งซื้อขั้นต่ำ
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">
              ดูรายงาน
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              ไม่มีสินค้าที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="hidden sm:table-cell">ประเภท</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead className="text-right">ขั้นต่ำ</TableHead>
                    <TableHead className="text-right">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((p) => (
                    <TableRow key={p.product_id}>
                      <TableCell>
                        <p className="font-medium">{p.product_name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.product_barcode}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {p.product_category}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatNumber(p.product_qty)} {p.product_unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(p.product_minQty)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockBadge qty={p.product_qty} minQty={p.product_minQty} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
