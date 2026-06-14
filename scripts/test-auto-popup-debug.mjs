/**
 * Tests auto popup debug reload + 10s delay + weekday_day no popup.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/test-auto-popup-debug.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

const browser = await chromium.launch();

for (const [label, param, expectPopup] of [
  ["FR evening reload 1", "weekday_evening", true],
  ["FR evening reload 2", "weekday_evening", true],
  ["FR closed no auto popup", "after_hours", false],
  ["FR weekday day no popup", "weekday_day", false],
]) {
  for (let reload = 0; reload < (label.includes("reload") ? 2 : 1); reload++) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const start = Date.now();
    await page.goto(`${baseUrl}/?headerModalDebug=${param}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(10500);
    const elapsed = Date.now() - start;

    const popupOpen = await page
      .locator("#after-hours-phone-popup")
      .evaluate((el) => !el.hidden);

    const title = popupOpen
      ? (await page.locator("#ah-popup-title").textContent())?.trim()
      : null;

    check(`${label}${reload ? ` #${reload + 1}` : ""}`, popupOpen === expectPopup, {
      elapsedMs: elapsed,
      title,
      errors,
      delayOk: elapsed >= 10000 && elapsed < 14000,
    });

    await page.close();
  }
}

const page = await browser.newPage();
await page.goto(`${baseUrl}/?headerModalDebug=weekday_evening`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(10500);
const popupOpen = await page
  .locator("#after-hours-phone-popup")
  .evaluate((el) => !el.hidden);
await page.waitForTimeout(3000);
const stillOpen = await page
  .locator("#after-hours-phone-popup")
  .evaluate((el) => !el.hidden);
check("Popup stays open until manual close", popupOpen && stillOpen);
await page.close();

await browser.close();
process.exit(failed > 0 ? 1 : 0);
