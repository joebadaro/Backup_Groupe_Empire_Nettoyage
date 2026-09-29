/**
 * Verify production hero laptop fix via computed styles (Playwright).
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const COMMIT = "92f39b0";

const LAPTOP = [
  { name: "1366x768", width: 1366, height: 768, compact: true },
  { name: "1536x864", width: 1536, height: 864, compact: true },
  { name: "1600x900", width: 1600, height: 900, compact: true },
  { name: "1920x1080", width: 1920, height: 1080, compact: false },
];
const OTHER = [
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];
const PATHS = ["/", "/en/"];

async function isCompactLive(page) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".hero-section");
  const padTop = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".hero-section")).paddingTop,
  );
  return padTop === "72px" || padTop === "84px";
}

async function waitForLive(maxMs = 900000) {
  const browser = await chromium.launch();
  const start = Date.now();
  let attempt = 0;
  try {
    while (Date.now() - start < maxMs) {
      attempt += 1;
      const page = await browser.newPage();
      try {
        const live = await isCompactLive(page);
        console.log(`[${new Date().toISOString()}] attempt ${attempt}: compactLive=${live}`);
        if (live) return { attempts: attempt, liveAt: new Date().toISOString() };
      } finally {
        await page.close();
      }
      await new Promise((r) => setTimeout(r, 15000));
    }
    throw new Error("timeout");
  } finally {
    await browser.close();
  }
}

async function measure(browser, path, vp) {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".hero-section");
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const r = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
    };
    const hero = document.querySelector(".hero-section");
    const hs = getComputedStyle(hero);
    const title = document.querySelector(".hero-title");
    const primary = document.querySelector(
      ".hero-actions a[href^='tel:'], .hero-actions .conversion-cta-primary",
    );
    const secondary = document.querySelector(".hero-actions .conversion-cta-secondary");
    const trust = document.querySelector(".trust-container");
    const teaser = document.querySelector(".presentation-home-teaser");
    const scrollNeed = (el) =>
      el ? Math.max(0, Math.round(el.getBoundingClientRect().bottom - innerHeight)) : 0;
    const titleBox = title?.getBoundingClientRect();
    return {
      padTop: hs.paddingTop,
      padBottom: hs.paddingBottom,
      titleSize: title ? getComputedStyle(title).fontSize : null,
      titleVisible: titleBox ? titleBox.top >= 0 && titleBox.bottom <= innerHeight : false,
      subtitle: r(".hero-subtitle-group"),
      primary: r(".hero-actions a[href^='tel:'], .hero-actions .conversion-cta-primary"),
      secondary: r(".hero-actions .conversion-cta-secondary"),
      scrollPrimary: scrollNeed(primary),
      scrollSecondary: scrollNeed(secondary),
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      teaserGap:
        trust && teaser
          ? Math.round(teaser.getBoundingClientRect().top - trust.getBoundingClientRect().bottom)
          : null,
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
    };
  });
  await page.close();
  return { ...m, errors: errors.slice(0, 3), compactExpected: vp.compact ?? null };
}

const deploy = await waitForLive();
console.log("DEPLOY", deploy);

const browser = await chromium.launch();
const report = { commit: COMMIT, deploy, results: [] };
try {
  for (const path of PATHS) {
    for (const vp of [...LAPTOP, ...OTHER.map((v) => ({ ...v, compact: null }))]) {
      const row = await measure(browser, path, vp);
      report.results.push({ path, viewport: vp.name, ...row });
      console.log(JSON.stringify({ path, viewport: vp.name, ...row }));
    }
  }
} finally {
  await browser.close();
}

const fails = [];
for (const row of report.results) {
  if (row.overflowX) fails.push(`${row.path} ${row.viewport} overflow`);
  if (row.viewport !== "mobile-390" && row.viewport !== "tablet-768") {
    if (row.scrollPrimary > 0) fails.push(`${row.path} ${row.viewport} primary scroll`);
    if (row.scrollSecondary > 0) fails.push(`${row.path} ${row.viewport} secondary scroll`);
  }
  if (row.compactExpected === true && row.padTop === "192px")
    fails.push(`${row.path} ${row.viewport} still full padding`);
  if (row.compactExpected === false && row.padTop !== "192px")
    fails.push(`${row.path} ${row.viewport} expected full padding`);
}
if (fails.length) {
  console.error("FAILS", fails);
  process.exit(1);
}
console.log("ALL_OK");
