const { chromium } = require('playwright');
const OUT = 'D:/weather-cast/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:3210', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot just the forecast section (icons)
  const forecast = await page.locator('section[aria-label="天气预报"]').first();
  await forecast.screenshot({ path: OUT + '/icons-forecast.png' });
  console.log('forecast icons saved');

  // Side panel future list (small icons)
  const side = await page.locator('aside').first();
  await side.screenshot({ path: OUT + '/icons-side.png' });
  console.log('side icons saved');

  await browser.close();
})();
