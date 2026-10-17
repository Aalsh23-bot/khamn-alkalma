import { create } from "zustand";
import { evaluate, hardModeError } from "./evaluate";
import { MAX_GUESSES, WORD_LENGTH, normalizeWord } from "./normalize";
import { localDateKey, puzzleNumber } from "./daily";
import { displayWord, isValidGuess, STAGE_COUNT } from "./words";
import {
  clearChallengeCodeFromUrl,
  readChallengeCodeFromLocation,
} from "./challenge";
import {
  loadAchievements,
  loadChallengeStats,
  loadRound,
  loadSettings,
  loadStages,
  loadStats,
  saveAchievements,
  saveSettings,
  saveStages,
  saveStats,
} from "./storage";
import * as sfx from "./audio";
import {
  challengeOutcome,
  challengeSideForRole,
  createServerChallenge,
  fetchChallengeLobby,
  fetchLexiconSnapshot,
  joinFriendChallenge,
  rematchFriendChallenge,
  submitChallengeResult,
  submitDailyResult,
} from "@/lib/supabase/api";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  loadCachedLexicon,
  saveCachedLexicon,
  shouldRefreshLexicon,
} from "./lexicon-sync";
import { MAX_HINTS_PER_ROUND } from "./store-constants";
import {
  freshChallenge,
  freshDaily,
  freshStage,
  roundFromSave,
} from "./store-rounds";
import { consumePurchasedHint } from "./hint-economy";
import { trackEvent } from "@/lib/analytics";
import { unlockAchievements } from "./store-achievements";
import {
  applyLobbyToStore,
  beginOnlineMatch,
  mapChallengeError,
} from "./store-challenge-flow";
import { persist } from "./store-persist";
import type { GameStore } from "./store-types";

export { MAX_HINTS_PER_ROUND } from "./store-constants";
export type { Mode, Screen, GameStore } from "./store-types";

function syncDailyResult(guesses: string[], won: boolean, hardMode: boolean) {
  void submitDailyResult({ guesses, won, hardMode }).catch(() => {
    /* offline / not signed in / server reject — local play still works */
  });
}

function syncLexiconInBackground() {
  loadCachedLexicon();
  if (!isSupabaseConfigured()) return;
  if (!shouldRefreshLexicon()) return;
  void (async () => {
    try {
      const snap = await fetchLexiconSnapshot();
      if (snap?.words?.length) saveCachedLexicon(snap);
    } catch {
      /* keep cache / bundled */
    }
  })();
}

export const useGame = create<GameStore>((set, get) => ({
  hydrated: false,
  screen: "home",
  ...freshDaily(),
  toast: null,
  settings: loadSettings(),
  stats: loadStats(),
  stages: loadStages(),
  achievements: loadAchievements(),
  challengeStats: loadChallengeStats(),
  challengeRole: null,
  challengeExpiresAt: null,
  challengeLobby: null,
  modal: null,

  hydrate: () => {
    if (get().hydrated) return;
    const settings = loadSettings();
    const stats = loadStats();
    const stages = loadStages();
    const achievements = loadAchievements();
    const challengeStats = loadChallengeStats();
    sfx.setSoundEnabled(settings.sound);
    syncLexiconInBackground();

    const inviteCode = readChallengeCodeFromLocation();
    if (inviteCode) {
      clearChallengeCodeFromUrl();
      set({
        hydrated: true,
        settings,
        stats,
        stages,
        achievements,
        challengeStats,
        screen: "home",
        modal: null,
        toast: null,
        revealing: false,
        shake: false,
      });
      trackEvent("app_open", { via: "invite" });
      get().joinChallengeWithCode(inviteCode);
      return;
    }

    const firstRunHelp = !settings.seenHelp;
    set({
      hydrated: true,
      screen: "home",
      settings,
      stats,
      stages,
      achievements,
      challengeStats,
      modal: achievements.pending.length
        ? "badge"
        : firstRunHelp
          ? "help"
          : null,
      toast: null,
      revealing: false,
      shake: false,
    });
    trackEvent("app_open", {});
    void import("@/lib/iap/purchases")
      .then(async (m) => {
        // initPurchases no-ops when hint_packs_enabled is false.
        await m.initPurchases();
        await m.syncHintBalanceFromServer();
      })
      .catch(() => {
        /* IAP optional until keys/products are live */
      });
  },

  goHome: () => {
    commitPendingDailyLoss(get);
    persist(get);
    const pending = get().achievements.pending.length > 0;
    set({
      screen: "home",
      modal: pending ? "badge" : null,
      toast: null,
      revealing: false,
      shake: false,
    });
  },

  openStages: () => {
    commitPendingDailyLoss(get);
    persist(get);
    set({ screen: "stages", modal: null, toast: null, revealing: false, shake: false });
  },

  startDaily: () => {
    commitPendingDailyLoss(get);
    persist(get);
    const saved = loadRound("daily");
    const today = localDateKey();
    if (saved && saved.dateKey === today && saved.answer) {
      set({
        screen: "play",
        ...roundFromSave(saved, {
          mode: "daily",
          dateKey: today,
          puzzleNum: puzzleNumber(today),
          stageLevel: 0,
        }),
        modal: saved.status !== "playing" ? "result" : null,
        toast: null,
        revealing: false,
      });
      trackEvent("game_start", { mode: "daily", resumed: true });
      return;
    }
    set({ screen: "play", ...freshDaily(), modal: null, toast: null });
    trackEvent("game_start", { mode: "daily", resumed: false });
    persist(get);
  },

  startChallenge: (code) => {
    commitPendingDailyLoss(get);
    persist(get);
    if (code) {
      get().joinChallengeWithCode(code);
      return;
    }
    const saved = loadRound("challenge");
    if (saved?.answer && saved.status === "playing" && saved.challengeCode) {
      set({
        screen: "play",
        ...roundFromSave(saved, {
          mode: "challenge",
          dateKey: saved.dateKey,
          puzzleNum: 0,
          stageLevel: 0,
          challengeCode: saved.challengeCode,
        }),
        modal: null,
        toast: null,
        revealing: false,
      });
      get().refreshChallengeLobby();
      return;
    }
    get().openChallengeHub();
  },

  openChallengeHub: () => {
    if (!isSupabaseConfigured()) {
      set({ toast: "التحدّي الأونلاين يحتاج اتصال وإعداد Supabase", modal: null });
      return;
    }
    set({ modal: "challengeHub", toast: null });
  },

  createOnlineChallenge: () => {
    get().newChallenge();
  },

  joinChallengeWithCode: (raw) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      set({ toast: "أدخل كود التحدّي" });
      return;
    }
    void (async () => {
      try {
        const joined = await joinFriendChallenge(code);
        if (!joined?.word) {
          set({ toast: "سجّل الدخول ثم أدخل الكود", modal: "auth" });
          return;
        }
        const lobby = await fetchChallengeLobby(joined.code).catch(() => null);
        beginOnlineMatch(
          set,
          get,
          joined.word,
          joined.code,
          joined.role,
          lobby,
        );
      } catch (e) {
        set({
          toast: mapChallengeError(e instanceof Error ? e.message : ""),
          modal: "challengeJoin",
        });
      }
    })();
  },

  refreshChallengeLobby: () => {
    const code = get().challengeCode;
    if (!code) return;
    void (async () => {
      try {
        const lobby = await fetchChallengeLobby(code);
        if (lobby) applyLobbyToStore(set, get, lobby);
      } catch (e) {
        if (get().modal === "challengeInvite") {
          set({
            toast: mapChallengeError(e instanceof Error ? e.message : ""),
          });
        }
      }
    })();
  },

  newChallenge: () => {
    commitPendingDailyLoss(get);
    persist(get);
    void (async () => {
      try {
        if (!isSupabaseConfigured()) {
          set({ toast: "التحدّي الأونلاين يحتاج إعداد Supabase", modal: null });
          return;
        }
        const server = await createServerChallenge();
        if (!server?.code) {
          set({ toast: "سجّل الدخول لإنشاء تحدّي", modal: "auth" });
          return;
        }
        set({
          screen: "home",
          challengeCode: server.code,
          challengeRole: "host",
          challengeExpiresAt: server.expires_at,
          challengeLobby: null,
          modal: "challengeInvite",
          toast: null,
        });
      } catch (e) {
        set({
          toast: mapChallengeError(e instanceof Error ? e.message : ""),
          modal: "auth",
        });
      }
    })();
  },

  rematchChallenge: () => {
    const code = get().challengeCode;
    if (!code) {
      get().newChallenge();
      return;
    }
    void (async () => {
      try {
        const lobby = await rematchFriendChallenge(code);
        if (!lobby?.word) {
          set({ toast: "تعذّرت إعادة التحدّي", modal: "result" });
          return;
        }
        beginOnlineMatch(set, get, lobby.word, lobby.code, lobby.role, lobby);
        set({ toast: "سلسلة جديدة — أول واحد يوصل ٣ يفوز" });
      } catch (e) {
        set({
          toast: mapChallengeError(e instanceof Error ? e.message : ""),
          modal: "result",
        });
      }
    })();
  },

  startStage: (level) => {
    commitPendingDailyLoss(get);
    persist(get);
    const max = get().stages.unlocked;
    if (level < 1 || level > Math.min(max, STAGE_COUNT)) return;
    const saved = loadRound("stages");
    if (
      saved &&
      saved.stageLevel === level &&
      saved.answer &&
      saved.status === "playing"
    ) {
      set({
        screen: "play",
        ...roundFromSave(saved, {
          mode: "stages",
          dateKey: saved.dateKey,
          puzzleNum: level,
          stageLevel: level,
        }),
        modal: null,
        toast: null,
        revealing: false,
      });
      trackEvent("game_start", { mode: "stages", stage: level, resumed: true });
      return;
    }
    set({
      screen: "play",
      ...freshStage(level, get().stages.order),
      modal: null,
      toast: null,
    });
    trackEvent("game_start", { mode: "stages", stage: level, resumed: false });
    persist(get);
  },

  nextStage: () => {
    const next = Math.min(get().stageLevel + 1, STAGE_COUNT);
    get().startStage(next);
  },

  retryStage: () => {
    const level = get().stageLevel;
    commitPendingDailyLoss(get);
    set({
      screen: "play",
      ...freshStage(level, get().stages.order),
      modal: null,
      toast: null,
    });
    persist(get);
  },

  reviveAfterLoss: () => {
    const s = get();
    if (s.status !== "lost" || s.guesses.length === 0) return;
    set({
      status: "playing",
      guesses: s.guesses.slice(0, -1),
      evaluations: s.evaluations.slice(0, -1),
      current: "",
      revealing: false,
      shake: false,
      modal: null,
      toast: "فرصة إضافية — حاول من جديد",
    });
    persist(get);
  },

  retryStageNewWord: () => {
    const s = get();
    if (s.mode !== "stages" || s.stageLevel < 1) return;
    commitPendingDailyLoss(get);
    const level = s.stageLevel;
    const order = s.stages.order.slice();
    const currentIdx = level - 1;
    const candidates: number[] = [];
    for (let i = 0; i < order.length; i++) {
      if (i === currentIdx) continue;
      const otherLevel = i + 1;
      // Prefer swapping with stages that are not completed yet.
      if (!s.stages.completed[String(otherLevel)]) candidates.push(i);
    }
    if (candidates.length === 0) {
      for (let i = 0; i < order.length; i++) {
        if (i !== currentIdx) candidates.push(i);
      }
    }
    if (candidates.length > 0) {
      const j = candidates[Math.floor(Math.random() * candidates.length)]!;
      const tmp = order[currentIdx]!;
      order[currentIdx] = order[j]!;
      order[j] = tmp;
    }
    const stages = { ...s.stages, order };
    saveStages(stages);
    set({
      stages,
      screen: "play",
      ...freshStage(level, order),
      modal: null,
      toast: "كلمة جديدة لهذه المرحلة",
    });
    persist(get);
  },

  typeLetter: (ch) => {
    const s = get();
    if (!s.hydrated || s.screen !== "play" || s.status !== "playing" || s.revealing)
      return;
    const letter = normalizeWord(ch);
    if (!letter) return;
    if (s.current.length + letter.length > WORD_LENGTH) return;
    set({ current: s.current + letter, shake: false });
    sfx.sfxType();
  },

  backspace: () => {
    const s = get();
    if (!s.hydrated || s.screen !== "play" || s.status !== "playing" || s.revealing)
      return;
    if (!s.current) return;
    set({ current: s.current.slice(0, -1) });
    sfx.sfxDelete();
  },

  submit: () => {
    const s = get();
    if (!s.hydrated || s.screen !== "play" || s.status !== "playing" || s.revealing)
      return;
    if (s.current.length < WORD_LENGTH) {
      set({ shake: true, toast: "عدد الأحرف غير مكتمل" });
      sfx.sfxError();
      return;
    }
    const guess = s.current;
    if (!isValidGuess(guess)) {
      set({ shake: true, toast: "ليست في قائمة الكلمات" });
      sfx.sfxError();
      return;
    }
    if (s.settings.hardMode) {
      const err = hardModeError(guess, s.guesses, s.evaluations);
      if (err) {
        set({ shake: true, toast: err });
        sfx.sfxError();
        return;
      }
    }
    const ev = evaluate(guess, s.answer);
    set({
      guesses: [...s.guesses, guess],
      evaluations: [...s.evaluations, ev],
      current: "",
      revealing: true,
      shake: false,
      toast: null,
      hintAwaitingGuess: false,
    });
    persist(get);
  },

  finishReveal: () => {
    const s = get();
    if (!s.revealing) return;
    set({ revealing: false });
    try {
      const last = s.guesses[s.guesses.length - 1];
      const won = last === s.answer;
      const lost = !won && s.guesses.length >= MAX_GUESSES;
      if (s.status !== "playing") return;
      let stats = s.stats;
      // Record daily wins immediately. Losses wait so a rewarded revive can undo the last guess
      // without corrupting streak/played counts.
      if (won && s.mode === "daily" && stats.lastDailyDate !== s.dateKey) {
        const dist = stats.distribution.slice();
        dist[s.guesses.length - 1] = (dist[s.guesses.length - 1] ?? 0) + 1;
        const currentStreak =
          stats.lastDailyDate && dayDiff(stats.lastDailyDate, s.dateKey) === 1
            ? stats.currentStreak + 1
            : 1;
        const dailyWins = { ...stats.dailyWins, [s.dateKey]: true as const };
        stats = {
          ...stats,
          played: stats.played + 1,
          wins: stats.wins + 1,
          currentStreak,
          maxStreak: Math.max(stats.maxStreak, currentStreak),
          distribution: dist,
          lastDailyDate: s.dateKey,
          lastDailyWon: true,
          dailyWins,
        };
        saveStats(stats);
        syncDailyResult(s.guesses, true, s.settings.hardMode);
      }
      let stages = s.stages;
      if ((won || lost) && s.mode === "stages" && won) {
        const key = String(s.stageLevel);
        const prev = stages.completed[key];
        const guesses = s.guesses.length;
        const best = prev ? Math.min(prev.guesses, guesses) : guesses;
        stages = {
          ...stages,
          completed: { ...stages.completed, [key]: { guesses: best } },
          unlocked: Math.min(STAGE_COUNT, Math.max(stages.unlocked, s.stageLevel + 1)),
        };
        saveStages(stages);
      }
      if (won) sfx.sfxWin();
      else if (lost) sfx.sfxLose();
      const status = won ? "won" : lost ? "lost" : "playing";

      let achievements = s.achievements;
      if ((won || lost) && s.mode !== "challenge") {
        achievements = unlockAchievements(s.achievements, {
          stats,
          stages,
          challengeStats: s.challengeStats,
          won: !!won,
          guessCount: s.guesses.length,
          stageLevel: s.mode === "stages" ? Math.max(s.stageLevel, stages.unlocked) : stages.unlocked,
          mode: s.mode,
        });
      }

      set({
        status,
        stats,
        stages,
        achievements,
        modal: won || lost ? "result" : null,
      });
      persist(get);

      if ((won || lost) && s.mode === "challenge" && s.challengeCode) {
        void (async () => {
          try {
            const lobby = await submitChallengeResult({
              code: s.challengeCode!,
              guesses: get().guesses,
              won: !!won,
            });
            if (lobby) applyLobbyToStore(set, get, lobby);
          } catch {
            /* keep local result UI; lobby poll may retry */
          }
        })();
      }
    } catch {
      set({ revealing: false });
    }
  },

  useHint: (source: "balance" | "ad" = "balance") => {
    const s = get();
    if (
      !s.hydrated ||
      s.screen !== "play" ||
      s.status !== "playing" ||
      s.revealing ||
      s.hintCount >= MAX_HINTS_PER_ROUND ||
      s.hintAwaitingGuess
    )
      return;
    if (s.mode === "daily") {
      const saved = loadRound("daily");
      if (
        saved?.dateKey === s.dateKey &&
        (saved.hintCount ?? (saved.hintUsed ? 1 : 0)) >= MAX_HINTS_PER_ROUND
      ) {
        return;
      }
    }
    // Round hints come from balance or rewarded ad (caller chooses). Free daily
    // hint is claimed in the shop and added to balance (Kuwait midnight).
    if (source === "balance") {
      if (!consumePurchasedHint()) return;
    }

    const known = new Set<number>();
    for (let g = 0; g < s.guesses.length; g++) {
      const ev = s.evaluations[g] ?? [];
      ev.forEach((st, i) => {
        if (st === "correct") known.add(i);
      });
    }
    for (const c of s.hintedCols) known.add(c);
    const unknown: number[] = [];
    for (let i = 0; i < WORD_LENGTH; i++) if (!known.has(i)) unknown.push(i);
    if (unknown.length === 0) {
      set({ toast: "كل الحروف مكشوفة" });
      return;
    }
    const col = unknown[0]!;
    const hintCount = s.hintCount + 1;
    set({
      hintCount,
      hintUsed: hintCount >= MAX_HINTS_PER_ROUND,
      hintAwaitingGuess: true,
      hintedCols: [...s.hintedCols, col],
      toast: `🎉 حصلت على تلميح · الحرف في الموضع ${col + 1} هو «${s.answer[col]}»`,
    });
    trackEvent("hint_used", {
      kind: source,
      mode: s.mode,
      stage: s.mode === "stages" ? s.stageLevel : null,
    });
    persist(get);
  },

  setToast: (msg) => set({ toast: msg }),
  setModal: (modal) => {
    if (modal === null && get().modal === "help" && !get().settings.seenHelp) {
      const settings = { ...get().settings, seenHelp: true };
      saveSettings(settings);
      set({ modal, settings });
      return;
    }
    // When closing result, surface any pending badge unlocks.
    if (modal === null && get().modal === "result" && get().achievements.pending.length) {
      set({ modal: "badge" });
      return;
    }
    set({ modal });
  },
  dismissBadge: () => {
    const a = get().achievements;
    if (a.pending.length === 0) {
      set({ modal: null });
      return;
    }
    const pending = a.pending.slice(1);
    const next = { ...a, pending };
    saveAchievements(next);
    set({
      achievements: next,
      modal: pending.length ? "badge" : null,
    });
  },
  setHardMode: (on) => {
    const settings = { ...get().settings, hardMode: on };
    saveSettings(settings);
    set({ settings });
  },
  setSound: (on) => {
    sfx.setSoundEnabled(on);
    const settings = { ...get().settings, sound: on };
    saveSettings(settings);
    set({ settings });
  },
}));


/** Finalize a daily loss only when the player leaves without reviving. */
function commitPendingDailyLoss(get: () => GameStore) {
  const s = get();
  if (s.mode !== "daily" || s.status !== "lost") return;
  const stats = s.stats;
  if (stats.lastDailyDate === s.dateKey) return;
  const next = {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins,
    currentStreak: 0,
    maxStreak: stats.maxStreak,
    distribution: stats.distribution.slice(),
    lastDailyDate: s.dateKey,
    lastDailyWon: false,
    dailyWins: { ...(stats.dailyWins ?? {}) },
  };
  saveStats(next);
  useGame.setState({ stats: next });
  syncDailyResult(s.guesses, false, s.settings.hardMode);
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, (am ?? 1) - 1, ad);
  const db = Date.UTC(by, (bm ?? 1) - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

export function solutionLabel(answer: string): string {
  return displayWord(answer);
}
