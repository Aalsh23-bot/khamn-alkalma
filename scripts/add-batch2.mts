import { readFileSync, writeFileSync } from "fs";
import { ANSWERS, displayWord } from "../src/lib/game/words.ts";
import { normalizeWord } from "../src/lib/game/normalize.ts";
import { WORD_TIERS } from "../src/lib/game/word-tiers.ts";

type UsageTier = "common" | "familiar" | "rare";

const answerSet = new Set(ANSWERS);
const prettySet = new Set(ANSWERS.map(displayWord));

const DROP = new Set(["أرغون", "زينون", "رادون", "ديباج", "مجبوس", "مازوت"]);

const raw = `
آسيوي إبداع اتجاه اتحاد إجابة أحجية إدارة إذاعة إرادة أرباح أرغون إزالة أسئلة إسعاف أسلوب أسماك أسمنت أسنان إشاعة أشكال أصابع أصحاب أصوات إضافة أضواء أطباق أطعمة أظافر إعادة أعشاب أعلام أعمال أعياد أغراض أغطية إفادة أفراد إقامة أقدام أقراط أقفال أقمار أقوال أكسيد أكواب ألعاب أمطار بارجة بطاطس بنزين بنطال تبولة تحليل تربوي تقطيع تورتة ثقافي جرافة جنوبي حاملة حلاقة خلاطة دبابة دراما ديباج ذهبية رادون رافعة رصاصة رياضي زبادي زينون سياسي شامبو شرطية شطرنج شمالي شمسية صابون صحفية صينية طماطم طوارئ عالمي عسكري عصارة غريبة غلاية فريزر فلافل قاذفة قذيفة قطايف قلادة كاتبة كربون كرتون كنافة مازوت مترجم مجبوس مجمدة محارم محضرة محقنة محمصة مخبزة مختبر مدرعة مدمرة مذيعة مسافر مسلسل مطهرة معاصر معتمر معجون معمول ملفوف منزلي منظار منظفة نقالة هندسي
`.split(/\s+/).filter(Boolean);

const toAdd: { norm: string; pretty: string }[] = [];
for (const p of raw) {
  if (DROP.has(p)) continue;
  const n = normalizeWord(p);
  if ([...n].length !== 5) {
    console.warn("skip bad len", p, [...n].length);
    continue;
  }
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

src = src.replace(
  /export const ANSWERS: string\[\] = \[[^\]]+\];/,
  "export const ANSWERS: string[] = [" + answers.map((w) => `"${w}"`).join(",") + "];",
);

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

const RARE_WORDS = new Set([
  "بارجة",
  "دبابة",
  "مدرعة",
  "مدمرة",
  "قاذفة",
  "قذيفة",
  "رصاصة",
  "جرافة",
  "خلاطة",
  "محقنة",
  "نقالة",
  "حاملة",
  "أكسيد",
  "كربون",
]);
const COMMONISH = new Set([
  "إجابة",
  "إدارة",
  "إذاعة",
  "أسئلة",
  "إسعاف",
  "أسنان",
  "أصابع",
  "أصحاب",
  "أعمال",
  "ألعاب",
  "أمطار",
  "بطاطس",
  "طماطم",
  "صابون",
  "شامبو",
  "شطرنج",
  "مسافر",
  "مسلسل",
  "مختبر",
  "مترجم",
  "طوارئ",
  "تحليل",
  "ك ناعة".replace(" ", ""),
]);
COMMONISH.add("كنافة");

function tierFor(pretty: string, norm: string): UsageTier {
  if (RARE_WORDS.has(pretty) || RARE_WORDS.has(norm)) return "rare";
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

writeFileSync(
  "/workspace/src/lib/game/word-tiers.ts",
  `/* Auto-generated usage tiers for answer words. Edit after review. */
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
`,
);

console.log("answers now", answers.length);
console.log("dropped", [...DROP].join("، "));
console.log("sample", toAdd.slice(0, 12).map((x) => x.pretty).join("، "));
