"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PASSWORD, demoStore, isDemo } from "@/lib/demo-store";
import { DEMO_COOKIE } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "กรอกอีเมลและรหัสผ่านให้ครบ" };
  }

  if (isDemo) {
    const user = demoStore().users.find((u) => u.user_email.toLowerCase() === email);
    if (!user || password !== DEMO_PASSWORD) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    if (user.user_status !== "1") {
      return { error: "บัญชีนี้ถูกระงับการใช้งาน ติดต่อผู้ดูแลระบบ" };
    }
    const jar = await cookies();
    jar.set(DEMO_COOKIE, user.user_id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("users")
      .select("user_status")
      .eq("user_id", user!.id)
      .single();

    if (profile && (profile as { user_status: string }).user_status !== "1") {
      await supabase.auth.signOut();
      return { error: "บัญชีนี้ถูกระงับการใช้งาน ติดต่อผู้ดูแลระบบ" };
    }
  }

  // "//host" and "/\host" are protocol-relative - only same-site paths allowed.
  const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  redirect(safe ? next : "/dashboard");
}

export async function logout() {
  if (isDemo) {
    const jar = await cookies();
    jar.delete(DEMO_COOKIE);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
