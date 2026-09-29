import { chromium, devices } from "playwright";
import fs from "node:fs";

const base = (process.env.PREVIEW_URL || "http://127.0.0.1:4173").replace(
  /\/$/,
  "",
);
const label = process.env.TRACE_LABEL || "before-open-window";
fs.mkdirSync("scripts/browser-verify-output", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

// Delay third-party so document load stays open longer (LCP window stays open past swap).
await page.route("**/*", async (route) => {
  const u = route.request().url();
  if (
    /googletagmanager|google-analytics|doubleclick|googletagservices|googleadservices/.test(
      u,
    )
  ) {
    await new Promise((r) => setTimeout(r, 20000));
    return route.abort();
  }
  return route.continue();
});

await page.addInitScript(() => {
  window.__lcpTrace = [];
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const el = e.element;
      const slides = [...document.querySelectorAll(".hero-slide")];
      const slideIndex = el && el.tagName === "IMG" ? slides.indexOf(el) : -1;
      const img = slideIndex >= 0 ? el : null;
      window.__lcpTrace.push({
        t: e.startTime,
        size: e.size,
        slideIndex,
        url: img ? img.currentSrc || img.src : "",
        natW: img?.naturalWidth || 0,
        natH: img?.naturalHeight || 0,
        cssW: img ? Math.round(img.getBoundingClientRect().width) : 0,
        cssH: img ? Math.round(img.getBoundingClientRect().height) : 0,
        opacity: img ? getComputedStyle(img).opacity : null,
        active: !!img?.classList.contains("active"),
      });
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });

  setInterval(() => {
    const slides = [...document.querySelectorAll(".hero-slide")];
    const active = slides.findIndex((s) => s.classList.contains("active"));
    const ready = !!document
      .querySelector(".hero-slideshow")
      ?.hasAttribute("data-hero-ready");
    const prev = window.__snap || {};
    if (prev.a !== active || prev.r !== ready) {
      window.__events.push({
        type: "hero",
        t: performance.now(),
        active,
        ready,
      });
      window.__snap = { a: active, r: ready };
    }
  }, 50);

  window.addEventListener("load", () => {
    window.__events.push({ type: "load", t: performance.now() });
  });
});

await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(16000);

const report = await page.evaluate(() => ({
  lcpTrace: window.__lcpTrace,
  events: window.__events,
  readyState: document.readyState,
  slides: [...document.querySelectorAll(".hero-slide")].map((img, i) => ({
    i,
    active: img.classList.contains("active"),
    currentSrc: (img.currentSrc || img.src || "").replace(location.origin, ""),
    natW: img.naturalWidth,
    natH: img.naturalHeight,
    ratio: img.naturalHeight
      ? +(img.naturalWidth / img.naturalHeight).toFixed(4)
      : null,
    cssW: Math.round(img.getBoundingClientRect().width),
    cssH: Math.round(img.getBoundingClientRect().height),
    fp: img.getAttribute("fetchpriority"),
    loading: img.getAttribute("loading"),
    widthAttr: img.getAttribute("width"),
    heightAttr: img.getAttribute("height"),
    srcset: img.getAttribute("srcset"),
    mobileSrcset: img
      .closest("picture")
      ?.querySelector("source[media*='768']")
      ?.getAttribute("srcset"),
  })),
}));

const out = `scripts/browser-verify-output/lcp-trace-${label}.json`;
fs.writeFileSync(out, JSON.stringify(report, null, 2));

console.log("=== EVENTS ===");
for (const e of report.events) console.log(JSON.stringify(e));
console.log("\n=== LCP CANDIDATES ===");
for (const c of report.lcpTrace) {
  console.log(
    JSON.stringify({
      t: Math.round(c.t),
      slide: c.slideIndex,
      size: c.size,
      nat: `${c.natW}x${c.natH}`,
      css: `${c.cssW}x${c.cssH}`,
      opacity: c.opacity,
      active: c.active,
      url: (c.url || "").replace(base, ""),
    }),
  );
}
const later = report.lcpTrace.filter((c) => c.slideIndex >= 1);
const last = report.lcpTrace.at(-1);
const swap = report.events.find((e) => e.type === "hero" && e.active >= 1);
console.log("\n=== PROOF ===");
console.log({
  loadAt: report.events.find((e) => e.type === "load")?.t,
  firstSwapAt: swap?.t,
  lastSlide: last?.slideIndex,
  lastT: last ? Math.round(last.t) : null,
  laterSlideLcpCount: later.length,
  later,
});
console.log("Wrote", out);
await browser.close();
