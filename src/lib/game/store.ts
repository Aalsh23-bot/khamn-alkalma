import { create } from "zustand";
import {
  evaluate,
  hardModeError,
  type LetterStatus,
} from "./evaluate";
import { MAX_GUESSES, WORD_LENGTH, normalizeWord } from "./normalize";
import { dailyAnswer, localDateKey, puzzleNumber } from "./daily";
import { displayWord, isValidGuess, stageAnswer, STAGE_COUNT } from "./words";
import {
  loadRound,
  loadSettings,
  loadStages,
  loadStats,
  saveRound,
  saveSettings,
  saveStages,
  saveStats,
  type Mode,
  type Screen,
  type SettingsSave,
  type StagesSave,
  type StatsSave,
} from "./storage";
import * as sfx from "./audio";

export type { Mode, Screen };

export interface GameStore {
  hydrated: boolean;
  screen: Screen;
  mode: Mode;
  stageLevel: number;
  dateKey: string;
  puzzleNum: number;
  answer: string;
  guesses: string[];
  evaluations: LetterStatus[][];
  current: string;
  status: "playing" | "won" | "lost";
  hintUsed: boolean;
  hintedCols: number[];
  revealing: boolean;
  shake: boolean;
  toast: string | null;
  settings: SettingsSave;
  stats: StatsSave;
  stages: StagesSave;
  modal: "help" | "stats" | "settings" | "result" | "install" | "privacy" | null;
  hydrate: () => void;
  goHome: () => void;
  openStages: () => void;
  startDaily: () => void;
  startStage: (level: number) => void;
  nextStage: () => void;
  retryStage: () => void;
  /** After a loss: undo last guess (call only after rewarded ad). */
  reviveAfterLoss: () => void;
  /** After a loss on stages: restart level with a different word. */
  retryStageNewWord: () => void;
  typeLetter: (ch: string) => void;
  backspace: () => void;
  submit: () => void;
  finishReveal: () => void;
  useHint: () => void;
  setToast: (msg: string | null) => void;
  setModal: (modal: GameStore["modal"]) => void;
  setHardMode: (on: boolean) => void;
  setSound: (on: boolean) => void;
}

function persist(get: () => GameStore) {
  try {
    const s = get();
    if (s.screen !== "play") return;
    saveRound(s.mode, {
      version: 3,
      dateKey: s.dateKey,
      answer: s.answer,
      guesses: s.guesses,
      evaluations: s.evaluations,
      current: s.current,
      status: s.status,
      hintUsed: s.hintUsed,
      hintedCols: s.hintedCols,
      stageLevel: s.stageLevel,
    });
  } catch {
    /* storage blocked */
  }
}

function freshDaily() {
  const dateKey = localDateKey();
  return {
    mode: "daily" as const,
    dateKey,
    puzzleNum: puzzleNumber(dateKey),
    stageLevel: 0,
    answer: dailyAnswer(dateKey),
    guesses: [] as string[],
    evaluations: [] as LetterStatus[][],
    current: "",
    status: "playing" as const,
    hintUsed: false,
    hintedCols: [] as number[],
    revealing: false,
    shake: false,
  };
}

function freshStage(level: number, order: number[]) {
  const dateKey = localDateKey();
  return {
    mode: "stages" as const,
    dateKey,
    puzzleNum: level,
    stageLevel: level,
    answer: stageAnswer(level, order),
    guesses: [] as string[],
    evaluations: [] as LetterStatus[][],
    current: "",
    status: "playing" as const,
    hintUsed: false,
    hintedCols: [] as number[],
    revealing: false,
    shake: false,
  };
}

function roundFromSave(
  saved: NonNullable<ReturnType<typeof loadRound>>,
  extras: { mode: Mode; puzzleNum: number; stageLevel: number; dateKey: string },
) {
  return {
    ...extras,
    answer: saved.answer,
    guesses: saved.guesses,
    evaluations: saved.evaluations,
    current: saved.status === "playing" ? saved.current : "",
    status: saved.status,
    hintUsed: saved.hintUsed,
    hintedCols: saved.hintedCols ?? [],
    revealing: false,
    shake: false,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  hydrated: false,
  screen: "home",
  ...freshDaily(),
  toast: null,
  settings: loadSettings(),
  stats: loadStats(),
  stages: loadStages(),
  modal: null,

  hydrate: () => {
    if (get().hydrated) return;
    const settings = loadSettings();
    const stats = loadStats();
    const stages = loadStages();
    sfx.setSoundEnabled(settings.sound);
    set({
      hydrated: true,
      screen: "home",
      settings,
      stats,
      stages,
      modal: null,
      toast: null,
      revealing: false,
      shake: false,
    });
  },

  goHome: () => {
    commitPendingDailyLoss(get);
    persist(get);
    set({ screen: "home", modal: null, toast: null, revealing: false, shake: false });
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
      return;
    }
    set({ screen: "play", ...freshDaily(), modal: null, toast: null });
    persist(get);
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
      return;
    }
    set({
      screen: "play",
      ...freshStage(level, get().stages.order),
      modal: null,
      toast: null,
    });
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
        stats = {
          ...stats,
          played: stats.played + 1,
          wins: stats.wins + 1,
          currentStreak,
          maxStreak: Math.max(stats.maxStreak, currentStreak),
          distribution: dist,
          lastDailyDate: s.dateKey,
          lastDailyWon: true,
        };
        saveStats(stats);
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
      set({
        status,
        stats,
        stages,
        modal: won || lost ? "result" : null,
      });
      persist(get);
    } catch {
      set({ revealing: false });
    }
  },

  useHint: () => {
    const s = get();
    if (
      !s.hydrated ||
      s.screen !== "play" ||
      s.status !== "playing" ||
      s.revealing ||
      s.hintUsed
    )
      return;
    if (s.mode === "daily") {
      const saved = loadRound("daily");
      if (saved?.hintUsed && saved.dateKey === s.dateKey) return;
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
    set({
      hintUsed: true,
      hintedCols: [...s.hintedCols, col],
      toast: `الحرف في الموضع ${col + 1} هو «${s.answer[col]}»`,
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
    set({ modal });
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
  };
  saveStats(next);
  useGame.setState({ stats: next });
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
