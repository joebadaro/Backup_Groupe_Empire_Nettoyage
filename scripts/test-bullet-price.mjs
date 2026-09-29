import { formatPastedText } from "../src/lib/adminEstimation/formatPastedText.ts";
import { chromium } from "playwright";

const text =
  "• Nettoyage en profondeur de 6 chaises de salle à manger, dont 3 avec dossier en matériau rigide\n179 $ plus taxes";

console.log("node:", formatPastedText(text).html);
console.log("li:", (formatPastedText(text).html.match(/<li>/g) || []).length);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:4321/admin/estimation/", { waitUntil: "networkidle" });
await page.fill("#ae-estimation-text", text);
await page.click("#ae-btn-preview");
await page.waitForTimeout(400);
const inner = await page.evaluate(() => document.getElementById("ae-content-inner")?.innerHTML);
console.log("browser:", inner);
console.log("browser li:", (inner?.match(/<li>/g) || []).length);
await browser.close();
