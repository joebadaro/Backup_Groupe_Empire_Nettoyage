/**
 * Read-only production tracking audit: dataLayer events + Google network IDs.
 * No site changes.
 */
import { chromium, devices } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.URL || "https://groupenettoyageempire.com";
const outDir = resolve("scripts/browser-verify-output");
mkdirSync(outDir, { recursive: true });

function classifyUrl(url) {
  const u = url.toLowerCase();
  if (u.includes("googletagmanager.com/gtm.js")) return "gtm.js";
  if (u.includes("googletagmanager.com/gtag/js")) return "gtag/js";
  if (u.includes("googletagmanager.com/gtag/destination")) return "gtag/destination";
  if (u.includes("google-analytics.com") || u.includes("analytics.google.com"))
    return "ga_collect";
  if (u.includes("googleadservices.com") || u.includes("/pagead/"))
    return "ads_conversion";
  if (u.includes("doubleclick.net") || u.includes("stats.g.doubleclick"))
    return "doubleclick";
  if (u.includes("google.") && u.includes("ads/ga-audiences")) return "ga_audiences";
  if (u.includes("googletagmanager.com")) return "gtm_other";
  if (u.includes("google.com") || u.includes("google.ca") || u.includes("g.doubleclick"))
    return "google_other";
  return null;
}

function extractIds(url) {
  const found = {
    aw: [...url.matchAll(/AW-(\d+)/g)].map((m) => `AW-${m[1]}`),
    g: [...url.matchAll(/[?&](?:id|tid)=((?:G|GT)-[A-Z0-9]+)/gi)].map((m) => m[1]),
    send_to: [...url.matchAll(/send_to[=%]3D([^&%]+)/gi)].map((m) =>
      decodeURIComponent(m[1]),
    ),
    labels: [...url.matchAll(/label[=%]3D([^&%]+)/gi)].map((m) =>
      decodeURIComponent(m[1]),
    ),
    cv: [...url.matchAll(/[?&]cv=([^&]+)/g)].map((m) => m[1]),
    en: [...url.matchAll(/[?&]en=([^&]+)/g)].map((m) => decodeURIComponent(m[1])),
  };
  // Also AW/label from path-style /pagead/conversion/123/?label=
  const conv = url.match(/\/pagead\/(?:1\/)?conversion\/(\d+)/);
  if (conv) found.aw.push(`AW-${conv[1]}`);
  return found;
}

async function auditPath(path, actions) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ...devices["iPhone 12"],
    locale: "fr-CA",
  });
  const page = await ctx.newPage();

  const network = [];
  const consoleMsgs = [];

  page.on("console", (msg) => {
    if (/conversion|dataLayer|gtag|GTM/i.test(msg.text())) {
      consoleMsgs.push(msg.text());
    }
  });

  page.on("request", (req) => {
    const url = req.url();
    const kind = classifyUrl(url);
    if (!kind) return;
    network.push({
      t: Date.now(),
      phase: "request",
      kind,
      method: req.method(),
      url,
      ids: extractIds(url),
    });
  });

  // Intercept dataLayer pushes
  await page.addInitScript(() => {
    window.__dlLog = [];
    const q = (window.dataLayer = window.dataLayer || []);
    const origPush = q.push.bind(q);
    q.push = function (...args) {
      try {
        window.__dlLog.push({ t: Date.now(), args: JSON.parse(JSON.stringify(args)) });
      } catch {
        window.__dlLog.push({ t: Date.now(), args: ["[unserializable]"] });
      }
      return origPush(...args);
    };
  });

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);

  const afterLoad = {
    dataLayer: await page.evaluate(() => ({
      log: window.__dlLog || [],
      snapshot: (window.dataLayer || []).slice(-30),
    })),
    gtmLoaded: await page.evaluate(
      () => !!document.querySelector('script[src*="gtm.js"]') || !!window.google_tag_manager,
    ),
  };

  const actionResults = [];
  for (const action of actions) {
    const beforeNet = network.length;
    const beforeDl = await page.evaluate(() => (window.__dlLog || []).length);
    try {
      await action.run(page);
      await page.waitForTimeout(action.waitMs || 2000);
    } catch (e) {
      actionResults.push({ name: action.name, error: String(e) });
      continue;
    }
    const dl = await page.evaluate(
      (n) => (window.__dlLog || []).slice(n),
      beforeDl,
    );
    actionResults.push({
      name: action.name,
      dataLayerDelta: dl,
      networkDelta: network.slice(beforeNet).map((n) => ({
        kind: n.kind,
        url: n.url.slice(0, 300),
        ids: n.ids,
      })),
    });
  }

  // Parse gtm.js / gtag for embedded AW / conversion config if available
  const gtmProbe = await page.evaluate(async () => {
    const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.src);
    const gtmSrc = scripts.find((s) => s.includes("gtm.js"));
    const gtagSrc = scripts.find((s) => s.includes("gtag/js"));
    let gtmText = "";
    let gtagText = "";
    try {
      if (gtmSrc) gtmText = await (await fetch(gtmSrc)).text();
    } catch {}
    try {
      if (gtagSrc) gtagText = await (await fetch(gtagSrc)).text();
    } catch {}
    const aw = [...new Set([...(gtmText.match(/AW-\d+/g) || []), ...(gtagText.match(/AW-\d+/g) || [])])];
    const gids = [
      ...new Set([
        ...(gtmText.match(/G-[A-Z0-9]+/g) || []),
        ...(gtagText.match(/G-[A-Z0-9]+/g) || []),
      ]),
    ].filter((x) => x.length >= 8 && x.length <= 14);
    // conversion labels often look like send_to: 'AW-xxx/yyyy'
    const sendTo = [
      ...new Set([
        ...(gtmText.match(/AW-\d+\/[A-Za-z0-9_-]+/g) || []),
        ...(gtagText.match(/AW-\d+\/[A-Za-z0-9_-]+/g) || []),
      ]),
    ];
    const tagTypes = [];
    for (const m of gtmText.matchAll(/"type"\s*:\s*"([^"]+)"/g)) tagTypes.push(m[1]);
    const uniqueTypes = [...new Set(tagTypes)].slice(0, 80);
    // HTML / custom markers
    const hasCustomHtml = /html|customHtml|flc|floodlight|facebook|linkedin|tiktok|hotjar|clarity|segment/i.test(
      gtmText,
    );
    return {
      gtmSrc,
      gtagSrc,
      gtmBytes: gtmText.length,
      gtagBytes: gtagText.length,
      aw,
      gids,
      sendTo,
      uniqueTypes,
      hasCustomHtmlHints: hasCustomHtml,
      thirdPartyHints: [
        ...new Set(
          (gtmText.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'\\\s]*/gi) || [])
            .map((u) => {
              try {
                return new URL(u).hostname;
              } catch {
                return null;
              }
            })
            .filter(Boolean),
        ),
      ].slice(0, 60),
    };
  });

  await browser.close();

  // Aggregate IDs from network
  const allAw = new Set();
  const allG = new Set();
  const allSendTo = new Set();
  const allLabels = new Set();
  const byKind = {};
  for (const n of network) {
    byKind[n.kind] = (byKind[n.kind] || 0) + 1;
    n.ids.aw.forEach((x) => allAw.add(x));
    n.ids.g.forEach((x) => allG.add(x));
    n.ids.send_to.forEach((x) => allSendTo.add(x));
    n.ids.labels.forEach((x) => allLabels.add(x));
  }

  return {
    path,
    afterLoad,
    actionResults,
    gtmProbe,
    networkSummary: {
      byKind,
      aw: [...allAw],
      g: [...allG],
      send_to: [...allSendTo],
      labels: [...allLabels],
      sampleGoogleUrls: network
        .filter((n) => /ads|conversion|collect|gtag|gtm/i.test(n.url))
        .slice(0, 40)
        .map((n) => n.url.slice(0, 250)),
    },
    consoleMsgs: consoleMsgs.slice(0, 40),
  };
}

const actionsFr = [
  {
    name: "click_primary_tel",
    waitMs: 2500,
    run: async (page) => {
      const tel = page.locator("a[href^='tel:']").first();
      await tel.dispatchEvent("click");
    },
  },
  {
    name: "click_sticky_contact",
    waitMs: 2500,
    run: async (page) => {
      const sticky = page.locator(".mobile-sticky-bar__cta, .mobile-sticky-bar a").first();
      if (await sticky.count()) await sticky.click({ force: true });
    },
  },
  {
    name: "click_estimate_cta",
    waitMs: 2500,
    run: async (page) => {
      const est = page
        .locator("[data-conversion-estimate-trigger], .conversion-cta-secondary")
        .first();
      if (await est.count()) await est.click({ force: true });
    },
  },
];

const fr = await auditPath("/", actionsFr);
writeFileSync(
  resolve(outDir, "tracking-audit-prod-fr.json"),
  JSON.stringify(fr, null, 2),
);

const en = await auditPath("/en/", [
  {
    name: "click_primary_tel_en",
    waitMs: 2500,
    run: async (page) => {
      await page.locator("a[href^='tel:']").first().dispatchEvent("click");
    },
  },
]);
writeFileSync(
  resolve(outDir, "tracking-audit-prod-en.json"),
  JSON.stringify(en, null, 2),
);

console.log(
  JSON.stringify(
    {
      fr: {
        aw: fr.networkSummary.aw,
        g: fr.networkSummary.g,
        send_to: fr.networkSummary.send_to,
        labels: fr.networkSummary.labels,
        gtmProbe: {
          aw: fr.gtmProbe.aw,
          gids: fr.gtmProbe.gids,
          sendTo: fr.gtmProbe.sendTo,
          types: fr.gtmProbe.uniqueTypes,
          hosts: fr.gtmProbe.thirdPartyHints,
          bytes: { gtm: fr.gtmProbe.gtmBytes, gtag: fr.gtmProbe.gtagBytes },
        },
        actions: fr.actionResults.map((a) => ({
          name: a.name,
          error: a.error,
          dl: a.dataLayerDelta,
          netKinds: [...new Set((a.networkDelta || []).map((n) => n.kind))],
          ids: a.networkDelta,
        })),
      },
      en: {
        aw: en.networkSummary.aw,
        g: en.networkSummary.g,
        send_to: en.networkSummary.send_to,
        labels: en.networkSummary.labels,
        gtmSendTo: en.gtmProbe.sendTo,
      },
    },
    null,
    2,
  ),
);
