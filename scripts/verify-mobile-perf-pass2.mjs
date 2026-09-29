import { chromium, devices } from "playwright";

const iPhone = devices["iPhone 12"];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...iPhone });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

async function check(url, label) {
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  const html = await page.content();
  const hero = page.locator(".hero-slide.active").first();
  const box = await hero.boundingBox();
  const src = await hero.getAttribute("src");
  const decoding = await hero.getAttribute("decoding");
  const fp = await hero.getAttribute("fetchpriority");
  const currentSrc = await hero.evaluate((img) => img.currentSrc);
  const hasGtm = html.includes("GTM-TPKDH7S2");
  const hasMeta = /fbq\(|connect\.facebook\.net|MetaDeferred|meta-tracking/.test(
    html,
  );
  const slideshow = page.locator(".hero-slideshow");
  const readyBefore = await slideshow.getAttribute("data-hero-ready");
  await page.waitForTimeout(6500);
  const readyAfter = await slideshow.getAttribute("data-hero-ready");
  const activeSrcAfter = await page
    .locator(".hero-slide.active")
    .first()
    .evaluate((img) => img.currentSrc);
  const tel = await page.locator('a[href="tel:+15148939939"]').count();
  const sticky = await page
    .locator(
      "[data-header-choice-trigger], .mobile-sticky-cta, #btn-open-estimation",
    )
    .count();
  let modalOk = false;
  const mobileTrigger = page.locator(
    '[data-header-choice-trigger="mobile"], .mobile-sticky-cta button, .mobile-sticky-cta a',
  ).first();
  const desktopTrigger = page.locator('[data-header-choice-trigger="true"]').first();
  const btn =
    (await mobileTrigger.count()) > 0 && (await mobileTrigger.isVisible())
      ? mobileTrigger
      : desktopTrigger;
  if ((await btn.count()) > 0) {
    await btn.click({ force: true });
    await page.waitForTimeout(900);
    modalOk = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll(
          ".header-choice-overlay, #header-choice-modal, [data-header-choice-modal], .ah-phone-popup",
        ),
      ];
      return candidates.some((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0
        );
      });
    });
  }
  const posterCurrent = await page
    .locator(".presentation-home-teaser__thumb")
    .evaluate((img) => img.currentSrc)
    .catch(() => null);

  console.log(
    JSON.stringify(
      {
        label,
        status: res?.status(),
        src,
        currentSrc,
        decoding,
        fp,
        boxH: box && Math.round(box.height),
        hasGtm,
        hasMeta,
        readyBefore,
        readyAfter,
        activeSrcAfter,
        swapped: activeSrcAfter !== currentSrc,
        tel,
        sticky,
        modalOk,
        posterCurrent,
        errors: errors.slice(0, 8),
      },
      null,
      2,
    ),
  );
  errors.length = 0;
}

await check("http://127.0.0.1:4330/", "FR");
await check("http://127.0.0.1:4330/en/", "EN");

const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dpage = await desk.newPage();
await dpage.goto("http://127.0.0.1:4330/", { waitUntil: "domcontentloaded" });
const dsrc0 = await dpage
  .locator(".hero-slide.active")
  .first()
  .evaluate((img) => img.currentSrc);
await dpage.waitForTimeout(5000);
const dsrc5 = await dpage
  .locator(".hero-slide.active")
  .first()
  .evaluate((img) => img.currentSrc);
const dready = await dpage.locator(".hero-slideshow").getAttribute("data-hero-ready");
console.log(
  JSON.stringify(
    {
      label: "DESKTOP-FR",
      src0: dsrc0,
      src5: dsrc5,
      readyAt5s: dready,
      desktopUsesLandscape: /hero-slide-2/.test(dsrc0),
    },
    null,
    2,
  ),
);

await browser.close();
