/**
 * Client-side Supabase env (Vite `VITE_*` only).
 * Never put the service_role key here — Edge Functions / server only.
 */

export function getSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const trimmed = url?.trim();
  return trimmed || undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const trimmed = key?.trim();
  return trimmed || undefined;
}

/** True when both public Supabase vars are set (real project, not placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;
  if (url.includes("YOUR_PROJECT_REF")) return false;
  if (key.includes("your_anon_key")) return false;
  return true;
}
