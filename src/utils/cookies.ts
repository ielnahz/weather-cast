/**
 * Cookie utilities
 *
 * Handles search history and last city storage in cookies.
 * Works on both server (next/headers) and client (document.cookie).
 */

import { COOKIE_KEYS, MAX_SEARCH_HISTORY, COOKIE_TTL } from "./constants";
import type { CitySearchResult, SearchHistoryItem } from "@/types";

/** Serialize city to cookie-safe string */
export function serializeCity(city: CitySearchResult): string {
  return JSON.stringify({
    name: city.name,
    country: city.country,
    admin1: city.admin1,
    latitude: city.latitude,
    longitude: city.longitude,
  });
}

/** Parse city from cookie string */
export function deserializeCity(cookieStr: string): CitySearchResult | null {
  try {
    const parsed = JSON.parse(cookieStr);
    if (
      typeof parsed.name === "string" &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return {
        id: 0,
        name: parsed.name,
        country: parsed.country || "",
        countryCode: "",
        admin1: parsed.admin1 || "",
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Set last city cookie (client-side) */
export function setLastCityCookie(city: CitySearchResult): void {
  if (typeof document === "undefined") return;
  const value = serializeCity(city);
  document.cookie = `${COOKIE_KEYS.LAST_CITY}=${encodeURIComponent(value)}; max-age=${COOKIE_TTL}; path=/; samesite=lax`;
}

/** Get search history from cookie (client-side) */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof document === "undefined") return [];
  return parseSearchHistoryCookie(document.cookie);
}

/** Parse search history from raw cookie string (works on both server and client) */
export function parseSearchHistoryCookie(cookieHeader: string): SearchHistoryItem[] {
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});

  const raw = cookies[COOKIE_KEYS.SEARCH_HISTORY];
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_SEARCH_HISTORY);
    }
    return [];
  } catch {
    return [];
  }
}

/** Add city to search history (client-side) */
export function addToSearchHistory(city: CitySearchResult): void {
  if (typeof document === "undefined") return;

  const current = getSearchHistory();
  const newItem: SearchHistoryItem = {
    name: city.name,
    country: city.country,
    admin1: city.admin1,
    latitude: city.latitude,
    longitude: city.longitude,
  };

  // Remove duplicate (by name)
  const filtered = current.filter(
    (item) => item.name !== city.name && item.latitude !== city.latitude
  );

  // Add to front
  const updated = [newItem, ...filtered].slice(0, MAX_SEARCH_HISTORY);

  const value = encodeURIComponent(JSON.stringify(updated));
  document.cookie = `${COOKIE_KEYS.SEARCH_HISTORY}=${value}; max-age=${COOKIE_TTL}; path=/; samesite=lax`;
}

/** Parse last city from raw cookie string (server-side) */
export function parseLastCityCookie(cookieHeader: string): CitySearchResult | null {
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});

  const raw = cookies[COOKIE_KEYS.LAST_CITY];
  if (!raw) return null;
  return deserializeCity(raw);
}
