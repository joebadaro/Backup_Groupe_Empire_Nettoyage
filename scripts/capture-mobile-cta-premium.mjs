/**
 * Premium mobile sticky CTA — visual verification captures.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-mobile-cta-premium.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

async function measureButton(page) {
  return page.locator("#btn-mobile-representative").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      minHeight: cs.minHeight,
      padding: cs.padding,
      fontSize: cs.fontSize,
    };
  });
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, name), fullPage: false });
  console.log(`Saved ${name}`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const dims390 = await measureButton(page);
  console.log("Dimensions 390px:", JSON.stringify(dims390));
  await shot(page, "mobile-cta-premium-390-normal.png");

  await page.locator("#btn-mobile-representative").focus();
  await shot(page, "mobile-cta-premium-390-focus.png");

  await page.locator("#btn-mobile-representative").hover({ force: true });
  await shot(page, "mobile-cta-premium-390-hover.png");

  await page.goto(`${baseUrl}/services/tapis/`, { waitUntil: "networkidle" });
  await shot(page, "mobile-cta-premium-service-390.png");

  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const dims = await measureButton(page);
    console.log(`Dimensions ${width}px:`, JSON.stringify(dims));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const urlBefore = page.url();
  await page.evaluate(() => {
    document.getElementById("btn-mobile-representative")?.click();
  });
  await page.waitForSelector("#header-choice-modal:not([hidden])");
  const modalOpen = await page
    .locator("#header-choice-modal")
    .evaluate((el) => !el.hidden);
  console.log(
    "Modal test:",
    JSON.stringify({ modalOpen, navigated: page.url() !== urlBefore }),
  );
} finally {
  await browser.close();
}

console.log(`Screenshots in ${outDir}`);
