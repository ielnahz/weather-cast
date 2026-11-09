/**
 * WeatherDetail — Detailed weather metrics (humidity, wind, pressure)
 *
 * Presentational component — each metric is passed as an explicit prop.
 * Renders a grid of metric cards with unified SVG icons and fixed heights.
 *
 * Design: SVG icons (not emoji) ensure consistent sizing across platforms.
 * Fixed card height ensures visual alignment regardless of value length.
 */

import { formatHumidity, formatWindSpeed, formatWindDirection } from "@/utils/format";

interface WeatherDetailProps {
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  feelsLike: number;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** On mobile the 5th card spans both columns so the grid never
   *  ends with a half-empty row. */
  spanFull?: boolean;
}

function MetricCard({ icon, label, value, spanFull = false }: MetricCardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-white/10 backdrop-blur-sm h-[88px] ${
        spanFull ? "col-span-2 md:col-span-1" : ""
      }`}
    >
      {/* Icon — fixed 20x20 container */}
      <div className="flex items-center justify-center h-[20px] mb-1.5">
        {icon}
      </div>
      {/* Label — fixed line height */}
      <span className="text-[10px] text-white/50 leading-4 mb-0.5">{label}</span>
      {/* Value — fixed line height */}
      <span className="text-sm font-medium text-white leading-5 truncate max-w-full">{value}</span>
    </div>
  );
}

export function WeatherDetail({
  humidity,
  windSpeed,
  windDirection,
  pressure,
  feelsLike,
}: WeatherDetailProps) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3"
      aria-label="天气详情"
    >
      <MetricCard
        icon={<ThermometerIcon />}
        label="体感温度"
        value={`${Math.round(feelsLike)}°C`}
      />
      <MetricCard
        icon={<HumidityIcon />}
        label="湿度"
        value={formatHumidity(humidity)}
      />
      <MetricCard
        icon={<WindIcon />}
        label="风速"
        value={formatWindSpeed(windSpeed)}
      />
      <MetricCard
        icon={<CompassIcon />}
        label="风向"
        value={formatWindDirection(windDirection)}
      />
      {/* Last card spans the full width on mobile — avoids a ragged
          half-empty row and keeps the left/right edges symmetric. */}
      <MetricCard
        icon={<GaugeIcon />}
        label="气压"
        value={`${Math.round(pressure)} hPa`}
        spanFull
      />
    </div>
  );
}

/** SVG icons — all 20x20 viewBox, consistent sizing */

function ThermometerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 13.76V5a2 2 0 1 0-4 0v8.76a4 4 0 1 0 4 0z" stroke="#FFB060" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="17" r="2.5" fill="#FFB060" />
      <line x1="12" y1="8" x2="12" y2="14" stroke="#FFB060" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HumidityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3s6 7 6 11.5a6 6 0 0 1-12 0C6 10 12 3 12 3z" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 14.5a3 3 0 0 0 3 3" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8h11a3 3 0 1 0-3-3" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h15a3 3 0 1 1-3 3" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16h9a3 3 0 1 1-3 3" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#94A3B8" strokeWidth="2" />
      <path d="M12 7l2 5-2 5-2-5 2-5z" fill="#94A3B8" />
      <circle cx="12" cy="12" r="1.5" fill="#1a1a2e" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 18a9 9 0 1 1 18 0" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="16" y2="11" stroke="#FFB060" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1.5" fill="#FFB060" />
      <line x1="3" y1="18" x2="5" y2="18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="18" x2="21" y2="18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
