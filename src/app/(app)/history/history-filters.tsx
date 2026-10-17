"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
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

const ALL = "__all__";

export function HistoryFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    startTransition(() => router.replace(`/history?${next.toString()}`));
  }

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const type = params.get("type") ?? ALL;
  const hasFilters = Boolean(from || to || params.get("type"));

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Label htmlFor="type">ประเภทรายการ</Label>
        <Select value={type} onValueChange={(v) => update("type", v)}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทั้งหมด</SelectItem>
            <SelectItem value="1">รับเข้า</SelectItem>
            <SelectItem value="2">จ่ายออก</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters ? (
        <div className="flex items-end">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => startTransition(() => router.replace("/history"))}
          >
            <X className="size-4" />
            ล้างตัวกรอง
          </Button>
        </div>
      ) : null}
    </div>
  );
}
