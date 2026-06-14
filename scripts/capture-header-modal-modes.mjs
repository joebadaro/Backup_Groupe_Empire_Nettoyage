/**
 * Captures HeaderChoiceModal for each debug mode (FR desktop + mobile).
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-header-modal-modes.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

const modes = [
  { param: "weekday_day", label: "weekday-day" },
  { param: "weekday_evening", label: "weekday-evening" },
  { param: "weekend", label: "weekend" },
  { param: "after_hours", label: "after-hours" },
];

async function openModal(page) {
  await page.evaluate(() => {
    document.getElementById("btn-mobile-representative")?.click();
  });
  await page.waitForSelector("#header-choice-modal:not([hidden])", {
    timeout: 8000,
  });
  await page.waitForTimeout(400);
}

async function capture(browser, localePath, viewport, suffix) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);

  for (const mode of modes) {
    await page.goto(`${baseUrl}${localePath}?headerModalDebug=${mode.param}`, {
      waitUntil: "networkidle",
    });
    await openModal(page);
    const title = await page.locator("#header-choice-modal-title").textContent();
    const name = `header-modal-${mode.label}-${suffix}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: false });
    console.log(`Saved ${name} — "${title?.trim()}"`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }

  await page.close();
}

const browser = await chromium.launch();
try {
  await capture(browser, "/", { width: 1280, height: 800 }, "desktop-fr");
  await capture(browser, "/", { width: 390, height: 844 }, "mobile-fr");
  await capture(browser, "/en/", { width: 1280, height: 800 }, "desktop-en");
  await capture(browser, "/en/", { width: 390, height: 844 }, "mobile-en");
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
