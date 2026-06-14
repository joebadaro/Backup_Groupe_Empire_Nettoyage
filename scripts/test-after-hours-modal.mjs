/**
 * Tests modale neutre (after_hours) : pas de pop-up auto, ouverture manuelle, deux actions.
 * Usage: PREVIEW_URL=http://localhost:4323 node scripts/test-after-hours-modal.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";
let failed = 0;

const expectedTitle = {
  "desktop-fr": "Comment souhaitez-vous nous joindre?",
  "mobile-fr": "Comment souhaitez-vous nous joindre?",
  "desktop-en": "How would you like to contact us?",
  "mobile-en": "How would you like to contact us?",
};

function check(label, ok, extra = {}) {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ label, ok, ...extra }));
}

const browser = await chromium.launch();

async function testLocale(path, suffix) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize(
    suffix.includes("mobile") ? { width: 390, height: 844 } : { width: 1280, height: 800 },
  );

  await page.goto(`${baseUrl}${path}?headerModalDebug=after_hours`, {
    waitUntil: "networkidle",
  });

  await page.waitForTimeout(10500);
  const autoPopupOpen = await page
    .locator("#after-hours-phone-popup")
    .evaluate((el) => !el.hidden);
  check(`${suffix} — no auto popup after 10s`, !autoPopupOpen, { errors });

  const openModal = async () => {
    if (suffix.includes("mobile")) {
      await page.evaluate(() => window.__openMobileRepresentativeModal?.());
    } else {
      await page.evaluate(() => window.__openHeaderChoiceModal?.());
    }
    await page.waitForSelector("#header-choice-modal:not([hidden])", {
      timeout: 8000,
    });
  };

  await openModal();

  const title = (await page.locator("#header-choice-modal-title").textContent())?.trim();
  const bodyHidden = await page
    .locator("#header-choice-modal-body")
    .evaluate((el) => el.hidden);
  const bodyText = (
    await page.locator("#header-choice-modal-body").textContent()
  )?.trim();
  const callAction = (
    await page.locator("#header-choice-modal-primary-call-action").textContent()
  )?.trim();
  const callPhone = (
    await page.locator("#header-choice-modal-primary-call-phone").textContent()
  )?.trim();
  const callHref = await page
    .locator("#header-choice-modal-primary-call")
    .getAttribute("href");
  const formLabel = (
    await page.locator("#header-choice-modal-secondary-form-label").textContent()
  )?.trim();
  const smsCount = await page.locator('[href^="sms:"]').count();
  const forbiddenText = await page.locator("#header-choice-modal").evaluate((el) => {
    const text = el.textContent || "";
    return (
      text.includes("ferm") ||
      text.includes("closed") ||
      text.includes("représentant") ||
      text.includes("representative") ||
      text.includes("urgent") ||
      text.includes("texto") ||
      text.includes("Send a text")
    );
  });

  check(`${suffix} — modal title`, title === expectedTitle[suffix], { title });
  check(`${suffix} — body hidden`, bodyHidden === true, { bodyHidden, bodyText });
  check(`${suffix} — call primary`, callHref === "tel:+15148939939", {
    callHref,
    callAction,
    callPhone,
  });
  check(`${suffix} — phone single line`, callPhone === "514-893-9939", { callPhone });
  check(`${suffix} — no sms in modal`, smsCount === 0, { smsCount });
  check(`${suffix} — no forbidden copy`, forbiddenText === false, { forbiddenText });
  check(`${suffix} — form secondary`, Boolean(formLabel && formLabel.length > 5), {
    formLabel,
  });
  check(`${suffix} — no console errors`, errors.length === 0, { errors });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await openModal();
  check(`${suffix} — modal reopenable`, true);

  await page.close();
}

await testLocale("/", "desktop-fr");
await testLocale("/", "mobile-fr");
await testLocale("/en/", "desktop-en");
await testLocale("/en/", "mobile-en");

await browser.close();
process.exit(failed > 0 ? 1 : 0);
