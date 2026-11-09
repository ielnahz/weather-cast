/**
 * Open-Meteo Adapter — Middle layer of the three-tier API architecture
 *
 * Responsibilities:
 * - Call Open-Meteo API via httpClient (bottom layer)
 * - Map raw API fields to unified data structures
 * - Handle WMO weather code translation
 *
 * The Service layer never sees Open-Meteo specific field names —
 * it only works with CurrentWeather, ForecastDay, CitySearchResult.
 */

import { httpClient } from "@/http/httpClient";
import { getWeatherInfo } from "@/utils/weatherCodeMap";
import { pickDisplayName } from "@/utils/displayName";
import { pinyinSearchVariants } from "@/utils/pinyin";
import { rankByRelevance } from "@/utils/relevance";
import { API_BASE } from "@/utils/constants";
import type {
  OpenMeteoCurrentResponse,
  OpenMeteoForecastResponse,
  OpenMeteoGeocodingResponse,
  WeatherAdapter,
} from "./types";
import type { CurrentWeather, ForecastDay, CitySearchResult } from "@/types";

export class OpenMeteoAdapter implements WeatherAdapter {
  /**
   * Get current weather for a location
   * Uses Open-Meteo forecast endpoint with `current` params
   */
  async getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
    const response = await httpClient.get<OpenMeteoCurrentResponse>(
      API_BASE.FORECAST,
      {
        latitude: lat,
        longitude: lon,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "wind_speed_10m",
          "wind_direction_10m",
          "weather_code",
          "is_day",
          "surface_pressure",
        ].join(","),
        timezone: "auto",
      }
    );

    const data = response.data;
    if (!data.current) {
      throw new Error("No current weather data in response");
    }

    const c = data.current;
    const weatherInfo = getWeatherInfo(c.weather_code, "zh");

    return {
      city: "", // Filled by Service layer (it knows the city name)
      country: "",
      admin1: "",
      latitude: lat,
      longitude: lon,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      weatherType: weatherInfo.type,
      weatherDescription: weatherInfo.description,
      isDay: c.is_day === 1,
      pressure: c.surface_pressure,
      updatedAt: c.time,
    };
  }

  /**
   * Get daily forecast for a location
   */
  async getForecast(lat: number, lon: number, days: number): Promise<ForecastDay[]> {
    const response = await httpClient.get<OpenMeteoForecastResponse>(
      API_BASE.FORECAST,
      {
        latitude: lat,
        longitude: lon,
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "precipitation_probability_max",
          "wind_speed_10m_max",
          "sunrise",
          "sunset",
        ].join(","),
        timezone: "auto",
        forecast_days: days,
      }
    );

    const daily = response.data.daily;
    if (!daily) {
      throw new Error("No forecast data in response");
    }

    const forecastDays: ForecastDay[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      const weatherInfo = getWeatherInfo(daily.weather_code[i], "zh");
      forecastDays.push({
        date: daily.time[i],
        weatherType: weatherInfo.type,
        weatherDescription: weatherInfo.description,
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        precipitation: daily.precipitation_sum[i],
        precipitationProbability: daily.precipitation_probability_max[i],
        windSpeedMax: daily.wind_speed_10m_max[i],
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
      });
    }

    return forecastDays;
  }

  /**
   * Search cities by name using Open-Meteo geocoding API
   *
   * Chinese place names need a fallback: the upstream GeoNames database
   * stores the primary `name` of smaller cities in pinyin ("Yuncheng") and
   * keeps the Chinese name in `admin2` ("运城市"). A direct query for "运城"
   * therefore returns nothing. When the direct query comes back empty and the
   * keyword contains Chinese characters, we retry with its pinyin
   * transliteration and rank the (fuzzy) results by relevance.
   */
  async searchCities(keyword: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
    if (!keyword.trim()) return [];

    const direct = await this.queryGeocodingRaw(keyword, signal);
    if (direct.length > 0 || signal?.aborted) {
      return direct.map((r) => this.toCityResult(r, keyword));
    }

    // Fallback: retry with pinyin. Only worth it for Chinese keywords —
    // a Latin keyword that found nothing will not find anything as pinyin.
    const variants = pinyinSearchVariants(keyword);
    if (variants.length === 0) return [];

    for (const variant of variants) {
      if (signal?.aborted) return [];
      const records = await this.queryGeocodingRaw(variant, signal);
      if (records.length === 0) continue;

      // The upstream ordering is computed on the Latin name, so for a Chinese
      // query it puts same-pinyin-but-different places first. Re-rank by
      // how well each record's Chinese name (or exact pinyin) matches.
      const ranked = rankByRelevance(records, keyword, variant);
      const usable = ranked.length > 0 ? ranked : records;

      return usable.map((r) => this.toCityResult(r, keyword));
    }

    return [];
  }

  /** Raw geocoding query — one HTTP round trip, no fallback or ranking */
  private async queryGeocodingRaw(
    keyword: string,
    signal?: AbortSignal,
  ): Promise<OpenMeteoGeocodingResponse["results"]> {
    const response = await httpClient.get<OpenMeteoGeocodingResponse>(
      API_BASE.GEOCODING,
      {
        name: keyword.trim(),
        count: 10,
        language: "zh",
        format: "json",
      },
      { signal }
    );

    const results = response.data.results;
    return results && Array.isArray(results) ? results : [];
  }

  /** Map an upstream record onto the unified city shape */
  private toCityResult(
    r: OpenMeteoGeocodingResponse["results"][number],
    query?: string,
  ): CitySearchResult {
    return {
      id: r.id,
      name: pickDisplayName(r, query),
      country: r.country,
      countryCode: r.country_code,
      admin1: r.admin1 || "",
      admin2: r.admin2 || undefined,
      latitude: r.latitude,
      longitude: r.longitude,
    };
  }
}
