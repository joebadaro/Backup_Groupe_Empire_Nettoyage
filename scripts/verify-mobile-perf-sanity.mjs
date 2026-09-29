import { chromium, devices } from "playwright";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:4325";
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));

await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const checks = await page.evaluate(() => ({
  heroVisible: !!document.querySelector(".hero-slide.active"),
  title: (document.querySelector(".hero-title")?.textContent || "").trim().slice(0, 50),
  gtm: /GTM-TPKDH7S2/.test(document.documentElement.innerHTML),
  fbqType: typeof window.fbq,
  metaStub: !!window.__EMPRE_META_PIXEL_ID__,
  modalRoot: !!document.getElementById("header-choice-modal"),
  sticky: !!document.getElementById("btn-mobile-representative"),
}));

await page.waitForTimeout(3500);
await page.click("#btn-mobile-representative");
await page.waitForSelector("#header-choice-modal:not([hidden])", { timeout: 10000 });
const callHref = await page.locator("#header-choice-modal-primary-call").getAttribute("href");

console.log(
  JSON.stringify(
    {
      checks,
      callHref,
      modalOpened: true,
      errs: errs.slice(0, 5),
    },
    null,
    2,
  ),
);

await browser.close();
