import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getSession,
  signInWithAppleNative,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  toAuthUser,
  type AuthUser,
} from "./auth";
import { getSupabase, isSupabaseConfigured } from "./index";

export function useSupabaseAuth() {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const sb = getSupabase();
    if (!sb) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const s = await getSession();
        if (cancelled) return;
        setSession(s);
        setUser(toAuthUser(s?.user));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "فشل تحميل الجلسة");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(toAuthUser(next?.user ?? null));
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      const msg =
        e instanceof Error
          ? mapAuthError(e.message)
          : "حدث خطأ غير متوقع";
      setError(msg);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    configured,
    ready,
    busy,
    error,
    session,
    user,
    clearError: () => setError(null),
    signIn: (email: string, password: string) =>
      run(() => signInWithEmail(email, password)),
    signUp: (email: string, password: string, displayName?: string) =>
      run(() => signUpWithEmail(email, password, displayName)),
    signInWithApple: () => run(() => signInWithAppleNative()),
    signOut: () => run(() => signOut()),
  };
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "البريد أو كلمة المرور غير صحيحة";
  if (m.includes("user already registered")) return "هذا البريد مسجّل مسبقاً";
  if (m.includes("password")) return "كلمة المرور ضعيفة (٦ أحرف على الأقل)";
  if (m.includes("email")) return "تحقق من صيغة البريد الإلكتروني";
  if (m.includes("network") || m.includes("fetch")) return "تحقق من الاتصال بالإنترنت";
  if (m.includes("cancel") || m.includes("1001")) return "تم إلغاء تسجيل الدخول";
  if (m.includes("apple")) return message;
  return message;
}
