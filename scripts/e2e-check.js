/**
 * End-to-end verification of the search flow, cookie persistence,
 * and the default-city strategy.
 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon")) errors.push("CONSOLE " + m.text());
  });
  // Surface geocoding request outcomes so a failed search is diagnosable
  page.on("requestfailed", (r) => {
    if (r.url().includes("geocoding")) errors.push("REQ-FAILED " + r.failure()?.errorText + " " + r.url());
  });
  page.on("response", (r) => {
    if (r.url().includes("geocoding")) errors.push(`GEO-RES ${r.status()} ${r.url().split("?")[1]}`);
  });

  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 });
  await page.waitForTimeout(800);

  console.log("1. home city      :", (await page.locator("main").innerText()).split("\n")[0]);

  // --- open search panel ---
  await page.getByRole("button", { name: /搜索城市/ }).click();
  await page.waitForTimeout(400);
  const panelVisible = await page.locator("input[type='text'], input[type='search']").first().isVisible();
  console.log("2. search panel   :", panelVisible ? "opened" : "FAILED");

  // --- type a query ---
  const input = page.locator("input[type='text'], input[type='search']").first();
  await input.fill("上海");
  await page.waitForTimeout(2500); // debounce 300ms + network

  // Use role=option (set on the result buttons) instead of text matching,
  // which would also match ancestor containers.
  const options = page.locator("ul[aria-label='搜索结果'] button[role='option']");
  let resultCount = await options.count();
  console.log("3. search results :", resultCount, "match(es)");

  // Retry once — the first attempt can race the debounce window
  if (resultCount === 0) {
    await page.waitForTimeout(2000);
    resultCount = await options.count();
    console.log("   (retry)         :", resultCount, "match(es)");
  }
  if (resultCount > 0) console.log("   first result   :", (await options.first().innerText()).replace("\n", " / "));

  // --- click the first result ---
  if (resultCount > 0) {
    await options.first().click();
    await page.waitForTimeout(2500);
    const txt = await page.locator("main").innerText();
    console.log("4. after select   :", txt.split("\n").filter(Boolean).slice(0, 2).join(" / "));
    console.log("   url            :", page.url());
  }

  // --- cookie check ---
  const cookies = await ctx.cookies();
  const lastCity = cookies.find((c) => c.name === "last_city");
  const history = cookies.find((c) => c.name === "search_history");
  console.log("5. last_city cookie:", lastCity ? "SET (" + lastCity.value.slice(0, 48) + "…)" : "MISSING");
  console.log("6. history cookie  :", history ? "SET (" + history.value.slice(0, 48) + "…)" : "MISSING");

  // --- reload to confirm the cookie drives the SSR default ---
  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 });
  await page.waitForTimeout(800);
  console.log("7. after reload   :", (await page.locator("main").innerText()).split("\n")[0], "(cookie-driven)");

  // --- city route SSR ---
  await page.goto("http://127.0.0.1:3210/city/Beijing", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[aria-label='加载天气数据中']"), { timeout: 20000 });
  await page.waitForTimeout(800);
  console.log("8. /city/Beijing  :", (await page.locator("main").innerText()).split("\n")[0]);
  console.log("   title          :", await page.title());

  console.log("\nerrors:", errors.length ? errors.join("; ") : "none");
  await browser.close();
})();
