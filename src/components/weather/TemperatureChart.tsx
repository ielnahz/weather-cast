/**
 * TemperatureChart — Lightweight SVG temperature trend chart
 *
 * No external chart library — pure SVG implementation.
 * Shows min/max temperature lines for the forecast period.
 *
 * Design decision: Using SVG instead of a chart library (Chart.js, Recharts)
 * to minimize bundle size. A simple line chart doesn't justify a dependency.
 *
 * The chart sits inside a full-width rounded container with a subtle
 * background tint. The SVG itself uses preserveAspectRatio="xMidYMid meet"
 * so the chart content keeps its aspect ratio and centres within the container,
 * while the background fills the entire available width — no empty gap.
 */

import { formatWeekday } from "@/utils/format";
import { Section } from "@/components/layout/PageShell";

interface TemperatureChartProps {
  data: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
  }>;
}

export function TemperatureChart({ data }: TemperatureChartProps) {
  if (data.length === 0) return null;

  const width = Math.max(data.length * 80, 320);
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const temps = data.flatMap((d) => [d.tempMax, d.tempMin]);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const tempRange = maxTemp - minTemp || 1;

  const xStep = chartWidth / Math.max(data.length - 1, 1);

  const getX = (index: number) => padding.left + xStep * index;
  const getY = (temp: number) =>
    padding.top + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;

  const maxPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.tempMax)}`)
    .join(" ");
  const minPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.tempMin)}`)
    .join(" ");

  const areaPath = `${maxPath} L ${getX(data.length - 1)} ${getY(data[data.length - 1].tempMin)} ${data
    .map((d, i) => `L ${getX(data.length - 1 - i)} ${getY(d.tempMin)}`)
    .join(" ")} Z`;

  return (
    <Section title="温度趋势">
      {/* Full-width container with subtle background tint — fills the
          entire section width regardless of SVG content dimensions. */}
      <div className="w-full rounded-xl bg-white/5 p-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label="未来7天温度趋势折线图"
        >
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 200, 100, 0.3)" />
              <stop offset="100%" stopColor="rgba(100, 150, 255, 0.1)" />
            </linearGradient>
          </defs>

          {/* Area between max and min */}
          <path d={areaPath} fill="url(#tempGradient)" opacity="0.4" />

          {/* Max temp line */}
          <path
            d={maxPath}
            fill="none"
            stroke="rgba(255, 180, 80, 0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Min temp line */}
          <path
            d={minPath}
            fill="none"
            stroke="rgba(120, 170, 255, 0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points and labels */}
          {data.map((d, i) => (
            <g key={d.date}>
              <circle cx={getX(i)} cy={getY(d.tempMax)} r="3" fill="rgba(255, 180, 80, 1)" />
              <circle cx={getX(i)} cy={getY(d.tempMin)} r="3" fill="rgba(120, 170, 255, 1)" />
              <text
                x={getX(i)}
                y={getY(d.tempMax) - 8}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.8)"
                fontSize="10"
              >
                {Math.round(d.tempMax)}°
              </text>
              <text
                x={getX(i)}
                y={getY(d.tempMin) + 14}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.6)"
                fontSize="10"
              >
                {Math.round(d.tempMin)}°
              </text>
              <text
                x={getX(i)}
                y={height - 8}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.5)"
                fontSize="9"
              >
                {formatWeekday(d.date).slice(0, 3)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-400 rounded" aria-hidden="true" />
          <span className="text-xs text-white/60">最高温</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-400 rounded" aria-hidden="true" />
          <span className="text-xs text-white/60">最低温</span>
        </div>
      </div>
    </Section>
  );
}
