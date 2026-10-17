import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requireLevel } from "@/lib/auth";
import { CAN_ADMIN } from "@/lib/constants";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "ตั้งค่าการแจ้งเตือน" };

export default async function SettingsPage() {
  await requireLevel(CAN_ADMIN);
  const settings = await getSettings();

  // Only whether the token exists is sent to the browser, never the token.
  const tokenConfigured = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

  return (
    <>
      <PageHeader
        title="ตั้งค่าการแจ้งเตือนผ่าน LINE"
        description="กำหนดเงื่อนไขและรูปแบบข้อความแจ้งเตือนสินค้าใกล้หมด"
        action={
          tokenConfigured ? (
            <Badge className="gap-1 border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              <CheckCircle2 className="size-3" />
              เชื่อมต่อ Channel Access Token แล้ว
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="size-3" />
              ยังไม่ได้ตั้งค่า Token
            </Badge>
          )
        }
      />
      <SettingsForm settings={settings} />
    </>
  );
}
