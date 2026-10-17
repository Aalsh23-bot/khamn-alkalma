import { WORD_LENGTH } from "./normalize";

/** True when every letter is already known (correct guess or prior hint). */
export function allLettersRevealed(
  evaluations: readonly (readonly string[] | undefined)[],
  hintedCols: readonly number[],
  guessesLength: number,
): boolean {
  const known = new Set<number>();
  for (let g = 0; g < guessesLength; g++) {
    const ev = evaluations[g] ?? [];
    ev.forEach((st, i) => {
      if (st === "correct") known.add(i);
    });
  }
  for (const c of hintedCols) known.add(c);
  return known.size >= WORD_LENGTH;
}
