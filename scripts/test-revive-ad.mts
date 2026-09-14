import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/opt/cursor/artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
await page.goto("http://127.0.0.1:4175/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /كلمة اليوم/ }).click();
await page.waitForTimeout(400);

async function guess(word: string) {
  for (const ch of [...word]) {
    await page.locator("button.keycap", { hasText: new RegExp(`^${ch}$`) }).first().click();
    await page.waitForTimeout(40);
  }
  await page.getByRole("button", { name: "إدخال" }).click();
  await page.waitForTimeout(2300);
}

const alts = ["سيارة", "مدرسة", "حديقة", "طائرة", "نافذة", "مكتبة"];
for (const w of alts) {
  if (await page.locator("text=انتهت المحاولات").count()) break;
  if (await page.locator("text=أحسنت").count()) break;
  await guess(w);
}

await page.waitForTimeout(500);
await page.screenshot({ path: "/opt/cursor/artifacts/fix_revive_01_result.png", fullPage: true });
let lost = await page.locator("text=انتهت المحاولات").count();
console.log({ lost, won: await page.locator("text=أحسنت").count() });

if (!lost) {
  await page.goto("http://127.0.0.1:4175/");
  await page.getByRole("button", { name: /المراحل/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.waitForTimeout(400);
  for (const w of alts) {
    if (await page.locator("text=انتهت المحاولات").count()) break;
    if (await page.locator("text=أحسنت").count()) break;
    await guess(w);
  }
  lost = await page.locator("text=انتهت المحاولات").count();
  console.log({ stagesLost: lost });
}

if (lost) {
  const cta = page.getByRole("button", { name: /إعلان|فرصة|استعادة|محاولة/ });
  console.log("cta", await cta.first().innerText());
  await cta.first().click();
  await page.waitForTimeout(400);
  console.log("result still open?", await page.locator("text=انتهت المحاولات").count());
  await page.screenshot({
    path: "/opt/cursor/artifacts/fix_revive_02_ad_countdown.png",
    fullPage: true,
  });
  await page.waitForSelector("text=جاهز للمكافأة", { timeout: 7000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/fix_revive_03_ready.png", fullPage: true });
  const claim = page.getByRole("button", { name: "استلم المكافأة" });
  console.log("claim enabled", await claim.isEnabled());
  await claim.click({ timeout: 3000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "/opt/cursor/artifacts/fix_revive_04_after_claim.png",
    fullPage: true,
  });
  const body = await page.locator("body").innerText();
  console.log({
    toast: body.includes("فرصة إضافية"),
    resultGone: !(await page.locator("text=انتهت المحاولات").count()),
    adGone: !(await page.locator("text=جاهز للمكافأة").count()),
  });
}

await browser.close();
