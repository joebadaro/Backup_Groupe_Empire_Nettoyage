/**
 * Poll production deploy + verify modal/popup assets and CTAs.
 * Usage: node scripts/verify-prod-modal-deploy.mjs
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const MARKERS = [
  'id="header-choice-modal"',
  'id="after-hours-phone-popup"',
  "Contactez-nous",
  "btn-open-estimation",
  "btn-mobile-representative",
];

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireDeployVerify/2.0" },
  });
  return { status: res.status, html: await res.text(), url: res.url };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const { status, html } = await fetchHtml("/");
    const hits = MARKERS.filter((m) => html.includes(m));
    const live = status === 200 && hits.length >= 4;
    console.log(
      JSON.stringify({
        phase: "poll",
        attempt,
        status,
        markerHits: hits.length,
        live,
        at: new Date().toISOString(),
      }),
    );
    if (live) return { attempts: attempt, at: new Date().toISOString() };
    await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error("Deploy poll timeout");
}

const deploy = await waitForDeploy();
console.log(JSON.stringify({ phase: "deploy_ready", ...deploy }));

const pages = [
  { path: "/", label: "accueil FR", locale: "fr" },
  { path: "/en/", label: "accueil EN", locale: "en" },
  { path: "/services/nettoyage-tapis-candiac/", label: "tapis Candiac FR", locale: "fr" },
  { path: "/services/nettoyage-tapis-brossard/", label: "tapis Brossard FR", locale: "fr" },
  { path: "/services/meubles-tissu/", label: "meubles tissu FR", locale: "fr" },
  { path: "/en/services/tapis/", label: "tapis EN", locale: "en" },
];

const browser = await chromium.launch();
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 700 },
]) {
  for (const pageInfo of pages) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const url = `${BASE}${pageInfo.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    const headerBtn = page.locator("#btn-open-estimation");
    const mobileBtn = page.locator("#btn-mobile-representative");
    const headerText = (await headerBtn.textContent())?.trim();
    const mobileVisible = await mobileBtn.isVisible().catch(() => false);
    const mobileText = mobileVisible
      ? (await mobileBtn.textContent())?.trim()
      : null;

    const expectedContact = pageInfo.locale === "en" ? "Contact us" : "Contactez-nous";
    check(`${viewport.name} ${pageInfo.label} — header CTA`, headerText === expectedContact, {
      headerText,
    });
    if (mobileVisible) {
      check(`${viewport.name} ${pageInfo.label} — mobile CTA`, mobileText === expectedContact, {
        mobileText,
      });
    }

    const urlBefore = page.url();
    if (viewport.name.startsWith("mobile") && mobileVisible) {
      await mobileBtn.click();
    } else {
      await headerBtn.click();
    }
    await page.waitForTimeout(600);
    const modalOpen = await page.locator("#header-choice-modal:not([hidden])").isVisible();
    const urlAfter = page.url();
    check(`${viewport.name} ${pageInfo.label} — modal opens`, modalOpen, { urlBefore, urlAfter });
    check(`${viewport.name} ${pageInfo.label} — no navigation`, urlBefore === urlAfter);

    if (modalOpen) {
      const title = (await page.locator("#header-choice-modal-title").textContent())?.trim();
      const bodyHidden = await page
        .locator("#header-choice-modal-body")
        .evaluate((el) => el.hidden);
      const callHref = await page
        .locator("#header-choice-modal-primary-call")
        .getAttribute("href");
      const phone = (
        await page.locator("#header-choice-modal-primary-call-phone").textContent()
      )?.trim();
      const forbidden = await page.locator("#header-choice-modal").evaluate((el) => {
        const t = el.textContent || "";
        return (
          t.includes("ferm") ||
          t.includes("closed") ||
          t.includes("texto") ||
          t.includes("Send a text") ||
          t.includes("sms:")
        );
      });

      check(`${viewport.name} ${pageInfo.label} — tel link`, callHref === "tel:+15148939939", {
        callHref,
      });
      check(`${viewport.name} ${pageInfo.label} — phone one line`, phone === "514-893-9939", {
        phone,
      });
      check(`${viewport.name} ${pageInfo.label} — no forbidden copy`, !forbidden, { title });
      check(`${viewport.name} ${pageInfo.label} — title present`, Boolean(title && title.length > 5), {
        title,
      });
    }

    const hasPopupRoot = (await page.locator("#after-hours-phone-popup").count()) > 0;
    const hasModalRoot = (await page.locator("#header-choice-modal").count()) > 0;
    check(`${viewport.name} ${pageInfo.label} — popup root`, hasPopupRoot);
    check(`${viewport.name} ${pageInfo.label} — modal root`, hasModalRoot);

    const debugIgnored = await page
      .goto(`${url}?headerModalDebug=weekday_evening`, { waitUntil: "networkidle" })
      .then(async () => {
        await page.waitForTimeout(10500);
        const popupOpen = await page
          .locator("#after-hours-phone-popup")
          .evaluate((el) => !el.hidden)
          .catch(() => false);
        return !popupOpen;
      });
    check(`${viewport.name} ${pageInfo.label} — debug inactive in prod`, debugIgnored);

    const gtmPresent = await page.evaluate(
      () => typeof window.dataLayer !== "undefined" || document.querySelector("script[src*='gtm']") !== null,
    );
    check(`${viewport.name} ${pageInfo.label} — GTM present`, gtmPresent);

    check(`${viewport.name} ${pageInfo.label} — no console errors`, errors.length === 0, {
      errors: errors.slice(0, 3),
    });

    await page.close();
  }
}

await browser.close();

const seoPaths = ["/", "/en/", "/services/nettoyage-tapis-candiac/", "/services/meubles-tissu/"];
for (const path of seoPaths) {
  const { status, html, url } = await fetchHtml(path);
  check(`SEO ${path} — HTTP 200`, status === 200, { url });
  check(`SEO ${path} — canonical present`, html.includes('rel="canonical"'));
  check(`SEO ${path} — path unchanged`, url.endsWith(path) || url.includes(path.replace(/\/$/, "")));
}

console.log(JSON.stringify({ phase: "done", failed, originMainExpected: "c481758f84113426907f685c6f70499fa27cedcf" }));
process.exit(failed > 0 ? 1 : 0);
