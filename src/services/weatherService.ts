/**
 * Weather Service — Top layer of the three-tier API architecture
 *
 * Provides business-semantic methods for components/pages.
 * Components only call these methods — they never know which API is used underneath.
 *
 * Responsibilities:
 * - Orchestrate adapter calls
 * - Fill in city metadata (name, country) that adapter leaves empty
 * - Parallelize requests (current weather + forecast)
 * - Transform adapter errors into business-semantic AppError
 * - Simple in-memory cache to reduce redundant API calls
 */

import { OpenMeteoAdapter } from "@/adapters/OpenMeteoAdapter";
import type { WeatherAdapter } from "@/adapters/types";
import type {
  CurrentWeather,
  ForecastDay,
  CitySearchResult,
  AppError,
} from "@/types";
import { ErrorType } from "@/types";
import { CACHE_TTL, FORECAST_DAYS } from "@/utils/constants";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class WeatherService {
  private adapter: WeatherAdapter;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(adapter?: WeatherAdapter) {
    // Default to OpenMeteoAdapter; could inject OpenWeatherAdapter in future
    this.adapter = adapter ?? new OpenMeteoAdapter();
  }

  /** Generate cache key */
  private cacheKey(prefix: string, lat: number, lon: number): string {
    return `${prefix}:${lat.toFixed(2)},${lon.toFixed(2)}`;
  }

  /** Get from cache if valid */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /** Set cache entry */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  }

  /** Transform raw errors into AppError */
  private toAppError(error: unknown): AppError {
    // Already an AppError
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      "message" in error
    ) {
      return error as AppError;
    }

    // Timeout
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error as { type: string }).type === "TIMEOUT"
    ) {
      return {
        type: ErrorType.TIMEOUT,
        message: "请求超时，请稍后重试",
        retryable: true,
      };
    }

    // HTTP response with status
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error
    ) {
      const status = (error as { status: number }).status;
      if (status === 404 || status === 400) {
        return {
          type: ErrorType.CITY_NOT_FOUND,
          message: "未找到该城市的天气信息",
          retryable: false,
        };
      }
      if (status === 429) {
        return {
          type: ErrorType.API_RATE_LIMIT,
          message: "请求过于频繁，请稍后再试",
          retryable: true,
        };
      }
      if (status >= 500) {
        return {
          type: ErrorType.SERVER_ERROR,
          message: "服务暂时不可用，请稍后重试",
          retryable: true,
        };
      }
    }

    // Network error (TypeError: Failed to fetch)
    if (error instanceof TypeError) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: "网络连接失败，请检查网络后重试",
        retryable: true,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: "发生未知错误，请重试",
      retryable: true,
    };
  }

  /**
   * Get current weather for a city
   * Fills in city metadata from the CitySearchResult
   */
  async getCurrentWeather(city: CitySearchResult): Promise<CurrentWeather> {
    const key = this.cacheKey("current", city.latitude, city.longitude);
    const cached = this.getCached<CurrentWeather>(key);
    if (cached) return cached;

    try {
      const weather = await this.adapter.getCurrentWeather(
        city.latitude,
        city.longitude
      );
      // Fill in city metadata
      weather.city = city.name;
      weather.country = city.country;
      weather.admin1 = city.admin1;
      this.setCached(key, weather);
      return weather;
    } catch (error) {
      throw this.toAppError(error);
    }
  }

  /**
   * Get forecast for a city
   */
  async getForecast(city: CitySearchResult, days: number = FORECAST_DAYS): Promise<ForecastDay[]> {
    const key = this.cacheKey(`forecast-${days}`, city.latitude, city.longitude);
    const cached = this.getCached<ForecastDay[]>(key);
    if (cached) return cached;

    try {
      const forecast = await this.adapter.getForecast(
        city.latitude,
        city.longitude,
        days
      );
      this.setCached(key, forecast);
      return forecast;
    } catch (error) {
      throw this.toAppError(error);
    }
  }

  /**
   * Get both current weather and forecast in parallel
   * Performance: parallel requests reduce total wait time
   */
  async getWeatherAndForecast(
    city: CitySearchResult,
    days: number = FORECAST_DAYS
  ): Promise<{ current: CurrentWeather; forecast: ForecastDay[] }> {
    try {
      const [current, forecast] = await Promise.all([
        this.getCurrentWeather(city),
        this.getForecast(city, days),
      ]);
      return { current, forecast };
    } catch (error) {
      throw this.toAppError(error);
    }
  }

  /**
   * Search cities by keyword (server-side).
   *
   * Pass `signal` to cancel the request when the result is no longer needed
   * (e.g. a newer keystroke supersedes it).
   */
  async searchCities(keyword: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
    if (!keyword.trim()) return [];

    // Geocoding results are stable — cache them so repeated searches of the
    // same keyword cost nothing.
    const key = `search:${keyword.trim().toLowerCase()}`;
    const cached = this.getCached<CitySearchResult[]>(key);
    if (cached) return cached;

    try {
      const results = await this.adapter.searchCities(keyword, signal);
      if (!signal?.aborted) this.setCached(key, results);
      return results;
    } catch (error) {
      // A cancelled request is not a user-facing error — let the caller
      // decide whether to surface anything.
      if (signal?.aborted) return [];
      throw this.toAppError(error);
    }
  }

  /**
   * Search cities from the browser.
   *
   * Goes through our own `/api/search` route rather than calling the
   * third-party geocoding API directly from the browser. Reasons:
   *   - The server keeps a warm upstream connection; cold browser
   *     connections to the geocoding API were measured at up to 22s, which
   *     could exceed the request timeout and fail the search entirely.
   *   - The browser stops depending on a third party's CORS configuration
   *     (that endpoint's OPTIONS handler returns 404).
   *   - The server can cache results, so a repeated search costs nothing.
   *
   * Results are identical to `searchCities` — the route handler returns the
   * adapter's output unchanged.
   */
  async searchCitiesFromBrowser(
    keyword: string,
    signal?: AbortSignal,
  ): Promise<CitySearchResult[]> {
    if (!keyword.trim()) return [];

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
        signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw { status: response.status, message: "城市搜索失败" };
      }

      const data = (await response.json()) as CitySearchResult[];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (signal?.aborted) return [];
      throw this.toAppError(error);
    }
  }

  /** Clear all cached data */
  clearCache(): void {
    this.cache.clear();
  }
}

/** Singleton instance */
export const weatherService = new WeatherService();
