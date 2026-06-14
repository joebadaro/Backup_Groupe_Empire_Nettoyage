/**
 * Verifies neutral contact CTA labels and modal roles.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/test-contact-cta-labels.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
let failed = 0;

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

const browser = await chromium.launch();

async function testCase(path, viewport, suffix, expectedHeader, expectedMobile) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}?headerModalDebug=weekday_day`, {
    waitUntil: "networkidle",
  });

  const headerBtn = page.locator("#btn-open-estimation");
  const mobileBtn = page.locator("#btn-mobile-representative");

  const headerText = (await headerBtn.textContent())?.trim();
  const mobileText = (await mobileBtn.textContent())?.replace(/\s+/g, " ").trim();

  check(`${suffix} — header label`, headerText === expectedHeader, {
    headerText,
    expectedHeader,
  });
  check(`${suffix} — mobile label`, mobileText?.includes(expectedMobile), {
    mobileText,
    expectedMobile,
  });

  const headerTag = await headerBtn.evaluate((el) => el.tagName);
  const headerHref = await headerBtn.getAttribute("href");
  check(`${suffix} — header not tel link`, headerTag === "BUTTON" && !headerHref);

  const urlBefore = page.url();
  if (viewport.width >= 1024) {
    await headerBtn.click({ force: true });
  } else {
    await page.evaluate(() => window.__openMobileRepresentativeModal?.());
  }
  await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 8000 });

  check(`${suffix} — modal opens without navigation`, page.url() === urlBefore);

  const callHref = await page
    .locator("#header-choice-modal-primary-call")
    .getAttribute("href");
  const callAction = (
    await page.locator("#header-choice-modal-primary-call-action").textContent()
  )?.trim();
  const callPhone = (
    await page.locator("#header-choice-modal-primary-call-phone").textContent()
  )?.trim();
  const formLabel = (
    await page.locator("#header-choice-modal-secondary-form-label").textContent()
  )?.trim();

  check(`${suffix} — call button tel link`, callHref === "tel:+15148939939", {
    callHref,
    callAction,
    callPhone,
  });
  check(
    `${suffix} — call label split`,
    callAction === (path.startsWith("/en") ? "Call now" : "Appeler maintenant") &&
      callPhone === "514-893-9939",
  );
  check(`${suffix} — form secondary label`, formLabel === expectedFormLabel(path), {
    formLabel,
  });
  check(`${suffix} — no console errors`, errors.length === 0, { errors });

  await page.close();
}

function expectedFormLabel(path) {
  return path.startsWith("/en") ? "Request an online estimate" : "Demander une estimation en ligne";
}

await testCase("/", { width: 1280, height: 800 }, "desktop-fr", "Contactez-nous", "Contactez-nous");
await testCase("/", { width: 390, height: 844 }, "mobile-fr", "Contactez-nous", "Contactez-nous");
await testCase("/en/", { width: 1280, height: 800 }, "desktop-en", "Contact us", "Contact us");
await testCase("/en/", { width: 390, height: 844 }, "mobile-en", "Contact us", "Contact us");

for (const width of [320, 360, 390, 430]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height: 700 });
  await page.goto(`${baseUrl}/?headerModalDebug=weekday_day`, {
    waitUntil: "networkidle",
  });

  const metrics = await page.locator("#btn-mobile-representative").evaluate((btn) => {
    const label = btn.querySelector(".mobile-sticky-bar__label");
    if (!label) return null;
    const labelRect = label.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(label);
    return {
      text: label.textContent?.trim(),
      labelHeight: labelRect.height,
      btnHeight: btnRect.height,
      whiteSpace: style.whiteSpace,
      textAlign: style.textAlign,
      btnJustify: window.getComputedStyle(btn).justifyContent,
      lineCount: Math.round(labelRect.height / parseFloat(style.lineHeight || "20")),
    };
  });

  const singleLine = metrics && metrics.labelHeight <= 36;
  const centered =
    metrics &&
    (metrics.btnJustify === "center" ||
      metrics.textAlign === "center" ||
      metrics.btnJustify.includes("center"));
  check(`responsive ${width}px — label`, metrics?.text === "Contactez-nous", metrics);
  check(`responsive ${width}px — single line`, Boolean(singleLine), metrics);
  check(`responsive ${width}px — centered`, Boolean(centered), metrics);
  await page.close();
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
