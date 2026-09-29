/**
 * Vérification calibrage template — 5 cas + métriques police / débordement.
 */
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:4321/admin/estimation/";

const CASES = [
  {
    id: "short",
    label: "Estimation courte",
    data: {
      clientName: "Marie",
      city: "Brossard",
      serviceType: "Tapis",
      itemsDescription: "1 tapis 8×10 pi.",
      price: "189",
      notes: "",
    },
  },
  {
    id: "normal",
    label: "Estimation normale",
    data: {
      clientName: "Jean Tremblay",
      city: "Longueuil",
      serviceType: "Nettoyage de tapis résidentiel",
      itemsDescription:
        "Salon 12×14 pi., corridor 6×12 pi., escalier (13 marches). Taches d'usage courant.",
      price: "349.99",
      notes: "",
    },
  },
  {
    id: "multi",
    label: "Plusieurs articles",
    data: {
      clientName: "Sophie Gagnon",
      city: "Saint-Lambert",
      serviceType: "Tapis et meubles",
      itemsDescription:
        "Tapis salle à manger 9×12 pi.; tapis chambre 8×10 pi.; divan 3 places; fauteuil; 2 chaises salle à manger.",
      price: "579.00",
      notes: "",
    },
  },
  {
    id: "notes",
    label: "Avec notes",
    data: {
      clientName: "Pierre Lavoie",
      city: "Chambly",
      serviceType: "Meubles en tissu",
      itemsDescription: "Sectionnel en L, 2 fauteuils.",
      price: "425",
      notes:
        "Accès par le garage. Chien dans la maison — merci de fermer les portes. Rendez-vous préféré en matinée.",
    },
  },
  {
    id: "toolong",
    label: "Texte trop long",
    data: {
      clientName: "Test Overflow",
      city: "Montréal",
      serviceType: "Tapis",
      itemsDescription: "Description très longue. " + "Article détaillé. ".repeat(80),
      price: "999",
      notes: "Notes très longues. " + "Ligne supplémentaire. ".repeat(40),
    },
  },
];

async function fillAndGenerate(page, data) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("#ae-btn-reset").catch(() => {});
  await page.waitForTimeout(150);

  if (await page.locator("#ae-btn-edit").isVisible()) {
    await page.click("#ae-btn-edit");
  }

  await page.fill('input[name="clientName"]', data.clientName);
  await page.fill('input[name="city"]', data.city);
  await page.fill('input[name="serviceType"]', data.serviceType);
  await page.fill('textarea[name="itemsDescription"]', data.itemsDescription);
  await page.fill('input[name="price"]', data.price);
  await page.fill('textarea[name="notes"]', data.notes ?? "");
  await page.click("#ae-btn-generate");
  await page.waitForSelector("#ae-preview-section:not([hidden])");
  await page.waitForTimeout(200);
}

async function metrics(page) {
  return page.evaluate(() => {
    const zone = document.getElementById("ae-content-zone");
    const inner = document.getElementById("ae-content-inner");
    const bg = document.getElementById("ae-letter-bg");
    const templateWarn = document.getElementById("ae-template-warning");
    const overflowWarn = document.getElementById("ae-overflow-warning");
    const btnPrint = document.getElementById("ae-btn-print");

    const fontPt = parseFloat(inner?.dataset.fittedPt || "11");
    const zoneRect = zone?.getBoundingClientRect();
    const innerH = inner?.scrollHeight ?? 0;
    const zoneH = zone?.clientHeight ?? 0;

    return {
      fontPt,
      fits: innerH <= zoneH + 1,
      overflowWarning: !overflowWarn?.hidden,
      templateWarning: !templateWarn?.hidden,
      printDisabled: btnPrint?.disabled ?? true,
      bgStretch: !bg?.classList.contains("ae-letter-bg--ratio-invalid"),
      innerTextSample: inner?.innerText?.slice(0, 80) ?? "",
      hasFixedParagraphs: /Ce service comprend|inspectera les tissus|893-9939|Joe B/i.test(
        inner?.innerHTML ?? "",
      ),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const results = [];

for (const c of CASES) {
  await fillAndGenerate(page, c.data);
  const m = await metrics(page);
  results.push({
    id: c.id,
    label: c.label,
    ...m,
    pass:
      !m.hasFixedParagraphs &&
      !m.templateWarning &&
      (c.id === "toolong"
        ? m.overflowWarning && m.printDisabled && !m.fits
        : m.fits && !m.overflowWarning && !m.printDisabled && m.fontPt >= 9),
    idealFont11: m.fontPt >= 10.5,
  });
  await page.screenshot({
    path: `scripts/calibration-output/${c.id}.png`,
    fullPage: true,
  }).catch(() => {});
}

// Ratio image
const imgMeta = await page.evaluate(async () => {
  const src = "/images/admin/estimation-letter-template.webp";
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = src;
  });
  const expected = 8.5 / 11;
  const ratio = img.naturalWidth / img.naturalHeight;
  return {
    w: img.naturalWidth,
    h: img.naturalHeight,
    ratio,
    ratioOk: Math.abs(ratio - expected) / expected <= 0.005,
  };
});

await browser.close();

const summary = {
  image: imgMeta,
  cases: results,
  allPass: results.every((r) => r.pass),
};

console.log(JSON.stringify(summary, null, 2));
