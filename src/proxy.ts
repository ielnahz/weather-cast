/**
 * Proxy — request-time city validation for /city/[name]
 *
 * WHY THIS EXISTS
 * ---------------
 * Next.js streams the response shell before an async Server Component can
 * finish. When `notFound()` is thrown inside an async page body, the HTTP
 * status has already been committed as 200 — the browser receives a 404 page
 * *body* with a 200 status. This is a long-standing upstream issue
 * (vercel/next.js#76474) and it matters for SEO: crawlers treat a 200
 * response as a valid, indexable page.
 *
 * The proxy runs *before* the renderer commits any bytes, so it is the only
 * place where we can still set a genuine 404 status.
 *
 * DESIGN
 * ------
 * The proxy performs the geocoding lookup itself. On success it forwards the
 * resolved city to the page through a request header, so the page does not
 * have to call the geocoding API a second time — one upstream round trip per
 * request instead of two.
 *
 * When the city cannot be resolved the proxy *rewrites* to /not-found-page,
 * a route handler that returns a genuine 404 status together with the styled
 * not-found UI. Rewriting (rather than short-circuiting with an empty body)
 * preserves both the correct status code and the visual design.
 *
 * To keep the proxy cheap:
 *   - Results are memoised per-process for 30 minutes (a city that exists
 *     today almost certainly exists tomorrow).
 *   - The upstream call has a short timeout; on any upstream failure the
 *     request is allowed through rather than shown a false 404. Failing open
 *     is the right bias — a flaky geocoder must not make real cities vanish.
 *
 * The page body still calls `notFound()` as defence in depth, so the correct
 * 404 UI is rendered either way.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESOLVED_CITY_HEADER } from "@/utils/constants";
import { pinyinSearchVariants } from "@/utils/pinyin";
import { pickDisplayName } from "@/utils/displayName";
import { rankByRelevance } from "@/utils/relevance";

/** Geocoding endpoint (Open-Meteo) — no API key required */
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

/** Upstream timeout — long enough to succeed, short enough not to stall */
const LOOKUP_TIMEOUT_MS = 4000;

/** How long a city existence verdict stays valid */
const VERDICT_TTL = 30 * 60 * 1000;

interface CityHit {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1: string;
  /** Prefecture-level division — holds the Chinese name for smaller cities */
  admin2?: string;
  /** GeoNames feature code — used to rank results */
  feature_code?: string;
  /** Population — used to rank results */
  population?: number | null;
  latitude: number;
  longitude: number;
}

interface Verdict {
  /** `null` means the city resolved but we cached only the boolean */
  hit: CityHit | null;
  exists: boolean;
  expiresAt: number;
}

/**
 * Per-process memo of city lookups.
 *
 * This lives in the proxy's module scope. It is intentionally process-local:
 * the proxy is documented as not sharing module state with the render code,
 * and that is fine — the cache exists purely to avoid re-hitting the
 * geocoding API on every request to the same city.
 */
const verdicts = new Map<string, Verdict>();

/** Cap the cache so a crawl of random city names cannot grow it unbounded */
const MAX_ENTRIES = 500;

/** Normalise so "北京" / "北京市" / "Beijing" all share one cache entry */
function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

/** Read a cached verdict; `undefined` means "not cached" */
function readVerdict(name: string): Verdict | undefined {
  const key = normalizeKey(name);
  const hit = verdicts.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    verdicts.delete(key);
    return undefined;
  }
  return hit;
}

/** Store a verdict, evicting the oldest entry when the cache is full */
function writeVerdict(name: string, verdict: Omit<Verdict, "expiresAt">): void {
  const key = normalizeKey(name);
  if (verdicts.size >= MAX_ENTRIES && !verdicts.has(key)) {
    const oldest = verdicts.keys().next();
    if (!oldest.done) verdicts.delete(oldest.value);
  }
  verdicts.set(key, { ...verdict, expiresAt: Date.now() + VERDICT_TTL });
}

/**
 * Look a city up via the geocoding API.
 *
 * Mirrors the adapter's fallback logic: if the direct Chinese query finds
 * nothing, retry with pinyin. The upstream GeoNames database stores the
 * primary name of smaller Chinese cities in pinyin ("Yuncheng") and keeps
 * the Chinese name in `admin2` ("运城市").
 *
 * Returns `null` when the lookup itself failed (as opposed to "no match"),
 * so the caller can fail open.
 */
async function lookupCity(name: string): Promise<CityHit | null | undefined> {
  const queries = [name, ...pinyinSearchVariants(name)];

  for (const query of queries) {
    const hits = await queryGeocoding(query);
    if (hits === undefined) return undefined; // upstream failure → fail open
    if (hits.length === 0) continue;

    // The direct Chinese query is already exact — no ranking needed.
    if (query === name) return hits[0];

    // Pinyin results are fuzzy and the upstream ordering is computed on the
    // Latin name, so re-rank by how well the Chinese name matches.
    const ranked = rankByRelevance(hits, name, query);
    return ranked[0] ?? hits[0];
  }

  return null; // no match
}

/**
 * One geocoding round trip.
 * `undefined` = upstream failure, an array = matches (possibly empty).
 */
async function queryGeocoding(query: string): Promise<CityHit[] | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=10&language=zh&format=json`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return undefined;

    const data = (await response.json()) as { results?: CityHit[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    // Timeout / network error — unknown, so fail open
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function proxy(request: NextRequest) {
  const name = decodeURIComponent(
    request.nextUrl.pathname.replace(/^\/city\//, "").replace(/\/$/, ""),
  );

  if (!name) return NextResponse.next();

  let resolved = readVerdict(name);
  let hit: CityHit | null;

  if (resolved) {
    hit = resolved.hit;
  } else {
    const looked = await lookupCity(name);

    // Lookup failed upstream → let it through, the page will handle it
    if (looked === undefined) return NextResponse.next();

    hit = looked;
    writeVerdict(name, { hit: looked, exists: looked !== null });
  }

  if (hit === null) {
    // Known-unknown city → rewrite to the 404 route (real 404 status)
    return NextResponse.rewrite(new URL("/not-found-page", request.url));
  }

  // Hand the resolved city to the renderer so it skips a second lookup.
  // The payload contains non-ASCII characters (Chinese city names), which
  // cannot go into a raw HTTP header — HTTP header values are ByteStrings
  // (Latin-1). Base64 of the UTF-8 JSON keeps it header-safe.
  //
  // The name is normalised to the Chinese display name here, so the page
  // shows "运城市" rather than the pinyin "Yuncheng" the upstream returned.
  const payload = {
    ...hit,
    name: pickDisplayName(hit, name),
  };

  const headers = new Headers(request.headers);
  headers.set(
    RESOLVED_CITY_HEADER,
    Buffer.from(JSON.stringify(payload), "utf-8").toString("base64"),
  );

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/city/:path*"],
};
