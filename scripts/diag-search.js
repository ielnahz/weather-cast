/**
 * Focused diagnostic for the search flow: watches the geocoding request
 * lifecycle and the store state to find why results do not appear.
 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const log = [];
  page.on("request", (r) => {
    if (r.url().includes("geocoding")) log.push(`REQ  ${Date.now() % 100000} ${r.url().split("?")[1]}`);
  });
  page.on("response", (r) => {
    if (r.url().includes("geocoding")) log.push(`RES  ${Date.now() % 100000} ${r.status()}`);
  });
  page.on("requestfailed", (r) => {
    if (r.url().includes("geocoding")) log.push(`FAIL ${Date.now() % 100000} ${r.failure()?.errorText}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") log.push(`CONS ${m.text().slice(0, 120)}`);
  });

  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /搜索城市/ }).click();
  await page.waitForTimeout(400);

  const input = page.locator("input[type='text'], input[type='search']").first();
  console.log("input visible:", await input.isVisible());
  console.log("input aria-label:", await input.getAttribute("aria-label"));

  log.length = 0;
  await input.fill("上海");

  // Poll state over time
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(500);
    const opts = await page.locator("ul[aria-label='搜索结果'] button[role='option']").count();
    const kw = await input.inputValue();
    console.log(`t+${(i + 1) * 500}ms  keyword="${kw}"  options=${opts}`);
    if (opts > 0) break;
  }

  console.log("\n--- request log ---");
  console.log(log.join("\n") || "(no geocoding requests observed)");

  await browser.close();
})();
