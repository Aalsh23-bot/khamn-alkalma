import { getSupabase } from "@/lib/supabase/client";

let cached: { value: boolean; at: number } | null = null;
const TTL_MS = 60_000;

/** Server flag — default false. When false, hide packs UI entirely. */
export async function isHintPacksEnabled(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const sb = getSupabase();
  if (!sb) {
    cached = { value: false, at: Date.now() };
    return false;
  }
  try {
    const { data, error } = await sb.rpc("get_app_config_bool", {
      p_key: "hint_packs_enabled",
      p_default: false,
    });
    if (error) {
      cached = { value: false, at: Date.now() };
      return false;
    }
    const enabled = data === true;
    cached = { value: enabled, at: Date.now() };
    return enabled;
  } catch {
    cached = { value: false, at: Date.now() };
    return false;
  }
}

export function clearHintPacksFlagCache(): void {
  cached = null;
}
