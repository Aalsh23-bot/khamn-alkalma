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

/** Saved stage orders with this scheme start easy, then mix difficulties randomly. */
export const STAGE_ORDER_SCHEME = "progressive-v2";

/** First N stages draw from the easiest word pool only. */
export const INTRO_EASY_STAGES = 20;

/** Minimum stage gap between words that differ by only one letter. */
export const NEAR_DUPLICATE_MIN_GAP = 12;

type DifficultyTier = "easy" | "medium" | "hard";

const RARE_LETTERS = new Set("ظذزضثصط".split(""));
const UNCOMMON_LETTERS = new Set("قغخحجش".split(""));

function fisherYates<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function wordDifficultyScore(word: string): number {
  let score = 0;
  const chars = [...word];
  const unique = new Set(chars);

  for (const ch of chars) {
    if (RARE_LETTERS.has(ch)) score += 3;
    else if (UNCOMMON_LETTERS.has(ch)) score += 1.5;
  }

  score += unique.size * 0.4;
  if (unique.size < chars.length) score -= 0.8;

  if (word.endsWith("ه")) score -= 0.5;
  if (word.includes("ى")) score += 0.5;

  return score;
}

function classifyWordsByDifficulty(length = ANSWERS.length): Record<DifficultyTier, number[]> {
  const scored = Array.from({ length }, (_, index) => ({
    index,
    score: wordDifficultyScore(ANSWERS[index]!),
  })).sort((a, b) => a.score - b.score);

  const third = Math.floor(length / 3);
  const easy = scored.slice(0, third).map((item) => item.index);
  const medium = scored.slice(third, third * 2).map((item) => item.index);
  const hard = scored.slice(third * 2).map((item) => item.index);

  return { easy, medium, hard };
}

function pickWeightedPool(
  pools: Record<DifficultyTier, number[]>,
): DifficultyTier | null {
  const weights: { tier: DifficultyTier; weight: number }[] = [
    { tier: "easy", weight: pools.easy.length ? 4 : 0 },
    { tier: "medium", weight: pools.medium.length ? 3 : 0 },
    { tier: "hard", weight: pools.hard.length ? 3 : 0 },
  ].filter((entry) => entry.weight > 0);

  if (weights.length === 0) return null;

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.tier;
  }
  return weights[weights.length - 1]!.tier;
}

function buildMixedTail(pools: Record<DifficultyTier, number[]>): number[] {
  const tail: number[] = [];
  const working: Record<DifficultyTier, number[]> = {
    easy: fisherYates(pools.easy),
    medium: fisherYates(pools.medium),
    hard: fisherYates(pools.hard),
  };

  while (working.easy.length || working.medium.length || working.hard.length) {
    const tier = pickWeightedPool(working);
    if (!tier) break;
    const next = working[tier].pop();
    if (next != null) tail.push(next);
  }

  return tail;
}

function editDistanceOne(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && ++diff > 1) return false;
  }
  return diff === 1;
}

function conflictsNear(
  order: number[],
  index: number,
  wordIndex: number,
  minGap: number,
): boolean {
  const word = ANSWERS[wordIndex]!;
  const from = Math.max(0, index - minGap + 1);
  const to = Math.min(order.length - 1, index + minGap - 1);
  for (let i = from; i <= to; i++) {
    if (i === index) continue;
    const other = order[i];
    if (other == null) continue;
    if (editDistanceOne(word, ANSWERS[other]!)) return true;
  }
  return false;
}

/**
 * Keep one-letter-apart answers (e.g. قائدة/فائدة/مائدة) from clustering.
 * Best-effort: swaps conflicting stages farther apart when possible.
 */
function separateNearDuplicates(
  order: number[],
  minGap = NEAR_DUPLICATE_MIN_GAP,
): number[] {
  const arr = order.slice();

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < Math.min(arr.length, i + minGap); j++) {
        const a = arr[i]!;
        const b = arr[j]!;
        if (!editDistanceOne(ANSWERS[a]!, ANSWERS[b]!)) continue;

        let swapped = false;
        for (let k = i + minGap; k < arr.length; k++) {
          const candidate = arr[k]!;
          if (conflictsNear(arr, j, candidate, minGap)) continue;
          if (conflictsNear(arr, k, b, minGap)) continue;
          arr[j] = candidate;
          arr[k] = b;
          swapped = true;
          break;
        }

        if (!swapped) {
          for (let k = 0; k < i - minGap + 1; k++) {
            const candidate = arr[k]!;
            if (conflictsNear(arr, j, candidate, minGap)) continue;
            if (conflictsNear(arr, k, b, minGap)) continue;
            arr[j] = candidate;
            arr[k] = b;
            break;
          }
        }
      }
    }
  }

  return arr;
}

/**
 * Progressive stage order: easy intro, then a random easy/medium/hard mix
 * so later levels vary instead of ramping up in difficulty.
 * Near-duplicate words are spaced apart (e.g. قائدة family).
 */
export function buildStageOrder(length = ANSWERS.length): number[] {
  const tiers = classifyWordsByDifficulty(length);
  const introCount = Math.min(INTRO_EASY_STAGES, tiers.easy.length, length);

  const intro = fisherYates(tiers.easy).slice(0, introCount);
  const introSet = new Set(intro);

  const remaining: Record<DifficultyTier, number[]> = {
    easy: tiers.easy.filter((idx) => !introSet.has(idx)),
    medium: tiers.medium.slice(),
    hard: tiers.hard.slice(),
  };

  return separateNearDuplicates([...intro, ...buildMixedTail(remaining)]);
}

/** Fisher–Yates shuffle of answer indices (legacy flat random order). */
export function shuffleStageOrder(length = ANSWERS.length): number[] {
  return fisherYates(Array.from({ length }, (_, i) => i));
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

/** Stage answers come from a saved permutation — never sequential, never repeats. */
export function stageAnswer(level: number, order: number[]): string {
  const idx = order[level - 1];
  if (idx == null || idx < 0 || idx >= ANSWERS.length) {
    return ANSWERS[(level - 1) % ANSWERS.length]!;
  }
  return ANSWERS[idx]!;
}
