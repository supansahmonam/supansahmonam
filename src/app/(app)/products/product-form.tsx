"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ImagePlus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { saveProduct, type ProductFormState } from "@/actions/products";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/types";

/** Keeps the demo's in-memory data URLs from growing without bound. */
const MAX_IMAGE_BYTES = 400 * 1024;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="size-4" />
      {pending ? "กำลังบันทึก…" : isEdit ? "บันทึกการแก้ไข" : "บันทึกสินค้า"}
    </Button>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: string[];
}) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [barcode, setBarcode] = useState(product?.product_barcode ?? "");
  const [image, setImage] = useState<string | null>(product?.product_image ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const action = saveProduct.bind(null, product?.product_id ?? null);
  const [state, formAction] = useActionState<ProductFormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(isEdit ? "บันทึกการแก้ไขแล้ว" : "เพิ่มสินค้าแล้ว");
      router.push("/products");
    }
  }, [state.ok, isEdit, router]);

  function pickImage(file: File | undefined) {
    setImageError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("เลือกได้เฉพาะไฟล์รูปภาพ");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("ไฟล์ใหญ่เกิน 400 KB ย่อรูปก่อนอัปโหลด");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      <input type="hidden" name="product_image" value={image ?? ""} />

      <Card className="lg:col-span-2">
        <CardContent className="space-y-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="product_barcode">บาร์โค้ดสินค้า *</Label>
            <div className="flex gap-2">
              <Input
                id="product_barcode"
                name="product_barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="8850001110019"
                inputMode="numeric"
                maxLength={50}
                required
              />
              <BarcodeScanner onDetected={setBarcode} triggerLabel="สแกน" />
            </div>
            <FieldError message={state.fieldErrors?.product_barcode} />
            <p className="text-xs text-muted-foreground">
              ระบบจะตรวจสอบบาร์โค้ดซ้ำก่อนบันทึก
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product_name">ชื่อสินค้า *</Label>
            <Input
              id="product_name"
              name="product_name"
              defaultValue={state.values?.product_name ?? product?.product_name}
              maxLength={255}
              required
            />
            <FieldError message={state.fieldErrors?.product_name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product_category">ประเภทสินค้า *</Label>
              <Input
                id="product_category"
                name="product_category"
                list="category-options"
                defaultValue={state.values?.product_category ?? product?.product_category}
                placeholder="เลือกหรือพิมพ์ประเภทใหม่"
                maxLength={100}
                required
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <FieldError message={state.fieldErrors?.product_category} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_unit">หน่วยนับ *</Label>
              <Input
                id="product_unit"
                name="product_unit"
                defaultValue={state.values?.product_unit ?? product?.product_unit}
                placeholder="ขวด / ลัง / แพ็ค"
                maxLength={50}
                required
              />
              <FieldError message={state.fieldErrors?.product_unit} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="product_price">ราคาต่อหน่วย (บาท) *</Label>
              <Input
                id="product_price"
                name="product_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={state.values?.product_price ?? product?.product_price ?? 0}
                required
              />
              <FieldError message={state.fieldErrors?.product_price} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_qty">
                {isEdit ? "จำนวนคงเหลือ *" : "จำนวนตั้งต้น *"}
              </Label>
              <Input
                id="product_qty"
                name="product_qty"
                type="number"
                step="1"
                min="0"
                defaultValue={state.values?.product_qty ?? product?.product_qty ?? 0}
                required
              />
              <FieldError message={state.fieldErrors?.product_qty} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_minQty">จุดสั่งซื้อขั้นต่ำ *</Label>
              <Input
                id="product_minQty"
                name="product_minQty"
                type="number"
                step="1"
                min="0"
                defaultValue={state.values?.product_minQty ?? product?.product_minQty ?? 0}
                required
              />
              <FieldError message={state.fieldErrors?.product_minQty} />
            </div>
          </div>

          {isEdit ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                การแก้จำนวนคงเหลือตรงนี้ไม่บันทึกเป็นรายการรับ-จ่าย
                ใช้หน้ารับเข้าหรือจ่ายออกเพื่อให้มีประวัติย้อนหลัง
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2 pt-2">
            <SubmitButton isEdit={isEdit} />
            <Button type="button" variant="outline" onClick={() => router.push("/products")}>
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardContent className="space-y-3">
          <Label>รูปภาพสินค้า</Label>

          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40">
            {image ? (
              <>
                <Image
                  src={image}
                  alt="ตัวอย่างรูปสินค้า"
                  fill
                  unoptimized
                  className="object-contain"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2"
                  aria-label="ลบรูปภาพ"
                  onClick={() => {
                    setImage(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
                <ImagePlus className="size-8" />
                <p className="text-xs">ยังไม่มีรูปภาพ</p>
              </div>
            )}
          </div>

          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
          <p className="text-xs text-muted-foreground">
            ไฟล์ภาพไม่เกิน 400 KB — ระบบจะย้ายไปเก็บที่ Supabase Storage
            เมื่อเชื่อมต่อฐานข้อมูลจริงแล้ว
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
