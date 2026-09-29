/**
 * Captures header choice modal (FR/EN, desktop + narrow desktop).
 * Usage: PREVIEW_URL=http://localhost:4321 node scripts/capture-header-choice-modal.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";

async function captureModal(browser, name, path, viewport) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#btn-open-estimation", { timeout: 10000 });
  await page.click("#btn-open-estimation");
  await page.waitForSelector("#header-choice-modal:not([hidden])", {
    timeout: 5000,
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, name), fullPage: false });
  await context.close();
  console.log(`Saved ${name}`);
}

const browser = await chromium.launch();
try {
  await captureModal(browser, "header-choice-desktop-fr.png", "/", {
    width: 1280,
    height: 800,
  });
  await captureModal(browser, "header-choice-narrow-fr.png", "/", {
    width: 1100,
    height: 800,
  });
  await captureModal(browser, "header-choice-desktop-en.png", "/en/", {
    width: 1280,
    height: 800,
  });
  await captureModal(browser, "header-choice-narrow-en.png", "/en/", {
    width: 1100,
    height: 800,
  });
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
