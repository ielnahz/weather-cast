/**
 * Default City Resolution — Server-side utility
 *
 * Determines the default city for SSR rendering using a 3-tier strategy:
 * 1. Cookie (last_city) — user's last viewed city
 * 2. IP geolocation — approximate location from IP address
 * 3. Fallback — Shenzhen
 *
 * This runs ONLY on the server. User IP is never exposed to the client.
 */

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { httpClient } from "@/http/httpClient";
import { DEFAULT_CITY, IP_GEO_API, COOKIE_KEYS, RESOLVED_CITY_HEADER } from "./constants";
import { parseLastCityCookie, deserializeCity } from "./cookies";
import type { CitySearchResult } from "@/types";

/** IP geolocation response shape */
interface IpGeoResponse {
  city: string;
  country_name: string;
  region: string;
  latitude: number;
  longitude: number;
}

/** Resolve city from IP address */
async function getCityFromIP(ip: string): Promise<CitySearchResult | null> {
  try {
    const response = await httpClient.get<IpGeoResponse>(IP_GEO_API);
    const data = response.data;

    if (data && data.city && data.latitude && data.longitude) {
      return {
        id: 0,
        name: data.city,
        country: data.country_name || "",
        countryCode: "",
        admin1: data.region || "",
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract client IP from request headers */
function getClientIP(headersList: Headers): string | null {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

/**
 * Main resolution function — called in Server Components
 * Strategy: Cookie → IP → Default (Shenzhen)
 */
export async function getDefaultCity(): Promise<CitySearchResult> {
  // 1. Try cookie
  const cookieStore = await cookies();
  const lastCityCookie = cookieStore.get(COOKIE_KEYS.LAST_CITY);

  if (lastCityCookie?.value) {
    const city = deserializeCity(lastCityCookie.value);
    if (city) return city;
  }

  // 2. Try IP geolocation
  const headersList = await headers();
  const clientIP = getClientIP(headersList);

  if (clientIP) {
    const ipCity = await getCityFromIP(clientIP);
    if (ipCity) return ipCity;
  }

  // 3. Fallback
  return DEFAULT_CITY;
}

/**
 * Resolve city by name (for /city/[name] routes)
 * Uses Open-Meteo geocoding to find the city.
 *
 * Two paths, in priority order:
 *   1. The `x-resolved-city` header set by the proxy — the proxy already
 *      performed the geocoding lookup, so re-using its result saves a second
 *      upstream round trip (the geocoding API takes 2-3s per call).
 *   2. A direct geocoding call — the fallback when the header is absent.
 *
 * Wrapped in React `cache()` so the same name is only resolved once per
 * request, even though both `generateMetadata` and the page body ask for it.
 */
export const getCityByName = cache(
  async (name: string): Promise<CitySearchResult | null> => {
    // 1. Reuse the proxy's lookup if it already ran
    try {
      const headersList = await headers();
      const raw = headersList.get(RESOLVED_CITY_HEADER);
      if (raw) {
        // Base64 → UTF-8 → JSON (HTTP headers are Latin-1 only)
        const json = Buffer.from(raw, "base64").toString("utf-8");
        const hit = JSON.parse(json) as {
          id: number;
          name: string;
          country: string;
          country_code: string;
          admin1: string;
          latitude: number;
          longitude: number;
        };
        return {
          id: hit.id,
          name: hit.name,
          country: hit.country,
          countryCode: hit.country_code,
          admin1: hit.admin1,
          latitude: hit.latitude,
          longitude: hit.longitude,
        };
      }
    } catch {
      // Malformed header — fall through to a direct lookup
    }

    // 2. Direct geocoding call
    try {
      const { weatherService } = await import("@/services/weatherService");
      const results = await weatherService.searchCities(decodeURIComponent(name));
      if (results.length > 0) {
        // Return the first match
        return results[0];
      }
      return null;
    } catch {
      return null;
    }
  },
);
