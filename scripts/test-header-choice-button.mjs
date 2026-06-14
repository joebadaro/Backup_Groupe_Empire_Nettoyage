/**
 * Tests header red CTA opens modal without navigation.
 * Usage: PREVIEW_URL=http://localhost:4325 node scripts/test-header-choice-button.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://localhost:4325";

const pages = [
  { url: "/", name: "FR home" },
  { url: "/en/", name: "EN home" },
  { url: "/services/meubles-tissu/", name: "FR service meubles-tissu" },
  { url: "/services/tapis/", name: "FR service tapis" },
  { url: "/en/services/tapis/", name: "EN service tapis" },
];

const timeModes = [
  { query: "?headerModalDebug=weekday_day", label: "weekday day" },
  { query: "?headerModalDebug=weekday_evening", label: "weekday evening" },
  { query: "?headerModalDebug=weekend", label: "weekend" },
  { query: "?headerModalDebug=after_hours", label: "after hours" },
];

async function injectStaleHeaderListener(page) {
  await page.evaluate(() => {
    const btn = document.getElementById("btn-open-estimation");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const path = window.location.pathname || "/";
      window.location.href =
        path.indexOf("/en") === 0
          ? "/en/estimate-request/"
          : "/demande-estimation/";
    });
  });
}

async function clickHeaderAndAssert(page, label) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const btn = page.locator("#btn-open-estimation");
  const modal = page.locator("#header-choice-modal");

  const btnInfo = await btn.evaluate((el) => ({
    tag: el.tagName,
    type: el.getAttribute("type"),
    href: el.getAttribute("href"),
    onclick: el.getAttribute("onclick"),
    text: el.textContent?.trim(),
    dataTrigger: el.getAttribute("data-header-choice-trigger"),
  }));

  const urlBefore = page.url();
  await btn.click();
  await page.waitForTimeout(600);

  const urlAfter = page.url();
  const modalOpen = await modal.evaluate((el) => !el.hidden);
  const title = (await page.locator("#header-choice-modal-title").textContent())?.trim() || "";

  const ok =
    urlBefore === urlAfter &&
    modalOpen &&
    btnInfo.tag === "BUTTON" &&
    btnInfo.type === "button" &&
    !btnInfo.href &&
    !btnInfo.onclick &&
    btnInfo.dataTrigger === "true";

  return {
    label,
    ok,
    btnInfo,
    urlBefore,
    urlAfter,
    navigated: urlBefore !== urlAfter,
    modalOpen,
    title,
    errors,
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});

let failed = 0;

for (const p of pages) {
  for (const scrolled of [false, true]) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${p.url}`, { waitUntil: "networkidle" });
    if (scrolled) {
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight / 2),
      );
      await page.waitForTimeout(200);
    }
    await injectStaleHeaderListener(page);
    const result = await clickHeaderAndAssert(
      page,
      `${p.name}${scrolled ? " (scrolled)" : ""}`,
    );
    if (!result.ok) failed += 1;
    console.log(JSON.stringify(result));
    await page.close();
  }
}

for (const mode of timeModes) {
  const expectedTitles = {
    "weekday day": {
      fr: "Un représentant est disponible",
      en: "A representative is available",
    },
    "weekday evening": {
      fr: "Nous sommes encore disponibles ce soir",
      en: "We're still available this evening",
    },
    weekend: {
      fr: "Nous sommes disponibles la fin de semaine",
      en: "We're available on weekends",
    },
    "after hours": {
      fr: "Comment souhaitez-vous nous joindre?",
      en: "How would you like to contact us?",
    },
  };

  for (const path of ["/", "/en/"]) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${path}${mode.query}`, { waitUntil: "networkidle" });
    await injectStaleHeaderListener(page);
    const result = await clickHeaderAndAssert(
      page,
      `${path === "/" ? "FR" : "EN"} ${mode.label}`,
    );
    const locale = path === "/" ? "fr" : "en";
    const titleOk = result.title === expectedTitles[mode.label][locale];
    if (!titleOk) {
      result.ok = false;
      result.titleExpected = expectedTitles[mode.label][locale];
    }
    if (!result.ok) failed += 1;
    console.log(JSON.stringify(result));
    await page.close();
  }
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
