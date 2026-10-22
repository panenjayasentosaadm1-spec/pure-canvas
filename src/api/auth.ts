// Real authentication via Supabase Auth + admin role check against
// public.user_roles through the security-definer has_role() function.
// There is no frontend bypass: the route guard and every RLS policy
// re-verify the role server-side on each request.

import { supabase } from "@/integrations/supabase/client";
import type { MockSession } from "./types";

/** Verifies the user holds the admin role, checked in Postgres, never client-side flags. */
async function hasAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return data === true;
}

function toSession(user: { id: string; email?: string | undefined; last_sign_in_at?: string | undefined }): MockSession {
  return {
    username: user.email ?? user.id,
    loggedInAt: user.last_sign_in_at ?? new Date().toISOString(),
  };
}

/** Returns the current admin session, or null when signed out or not an admin. */
export async function getSession(): Promise<MockSession | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  if (!(await hasAdminRole(data.user.id))) return null;
  return toSession(data.user);
}

/** Signs in with email + password. Signs back out and throws when the account is not an admin. */
export async function login(email: string, password: string): Promise<MockSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) {
    throw new Error("Email atau kata sandi salah.");
  }
  if (!(await hasAdminRole(data.user.id))) {
    await supabase.auth.signOut();
    throw new Error("Akun ini tidak memiliki akses admin.");
  }
  return toSession(data.user);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}
