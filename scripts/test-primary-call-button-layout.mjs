/**
 * Tests two-line primary call button layout (modal + auto popup).
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/test-primary-call-button-layout.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

const browser = await chromium.launch();

async function assertCallButton(page, prefix, expectedAction, expectedPhone) {
  const fixed = await page.locator("#header-choice-modal-primary-call").evaluate((btn) => {
    const action = btn.querySelector(".call-btn__action");
    const phone = btn.querySelector(".call-btn__phone");
    if (!action || !phone) return null;
    const phoneStyle = window.getComputedStyle(phone);
    const actionStyle = window.getComputedStyle(action);
    const actionRect = action.getBoundingClientRect();
    const phoneRect = phone.getBoundingClientRect();
    return {
      href: btn.getAttribute("href"),
      ariaLabel: btn.getAttribute("aria-label"),
      action: action.textContent?.trim(),
      phone: phone.textContent?.trim(),
      whiteSpace: phoneStyle.whiteSpace,
      phoneFontSize: parseFloat(phoneStyle.fontSize),
      actionFontSize: parseFloat(actionStyle.fontSize),
      phoneBelowAction: phoneRect.top >= actionRect.bottom - 2,
      phoneSingleLine: phoneRect.height <= parseFloat(phoneStyle.lineHeight || "20") * 1.35,
    };
  });

  check(`${prefix} — tel href`, fixed?.href === "tel:+15148939939", fixed);
  check(`${prefix} — action text`, fixed?.action === expectedAction, fixed);
  check(`${prefix} — phone text`, fixed?.phone === expectedPhone, fixed);
  check(`${prefix} — phone nowrap`, fixed?.whiteSpace === "nowrap", fixed);
  check(`${prefix} — phone larger`, (fixed?.phoneFontSize || 0) > (fixed?.actionFontSize || 0), fixed);
  check(`${prefix} — phone single line`, Boolean(fixed?.phoneSingleLine), fixed);
  check(`${prefix} — stacked layout`, Boolean(fixed?.phoneBelowAction), fixed);
}

async function testModal(path, viewport, suffix, action, phone) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=weekday_day`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => window.__openHeaderChoiceModal?.());
  await page.waitForSelector("#header-choice-modal-primary-call:not([hidden])", {
    timeout: 8000,
  });

  await assertCallButton(page, `${suffix} modal`, action, phone);
  check(`${suffix} modal — no console errors`, errors.length === 0, { errors });
  await page.close();
}

async function testPopup(path, viewport, suffix, param, action, phone) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=${param}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(10500);
  await page.waitForSelector("#ah-popup-primary-call:not([hidden])", {
    timeout: 8000,
  });

  const fixed = await page.locator("#ah-popup-primary-call").evaluate((btn) => {
    const actionEl = btn.querySelector(".call-btn__action");
    const phoneEl = btn.querySelector(".call-btn__phone");
    if (!actionEl || !phoneEl) return null;
    const phoneStyle = window.getComputedStyle(phoneEl);
    const actionStyle = window.getComputedStyle(actionEl);
    const actionRect = actionEl.getBoundingClientRect();
    const phoneRect = phoneEl.getBoundingClientRect();
    return {
      href: btn.getAttribute("href"),
      action: actionEl.textContent?.trim(),
      phone: phoneEl.textContent?.trim(),
      whiteSpace: phoneStyle.whiteSpace,
      phoneFontSize: parseFloat(phoneStyle.fontSize),
      actionFontSize: parseFloat(actionStyle.fontSize),
      phoneBelowAction: phoneRect.top >= actionRect.bottom - 2,
      phoneSingleLine: phoneRect.height <= parseFloat(phoneStyle.lineHeight || "20") * 1.35,
    };
  });

  check(`${suffix} popup — tel href`, fixed?.href === "tel:+15148939939", fixed);
  check(`${suffix} popup — action`, fixed?.action === action, fixed);
  check(`${suffix} popup — phone`, fixed?.phone === phone, fixed);
  check(`${suffix} popup — nowrap`, fixed?.whiteSpace === "nowrap", fixed);
  check(`${suffix} popup — phone larger`, (fixed?.phoneFontSize || 0) > (fixed?.actionFontSize || 0), fixed);
  check(`${suffix} popup — single line`, Boolean(fixed?.phoneSingleLine), fixed);
  check(`${suffix} popup — no console errors`, errors.length === 0, { errors });
  await page.close();
}

for (const width of [320, 360, 390, 430]) {
  await testModal("/", { width, height: 700 }, `${width}px FR`, "Appeler maintenant", "514-893-9939");
}

await testModal("/", { width: 1280, height: 800 }, "desktop FR", "Appeler maintenant", "514-893-9939");
await testModal("/en/", { width: 390, height: 844 }, "mobile EN", "Call now", "514-893-9939");
await testModal("/en/", { width: 1280, height: 800 }, "desktop EN", "Call now", "514-893-9939");

await testPopup("/", { width: 390, height: 844 }, "390px FR", "weekday_evening", "Appeler maintenant", "514-893-9939");
await testPopup("/en/", { width: 1280, height: 800 }, "desktop EN", "weekday_evening", "Call now", "514-893-9939");

await browser.close();
process.exit(failed > 0 ? 1 : 0);
