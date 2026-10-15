/**
 * Round factory helpers extracted from store.ts for maintainability.
 * Behavior must stay identical to the previous inline implementations.
 */
import type { LetterStatus } from "./evaluate";
import { dailyAnswer, localDateKey, puzzleNumber } from "./daily";
import { stageAnswer } from "./words";
import { loadRound, type Mode } from "./storage";
import { MAX_HINTS_PER_ROUND } from "./store-constants";

export function freshDaily() {
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
    hintCount: 0,
    hintAwaitingGuess: false,
    hintedCols: [] as number[],
    revealing: false,
    shake: false,
    challengeCode: null as string | null,
  };
}

export function freshStage(level: number, order: number[]) {
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
    hintCount: 0,
    hintAwaitingGuess: false,
    hintedCols: [] as number[],
    revealing: false,
    shake: false,
    challengeCode: null as string | null,
  };
}

export function freshChallenge(answer: string, code: string) {
  const dateKey = localDateKey();
  return {
    mode: "challenge" as const,
    dateKey,
    puzzleNum: 0,
    stageLevel: 0,
    answer,
    guesses: [] as string[],
    evaluations: [] as LetterStatus[][],
    current: "",
    status: "playing" as const,
    hintUsed: false,
    hintCount: 0,
    hintAwaitingGuess: false,
    hintedCols: [] as number[],
    revealing: false,
    shake: false,
    challengeCode: code,
  };
}

export function roundFromSave(
  saved: NonNullable<ReturnType<typeof loadRound>>,
  extras: {
    mode: Mode;
    puzzleNum: number;
    stageLevel: number;
    dateKey: string;
    challengeCode?: string | null;
  },
) {
  const hintCount = Math.min(
    MAX_HINTS_PER_ROUND,
    Math.max(0, saved.hintCount ?? (saved.hintUsed ? 1 : 0)),
  );
  return {
    ...extras,
    answer: saved.answer,
    guesses: saved.guesses,
    evaluations: saved.evaluations,
    current: saved.status === "playing" ? saved.current : "",
    status: saved.status,
    hintCount,
    hintUsed: hintCount >= MAX_HINTS_PER_ROUND,
    hintAwaitingGuess: Boolean(saved.hintAwaitingGuess),
    hintedCols: saved.hintedCols ?? [],
    revealing: false,
    shake: false,
    challengeCode: extras.challengeCode ?? saved.challengeCode ?? null,
  };
}
