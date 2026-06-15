/**
 * Ensures modal/popup call links keep tel: on first click (no sync close / no preventDefault).
 * Usage: PREVIEW_URL=http://localhost:4321 node scripts/test-tel-link-first-click.mjs
 */
import { chromium, devices } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4321";
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

async function testCallLink(page, opts) {
  const {
    openModal,
    callSelector,
    modalSelector,
    label,
  } = opts;

  await openModal(page);
  await page.waitForSelector(`${callSelector}:not([hidden])`, { timeout: 8000 });

  const result = await page.evaluate(({ callSelector, modalSelector }) => {
    const link = document.querySelector(callSelector);
    const modal = document.querySelector(modalSelector);
    if (!link || !modal) {
      return { error: "missing elements" };
    }

    let defaultPrevented = false;
    link.addEventListener(
      "click",
      (event) => {
        defaultPrevented = event.defaultPrevented;
      },
      { capture: false },
    );

    link.click();

    return {
      href: link.getAttribute("href"),
      defaultPrevented,
      modalHiddenSync: modal.hidden,
      linkInDom: document.body.contains(link),
    };
  }, { callSelector, modalSelector });

  check(`${label} — href tel preserved`, result.href === "tel:+15148939939", result);
  check(`${label} — no preventDefault`, result.defaultPrevented === false, result);
  check(`${label} — modal not closed synchronously`, result.modalHiddenSync === false, result);
  check(`${label} — link still in DOM`, result.linkInDom === true, result);
}

const browser = await chromium.launch();

async function runDesktopSuite() {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(`${baseUrl}/?headerModalDebug=after_hours`, {
    waitUntil: "networkidle",
  });

  await testCallLink(page, {
    label: "header modal FR desktop",
    callSelector: "#header-choice-modal-primary-call",
    modalSelector: "#header-choice-modal",
    openModal: async (p) => {
      await p.evaluate(() => window.__openHeaderChoiceModal?.());
      await p.waitForSelector("#header-choice-modal:not([hidden])");
    },
  });

  await page.goto(`${baseUrl}/?headerModalDebug=weekday_evening&ahPopupDebug=1`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(11000);
  await page.waitForSelector("#after-hours-phone-popup:not([hidden])", {
    timeout: 15000,
  });

  await testCallLink(page, {
    label: "auto popup FR desktop",
    callSelector: "#ah-popup-primary-call",
    modalSelector: "#after-hours-phone-popup",
    openModal: async () => {},
  });

  await page.close();
}

async function runMobileSuite(deviceName, path, suffix) {
  const device = devices[deviceName];
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();

  await page.goto(`${baseUrl}${path}?headerModalDebug=after_hours`, {
    waitUntil: "networkidle",
  });

  await testCallLink(page, {
    label: `header modal ${suffix}`,
    callSelector: "#header-choice-modal-primary-call",
    modalSelector: "#header-choice-modal",
    openModal: async (p) => {
      await p.evaluate(() => window.__openMobileRepresentativeModal?.());
      await p.waitForSelector("#header-choice-modal:not([hidden])");
    },
  });

  await context.close();
}

await runDesktopSuite();
await runMobileSuite("iPhone 13", "/", "iPhone Safari FR");
await runMobileSuite("Pixel 5", "/en/", "Android Chrome EN");

await browser.close();
process.exit(failed > 0 ? 1 : 0);
