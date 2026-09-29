/**
 * Production auto-popup check during applicable hours (no debug param).
 */
import { chromium } from "playwright";

const BASE = "https://groupenettoyageempire.com";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(11000);
const popupOpen = await page.locator("#after-hours-phone-popup:not([hidden])").isVisible();
const title = popupOpen ? (await page.locator("#ah-popup-title").textContent())?.trim() : null;
const body = popupOpen ? (await page.locator("#ah-popup-body").textContent())?.trim() : null;
const hours = popupOpen ? (await page.locator("#ah-popup-hours-line").textContent())?.trim() : null;
const callHref = popupOpen
  ? await page.locator("#ah-popup-primary-call").getAttribute("href")
  : null;
const formLabel = popupOpen
  ? (await page.locator("#ah-popup-secondary-form-label").textContent())?.trim()
  : null;
console.log(JSON.stringify({ popupOpen, title, body, hours, callHref, formLabel }, null, 2));
await browser.close();
