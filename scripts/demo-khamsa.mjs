import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "ar",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, "live-01-home.png"), fullPage: false });
console.log("home ok", await page.locator("h1").innerText().catch(() => "no h1"));

// Click daily card
const daily = page.getByRole("button", { name: /كلمة اليوم/ });
await daily.click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(out, "live-02-daily.png"), fullPage: false });
console.log("after daily", await page.locator("body").innerText().then(t => t.slice(0, 200)));

// Close help if open
const closeHelp = page.getByRole("button", { name: /إغلاق|فهمت|حسنا|X/i }).first();
if (await closeHelp.isVisible().catch(() => false)) {
  await closeHelp.click();
  await page.waitForTimeout(300);
}
// Also try dialog close
const dialogClose = page.locator('[aria-label="إغلاق"], button:has-text("حسناً"), button:has-text("فهمت")').first();
if (await dialogClose.isVisible().catch(() => false)) {
  await dialogClose.click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: path.join(out, "live-03-board.png"), fullPage: false });

// Type a guess via on-screen keys
async function tapKey(label) {
  const btn = page.getByRole("button", { name: label, exact: true }).first();
  if (await btn.count()) {
    await btn.click();
    return true;
  }
  // fallback: button with text
  const b2 = page.locator(`button:text-is("${label}")`).first();
  if (await b2.count()) {
    await b2.click();
    return true;
  }
  console.log("missing key", label);
  return false;
}

for (const ch of ["ك", "ت", "ا", "ب", "ة"]) {
  await tapKey(ch);
  await page.waitForTimeout(80);
}
await tapKey("إدخال");
await page.waitForTimeout(2200);
await page.screenshot({ path: path.join(out, "live-04-after-guess.png"), fullPage: false });

// Home then stages
const homeBtn = page.getByRole("button", { name: /الرئيسية|المنزل|رجوع/ }).first();
if (await homeBtn.isVisible().catch(() => false)) {
  await homeBtn.click();
} else {
  // click first header button (home)
  await page.locator("header button").first().click();
}
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, "live-05-back-home.png"), fullPage: false });

const stages = page.getByRole("button", { name: /المراحل/ });
await stages.click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(out, "live-06-stages.png"), fullPage: false });

console.log("done", fs.readdirSync(out).filter(f => f.startsWith("live-")));
await browser.close();
