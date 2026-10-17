import type { Metadata } from "next";
import Image from "next/image";
import { Info, ShieldAlert } from "lucide-react";
import { LoginForm } from "./login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_PASSWORD, demoStore, isDemo } from "@/lib/demo-store";
import { USER_LEVEL } from "@/lib/constants";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const error = typeof params.error === "string" ? params.error : undefined;

  const demoAccounts = isDemo
    ? demoStore().users.filter((u) => u.user_status === "1")
    : [];

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="Smart Stock"
            width={1501}
            height={610}
            priority
            className="h-16 w-auto"
          />
          <p className="text-sm text-muted-foreground">
            ระบบคลังสินค้าอัจฉริยะ
            <br />
            บริษัท มาเธอร์ มาร์เก็ตติ้ง จำกัด (มหาชน)
          </p>
        </div>

        {error === "suspended" ? (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertDescription>บัญชีนี้ถูกระงับการใช้งาน ติดต่อผู้ดูแลระบบ</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              ระบบจะกำหนดเมนูที่มองเห็นตามระดับผู้ใช้งานของบัญชีนี้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              next={next}
              initialEmail={isDemo ? demoAccounts[0]?.user_email : undefined}
            />
          </CardContent>
        </Card>

        {isDemo ? (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>โหมดสาธิต — ยังไม่ได้เชื่อม Supabase</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  ข้อมูลทั้งหมดเป็นตัวอย่างในหน่วยความจำ รหัสผ่านทุกบัญชีคือ{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {DEMO_PASSWORD}
                  </code>
                </p>
                <ul className="space-y-1 text-xs">
                  {demoAccounts.map((u) => (
                    <li key={u.user_id} className="flex justify-between gap-2">
                      <span className="font-mono">{u.user_email}</span>
                      <span className="text-muted-foreground">
                        {USER_LEVEL[u.user_level]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </main>
  );
}
