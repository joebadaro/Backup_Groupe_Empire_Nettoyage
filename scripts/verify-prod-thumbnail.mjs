import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const POSTER = "/images/videos/video-presentation-groupe-nettoyage-empire-team.webp";
const OLD = ["video-presentation-groupe-nettoyage-empire-fr.webp", "video-presentation-groupe-nettoyage-empire-en.webp"];

const report = {
  videos: {},
  layout: [],
  consoleErrors: [],
  networkErrors: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") report.consoleErrors.push(msg.text());
});
page.on("response", (res) => {
  const u = res.url();
  if (res.status() >= 400 && u.includes("groupenettoyageempire.com")) {
    report.networkErrors.push({ status: res.status(), url: u });
  }
});

async function checkPages(width) {
  for (const path of [
    "/presentation/",
    "/en/presentation/",
    "/",
    "/en/",
    "/realisations-video/",
    "/en/video-gallery/",
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const img = page.locator(`img[src="${POSTER}"]`).first();
    const count = await page.locator(`img[src="${POSTER}"]`).count();
    let distorted = false;
    if (count > 0) {
      const natural = await img.evaluate((el) => ({
        nw: el.naturalWidth,
        nh: el.naturalHeight,
        cw: el.clientWidth,
        ch: el.clientHeight,
      }));
      distorted =
        Math.abs(natural.nw / natural.nh - natural.cw / natural.ch) > 0.12;
    }
    const html = await page.content();
    report.layout.push({
      path,
      width,
      posterCount: count,
      distorted,
      horizontalOverflow: await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
      hasOldPoster: OLD.some((o) => html.includes(o)),
    });
  }
}

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
  const src = await iframe.getAttribute("src");
  await page.locator(`dialog#svp-modal-${id} [data-svp-close]`).click();
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
  await page.locator("[data-svp-open]").first().click();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
  report.videos[`${locale}-${width}`] = {
    beforeIframes: before,
    embedOk: src?.includes(id) ?? false,
    closeOk: true,
  };
}

await checkPages(375);
await checkPages(1440);
await testVideo("fr", 375);
await testVideo("en", 375);
await testVideo("fr", 1440);
await testVideo("en", 1440);

await browser.close();
console.log(JSON.stringify(report, null, 2));
