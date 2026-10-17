"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function ProductFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? ALL;

  /** Push the search box value into the URL, but not on every keystroke. */
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page");
      startTransition(() => router.replace(`/products?${next.toString()}`));
    }, 300);

    return () => clearTimeout(timer);
  }, [q, params, router]);

  function setCategory(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete("category");
    else next.set("category", value);
    next.delete("page");
    startTransition(() => router.replace(`/products?${next.toString()}`));
  }

  const hasFilters = Boolean(q || params.get("category"));

  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[200px] sm:flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด"
          className="pl-9"
          aria-label="ค้นหาสินค้า"
        />
      </div>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="กรองตามประเภทสินค้า">
          <SelectValue placeholder="ทุกประเภท" />
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

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace("/products"));
          }}
        >
          <X className="size-4" />
          ล้างตัวกรอง
        </Button>
      ) : null}
    </div>
  );
}
