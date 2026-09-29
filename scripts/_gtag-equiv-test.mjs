/**
 * Equivalence: GTM (A) vs direct gtag (B) — capture GA4 network events.
 * Usage:
 *   node scripts/_gtag-equiv-test.mjs --label=B-direct --url=http://127.0.0.1:4176/
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);

const BASE = String(args.url || "http://127.0.0.1:4176").replace(/\/$/, "");
const label = String(args.label || "run");
const outDir = resolve("scripts/browser-verify-output");
mkdirSync(outDir, { recursive: true });

function extractEn(url) {
  const m = [...url.matchAll(/[?&]en=([^&]+)/g)].map((x) =>
    decodeURIComponent(x[1]),
  );
  return m;
}

function extractTid(url) {
  const m = url.match(/[?&]tid=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function isGaHit(url) {
  return /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|google\.com\/measurement\/conversion|stats\.g\.doubleclick\.net\/g\/collect/i.test(
    url,
  );
}

async function withPage(fn) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ...devices["iPhone 12"],
    locale: "fr-CA",
  });
  const page = await ctx.newPage();
  const hits = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!isGaHit(url)) return;
    hits.push({
      url: url.slice(0, 500),
      en: extractEn(url),
      tid: extractTid(url),
    });
  });
  try {
    return await fn(page, hits);
  } finally {
    await browser.close();
  }
}

async function scenario(name, path, action) {
  return withPage(async (page, hits) => {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(1500);
    const loadHits = hits.splice(0, hits.length);

    const hasGtm = await page.evaluate(
      () =>
        !!document.querySelector('script[src*="gtm.js?id=GTM"]') ||
        !!window.google_tag_manager?.["GTM-TPKDH7S2"],
    );
    const hasDirect = await page.evaluate(
      () =>
        typeof window.gtag === "function" &&
        !document.querySelector('script[src*="gtm.js?id=GTM"]'),
    );

    await action(page);
    await page.waitForTimeout(2500);
    const actionHits = hits.splice(0, hits.length);

    const events = actionHits.flatMap((h) => h.en.map((en) => ({ en, tid: h.tid, url: h.url })));
    const byEn = {};
    for (const e of events) {
      byEn[e.en] = (byEn[e.en] || 0) + 1;
    }

    return {
      name,
      path,
      hasGtm,
      hasDirect,
      pageViewLoad: {
        events: loadHits.flatMap((h) => h.en),
        tids: [...new Set(loadHits.map((h) => h.tid).filter(Boolean))],
        hitCount: loadHits.length,
        sample: loadHits.slice(0, 5),
      },
      action: {
        byEn,
        events,
        hitCount: actionHits.length,
        sample: actionHits.slice(0, 8),
      },
    };
  });
}

const results = [];

results.push(
  await scenario("page_view_home", "/", async () => {}),
);

results.push(
  await scenario("phone_call_primary_tel", "/", async (page) => {
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target?.closest?.('a[href^="tel:"]');
          if (a) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    });
    const tel = page.locator("a.conversion-cta-primary[href^='tel:'], a[href^='tel:']").first();
    await tel.dispatchEvent("click");
  }),
);

results.push(
  await scenario("sticky_then_modal_call", "/", async (page) => {
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target?.closest?.('a[href^="tel:"], #header-choice-modal-primary-call');
          if (a) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    });
    const sticky = page.locator("#btn-mobile-representative, .mobile-sticky-bar__cta").first();
    if (await sticky.count()) await sticky.click({ force: true });
    await page.waitForTimeout(800);
    const call = page.locator("#header-choice-modal-primary-call");
    if (await call.count()) {
      await call.evaluate((el) => {
        el.removeAttribute("hidden");
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      });
    }
  }),
);

results.push(
  await scenario("modal_call_via_header", "/", async (page) => {
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target?.closest?.('a[href^="tel:"], #header-choice-modal-primary-call');
          if (a) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    });
    await page.evaluate(() => {
      const btn = document.getElementById("btn-open-estimation");
      if (btn) btn.click();
      else if (typeof window.__openHeaderChoiceModal === "function") {
        window.__openHeaderChoiceModal();
      }
    });
    await page.waitForTimeout(800);
    const call = page.locator("#header-choice-modal-primary-call");
    if (await call.count()) {
      await call.evaluate((el) => {
        el.removeAttribute("hidden");
        if (!el.getAttribute("href") || el.getAttribute("href") === "#") {
          el.setAttribute("href", "tel:5148939939");
        }
        el.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
      });
    }
  }),
);

results.push(
  await scenario("generate_lead_fr_success_ui", "/demande-estimation/", async (page) => {
    // Simulate successful submit UI (same DOM GTM watches) — not a failed Submit
    await page.evaluate(() => {
      const form = document.querySelector("form, [data-erf-root], .erf-form");
      const card =
        document.querySelector("[data-erf-success-full]") ||
        document.querySelector(".erf-success-card");
      if (!card) throw new Error("no success card");
      const panel = document.querySelector("[data-erf-form], .erf-panel, form");
      if (panel) {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
      }
      card.hidden = false;
      card.removeAttribute("aria-hidden");
      card.style.display = "";
      // ensure on-screen
      card.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(1000);
  }),
);

results.push(
  await scenario("generate_lead_en_success_ui", "/en/estimate-request/", async (page) => {
    await page.evaluate(() => {
      const card =
        document.querySelector("[data-erf-success-full]") ||
        document.querySelector(".erf-success-card");
      if (!card) throw new Error("no success card");
      card.hidden = false;
      card.removeAttribute("aria-hidden");
      card.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(1000);
  }),
);

results.push(
  await scenario("generate_lead_fr_failed_submit_no_fire", "/demande-estimation/", async (page) => {
    // Click submit without filling — must NOT fire generate_lead
    await page.evaluate(() => {
      const submit =
        document.querySelector("button.erf-submit") ||
        document.querySelector('button[type="submit"]');
      if (submit) submit.click();
    });
    await page.waitForTimeout(1500);
  }),
);
const summary = {
  label,
  base: BASE,
  results,
  checks: {
    page_view: results.find((r) => r.name === "page_view_home"),
    phone_call: results.find((r) => r.name === "phone_call_primary_tel"),
    sticky_modal: results.find((r) => r.name === "sticky_then_modal_call"),
    header_modal: results.find((r) => r.name === "modal_call_via_header"),
    lead_fr: results.find((r) => r.name === "generate_lead_fr_success_ui"),
    lead_en: results.find((r) => r.name === "generate_lead_en_success_ui"),
    lead_fail: results.find((r) => r.name === "generate_lead_fr_failed_submit_no_fire"),
  },
};

writeFileSync(
  resolve(outDir, `gtag-equiv-${label}.json`),
  JSON.stringify(summary, null, 2),
);

function brief(r) {
  if (!r) return null;
  return {
    name: r.name,
    gtm: r.hasGtm,
    direct: r.hasDirect,
    loadEn: r.pageViewLoad.events,
    actionByEn: r.action.byEn,
    tids: [
      ...new Set([
        ...r.pageViewLoad.tids,
        ...r.action.events.map((e) => e.tid).filter(Boolean),
      ]),
    ],
  };
}

console.log(
  JSON.stringify(
    {
      label,
      brief: Object.fromEntries(
        Object.entries(summary.checks).map(([k, v]) => [k, brief(v)]),
      ),
    },
    null,
    2,
  ),
);
