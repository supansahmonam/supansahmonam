"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBaht, formatDate, formatNumber, toDateInput } from "@/lib/format";
import type { ReportRow } from "@/lib/data";

const ALL = "__all__";

const HEADERS = [
  "ลำดับ",
  "บาร์โค้ด",
  "ชื่อสินค้า",
  "ประเภท",
  "หน่วยนับ",
  "ราคาต่อหน่วย",
  "รับเข้า",
  "จ่ายออก",
  "คงเหลือ",
  "ขั้นต่ำ",
  "มูลค่าคงเหลือ",
  "สถานะ",
];

function rowValues(row: ReportRow, index: number) {
  return [
    index + 1,
    row.product_barcode,
    row.product_name,
    row.product_category,
    row.product_unit,
    row.product_price,
    row.received,
    row.issued,
    row.product_qty,
    row.product_minQty,
    row.value,
    row.below_min ? "ต่ำกว่าขั้นต่ำ" : "ปกติ",
  ];
}

function periodLabel(from?: string, to?: string) {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `ตั้งแต่ ${formatDate(from)}`;
  if (to) return `ถึง ${formatDate(to)}`;
  return "ทุกช่วงเวลา";
}

export function ReportToolbar({
  rows,
  categories,
}: {
  rows: ReportRow[];
  categories: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const category = params.get("category") ?? ALL;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`/reports?${next.toString()}`));
  }

  async function exportExcel() {
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

      const sheetData = [
        ["รายงานสินค้าคงเหลือ — ระบบคลังสินค้าอัจฉริยะ (Smart Stock)"],
        ["บริษัท มาเธอร์ มาร์เก็ตติ้ง จำกัด (มหาชน)"],
        [`ช่วงข้อมูล: ${periodLabel(from || undefined, to || undefined)}`],
        [`ประเภทสินค้า: ${category === ALL ? "ทุกประเภท" : category}`],
        [`ออกรายงานเมื่อ: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`],
        [],
        HEADERS,
        ...rows.map(rowValues),
        [],
        ["", "", "", "", "", "", "", "", "", "มูลค่ารวม", totalValue],
      ];

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      sheet["!cols"] = [
        { wch: 6 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 14 },
      ];

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "สินค้าคงเหลือ");
      XLSX.writeFile(book, `stock-report-${toDateInput(new Date())}.xlsx`);
      toast.success("ส่งออกไฟล์ Excel แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออก Excel ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      // jsPDF ships no Thai glyphs, so Sarabun is embedded at export time.
      const [regular, bold] = await Promise.all([
        loadFontBase64("/fonts/Sarabun-Regular.ttf"),
        loadFontBase64("/fonts/Sarabun-Bold.ttf"),
      ]);

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.addFileToVFS("Sarabun-Regular.ttf", regular);
      doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
      doc.addFileToVFS("Sarabun-Bold.ttf", bold);
      doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
      doc.setFont("Sarabun", "bold");

      doc.setFontSize(15);
      doc.text("รายงานสินค้าคงเหลือ — ระบบคลังสินค้าอัจฉริยะ (Smart Stock)", 40, 40);
      doc.setFont("Sarabun", "normal");
      doc.setFontSize(10);
      doc.text("บริษัท มาเธอร์ มาร์เก็ตติ้ง จำกัด (มหาชน)", 40, 58);
      doc.text(
        `ช่วงข้อมูล: ${periodLabel(from || undefined, to || undefined)}  ·  ประเภท: ${
          category === ALL ? "ทุกประเภท" : category
        }`,
        40,
        74,
      );

      autoTable(doc, {
        head: [HEADERS],
        body: rows.map((r, i) => rowValues(r, i).map(String)),
        startY: 90,
        styles: { font: "Sarabun", fontSize: 8, cellPadding: 4 },
        headStyles: { font: "Sarabun", fontStyle: "bold", fillColor: [42, 120, 214] },
        columnStyles: {
          0: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "right" },
          10: { halign: "right" },
        },
      });

      const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
      const endY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
      doc.setFont("Sarabun", "bold");
      doc.setFontSize(11);
      doc.text(`มูลค่าสินค้าคงคลังรวม: ${formatBaht(totalValue)}`, 40, endY + 24);
      doc.setFont("Sarabun", "normal");
      doc.setFontSize(9);
      doc.text(
        `สินค้าต่ำกว่าจุดสั่งซื้อขั้นต่ำ: ${formatNumber(
          rows.filter((r) => r.below_min).length,
        )} รายการ`,
        40,
        endY + 40,
      );

      doc.save(`stock-report-${toDateInput(new Date())}.pdf`);
      toast.success("ส่งออกไฟล์ PDF แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออก PDF ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <div className="space-y-1.5">
        <Label htmlFor="from">ตั้งแต่วันที่</Label>
        <Input
          id="from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to">ถึงวันที่</Label>
        <Input
          id="to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">ประเภทสินค้า</Label>
        <Select value={category} onValueChange={(v) => update("category", v)}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทุกประเภท</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 items-end gap-2 lg:flex">
        <Button variant="outline" onClick={exportExcel} disabled={busy !== null || rows.length === 0}>
          <FileSpreadsheet className="size-4" />
          {busy === "excel" ? "กำลังสร้าง…" : "Excel"}
        </Button>
        <Button variant="outline" onClick={exportPdf} disabled={busy !== null || rows.length === 0}>
          {busy === "pdf" ? <FileDown className="size-4" /> : <FileText className="size-4" />}
          {busy === "pdf" ? "กำลังสร้าง…" : "PDF"}
        </Button>
      </div>
    </div>
  );
}

/** Reads a font file from /public and returns it as base64 for jsPDF's VFS. */
async function loadFontBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ (${res.status})`);
  const buffer = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
