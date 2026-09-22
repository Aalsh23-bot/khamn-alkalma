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

export type ChallengeLobby = {
  code: string;
  status: "waiting" | "active" | "done" | "expired";
  role: "host" | "guest";
  expires_at: string;
  started_at: string | null;
  word: string | null;
  opponent_name: string | null;
  host_finished: boolean;
  guest_finished: boolean;
  host_guesses: number | null;
  host_won: boolean | null;
  guest_guesses: number | null;
  guest_won: boolean | null;
};

function asLobby(data: unknown): ChallengeLobby {
  const row = (Array.isArray(data) ? data[0] : data) as ChallengeLobby;
  return row;
}

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

/** Create online challenge room (code only; word after opponent joins). */
export async function createServerChallenge(): Promise<{
  code: string;
  expires_at: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("create_friend_challenge");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { code: string; expires_at: string };
}

/** Guest joins with code — match starts for both. */
export async function joinFriendChallenge(code: string): Promise<{
  code: string;
  word: string;
  role: "host" | "guest";
  started_at: string | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("join_friend_challenge", {
    p_code: code.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as {
    code: string;
    word: string;
    role: "host" | "guest";
    started_at: string | null;
  };
}

/** Host/guest poll lobby + results. */
export async function fetchChallengeLobby(
  code: string,
): Promise<ChallengeLobby | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("get_challenge_lobby", {
    p_code: code.trim(),
  });
  if (error) throw error;
  return asLobby(data);
}

export async function submitChallengeResult(input: {
  code: string;
  guesses: string[];
  won: boolean;
}): Promise<ChallengeLobby | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await sb.rpc("submit_challenge_result", {
    p_code: input.code.trim(),
    p_guesses: input.guesses,
    p_won: input.won,
  });
  if (error) throw error;
  return asLobby(data);
}

/** Resolve a server-stored challenge code to its answer word (participants only). */
export async function fetchFriendChallenge(
  code: string,
): Promise<{ code: string; word: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_friend_challenge", {
    p_code: code,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as { code: string; word: string }) ?? null;
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

/** Helpers for comparing match sides from lobby payload. */
export function challengeSideForRole(
  lobby: ChallengeLobby,
  role: "host" | "guest",
): { finished: boolean; guesses: number | null; won: boolean | null } {
  if (role === "host") {
    return {
      finished: lobby.host_finished,
      guesses: lobby.host_guesses,
      won: lobby.host_won,
    };
  }
  return {
    finished: lobby.guest_finished,
    guesses: lobby.guest_guesses,
    won: lobby.guest_won,
  };
}

export function challengeOutcome(
  me: { finished: boolean; guesses: number | null; won: boolean | null },
  opp: { finished: boolean; guesses: number | null; won: boolean | null },
): "win" | "loss" | "draw" | "pending" {
  if (!me.finished || !opp.finished) return "pending";
  if (me.won && !opp.won) return "win";
  if (!me.won && opp.won) return "loss";
  if (me.won && opp.won) {
    if ((me.guesses ?? 99) < (opp.guesses ?? 99)) return "win";
    if ((me.guesses ?? 99) > (opp.guesses ?? 99)) return "loss";
    return "draw";
  }
  // both lost
  return "draw";
}
