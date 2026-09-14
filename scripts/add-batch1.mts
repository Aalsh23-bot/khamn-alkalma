import { readFileSync, writeFileSync } from "fs";
import { ANSWERS, displayWord } from "../src/lib/game/words.ts";
import { normalizeWord } from "../src/lib/game/normalize.ts";
import { WORD_TIERS } from "../src/lib/game/word-tiers.ts";

type UsageTier = "common" | "familiar" | "rare";

const answerSet = new Set(ANSWERS);
const prettySet = new Set(ANSWERS.map(displayWord));

const raw = `
أثناء أدبية أرضية إعصار أمنية باردة بحرية بركان بضاعة بطيئة بعوضة بيانو تاكسي تأمين تصريح تفاحة تكلفة تلفاز جبيرة جديدة جراحة جمارك جميلة جيتار حديثة حزينة حكومة خائفة خاطئة دبلوم دولاب دينية ذبابة راديو رسمية زلزال زيتون سباحة سحرية سريعة سعيدة سنجاب شرقية شعبية شوربة صاخبة صادقة صاروخ صحيحة صديقة صغيرة صيدلي ضاحية ضريبة ضعيفة ضمادة طويلة عربية علمية علنية غاضبة غربية غواصة فيديو فيضان قاضية قبيحة قديمة قصيرة قومية كاذبة كاملة كبيرة لائحة مؤمنة مبراة محارة محامي محبرة محلية محمية مدهشة مدونة مديرة مرتبة مرحاض مرحلة مرعبة مركبة مروحة مريحة مزمار مساحة مسألة مسبقة مسجلة مسرعة مسلحة مسلية مسيرة مشجعة مشرقة مصروف مضمار معقدة معلقة معينة مغرمة مغفلة مغلقة مغنية مفكرة مفلسة مفيدة مقالة مقامة مقدسة مقدمة مقرفة مقفلة مقولة مكلفة مكيدة ملحمة ملونة ممتعة ممحاة ممسحة ممكنة مملكة مناعة منشأة منفعة موجهة موفقة موقعة مولعة موهبة ميثاق ناقصة نظيفة هادئة هزيمة وطنية
`.split(/\s+/).filter(Boolean);

const toAdd: { norm: string; pretty: string }[] = [];
for (const p of raw) {
  const n = normalizeWord(p);
  if ([...n].length !== 5) continue;
  if (answerSet.has(n) || prettySet.has(p)) continue;
  if (toAdd.some((x) => x.norm === n)) continue;
  toAdd.push({ norm: n, pretty: p });
}

console.log("adding", toAdd.length);

const path = "/workspace/src/lib/game/words-data.ts";
let src = readFileSync(path, "utf8");

const answersMatch = src.match(/export const ANSWERS: string\[\] = \[([^\]]+)\];/);
if (!answersMatch) throw new Error("no answers");
const answers = answersMatch[1]
  .split(",")
  .map((s) => s.trim().replace(/^"|"$/g, ""))
  .filter(Boolean);

for (const { norm } of toAdd) {
  if (!answers.includes(norm)) answers.push(norm);
}

const newAnswersLine =
  "export const ANSWERS: string[] = [" + answers.map((w) => `"${w}"`).join(",") + "];";
src = src.replace(/export const ANSWERS: string\[\] = \[[^\]]+\];/, newAnswersLine);

let displayInsert = "";
for (const { norm, pretty } of toAdd) {
  if (!src.includes(`"${norm}":`)) {
    displayInsert += `\n  "${norm}": "${pretty}",`;
  }
}
if (displayInsert) {
  src = src.replace(
    /\n\};\n\nexport const VALID_GUESSES/,
    `${displayInsert}\n};\n\nexport const VALID_GUESSES`,
  );
}

writeFileSync(path, src);

const DEMOTE = new Set([
  "ممحاة",
  "ممسحة",
  "محارة",
  "محبرة",
  "مكيدة",
  "مقامة",
  "مغفلة",
  "مغرمة",
  "مقرفة",
]);
const COMMONISH = new Set([
  "حكومة",
  "محامي",
  "راديو",
  "تلفاز",
  "فيديو",
  "زلزال",
  "إعصار",
  "فيضان",
  "بركان",
  "تفاحة",
  "زيتون",
  "تاكسي",
  "جيتار",
  "بيانو",
  "صديقة",
  "مملكة",
  "موهبة",
  "مرحلة",
  "مركبة",
  "مقالة",
  "مقدمة",
  "محلية",
  "وطنية",
  "عربية",
  "كبيرة",
  "صغيرة",
  "جديدة",
  "قديمة",
  "جميلة",
  "سريعة",
  "بطيئة",
]);

function tierFor(pretty: string, norm: string): UsageTier {
  if (DEMOTE.has(pretty) || DEMOTE.has(norm)) return "rare";
  if (COMMONISH.has(pretty) || COMMONISH.has(norm)) return "common";
  return "familiar";
}

const existing: Record<string, UsageTier> = { ...(WORD_TIERS as Record<string, UsageTier>) };
for (const { norm, pretty } of toAdd) {
  existing[norm] = tierFor(pretty, norm);
}

const lines = Object.entries(existing)
  .sort(([a], [b]) => a.localeCompare(b, "ar"))
  .map(([w, t]) => `  ${JSON.stringify(w)}: ${JSON.stringify(t)} as const,`);

const tiersSrc = `/* Auto-generated usage tiers for answer words. Edit after review. */
export type UsageTier = "common" | "familiar" | "rare";

/** Normalized answer → usage tier */
export const WORD_TIERS: Record<string, UsageTier> = {
${lines.join("\n")}
};

export function usageTierByIndex(answers: string[]): Record<UsageTier, number[]> {
  const out: Record<UsageTier, number[]> = { common: [], familiar: [], rare: [] };
  answers.forEach((w, i) => {
    const tier = WORD_TIERS[w] ?? "familiar";
    out[tier].push(i);
  });
  return out;
}
`;
writeFileSync("/workspace/src/lib/game/word-tiers.ts", tiersSrc);

console.log("answers now", answers.length);
console.log("tiers now", Object.keys(existing).length);
