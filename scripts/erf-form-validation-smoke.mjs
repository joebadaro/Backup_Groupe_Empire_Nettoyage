/**
 * Smoke tests for multi-step estimate form validation.
 * Run: node scripts/erf-form-validation-smoke.mjs
 * Requires dev server at http://127.0.0.1:4321
 */
import { chromium } from "playwright";

const BASE = process.env.ERF_TEST_BASE ?? "http://127.0.0.1:4321";

function visibleStep(page) {
  return page.locator(".erf-step-panel.active").getAttribute("data-erf-step");
}

async function fillStep1(page) {
  await page.fill("#erf-fullName", "Jean Test");
  await page.fill("#erf-phone", "514-555-1234");
  await page.fill("#erf-email", "client@test.com");
}

async function goToStep2(page) {
  await fillStep1(page);
  await page.click('.erf-next-btn[data-next-step="2"]');
  await page.waitForSelector('[data-erf-step="2"].active');
}

async function assertStep1Values(page) {
  const name = await page.inputValue("#erf-fullName");
  const phone = await page.inputValue("#erf-phone");
  const email = await page.inputValue("#erf-email");
  if (name !== "Jean Test" || phone !== "514-555-1234" || email !== "client@test.com") {
    throw new Error(`Step 1 data lost: name=${name} phone=${phone} email=${email}`);
  }
}

async function runTest(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await fn(page);
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

const paths = [
  { label: "FR", url: `${BASE}/demande-estimation/` },
  { label: "EN", url: `${BASE}/en/estimate-request/` },
];

for (const { label, url } of paths) {
  await runTest(`${label}: step 2 — no service stays on step 2`, async (page) => {
    await page.goto(url);
    await goToStep2(page);
    await page.click('.erf-next-btn[data-next-step="3"]');
    const step = await visibleStep(page);
    if (step !== "2") throw new Error(`Expected step 2, got ${step}`);
    await assertStep1Values(page);
  });

  await runTest(`${label}: step 2 — city empty stays on step 2`, async (page) => {
    await page.goto(url);
    await goToStep2(page);
    await page.locator('[data-service-value="tapis"]').click();
    await page.click('.erf-next-btn[data-next-step="3"]');
    const step = await visibleStep(page);
    if (step !== "2") throw new Error(`Expected step 2, got ${step}`);
    await assertStep1Values(page);
    const err = page.locator(".erf-field-error", { hasText: /ville|city/i });
    if ((await err.count()) === 0) throw new Error("Missing city error message");
  });

  await runTest(`${label}: step 2 — dwelling missing stays on step 2`, async (page) => {
    await page.goto(url);
    await goToStep2(page);
    await page.locator('[data-service-value="tapis"]').click();
    await page.fill("#erf-city", "Longueuil");
    await page.click('.erf-next-btn[data-next-step="3"]');
    const step = await visibleStep(page);
    if (step !== "2") throw new Error(`Expected step 2, got ${step}`);
    await assertStep1Values(page);
  });

  await runTest(`${label}: step 2 — condo without floor stays on step 2`, async (page) => {
    await page.goto(url);
    await goToStep2(page);
    await page.locator('[data-service-value="tapis"]').click();
    await page.fill("#erf-city", "Brossard");
    await page.locator(".erf-dwelling-option", { hasText: /Condo/i }).click();
    await page.click('.erf-next-btn[data-next-step="3"]');
    const step = await visibleStep(page);
    if (step !== "2") throw new Error(`Expected step 2, got ${step}`);
    await assertStep1Values(page);
    const floorErr = page.locator("[data-erf-floor-row] .erf-field-error");
    if ((await floorErr.count()) === 0) throw new Error("Missing floor error message");
  });

  await runTest(`${label}: next buttons are type=button`, async (page) => {
    await page.goto(url);
    const types = await page.locator(".erf-next-btn").evaluateAll((els) =>
      els.map((el) => el.getAttribute("type")),
    );
    if (types.some((t) => t !== "button")) throw new Error(`Next buttons not type=button: ${types}`);
  });
}

if (process.exitCode) {
  process.exit(process.exitCode);
} else {
  console.log("\nAll ERF validation smoke tests passed.");
}
