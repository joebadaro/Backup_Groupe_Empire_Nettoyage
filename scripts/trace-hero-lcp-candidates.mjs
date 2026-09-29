/**
 * Trace tous les candidats LCP successifs sur homepage mobile.
 * Usage: PREVIEW_URL=http://127.0.0.1:4173 node scripts/trace-hero-lcp-candidates.mjs
 *        PREVIEW_URL=https://groupenettoyageempire.com node scripts/trace-hero-lcp-candidates.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";

const base = (process.env.PREVIEW_URL || "https://groupenettoyageempire.com").replace(
  /\/$/,
  "",
);
const path = process.env.PAGE_PATH || "/";
const label = process.env.TRACE_LABEL || "before";
const outDir = "scripts/browser-verify-output";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  // Emulate slower network a bit closer to lab mobile? keep default for clarity
});
const page = await context.newPage();

await page.addInitScript(() => {
  window.__lcpTrace = [];
  window.__firstSwapAt = null;
  window.__heroReadyAt = null;

  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const el = e.element;
      let slideIndex = -1;
      let url = "";
      let natW = 0;
      let natH = 0;
      let cssW = 0;
      let cssH = 0;
      let clientW = 0;
      let clientH = 0;
      let classes = "";
      let fetchPriority = null;
      let loading = null;
      if (el && el.tagName === "IMG") {
        const slides = [...document.querySelectorAll(".hero-slide")];
        slideIndex = slides.indexOf(el);
        url = el.currentSrc || el.src || "";
        natW = el.naturalWidth;
        natH = el.naturalHeight;
        const r = el.getBoundingClientRect();
        cssW = Math.round(r.width);
        cssH = Math.round(r.height);
        clientW = el.clientWidth;
        clientH = el.clientHeight;
        classes = el.className;
        fetchPriority = el.getAttribute("fetchpriority");
        loading = el.getAttribute("loading");
      } else if (el) {
        classes = el.className || el.tagName;
        const r = el.getBoundingClientRect();
        cssW = Math.round(r.width);
        cssH = Math.round(r.height);
      }
      window.__lcpTrace.push({
        t: e.startTime,
        size: e.size,
        id: e.id,
        url,
        slideIndex,
        natW,
        natH,
        ratio: natH ? +(natW / natH).toFixed(4) : null,
        cssW,
        cssH,
        clientW,
        clientH,
        classes,
        fetchPriority,
        loading,
        tag: el ? el.tagName : null,
        loadTime: e.loadTime,
        renderTime: e.renderTime,
      });
    }
  });
  try {
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (_) {}

  const mo = new MutationObserver(() => {
    const ss = document.querySelector(".hero-slideshow");
    if (ss && ss.hasAttribute("data-hero-ready") && window.__heroReadyAt == null) {
      window.__heroReadyAt = performance.now();
    }
  });
  mo.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-hero-ready", "class"],
  });

  // Detect first active slide change away from 0
  let lastActive = 0;
  setInterval(() => {
    const slides = [...document.querySelectorAll(".hero-slide")];
    const idx = slides.findIndex((s) => s.classList.contains("active"));
    if (idx > 0 && window.__firstSwapAt == null) {
      window.__firstSwapAt = performance.now();
      window.__firstSwapTo = idx;
    }
    lastActive = idx;
  }, 50);
});

const tNav = Date.now();
await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });

// Wait through first swap window (6s delay + init overhead + buffer)
await page.waitForTimeout(12000);

const report = await page.evaluate(() => {
  const slides = [...document.querySelectorAll(".hero-slide")].map((img, i) => {
    const picture = img.closest("picture");
    const mobileSource = picture?.querySelector('source[media*="768"], source[media*="max-width"]');
    const r = img.getBoundingClientRect();
    return {
      index: i,
      active: img.classList.contains("active"),
      initial: img.classList.contains("hero-slide--initial"),
      currentSrc: img.currentSrc || img.src,
      src: img.getAttribute("src"),
      srcset: img.getAttribute("srcset"),
      sizes: img.getAttribute("sizes"),
      mobileSourceSrcset: mobileSource?.getAttribute("srcset") || null,
      mobileSourceMedia: mobileSource?.getAttribute("media") || null,
      fetchpriority: img.getAttribute("fetchpriority"),
      loading: img.getAttribute("loading"),
      widthAttr: img.getAttribute("width"),
      heightAttr: img.getAttribute("height"),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      ratio: img.naturalHeight
        ? +(img.naturalWidth / img.naturalHeight).toFixed(4)
        : null,
      cssW: Math.round(r.width),
      cssH: Math.round(r.height),
      clientW: img.clientWidth,
      clientH: img.clientHeight,
      complete: img.complete,
    };
  });

  const entries = performance.getEntriesByType("largest-contentful-paint");
  return {
    lcpTrace: window.__lcpTrace || [],
    firstSwapAt: window.__firstSwapAt,
    firstSwapTo: window.__firstSwapTo,
    heroReadyAt: window.__heroReadyAt,
    navType: performance.getEntriesByType("navigation")[0]?.type,
    slides,
    finalLcpEntry: entries.length
      ? {
          t: entries[entries.length - 1].startTime,
          size: entries[entries.length - 1].size,
          url: entries[entries.length - 1].url,
        }
      : null,
  };
});

report.meta = {
  label,
  base,
  path,
  device: "iPhone 13",
  collectedAt: new Date().toISOString(),
  wallMs: Date.now() - tNav,
};

const outPath = `${outDir}/lcp-trace-${label}.json`;
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`\n=== LCP TRACE (${label}) ===`);
console.log(`URL: ${base}${path}`);
console.log(`firstSwapAt: ${report.firstSwapAt?.toFixed?.(1) ?? report.firstSwapAt} -> slide ${report.firstSwapTo}`);
console.log(`heroReadyAt: ${report.heroReadyAt?.toFixed?.(1) ?? report.heroReadyAt}`);
console.log(`\nLCP candidates (${report.lcpTrace.length}):`);
for (const c of report.lcpTrace) {
  console.log(
    JSON.stringify({
      t_ms: Math.round(c.t),
      slide: c.slideIndex,
      size: c.size,
      nat: `${c.natW}x${c.natH}`,
      css: `${c.cssW}x${c.cssH}`,
      url: (c.url || "").replace(base, "").split("?")[0],
      fp: c.fetchPriority,
    }),
  );
}
if (report.lcpTrace.length) {
  const first = report.lcpTrace[0];
  const last = report.lcpTrace[report.lcpTrace.length - 1];
  console.log("\nFIRST LCP candidate slide:", first.slideIndex, "at", Math.round(first.t), "ms");
  console.log("LAST LCP candidate slide:", last.slideIndex, "at", Math.round(last.t), "ms");
  console.log(
    "Last coincides with 2nd+ slide?",
    last.slideIndex >= 1,
  );
  console.log(
    "Last near first swap?",
    report.firstSwapAt != null &&
      Math.abs(last.t - report.firstSwapAt) < 1500,
  );
}
console.log(`\nWrote ${outPath}`);

await browser.close();
