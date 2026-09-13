import { ANSWERS as RAW_ANSWERS, ANSWER_DISPLAY, VALID_GUESSES } from "./words-data";
import { normalizeWord } from "./normalize";

export const ANSWERS: string[] = RAW_ANSWERS.map((w) =>
  normalizeWord(ANSWER_DISPLAY[w] ?? w),
);

const DISPLAY: Record<string, string> = {};
for (const [oldKey, pretty] of Object.entries(ANSWER_DISPLAY)) {
  DISPLAY[oldKey] = pretty;
  DISPLAY[normalizeWord(pretty)] = pretty;
}

const guessSet = new Set<string>();
for (const word of VALID_GUESSES) {
  guessSet.add(word);
  if (word.endsWith("ه")) guessSet.add(`${word.slice(0, -1)}ة`);
}
for (const word of ANSWERS) guessSet.add(word);
for (const pretty of Object.values(ANSWER_DISPLAY)) {
  guessSet.add(normalizeWord(pretty));
}

export function isValidGuess(norm: string): boolean {
  return guessSet.has(norm);
}

export function displayWord(norm: string): string {
  return DISPLAY[norm] ?? norm;
}

/** One stage per answer word — no repeats within a campaign. */
export const STAGE_COUNT = ANSWERS.length;

/** Fisher–Yates shuffle of answer indices (unique random order). */
export function shuffleStageOrder(length = ANSWERS.length): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = order[i]!;
    order[i] = order[j]!;
    order[j] = a;
  }
  return order;
}

export function isValidStageOrder(
  order: unknown,
  length = ANSWERS.length,
): order is number[] {
  if (!Array.isArray(order) || order.length !== length) return false;
  const seen = new Set<number>();
  for (const value of order) {
    if (!Number.isInteger(value) || value < 0 || value >= length || seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return seen.size === length;
}

/** Stage answers come from a saved random permutation — never sequential, never repeats. */
export function stageAnswer(level: number, order: number[]): string {
  const idx = order[level - 1];
  if (idx == null || idx < 0 || idx >= ANSWERS.length) {
    return ANSWERS[(level - 1) % ANSWERS.length]!;
  }
  return ANSWERS[idx]!;
}
