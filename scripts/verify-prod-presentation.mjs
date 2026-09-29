import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const report = { videos: {}, ctas: {}, layout: [], consoleErrors: [], networkErrors: [] };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") report.consoleErrors.push(msg.text());
});
page.on("response", (res) => {
  const u = res.url();
  if (
    res.status() >= 400 &&
    (u.includes("groupenettoyageempire.com") || u.includes("youtube.com"))
  ) {
    report.networkErrors.push({ status: res.status(), url: u });
  }
});

async function testVideo(locale, width) {
  const id = locale === "fr" ? "qN362y2IN_0" : "Ayk97N_OxDQ";
  const path = locale === "fr" ? "/presentation/" : "/en/presentation/";
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  const before = await page.locator('iframe[src*="youtube.com"]').count();
  await page.locator("[data-svp-open]").first().click();
  const dialog = page.locator(`dialog#svp-modal-${id}`);
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  const iframe = page.locator(`dialog#svp-modal-${id} iframe[src*="youtube.com"]`);
  await iframe.waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(3000);
  const src = await iframe.getAttribute("src");
  await page.locator(`dialog#svp-modal-${id} [data-svp-close]`).click();
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
  await page.locator("[data-svp-open]").first().click();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
  report.videos[`${locale}-${width}`] = {
    beforeIframes: before,
    embedSrc: src,
    played: src?.includes(id) ?? false,
    closeOk: true,
  };
}

async function testCta(locale) {
  const path = locale === "fr" ? "/presentation/" : "/en/presentation/";
  const dest = locale === "fr" ? "demande-estimation" : "estimate-request";
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  const tel = await page
    .locator('.presentation-cta a[href^="tel:"]')
    .first()
    .getAttribute("href");
  await Promise.all([
    page.waitForURL(`**/${dest}**`, { timeout: 15000 }),
    page.locator(".presentation-cta button").click(),
  ]);
  report.ctas[locale] = { tel, estimateUrl: page.url() };
}

for (const w of [375, 1440]) {
  await testVideo("fr", w);
  await testVideo("en", w);
}
await testCta("fr");
await testCta("en");

for (const path of ["/presentation/", "/en/presentation/"]) {
  for (const w of [375, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    report.layout.push({ path, width: w, horizontalOverflow });
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
