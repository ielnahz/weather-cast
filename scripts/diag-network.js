/**
 * Check whether the browser's geocoding request is a CORS preflight problem
 * or just slow, by watching the raw network exchange in the page.
 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const events = [];
  cdp.on("Network.requestWillBeSent", (e) => {
    if (e.request.url.includes("geocoding")) {
      events.push(`REQ  ${e.request.method} ${e.request.url.split("?")[1]}  headers=${JSON.stringify(e.request.headers)}`);
    }
  });
  cdp.on("Network.responseReceived", (e) => {
    if (e.response.url.includes("geocoding")) {
      events.push(`RES  ${e.response.status} ${e.response.url.split("?")[1]}`);
    }
  });
  cdp.on("Network.loadingFailed", (e) => {
    events.push(`FAIL ${e.errorText} ${e.type} ${e.blockedReason || ""}`);
  });

  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 });
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /搜索城市/ }).click();
  await page.waitForTimeout(300);

  events.length = 0;
  await page.locator("input[aria-label='搜索城市']").first().fill("上海");
  await page.waitForTimeout(8000);

  console.log("--- CDP network events for geocoding ---");
  console.log(events.join("\n") || "(none)");

  // Also try a plain fetch from the page context to isolate app code
  const direct = await page.evaluate(async () => {
    try {
      const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=Beijing&count=1&language=zh&format=json");
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log("\ndirect fetch from page context:", JSON.stringify(direct));

  await browser.close();
})();
