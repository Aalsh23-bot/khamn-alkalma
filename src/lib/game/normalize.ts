const TASHKEEL =
  /[\u064B-\u0652\u0670\u0640\u0653-\u065F\u0610-\u061A\u06D6-\u06ED]/g;

const LETTER_SET = new Set(Array.from("ابتثجحخدذرزسشصضطظعغفقكلمنهويىءةئؤ"));

const LIGATURE: Record<string, string> = {
  "\uFEFB": "لا",
  "\uFEFC": "لا",
  "\uFEF5": "لا",
  "\uFEF6": "لا",
  "\uFEF7": "لا",
  "\uFEF8": "لا",
  "\uFEF9": "لا",
  "\uFEFA": "لا",
};

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export function normalizeChar(ch: string): string {
  const lig = LIGATURE[ch];
  if (lig) return lig;
  const c = ch.normalize("NFC").replace(TASHKEEL, "");
  if (!c) return "";
  if ("أإآٱ".includes(c)) return "ا";
  // ئ and ؤ stay distinct from ي / و
  if (c === "گ") return "ك";
  if (c === "پ") return "ب";
  if (c === "چ") return "ج";
  if (c === "ڤ") return "ف";
  return c;
}

export function normalizeWord(raw: string): string {
  let out = "";
  for (const ch of raw.normalize("NFC")) {
    const n = normalizeChar(ch);
    for (const piece of n) {
      if (LETTER_SET.has(piece)) out += piece;
    }
  }
  return out;
}

export function isArabicLetter(ch: string): boolean {
  return normalizeWord(ch).length > 0;
}
