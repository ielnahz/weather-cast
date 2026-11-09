/**
 * Global type definitions
 * Unified data structures used across all layers
 */

/** Standardized weather type codes (layer-independent) */
export type WeatherType =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "snow"
  | "heavy_snow"
  | "thunderstorm"
  | "thunderstorm_hail";

/** Current weather — unified output from Adapter layer */
export interface CurrentWeather {
  city: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherType: WeatherType;
  weatherDescription: string;
  isDay: boolean;
  pressure: number;
  updatedAt: string;
}

/** Single day forecast */
export interface ForecastDay {
  date: string;
  weatherType: WeatherType;
  weatherDescription: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
}

/** City search result */
export interface CitySearchResult {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  admin1: string;
  /** Prefecture-level division (e.g. "运城市") — shown for disambiguation
   *  when multiple pinyin-homonym places share the same display name. */
  admin2?: string;
  latitude: number;
  longitude: number;
}

/** Search history entry (stored in cookie) */
export interface SearchHistoryItem {
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
}

/** Error types for layered error handling */
export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  CITY_NOT_FOUND = "CITY_NOT_FOUND",
  API_RATE_LIMIT = "API_RATE_LIMIT",
  SERVER_ERROR = "SERVER_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

/** Application-level error with type classification */
export interface AppError {
  type: ErrorType;
  message: string;
  retryable: boolean;
}
