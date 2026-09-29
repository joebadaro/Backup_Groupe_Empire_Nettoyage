/**
 * Poll production deploy + verify presentation teaser spacing.
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const MARKER = "margin-top: 5rem";

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireSpacingVerify/1.0" },
  });
  return { status: res.status, html: await res.text(), url: res.url };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const { status, html } = await fetchHtml("/");
    const hasTeaser = html.includes("presentation-home-teaser");
    const live = status === 200 && hasTeaser;
    console.log(
      JSON.stringify({ phase: "poll", attempt, status, hasTeaser, live, at: new Date().toISOString() }),
    );
    if (live) {
      // CSS is in component bundle — verify via spacing measurement once page loads
      return { attempts: attempt, at: new Date().toISOString() };
    }
    await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error("Deploy poll timeout");
}

const deploy = await waitForDeploy();
console.log(JSON.stringify({ phase: "deploy_ready", ...deploy }));

const browser = await chromium.launch();
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

async function measureSpacing(path, width, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll(".fade-in-section").forEach((el) => {
      el.classList.add("is-visible");
    });
  });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const trust = document.querySelector(".trust-container");
    const card = document.querySelector(".presentation-home-teaser__card");
    const teaser = document.querySelector(".presentation-home-teaser");
    if (!trust || !card || !teaser) return null;
    const t = trust.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const style = window.getComputedStyle(teaser);
    return {
      overlapPx: Math.round(t.bottom - c.top),
      gapPx: Math.round(c.top - t.bottom),
      marginTop: style.marginTop,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null,
    };
  });

  check(`${label} — no overlap`, (metrics?.overlapPx ?? 99) <= 0, metrics);
  check(`${label} — gap >= 24px`, (metrics?.gapPx ?? 0) >= 24, metrics);
  check(`${label} — no console errors`, errors.length === 0, { errors });

  await page.close();
}

for (const w of [1024, 1280, 1440, 1920]) {
  await measureSpacing("/", w, `FR desktop ${w}px`);
}
await measureSpacing("/en/", 1280, "EN desktop 1280px");
await measureSpacing("/", 768, "FR tablet 768px");
await measureSpacing("/", 390, "FR mobile 390px");

const { status, html, url } = await fetchHtml("/");
check("SEO FR home HTTP 200", status === 200, { url });
check("SEO FR canonical present", html.includes('rel="canonical"'));
check("SEO FR path unchanged", url === "https://groupenettoyageempire.com/");

const en = await fetchHtml("/en/");
check("SEO EN home HTTP 200", en.status === 200, { url: en.url });
check("SEO EN canonical present", en.html.includes('rel="canonical"'));

await browser.close();
console.log(JSON.stringify({ phase: "done", failed, originMainExpected: "e81040a3fe1ec3df62434689c2583a1e9108ca4d" }));
process.exit(failed > 0 ? 1 : 0);
