import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./index";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata as {
    display_name?: string;
    full_name?: string;
    name?: string;
  } | undefined;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      meta?.display_name?.trim() ||
      meta?.full_name?.trim() ||
      meta?.name?.trim() ||
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

function randomNonce(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]!).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Native Sign in with Apple → Supabase session.
 * iOS only. Requires Apple capability + Supabase Apple provider configured.
 */
export async function signInWithAppleNative(): Promise<AuthUser> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase غير مضبوط");

  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("تسجيل الدخول بـ Apple متاح على الآيفون فقط حالياً");
  }

  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
  const result = await SignInWithApple.authorize({
    // Must match the iOS App ID / Bundle ID configured in Supabase Apple provider
    clientId: "app.khamsa.game",
    redirectURI: "https://eqxaivexuowngyigmqwl.supabase.co/auth/v1/callback",
    scopes: "email name",
    nonce: hashedNonce,
  });

  const identityToken = result.response.identityToken;
  if (!identityToken) {
    throw new Error("لم يُرجع Apple رمز الدخول");
  }

  const given = result.response.givenName?.trim();
  const family = result.response.familyName?.trim();
  const fullName = [given, family].filter(Boolean).join(" ").trim();

  const { data, error } = await sb.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  if (fullName && data.user) {
    await sb.auth.updateUser({
      data: {
        display_name: fullName,
        full_name: fullName,
        given_name: given,
        family_name: family,
      },
    });
    if (data.user.id) {
      await sb
        .from("profiles")
        .update({
          display_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
    }
  }

  const user = toAuthUser(data.user);
  if (!user) throw new Error("تعذّر تسجيل الدخول بـ Apple");
  return {
    ...user,
    displayName: user.displayName || fullName || user.email,
  };
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
