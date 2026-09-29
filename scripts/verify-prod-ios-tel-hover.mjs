/**
 * Wait for iOS tel hover fix on production and verify modals.
 */
import { chromium, devices } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const COMMIT = "4299fe6";

async function bundleLive() {
  const html = await fetch(`${BASE}/`, {
    headers: { "Cache-Control": "no-cache", "User-Agent": "EmpireTelHoverFix/1.0" },
  }).then((r) => r.text());
  const scripts = [...html.matchAll(/src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const src of scripts) {
    const js = await fetch(`${BASE}${src}`, {
      headers: { "Cache-Control": "no-cache" },
    }).then((r) => r.text());
    if (js.includes("bindTelCallLinkHandoff") && js.includes("focusModalPanel")) {
      return true;
    }
  }
  return false;
}

async function waitDeploy(maxMs = 900000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const res = await fetch(
      "https://api.netlify.com/api/v1/sites/groupenettoyageempire.com/deploys?per_page=1",
    );
    const [deploy] = await res.json();
    const live =
      deploy?.state === "ready" && deploy?.commit_ref?.startsWith(COMMIT) && (await bundleLive());
    console.log(
      `[${new Date().toISOString()}] attempt ${attempt}: state=${deploy?.state} commit=${deploy?.commit_ref?.slice(0, 7)} live=${live}`,
    );
    if (live) return deploy;
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error("deploy timeout");
}

async function testModal(page, { path, openFn, label, viewport }) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${path}?headerModalDebug=after_hours`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.evaluate((fn) => window[fn]?.(), openFn);
  await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 15000 });

  const r = await page.evaluate(() => {
    const link = document.getElementById("header-choice-modal-primary-call");
    const panel = document.querySelector(".header-choice-modal__panel");
    const text = link?.querySelector(".call-btn__text");
    let prevented = false;
    link?.addEventListener("click", (e) => {
      prevented = e.defaultPrevented;
    });
    link?.click();
    const cs = link ? getComputedStyle(link) : null;
    return {
      href: link?.getAttribute("href"),
      prevented,
      hiddenSync: document.getElementById("header-choice-modal")?.hidden,
      transform: cs?.transform,
      touchAction: cs?.touchAction,
      textPE: text ? getComputedStyle(text).pointerEvents : null,
      panelFocused: document.activeElement === panel,
      callFocused: document.activeElement === link,
      gtm: typeof window.dataLayer !== "undefined",
    };
  });

  console.log(
    JSON.stringify({
      label,
      ok:
        r.href === "tel:+15148939939" &&
        !r.prevented &&
        r.hiddenSync === false &&
        r.transform === "none" &&
        r.textPE === "none" &&
        !r.callFocused &&
        r.gtm,
      ...r,
      consoleErrors: errors.slice(0, 3),
    }),
  );
  return r;
}

const deploy = await waitDeploy();
console.log(
  "NETLIFY",
  JSON.stringify({
    id: deploy.id,
    state: deploy.state,
    commit_ref: deploy.commit_ref,
    published_at: deploy.published_at,
    deploy_time: deploy.deploy_time,
  }),
);

const browser = await chromium.launch();

const desktop = await browser.newPage();
await testModal(desktop, {
  path: "/",
  openFn: "__openHeaderChoiceModal",
  label: "prod desktop FR",
  viewport: { width: 1280, height: 800 },
});
await testModal(desktop, {
  path: "/en/",
  openFn: "__openHeaderChoiceModal",
  label: "prod desktop EN",
  viewport: { width: 1280, height: 800 },
});
await desktop.close();

const iphone = await browser.newContext({ ...devices["iPhone 13"] });
const mobileFr = await iphone.newPage();
await testModal(mobileFr, {
  path: "/",
  openFn: "__openMobileRepresentativeModal",
  label: "prod mobile FR iPhone",
  viewport: { width: 390, height: 844 },
});
const mobileEn = await iphone.newPage();
await testModal(mobileEn, {
  path: "/en/",
  openFn: "__openMobileRepresentativeModal",
  label: "prod mobile EN iPhone",
  viewport: { width: 390, height: 844 },
});
await iphone.close();
await browser.close();

console.log("PROD_CHECKS_DONE");
