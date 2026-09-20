import { requireSupabase, getSupabase, isSupabaseConfigured } from "./index";

export type DailyMeta = {
  date_key: string;
  puzzle_number: number;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  wins: number;
  played: number;
  current_streak: number;
  max_streak: number;
};

export type SubmitDailyResult = {
  id: string;
  won: boolean;
  guesses: number;
  date_key: string | null;
};

/** Fetch today's puzzle number (no answer leaked). */
export async function fetchDailyMeta(
  dateKey?: string,
): Promise<DailyMeta | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_daily_meta", {
    p_date: dateKey ?? undefined,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as DailyMeta) ?? null;
}

/**
 * Submit a finished daily round for server verification + leaderboard.
 * Requires an authenticated session. Returns null if offline / not configured.
 */
export async function submitDailyResult(input: {
  guesses: string[];
  won: boolean;
  hardMode?: boolean;
  durationMs?: number;
}): Promise<SubmitDailyResult | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("submit_daily_result", {
    p_guesses: input.guesses,
    p_won: input.won,
    p_hard_mode: input.hardMode ?? false,
    p_duration_ms: input.durationMs ?? null,
  });
  if (error) throw error;
  return data as SubmitDailyResult;
}

export async function createServerChallenge(): Promise<{
  code: string;
  word: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("create_friend_challenge");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { code: string; word: string };
}

export async function fetchLeaderboard(
  limit = 20,
): Promise<LeaderboardRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("get_leaderboard", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data as LeaderboardRow[]) ?? [];
}
