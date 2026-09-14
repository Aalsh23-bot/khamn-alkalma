import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/opt/cursor/artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
await page.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/opt/cursor/artifacts/eng_01_home_challenge.png", fullPage: true });
console.log("has challenge", await page.locator("text=تحدّي الأصدقاء").count());

await page.getByRole("button", { name: /تحدّي الأصدقاء/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/opt/cursor/artifacts/eng_02_challenge_play.png", fullPage: true });
console.log("header", await page.locator("h1").first().innerText());

// Open stats from header
await page.getByRole("button", { name: "الإحصائيات" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/opt/cursor/artifacts/eng_03_stats_calendar_badges.png", fullPage: true });
console.log("calendar", await page.locator("text=تقويم كلمة اليوم").count());
console.log("badges", await page.locator("text=الشارات").count());
await page.getByRole("button", { name: "إغلاق" }).click().catch(async () => {
  await page.keyboard.press("Escape");
});
await page.waitForTimeout(300);

// Create shareable URL via evaluate encode path: finish isn't needed —
// just check challenge toast / board exists
console.log("board tiles", await page.locator(".size-10, [class*=tile]").count());

await browser.close();
