import { chromium } from "playwright";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:4321/admin/estimation/";
const OUT = "scripts/calibration-output/preview-chairs-price.png";

const sampleText = `Madame Dupont,

Nous vous remercions de nous avoir accordé votre confiance.

• Nettoyage en profondeur de 6 chaises de salle à manger, dont 3 avec dossier en matériau rigide
179 $ plus taxes`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill("#ae-estimation-text", sampleText);
await page.click("#ae-btn-preview");
await page.waitForSelector("#ae-preview-section:not([hidden])");
await page.waitForTimeout(600);
// Capture du bas de page (slogan)
await page.evaluate(() => {
  const sheet = document.getElementById("ae-letter-sheet");
  if (sheet) sheet.scrollIntoView({ block: "end" });
});
await page.screenshot({
  path: "scripts/calibration-output/preview-footer.png",
  fullPage: true,
});

const metrics = await page.evaluate(() => ({
  liCount: document.getElementById("ae-content-inner")?.querySelectorAll("li").length ?? 0,
  fittedPt: document.getElementById("ae-content-inner")?.dataset.fittedPt,
  spacious: document.getElementById("ae-content-inner")?.classList.contains("ae-content-inner--spacious"),
  html: document.getElementById("ae-content-inner")?.innerHTML?.slice(0, 200),
}));

await page.screenshot({ path: OUT, fullPage: true });
await browser.close();

console.log(JSON.stringify({ screenshot: OUT, ...metrics }, null, 2));
