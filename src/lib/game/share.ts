import type { LetterStatus } from "./evaluate";
import { formatArabicDate } from "./daily";
import { challengeAbsoluteUrl } from "./challenge";
import { isNativeApp, nativeShare } from "@/lib/native";
import { APP_NAME } from "./brand";
import type { Mode } from "./storage";

const GLYPH: Record<LetterStatus, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

export function shareText(opts: {
  puzzleNum: number;
  dateKey: string;
  guesses: number;
  max: number;
  evaluations: LetterStatus[][];
  won: boolean;
  hardMode: boolean;
  mode?: Mode;
  challengeCode?: string;
}): string {
  const score = opts.won ? String(opts.guesses) : "X";
  const star = opts.hardMode ? "*" : "";
  const rows = opts.evaluations
    .map((row) => [...row].reverse().map((s) => GLYPH[s]).join(""))
    .join("\n");
  const ltr = "\u202D";
  const pdf = "\u202C";
  const label =
    opts.mode === "stages"
      ? `${APP_NAME} · مرحلة ${opts.puzzleNum}${star} ${score}/${opts.max}`
      : opts.mode === "challenge"
        ? `${APP_NAME} · تحدّي الأصدقاء${star} ${score}/${opts.max}`
        : `${APP_NAME} ${opts.puzzleNum}${star} ${score}/${opts.max}`;
  const lines = [label, formatArabicDate(opts.dateKey), "", `${ltr}${rows}${pdf}`];
  if (opts.mode === "challenge" && opts.challengeCode) {
    lines.push("", challengeAbsoluteUrl(opts.challengeCode));
  }
  return lines.join("\n");
}

export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  try {
    if (isNativeApp()) {
      await nativeShare(text);
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") throw err;
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
