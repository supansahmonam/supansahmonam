"use client";

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TRANSACTION_NOTIFY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from "@/lib/constants";
import { formatBaht, formatDateTime, formatNumber } from "@/lib/format";
import type { TransactionDetail as Row } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm">{children}</dd>
    </div>
  );
}

export function TransactionDetail({ row }: { row: Row }) {
  const isReceive = row.transaction_type === "1";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`ดูรายละเอียด ${row.transaction_code}`}>
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">{row.transaction_code}</DialogTitle>
          <DialogDescription>รายละเอียดรายการรับ-จ่ายสินค้า</DialogDescription>
        </DialogHeader>

        <dl className="divide-y">
          <Field label="ประเภทรายการ">
            <Badge variant={isReceive ? "secondary" : "outline"}>
              {TRANSACTION_TYPE[row.transaction_type]}
            </Badge>
          </Field>
          <Field label="วันเวลาทำรายการ">{formatDateTime(row.transaction_date)}</Field>
          <Field label="สินค้า">
            <span className="font-medium">{row.products?.product_name ?? "—"}</span>
            <br />
            <span className="font-mono text-xs text-muted-foreground">
              {row.products?.product_barcode ?? "—"}
            </span>
          </Field>
          <Field label="จำนวน">
            <span className="tabular-nums font-medium">
              {isReceive ? "+" : "−"}
              {formatNumber(row.transaction_qty)} {row.products?.product_unit ?? ""}
            </span>
          </Field>
          <Field label="มูลค่ารวม">
            <span className="tabular-nums">{formatBaht(row.transaction_price)}</span>
          </Field>
          <Field label="ผู้บันทึกรายการ">{row.users?.user_name ?? "—"}</Field>
          <Field label="สถานะรายการ">{TRANSACTION_STATUS[row.transaction_status]}</Field>
          <Field label="แจ้งเตือน LINE">
            {TRANSACTION_NOTIFY[row.transaction_notify]}
          </Field>
          <Field label="หมายเหตุ">{row.transaction_note || "—"}</Field>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
