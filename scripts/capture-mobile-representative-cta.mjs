/**
 * Mobile UX screenshots for representative sticky CTA + hero visibility.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-mobile-representative-cta.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: join(outDir, name),
    fullPage: false,
  });
  console.log(`Saved ${name}`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await shot(page, "mobile-home-fr-390-before-modal.png");
  await page.evaluate(() => {
    document.getElementById("btn-mobile-representative")?.click();
  });
  await page.waitForSelector("#header-choice-modal:not([hidden])");
  await shot(page, "mobile-home-fr-390-modal-open.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.goto(`${baseUrl}/services/tapis/`, { waitUntil: "networkidle" });
  await shot(page, "mobile-service-fr-390.png");

  await page.goto(`${baseUrl}/en/`, { waitUntil: "networkidle" });
  await shot(page, "mobile-home-en-390-before-modal.png");

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await shot(page, "viewport-768-fr.png");

  await page.setViewportSize({ width: 769, height: 1024 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await shot(page, "viewport-769-fr-desktop-hero-cta.png");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await shot(page, "desktop-fr-hero-cta-visible.png");
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
