"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  MessageCircle,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { lookupBarcode } from "@/actions/lookup";
import { commitStock, type StockResultLine } from "@/actions/stock";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { StockBadge } from "@/components/stock-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatBaht, formatNumber } from "@/lib/format";
import type { CartLine, Product, User } from "@/lib/types";
import type { TransactionType } from "@/lib/constants";

/**
 * The receive-in and issue-out screens are the same workflow with opposite
 * signs, so they share this component: scan, review, queue, confirm. Nothing
 * touches stock until the whole basket is confirmed.
 */
export function StockWorkspace({
  type,
  user,
  documentCode,
}: {
  type: TransactionType;
  user: User;
  documentCode: string;
}) {
  const router = useRouter();
  const isReceive = type === "1";

  const [barcode, setBarcode] = useState("");
  const [current, setCurrent] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [results, setResults] = useState<StockResultLine[] | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const [looking, startLookup] = useTransition();
  const [committing, startCommit] = useTransition();
  const qtyRef = useRef<HTMLInputElement>(null);

  /** Quantity already queued for a product, so the cart cannot oversell. */
  function queuedFor(productId: string) {
    return lines
      .filter((l) => l.product.product_id === productId)
      .reduce((sum, l) => sum + l.qty, 0);
  }

  function find(value: string) {
    const code = value.trim();
    if (!code) return;
    setLookupError(null);
    setResults(null);

    startLookup(async () => {
      const { product, error } = await lookupBarcode(code);
      if (error || !product) {
        setCurrent(null);
        setLookupError(error ?? "ไม่พบสินค้า");
        return;
      }
      setCurrent(product);
      setBarcode(product.product_barcode);
      setQty("1");
      requestAnimationFrame(() => qtyRef.current?.select());
    });
  }

  function addLine() {
    if (!current) return;
    const amount = Number(qty);

    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("จำนวนต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }

    if (!isReceive) {
      const available = current.product_qty - queuedFor(current.product_id);
      if (amount > available) {
        toast.error(
          `จ่ายออกได้ไม่เกิน ${formatNumber(available)} ${current.product_unit} (คงเหลือ ${formatNumber(current.product_qty)})`,
        );
        return;
      }
    }

    setLines((prev) => [
      ...prev,
      {
        key: `${current.product_id}-${Date.now()}`,
        product: current,
        qty: amount,
        note: note.trim(),
      },
    ]);

    setCurrent(null);
    setBarcode("");
    setQty("1");
    toast.success(`เพิ่ม "${current.product_name}" เข้ารายการรอยืนยันแล้ว`);
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function confirmAll() {
    if (lines.length === 0) return;

    startCommit(async () => {
      const state = await commitStock(
        type,
        lines.map((l) => ({ product_id: l.product.product_id, qty: l.qty, note: l.note })),
      );

      const saved = state.results ?? [];
      if (state.error) toast.error(state.error);
      if (saved.length === 0) return;

      // Lines are committed in order, so the first `saved.length` are done.
      // Dropping them keeps a retry from recording them a second time.
      setResults(saved);
      setNotifyError(state.notifyError ?? null);
      setLines((prev) => prev.slice(saved.length));
      setCurrent(null);
      setBarcode("");
      if (!state.error) {
        toast.success(`บันทึก${isReceive ? "รับเข้า" : "จ่ายออก"} ${saved.length} รายการแล้ว`);
      }
      router.refresh();
    });
  }

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalValue = lines.reduce((sum, l) => sum + l.qty * l.product.product_price, 0);

  /** Items that will drop to or below their minimum once confirmed. */
  const willTriggerAlert = !isReceive
    ? [...new Map(lines.map((l) => [l.product.product_id, l.product])).values()].filter(
        (p) => p.product_qty - queuedFor(p.product_id) <= p.product_minQty,
      )
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* --- scan panel ----------------------------------------------------- */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>สแกนบาร์โค้ด</CardTitle>
            <CardDescription>
              ใช้กล้องมือถือ หรือพิมพ์เลขบาร์โค้ดแล้วกด Enter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                find(barcode);
              }}
              className="flex gap-2"
            >
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="เลขบาร์โค้ด"
                inputMode="numeric"
                autoFocus
                aria-label="เลขบาร์โค้ด"
              />
              <Button type="submit" variant="secondary" disabled={looking}>
                <Search className="size-4" />
              </Button>
              <BarcodeScanner onDetected={(code) => find(code)} triggerLabel="สแกน" />
            </form>

            {lookupError ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>{lookupError}</AlertDescription>
              </Alert>
            ) : null}

            {current ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{current.product_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {current.product_barcode}
                    </p>
                  </div>
                  <StockBadge qty={current.product_qty} minQty={current.product_minQty} />
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">ประเภท</dt>
                  <dd className="text-right">{current.product_category}</dd>
                  <dt className="text-muted-foreground">คงเหลือ</dt>
                  <dd className="text-right tabular-nums font-medium">
                    {formatNumber(current.product_qty)} {current.product_unit}
                  </dd>
                  <dt className="text-muted-foreground">จุดสั่งซื้อขั้นต่ำ</dt>
                  <dd className="text-right tabular-nums">
                    {formatNumber(current.product_minQty)}
                  </dd>
                  <dt className="text-muted-foreground">ราคาต่อหน่วย</dt>
                  <dd className="text-right tabular-nums">
                    {formatBaht(current.product_price)}
                  </dd>
                </dl>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="qty">
                    จำนวน{isReceive ? "รับเข้า" : "ที่จ่ายออก"} ({current.product_unit})
                  </Label>
                  <Input
                    id="qty"
                    ref={qtyRef}
                    type="number"
                    min="1"
                    step="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLine();
                      }
                    }}
                  />
                </div>

                <Button type="button" className="w-full" onClick={addLine}>
                  <Check className="size-4" />
                  เพิ่มเข้ารายการรอยืนยัน
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลขที่เอกสาร</Label>
              <Input value={documentCode} readOnly className="font-mono" />
              <p className="text-xs text-muted-foreground">
                ระบบออกเลขให้อัตโนมัติตอนยืนยันรายการ
              </p>
            </div>

            <div className="space-y-2">
              <Label>{isReceive ? "ผู้บันทึกรายการ" : "ผู้เบิกสินค้า"}</Label>
              <Input value={user.user_name} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุ</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isReceive ? "เช่น รับจากซัพพลายเออร์ A" : "เช่น เบิกหน้าร้าน"}
                maxLength={255}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                หมายเหตุจะติดไปกับรายการที่เพิ่มถัดไป
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- cart ----------------------------------------------------------- */}
      <div className="space-y-4 lg:col-span-3">
        <Card className="overflow-hidden py-0">
          <CardHeader className="p-4">
            <CardTitle>รายการรอการยืนยัน</CardTitle>
            <CardDescription>
              ยอดคงเหลือจะถูกปรับก็ต่อเมื่อกดยืนยันรายการทั้งหมดแล้ว
            </CardDescription>
          </CardHeader>

          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">มูลค่า</TableHead>
                  <TableHead className="hidden md:table-cell">หมายเหตุ</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      ยังไม่มีรายการ สแกนบาร์โค้ดเพื่อเริ่มต้น
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.key}>
                      <TableCell>
                        <p className="font-medium">{line.product.product_name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {line.product.product_barcode}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {isReceive ? "+" : "−"}
                        {formatNumber(line.qty)} {line.product.product_unit}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {formatBaht(line.qty * line.product.product_price)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {line.note || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.key)}
                          disabled={committing}
                          aria-label="ลบรายการนี้"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {lines.length > 0 ? (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium">รวม {lines.length} รายการ</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(totalQty)} หน่วย
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums font-medium">
                      {formatBaht(totalValue)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" />
                    <TableCell />
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>

          <div className="space-y-3 border-t p-4">
            {willTriggerAlert.length > 0 ? (
              <Alert>
                <MessageCircle className="size-4" />
                <AlertTitle>จะมีการแจ้งเตือนผ่าน LINE</AlertTitle>
                <AlertDescription>
                  หลังยืนยัน สินค้า {willTriggerAlert.length} รายการจะเหลือต่ำกว่าหรือเท่ากับ
                  จุดสั่งซื้อขั้นต่ำ ระบบจะส่งข้อความแจ้งเตือนอัตโนมัติ
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              disabled={lines.length === 0 || committing}
              onClick={confirmAll}
            >
              <CircleCheck className="size-4" />
              {committing
                ? "กำลังบันทึก…"
                : `ยืนยัน${isReceive ? "รับสินค้าเข้าคลัง" : "จ่ายสินค้าออกจากคลัง"}`}
            </Button>
          </div>
        </Card>

        {results && results.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>ผลการบันทึก</CardTitle>
              <CardDescription>ยอดคงเหลือถูกปรับในฐานข้อมูลแล้ว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifyError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>บันทึกสำเร็จ แต่ส่ง LINE ไม่สำเร็จ</AlertTitle>
                  <AlertDescription className="break-all">{notifyError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่เอกสาร</TableHead>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">ก่อน</TableHead>
                      <TableHead className="text-right">หลัง</TableHead>
                      <TableHead>แจ้งเตือน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.transaction_id}>
                        <TableCell className="font-mono text-xs">
                          {r.transaction_code}
                        </TableCell>
                        <TableCell>{r.product_name}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatNumber(r.qty_before)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatNumber(r.qty_after)}
                        </TableCell>
                        <TableCell>
                          {r.notified ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <MessageCircle className="size-3" />
                              ส่งแล้ว
                            </span>
                          ) : r.below_min ? (
                            <span className="text-xs text-amber-600">ต่ำกว่าขั้นต่ำ</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
