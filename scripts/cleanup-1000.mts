/**
 * Keep ANSWERS at 1000 while swapping junk conjugates/typos for clean nouns.
 * Also starts step 6: strip clearly inappropriate VALID_GUESSES.
 */
import { readFileSync, writeFileSync } from "fs";
import { ANSWERS, ANSWER_DISPLAY, VALID_GUESSES } from "../src/lib/game/words-data.ts";
import { normalizeWord } from "../src/lib/game/normalize.ts";

const TARGET = 1000;

/** Normalized keys to remove from answers (junk conjugates / typos). */
const REMOVE = new Set(
  [
    "اناسا",
    "اناقش",
    "انتهت",
    "انتهى",
    "انتهي",
    "انسوا",
    "انكما",
    "انهما",
    "انهيت",
    "انظرا",
    "انظرو",
    "انظرى",
    "انظري",
    "انزلي",
    "انصتي",
    "انهضي",
    "انجبت",
    "انشات",
    "انفقت",
    "انتما",
    "انتمي",
    "مايية",
    "مريية",
    "مشيية",
    "مضيية",
    "مليية",
    "ميوية",
    "مايدة",
    "نفسيه",
    "مبارة",
    "مخطية",
    "مذاقة",
    "مصيرة",
    "مظهرة",
    "منصبة",
    "موثرة",
    "موخرة",
    "موذية",
    "موسسة",
    "موكدة",
    "مولمة",
    "مومنة",
    "موهلة",
    "مياسة",
  ].map(normalizeWord),
);

/** Replacement pool — everyday 5-letter nouns/adjectives (display forms). */
const REPLACEMENTS = `
مرئية مائية مطرية مارية دراية حكاية عناية قاطرة فانوس إبريق ليمون نعناع
كزبرة دجاجة منحدر بلدية صومعة مئذنة محراب ثعالب أفيال غزلان أرانب بلابل
بومات أحرار شوارع غابات وديان شواطئ أرصفة محطات كليات مسارح ملاعب مسابح
صالات معابد أديرة منابر وسائط وسائل موائد مواهب مواسم مواكب مواقع قوافل
قوائم قوارب دوافع حواجز روائح طوابع طوابق عوائد عوارض فواكه جداول جواهر
خواتم سواحل نماذج هياكل ياقات أجداد أجنحة أحمال أخشاب أذواق أرغفة أسرار
أسوار ألحان ألسنة أمواج أمتعة أملاح أنغام أهرام أوزان أوعية بادرة بارقة
باهرة بائعة بائسة باهظة تاجرة ثابتة ثالثة ثاقبة جالية جاهلة حاسبة حاسمة
حاضرة حالمة حامية حاوية خاطرة خالصة خامسة خاملة داعية دامغة دامية دائرة
`.split(/\s+/).filter(Boolean);

const NSFW_GUESSES = new Set(
  [
    "اباحي",
    "اباحية",
    "جنس",
    "جنسي",
    "عاهر",
    "عاهرة",
    "زنا",
    "زاني",
    "لواط",
    "سحاق",
    "نيك",
    "نيكة",
    "قحبة",
    "شرموط",
    "شراميط",
    "كسها",
    "زبها",
    "طيز",
    "طيزي",
    "مخنث",
    "اغتصاب",
  ].map(normalizeWord),
);

const answerNorm = ANSWERS.map(normalizeWord);
const keep = answerNorm.filter((w) => !REMOVE.has(w));
const removed = answerNorm.filter((w) => REMOVE.has(w));
console.log("removing", removed.length, removed);

const existing = new Set(keep);
const display: Record<string, string> = { ...ANSWER_DISPLAY };
for (const k of removed) delete display[k];

const added: string[] = [];
for (const pretty of REPLACEMENTS) {
  const n = normalizeWord(pretty);
  if ([...n].length !== 5) continue;
  if (existing.has(n)) continue;
  if (REMOVE.has(n)) continue;
  existing.add(n);
  added.push(n);
  display[n] = pretty;
  if (keep.length + added.length >= TARGET) break;
}

if (keep.length + added.length < TARGET) {
  console.error("Need more replacements", {
    have: keep.length + added.length,
    need: TARGET,
  });
  process.exit(1);
}

const finalAnswers = [...keep, ...added].slice(0, TARGET);
console.log({
  kept: keep.length,
  added: added.length,
  final: finalAnswers.length,
  unique: new Set(finalAnswers).size,
  sampleAdded: added.slice(0, 20).map((n) => display[n] ?? n),
});

const guesses = VALID_GUESSES.filter((g) => {
  const n = normalizeWord(g);
  if (NSFW_GUESSES.has(n)) return false;
  if (NSFW_GUESSES.has(g)) return false;
  // drop obvious typo junk keys
  if (/اانتم|اوووه|ماهذة/.test(g)) return false;
  return true;
});
for (const a of finalAnswers) {
  if (!guesses.includes(a)) guesses.push(a);
}
console.log("VALID_GUESSES", VALID_GUESSES.length, "→", guesses.length);

const path = "src/lib/game/words-data.ts";
let src = readFileSync(path, "utf8");

const answersLit = JSON.stringify(finalAnswers);
const displayLit = Object.entries(display)
  .sort(([a], [b]) => a.localeCompare(b, "ar"))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");
const guessesLit = JSON.stringify(guesses);

src = src.replace(
  /export const ANSWERS: string\[\] = \[[\s\S]*?\];/,
  `export const ANSWERS: string[] = ${answersLit};`,
);
src = src.replace(
  /export const ANSWER_DISPLAY: Record<string, string> = \{[\s\S]*?\n\};/,
  `export const ANSWER_DISPLAY: Record<string, string> = {\n${displayLit}\n};`,
);
src = src.replace(
  /export const VALID_GUESSES: string\[\] = \[[\s\S]*?\];/,
  `export const VALID_GUESSES: string[] = ${guessesLit};`,
);

writeFileSync(path, src);
console.log("wrote", path);
