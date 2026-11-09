/**
 * WMO Weather Code Mapping
 *
 * Open-Meteo uses WMO weather interpretation codes.
 * This maps them to standardized WeatherType and human-readable descriptions.
 *
 * Supports multi-language (currently zh + en) — architecture ready for i18n.
 */

import type { WeatherType } from "@/types";

interface WeatherCodeInfo {
  type: WeatherType;
  zh: string;
  en: string;
}

/** WMO weather code → standardized info */
const WEATHER_CODE_MAP: Record<number, WeatherCodeInfo> = {
  0: { type: "clear", zh: "晴", en: "Clear sky" },
  1: { type: "partly_cloudy", zh: "晴间多云", en: "Mainly clear" },
  2: { type: "partly_cloudy", zh: "多云", en: "Partly cloudy" },
  3: { type: "overcast", zh: "阴", en: "Overcast" },
  45: { type: "fog", zh: "雾", en: "Fog" },
  48: { type: "fog", zh: "雾凇", en: "Depositing rime fog" },
  51: { type: "drizzle", zh: "毛毛雨", en: "Light drizzle" },
  53: { type: "drizzle", zh: "毛毛雨", en: "Moderate drizzle" },
  55: { type: "drizzle", zh: "毛毛雨", en: "Dense drizzle" },
  56: { type: "drizzle", zh: "冻毛毛雨", en: "Light freezing drizzle" },
  57: { type: "drizzle", zh: "冻毛毛雨", en: "Dense freezing drizzle" },
  61: { type: "rain", zh: "小雨", en: "Slight rain" },
  63: { type: "rain", zh: "中雨", en: "Moderate rain" },
  65: { type: "heavy_rain", zh: "大雨", en: "Heavy rain" },
  66: { type: "rain", zh: "冻雨", en: "Light freezing rain" },
  67: { type: "rain", zh: "冻雨", en: "Heavy freezing rain" },
  71: { type: "snow", zh: "小雪", en: "Slight snow fall" },
  73: { type: "snow", zh: "中雪", en: "Moderate snow fall" },
  75: { type: "heavy_snow", zh: "大雪", en: "Heavy snow fall" },
  77: { type: "snow", zh: "阵雪", en: "Snow grains" },
  80: { type: "rain", zh: "阵雨", en: "Slight rain showers" },
  81: { type: "rain", zh: "阵雨", en: "Moderate rain showers" },
  82: { type: "heavy_rain", zh: "暴雨", en: "Violent rain showers" },
  85: { type: "snow", zh: "阵雪", en: "Slight snow showers" },
  86: { type: "heavy_snow", zh: "阵雪", en: "Heavy snow showers" },
  95: { type: "thunderstorm", zh: "雷暴", en: "Thunderstorm" },
  96: { type: "thunderstorm_hail", zh: "雷暴伴冰雹", en: "Thunderstorm with slight hail" },
  99: { type: "thunderstorm_hail", zh: "雷暴伴冰雹", en: "Thunderstorm with heavy hail" },
};

type Locale = "zh" | "en";

/** Get standardized WeatherType from WMO code */
export function getWeatherType(code: number): WeatherType {
  return (WEATHER_CODE_MAP[code] ?? WEATHER_CODE_MAP[0]).type;
}

/** Get localized description from WMO code */
export function getWeatherDescription(code: number, locale: Locale = "zh"): string {
  const entry = WEATHER_CODE_MAP[code] ?? WEATHER_CODE_MAP[0];
  return entry[locale];
}

/** Get both type and description */
export function getWeatherInfo(code: number, locale: Locale = "zh"): { type: WeatherType; description: string } {
  const entry = WEATHER_CODE_MAP[code] ?? WEATHER_CODE_MAP[0];
  return {
    type: entry.type,
    description: entry[locale],
  };
}
