import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { HistoryFilters } from "./history-filters";
import { TransactionDetail } from "./transaction-detail";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { PAGE_SIZE, TRANSACTION_STATUS } from "@/lib/constants";
import { listTransactions } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "ประวัติการทำรายการ" };

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  await requireUser();
  const params = await searchParams;

  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const type =
    params.type === "1" || params.type === "2" ? (params.type as "1" | "2") : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await listTransactions({ from, to, type, page });

  return (
    <>
      <PageHeader
        title="ประวัติการทำรายการรับ-จ่ายสินค้า"
        description="ตรวจสอบย้อนหลังการเคลื่อนไหวของสินค้าทุกรายการ"
      />

      <Card className="overflow-hidden py-0">
        <HistoryFilters />

        {/* phones: one card per transaction */}
        <ul className="divide-y border-t md:hidden">
          {rows.length === 0 ? (
            <li className="py-10 text-center text-sm text-muted-foreground">
              ไม่พบรายการในช่วงที่เลือก
            </li>
          ) : (
            rows.map((row) => {
              const isReceive = row.transaction_type === "1";
              return (
                <li key={row.transaction_id} className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                      isReceive ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                    }`}
                    aria-label={isReceive ? "รับเข้า" : "จ่ายออก"}
                  >
                    {isReceive ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">
                        {row.products?.product_name ?? "—"}
                      </p>
                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          isReceive ? "text-emerald-700" : "text-orange-700"
                        }`}
                      >
                        {isReceive ? "+" : "−"}
                        {formatNumber(row.transaction_qty)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {row.products?.product_unit ?? ""}
                        </span>
                      </p>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.transaction_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.transaction_date)} · {row.users?.user_name ?? "—"}
                    </p>
                  </div>
                  <div className="-mr-2 -mt-1 shrink-0">
                    <TransactionDetail row={row} />
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่เอกสาร</TableHead>
                <TableHead>วันเวลา</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead className="hidden lg:table-cell">ผู้บันทึก</TableHead>
                <TableHead className="hidden sm:table-cell">สถานะ</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                    ไม่พบรายการในช่วงที่เลือก
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isReceive = row.transaction_type === "1";
                  return (
                    <TableRow key={row.transaction_id}>
                      <TableCell className="font-mono text-xs">
                        {row.transaction_code}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(row.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-sm ${
                            isReceive ? "text-emerald-700" : "text-orange-700"
                          }`}
                        >
                          {isReceive ? (
                            <ArrowDownLeft className="size-3.5" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                          {isReceive ? "รับเข้า" : "จ่ายออก"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.products?.product_name ?? "—"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.products?.product_barcode ?? ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                        {isReceive ? "+" : "−"}
                        {formatNumber(row.transaction_qty)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {row.products?.product_unit ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {row.users?.user_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          {TRANSACTION_STATUS[row.transaction_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TransactionDetail row={row} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          base="/history"
          params={{ from, to, type }}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </Card>
    </>
  );
}
