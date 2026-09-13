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

export function stageAnswer(level: number): string {
  const idx = ((level - 1) % ANSWERS.length + ANSWERS.length) % ANSWERS.length;
  return ANSWERS[idx]!;
}

/** Campaign length — one word per stage, unlocked in order. */
export const STAGE_COUNT = 100;
