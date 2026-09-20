import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./index";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata as { display_name?: string } | undefined;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      meta?.display_name?.trim() ||
      user.email?.split("@")[0] ||
      null,
  };
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ user: AuthUser | null; needsEmailConfirm: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase غير مضبوط");

  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: displayName?.trim()
        ? { display_name: displayName.trim() }
        : undefined,
    },
  });
  if (error) throw error;

  return {
    user: toAuthUser(data.user),
    needsEmailConfirm: !data.session,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase غير مضبوط");

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  const user = toAuthUser(data.user);
  if (!user) throw new Error("تعذّر تسجيل الدخول");
  return user;
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase غير مضبوط");
  const name = displayName.trim();
  const { data: authData, error: authError } = await sb.auth.updateUser({
    data: { display_name: name },
  });
  if (authError) throw authError;

  const uid = authData.user?.id;
  if (!uid) return;

  const { error } = await sb
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", uid);
  if (error) throw error;
}

export { isSupabaseConfigured };
