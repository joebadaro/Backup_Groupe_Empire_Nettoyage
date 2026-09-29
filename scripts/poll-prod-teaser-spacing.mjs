/**
 * Poll until spacing fix is live, then verify production.
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";

async function measure1280(path) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll(".fade-in-section").forEach((el) => {
      el.classList.add("is-visible");
    });
  });
  const metrics = await page.evaluate(() => {
    const trust = document.querySelector(".trust-container");
    const card = document.querySelector(".presentation-home-teaser__card");
    const teaser = document.querySelector(".presentation-home-teaser");
    const t = trust.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const s = getComputedStyle(teaser);
    return {
      overlapPx: Math.round(t.bottom - c.top),
      gapPx: Math.round(c.top - t.bottom),
      marginTop: s.marginTop,
    };
  });
  await browser.close();
  return metrics;
}

const start = Date.now();
let attempt = 0;
while (Date.now() - start < 600000) {
  attempt += 1;
  const m = await measure1280("/");
  const live = m.marginTop === "80px" && m.overlapPx <= 0;
  console.log(JSON.stringify({ phase: "poll", attempt, ...m, live }));
  if (live) break;
  await new Promise((r) => setTimeout(r, 20000));
}

const browser = await chromium.launch();
let failed = 0;
function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

async function test(path, width, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll(".fade-in-section").forEach((el) => el.classList.add("is-visible"));
  });
  const m = await page.evaluate(() => {
    const t = document.querySelector(".trust-container").getBoundingClientRect();
    const c = document.querySelector(".presentation-home-teaser__card").getBoundingClientRect();
    return { overlapPx: Math.round(t.bottom - c.top), gapPx: Math.round(c.top - t.bottom) };
  });
  check(`${label} — no overlap`, m.overlapPx <= 0, m);
  check(`${label} — gap >= 24px`, m.gapPx >= 24, m);
  check(`${label} — no console errors`, errors.length === 0, { errors });
  await page.close();
}

for (const w of [1024, 1280, 1440, 1920]) await test("/", w, `FR ${w}px`);
await test("/en/", 1280, "EN 1280px");
await test("/", 768, "tablet 768px");
await test("/", 390, "mobile 390px");

const fr = await fetch(`${BASE}/`);
const en = await fetch(`${BASE}/en/`);
check("SEO FR canonical", (await fr.text()).includes('rel="canonical"'));
check("SEO EN canonical", (await en.text()).includes('rel="canonical"'));

await browser.close();
process.exit(failed > 0 ? 1 : 0);
