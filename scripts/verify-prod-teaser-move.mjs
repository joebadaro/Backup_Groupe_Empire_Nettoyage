/**
 * Production verification — homepage teaser move deploy.
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const WIDTHS = [375, 1440];
const PAGES_HTTP = [
  "/",
  "/en/",
  "/presentation/",
  "/en/presentation/",
  "/realisations-video/",
  "/en/video-gallery/",
];

const report = {
  teaserPlacement: {},
  buttonLabels: {},
  gallery: {},
  layout: [],
  youtubeHome: {},
  consoleErrors: [],
  networkErrors: [],
  issues: [],
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (/presentation|teaser|video-presentation|youtube/i.test(t)) {
        report.consoleErrors.push(t.slice(0, 200));
      }
    }
  });
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (/presentation|teaser|video-presentation|youtube/i.test(u)) {
      report.networkErrors.push({ url: u.slice(0, 120), failure: req.failure()?.errorText });
    }
  });

  for (const path of PAGES_HTTP) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    report[`http_${path.replace(/\//g, "_") || "root"}`] = res?.status();
  }

  for (const [path, locale] of [
    ["/", "fr"],
    ["/en/", "en"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const placement = await page.evaluate(() => {
      const hero = document.querySelector(".hero-section");
      const teaser = document.querySelector(".presentation-home-teaser");
      const services = document.querySelector(".section-services");
      const quality = document.querySelector(".section-quality-strip-refined");
      const carousel = document.querySelector(".hero-section .carousel, .hero-section [class*='carousel']");
      if (!hero || !teaser || !services) return { ok: false, reason: "missing elements" };
      const afterHero = !!(hero.compareDocumentPosition(teaser) & Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeServices = !!(teaser.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeQuality = quality
        ? !!(teaser.compareDocumentPosition(quality) & Node.DOCUMENT_POSITION_FOLLOWING)
        : true;
      const card = document.querySelector(".presentation-home-teaser__card");
      const btn = document.querySelector(".presentation-home-teaser__cta, .presentation-home-teaser__card .btn");
      return {
        ok: afterHero && beforeServices && beforeQuality,
        afterHero,
        beforeServices,
        beforeQuality,
        cardHref: card?.getAttribute("href") ?? null,
        buttonText: btn?.textContent?.trim() ?? card?.textContent?.trim() ?? "",
        heroHasCarousel: !!carousel,
        youtubeIframes: document.querySelectorAll('iframe[src*="youtube.com"]').length,
      };
    });
    report.teaserPlacement[locale] = placement;

    const expectedBtn = locale === "fr" ? "Voir la vidéo de présentation" : "Watch Our Company Video";
    const expectedHref = locale === "fr" ? "/presentation/" : "/en/presentation/";
    report.buttonLabels[locale] = {
      expected: expectedBtn,
      found: placement.buttonText?.includes(expectedBtn),
      hrefOk: placement.cardHref === expectedHref,
    };

    report.youtubeHome[locale] = {
      iframeCount: placement.youtubeIframes,
      ok: placement.youtubeIframes === 0,
    };

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflow = doc.scrollWidth > doc.clientWidth + 1;
        const img = document.querySelector(".presentation-home-teaser__thumb");
        let distorted = false;
        if (img && img.naturalWidth > 0) {
          distorted = Math.abs(img.naturalWidth / img.naturalHeight - img.clientWidth / img.clientHeight) > 0.12;
        }
        return { overflow, distorted, imgLoaded: !!(img && img.naturalWidth > 0) };
      });
      report.layout.push({ path, width, ...layout, pass: !layout.overflow && !layout.distorted });
    }
  }

  for (const [locale, path, href] of [
    ["fr", "/realisations-video/", "/presentation/"],
    ["en", "/en/video-gallery/", "/en/presentation/"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const g = await page.evaluate((expectedHref) => {
      const cards = [...document.querySelectorAll(".video-card")];
      const first = cards[0];
      const firstLink = first?.querySelector("a.presentation-gallery-card");
      const ytFacades = document.querySelectorAll(".yt-facade[data-yid]").length;
      return {
        totalCards: cards.length,
        firstHref: firstLink?.getAttribute("href") ?? null,
        firstIsPresentation: firstLink?.classList.contains("presentation-gallery-card"),
        youtubeFacades: ytFacades,
        hrefOk: firstLink?.getAttribute("href") === expectedHref,
      };
    }, href);
    report.gallery[locale] = g;
  }

  await browser.close();

  if (!report.teaserPlacement.fr?.ok) report.issues.push("FR teaser placement");
  if (!report.teaserPlacement.en?.ok) report.issues.push("EN teaser placement");
  if (!report.buttonLabels.fr?.found) report.issues.push("FR button label");
  if (!report.buttonLabels.en?.found) report.issues.push("EN button label");
  if (!report.gallery.fr?.hrefOk) report.issues.push("FR gallery first card");
  if (!report.gallery.en?.hrefOk) report.issues.push("EN gallery first card");
  if (report.layout.some((l) => !l.pass)) report.issues.push("layout overflow/distortion");
  if (report.consoleErrors.length) report.issues.push("console errors");
  if (report.networkErrors.length) report.issues.push("network errors");

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
