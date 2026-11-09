/**
 * Capture screenshots at multiple viewports.
 *
 * Waits for real content (not the loading skeleton) by polling for
 * a rendered weather card, so the shots reflect the hydrated app.
 */
const { chromium } = require("playwright");
const path = require("path");

const OUT = "D:/weather-cast/screenshots";
const URL = process.env.SHOT_URL || "http://127.0.0.1:3210";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 900 },
];

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`[${vp.name}] ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`[${vp.name}] PAGEERROR ${e.message}`));

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    // Wait for the skeleton to disappear and real content to mount
    await page
      .waitForFunction(
        () => !document.querySelector("[aria-label='加载天气数据中']"),
        { timeout: 20000 },
      )
      .catch(() => console.log(`  ${vp.name}: skeleton did not clear`));
    // Let SVG icons + chart finish painting
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(OUT, `${vp.name}.png`), fullPage: true });
    console.log(`${vp.name} saved (${vp.width}x${vp.height})`);
    await page.close();
  }

  await browser.close();

  if (errors.length) {
    console.log("\n--- console errors ---");
    errors.forEach((e) => console.log(e));
  } else {
    console.log("\nno console errors");
  }
})();
