import { chromium, devices } from "playwright";
import fs from "node:fs";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:4173";
const outDir = "scripts/browser-verify-output";
fs.mkdirSync(outDir, { recursive: true });

function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

async function verifyPage(page, label, { desktop = false } = {}) {
  const errs = [];
  const consoleErrs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrs.push(msg.text());
  });

  const networkLog = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/\/_astro\/|googletagmanager|google-analytics|fbevents|facebook\.net|boot-deferred|preload-helper|visitor-sms|sms-client|header-choice|tel-link|phones|conversion|after-hours/i.test(url)) {
      networkLog.push({
        t: Date.now(),
        url: url.replace(base, ""),
        resourceType: req.resourceType(),
      });
    }
  });

  const t0 = Date.now();
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Immediate first-paint hero autonomy (before boot / slideshow)
  const immediate = await page.evaluate(() => {
    const img = document.querySelector(".hero-slide.hero-slide--initial, .hero-slideshow > .hero-bg-picture:first-child > .hero-slide");
    const cs = img ? getComputedStyle(img) : null;
    const slideshow = document.querySelector(".hero-slideshow");
    return {
      hasInitialClass: !!document.querySelector(".hero-slide--initial"),
      opacity: cs?.opacity,
      fetchPriority: img?.getAttribute("fetchpriority"),
      loading: img?.getAttribute("loading"),
      heroReady: slideshow?.hasAttribute("data-hero-ready") || false,
      bootInDom: !!document.querySelector('script[src*="boot-deferred"]'),
      preloadHelperInDom: !!document.querySelector('script[src*="preload-helper"]'),
      gtmSnippet: /GTM-TPKDH7S2/.test(document.documentElement.innerHTML),
      dnsGtm: !!document.querySelector('link[rel="dns-prefetch"][href*="googletagmanager"]'),
      preconnectGtm: !!document.querySelector('link[rel="preconnect"][href*="googletagmanager"]'),
      dnsGa: !!document.querySelector('link[rel="dns-prefetch"][href*="google-analytics"]'),
      preconnectGa: !!document.querySelector('link[rel="preconnect"][href*="google-analytics"]'),
      fbq: typeof window.fbq,
      metaStub: !!window.__EMPRE_META_PIXEL_ID__,
    };
  });

  // Wait past first swap window to confirm slideshow timing
  const swapDelay = desktop ? 4500 : 6000;
  await page.waitForTimeout(swapDelay + 1500);

  const afterSwap = await page.evaluate(() => {
    const slides = [...document.querySelectorAll(".hero-slide")];
    const activeIdx = slides.findIndex((s) => s.classList.contains("active"));
    const slideshow = document.querySelector(".hero-slideshow");
    return {
      activeIdx,
      heroReady: slideshow?.hasAttribute("data-hero-ready") || false,
      slideCount: slides.length,
    };
  });

  // Boot should have loaded after window.load + idle (or we wait)
  await page.waitForTimeout(2000);

  const bootState = await page.evaluate(() => ({
    bootScriptInjected: !!document.querySelector('script[src*="boot-deferred"]'),
    openHeaderFn: typeof window.__openHeaderChoiceModal,
    openMobileFn: typeof window.__openMobileRepresentativeModal,
  }));

  // CTA / modal / tel
  let modalOk = false;
  let telHref = null;
  try {
    if (desktop) {
      const headerBtn = page.locator("#btn-open-estimation");
      if (await headerBtn.count()) {
        await headerBtn.click({ force: true });
      }
    } else {
      await page.click("#btn-mobile-representative", { force: true });
    }
    await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 10000 });
    telHref = await page.locator("#header-choice-modal-primary-call").getAttribute("href");
    modalOk = true;
    await page.keyboard.press("Escape");
  } catch (e) {
    errs.push(`modal:${e}`);
  }

  const relNet = networkLog.map((n) => ({
    ms: n.t - t0,
    url: n.url.split("?")[0],
    type: n.resourceType,
  }));

  const findFirst = (re) => {
    const hit = relNet.find((n) => re.test(n.url));
    return hit ? { ms: hit.ms, url: hit.url } : null;
  };

  return {
    label,
    immediate,
    afterSwap,
    bootState,
    modalOk,
    telHref,
    pageErrors: errs.slice(0, 8),
    consoleErrors: consoleErrs.filter((t) => !/favicon|net::ERR/i.test(t)).slice(0, 8),
    networkTimeline: {
      preloadHelper: findFirst(/preload-helper/),
      bootDeferred: findFirst(/boot-deferred/),
      visitorSmsOrPrivate: findFirst(/boot-deferred-private|visitor-sms/),
      smsClientContext: findFirst(/sms-client-context/),
      phones: findFirst(/phones\./),
      headerOrBoot: findFirst(/boot-deferred-site|header-choice/),
      conversion: findFirst(/conversion/),
      afterHours: findFirst(/after-hours/),
      gtm: findFirst(/googletagmanager/),
      meta: findFirst(/fbevents|connect\.facebook\.net/),
      earlyAstroModules: relNet.filter((n) => n.ms < 500 && /\/_astro\/.+\.js$/.test(n.url)),
      allDeferredRelated: relNet.filter((n) =>
        /boot-deferred|preload-helper|sms-client|phones\.|conversion|after-hours|visitor/i.test(n.url),
      ),
    },
  };
}

const browser = await chromium.launch();
const results = {};

{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  results.frMobile = await verifyPage(page, "FR mobile");
  await ctx.close();
}

{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.goto(`${base}/en/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Lightweight EN checks
  const en = await page.evaluate(() => ({
    hasInitial: !!document.querySelector(".hero-slide--initial"),
    opacity: getComputedStyle(document.querySelector(".hero-slide--initial")).opacity,
    gtm: /GTM-TPKDH7S2/.test(document.documentElement.innerHTML),
    lang: document.documentElement.lang,
  }));
  await page.waitForTimeout(6500);
  const enSwap = await page.evaluate(() => {
    const slides = [...document.querySelectorAll(".hero-slide")];
    return {
      activeIdx: slides.findIndex((s) => s.classList.contains("active")),
      heroReady: document.querySelector(".hero-slideshow")?.hasAttribute("data-hero-ready"),
    };
  });
  await page.click("#btn-mobile-representative", { force: true });
  await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 10000 });
  const enTel = await page.locator("#header-choice-modal-primary-call").getAttribute("href");
  results.enMobile = { en, enSwap, enTel, modalOk: true };
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  results.desktop = await verifyPage(page, "Desktop", { desktop: true });
  await ctx.close();
}

await browser.close();

fs.writeFileSync(
  `${outDir}/final-pass-verify.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
