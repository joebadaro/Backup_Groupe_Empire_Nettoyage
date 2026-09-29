import fs from "node:fs";

const gtm = fs.readFileSync(
  "scripts/browser-verify-output/_gtm-TPKDH7S2.js",
  "utf8",
);
const gtag = fs.existsSync("scripts/browser-verify-output/_gtag-G-2YKLBMPG8B.js")
  ? fs.readFileSync("scripts/browser-verify-output/_gtag-G-2YKLBMPG8B.js", "utf8")
  : "";

const aw = [...new Set(gtm.match(/AW-\d+/g) || [])];
const sendTo = [...new Set(gtm.match(/AW-\d+\/[A-Za-z0-9_-]+/g) || [])];
const gids = [...new Set(gtm.match(/G-[A-Z0-9]{6,12}/g) || [])];
const types = [
  ...new Set([...gtm.matchAll(/"type":"([^"]+)"/g)].map((m) => m[1])),
];
const tagIds = [
  ...new Set([...gtm.matchAll(/"tagId":"([^"]+)"/g)].map((m) => m[1])),
];
const eventNames = [
  ...new Set([...gtm.matchAll(/"eventName":"([^"]+)"/g)].map((m) => m[1])),
];
const vtpEvent = [
  ...new Set(
    [...gtm.matchAll(/"vtp_eventName":"([^"]+)"/g)].map((m) => m[1]),
  ),
];
const arg0 = [
  ...new Set(
    [...gtm.matchAll(/"arg0":"([^"]+)"/g)]
      .map((m) => m[1])
      .filter((x) => /^[a-z][a-z0-9_]*$/i.test(x)),
  ),
];
// conversion labels near AW
const labelPairs = [
  ...new Set(
    [
      ...gtm.matchAll(/AW-\d+\/[A-Za-z0-9_-]+/g),
      ...gtm.matchAll(/"conversion_label":"([^"]+)"/g),
      ...gtm.matchAll(/"conversionLabel":"([^"]+)"/g),
      ...gtm.matchAll(/"vtp_conversionLabel":"([^"]+)"/g),
      ...gtm.matchAll(/"vtp_conversionId":"([^"]+)"/g),
    ].map((m) => (typeof m === "string" ? m : m[0].includes("AW-") ? m[0] : m[1])),
  ),
];
const vtpConvId = [
  ...new Set(
    [...gtm.matchAll(/"vtp_conversionId":"([^"]+)"/g)].map((m) => m[1]),
  ),
];
const vtpConvLabel = [
  ...new Set(
    [...gtm.matchAll(/"vtp_conversionLabel":"([^"]+)"/g)].map((m) => m[1]),
  ),
];
const vtpMeasurementId = [
  ...new Set(
    [...gtm.matchAll(/"vtp_measurementId":"([^"]+)"/g)].map((m) => m[1]),
  ),
];
const vtpTrackingId = [
  ...new Set(
    [...gtm.matchAll(/"vtp_trackingId":"([^"]+)"/g)].map((m) => m[1]),
  ),
];

const hosts = [
  ...new Set(
    (gtm.match(/https?:\/\/[a-z0-9.-]+/gi) || [])
      .map((u) => {
        try {
          return new URL(u).hostname;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  ),
];

const keywords = [
  "facebook",
  "fbevents",
  "linkedin",
  "tiktok",
  "hotjar",
  "clarity",
  "segment",
  "floodlight",
  "flc",
  "customScripts",
  "html",
  "remarketing",
  "conversion_linker",
  "awct",
  "googtag",
  "gaawe",
  "sp",
  "hjid",
  "gtag",
];
const hits = Object.fromEntries(
  keywords.map((k) => [k, gtm.toLowerCase().includes(k.toLowerCase())]),
);

// Trigger / tag human-readable names if present
const names = [
  ...new Set([...gtm.matchAll(/"name":"([^"]{3,80})"/g)].map((m) => m[1])),
].filter(
  (n) =>
    /ga|ads|conversion|call|phone|form|estimate|click|page|linker|remark/i.test(
      n,
    ),
);

const out = {
  gtmBytes: gtm.length,
  gtagBytes: gtag.length,
  aw,
  sendTo,
  gids,
  vtpMeasurementId,
  vtpTrackingId,
  vtpConvId,
  vtpConvLabel,
  labelPairs,
  types,
  tagIds,
  eventNames,
  vtpEvent,
  arg0,
  names: names.slice(0, 120),
  hosts,
  hits,
};

fs.writeFileSync(
  "scripts/browser-verify-output/gtm-container-parse.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
