/**
 * Measure overlap between trust band and presentation teaser on homepage.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/presentation-teaser-spacing");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";
const browser = await chromium.launch();

async function measure(path, viewport, label) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.querySelectorAll(".fade-in-section").forEach((el) => {
      el.classList.add("is-visible");
    });
  });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const trust = document.querySelector(".trust-container");
    const teaser = document.querySelector(".presentation-home-teaser");
    const card = document.querySelector(".presentation-home-teaser__card");
    const hero = document.querySelector(".hero-section");
    if (!trust || !teaser || !card || !hero) return null;

    const trustRect = trust.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const teaserRect = teaser.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const trustStyle = window.getComputedStyle(trust);
    const teaserStyle = window.getComputedStyle(teaser);

    return {
      overlapPx: Math.round(trustRect.bottom - cardRect.top),
      gapPx: Math.round(cardRect.top - trustRect.bottom),
      trustBottom: Math.round(trustRect.bottom),
      cardTop: Math.round(cardRect.top),
      heroBottom: Math.round(heroRect.bottom),
      trustPosition: trustStyle.position,
      trustMarginTop: trustStyle.marginTop,
      teaserMarginTop: teaserStyle.marginTop,
      teaserPaddingTop: teaserStyle.paddingTop,
    };
  });

  await page.screenshot({
    path: join(outDir, `${label}.png`),
    fullPage: false,
  });
  console.log(JSON.stringify({ label, viewport, metrics }, null, 2));
  await page.close();
  return metrics;
}

for (const width of [1024, 1280, 1440, 1600, 1920]) {
  await measure("/", { width, height: 900 }, `desktop-${width}-before-fr`);
}
await measure("/", { width: 768, height: 1024 }, "tablet-768-before-fr");
await measure("/", { width: 390, height: 844 }, "mobile-390-before-fr");
await measure("/en/", { width: 1280, height: 900 }, "desktop-1280-before-en");

await browser.close();
