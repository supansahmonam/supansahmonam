import { Fragment } from "react";
import type { Metadata } from "next";
import { AlertTriangle, Coins, Package } from "lucide-react";
import { ReportToolbar } from "./report-toolbar";
import { PageHeader } from "@/components/page-header";
import { StockBadge } from "@/components/stock-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getStockReport, listCategories, type ReportRow } from "@/lib/data";
import { formatBaht, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "รายงานสินค้าคงเหลือ" };

function groupByCategory(rows: ReportRow[]) {
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const list = groups.get(row.product_category) ?? [];
    list.push(row);
    groups.set(row.product_category, list);
  }
  return [...groups.entries()];
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireUser();
  const params = await searchParams;

  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;

  const [rows, categories] = await Promise.all([
    getStockReport({ from, to, category }),
    listCategories(),
  ]);

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const lowRows = rows.filter((r) => r.below_min);
  const groups = groupByCategory(rows);

  return (
    <>
      <PageHeader
        title="รายงานสินค้าคงเหลือ"
        description="สรุปสถานะสินค้าคงคลังเพื่อใช้ตัดสินใจสั่งซื้อ"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="รายการสินค้าในรายงาน"
          value={formatNumber(rows.length)}
          icon={Package}
        />
        <SummaryCard
          label="มูลค่าสินค้าคงคลังรวม"
          value={formatBaht(totalValue)}
          icon={Coins}
        />
        <SummaryCard
          label="ต่ำกว่าจุดสั่งซื้อขั้นต่ำ"
          value={formatNumber(lowRows.length)}
          icon={AlertTriangle}
          tone={lowRows.length > 0 ? "warning" : "default"}
        />
      </div>

      <Card className="mt-4 overflow-hidden py-0">
        <ReportToolbar rows={rows} categories={categories} />

        {/* phones: grouped cards */}
        <div className="border-t md:hidden">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              ไม่มีข้อมูลตามเงื่อนไขที่เลือก
            </p>
          ) : (
            groups.map(([groupName, groupRows]) => (
              <section key={groupName}>
                <h3 className="flex items-baseline justify-between gap-2 border-b bg-muted/50 px-4 py-2 text-sm font-medium">
                  <span className="min-w-0 truncate">{groupName}</span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    {formatNumber(groupRows.length)} รายการ ·{" "}
                    {formatBaht(groupRows.reduce((s, r) => s + r.value, 0))}
                  </span>
                </h3>
                <ul className="divide-y border-b">
                  {groupRows.map((row) => (
                    <li key={row.product_id} className="space-y-1.5 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{row.product_name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.product_barcode}
                          </p>
                        </div>
                        <StockBadge qty={row.product_qty} minQty={row.product_minQty} />
                      </div>
                      <dl className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">รับเข้า</dt>
                          <dd className="tabular-nums text-emerald-700">
                            {row.received ? `+${formatNumber(row.received)}` : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">จ่ายออก</dt>
                          <dd className="tabular-nums text-orange-700">
                            {row.issued ? `−${formatNumber(row.issued)}` : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">คงเหลือ</dt>
                          <dd className="font-medium tabular-nums">
                            {formatNumber(row.product_qty)}{" "}
                            <span className="font-normal text-muted-foreground">
                              /{formatNumber(row.product_minQty)}
                            </span>
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-muted-foreground">มูลค่า</dt>
                          <dd className="tabular-nums">{formatBaht(row.value)}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          {rows.length > 0 ? (
            <div className="flex items-center justify-between gap-2 bg-muted/50 px-4 py-3 text-sm">
              <span className="font-medium">มูลค่าสินค้าคงคลังรวม</span>
              <span className="font-semibold tabular-nums">{formatBaht(totalValue)}</span>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead className="hidden lg:table-cell">หน่วยนับ</TableHead>
                <TableHead className="text-right">รับเข้า</TableHead>
                <TableHead className="text-right">จ่ายออก</TableHead>
                <TableHead className="text-right">คงเหลือ</TableHead>
                <TableHead className="text-right hidden sm:table-cell">ขั้นต่ำ</TableHead>
                <TableHead className="text-right">มูลค่า</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                    ไม่มีข้อมูลตามเงื่อนไขที่เลือก
                  </TableCell>
                </TableRow>
              ) : (
                groups.map(([groupName, groupRows]) => (
                  <Fragment key={groupName}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={8} className="font-medium">
                        {groupName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {formatNumber(groupRows.length)} รายการ ·{" "}
                          {formatBaht(groupRows.reduce((s, r) => s + r.value, 0))}
                        </span>
                      </TableCell>
                    </TableRow>
                    {groupRows.map((row) => (
                      <TableRow key={row.product_id}>
                        <TableCell>
                          <p className="font-medium">{row.product_name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.product_barcode}
                          </p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {row.product_unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700">
                          {row.received ? `+${formatNumber(row.received)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-700">
                          {row.issued ? `−${formatNumber(row.issued)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatNumber(row.product_qty)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">
                          {formatNumber(row.product_minQty)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBaht(row.value)}
                        </TableCell>
                        <TableCell>
                          <StockBadge qty={row.product_qty} minQty={row.product_minQty} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
            {rows.length > 0 ? (
              <TableFooter>
                <TableRow>
                  {/* one cell per column, hidden with the same breakpoints as the body */}
                  <TableCell className="font-medium">มูลค่าสินค้าคงคลังรวม</TableCell>
                  <TableCell className="hidden lg:table-cell" />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatBaht(totalValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </Card>

      {lowRows.length > 0 ? (
        <Card className="mt-4 overflow-hidden py-0">
          <div className="flex items-center gap-2 border-b p-4">
            <AlertTriangle className="size-4 text-amber-600" />
            <h2 className="font-medium">สินค้าที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="hidden sm:table-cell">ประเภท</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="text-right">ขั้นต่ำ</TableHead>
                  <TableHead className="text-right">ควรสั่งเพิ่ม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowRows.map((row) => (
                  <TableRow key={row.product_id}>
                    <TableCell className="font-medium">{row.product_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {row.product_category}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.product_qty)} {row.product_unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(row.product_minQty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(Math.max(0, row.product_minQty * 2 - row.product_qty))}{" "}
                      {row.product_unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}
    </>
  );
}
