const { chromium } = require("playwright");
const path = require("path");

const OUT = "D:/weather-cast/screenshots";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  await page.goto("http://127.0.0.1:3210/icon-gallery", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "icon-gallery.png"), fullPage: true });
  console.log("icon-gallery saved");
  await browser.close();
})();
