import { readFileSync, writeFileSync } from "fs";
import { ANSWERS, displayWord } from "../src/lib/game/words.ts";
import { VALID_GUESSES } from "../src/lib/game/words-data.ts";
import { normalizeWord } from "../src/lib/game/normalize.ts";
import { WORD_TIERS } from "../src/lib/game/word-tiers.ts";

type UsageTier = "common" | "familiar" | "rare";

const TARGET = 1000;
const answerSet = new Set(ANSWERS);
const prettySet = new Set(ANSWERS.map(displayWord));

const DROP = new Set([
  "أرغون",
  "زينون",
  "رادون",
  "ديباج",
  "مجبوس",
  "مازوت",
  "اوووه",
  "ماهذة",
  "ماييه",
  "مرييه",
  "مشييه",
  "مضييه",
  "ملييه",
  "ميويه",
  "اانتم",
  "انتون",
  "اندرو",
  "اندري",
  "انجلس",
  "انجلو",
  "انستي",
  "انطون",
  "انيتا",
  "ابولو",
  "ادولف",
  "ابريل",
]);

const curated = `
إضراب إمارة بوصلة تمثال خلافة رئاسة سلطنة مدافع مهاجم نموذج حارسة راقصة شاعرة
فنانة لاعبة ممثلة مدربة مغنية كوميدي وثائقي رومانسي خيالي شخصي رقمي ورقي
دولي إقليمي نفسي فلسفي جغرافي أخلاقي صناعي درامي تصويت
بطارية شاحن قابس مقبس محول مولد ديزل كيروسين أكسجين هيليوم نيون كريبتون
إسمنت بلاستيك سيراميك جرانيت ألمنيوم نايلون مخمل مطاط فخار رخام
بندقية خوذة فرقاطة طراد مقاتلة
مخدة فوطة مجفف خلاط طباخ شوكة سكين مبرد مربى فجل قرنبيط باذنجان فاصوليا برغل
بسكويت شوكولا بقلاوة بسبوسة شاورما كفتة مندي كبسة مقلوبة فتوش لبنة متبل يخت
مروحية هلال بدر مجرة جفاف ثلوج غيوم أشعة عمليات مستوصف معهد اختبار مشرف موجه
مرشد محامية مفاتيح كراج مخبزة مطهرة منظفة منظار مجهر مشرط محقن
ماركة مالكة ماهرة مالية ماضية مالحة مبكرة مبللة متاحة متجهة متصلة مثيرة مجرمة
مجهزة محاطة محبطة محددة محطمة مخلصة مذهلة مريضة مزعجة مزورة مزيفة مسطحة
مصابة مصلحة مصممة مصورة مصيبة مصيدة مضادة مضحكة مطلقة مطيعة مظلمة معجزة معذرة
معرضة معضلة معطلة معيشة مغطاة مقتلة مقدرة مقربة مكانة مكونة ممثلة ممزقة مميزة
مهتمة مهددة مهذبة موثقة موعدة مسيحي مشروب مطلوب مهندس موارد مواقف نفسيه نفسية
استحق استحم استعد استغل استلم انتبه انتشر انتقل انتمي انطلق انقلب انقطع انفصل
انزلق انصرف انتاج انسان انجاز انذار انقاذ انواع انهاء انبوب
مباراة متجر متحف مثقف مجلس مجمع محلات مخزن مدخل مستودع مسجد مساعدة مسيحي
مشروب مصمم معهد معبر معرض مهندس مواجهة مواصلات مواعيد مواقف موسيقى
حارسة راقصة شاعرة فنانة لاعبة ممثلة مدربة مغنية ملحنة
إضراب إمارة خلافة رئاسة سلطنة تصويت استفتاء انتخابات اعتصام احتجاج مظاهرة
بوصلة أطلس تلسكوب تمثال مجسم
برنامج حلقة وثائقي كوميديا
زائر سائح حاج مرشد صحفي مذيع مقدم
تأشيرة إنترنت مفاتيح
بطانية فوطة مجفف
`.split(/\s+/).filter(Boolean);

const toAdd = new Map<string, string>();

function consider(pretty: string) {
  if (!pretty || DROP.has(pretty)) return;
  const n = normalizeWord(pretty);
  if ([...n].length !== 5) return;
  if (DROP.has(n)) return;
  if (answerSet.has(n) || prettySet.has(pretty)) return;
  if (toAdd.has(n)) return;
  toAdd.set(n, pretty);
}

for (const w of curated) consider(w);

// Clean مـ…ة from guesses
const badSuffix = /(تك|ته|هم|كم|نا|ني|ها|وه|اه)$/;
for (const g of VALID_GUESSES) {
  if ([...g].length !== 5) continue;
  if (!g.startsWith("م")) continue;
  if (!(g.endsWith("ه") || g.endsWith("ة"))) continue;
  if (badSuffix.test(g)) continue;
  if (/^(مت|مست)/.test(g)) {
    const allowPrefix = /^(متاح|متجه|متصل|مثير|مجهز|محدد|مخلص|مذهل|مزعج|مصاب|مطلق|مظلم|معطل|مميز|مهتم|مهدد|متاحه|متجهة|متصلة)/;
    if (!allowPrefix.test(g)) continue;
  }
  const pretty = g.endsWith("ه") ? `${g.slice(0, -1)}ة` : g;
  const rare = [...normalizeWord(pretty)].filter((c) => "ظذزضثصط".includes(c)).length;
  if (rare >= 2) continue;
  consider(pretty);
}

// Form VII / X verbs from guesses
for (const g of VALID_GUESSES) {
  if ([...g].length !== 5) continue;
  if (!(/^(ان|است)/.test(g))) continue;
  if (badSuffix.test(g)) continue;
  if (DROP.has(g)) continue;
  // skip conjugated with ت/ي endings that are clearly past-tense person marks for weak verbs? keep most
  if (/^(انجلس|انجلو|اندرو|اندري|انتون|انطون|انستي|انيتا)/.test(g)) continue;
  if (/ت$/.test(g) && /^(ان|است)/.test(g)) {
    // انتهت ok, انجبت maybe skip person forms ending ت for transitive?
    // keep many: انتهت، استعد is not ت
  }
  // Prefer dictionary lemmas without object clitics already filtered
  if (/ك$/.test(g) || /ه$/.test(g)) continue; // انقذه etc.
  consider(g);
}

let list = [...toAdd.entries()].map(([n, p]) => ({ n, p }));
list.sort((a, b) => a.p.localeCompare(b.p, "ar"));

const need = TARGET - ANSWERS.length;
if (list.length > need) list = list.slice(0, need);

console.log("will add", list.length, "→", ANSWERS.length + list.length);

// Apply to words-data
const path = "/workspace/src/lib/game/words-data.ts";
let src = readFileSync(path, "utf8");
const answersMatch = src.match(/export const ANSWERS: string\[\] = \[([^\]]+)\];/);
if (!answersMatch) throw new Error("no answers");
const answers = answersMatch[1]
  .split(",")
  .map((s) => s.trim().replace(/^"|"$/g, ""))
  .filter(Boolean);

for (const { n } of list) {
  if (!answers.includes(n)) answers.push(n);
}

src = src.replace(
  /export const ANSWERS: string\[\] = \[[^\]]+\];/,
  "export const ANSWERS: string[] = [" + answers.map((w) => `"${w}"`).join(",") + "];",
);

let displayInsert = "";
for (const { n, p } of list) {
  if (!src.includes(`"${n}":`)) {
    displayInsert += `\n  "${n}": "${p}",`;
  }
}
if (displayInsert) {
  src = src.replace(
    /\n\};\n\nexport const VALID_GUESSES/,
    `${displayInsert}\n};\n\nexport const VALID_GUESSES`,
  );
}
writeFileSync(path, src);

const COMMONISH = new Set([
  "إنسان",
  "إنتاج",
  "انتشر",
  "انتقل",
  "انطلق",
  "استعد",
  "استلم",
  "مستشفى",
  "مسجد",
  "متجر",
  "مجلس",
  "معرض",
  "مهندس",
  "موسيقى",
  "برنامج",
  "حارسة",
  "لاعبة",
  "ممثلة",
  "مريضة",
  "مشكلة",
]);
const RARE = new Set([
  "فرقاطة",
  "طراد",
  "كريبتون",
  "هيليوم",
  "نيون",
  "جرانيت",
  "ألمنيوم",
  "نايلون",
]);

function tierFor(pretty: string, norm: string): UsageTier {
  if (RARE.has(pretty) || RARE.has(norm)) return "rare";
  if (COMMONISH.has(pretty) || COMMONISH.has(norm)) return "common";
  if (pretty.startsWith("م") && pretty.endsWith("ة")) return "familiar";
  if (/^(ان|است)/.test(norm)) return "familiar";
  return "familiar";
}

const existing: Record<string, UsageTier> = { ...(WORD_TIERS as Record<string, UsageTier>) };
for (const { n, p } of list) existing[n] = tierFor(p, n);

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

console.log("answers file", answers.length);
console.log("unique", new Set(answers).size);
console.log("sample", list.slice(0, 20).map((x) => x.p).join("، "));
