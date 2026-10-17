import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/** Builds a URL for `page` while keeping every other search param. */
function hrefFor(base: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function Pagination({
  base,
  params,
  page,
  total,
  pageSize,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total + 1);
  const last = Math.min(page * pageSize, total);
  const beyond = page > pages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        {beyond
          ? `ไม่มีหน้านี้ — ทั้งหมด ${formatNumber(total)} รายการ`
          : `แสดง ${formatNumber(first)}–${formatNumber(last)} จาก ${formatNumber(total)} รายการ`}
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link
            href={hrefFor(base, params, beyond ? pages : page - 1)}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronLeft className="size-4" />
            ก่อนหน้า
          </Link>
        </Button>
        <span className="tabular-nums text-muted-foreground">
          หน้า {formatNumber(page)} / {formatNumber(pages)}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link
            href={hrefFor(base, params, page + 1)}
            aria-disabled={page >= pages}
            className={page >= pages ? "pointer-events-none opacity-50" : undefined}
          >
            ถัดไป
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
