/**
 * Step 6: family-friendly trim — swap dark/NSFW answers, scrub guess list.
 * Keeps ANSWERS at exactly 1000.
 */
import { readFileSync, writeFileSync } from "fs";
import { ANSWERS, ANSWER_DISPLAY, VALID_GUESSES } from "../src/lib/game/words-data.ts";
import { normalizeWord } from "../src/lib/game/normalize.ts";

const TARGET = 1000;

const REMOVE_ANSWERS = new Set(
  ["مخدرة", "تعذيب", "مقتلة", "مجزرة", "مذبحة", "فضيحة"].map(normalizeWord),
);

const REPLACEMENTS = `
بادرة بارقة باهرة بائعة ثابتة حاسبة حاسمة حاضرة حالمة حامية
خاطرة خالصة خامسة داعية دامية دائرة جالية جاهلة تاجرة ثاقبة
`.split(/\s+/).filter(Boolean);

const BLOCK_GUESS = new Set(
  [
    "اباحي",
    "الجنس",
    "جنسيا",
    "جنسيه",
    "للجنس",
    "الزنا",
    "دعاره",
    "دعارة",
    "الخمر",
    "مخدره",
    "مخدرة",
    "تعذيب",
    "مقتلة",
    "مجزرة",
    "مذبحة",
  ].map(normalizeWord),
);

const keep = ANSWERS.map(normalizeWord).filter((w) => !REMOVE_ANSWERS.has(w));
const removed = ANSWERS.map(normalizeWord).filter((w) => REMOVE_ANSWERS.has(w));
console.log("remove answers", removed);

const existing = new Set(keep);
const display: Record<string, string> = { ...ANSWER_DISPLAY };
for (const k of removed) delete display[k];

const added: string[] = [];
for (const pretty of REPLACEMENTS) {
  const n = normalizeWord(pretty);
  if ([...n].length !== 5) continue;
  if (existing.has(n) || REMOVE_ANSWERS.has(n)) continue;
  existing.add(n);
  added.push(n);
  display[n] = pretty;
  if (keep.length + added.length >= TARGET) break;
}

if (keep.length + added.length < TARGET) {
  console.error("need more", keep.length + added.length);
  process.exit(1);
}

const finalAnswers = [...keep, ...added].slice(0, TARGET);
const guesses = VALID_GUESSES.filter((g) => !BLOCK_GUESS.has(normalizeWord(g)));
for (const a of finalAnswers) {
  if (!guesses.includes(a)) guesses.push(a);
}

console.log({
  final: finalAnswers.length,
  unique: new Set(finalAnswers).size,
  added,
  guesses: guesses.length,
});

const path = "src/lib/game/words-data.ts";
let src = readFileSync(path, "utf8");
const displayLit = Object.entries(display)
  .sort(([a], [b]) => a.localeCompare(b, "ar"))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

src = src.replace(
  /export const ANSWERS: string\[\] = \[[\s\S]*?\];/,
  `export const ANSWERS: string[] = ${JSON.stringify(finalAnswers)};`,
);
src = src.replace(
  /export const ANSWER_DISPLAY: Record<string, string> = \{[\s\S]*?\n\};/,
  `export const ANSWER_DISPLAY: Record<string, string> = {\n${displayLit}\n};`,
);
src = src.replace(
  /export const VALID_GUESSES: string\[\] = \[[\s\S]*?\];/,
  `export const VALID_GUESSES: string[] = ${JSON.stringify(guesses)};`,
);
writeFileSync(path, src);
console.log("wrote", path);
