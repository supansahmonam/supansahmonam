"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageMinus,
  PackagePlus,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { USER_LEVEL, type UserLevel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  levels?: UserLevel[];
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "หน้าแรก", icon: LayoutDashboard },
  { href: "/products", label: "จัดการข้อมูลสินค้า", icon: Package },
  { href: "/receive", label: "รับสินค้าเข้าคลัง", icon: PackagePlus, levels: ["0", "1", "2"] },
  { href: "/issue", label: "จ่ายสินค้าออกจากคลัง", icon: PackageMinus, levels: ["0", "1", "2"] },
  { href: "/history", label: "ประวัติการทำรายการ", icon: ClipboardList },
  { href: "/reports", label: "รายงานสินค้าคงเหลือ", icon: FileBarChart },
  { href: "/settings", label: "ตั้งค่าการแจ้งเตือน", icon: Settings, levels: ["0"] },
  { href: "/users", label: "จัดการผู้ใช้งาน", icon: Users, levels: ["0"] },
];

function NavLinks({
  level,
  onNavigate,
}: {
  level: UserLevel;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.levels || item.levels.includes(level));

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
      <Image
        src="/logo.png"
        alt="Smart Stock"
        width={1501}
        height={610}
        priority
        className="h-8 w-auto"
      />
      <span className="sr-only">Smart Stock</span>
      <span className="hidden min-w-0 border-l pl-2.5 text-xs leading-tight text-muted-foreground sm:block lg:block">
        มาเธอร์
        <br />
        มาร์เก็ตติ้ง
      </span>
    </Link>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.user_name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.user_email}</p>
        <Badge variant="secondary" className="mt-1.5 text-xs">
          {USER_LEVEL[user.user_level]}
        </Badge>
      </div>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <LogOut className="size-4" />
          ออกจากระบบ
        </Button>
      </form>
    </div>
  );
}

export function AppShell({
  user,
  demo,
  children,
}: {
  user: User;
  demo: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const banner = demo ? (
    <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      โหมดสาธิต — ข้อมูลเก็บในหน่วยความจำ ยังไม่ได้เชื่อม Supabase
    </div>
  ) : null;

  return (
    <div className="flex min-h-svh">
      {/*
        Desktop sidebar. Sticky and exactly one screen tall, so the user card
        stays in the bottom-left corner instead of sitting at the bottom of a
        long page. The nav scrolls on its own if the screen is short.
      */}
      <aside className="sticky top-0 hidden h-svh self-start w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="p-4 pb-0">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <NavLinks level={user.user_level} />
        </div>
        <div className="space-y-3 p-4 pt-0">
          <Separator />
          <UserCard user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile header, pinned while the page scrolls */}
        <header className="sticky top-0 z-40 lg:hidden">
          {banner}
          <div className="flex items-center gap-3 border-b bg-card/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="เปิดเมนู">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
                <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
                <div className="p-4 pb-0">
                  <Brand />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <NavLinks level={user.user_level} onNavigate={() => setOpen(false)} />
                </div>
                <div className="space-y-3 p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <Separator />
                  <UserCard user={user} />
                </div>
              </SheetContent>
            </Sheet>
            <Brand />
          </div>
        </header>

        <div className="hidden lg:block">{banner}</div>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
