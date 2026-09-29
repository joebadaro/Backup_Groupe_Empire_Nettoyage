import { readFileSync } from "fs";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_URL ?? "http://127.0.0.1:4323";
const WIDTHS = [375, 768, 1440];

function sectionOrder(html) {
  const markers = [
    { id: "hero", idx: html.indexOf('class="hero-section"') },
    { id: "trust", idx: html.indexOf("trust-container") },
    { id: "teaser", idx: html.indexOf("presentation-home-teaser") },
    { id: "services", idx: html.indexOf("section-services") },
    { id: "qualityTeam", idx: html.indexOf("section-quality-strip-refined") },
  ];
  return markers.filter((m) => m.idx >= 0).sort((a, b) => a.idx - b.idx);
}

const distFr = readFileSync("dist/index.html", "utf8");
const distEn = readFileSync("dist/en/index.html", "utf8");

const staticChecks = {
  frTeaserCount: (distFr.match(/presentation-home-teaser/g) || []).length,
  enTeaserCount: (distEn.match(/presentation-home-teaser/g) || []).length,
  frOrder: sectionOrder(distFr).map((m) => m.id),
  enOrder: sectionOrder(distEn).map((m) => m.id),
  frAfterQuality: distFr.indexOf("presentation-home-teaser") > distFr.indexOf("section-quality-strip-refined"),
  noYoutubeHome: !/<iframe[^>]+youtube\.com/i.test(distFr) && !/<iframe[^>]+youtube\.com/i.test(distEn),
  galleryFr: readFileSync("dist/realisations-video/index.html", "utf8").includes('href="/presentation/"'),
  galleryEn: readFileSync("dist/en/video-gallery/index.html", "utf8").includes('href="/en/presentation/"'),
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const layout = [];

for (const [path, href, titleSnippet] of [
  ["/", "/presentation/", "Découvrez Groupe Nettoyage Empire"],
  ["/en/", "/en/presentation/", "Discover Groupe Nettoyage Empire"],
]) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const teaserCount = await page.locator(".presentation-home-teaser").count();
    const cardHref = await page.locator(".presentation-home-teaser__card").getAttribute("href");
    const heroHtmlBefore = await page.evaluate(() => {
      const hero = document.querySelector(".hero-section");
      const teaser = document.querySelector(".presentation-home-teaser");
      const services = document.querySelector(".section-services");
      const quality = document.querySelector(".section-quality-strip-refined");
      if (!hero || !teaser || !services) return null;
      return {
        teaserAfterHero: hero.compareDocumentPosition(teaser) & Node.DOCUMENT_POSITION_FOLLOWING,
        teaserBeforeServices: teaser.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING,
        teaserBeforeQuality: quality
          ? teaser.compareDocumentPosition(quality) & Node.DOCUMENT_POSITION_FOLLOWING
          : true,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    const img = page.locator(".presentation-home-teaser__thumb").first();
    const distorted = await img.evaluate((el) => {
      const nw = el.naturalWidth;
      const nh = el.naturalHeight;
      if (!nw || !nh) return false;
      return Math.abs(nw / nh - el.clientWidth / el.clientHeight) > 0.12;
    });
    layout.push({ path, width, teaserCount, cardHref, ...heroHtmlBefore, distorted });
  }
}

await page.goto(`${BASE}/presentation/`, { waitUntil: "networkidle" });
await page.locator("[data-svp-open]").first().click();
await page.locator("dialog iframe").waitFor({ state: "attached", timeout: 15000 });
await browser.close();

console.log(JSON.stringify({ staticChecks, layout, videoModalOk: true }, null, 2));
