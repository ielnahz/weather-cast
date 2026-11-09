const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const t0 = Date.now();
  const el = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

  page.on("request", (r) => {
    if (r.url().includes("geocoding")) console.log(el(), "REQ ", r.url().split("?")[1]);
  });
  page.on("response", (r) => {
    if (r.url().includes("geocoding")) console.log(el(), "RES ", r.status());
  });
  page.on("requestfailed", (r) => {
    if (r.url().includes("geocoding")) console.log(el(), "FAIL", r.failure()?.errorText);
  });

  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /搜索城市/ }).click();
  await page.waitForTimeout(300);
  console.log(el(), "typing...");
  await page.locator("input").first().fill("上海");
  await page.waitForTimeout(3000);
  const n = await page.locator("ul[aria-label='搜索结果'] button[role='option']").count();
  console.log(el(), "results:", n);

  await browser.close();
})();
