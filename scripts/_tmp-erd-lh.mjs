/**
 * Lighthouse mobile A/B extract — ERD + mainthread groups.
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);

const url = args.url || "http://127.0.0.1:4173/";
const runs = Number(args.runs || 5);
const label = String(args.label || "run");
const outDir = resolve("scripts/browser-verify-output");
mkdirSync(outDir, { recursive: true });

function median(nums) {
  const s = [...nums].filter((n) => typeof n === "number" && !Number.isNaN(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  return s[Math.floor(s.length / 2)];
}

function runLH(i) {
  const tmp = resolve(outDir, `_erd-tmp-${label}-${i}.json`);
  const final = resolve(outDir, `lh-erd-${label}-${i}.json`);
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
        "--throttling-method=simulate",
        "--output=json",
        `--output-path=${tmp}`,
        "--chrome-flags=--headless --no-sandbox",
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
        reject(new Error(`LH failed ${code}: ${err.slice(0, 500)}`));
        return;
      }
      copyFileSync(tmp, final);
      resolveP(JSON.parse(readFileSync(tmp, "utf8")));
    });
  });
}

function extract(report) {
  const a = report.audits;
  const m = a.metrics?.details?.items?.[0] || {};
  const bd = a["lcp-breakdown-insight"]?.details?.items?.[0]?.items || [];
  const phases = Object.fromEntries(bd.map((x) => [x.subpart, x.duration]));
  const mt = a["mainthread-work-breakdown"]?.details?.items || [];
  const mtMap = Object.fromEntries(mt.map((t) => [t.group, t.duration]));
  const node = a["lcp-breakdown-insight"]?.details?.items?.find(
    (x) => x.type === "node",
  );
  return {
    perf: Math.round((report.categories?.performance?.score || 0) * 100),
    fcp: a["first-contentful-paint"]?.numericValue,
    lcpSim: a["largest-contentful-paint"]?.numericValue,
    si: a["speed-index"]?.numericValue,
    tbt: a["total-blocking-time"]?.numericValue,
    cls: a["cumulative-layout-shift"]?.numericValue,
    lcpObs: m.observedLargestContentfulPaint,
    erd: phases.elementRenderDelay ?? null,
    ttfb: phases.timeToFirstByte ?? null,
    rld: phases.resourceLoadDelay ?? null,
    rldur: phases.resourceLoadDuration ?? null,
    styleLayout: mtMap.styleLayout ?? null,
    paintCompositeRender: mtMap.paintCompositeRender ?? null,
    scriptEvaluation: mtMap.scriptEvaluation ?? null,
    lcpFile: /portrait-800/.test(node?.snippet || "")
      ? "hero-salon-portrait-800"
      : (node?.snippet || "").slice(0, 80),
  };
}

const results = [];
for (let i = 1; i <= runs; i++) {
  process.stdout.write(`[${label}] ${i}/${runs}...\n`);
  const row = extract(await runLH(i));
  results.push(row);
  process.stdout.write(
    `  perf=${row.perf} LCP=${Math.round(row.lcpSim)} obs=${row.lcpObs} ERD=${row.erd && Math.round(row.erd)} style=${row.styleLayout && Math.round(row.styleLayout)} paint=${row.paintCompositeRender && Math.round(row.paintCompositeRender)} CLS=${row.cls}\n`,
  );
}

const summary = {
  label,
  url,
  results,
  median: {
    perf: median(results.map((r) => r.perf)),
    fcp: median(results.map((r) => r.fcp)),
    lcpSim: median(results.map((r) => r.lcpSim)),
    si: median(results.map((r) => r.si)),
    tbt: median(results.map((r) => r.tbt)),
    cls: median(results.map((r) => r.cls)),
    lcpObs: median(results.map((r) => r.lcpObs)),
    erd: median(results.map((r) => r.erd)),
    styleLayout: median(results.map((r) => r.styleLayout)),
    paintCompositeRender: median(results.map((r) => r.paintCompositeRender)),
  },
};
writeFileSync(
  resolve(outDir, `erd-ab-${label}-summary.json`),
  JSON.stringify(summary, null, 2),
);
console.log("MEDIAN", summary.median);
