/**
 * Captures auto pop-ups for each debug scenario (10 s delay).
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-auto-popup.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
const DELAY_MS = 10500;

const scenarios = [
  { param: "weekday_evening", label: "evening", expectPopup: true },
  { param: "weekend", label: "weekend", expectPopup: true },
  { param: "after_hours", label: "closed-no-popup", expectPopup: false },
  { param: "weekday_day", label: "weekday-day-no-popup", expectPopup: false },
];

async function captureLocale(browser, localePath, suffix) {
  for (const scenario of scenarios) {
    const page = await browser.newPage();
    await page.setViewportSize(
      suffix.startsWith("mobile") ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    );
    await page.goto(`${baseUrl}${localePath}?headerModalDebug=${scenario.param}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(DELAY_MS);

    const popupOpen = await page
      .locator("#after-hours-phone-popup")
      .evaluate((el) => !el.hidden)
      .catch(() => false);

    const title = popupOpen
      ? (await page.locator("#ah-popup-title").textContent())?.trim()
      : "(no popup)";

    const name = `auto-popup-${scenario.label}-${suffix}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: false });
    console.log(`Saved ${name} — popup=${popupOpen} title="${title}"`);
    await page.close();
  }
}

const browser = await chromium.launch();
try {
  await captureLocale(browser, "/", "desktop-fr");
  await captureLocale(browser, "/", "mobile-fr");
  await captureLocale(browser, "/en/", "mobile-en");
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
