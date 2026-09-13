export type LetterStatus = "correct" | "present" | "absent";

export function evaluate(guess: string, answer: string): LetterStatus[] {
  const n = guess.length;
  const result: LetterStatus[] = Array.from({ length: n }, () => "absent");
  const remaining: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      const ch = answer[i] ?? "";
      remaining[ch] = (remaining[ch] ?? 0) + 1;
    }
  }

  for (let i = 0; i < n; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i] ?? "";
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = "present";
      remaining[ch] -= 1;
    }
  }

  return result;
}

export type KeyStatus = LetterStatus | "unused";

export function mergeKeyStatus(prev: KeyStatus, next: LetterStatus): KeyStatus {
  const rank = { unused: 0, absent: 1, present: 2, correct: 3 } as const;
  return rank[next] > rank[prev] ? next : prev;
}

export function hardModeError(
  guess: string,
  prevGuesses: string[],
  prevEvals: LetterStatus[][],
): string | null {
  for (let g = 0; g < prevGuesses.length; g++) {
    const prev = prevGuesses[g] ?? "";
    const ev = prevEvals[g] ?? [];
    for (let i = 0; i < prev.length; i++) {
      if (ev[i] === "correct" && guess[i] !== prev[i]) {
        return `يجب الإبقاء على «${prev[i]}» في موضعه`;
      }
    }
    for (let i = 0; i < prev.length; i++) {
      if (ev[i] === "present" && !guess.includes(prev[i] ?? "")) {
        return `يجب استخدام الحرف «${prev[i]}»`;
      }
    }
  }
  return null;
}

export function buildKeyMap(
  guesses: string[],
  evaluations: LetterStatus[][],
  hintedCols: number[],
  answer: string,
): Record<string, KeyStatus> {
  const map: Record<string, KeyStatus> = {};
  evaluations.forEach((ev, gi) => {
    const guess = guesses[gi] ?? "";
    ev.forEach((st, i) => {
      const ch = guess[i];
      if (!ch) return;
      map[ch] = mergeKeyStatus(map[ch] ?? "unused", st);
    });
  });
  for (const col of hintedCols) {
    const ch = answer[col];
    if (ch) map[ch] = mergeKeyStatus(map[ch] ?? "unused", "correct");
  }
  return map;
}
