/**
 * Copy + layout checks for availability popups and modals (evening / weekend).
 * Usage: PREVIEW_URL=http://localhost:4323 node scripts/test-availability-copy-layout.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

const browser = await chromium.launch();

async function assertActionsInViewport(page, prefix, rootSelector) {
  const layout = await page.evaluate((selector) => {
    const panel = document.querySelector(selector);
    const call = panel?.querySelector('[data-hcm-action="call"], [data-ah-action="call"]');
    const form = panel?.querySelector('[data-hcm-action="form"], [data-ah-action="form"]');
    if (!panel || !call || !form) return null;
    const vh = window.innerHeight;
    const callRect = call.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    return {
      callVisible: callRect.top >= 0 && callRect.bottom <= vh + 1,
      formVisible: formRect.top >= 0 && formRect.bottom <= vh + 1,
      panelHeight: panel.getBoundingClientRect().height,
    };
  }, rootSelector);

  check(`${prefix} — call visible`, layout?.callVisible === true, layout);
  check(`${prefix} — form visible`, layout?.formVisible === true, layout);
}

async function testModal(path, param, viewport, suffix, bodyNeedle, secondaryNeedle) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=${param}`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => window.__openHeaderChoiceModal?.());
  await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 8000 });

  const body = (await page.locator("#header-choice-modal-body").textContent())?.trim() || "";
  check(`${suffix} modal — body copy`, body.includes(bodyNeedle) && body.includes(secondaryNeedle), {
    body: body.slice(0, 90),
  });
  await assertActionsInViewport(page, `${suffix} modal`, ".header-choice-modal__panel");
  check(`${suffix} modal — no console errors`, errors.length === 0, { errors });
  await page.close();
}

async function testPopup(path, param, viewport, suffix, bodyNeedle, secondaryNeedle) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=${param}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(10500);
  await page.waitForSelector("#after-hours-phone-popup:not([hidden])", { timeout: 8000 });

  const body = (await page.locator("#ah-popup-body").textContent())?.trim() || "";
  const secondary =
    (await page.locator("#ah-popup-hours-line").textContent())?.trim() || "";
  check(`${suffix} popup — body copy`, body.includes(bodyNeedle), { body: body.slice(0, 90) });
  check(`${suffix} popup — secondary copy`, secondary.includes(secondaryNeedle), {
    secondary,
  });
  await assertActionsInViewport(page, `${suffix} popup`, ".ah-phone-popup__panel");
  check(`${suffix} popup — no console errors`, errors.length === 0, { errors });
  await page.close();
}

const widths = [320, 360, 390, 430];

for (const width of widths) {
  await testModal(
    "/",
    "weekday_evening",
    { width, height: 700 },
    `${width}px FR evening`,
    "jusqu'à 21 h",
    "sans hésiter",
  );
  await testModal(
    "/",
    "weekend",
    { width, height: 700 },
    `${width}px FR weekend`,
    "jusqu'à 21 h",
    "sept jours sur sept",
  );
  await testPopup(
    "/",
    "weekday_evening",
    { width, height: 700 },
    `${width}px FR evening`,
    "jusqu'à 21 h",
    "sans hésiter",
  );
  await testPopup(
    "/",
    "weekend",
    { width, height: 700 },
    `${width}px FR weekend`,
    "jusqu'à 21 h",
    "sept jours sur sept",
  );
}

await testModal(
  "/en/",
  "weekday_evening",
  { width: 1280, height: 800 },
  "desktop EN evening",
  "until 9:00 p.m.",
  "Feel free to call us now",
);
await testModal(
  "/en/",
  "weekend",
  { width: 1280, height: 800 },
  "desktop EN weekend",
  "until 9:00 p.m.",
  "seven days a week",
);
await testPopup(
  "/en/",
  "weekday_evening",
  { width: 390, height: 844 },
  "390px EN evening",
  "until 9:00 p.m.",
  "Feel free to call us now",
);
await testPopup(
  "/en/",
  "weekend",
  { width: 390, height: 844 },
  "390px EN weekend",
  "until 9:00 p.m.",
  "seven days a week",
);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
