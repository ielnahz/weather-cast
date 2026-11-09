/**
 * Adapter layer interfaces
 *
 * Defines the contract that each API adapter must implement.
 * This abstraction allows switching between different weather APIs
 * without affecting the Service or Component layers.
 */

import type { CurrentWeather, ForecastDay, CitySearchResult } from "@/types";

export interface WeatherAdapter {
  /** Get current weather for a location */
  getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather>;

  /** Get daily forecast for a location */
  getForecast(lat: number, lon: number, days: number): Promise<ForecastDay[]>;

  /**
   * Search cities by name.
   *
   * `signal` lets the caller cancel a request whose result is no longer
   * needed (e.g. the user typed another keyword while this one was in flight).
   */
  searchCities(keyword: string, signal?: AbortSignal): Promise<CitySearchResult[]>;
}

/** Open-Meteo raw API response types (internal to adapter) */

export interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    is_day: number;
    surface_pressure: number;
  };
}

export interface OpenMeteoForecastResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export interface OpenMeteoGeocodingResponse {
  results: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    country_code: string;
    admin1?: string;
    /**
     * Second-level administrative division (prefecture-level city in China).
     *
     * Important: for smaller Chinese cities the GeoNames database keeps the
     * primary `name` as pinyin ("Yuncheng", "Hejin") and stores the Chinese
     * name here ("运城市", "河津市"). Reading this field lets us display a
     * Chinese name even when the primary name is Latin.
     */
    admin2?: string;
    /**
     * GeoNames feature code. PPLA* = admin capital, PPLC = capital of a
     * political entity, PPL = populated place. Used to rank results.
     */
    feature_code?: string;
    /** Population — used to rank results (bigger city = more likely intended) */
    population?: number | null;
  }>;
}
