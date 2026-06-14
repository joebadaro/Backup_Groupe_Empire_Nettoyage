/**
 * Captures primary call button two-line layout (modal + popup).
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-primary-call-button.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

const browser = await chromium.launch();

async function captureModal(path, viewport, name) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=weekday_day`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => window.__openHeaderChoiceModal?.());
  await page.waitForSelector("#header-choice-modal-primary-call:not([hidden])");
  await page.waitForTimeout(400);
  const btn = page.locator("#header-choice-modal-primary-call");
  await btn.screenshot({ path: join(outDir, `primary-call-modal-${name}.png`) });
  console.log(`Saved primary-call-modal-${name}.png`);
  await page.close();
}

async function capturePopup(path, viewport, name) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=weekday_evening`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(10500);
  await page.waitForSelector("#ah-popup-primary-call:not([hidden])");
  await page.waitForTimeout(300);
  const btn = page.locator("#ah-popup-primary-call");
  await btn.screenshot({ path: join(outDir, `primary-call-popup-${name}.png`) });
  console.log(`Saved primary-call-popup-${name}.png`);
  await page.close();
}

await captureModal("/", { width: 390, height: 844 }, "mobile-fr");
await captureModal("/", { width: 1280, height: 800 }, "desktop-fr");
await captureModal("/en/", { width: 390, height: 844 }, "mobile-en");
await captureModal("/en/", { width: 1280, height: 800 }, "desktop-en");

await capturePopup("/", { width: 390, height: 844 }, "mobile-fr");
await capturePopup("/en/", { width: 1280, height: 800 }, "desktop-en");

await browser.close();
console.log(`Screenshots in ${outDir}`);
