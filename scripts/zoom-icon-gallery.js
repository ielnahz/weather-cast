/**
 * Zoom into individual weather icons in the icon gallery for pixel-level
 * centering verification against the red crosshair (x=32 / y=32).
 */
const { chromium } = require("playwright");
const path = require("path");

const OUT = "D:/weather-cast/screenshots";

// Order matches the ICONS array in src/app/icon-gallery/page.tsx
const NAMES = [
  "clear", "partly_cloudy", "cloudy", "overcast", "fog", "drizzle",
  "rain", "heavy_rain", "snow", "heavy_snow", "thunderstorm", "thunderstorm_hail",
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 4,
  });
  await page.goto("http://127.0.0.1:3210/icon-gallery", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Each card contains a 96x96 box with the crosshair + icon
  const boxes = await page.$$eval("svg", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, cls: e.getAttribute("class") || "" };
    }),
  );
  console.log("svgs found:", boxes.length, boxes.map((b) => b.cls).join(" | "));

  const icons = await page.$$("svg.weather-icon");
  console.log("weather-icon svgs:", icons.length);
  for (let i = 0; i < Math.min(icons.length, NAMES.length); i++) {
    await icons[i].screenshot({ path: path.join(OUT, `icon-${NAMES[i]}.png`) });
    console.log(`icon-${NAMES[i]}.png saved`);
  }

  await browser.close();
})();
