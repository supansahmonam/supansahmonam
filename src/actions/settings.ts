"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { demoStore, isDemo } from "@/lib/demo-store";
import { isAdmin, requireUser } from "@/lib/auth";
import { broadcast, remainingQuota, renderTemplate } from "@/lib/line";

export type SettingsState = { error?: string; ok?: string };

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขการตั้งค่าได้" };

  const values = {
    line_enabled: formData.get("line_enabled") === "on",
    line_recipient_scope: String(formData.get("line_recipient_scope") ?? "broadcast"),
    daily_summary_enabled: formData.get("daily_summary_enabled") === "on",
    daily_summary_time: String(formData.get("daily_summary_time") ?? "09:00"),
    message_template: String(formData.get("message_template") ?? "").trim(),
  };

  if (!values.message_template) return { error: "รูปแบบข้อความต้องไม่ว่าง" };

  if (isDemo) {
    const store = demoStore();
    store.settings = {
      ...store.settings,
      ...values,
      line_recipient_scope: values.line_recipient_scope as "broadcast" | "admins",
      updated_at: new Date().toISOString(),
    };
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("app_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return { ok: "บันทึกการตั้งค่าแล้ว" };
}

/** Sends one sample message to everyone who added the Official Account. */
export async function sendTestMessage(template: string): Promise<SettingsState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่ทดสอบการส่งได้" };

  try {
    const text = renderTemplate(template, {
      product_name: "[ทดสอบ] น้ำมันพืชปาล์ม 1 ล.",
      qty: 8,
      unit: "ขวด",
      min_qty: 30,
      transaction_code: "TEST-0000",
      user_name: user.user_name,
    });
    await broadcast(text);
    return { ok: "ส่งข้อความทดสอบแล้ว ตรวจสอบใน LINE ได้เลย" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ" };
  }
}

/** Messages already used this month, for the quota badge. */
export async function checkQuota(): Promise<{ used?: number; error?: string }> {
  await requireUser();
  try {
    const { totalUsage } = await remainingQuota();
    return { used: totalUsage };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "อ่านโควตาไม่สำเร็จ" };
  }
}
