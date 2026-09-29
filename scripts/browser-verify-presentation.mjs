/**
 * Vérification navigateur réelle — pages de présentation vidéo.
 * Usage: npm run preview (port 4321) puis node scripts/browser-verify-presentation.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.PREVIEW_URL ?? "http://127.0.0.1:4321";
const WIDTHS = [375, 768, 1440];
const PAGES = [
  { path: "/presentation/", label: "FR presentation", locale: "fr" },
  { path: "/en/presentation/", label: "EN presentation", locale: "en" },
  { path: "/", label: "FR home", locale: "fr" },
  { path: "/en/", label: "EN home", locale: "en" },
  { path: "/realisations-video/", label: "FR gallery", locale: "fr" },
  { path: "/en/video-gallery/", label: "EN gallery", locale: "en" },
];

const VIDEO_IDS = { fr: "qN362y2IN_0", en: "Ayk97N_OxDQ" };
const PRESENTATION_HREFS = { fr: "/presentation/", en: "/en/presentation/" };

const outDir = "scripts/browser-verify-output";
mkdirSync(outDir, { recursive: true });

const report = {
  pagesOpened: [],
  widthsTested: WIDTHS,
  layout: [],
  videos: { fr: null, en: null },
  ctas: {},
  seo: {},
  performance: {},
  gallery: {},
  issues: [],
  fixes: [],
  filesModifiedInVerification: [],
};

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function checkLayout(page, label, width) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const horizontalOverflow =
      Math.max(doc.scrollWidth, body?.scrollWidth ?? 0) > doc.clientWidth + 1;

    const offscreenButtons = [...document.querySelectorAll("a.btn, button.btn")].filter(
      (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2);
      },
    );

    const imgs = [...document.querySelectorAll("img")].filter((img) => {
      const src = img.getAttribute("src") ?? "";
      return src.includes("video-presentation-groupe-nettoyage-empire");
    });

    const imgIssues = imgs.map((img) => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const cw = img.clientWidth;
      const ch = img.clientHeight;
      const ratioNatural = nw / nh;
      const ratioBox = cw / ch;
      const distorted = nw > 0 && Math.abs(ratioNatural - ratioBox) > 0.15;
      return {
        src: img.getAttribute("src"),
        hasWidthHeight: !!(img.width && img.height),
        distorted,
      };
    });

    let verticalPlayer = null;
    const svp = document.querySelector(".service-video-proof--vertical .svp-thumb");
    if (svp) {
      const r = svp.getBoundingClientRect();
      const vw = window.innerWidth;
      verticalPlayer = {
        width: Math.round(r.width),
        centered: Math.abs(r.left + r.width / 2 - vw / 2) < 24,
        tooWide: r.width > Math.min(360, vw * 0.85),
      };
    }

    const homeTeaser = document.querySelector(".presentation-home-teaser");
    let homeTeaserMetrics = null;
    if (homeTeaser) {
      const r = homeTeaser.getBoundingClientRect();
      homeTeaserMetrics = {
        height: Math.round(r.height),
        congested: r.height > window.innerHeight * 0.55,
      };
    }

    return {
      horizontalOverflow,
      offscreenButtonCount: offscreenButtons.length,
      imgIssues,
      verticalPlayer,
      homeTeaserMetrics,
    };
  });

  const shot = join(outDir, `${slug(label)}-${width}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  report.layout.push({
    page: label,
    width,
    screenshot: shot,
    ...metrics,
    pass:
      !metrics.horizontalOverflow &&
      metrics.offscreenButtonCount === 0 &&
      !metrics.imgIssues.some((i) => i.distorted || !i.hasWidthHeight),
  });

  if (metrics.horizontalOverflow) {
    report.issues.push(`${label} @ ${width}px: débordement horizontal`);
  }
  if (metrics.offscreenButtonCount > 0) {
    report.issues.push(`${label} @ ${width}px: ${metrics.offscreenButtonCount} bouton(s) hors écran`);
  }
}

async function testVideoModal(page, locale) {
  const id = VIDEO_IDS[locale];
  const label = locale === "fr" ? "FR" : "EN";
  const path = locale === "fr" ? "/presentation/" : "/en/presentation/";

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });

  const ytIframesBefore = await page.locator('iframe[src*="youtube.com"]').count();

  const openBtn = page.locator("[data-svp-open]").first();
  await openBtn.click();

  const dialog = page.locator(`dialog#svp-modal-${id}`);
  await dialog.waitFor({ state: "visible", timeout: 8000 });

  const ytIframesAfterClick = await page.locator('iframe[src*="youtube.com"]').count();
  const iframe = page.locator(`dialog#svp-modal-${id} iframe[src*="youtube.com"]`);
  await iframe.waitFor({ state: "attached", timeout: 12000 });
  const iframeSrc = await iframe.getAttribute("src");
  const embedOk = iframeSrc?.includes(`/embed/${id}`) && iframeSrc.includes("autoplay=1");

  await page.waitForTimeout(2500);
  const dialogBox = await dialog.locator(".service-video-proof-modal").boundingBox();
  const verticalOk =
    dialogBox && dialogBox.height > dialogBox.width * 0.9 && dialogBox.height < 920;

  // Close X
  await page.locator(`dialog#svp-modal-${id} [data-svp-close]`).click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const closeX = (await dialog.getAttribute("open")) === null;

  // Reopen — fermeture Échap
  await openBtn.click();
  await dialog.waitFor({ state: "visible", timeout: 8000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const closeEscape = (await dialog.getAttribute("open")) === null;

  // Reopen — fermeture par clic sur le fond (backdrop)
  await openBtn.click();
  await dialog.waitFor({ state: "visible", timeout: 8000 });
  await page.locator(`dialog#svp-modal-${id}`).click({
    position: { x: 8, y: 8 },
    force: true,
  });
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const closeBackdrop = (await dialog.getAttribute("open")) === null;

  const iframeAfterClose = await page.locator(`dialog#svp-modal-${id} iframe`).count();

  report.videos[locale] = {
    path,
    youtubeId: id,
    ytIframesBefore,
    ytIframesAfterClick,
    embedOk,
    iframeSrc,
    verticalModalOk: !!verticalOk,
    closeX,
    closeEscape,
    closeBackdrop,
    iframeRemovedAfterClose: iframeAfterClose === 0,
    played: embedOk && ytIframesAfterClick > ytIframesBefore,
  };

  if (!embedOk) report.issues.push(`${label} vidéo: embed URL incorrecte`);
  if (ytIframesBefore > 0) report.issues.push(`${label} vidéo: iframe YouTube avant clic`);
  if (iframeAfterClose > 0) report.issues.push(`${label} vidéo: iframe persiste après fermeture`);
}

async function testCtas(page) {
  const results = {};

  for (const [locale, path] of [
    ["fr", "/presentation/"],
    ["en", "/en/presentation/"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const tel = page.locator('.presentation-cta a[href^="tel:"]').first();
    const telHref = await tel.getAttribute("href");
    const telText = (await tel.textContent())?.trim();

    await page.evaluate(() => {
      window.__estimationOpened = false;
      const orig = window.openEstimationWidget;
      window.openEstimationWidget = () => {
        window.__estimationOpened = true;
        if (typeof orig === "function") orig();
      };
    });

    await page.locator('.presentation-cta button[onclick*="openEstimationWidget"]').click();
    const estimateOpened = await page.evaluate(() => window.__estimationOpened === true);

    results[locale] = {
      telHref,
      telText,
      telOk: telHref === "tel:5148939939",
      estimateOpened,
      newFormCreated: false,
    };

    if (telHref !== "tel:5148939939") {
      report.issues.push(`${locale.toUpperCase()} CTA tel incorrect: ${telHref}`);
    }
    if (!estimateOpened) {
      report.issues.push(`${locale.toUpperCase()} CTA estimation n'a pas appelé openEstimationWidget`);
    }
  }

  report.ctas = results;
}

async function testGallery(page) {
  for (const [locale, path, href] of [
    ["fr", "/realisations-video/", "/presentation/"],
    ["en", "/en/video-gallery/", "/en/presentation/"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 768, height: 900 });

    const cards = page.locator(".video-card");
    const count = await cards.count();
    const firstLink = cards.first().locator("a.presentation-gallery-card");
    const firstHref = await firstLink.getAttribute("href");
    const firstTitle = await cards.first().locator(".video-card-title").textContent();

    const presentationLinks = await page.locator("a.presentation-gallery-card").count();
    const ytFacades = await page.locator(".yt-facade[data-yid]").count();

    report.gallery[locale] = {
      path,
      totalCards: count,
      firstHref,
      firstTitle: firstTitle?.trim(),
      presentationLinkCount: presentationLinks,
      youtubeFacadeCount: ytFacades,
      hrefOk: firstHref === href,
      duplicatePresentation: presentationLinks > 1,
    };

    if (firstHref !== href) {
      report.issues.push(`${locale} galerie: 1re carte ne mène pas à ${href}`);
    }
    if (presentationLinks > 1) {
      report.issues.push(`${locale} galerie: doublon carte présentation`);
    }
    if (locale === "fr" && count < 16) {
      report.issues.push(`FR galerie: nombre de cartes suspect (${count})`);
    }
  }
}

function verifySeoFromDist() {
  const checks = [];
  for (const [file, canonical, frAlt, enAlt, lang, thumbPath, videoId] of [
    [
      "dist/presentation/index.html",
      "https://groupenettoyageempire.com/presentation/",
      "https://groupenettoyageempire.com/presentation/",
      "https://groupenettoyageempire.com/en/presentation/",
      "fr-CA",
      "video-presentation-groupe-nettoyage-empire-fr.webp",
      "qN362y2IN_0",
    ],
    [
      "dist/en/presentation/index.html",
      "https://groupenettoyageempire.com/en/presentation/",
      "https://groupenettoyageempire.com/presentation/",
      "https://groupenettoyageempire.com/en/presentation/",
      "en-CA",
      "video-presentation-groupe-nettoyage-empire-en.webp",
      "Ayk97N_OxDQ",
    ],
  ]) {
    const html = readFileSync(file, "utf8");
    const canonicalMatch = html.match(/rel="canonical" href="([^"]+)"/);
    const frHref = html.match(/hreflang="fr" href="([^"]+)"/);
    const enHref = html.match(/hreflang="en" href="([^"]+)"/);
    const voBlock = html.slice(html.indexOf('"@type":"VideoObject"'), html.indexOf('"@type":"VideoObject"') + 600);

    checks.push({
      file,
      canonicalOk: canonicalMatch?.[1] === canonical,
      hreflangFrOk: frHref?.[1] === frAlt,
      hreflangEnOk: enHref?.[1] === enAlt,
      thumbAbsoluteOk: voBlock.includes(`https://groupenettoyageempire.com/images/videos/${thumbPath}`),
      embedOk: voBlock.includes(`https://www.youtube.com/embed/${videoId}`),
      contentUrlOk: voBlock.includes(`https://www.youtube.com/watch?v=${videoId}`),
      inLanguageOk: voBlock.includes(`"inLanguage":"${lang}"`),
      noUploadDate: !voBlock.includes("uploadDate"),
    });
  }
  report.seo = checks;
  for (const c of checks) {
    if (!c.canonicalOk) report.issues.push(`SEO canonical incorrect: ${c.file}`);
    if (!c.noUploadDate) report.issues.push(`SEO uploadDate présent: ${c.file}`);
  }
}

async function testPerformance(page) {
  const paths = ["/presentation/", "/en/presentation/", "/", "/en/"];
  const results = [];
  for (const path of paths) {
    const requests = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("youtube.com") || u.includes("ytimg.com")) requests.push(u);
    });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const iframes = await page.locator('iframe[src*="youtube.com"]').count();
    const localThumb = await page.locator('img[src*="video-presentation-groupe-nettoyage-empire"]').count();
    results.push({ path, youtubeRequestsBeforeClick: requests.length, youtubeIframes: iframes, localThumbImages: localThumb });
    page.removeAllListeners("request");
  }
  report.performance = results;
  for (const r of results) {
    if (r.youtubeIframes > 0) report.issues.push(`${r.path}: iframe YouTube au chargement`);
    if (r.youtubeRequestsBeforeClick > 0) report.issues.push(`${r.path}: requête YouTube avant clic`);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
} catch (e) {
  console.error("Serveur preview inaccessible sur", BASE);
  console.error("Lancez: npm run preview -- --port 4321");
  process.exit(1);
}

for (const pg of PAGES) {
  report.pagesOpened.push(`${BASE}${pg.path}`);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle" });
    await checkLayout(page, pg.label, width);
  }
}

await testVideoModal(page, "fr");
await testVideoModal(page, "en");
await testCtas(page);
await testGallery(page);
await testPerformance(page);
verifySeoFromDist();

await browser.close();

report.buildNote = "Exécuter npm run build séparément";
report.committed = false;

const reportPath = join(outDir, "report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log("\nRapport écrit:", reportPath);
