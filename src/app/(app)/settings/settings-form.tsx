"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  ExternalLink,
  Gauge,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  checkQuota,
  saveSettings,
  sendTestMessage,
  type SettingsState,
} from "@/actions/settings";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { renderPreview } from "./preview";
import type { AppSettings } from "@/lib/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="size-4" />
      {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
    </Button>
  );
}

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [template, setTemplate] = useState(settings.message_template);
  const [enabled, setEnabled] = useState(settings.line_enabled);
  const [summary, setSummary] = useState(settings.daily_summary_enabled);
  // Controlled on purpose: React resets uncontrolled fields after a form action.
  const [scope, setScope] = useState(settings.line_recipient_scope);
  const [time, setTime] = useState(settings.daily_summary_time.slice(0, 5));
  const [quota, setQuota] = useState<string | null>(null);
  const [testing, startTest] = useTransition();
  const [checking, startCheck] = useTransition();

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  function runTest() {
    startTest(async () => {
      const result = await sendTestMessage(template);
      if (result.error) toast.error(result.error);
      else toast.success(result.ok);
    });
  }

  function runQuotaCheck() {
    startCheck(async () => {
      const result = await checkQuota();
      if (result.error) {
        toast.error(result.error);
        setQuota(null);
      } else {
        setQuota(`ใช้ไปแล้ว ${result.used} ข้อความในเดือนนี้`);
      }
    });
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>การเชื่อมต่อ LINE Messaging API</CardTitle>
            <CardDescription>
              Channel Access Token ถูกเก็บไว้ในตัวแปรแวดล้อมฝั่งเซิร์ฟเวอร์
              และไม่ถูกส่งมายังเบราว์เซอร์
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <Label htmlFor="line_enabled">เปิดการแจ้งเตือนอัตโนมัติ</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  ส่งข้อความทันทีที่สินค้าเหลือถึงหรือต่ำกว่าจุดสั่งซื้อขั้นต่ำ
                </p>
              </div>
              <Switch
                id="line_enabled"
                name="line_enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="line_recipient_scope">กลุ่มผู้รับการแจ้งเตือน</Label>
              <Select
                name="line_recipient_scope"
                value={scope}
                onValueChange={(v) => setScope(v as typeof scope)}
              >
                <SelectTrigger id="line_recipient_scope" className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">
                    ทุกคนที่เพิ่มเพื่อนกับ Official Account
                  </SelectItem>
                  <SelectItem value="admins">เฉพาะผู้ดูแลระบบและหัวหน้าคลัง</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ตัวเลือก &ldquo;เฉพาะผู้ดูแลระบบ&rdquo; ต้องผูก LINE user ID
                ของแต่ละคนก่อน จึงยังส่งแบบ broadcast อยู่
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={runTest} disabled={testing}>
                <Send className="size-4" />
                {testing ? "กำลังส่ง…" : "ทดสอบการส่งข้อความ"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={runQuotaCheck}
                disabled={checking}
              >
                <Gauge className="size-4" />
                {checking ? "กำลังตรวจ…" : "ตรวจโควตาเดือนนี้"}
              </Button>
            </div>

            {quota ? <p className="text-sm text-muted-foreground">{quota}</p> : null}

            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>โควตาแพ็กเกจฟรี 200 ข้อความ/เดือน</AlertTitle>
              <AlertDescription>
                นับแยกตามผู้รับ — ส่ง broadcast 1 ครั้งถึงคน 3 คน คิดเป็น 3 ข้อความ
                ปิดสวิตช์ด้านบนไว้ระหว่างทดสอบระบบเพื่อไม่ให้โควตาหมด
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รูปแบบข้อความแจ้งเตือน</CardTitle>
            <CardDescription>
              ใช้ตัวแปร {"{product_name} {qty} {unit} {min_qty} {transaction_code} {user_name} {date}"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              name="message_template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <div className="space-y-1.5">
              <Label>ตัวอย่างข้อความที่จะส่ง</Label>
              <div className="rounded-2xl rounded-tl-sm bg-emerald-50 p-3 text-sm whitespace-pre-wrap">
                {renderPreview(template)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายงานสรุปประจำวัน</CardTitle>
            <CardDescription>
              ส่งสรุปสินค้าใกล้หมดและยอดรับ-จ่ายของวันไปยัง LINE ตามเวลาที่กำหนด
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label htmlFor="daily_summary_enabled">เปิดรายงานสรุปประจำวัน</Label>
              <Switch
                id="daily_summary_enabled"
                name="daily_summary_enabled"
                checked={summary}
                onCheckedChange={setSummary}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_summary_time">เวลาส่ง (เวลาไทย)</Label>
              <Input
                id="daily_summary_time"
                name="daily_summary_time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">
                เวลาจริงกำหนดโดย Vercel Cron ที่เรียก
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  /api/line/daily-summary
                </code>
                ค่าตรงนี้ใช้บันทึกไว้เป็นเอกสารประกอบ
              </p>
            </div>
          </CardContent>
        </Card>

        <SaveButton />
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>จุดสั่งซื้อขั้นต่ำ</CardTitle>
          <CardDescription>
            กำหนดแยกรายสินค้าในหน้าจัดการข้อมูลสินค้า
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            ค่า <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">product_minQty</code>{" "}
            ของสินค้าแต่ละรายการคือเกณฑ์ที่ใช้ตัดสินใจส่งแจ้งเตือน
            แก้ไขได้ในแบบฟอร์มของสินค้านั้น ๆ
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/products">
              ไปหน้าจัดการข้อมูลสินค้า
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
