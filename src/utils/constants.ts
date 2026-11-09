/**
 * Application constants
 */

import type { CitySearchResult } from "@/types";

/** API base URLs (Open-Meteo) */
export const API_BASE = {
  FORECAST: "https://api.open-meteo.com/v1/forecast",
  GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",
} as const;

/** IP geolocation API (free, no key required) */
export const IP_GEO_API = "https://ipapi.co/json/" as const;

/** Default city: Shenzhen (fallback) */
export const DEFAULT_CITY: CitySearchResult = {
  id: 1795565,
  name: "深圳",
  country: "中国",
  countryCode: "CN",
  admin1: "广东省",
  latitude: 22.5431,
  longitude: 114.0579,
};

/** Cookie keys */
export const COOKIE_KEYS = {
  LAST_CITY: "last_city",
  SEARCH_HISTORY: "search_history",
} as const;

/** Cookie TTL: 30 days in seconds */
export const COOKIE_TTL = 30 * 24 * 60 * 60;

/** API cache TTL: 10 minutes in milliseconds */
export const CACHE_TTL = 10 * 60 * 1000;

/** Search history max items */
export const MAX_SEARCH_HISTORY = 8;

/** Forecast days to fetch */
export const FORECAST_DAYS = 7;

/** API domain whitelist for SSRF protection */
export const API_DOMAIN_WHITELIST = [
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "ipapi.co",
] as const;

/**
 * Request header used by the proxy (`src/proxy.ts`) to hand the already
 * resolved city to the page renderer, so the page does not repeat the
 * geocoding lookup.
 */
export const RESOLVED_CITY_HEADER = "x-resolved-city";
