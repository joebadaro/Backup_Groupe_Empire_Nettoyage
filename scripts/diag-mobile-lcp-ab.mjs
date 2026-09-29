/**
 * Diagnostic Lighthouse mobile A/B — médiane de N runs.
 * Usage:
 *   node scripts/diag-mobile-lcp-ab.mjs --label=gtm-on --runs=3 --out=scripts/browser-verify-output/diag-gtm-on.json
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);

const url = args.url || "http://127.0.0.1:4330/";
const runs = Number(args.runs || 3);
const label = String(args.label || "run");
const outPath = resolve(
  args.out || `scripts/browser-verify-output/diag-${label}.json`,
);
const portFlags = args.chromeFlags || "--headless --no-sandbox";

mkdirSync(resolve("scripts/browser-verify-output"), { recursive: true });

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function runLighthouse(runIndex) {
  const tmp = resolve(
    `scripts/browser-verify-output/_diag-tmp-${label}-${runIndex}.json`,
  );
  return new Promise((resolveP, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        "--only-categories=performance",
        "--form-factor=mobile",
        "--screenEmulation.mobile=true",
        "--output=json",
        `--output-path=${tmp}`,
        `--chrome-flags=${portFlags}`,
        "--quiet",
      ],
      { shell: true, cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (!existsSync(tmp)) {
        reject(new Error(`LH failed (${code}): ${err.slice(0, 500)}`));
        return;
      }
      try {
        const r = JSON.parse(readFileSync(tmp, "utf8"));
        resolveP({ path: tmp, report: r });
      } catch (e) {
        reject(e);
      }
    });
  });
}

function extract(report) {
  const a = report.audits || {};
  const perf = Math.round((report.categories?.performance?.score || 0) * 100);
  const num = (id) => a[id]?.numericValue ?? null;
  const display = (id) => a[id]?.displayValue ?? null;

  const network = a["network-requests"]?.details?.items || [];
  const hero = network.find((i) =>
    /hero-salon-nettoyage-vapeur-montreal-portrait/.test(i.url || ""),
  );
  const deferredScripts = network
    .filter((i) =>
      /visitor-sms|sms-client-context|header-choice|tel-link-handoff|phones\.|conversion|after-hours|boot-deferred/.test(
        i.url || "",
      ),
    )
    .map((i) => ({
      url: (i.url || "").split("/").pop(),
      start: i.networkRequestTime,
      end: i.networkEndTime,
    }));

  // LCP breakdown — formats LH 11/12/13
  let breakdown = null;
  const insight =
    a["lcp-breakdown-insight"] ||
    a["largest-contentful-paint-element"] ||
    null;
  if (insight?.details) {
    breakdown = insight.details;
  }
  // Also scan insights array if present
  const insights = report.insights || {};
  const lcpInsight =
    insights["lcp-breakdown"] || insights["lcp-breakdown-insight"];
  if (lcpInsight) breakdown = { ...(breakdown || {}), insight: lcpInsight };

  // Trace-derived phases sometimes live under details.items tables
  const phases = {};
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const phase = node.phase || node.label || node.key;
    const timing = node.timing ?? node.duration ?? node.value;
    if (phase && typeof timing === "number") {
      phases[String(phase)] = timing;
    }
    if (node.subItems?.items) walk(node.subItems.items);
    Object.values(node).forEach(walk);
  };
  walk(breakdown);
  walk(a["lcp-breakdown-insight"]);

  return {
    perf,
    fcpMs: num("first-contentful-paint"),
    lcpMs: num("largest-contentful-paint"),
    siMs: num("speed-index"),
    tbtMs: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    fcp: display("first-contentful-paint"),
    lcp: display("largest-contentful-paint"),
    si: display("speed-index"),
    tbt: display("total-blocking-time"),
    clsDisplay: display("cumulative-layout-shift"),
    hero: hero
      ? {
          url: (hero.url || "").split("/").pop(),
          start: hero.networkRequestTime,
          end: hero.networkEndTime,
          size: hero.resourceSize,
          transfer: hero.transferSize,
        }
      : null,
    deferredScripts,
    phases,
    breakdownKeys: breakdown ? Object.keys(breakdown) : [],
    auditIdsWithLcp: Object.keys(a).filter((k) => /lcp/i.test(k)),
  };
}

const results = [];
for (let i = 1; i <= runs; i++) {
  process.stdout.write(`[${label}] run ${i}/${runs}...\n`);
  const { report, path } = await runLighthouse(i);
  const row = extract(report);
  results.push(row);
  process.stdout.write(
    `  → perf=${row.perf} LCP=${row.lcp} FCP=${row.fcp} TBT=${row.tbt}\n`,
  );
  // keep last full report for deep dive
  if (i === runs) {
    writeFileSync(
      resolve(`scripts/browser-verify-output/diag-${label}-last-full.json`),
      JSON.stringify(report),
    );
  }
  // optional: delete tmp to save disk — keep for debug
  void path;
}

const summary = {
  label,
  url,
  runs,
  results,
  median: {
    perf: median(results.map((r) => r.perf)),
    fcpMs: median(results.map((r) => r.fcpMs).filter((n) => n != null)),
    lcpMs: median(results.map((r) => r.lcpMs).filter((n) => n != null)),
    siMs: median(results.map((r) => r.siMs).filter((n) => n != null)),
    tbtMs: median(results.map((r) => r.tbtMs).filter((n) => n != null)),
    cls: median(results.map((r) => r.cls).filter((n) => n != null)),
  },
};

writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log("\nMEDIAN", summary.median);
console.log("Wrote", outPath);
