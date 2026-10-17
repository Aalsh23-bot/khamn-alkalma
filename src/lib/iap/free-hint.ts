import { getSupabase } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/auth";
import { saveHintBalance } from "@/lib/game/hint-economy";

export type FreeHintStatus = {
  available: boolean;
  nextAt: string | null;
  kuwaitDate: string | null;
  balance: number | null;
  serverNow: string | null;
  loadError: boolean;
};

function parseStatus(raw: unknown): FreeHintStatus {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    available: data.available === true,
    nextAt: typeof data.next_at === "string" ? data.next_at : null,
    kuwaitDate: typeof data.kuwait_date === "string" ? data.kuwait_date : null,
    balance:
      typeof data.balance === "number"
        ? data.balance
        : data.balance != null
          ? Number(data.balance)
          : null,
    serverNow: typeof data.server_now === "string" ? data.server_now : null,
    loadError: false,
  };
}

export async function fetchFreeHintStatus(): Promise<FreeHintStatus> {
  const empty = (): FreeHintStatus => ({
    available: false,
    nextAt: null,
    kuwaitDate: null,
    balance: null,
    serverNow: null,
    loadError: true,
  });
  const sb = getSupabase();
  if (!sb) return empty();
  try {
    await ensureAuthSession();
    const { data, error } = await sb.rpc("get_free_hint_status");
    if (error) return empty();
    const parsed = parseStatus(data);
    const payload = data as { ok?: boolean } | null;
    if (payload && payload.ok === false) {
      // Authenticated path may still return ok:false for not_authenticated race.
      return { ...parsed, loadError: true };
    }
    return parsed;
  } catch {
    return empty();
  }
}

export async function claimFreeDailyHint(): Promise<
  | { ok: true; balance: number; nextAt: string | null; serverNow: string | null }
  | {
      ok: false;
      error: string;
      nextAt?: string | null;
      balance?: number;
      serverNow?: string | null;
    }
> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "الخدمة غير متاحة" };
  try {
    await ensureAuthSession();
    const { data, error } = await sb.rpc("claim_free_daily_hint");
    if (error) return { ok: false, error: error.message };
    const payload = data as Record<string, unknown> | null;
    const serverNow =
      typeof payload?.server_now === "string" ? payload.server_now : null;
    if (!payload || payload.ok !== true) {
      const nextAt =
        typeof payload?.next_at === "string" ? payload.next_at : null;
      const bal = Number(payload?.balance);
      if (payload?.error === "already_claimed") {
        return {
          ok: false,
          error: "أخذت التلميح المجاني لهذا اليوم",
          nextAt,
          balance: Number.isFinite(bal) ? bal : undefined,
          serverNow,
        };
      }
      return {
        ok: false,
        error: String(payload?.error || "تعذّر أخذ التلميح المجاني"),
        nextAt,
        serverNow,
      };
    }
    const balance = Number(payload.balance);
    if (!Number.isFinite(balance)) {
      return { ok: false, error: "رد غير صالح من الخادم" };
    }
    saveHintBalance(balance);
    return {
      ok: true,
      balance,
      nextAt: typeof payload.next_at === "string" ? payload.next_at : null,
      serverNow,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "تعذّر أخذ التلميح المجاني",
    };
  }
}
