import {
  challengeOutcome,
  challengeSideForRole,
  type ChallengeLobby,
} from "@/lib/supabase/api";
import {
  applyChallengeMatchResult,
  saveChallengeStats,
} from "./storage";
import { freshChallenge } from "./store-rounds";
import { persist } from "./store-persist";
import { unlockAchievements } from "./store-achievements";
import type { GameStore } from "./store-types";

export function mapChallengeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not authenticated")) return "سجّل الدخول أولاً لتحدّي الأصدقاء";
  if (m.includes("expired")) return "انتهت صلاحية كود التحدّي";
  if (m.includes("not found")) return "كود التحدّي غير موجود";
  if (m.includes("full")) return "هذا التحدّي ممتلئ";
  if (m.includes("not joinable")) return "لا يمكن الانضمام لهذا التحدّي";
  if (m.includes("waiting for opponent")) return "بانتظار صديقك…";
  if (m.includes("series still in progress")) return "السلسلة لسا ما خلصت";
  if (m.includes("series already complete")) return "انتهت السلسلة — ابدأ إعادة أو تحدّياً جديداً";
  return message || "تعذّر إكمال التحدّي";
}

export function beginOnlineMatch(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  word: string,
  code: string,
  role: "host" | "guest",
  lobby?: ChallengeLobby | null,
) {
  const round = lobby?.round_number ?? 1;
  const maxRounds = lobby?.max_rounds ?? 5;
  const toast =
    round > 1
      ? `الجولة ${round} من ${maxRounds} — أول واحد يوصل ٣ يفوز`
      : "التحدّي بدأ — أفضل من ٥ · أول واحد يوصل ٣ يفوز";
  set({
    screen: "play",
    ...freshChallenge(word, code),
    challengeRole: role,
    challengeLobby: lobby ?? null,
    modal: null,
    toast,
    revealing: false,
    shake: false,
  });
  persist(get);
}

function seriesOutcomeForRole(
  lobby: ChallengeLobby,
): "win" | "loss" | "draw" | "pending" {
  if (!lobby.series_complete) return "pending";
  const mine = lobby.role === "host" ? lobby.host_score : lobby.guest_score;
  const theirs = lobby.role === "host" ? lobby.guest_score : lobby.host_score;
  if (mine > theirs) return "win";
  if (mine < theirs) return "loss";
  return "draw";
}

export function applyLobbyToStore(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  lobby: ChallengeLobby,
) {
  const s = get();
  const patch: Partial<GameStore> = {
    challengeLobby: lobby,
    challengeExpiresAt: lobby.expires_at,
    challengeRole: lobby.role,
    challengeCode: lobby.code,
  };

  const wordChanged =
    Boolean(lobby.word) &&
    s.mode === "challenge" &&
    Boolean(s.answer) &&
    lobby.word !== s.answer;

  const roundAdvanced =
    lobby.round_number > (s.challengeLobby?.round_number ?? 0);

  if (lobby.status === "active" && lobby.word) {
    const shouldStart =
      s.screen !== "play" ||
      s.mode !== "challenge" ||
      !s.answer ||
      wordChanged ||
      (roundAdvanced &&
        (s.status === "won" || s.status === "lost" || s.modal === "result"));
    if (shouldStart) {
      beginOnlineMatch(set, get, lobby.word, lobby.code, lobby.role, lobby);
      return;
    }
  }

  if (lobby.status === "expired" && s.modal === "challengeInvite") {
    set({
      ...patch,
      toast: "انتهت صلاحية الكود — أنشئ تحدّياً جديداً",
      modal: null,
      challengeCode: null,
      challengeRole: null,
    });
    return;
  }

  set(patch);

  if (lobby.status === "done" || (lobby.host_finished && lobby.guest_finished)) {
    const me = challengeSideForRole(lobby, lobby.role);
    const oppRole = lobby.role === "host" ? "guest" : "host";
    const opp = challengeSideForRole(lobby, oppRole);
    const roundOutcome = challengeOutcome(me, opp);
    if (roundOutcome === "pending") return;

    if (!lobby.series_complete) {
      set({ challengeLobby: lobby, modal: "result" });
      return;
    }

    const outcome = seriesOutcomeForRole(lobby);
    if (outcome === "pending") return;

    let challengeStats = get().challengeStats;
    const seriesKey = `khamsa:ch-series:${lobby.code}:${lobby.host_score}-${lobby.guest_score}:r${lobby.round_number}`;
    let counted = false;
    try {
      counted =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(seriesKey) === "1";
    } catch {
      counted = false;
    }
    if (!counted) {
      challengeStats = applyChallengeMatchResult(challengeStats, outcome);
      saveChallengeStats(challengeStats);
      try {
        sessionStorage.setItem(seriesKey, "1");
      } catch {
        /* ignore */
      }
    }

    const achievements = unlockAchievements(get().achievements, {
      stats: get().stats,
      stages: get().stages,
      challengeStats,
      won: outcome === "win",
      guessCount: me.guesses ?? get().guesses.length,
      stageLevel: 0,
      mode: "challenge",
      challengeOutcome: outcome,
    });
    set({
      challengeStats,
      achievements,
      challengeLobby: lobby,
      modal: "result",
    });
  }
}
