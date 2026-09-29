/**
 * Wait for tel-link iOS fix on production, then run first-click tests.
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const COMMIT = "3e3b681";

async function bundleLive() {
  const html = await fetch(`${BASE}/`, {
    headers: { "Cache-Control": "no-cache", "User-Agent": "EmpireTelFixVerify/1.0" },
  }).then((r) => r.text());

  const scripts = [...html.matchAll(/src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const src of scripts) {
    const js = await fetch(`${BASE}${src}`, {
      headers: { "Cache-Control": "no-cache" },
    }).then((r) => r.text());
    if (js.includes("trackTelClickAndDeferClose") || js.includes("visibilitychange")) {
      if (js.includes("header_choice_call_click")) return true;
    }
  }
  return false;
}

async function waitDeploy(maxMs = 900000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    try {
      const deployRes = await fetch(
        "https://api.netlify.com/api/v1/sites/groupenettoyageempire.com/deploys?per_page=1",
      );
      const [deploy] = await deployRes.json();
      const live =
        deploy?.state === "ready" &&
        deploy?.commit_ref?.startsWith(COMMIT);
      console.log(
        `[${new Date().toISOString()}] attempt ${attempt}: netlify=${deploy?.state} commit=${deploy?.commit_ref?.slice(0, 7)} bundle=${await bundleLive()}`,
      );
      if (live && (await bundleLive())) {
        return deploy;
      }
    } catch (e) {
      console.log(`attempt ${attempt} error`, String(e));
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error("deploy timeout");
}

async function testProdCall(page, opts) {
  const { openModal, callSelector, modalSelector, label } = opts;
  await openModal(page);
  await page.waitForSelector(`${callSelector}:not([hidden])`, { timeout: 15000 });
  const result = await page.evaluate(({ callSelector, modalSelector }) => {
    const link = document.querySelector(callSelector);
    const modal = document.querySelector(modalSelector);
    let defaultPrevented = false;
    link?.addEventListener("click", (e) => {
      defaultPrevented = e.defaultPrevented;
    });
    link?.click();
    return {
      href: link?.getAttribute("href"),
      defaultPrevented,
      modalHiddenSync: modal?.hidden,
    };
  }, { callSelector, modalSelector });
  console.log(JSON.stringify({ label, ok: result.modalHiddenSync === false && result.href === "tel:+15148939939", ...result }));
  return result;
}

const deploy = await waitDeploy();
console.log("NETLIFY_DEPLOY", JSON.stringify({
  id: deploy.id,
  state: deploy.state,
  commit_ref: deploy.commit_ref,
  published_at: deploy.published_at,
  deploy_time: deploy.deploy_time,
}));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${BASE}/?headerModalDebug=after_hours`, { waitUntil: "networkidle" });
await testProdCall(page, {
  label: "prod header modal desktop FR",
  callSelector: "#header-choice-modal-primary-call",
  modalSelector: "#header-choice-modal",
  openModal: async (p) => {
    await p.evaluate(() => window.__openHeaderChoiceModal?.());
    await p.waitForSelector("#header-choice-modal:not([hidden])");
  },
});

await page.goto(`${BASE}/?headerModalDebug=weekday_evening&ahPopupDebug=1`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(11000);
await page.waitForSelector("#after-hours-phone-popup:not([hidden])", { timeout: 20000 });
await testProdCall(page, {
  label: "prod auto popup desktop FR",
  callSelector: "#ah-popup-primary-call",
  modalSelector: "#after-hours-phone-popup",
  openModal: async () => {},
});

const mobile = await browser.newPage();
mobile.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/?headerModalDebug=after_hours`, { waitUntil: "networkidle" });
await testProdCall(mobile, {
  label: "prod header modal mobile FR",
  callSelector: "#header-choice-modal-primary-call",
  modalSelector: "#header-choice-modal",
  openModal: async (p) => {
    await p.evaluate(() => window.__openMobileRepresentativeModal?.());
    await p.waitForSelector("#header-choice-modal:not([hidden])");
  },
});

console.log("CONSOLE_ERRORS", errors.slice(0, 5));
await browser.close();
