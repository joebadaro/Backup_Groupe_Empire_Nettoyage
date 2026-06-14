/**
 * Tests mobile representative sticky CTA + hero CTA visibility by breakpoint.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/test-mobile-representative-cta.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

const widths = [320, 360, 390, 430, 768, 769, 1024];
const pages = [
  { path: "/", label: "FR home" },
  { path: "/en/", label: "EN home" },
  { path: "/services/tapis/", label: "FR service" },
];

const browser = await chromium.launch();
const context = await browser.newContext();
let failed = 0;

for (const pageInfo of pages) {
  for (const width of widths) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${baseUrl}${pageInfo.path}`, { waitUntil: "networkidle" });

    const heroActionsVisible = await page
      .locator(".hero-actions")
      .first()
      .isVisible()
      .catch(() => false);

    const stickyVisible = await page
      .locator(".mobile-sticky-bar")
      .isVisible()
      .catch(() => false);

    const stickyButtons = await page.locator(".mobile-sticky-bar button, .mobile-sticky-bar a").count();
    const heroHiddenOk = width <= 768 ? !heroActionsVisible : true;
    const desktopHeroOk =
      width > 768 && pageInfo.path === "/"
        ? heroActionsVisible
        : true;
    const stickyOk =
      width <= 768
        ? stickyVisible && stickyButtons === 1
        : !stickyVisible;

    let modalOk = true;
    let navigated = false;
    if (width <= 768) {
      const urlBefore = page.url();
      await page.evaluate(() => {
        document.getElementById("btn-mobile-representative")?.click();
      });
      await page.waitForTimeout(500);
      navigated = page.url() !== urlBefore;
      modalOk = await page
        .locator("#header-choice-modal")
        .evaluate((el) => !el.hidden);
    }

    const ok =
      heroHiddenOk &&
      desktopHeroOk &&
      stickyOk &&
      modalOk &&
      !navigated &&
      errors.length === 0;

    if (!ok) failed += 1;

    console.log(
      JSON.stringify({
        page: pageInfo.label,
        width,
        ok,
        heroActionsVisible,
        stickyVisible,
        stickyButtons,
        modalOk,
        navigated,
        errors,
      }),
    );

    await page.close();
  }
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
