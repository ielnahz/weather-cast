/**
 * ForecastCard — Single day forecast display
 *
 * Presentational component — all data via explicit props.
 * Shows: weekday, date, weather icon, temp range, precipitation.
 */

import { WeatherIcon } from "@/components/common/WeatherIcon";
import { formatWeekday, formatDate } from "@/utils/format";
import type { WeatherType } from "@/types";

interface ForecastCardProps {
  date: string;
  weatherType: WeatherType;
  weatherDescription: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
}

export function ForecastCard({
  date,
  weatherType,
  weatherDescription,
  tempMax,
  tempMin,
  precipitationProbability,
}: ForecastCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-between py-3 px-2 rounded-xl bg-white/10 backdrop-blur-sm w-full h-[176px]"
      role="article"
      aria-label={`${formatWeekday(date)} 天气预报`}
    >
      {/* 日期行 — 固定高度，单行不换行 */}
      <div className="flex flex-col items-center h-[28px] justify-center overflow-hidden">
        <span className="text-xs font-medium text-white/90 leading-tight whitespace-nowrap">
          {formatWeekday(date)}
        </span>
        <span className="text-[10px] text-white/50 leading-tight whitespace-nowrap">
          {formatDate(date)}
        </span>
      </div>

      {/* 图标 — 固定高度 36px */}
      <div className="flex items-center justify-center h-[36px] my-1">
        <WeatherIcon type={weatherType} size={36} />
      </div>

      {/* 天气描述 — 固定高度 */}
      <span className="text-[10px] text-white/60 leading-4 h-[16px] truncate max-w-full">
        {weatherDescription}
      </span>

      {/* 温度 — 固定高度 */}
      <div className="flex flex-col items-center h-[36px] justify-center">
        <span className="text-sm font-medium text-white leading-tight">
          {Math.round(tempMax)}°
        </span>
        <span className="text-xs text-white/50 leading-tight">
          {Math.round(tempMin)}°
        </span>
      </div>

      {/* 降水概率 — 始终占位，保证高度统一 */}
      <span className="text-[10px] leading-4 h-[14px] mt-0.5">
        {precipitationProbability > 0 ? (
          <span className="text-blue-200">{precipitationProbability}%</span>
        ) : (
          <span className="text-white/20">—</span>
        )}
      </span>
    </div>
  );
}
