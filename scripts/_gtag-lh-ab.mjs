/**
 * Lighthouse mobile with Google JS / unused JS extraction.
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

const url = args.url || "http://127.0.0.1:4176/";
const runs = Number(args.runs || 5);
const label = String(args.label || "run");
const outDir = resolve("scripts/browser-verify-output");
mkdirSync(outDir, { recursive: true });

function median(nums) {
  const s = [...nums]
    .filter((n) => typeof n === "number" && !Number.isNaN(n))
    .sort((a, b) => a - b);
  if (!s.length) return null;
  return s[Math.floor(s.length / 2)];
}

function runLH(i) {
  const tmp = resolve(outDir, `_gtag-lh-tmp-${label}-${i}.json`);
  const final = resolve(outDir, `lh-gtag-${label}-${i}.json`);
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

function isGoogleUrl(u) {
  return /googletagmanager|google-analytics|analytics\.google|doubleclick|googleadservices|google\.[a-z]+\/(?:ads|pagead|measurement)/i.test(
    u || "",
  );
}

function extract(report) {
  const a = report.audits;
  const net = a["network-requests"]?.details?.items || [];
  const googleNet = net.filter((i) => isGoogleUrl(i.url));
  const googleTransfer = googleNet.reduce(
    (n, i) => n + (i.transferSize || 0),
    0,
  );
  const gtm = googleNet.find((i) => /gtm\.js\?id=GTM/i.test(i.url || ""));
  const gtag = googleNet.find((i) => /gtag\/js\?id=G-/i.test(i.url || ""));

  const unused = a["unused-javascript"]?.details?.items || [];
  const unusedGoogle = unused.filter((i) => isGoogleUrl(i.url));
  const unusedGoogleBytes = unusedGoogle.reduce(
    (n, i) => n + (i.wastedBytes || 0),
    0,
  );

  const mt = a["mainthread-work-breakdown"]?.details?.items || [];
  const bootup = a["bootup-time"]?.details?.items || [];
  const googleBoot = bootup.filter((i) => isGoogleUrl(i.url));
  const googleMainThread = googleBoot.reduce(
    (n, i) => n + (i.total || i.scripting || 0),
    0,
  );

  return {
    perf: Math.round((report.categories?.performance?.score || 0) * 100),
    fcp: a["first-contentful-paint"]?.numericValue,
    lcpSim: a["largest-contentful-paint"]?.numericValue,
    si: a["speed-index"]?.numericValue,
    tbt: a["total-blocking-time"]?.numericValue,
    cls: a["cumulative-layout-shift"]?.numericValue,
    googleTransfer,
    googleRequests: googleNet.length,
    gtmTransfer: gtm?.transferSize ?? 0,
    gtagTransfer: gtag?.transferSize ?? 0,
    unusedGoogleBytes,
    googleMainThread,
    styleLayout: mt.find((t) => t.group === "styleLayout")?.duration ?? null,
    scriptEvaluation:
      mt.find((t) => t.group === "scriptEvaluation")?.duration ?? null,
  };
}

const results = [];
for (let i = 1; i <= runs; i++) {
  process.stdout.write(`[${label}] ${i}/${runs}...\n`);
  const row = extract(await runLH(i));
  results.push(row);
  process.stdout.write(
    `  perf=${row.perf} LCP=${Math.round(row.lcpSim)} TBT=${Math.round(row.tbt)} gXfer=${row.googleTransfer} unusedG=${row.unusedGoogleBytes} gMT=${Math.round(row.googleMainThread)} reqG=${row.googleRequests}\n`,
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
    googleTransfer: median(results.map((r) => r.googleTransfer)),
    googleRequests: median(results.map((r) => r.googleRequests)),
    gtmTransfer: median(results.map((r) => r.gtmTransfer)),
    gtagTransfer: median(results.map((r) => r.gtagTransfer)),
    unusedGoogleBytes: median(results.map((r) => r.unusedGoogleBytes)),
    googleMainThread: median(results.map((r) => r.googleMainThread)),
  },
};
writeFileSync(
  resolve(outDir, `gtag-lh-${label}-summary.json`),
  JSON.stringify(summary, null, 2),
);
console.log("MEDIAN", summary.median);
