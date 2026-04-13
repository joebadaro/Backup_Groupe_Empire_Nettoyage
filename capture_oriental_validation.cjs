const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set explicit mobile viewport to trigger our new masonry css scaling
  await page.setViewport({ width: 450, height: 900 });
  
  console.log("Navigating to Realisations-Video...");
  await page.goto("http://localhost:4321/realisations-video", { waitUntil: "networkidle0" });
  
  console.log("Targeting our replaced component specifically...");
  // Use page.evaluate to scroll the specific component perfectly into the middle of the frame
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.video-card');
    for (let card of cards) {
      if (card.textContent.includes('orientale à domicile à Westmount')) {
        card.scrollIntoView({ behavior: 'instant', block: 'center' });
        break;
      }
    }
  });

  // Give animations a moment to settle
  await new Promise(r => setTimeout(r, 500));

  const screenshotPath = path.join("C:\\Users\\joeba\\.gemini\\antigravity\\brain\\8bd87b47-7d41-498c-8470-3be82417761f", "oriental_rug_physical_validation.png");
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot successfully saved to: " + screenshotPath);

  await browser.close();
}

run().catch(console.error);
