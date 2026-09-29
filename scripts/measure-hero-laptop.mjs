/**
 * Mesure hero + CTA sur viewports laptop (homepage FR).
 * Usage: node scripts/measure-hero-laptop.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/hero-laptop-compact");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";

const viewports = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x800", width: 1440, height: 800 },
  { name: "1536x864", width: 1536, height: 864 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1920x1200", width: 1920, height: 1200 },
];

async function measureViewport(browser, vp) {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".hero-section", { timeout: 15000 });
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        visible: r.bottom <= window.innerHeight && r.top >= 0,
        partiallyVisible: r.top < window.innerHeight && r.bottom > 0,
      };
    };

    const header = document.querySelector(".site-header");
    const topBar = document.querySelector(".header-top");
    const mainNav = document.querySelector(".header-main");
    const hero = document.querySelector(".hero-section");
    const badge = document.querySelector(".hero-badge");
    const title = document.querySelector(".hero-title");
    const subtitle = document.querySelector(".hero-subtitle-group");
    const actions = document.querySelector(".hero-actions.conversion-cta-priority");
    const primaryBtn = actions?.querySelector("a[href^='tel:'], .btn-primary, .conversion-cta-primary");
    const secondaryBtn = actions?.querySelector(".conversion-cta-secondary");

    const heroStyle = hero ? getComputedStyle(hero) : null;

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      headerTotal: rect(header),
      topBar: rect(topBar),
      mainNav: rect(mainNav),
      hero: rect(hero),
      heroPadding: heroStyle
        ? {
            top: heroStyle.paddingTop,
            bottom: heroStyle.paddingBottom,
            minHeight: heroStyle.minHeight,
          }
        : null,
      badge: rect(badge),
      title: rect(title),
      subtitle: rect(subtitle),
      actions: rect(actions),
      primaryBtn: rect(primaryBtn),
      secondaryBtn: rect(secondaryBtn),
      scrollToSeePrimary: primaryBtn
        ? Math.max(0, Math.round(primaryBtn.getBoundingClientRect().top - window.innerHeight + 1))
        : null,
      scrollToSeeSecondary: secondaryBtn
        ? Math.max(0, Math.round(secondaryBtn.getBoundingClientRect().bottom - window.innerHeight))
        : null,
      titleFontSize: title ? getComputedStyle(title).fontSize : null,
    };
  });

  const shotName = `hero-${vp.name}.png`;
  await page.screenshot({
    path: join(outDir, shotName),
    fullPage: false,
  });

  await context.close();
  return { viewport: vp.name, ...data, screenshot: shotName };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const vp of viewports) {
    const row = await measureViewport(browser, vp);
    results.push(row);
    console.log(JSON.stringify(row, null, 0));
  }
} finally {
  await browser.close();
}

writeFileSync(join(outDir, "measurements.json"), JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} screenshots + measurements.json in ${outDir}`);
