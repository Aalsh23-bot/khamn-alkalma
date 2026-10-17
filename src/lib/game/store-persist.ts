import { saveRound } from "./storage";
import { MAX_HINTS_PER_ROUND } from "./store-constants";
import type { GameStore } from "./store-types";

export function persist(get: () => GameStore) {
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
      hintUsed: s.hintCount >= MAX_HINTS_PER_ROUND,
      hintCount: s.hintCount,
      hintAwaitingGuess: s.hintAwaitingGuess,
      hintedCols: s.hintedCols,
      stageLevel: s.stageLevel,
      challengeCode: s.challengeCode ?? undefined,
    });
  } catch {
    /* storage blocked */
  }
}
