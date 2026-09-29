/**
 * Captures popup preview screenshots (dev only, uses ?ahPopupDebug=1).
 * Usage: npx playwright install chromium (once), then node scripts/capture-popup-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";

async function captureCtaHierarchy(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/services/tapis-residentiel/`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".conversion-cta-priority", { timeout: 10000 });
  const cta = page.locator(".conversion-cta-priority").first();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(outDir, "cta-hierarchy-service-fr.png"),
    fullPage: false,
  });
  await context.close();
  console.log("Saved cta-hierarchy-service-fr.png");
}

async function capture(browser, name, path, viewport) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?ahPopupDebug=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("#after-hours-phone-popup:not([hidden])", { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, name), fullPage: false });
  await context.close();
  console.log(`Saved ${name}`);
}

const browser = await chromium.launch();

try {
  await capture(browser, "popup-desktop-fr.png", "/", { width: 1280, height: 800 });
  await capture(browser, "popup-mobile-fr.png", "/", { width: 390, height: 844 });
  await capture(browser, "popup-desktop-en.png", "/en/", { width: 1280, height: 800 });
  await capture(browser, "popup-mobile-en.png", "/en/", { width: 390, height: 844 });
  await captureCtaHierarchy(browser);
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
