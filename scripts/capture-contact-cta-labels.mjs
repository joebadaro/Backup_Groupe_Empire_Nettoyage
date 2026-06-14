/**
 * Captures neutral contact CTA labels (header + mobile sticky).
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/capture-contact-cta-labels.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../docs/popup-preview");
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

const scenarios = [
  {
    path: "/?headerModalDebug=weekday_day",
    viewport: { width: 1280, height: 800 },
    name: "contact-cta-desktop-fr",
    headerText: "Contactez-nous",
    mobileText: "Contactez-nous",
    captureMobile: false,
  },
  {
    path: "/?headerModalDebug=weekday_day",
    viewport: { width: 390, height: 844 },
    name: "contact-cta-mobile-fr",
    headerText: "Contactez-nous",
    mobileText: "Contactez-nous",
    captureMobile: true,
  },
  {
    path: "/en/?headerModalDebug=weekday_day",
    viewport: { width: 1280, height: 800 },
    name: "contact-cta-desktop-en",
    headerText: "Contact us",
    mobileText: "Contact us",
    captureMobile: false,
  },
  {
    path: "/en/?headerModalDebug=weekday_day",
    viewport: { width: 390, height: 844 },
    name: "contact-cta-mobile-en",
    headerText: "Contact us",
    mobileText: "Contact us",
    captureMobile: true,
  },
];

const browser = await chromium.launch();

for (const scenario of scenarios) {
  const page = await browser.newPage();
  await page.setViewportSize(scenario.viewport);
  await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: "networkidle" });

  const headerBtn = page.locator("#btn-open-estimation");
  const mobileBtn = page.locator("#btn-mobile-representative");

  const headerLabel = (await headerBtn.textContent())?.trim();
  const mobileLabel = (await mobileBtn.textContent())?.replace(/\s+/g, " ").trim();

  if (scenario.captureMobile) {
    await mobileBtn.scrollIntoViewIfNeeded();
  } else {
    await headerBtn.scrollIntoViewIfNeeded();
  }

  await page.waitForTimeout(300);
  await page.screenshot({
    path: join(outDir, `${scenario.name}.png`),
    fullPage: false,
  });

  console.log(
    JSON.stringify({
      file: `${scenario.name}.png`,
      headerLabel,
      mobileLabel,
      headerOk: headerLabel === scenario.headerText,
      mobileOk: mobileLabel?.includes(scenario.mobileText),
    }),
  );

  await page.close();
}

await browser.close();
console.log(`Screenshots in ${outDir}`);
