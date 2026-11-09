/**
 * Isolate whether passing an AbortSignal to fetch breaks the request
 * (vs. the app's other differences).
 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3210", { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async () => {
    const url = "https://geocoding-api.open-meteo.com/v1/search?name=%E4%B8%8A%E6%B5%B7&count=10&language=zh&format=json";
    const out = {};

    // A: plain fetch
    try {
      const t0 = performance.now();
      const r = await fetch(url);
      out.plain = { status: r.status, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      out.plain = { error: String(e) };
    }

    // B: fetch with a plain AbortSignal (no timeout wiring)
    try {
      const t0 = performance.now();
      const ctrl = new AbortController();
      const r = await fetch(url, { signal: ctrl.signal });
      out.withSignal = { status: r.status, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      out.withSignal = { error: String(e) };
    }

    // C: fetch with a signal that also has a setTimeout abort (mirrors createTimeoutSignal)
    try {
      const t0 = performance.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      out.withTimeoutSignal = { status: r.status, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      out.withTimeoutSignal = { error: String(e) };
    }

    // D: fetch with the EXACT pattern the app uses — external signal forwarded
    //    into an internal controller via addEventListener
    try {
      const t0 = performance.now();
      const external = new AbortController();
      const internal = new AbortController();
      const timer = setTimeout(() => internal.abort(), 10000);
      const onAbort = () => internal.abort();
      external.signal.addEventListener("abort", onAbort, { once: true });
      const r = await fetch(url, { signal: internal.signal });
      clearTimeout(timer);
      external.signal.removeEventListener("abort", onAbort);
      out.appPattern = { status: r.status, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      out.appPattern = { error: String(e) };
    }

    return out;
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
