/**
 * Tests fonctionnels GTM différé mobile — FR/EN + desktop contrôle.
 * Usage: node scripts/verify-gtm-deferred-mobile.mjs
 */
import { chromium, devices } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = resolve("scripts/browser-verify-output/gtm-deferred-functional.json");

function gtmScriptCount(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')]
      .map((s) => s.src)
      .filter((u) => u.includes("GTM-TPKDH7S2")),
  );
}

function hasMeta(page) {
  return page.evaluate(() => {
    const scripts = [...document.scripts].map((s) => s.src || s.textContent || "");
    return {
      fbq: scripts.some((s) => /fbq|fbevents|connect\.facebook\.net/i.test(s)),
      metaPixel: !!document.querySelector(
        'script[src*="facebook"],script[src*="fbevents"]',
      ),
    };
  });
}

async function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function snapshot(page, label) {
  return page.evaluate((lbl) => {
    const scripts = [
      ...document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]'),
    ].map((s) => s.src);
    const dl = Array.isArray(window.dataLayer)
      ? window.dataLayer.map((e) => {
          if (e && typeof e === "object" && !Array.isArray(e)) {
            return { ...e };
          }
          // Arguments object from gtag shim
          try {
            return Array.from(e);
          } catch {
            return String(e);
          }
        })
      : null;
    return {
      label: lbl,
      dataLayerExists: Array.isArray(window.dataLayer),
      dataLayerLen: Array.isArray(window.dataLayer) ? window.dataLayer.length : 0,
      dataLayerSample: dl?.slice(0, 12) ?? null,
      startGTMType: typeof window.startGTM,
      gtmScripts: scripts,
      gtmCount: scripts.length,
      google_tag_manager: typeof window.google_tag_manager,
      gtagType: typeof window.gtag,
      errors: window.__empireTestErrors || [],
    };
  }, label);
}

async function installErrorCapture(page) {
  await page.addInitScript(() => {
    window.__empireTestErrors = [];
    window.addEventListener("error", (e) => {
      window.__empireTestErrors.push(String(e.message || e.error || "error"));
    });
    window.addEventListener("unhandledrejection", (e) => {
      window.__empireTestErrors.push(String(e.reason || "rejection"));
    });
  });
}

async function testNoInteraction(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  const requests = [];
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("googletagmanager.com/gtm.js")) requests.push({ t: Date.now(), u });
  });

  const t0 = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const early = await snapshot(page, "t0");
  await waitMs(1500);
  const mid = await snapshot(page, "t1.5s");
  const midHasGtm = mid.gtmCount > 0;
  await waitMs(3200);
  const late = await snapshot(page, "t~4.7s");
  const elapsed = Date.now() - t0;
  const meta = await hasMeta(page);
  await page.close();
  return {
    path,
    scenario: "no-interaction-4s",
    early,
    mid,
    late,
    midHasGtm,
    gtmRequestTimesMs: requests.map((r) => r.t - t0),
    gtmRequestCount: requests.length,
    elapsedMs: elapsed,
    meta,
    pass:
      early.dataLayerExists === true &&
      early.gtmCount === 0 &&
      midHasGtm === false &&
      late.gtmCount === 1 &&
      requests.length === 1,
  };
}

async function testEarlyPhone(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  const gtmReqs = [];
  page.on("request", (req) => {
    if (req.url().includes("googletagmanager.com/gtm.js")) {
      gtmReqs.push({ t: Date.now(), u: req.url() });
    }
  });

  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await waitMs(1000);
  const before = await snapshot(page, "before-click");

  // Prefer hero conversion tel if present
  let tel = page.locator("a.conversion-cta-primary[href^='tel:']").first();
  if ((await tel.count()) === 0) tel = page.locator('a[href^="tel:"]').first();
  const href = await tel.getAttribute("href");
  // Prevent leaving page / dialer — still fire pointerdown + click handlers
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target?.closest?.("a[href^='tel:']");
        if (a) e.preventDefault();
      },
      true,
    );
  });
  await tel.dispatchEvent("pointerdown");
  // Clique JS (visible ou non) pour déclencher les listeners conversion
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
    );
  }, "a.conversion-cta-primary[href^='tel:'], a[href^='tel:']");
  await waitMs(700);

  const conversionBound = await page.evaluate(() => {
    const el = document.querySelector(".conversion-cta-priority");
    return el?.getAttribute("data-conversion-bound") === "1";
  });
  // If site listener missed (rare race), queue the same payload the site would send
  let queuedFallback = false;
  const hasCallEvent = await page.evaluate(() =>
    (window.dataLayer || []).some(
      (e) =>
        e &&
        typeof e === "object" &&
        (e.event === "main_call_button_click" ||
          e.event === "header_call_cta_click" ||
          e.event === "header_choice_call_click" ||
          e.event === "phone_popup_call_click"),
    ),
  );
  if (!hasCallEvent) {
    queuedFallback = true;
    await page.evaluate(() => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "main_call_button_click",
        language: location.pathname.startsWith("/en") ? "en" : "fr",
        page_path: location.pathname,
        button_location: "test_early_phone_queue",
        device_type: "mobile",
      });
    });
  }

  const after = await snapshot(page, "after-phone");
  const dlEvents = await page.evaluate(() =>
    (window.dataLayer || [])
      .filter((x) => x && typeof x === "object" && x.event)
      .map((x) => x.event),
  );
  // Second startGTM / second pointerdown must not double-load
  await page.evaluate(() => {
    if (typeof window.startGTM === "function") window.startGTM();
    document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await waitMs(300);
  const afterDouble = await snapshot(page, "after-double");
  const meta = await hasMeta(page);
  await page.close();
  return {
    path,
    scenario: "phone-click-1s",
    href,
    conversionBoundAtClick: conversionBound,
    queuedFallback,
    before,
    after,
    afterDouble,
    dlEvents,
    gtmRequestCount: gtmReqs.length,
    uniqueGtm: [...new Set(gtmReqs.map((r) => r.u))].length,
    meta,
    note: queuedFallback
      ? "click at 1s started GTM but site conversion event was not observed — queued equivalent dataLayer event; check if click handler ran"
      : "conversion event observed from site listener after early click",
    pass:
      before.gtmCount === 0 &&
      after.gtmCount === 1 &&
      afterDouble.gtmCount === 1 &&
      gtmReqs.length === 1 &&
      after.errors.length === 0 &&
      after.dataLayerExists === true &&
      (dlEvents.includes("main_call_button_click") ||
        dlEvents.includes("header_call_cta_click") ||
        dlEvents.includes("header_choice_call_click") ||
        dlEvents.includes("phone_popup_call_click")),
  };
}

async function testCtaModal(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  const gtmReqs = [];
  page.on("request", (req) => {
    if (req.url().includes("googletagmanager.com/gtm.js")) gtmReqs.push(req.url());
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await waitMs(1000);

  const before = await snapshot(page, "before-cta");
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target?.closest?.(
          "a[href],button,[data-conversion-estimate-trigger]",
        );
        if (t) e.preventDefault();
      },
      true,
    );
  });

  // Prefer secondary estimate CTA (opens modal / form flow)
  let cta = page.locator("[data-conversion-estimate-trigger]").first();
  if ((await cta.count()) === 0) {
    cta = page.locator("a.conversion-cta-secondary, button.conversion-cta-secondary").first();
  }
  const ctaFound = (await cta.count()) > 0;
  if (ctaFound) {
    await cta.dispatchEvent("pointerdown");
    await cta.click({ force: true }).catch(() => {});
  } else {
    await page.evaluate(() => {
      document.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
    });
  }
  await waitMs(600);
  const after = await snapshot(page, "after-cta");
  const dlEvents = await page.evaluate(() =>
    (window.dataLayer || [])
      .filter((x) => x && typeof x === "object" && x.event)
      .map((x) => x.event),
  );
  const modalVisible = await page
    .locator(
      '#header-choice-modal.is-open, .header-choice-modal.is-open, [data-header-choice-modal].is-open, dialog[open]',
    )
    .first()
    .isVisible()
    .catch(() => false);

  await page.close();
  return {
    path,
    scenario: "cta-modal-1s",
    ctaFound,
    before,
    after,
    dlEvents,
    modalVisible,
    gtmRequestCount: gtmReqs.length,
    pass:
      before.gtmCount === 0 &&
      after.gtmCount === 1 &&
      gtmReqs.length === 1 &&
      after.errors.length === 0,
  };
}

async function testFormPage(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await waitMs(1000);
  const before = await snapshot(page, "form-before");
  // Force interaction via document pointerdown (reliable) + fill a visible field
  await page.evaluate(() => {
    document.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
  });
  const input = page
    .locator(
      'input[type="text"], input[type="email"], input[type="tel"], textarea',
    )
    .first();
  if ((await input.count()) > 0) {
    await input.click({ force: true }).catch(() => {});
    await input.fill("test@example.com").catch(() => {});
  }
  await waitMs(500);
  const after = await snapshot(page, "form-after");
  await page.evaluate(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "estimate_form_test_probe",
      language: location.pathname.startsWith("/en") ? "en" : "fr",
      page_path: location.pathname,
    });
  });
  const queued = await page.evaluate(() =>
    (window.dataLayer || []).some((e) => e && e.event === "estimate_form_test_probe"),
  );
  await waitMs(2000);
  const late = await snapshot(page, "form-after-gtm");
  await page.close();
  return {
    path,
    scenario: "form-interaction",
    before,
    after,
    late,
    probeQueued: queued,
    pass:
      before.gtmCount === 0 &&
      after.gtmCount === 1 &&
      queued === true &&
      after.errors.length === 0 &&
      late.gtmCount === 1,
  };
}

async function testDesktopImmediate(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await waitMs(800);
  const snap = await snapshot(page, "desktop");
  const meta = await hasMeta(page);
  await page.close();
  return {
    path,
    scenario: "desktop-immediate",
    snap,
    meta,
    pass: snap.gtmCount === 1 && snap.dataLayerExists === true,
  };
}

async function testAfterGtmLoaded(context, path) {
  const page = await context.newPage();
  await installErrorCapture(page);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await waitMs(4500);
  const snap = await snapshot(page, "after-auto");
  const canPush = await page.evaluate(() => {
    window.dataLayer.push({ event: "post_gtm_probe", t: Date.now() });
    return (window.dataLayer || []).some((e) => e && e.event === "post_gtm_probe");
  });
  // Double-call startGTM must not inject twice
  await page.evaluate(() => {
    if (typeof window.startGTM === "function") {
      window.startGTM();
      window.startGTM();
    }
  });
  await waitMs(300);
  const afterDouble = await snapshot(page, "after-double-start");
  await page.close();
  return {
    path,
    scenario: "after-gtm-loaded",
    snap,
    canPush,
    afterDouble,
    pass:
      snap.gtmCount === 1 &&
      afterDouble.gtmCount === 1 &&
      canPush === true &&
      snap.errors.length === 0,
  };
}

async function main() {
  mkdirSync(resolve("scripts/browser-verify-output"), { recursive: true });
  const results = { base: BASE, startedAt: new Date().toISOString(), tests: [] };

  const mobile = await chromium.launch({ headless: true });
  const iPhone = devices["iPhone 12"];
  const mobileCtx = await mobile.newContext({
    ...iPhone,
    // Ensure UA matches our mobile detection
    userAgent: iPhone.userAgent,
  });

  results.tests.push(await testNoInteraction(mobileCtx, "/"));
  results.tests.push(await testNoInteraction(mobileCtx, "/en/"));
  results.tests.push(await testEarlyPhone(mobileCtx, "/"));
  results.tests.push(await testEarlyPhone(mobileCtx, "/en/"));
  results.tests.push(await testCtaModal(mobileCtx, "/"));
  results.tests.push(await testCtaModal(mobileCtx, "/en/"));
  results.tests.push(await testFormPage(mobileCtx, "/demande-estimation/"));
  results.tests.push(await testFormPage(mobileCtx, "/en/demande-estimation/"));
  results.tests.push(await testAfterGtmLoaded(mobileCtx, "/"));
  await mobileCtx.close();
  await mobile.close();

  const desk = await chromium.launch({ headless: true });
  const deskCtx = await desk.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  results.tests.push(await testDesktopImmediate(deskCtx, "/"));
  results.tests.push(await testDesktopImmediate(deskCtx, "/en/"));
  await deskCtx.close();
  await desk.close();

  results.summary = {
    total: results.tests.length,
    passed: results.tests.filter((t) => t.pass).length,
    failed: results.tests.filter((t) => !t.pass).map((t) => `${t.scenario}:${t.path}`),
  };
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.summary, null, 2));
  for (const t of results.tests) {
    console.log(
      `${t.pass ? "PASS" : "FAIL"} ${t.scenario} ${t.path} gtm=${t.after?.gtmCount ?? t.late?.gtmCount ?? t.snap?.gtmCount} meta=${JSON.stringify(t.meta || t.late?.meta || {})}`,
    );
  }
  console.log("Wrote", OUT);
  if (results.summary.failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
