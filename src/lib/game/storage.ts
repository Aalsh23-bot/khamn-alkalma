import type { LetterStatus } from "./evaluate";
import {
  buildStageOrder,
  isValidStageOrder,
  STAGE_COUNT,
  STAGE_ORDER_SCHEME,
} from "./words";

const VERSION = 3;

export type Mode = "daily" | "stages";
export type Screen = "home" | "stages" | "play";

export interface RoundSave {
  version: number;
  dateKey: string;
  answer: string;
  guesses: string[];
  evaluations: LetterStatus[][];
  current: string;
  status: "playing" | "won" | "lost";
  hintUsed: boolean;
  hintedCols: number[];
  stageLevel?: number;
}

export interface StatsSave {
  version: number;
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
  lastDailyDate: string | null;
  lastDailyWon: boolean;
}

export interface SettingsSave {
  version: number;
  hardMode: boolean;
  sound: boolean;
  seenHelp: boolean;
}

export interface StagesSave {
  version: number;
  unlocked: number;
  completed: Record<string, { guesses: number }>;
  /** Random unique answer-index order for stages 1..STAGE_COUNT */
  order: number[];
  /** progressive-v1 = easy intro then mixed difficulties */
  orderScheme?: string;
}

export const defaultStats = (): StatsSave => ({
  version: VERSION,
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0],
  lastDailyDate: null,
  lastDailyWon: false,
});

export const defaultSettings = (): SettingsSave => ({
  version: VERSION,
  hardMode: false,
  sound: true,
  seenHelp: false,
});

export const defaultStages = (): StagesSave => ({
  version: VERSION,
  unlocked: 1,
  completed: {},
  order: buildStageOrder(STAGE_COUNT),
  orderScheme: STAGE_ORDER_SCHEME,
});

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T & { version?: number };
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export function loadRound(mode: Mode): RoundSave | null {
  const data = read<RoundSave | null>(`khamsa:${mode}`, null);
  if (!data || data.version !== VERSION) return null;
  return data;
}

export function saveRound(mode: Mode, round: RoundSave) {
  write(`khamsa:${mode}`, { ...round, version: VERSION });
}

export function loadStats(): StatsSave {
  return read("khamsa:stats", defaultStats());
}

export function saveStats(stats: StatsSave) {
  write("khamsa:stats", { ...stats, version: VERSION });
}

export function loadSettings(): SettingsSave {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem("khamsa:settings");
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as SettingsSave;
    if (parsed.version !== VERSION) {
      return {
        ...defaultSettings(),
        hardMode: !!parsed.hardMode,
        sound: parsed.sound !== false,
        seenHelp: false,
      };
    }
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: SettingsSave) {
  write("khamsa:settings", { ...settings, version: VERSION });
}

export function loadStages(): StagesSave {
  const make = () => defaultStages();

  if (typeof window === "undefined") return make();

  try {
    const raw = localStorage.getItem("khamsa:stages");
    if (!raw) {
      const fresh = make();
      saveStages(fresh);
      return fresh;
    }

    const parsed = JSON.parse(raw) as Partial<StagesSave>;
    if (parsed.version !== VERSION) {
      const fresh = make();
      saveStages(fresh);
      return fresh;
    }

    const needsOrder =
      !isValidStageOrder(parsed.order, STAGE_COUNT) ||
      parsed.orderScheme !== STAGE_ORDER_SCHEME;
    const order = needsOrder ? buildStageOrder(STAGE_COUNT) : (parsed.order as number[]);
    const stages: StagesSave = {
      version: VERSION,
      unlocked: Math.min(STAGE_COUNT, Math.max(1, parsed.unlocked || 1)),
      completed: parsed.completed ?? {},
      order,
      orderScheme: STAGE_ORDER_SCHEME,
    };

    if (needsOrder) saveStages(stages);
    return stages;
  } catch {
    const fresh = make();
    saveStages(fresh);
    return fresh;
  }
}

export function saveStages(stages: StagesSave) {
  const order = isValidStageOrder(stages.order, STAGE_COUNT)
    ? stages.order
    : buildStageOrder(STAGE_COUNT);
  write("khamsa:stages", {
    ...stages,
    version: VERSION,
    unlocked: Math.min(STAGE_COUNT, Math.max(1, stages.unlocked || 1)),
    order,
    orderScheme: STAGE_ORDER_SCHEME,
  });
}

export function completedCount(stages: StagesSave): number {
  return Object.keys(stages.completed).length;
}
