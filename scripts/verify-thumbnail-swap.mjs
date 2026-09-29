import { readFileSync } from "fs";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_URL ?? "http://127.0.0.1:4322";
const POSTER = "/images/videos/video-presentation-groupe-nettoyage-empire-team.webp";
const SCHEMA_THUMB = `https://groupenettoyageempire.com${POSTER}`;

const pages = [
  "/presentation/",
  "/en/presentation/",
  "/",
  "/en/",
  "/realisations-video/",
  "/en/video-gallery/",
];

const htmlChecks = [];
for (const path of pages) {
  const html = readFileSync(`dist${path.replace(/\/$/, "")}/index.html`, "utf8");
  htmlChecks.push({
    path,
    hasPoster: html.includes(POSTER),
    noOldPoster:
      !html.includes("video-presentation-groupe-nettoyage-empire-fr.webp") &&
      !html.includes("video-presentation-groupe-nettoyage-empire-en.webp"),
    noYoutubeIframeBefore: !/<iframe[^>]+youtube\.com/i.test(html),
  });
}

const frHtml = readFileSync("dist/presentation/index.html", "utf8");
const enHtml = readFileSync("dist/en/presentation/index.html", "utf8");
const schema = {
  frAlt: frHtml.includes(
    "Équipe de Groupe Nettoyage Empire et présentation de nos services professionnels",
  ),
  enAlt: enHtml.includes(
    "Groupe Nettoyage Empire team and professional cleaning services presentation",
  ),
  frSchema: frHtml.includes(`"thumbnailUrl":"${SCHEMA_THUMB}"`),
  enSchema: enHtml.includes(`"thumbnailUrl":"${SCHEMA_THUMB}"`),
  frOg: frHtml.includes(POSTER),
};

const posterRes = await fetch(`${BASE}${POSTER}`);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function testVideo(path, id, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const img = page.locator(`img[src="${POSTER}"]`).first();
  const box = await img.boundingBox();
  const natural = await img.evaluate((el) => ({
    nw: el.naturalWidth,
    nh: el.naturalHeight,
    cw: el.clientWidth,
    ch: el.clientHeight,
  }));
  const ratioNatural = natural.nw / natural.nh;
  const ratioBox = natural.cw / natural.ch;
  const before = await page.locator('iframe[src*="youtube.com"]').count();
  await page.locator("[data-svp-open]").first().click();
  const dialog = page.locator(`dialog#svp-modal-${id}`);
  await dialog.waitFor({ state: "visible" });
  await page.locator(`dialog#svp-modal-${id} iframe`).waitFor({ state: "attached" });
  await page.locator(`dialog#svp-modal-${id} [data-svp-close]`).click();
  await dialog.waitFor({ state: "hidden" });
  return {
    width,
    beforeIframes: before,
    distorted: Math.abs(ratioNatural - ratioBox) > 0.12,
    played: true,
  };
}

const videoTests = {
  fr375: await testVideo("/presentation/", "qN362y2IN_0", 375),
  fr1440: await testVideo("/presentation/", "qN362y2IN_0", 1440),
  en375: await testVideo("/en/presentation/", "Ayk97N_OxDQ", 375),
  en1440: await testVideo("/en/presentation/", "Ayk97N_OxDQ", 1440),
};

await browser.close();

console.log(
  JSON.stringify(
    {
      posterHttp: posterRes.status,
      htmlChecks,
      schema,
      videoTests,
    },
    null,
    2,
  ),
);
