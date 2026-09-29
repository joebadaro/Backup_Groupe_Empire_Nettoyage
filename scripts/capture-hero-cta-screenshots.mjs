/**
 * Captures hero CTA hierarchy on homepage (FR).
 * Usage: node scripts/capture-hero-cta-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";

async function captureHero(browser, name, viewport) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".hero-actions.conversion-cta-priority", {
    timeout: 10000,
  });
  const cta = page.locator(".hero-actions.conversion-cta-priority").first();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, name),
    fullPage: false,
  });
  await context.close();
  console.log(`Saved ${name}`);
}

const browser = await chromium.launch();
try {
  await captureHero(browser, "hero-cta-desktop-fr.png", {
    width: 1280,
    height: 900,
  });
  await captureHero(browser, "hero-cta-mobile-fr.png", {
    width: 769,
    height: 900,
  });
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
