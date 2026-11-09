/**
 * Crop-and-zoom a region of a screenshot for close visual inspection.
 */
const { chromium } = require("playwright");
const path = require("path");

const OUT = "D:/weather-cast/screenshots";

(async () => {
  const browser = await chromium.launch();

  // Desktop: zoom into the 7-day forecast icon row
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 3,
  });
  await desktop.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await desktop
    .waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 })
    .catch(() => {});
  await desktop.waitForTimeout(1500);

  // Screenshot just the forecast list — icons at 3x for pixel inspection
  const forecast = await desktop.$("section[aria-label='天气预报']");
  if (forecast) {
    await forecast.screenshot({ path: path.join(OUT, "zoom-forecast.png") });
    console.log("zoom-forecast saved");
  } else {
    console.log("forecast section NOT FOUND");
  }

  // Also grab every distinct weather icon rendered in the forecast row
  const icons = await desktop.$$eval("svg.weather-icon", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  console.log("weather-icon count:", icons.length);

  await desktop.close();

  // Mobile: zoom into forecast icons too
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  await mobile.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await mobile
    .waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 })
    .catch(() => {});
  await mobile.waitForTimeout(1500);
  const mForecast = await mobile.$("section[aria-label='天气预报']");
  if (mForecast) {
    await mForecast.screenshot({ path: path.join(OUT, "zoom-forecast-mobile.png") });
    console.log("zoom-forecast-mobile saved");
  }
  await mobile.close();

  await browser.close();
})();
