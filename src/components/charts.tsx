"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, ChartColumnBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDayLabel, formatNumber, formatBaht } from "@/lib/format";
import type { CategoryBreakdown, MovementPoint } from "@/lib/types";

/**
 * Chart colours come from the validated palette in globals.css. Recharts needs
 * real colour values rather than CSS variables for its SVG fills, so the two
 * series read their slot through a CSS variable set on a wrapper element.
 */
const SERIES = {
  received: "var(--chart-1)",
  issued: "var(--chart-2)",
};

const CATEGORY_SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const AXIS = {
  stroke: "var(--chart-axis)",
  fontSize: 11,
};

function TooltipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {children}
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// 30-day movement
// ---------------------------------------------------------------------------

type MovementTooltip = {
  active?: boolean;
  payload?: { payload: MovementPoint }[];
};

function MovementTooltipContent({ active, payload }: MovementTooltip) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipCard>
      <p className="mb-1 font-medium text-popover-foreground">
        {formatDayLabel(point.day)}
      </p>
      <p className="flex items-center justify-between gap-4">
        <LegendSwatch color={SERIES.received} label="รับเข้า" />
        <span className="font-medium tabular-nums text-popover-foreground">
          {formatNumber(point.received)}
        </span>
      </p>
      <p className="flex items-center justify-between gap-4">
        <LegendSwatch color={SERIES.issued} label="จ่ายออก" />
        <span className="font-medium tabular-nums text-popover-foreground">
          {formatNumber(point.issued)}
        </span>
      </p>
    </TooltipCard>
  );
}

export function MovementChart({ data }: { data: MovementPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const totals = data.reduce(
    (acc, d) => ({ received: acc.received + d.received, issued: acc.issued + d.issued }),
    { received: 0, issued: 0 },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <LegendSwatch color={SERIES.received} label={`รับเข้า ${formatNumber(totals.received)}`} />
          <LegendSwatch color={SERIES.issued} label={`จ่ายออก ${formatNumber(totals.issued)}`} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
        >
          {view === "chart" ? <Table2 className="size-4" /> : <ChartColumnBig className="size-4" />}
          {view === "chart" ? "ดูเป็นตาราง" : "ดูเป็นกราฟ"}
        </Button>
      </div>

      {view === "chart" ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barGap={2}>
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="day"
                tickFormatter={formatDayLabel}
                interval={4}
                tickLine={false}
                axisLine={false}
                tick={AXIS}
              />
              <YAxis
                tickFormatter={(v: number) => formatNumber(v)}
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                width={52}
              />
              <Tooltip
                content={<MovementTooltipContent />}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              <Bar dataKey="received" fill={SERIES.received} radius={[4, 4, 0, 0]} maxBarSize={10} />
              <Bar dataKey="issued" fill={SERIES.issued} radius={[4, 4, 0, 0]} maxBarSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-64 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead className="text-right">รับเข้า</TableHead>
                <TableHead className="text-right">จ่ายออก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data].reverse().map((d) => (
                <TableRow key={d.day}>
                  <TableCell>{formatDayLabel(d.day)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(d.received)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(d.issued)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category share
// ---------------------------------------------------------------------------

type CategoryTooltip = {
  active?: boolean;
  payload?: { payload: CategoryBreakdown & { share: number } }[];
};

function CategoryTooltipContent({ active, payload }: CategoryTooltip) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <TooltipCard>
      <p className="mb-1 font-medium text-popover-foreground">{slice.category}</p>
      <p className="text-muted-foreground">
        {formatNumber(slice.items)} รายการ · {formatNumber(slice.qty)} ชิ้น
      </p>
      <p className="text-muted-foreground">
        มูลค่า{" "}
        <span className="font-medium text-popover-foreground">{formatBaht(slice.value)}</span>{" "}
        ({slice.share.toFixed(1)}%)
      </p>
    </TooltipCard>
  );
}

export function CategoryChart({ data }: { data: CategoryBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const withShare = data.map((d) => ({ ...d, share: (d.value / total) * 100 }));

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลสินค้า</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={withShare}
              dataKey="value"
              nameKey="category"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {withShare.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_SLOTS[index % CATEGORY_SLOTS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Values are spelled out here, not only encoded by colour. */}
      <ul className="space-y-1.5 text-xs">
        {withShare.map((entry, index) => (
          <li key={entry.category} className="flex items-center justify-between gap-3">
            <LegendSwatch
              color={CATEGORY_SLOTS[index % CATEGORY_SLOTS.length]}
              label={entry.category}
            />
            <span className="shrink-0 tabular-nums">
              <span className="font-medium">{formatBaht(entry.value)}</span>
              <span className="ml-2 text-muted-foreground">{entry.share.toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
