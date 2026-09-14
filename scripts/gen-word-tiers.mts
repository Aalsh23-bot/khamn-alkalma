import { writeFileSync } from "fs";
import { ANSWERS, displayWord } from "../src/lib/game/words.ts";

const RARE = new Set("ظذزضثصط".split(""));
const UNCOMMON = new Set("قغخحجش".split(""));

/** Boost: everyday nouns/verbs people know well */
const BOOST = new Set([
  "مدرسة",
  "مدينة",
  "سيارة",
  "رسالة",
  "رسائل",
  "جامعة",
  "مشكلة",
  "نتيجة",
  "بداية",
  "نهاية",
  "عائلة",
  "حديقة",
  "حقيبة",
  "طاولة",
  "نافذة",
  "مكتبة",
  "شهادة",
  "سياسة",
  "طبيعة",
  "طريقة",
  "صداقة",
  "زيارة",
  "زراعة",
  "ثقافة",
  "وظيفة",
  "صناعة",
  "سياحة",
  "جريمة",
  "منطقة",
  "قراءة",
  "كتابة",
  "رياضة",
  "حرارة",
  "تذكرة",
  "ترجمة",
  "مفتاح",
  "موضوع",
  "معرفة",
  "جزيرة",
  "سلامة",
  "جمهور",
  "نظارة",
  "ملعقة",
  "فاكهة",
  "خريطة",
  "وثيقة",
  "عملية",
  "محكمة",
  "رواية",
  "علامة",
  "تجارة",
  "سفارة",
  "رعاية",
  "دراجة",
  "بطولة",
  "دقيقة",
  "وزارة",
  "علاقة",
  "مشروع",
  "أمانة",
  "مهارة",
  "صحافة",
  "جماعة",
  "ثانية",
  "ملابس",
  "حيوان",
  "ميعاد",
  "مواطن",
  "ظاهرة",
  "فائدة",
  "صراحة",
  "حمامة",
  "حافلة",
  "شجاعة",
  "عنوان",
  "أفلام",
  "أقلام",
  "أجهزة",
  "إجازة",
  "إعلان",
  "جوارب",
  "ولاعة",
  "أريكة",
  "أحذية",
  "أخبار",
  "أطفال",
  "أسماء",
  "أشخاص",
  "أشياء",
  "أرقام",
  "ألوان",
  "أهداف",
  "أبواب",
  "أسبوع",
  "تاريخ",
  "قانون",
  "مفهوم",
  "موجود",
  "مشهور",
  "مفتوح",
  "دكتور",
  "دستور",
  "حاسوب",
  "صحراء",
  "عصفور",
  "ثعبان",
  "فراشة",
  "سفينة",
  "طائرة",
  "باخرة",
  "حقائق",
  "مسائل",
  "مؤتمر",
  "مؤسسة",
  "جوائز",
  "فوائد",
  "حدائق",
  "قائمة",
  "امرأة",
  "سعادة",
  "سحابة",
  "إشارة",
  "نقابة",
  "جريدة",
  "تمساح",
  "زرافة",
  "معلمة",
  "وسادة",
  "عدالة",
  "سينما",
  "فلسفة",
  "وسيلة",
  "كراسة",
  "فستان",
  "عمارة",
  "كنيسة",
  "عيادة",
  "وكالة",
  "تعادل",
  "ستارة",
  "مكنسة",
  "أفكار",
  "سلسلة",
  "والدة",
  "سبورة",
  "بناية",
  "مصباح",
  "مكاتب",
  "منديل",
  "ميدان",
  "مدارس",
  "مساجد",
  "منشار",
  "مقابل",
  "مشاكل",
  "أشجار",
  "عصابة",
  "حقيقة",
  "جزيرة",
  "صحافة",
  "اجتمع",
  "اقترب",
  "سجادة",
  "خسارة",
  "انسحب",
  "أسلحة",
  "قبيلة",
  "اختلف",
  "عقيدة",
  "أوراق",
  "احترم",
  "فنادق",
  "مختلف",
  "احتفل",
  "جيران",
  "منشفة",
  "بحيرة",
  "غسالة",
  "قيادة",
  "قواعد",
  "تقويم",
  "فنجان",
  "مقبرة",
  "فرشاة",
  "مغسلة",
  "ملكية",
  "أغنية",
  "مبادئ",
  "وقاية",
  "محبوب",
  "مجموع",
  "مقبول",
  "مقلاة",
  "مناهج",
  "مقياس",
  "مغارة",
  "احتاج",
  "شريحة",
  "شاحنة",
  "مزرعة",
  "كارثة",
  "ذاكرة",
  "انتظر",
  "ممرضة",
  "صيدلة",
  "ضرورة",
  "منظمة",
  "موظفة",
  "مذكرة",
  "عاصمة",
  "اعتذر",
  "ضمانة",
  "مشغول",
  "نوافذ",
  "وساطة",
  "مسطرة",
  "أعضاء",
  "سيطرة",
  "رطوبة",
  "عاصفة",
  "فضيلة",
  "طالبة",
  "صعوبة",
  "انتصر",
  "أزهار",
  "فطيرة",
  "زميلة",
  "نظرية",
  "ممتاز",
  "مطاعم",
  "مصانع",
  "ميزان",
  "ثلاجة",
  "شطيرة",
  "حادثة",
  "نصيحة",
  "محفظة",
  "خزانة",
  "قصيدة",
  "صندوق",
  "انخفض",
  "فضيحة",
  "بطاقة",
  "صحيفة",
  "مطرقة",
  "محصول",
  "جائزة",
  "مصطلح",
  "ابتسم",
  "ابتعد",
  "ابتكر",
  "اندفع",
  "اعترف",
  "انكسر",
  "استمع",
  "اكتمل",
  "انتهى",
  "ارتفع",
  "استمر",
  "انفتح",
  "انفجر",
  "اعتقد",
  "انهزم",
  "مستند",
  "مستمع",
  "مستعد",
  "مستقل",
  "معيار",
  "ميناء",
  "مولود",
  "ميلاد",
  "مكسور",
  "قاعدة",
  "شراكة",
  "مسرور",
  "معروف",
  "موعود",
]);

const DEMOTE = new Set([
  "مهزلة",
  "يمامة",
  "عمولة",
  "مجرفة",
  "مغسول",
  "محسوب",
  "موقوف",
  "وحشية",
  "يتيمة",
  "ندامة",
  "لياقة",
  "يومية",
  "نوايا",
  "مطبوع",
  "طباعة",
  "كتيبة",
]);

function score(norm: string, pretty: string): number {
  let s = 40;
  for (const ch of [...norm]) {
    if (RARE.has(ch)) s -= 6;
    else if (UNCOMMON.has(ch)) s -= 2;
  }
  if (/[ئؤ]/.test(norm)) s -= 1;
  if (BOOST.has(pretty) || BOOST.has(norm)) s += 25;
  if (DEMOTE.has(pretty) || DEMOTE.has(norm)) s -= 30;
  return s;
}

const scored = ANSWERS.map((w, i) => {
  const pretty = displayWord(w);
  let bucket: "common" | "familiar" | "rare" | "auto" = "auto";
  if (DEMOTE.has(pretty) || DEMOTE.has(w)) bucket = "rare";
  else if (BOOST.has(pretty) || BOOST.has(w)) bucket = "common";
  return { i, w, pretty, score: score(w, pretty), bucket };
});

const forcedCommon = scored.filter((x) => x.bucket === "common");
const forcedRare = scored.filter((x) => x.bucket === "rare");
const auto = scored
  .filter((x) => x.bucket === "auto")
  .sort((a, b) => b.score - a.score || a.pretty.localeCompare(b.pretty, "ar"));

// Target ~equal thirds; overflow BOOST → familiar; fill gaps from auto
const target = Math.ceil(ANSWERS.length / 3);
const common: typeof scored = [];
const familiar: typeof scored = [];
const rare: typeof scored = [...forcedRare];

for (const item of forcedCommon) {
  if (common.length < target) common.push(item);
  else familiar.push(item);
}

for (const item of auto) {
  if (common.length < target) common.push(item);
  else if (familiar.length < target) familiar.push(item);
  else rare.push(item);
}

common.sort((a, b) => a.pretty.localeCompare(b.pretty, "ar"));
familiar.sort((a, b) => a.pretty.localeCompare(b.pretty, "ar"));
rare.sort((a, b) => a.pretty.localeCompare(b.pretty, "ar"));

const lines = [
  ...common.map((x) => `  ${JSON.stringify(x.w)}: "common" as const,`),
  ...familiar.map((x) => `  ${JSON.stringify(x.w)}: "familiar" as const,`),
  ...rare.map((x) => `  ${JSON.stringify(x.w)}: "rare" as const,`),
];

const file = `/* Auto-generated usage tiers for answer words. Edit after review. */
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

writeFileSync("/workspace/src/lib/game/word-tiers.ts", file);

console.log("sizes", common.length, familiar.length, rare.length);
console.log("\n=== 1 شائعة (" + common.length + ") ===");
console.log(common.map((x) => x.pretty).join("، "));
console.log("\n=== 2 مألوفة (" + familiar.length + ") ===");
console.log(familiar.map((x) => x.pretty).join("، "));
console.log("\n=== 3 أقل شيوعاً (" + rare.length + ") ===");
console.log(rare.map((x) => x.pretty).join("، "));
