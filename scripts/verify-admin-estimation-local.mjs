import { chromium } from "playwright";

const BASE = "http://localhost:4321/admin/estimation/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const res = await page.goto(BASE, { waitUntil: "networkidle" });
const robots = await page.locator('meta[name="robots"]').getAttribute("content");
const hasForm = (await page.locator("#ae-form").count()) === 1;
const hasNoGtm = (await page.locator('script[src*="googletagmanager"]').count()) === 0;

await page.fill('input[name="clientName"]', "Jean Tremblay");
await page.fill('input[name="city"]', "Longueuil");
await page.fill('input[name="serviceType"]', "Nettoyage de tapis");
await page.fill('textarea[name="itemsDescription"]', "Salon 12 x 14 pi, corridor.");
await page.fill('input[name="price"]', "249.99");
await page.click("#ae-btn-generate");

await page.waitForSelector("#ae-preview-section:not([hidden])");
const previewVisible = await page.locator("#ae-content-inner p").count();
const printDisabled = await page.locator("#ae-btn-print").isDisabled();
const btnLabel = await page.locator("#ae-btn-print").textContent();
const htmlContent = await page.locator("#ae-content-inner").innerText();
const hasInspection = /inspectera les tissus/i.test(htmlContent);
const hasPhone = /893-9939/.test(htmlContent);
const overflowHidden = await page.locator("#ae-overflow-warning").isHidden();

// Long text overflow test
await page.click("#ae-btn-edit");
await page.fill(
  "textarea[name=itemsDescription]",
  "Lorem ".repeat(400),
);
await page.click("#ae-btn-generate");
await page.waitForTimeout(300);
const overflowShown = !(await page.locator("#ae-overflow-warning").isHidden());
const printBlocked = await page.locator("#ae-btn-print").isDisabled();

await browser.close();

console.log(
  JSON.stringify(
    {
      status: res?.status(),
      robots,
      hasForm,
      hasNoGtm,
      previewParagraphs: previewVisible,
      normalPrintEnabled: !printDisabled,
      normalNoOverflow: overflowHidden,
      longTextOverflowWarning: overflowShown,
      longTextPrintBlocked: printBlocked,
      btnLabel: btnLabel?.trim(),
      noFixedParagraphs: !hasInspection && !hasPhone,
      pass:
        res?.status() === 200 &&
        robots?.includes("noindex") &&
        hasForm &&
        hasNoGtm &&
        previewVisible > 3 &&
        !printDisabled &&
        overflowHidden &&
        overflowShown &&
        printBlocked &&
        btnLabel?.includes("Imprimer ou enregistrer") &&
        !hasInspection &&
        !hasPhone,
    },
    null,
    2,
  ),
);
