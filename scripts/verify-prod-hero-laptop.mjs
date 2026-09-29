/**
 * Poll production until hero laptop CSS is live, then verify FR/EN homepages.
 * Usage: node scripts/verify-prod-hero-laptop.mjs
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const CSS_MARKERS = [
  "max-height: 900px",
  "5.25rem 0 4.5rem 0",
  "clamp(2.75rem, 5.2vw, 4.25rem)",
];

const LAPTOP_VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1536x864", width: 1536, height: 864 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

const OTHER_VIEWPORTS = [
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];

async function fetchHomeHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireHeroVerify/1.0", "Cache-Control": "no-cache" },
  });
  return { status: res.status, html: await res.text(), url: res.url };
}

async function cssBundleHasHeroCompact(html) {
  const links = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await fetch(`${BASE}${href}`, {
      headers: { "User-Agent": "EmpireHeroVerify/1.0", "Cache-Control": "no-cache" },
    });
    if (!res.ok) continue;
    const css = await res.text();
    if (CSS_MARKERS.every((m) => css.includes(m))) return { live: true, cssUrl: href };
  }
  return { live: false, cssUrl: null };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const home = await fetchHomeHtml("/");
    const cssCheck = await cssBundleHasHeroCompact(home.html);
    const canonicalOk = home.html.includes(
      'rel="canonical" href="https://groupenettoyageempire.com/"',
    );
    const gtmOk = /googletagmanager\.com\/gtm\.js/i.test(home.html);
    console.log(
      `[${new Date().toISOString()}] attempt ${attempt}: status=${home.status} cssLive=${cssCheck.live} canonical=${canonicalOk}`,
    );
    if (home.status === 200 && cssCheck.live && canonicalOk) {
      return { attempts: attempt, cssUrl: cssCheck.cssUrl, gtmOk };
    }
    await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error("Production deploy wait timeout");
}

async function measurePage(browser, path, vp) {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".hero-section", { timeout: 15000 });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
      };
    };

    const heroStyle = getComputedStyle(document.querySelector(".hero-section"));
    const titleStyle = document.querySelector(".hero-title")
      ? getComputedStyle(document.querySelector(".hero-title"))
      : null;
    const primary = document.querySelector(
      ".hero-actions.conversion-cta-priority a[href^='tel:'], .hero-actions .conversion-cta-primary",
    );
    const secondary = document.querySelector(".hero-actions .conversion-cta-secondary");
    const teaser = document.querySelector(".presentation-home-teaser");
    const trust = document.querySelector(".trust-container");

    const scrollFor = (el) =>
      el
        ? Math.max(0, Math.round(el.getBoundingClientRect().bottom - window.innerHeight))
        : null;

    const docWidth = document.documentElement.scrollWidth;
    const viewWidth = window.innerWidth;

    let teaserGap = null;
    if (trust && teaser) {
      teaserGap = Math.round(teaser.getBoundingClientRect().top - trust.getBoundingClientRect().bottom);
    }

    return {
      heroPaddingTop: heroStyle.paddingTop,
      heroPaddingBottom: heroStyle.paddingBottom,
      titleFontSize: titleStyle?.fontSize ?? null,
      title: rect(".hero-title"),
      subtitle: rect(".hero-subtitle-group"),
      primary: rect(".hero-actions.conversion-cta-priority a[href^='tel:'], .hero-actions .conversion-cta-primary"),
      secondary: rect(".hero-actions .conversion-cta-secondary"),
      scrollPrimary: primary ? scrollFor(primary) : null,
      scrollSecondary: secondary ? scrollFor(secondary) : null,
      titleFullyVisible:
        (() => {
          const t = document.querySelector(".hero-title");
          if (!t) return false;
          const r = t.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= window.innerHeight;
        })(),
      horizontalOverflow: docWidth > viewWidth + 1,
      scrollWidth: docWidth,
      viewportWidth: viewWidth,
      teaserGap,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      hasGtm: !!document.querySelector('script[src*="googletagmanager.com/gtm.js"]'),
      hasEstimateFormRoute: !!document.querySelector('a[href*="estimation"], a[href*="estimate"]'),
    };
  });

  await context.close();
  return { ...data, consoleErrors: consoleErrors.filter(Boolean).slice(0, 5) };
}

const deploy = await waitForDeploy();
console.log("DEPLOY_LIVE", JSON.stringify(deploy));

const browser = await chromium.launch();
const report = { deploy, pages: {} };

try {
  for (const locale of ["/", "/en/"]) {
    report.pages[locale] = { laptop: {}, other: {}, seo: {} };
    const home = await fetchHomeHtml(locale);
    report.pages[locale].seo = {
      status: home.status,
      canonicalPresent: home.html.includes('rel="canonical"'),
      hreflangPresent: home.html.includes("hreflang"),
      sitemapLink: home.html.includes("sitemap"),
      telLink: home.html.includes("tel:+15148939939") || home.html.includes("tel:5148939939"),
      modalMarkup: home.html.includes("header-choice-modal") || home.html.includes("ah-phone-popup"),
    };

    for (const vp of LAPTOP_VIEWPORTS) {
      report.pages[locale].laptop[vp.name] = await measurePage(browser, locale, vp);
    }
    for (const vp of OTHER_VIEWPORTS) {
      report.pages[locale].other[vp.name] = await measurePage(browser, locale, vp);
    }
  }
} finally {
  await browser.close();
}

console.log("REPORT", JSON.stringify(report, null, 2));

const failures = [];
for (const [path, data] of Object.entries(report.pages)) {
  for (const [name, m] of Object.entries(data.laptop)) {
    if (m.scrollPrimary > 0) failures.push(`${path} ${name} primary scroll ${m.scrollPrimary}`);
    if (m.scrollSecondary > 0) failures.push(`${path} ${name} secondary scroll ${m.scrollSecondary}`);
    if (m.horizontalOverflow) failures.push(`${path} ${name} horizontal overflow`);
    if (!m.titleFullyVisible && name !== "1920x1080")
      failures.push(`${path} ${name} title not fully visible`);
  }
  for (const [name, m] of Object.entries(data.other)) {
    if (m.horizontalOverflow) failures.push(`${path} ${name} horizontal overflow`);
  }
}

if (failures.length) {
  console.error("FAILURES", failures);
  process.exit(1);
}

console.log("ALL_CHECKS_PASSED");
