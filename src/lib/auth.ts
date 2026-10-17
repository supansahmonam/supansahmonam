import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoStore, isDemo } from "@/lib/demo-store";
import type { UserLevel } from "@/lib/constants";
import type { User } from "@/lib/types";

export const DEMO_COOKIE = "smartstock_demo_user";

/**
 * The signed-in user's profile row, or null.
 *
 * In demo mode the "session" is a cookie holding a user_id from the seeded
 * user list. With Supabase configured it is the real auth session joined to
 * the users table (table 3.1).
 *
 * Wrapped in React `cache()` so the layout and the page share one lookup per
 * request instead of each hitting Supabase. `getClaims()` verifies the JWT
 * locally; the proxy has already called `getUser()` on this request to
 * validate and refresh the session with the Auth server.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (isDemo) {
    const jar = await cookies();
    const id = jar.get(DEMO_COOKIE)?.value;
    if (!id) return null;
    return demoStore().users.find((u) => u.user_id === id) ?? null;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  return (data as User | null) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.user_status !== "1") redirect("/login?error=suspended");
  return user;
}

/** Sends the user back to the dashboard when their level is not in `levels`. */
export async function requireLevel(levels: UserLevel[]): Promise<User> {
  const user = await requireUser();
  if (!levels.includes(user.user_level)) redirect("/dashboard?error=forbidden");
  return user;
}

export function canManageProducts(user: User) {
  return user.user_level === "0" || user.user_level === "1";
}

export function canMoveStock(user: User) {
  return user.user_level !== "3";
}

export function isAdmin(user: User) {
  return user.user_level === "0";
}
