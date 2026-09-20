import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./env";
import type { Database } from "./types";

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

/**
 * Browser / Capacitor Supabase client (anon key + RLS).
 * Returns `null` when env is missing so local play still works offline.
 */
export function getSupabase(): AppSupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  const url = getSupabaseUrl()!;
  const anonKey = getSupabaseAnonKey()!;

  client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof localStorage !== "undefined" ? localStorage : undefined,
    },
  });

  return client;
}

/** Throws if Supabase is not configured — use for online-only features. */
export function requireSupabase(): AppSupabaseClient {
  const sb = getSupabase();
  if (!sb) {
    throw new Error(
      "Supabase غير مضبوط. ضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env",
    );
  }
  return sb;
}
