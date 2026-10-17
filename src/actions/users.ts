"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { demoStore, isDemo } from "@/lib/demo-store";
import { isAdmin, requireUser } from "@/lib/auth";
import type { UserLevel, UserStatus } from "@/lib/constants";

const schema = z.object({
  user_name: z.string().trim().min(1, "กรอกชื่อผู้ใช้งาน").max(255),
  user_email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(255),
  user_level: z.enum(["0", "1", "2", "3"]),
  user_status: z.enum(["0", "1", "2"]),
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").optional().or(z.literal("")),
});

export type UserFormState = { error?: string; ok?: string };

export async function saveUser(
  userId: string | null,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการผู้ใช้งานได้" };

  const parsed = schema.safeParse({
    user_name: formData.get("user_name"),
    user_email: formData.get("user_email"),
    user_level: formData.get("user_level"),
    user_status: formData.get("user_status"),
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { password, ...profile } = parsed.data;

  // Same rule as changeUserLevel / setUserStatus: an admin cannot lock
  // themselves out through the edit form either.
  if (userId === me.user_id) {
    if (profile.user_level !== me.user_level) return { error: "เปลี่ยนสิทธิ์ของตัวเองไม่ได้" };
    if (profile.user_status !== "1") return { error: "ระงับบัญชีของตัวเองไม่ได้" };
  }

  if (isDemo) {
    const store = demoStore();
    const clash = store.users.find(
      (u) => u.user_email.toLowerCase() === profile.user_email.toLowerCase() && u.user_id !== userId,
    );
    if (clash) return { error: "อีเมลนี้ถูกใช้ไปแล้ว" };

    const stamp = new Date().toISOString();
    if (userId) {
      const index = store.users.findIndex((u) => u.user_id === userId);
      if (index === -1) return { error: "ไม่พบผู้ใช้งาน" };
      store.users[index] = { ...store.users[index], ...profile, user_updatedAt: stamp };
    } else {
      if (!password) return { error: "กรอกรหัสผ่านสำหรับผู้ใช้งานใหม่" };
      store.users.push({
        user_id: crypto.randomUUID(),
        ...profile,
        user_createdAt: stamp,
        user_updatedAt: stamp,
      });
    }

    revalidatePath("/users");
    return { ok: userId ? "บันทึกข้อมูลผู้ใช้งานแล้ว" : "เพิ่มผู้ใช้งานแล้ว" };
  }

  const admin = createAdminClient();

  if (userId) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: profile.user_email,
      ...(password ? { password } : {}),
      user_metadata: { user_name: profile.user_name, user_level: profile.user_level },
    });
    if (authError) return { error: authError.message };

    const supabase = await createClient();
    const { error } = await supabase.from("users").update(profile).eq("user_id", userId);
    if (error) return { error: error.message };
  } else {
    if (!password) return { error: "กรอกรหัสผ่านสำหรับผู้ใช้งานใหม่" };

    const { data, error: authError } = await admin.auth.admin.createUser({
      email: profile.user_email,
      password,
      email_confirm: true,
      user_metadata: { user_name: profile.user_name, user_level: profile.user_level },
    });
    if (authError) return { error: authError.message };

    // The auth trigger inserts the profile row; align the remaining columns.
    await admin.from("users").update(profile).eq("user_id", data.user.id);
  }

  revalidatePath("/users");
  return { ok: userId ? "บันทึกข้อมูลผู้ใช้งานแล้ว" : "เพิ่มผู้ใช้งานแล้ว" };
}

/** Suspend or re-activate an account without deleting it. */
export async function setUserStatus(
  userId: string,
  status: UserStatus,
): Promise<UserFormState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่ระงับบัญชีได้" };
  if (userId === me.user_id) return { error: "ระงับบัญชีของตัวเองไม่ได้" };

  if (isDemo) {
    const store = demoStore();
    const user = store.users.find((u) => u.user_id === userId);
    if (!user) return { error: "ไม่พบผู้ใช้งาน" };
    user.user_status = status;
    user.user_updatedAt = new Date().toISOString();
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ user_status: status })
      .eq("user_id", userId);
    if (error) return { error: error.message };
  }

  revalidatePath("/users");
  return { ok: status === "0" ? "ระงับการใช้งานแล้ว" : "เปิดใช้งานแล้ว" };
}

/** Emails a password-reset link. In demo mode it only reports what would happen. */
export async function resetPassword(email: string): Promise<UserFormState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่รีเซ็ตรหัสผ่านได้" };

  if (isDemo) {
    return { ok: `โหมดสาธิต: ปกติระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${email}` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: error.message };
  return { ok: `ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${email} แล้ว` };
}

export async function changeUserLevel(
  userId: string,
  level: UserLevel,
): Promise<UserFormState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนสิทธิ์ได้" };
  if (userId === me.user_id) return { error: "เปลี่ยนสิทธิ์ของตัวเองไม่ได้" };

  if (isDemo) {
    const user = demoStore().users.find((u) => u.user_id === userId);
    if (!user) return { error: "ไม่พบผู้ใช้งาน" };
    user.user_level = level;
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ user_level: level })
      .eq("user_id", userId);
    if (error) return { error: error.message };
  }

  revalidatePath("/users");
  return { ok: "เปลี่ยนระดับผู้ใช้งานแล้ว" };
}
