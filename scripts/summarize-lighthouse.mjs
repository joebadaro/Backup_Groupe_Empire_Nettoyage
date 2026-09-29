import fs from "node:fs";

function summarize(path, label) {
  const r = JSON.parse(fs.readFileSync(path, "utf8"));
  const a = r.audits || {};
  const items = a["lcp-breakdown-insight"]?.details?.items || [];
  const table = items.find((x) => x.type === "table");
  const node = items.find((x) => x.type === "node");
  const net = a["network-requests"]?.details?.items || [];
  console.log(
    label,
    JSON.stringify({
      score: Math.round((r.categories.performance.score || 0) * 100),
      FCP: a["first-contentful-paint"]?.displayValue,
      LCP: a["largest-contentful-paint"]?.displayValue,
      SI: a["speed-index"]?.displayValue,
      TBT: a["total-blocking-time"]?.displayValue,
      CLS: a["cumulative-layout-shift"]?.displayValue,
      lcp: node?.selector,
      renderDelay: table?.items?.find((x) => x.subpart === "elementRenderDelay")
        ?.duration,
      hasFbevents: net.some((n) =>
        /fbevents|connect\.facebook\.net/i.test(n.url || ""),
      ),
      hasGtm: net.some((n) => /googletagmanager/i.test(n.url || "")),
    }),
  );
}

summarize(
  "./scripts/browser-verify-output/lighthouse-mobile-prod-baseline.json",
  "PROD_BASELINE",
);
summarize(
  "./scripts/browser-verify-output/lighthouse-mobile-after-fr.json",
  "MOBILE_FR",
);
summarize(
  "./scripts/browser-verify-output/lighthouse-mobile-after-en.json",
  "MOBILE_EN",
);
summarize(
  "./scripts/browser-verify-output/lighthouse-desktop-sanity.json",
  "DESKTOP",
);
