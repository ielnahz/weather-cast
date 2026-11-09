/**
 * CurrentWeather — Displays current weather conditions
 *
 * Presentational component — all data passed via explicit props.
 * No ambiguous object parameters.
 *
 * Design inspired by Moji Weather (墨迹天气):
 * - Large temperature display
 * - Weather icon + description
 * - Dynamic gradient background based on weather type
 */

import { WeatherIcon } from "@/components/common/WeatherIcon";
import { formatTemperature } from "@/utils/format";
import type { WeatherType } from "@/types";

interface CurrentWeatherProps {
  city: string;
  admin1: string;
  temperature: number;
  feelsLike: number;
  weatherType: WeatherType;
  weatherDescription: string;
  isDay: boolean;
  updatedAt: string;
}

/** Map weather type to gradient background */
function getBackgroundGradient(type: WeatherType, isDay: boolean): string {
  if (!isDay) return "from-indigo-900 via-blue-900 to-slate-900";

  switch (type) {
    case "clear":
      return "from-sky-400 via-blue-500 to-blue-600";
    case "partly_cloudy":
      return "from-sky-300 via-blue-400 to-blue-500";
    case "cloudy":
    case "overcast":
      return "from-gray-400 via-gray-500 to-gray-600";
    case "fog":
      return "from-gray-300 via-gray-400 to-gray-500";
    case "drizzle":
    case "rain":
      return "from-slate-400 via-blue-500 to-slate-600";
    case "heavy_rain":
      return "from-slate-600 via-blue-700 to-slate-800";
    case "snow":
    case "heavy_snow":
      return "from-sky-200 via-blue-300 to-slate-400";
    case "thunderstorm":
    case "thunderstorm_hail":
      return "from-slate-700 via-purple-800 to-slate-900";
    default:
      return "from-sky-400 via-blue-500 to-blue-600";
  }
}

export function CurrentWeather({
  city,
  admin1,
  temperature,
  feelsLike,
  weatherType,
  weatherDescription,
  isDay,
  updatedAt,
}: CurrentWeatherProps) {
  const gradient = getBackgroundGradient(weatherType, isDay);

  return (
    <article
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 md:p-7 shadow-xl`}
      aria-label={`${city}当前天气`}
    >
      {/* Decorative blur circle */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" aria-hidden="true" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-medium text-white/90 truncate">
            {city}
          </h2>
          {admin1 && (
            <p className="text-xs text-white/60 mt-0.5 truncate">{admin1}</p>
          )}
        </div>
        <p className="text-xs text-white/50 shrink-0 ml-3">
          更新于 {new Date(updatedAt).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="relative flex items-center justify-between mt-4 md:mt-6">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-6xl md:text-7xl font-light text-white tracking-tight">
              {Math.round(temperature)}
            </span>
            <span className="text-2xl text-white/80 font-light">°C</span>
          </div>
          <p className="text-base text-white/90 mt-1 truncate">{weatherDescription}</p>
          <p className="text-sm text-white/60 mt-1">
            体感 {formatTemperature(feelsLike)}
          </p>
        </div>

        <div className="flex-shrink-0 ml-4">
          <WeatherIcon type={weatherType} isDay={isDay} size={80} />
        </div>
      </div>
    </article>
  );
}
