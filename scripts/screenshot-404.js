/**
 * Capture the 404 page as rendered for an unknown city (proxy rewrite).
 */
const { chromium } = require("playwright");
const path = require("path");

const OUT = "D:/weather-cast/screenshots";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const response = await page.goto("http://127.0.0.1:3210/city/FakeXYZ", {
    waitUntil: "domcontentloaded",
  });
  console.log("status:", response.status());

  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "not-found.png") });
  console.log("not-found.png saved");

  await browser.close();
})();
