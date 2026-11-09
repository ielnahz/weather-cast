/**
 * SidePanel — Supplementary information panel
 *
 * Inspired by 墨迹天气 PC layout: supplementary information next to
 * the main weather card — city info, life indices, forecast overview.
 *
 * On desktop it appears as a right sidebar; on mobile/tablet it stacks
 * below the main content (see PageShell).
 */

import { WeatherIcon } from "@/components/common/WeatherIcon";
import { formatTemperature, formatWindSpeed, formatHumidity } from "@/utils/format";
import type { CurrentWeather, ForecastDay } from "@/types";

interface SidePanelProps {
  current: CurrentWeather;
  forecast: ForecastDay[];
}

/** Life index derived from weather data (simple rules, no API needed) */
function getLifeIndices(current: CurrentWeather) {
  const { temperature, humidity, windSpeed, weatherType, weatherDescription } = current;

  // 穿衣建议
  let clothing: string;
  if (temperature >= 28) clothing = "短袖";
  else if (temperature >= 22) clothing = "薄长袖";
  else if (temperature >= 15) clothing = "外套";
  else if (temperature >= 8) clothing = "厚外套";
  else clothing = "羽绒服";

  // 紫外线 (based on weather type as proxy for cloud cover)
  const isCloudy = ["cloudy", "overcast", "fog", "drizzle", "rain", "heavy_rain", "snow", "heavy_snow"].includes(weatherType);
  const uv = isCloudy ? "弱" : temperature > 25 ? "很强" : "中等";

  // 洗车
  const washing = ["clear", "partly_cloudy"].includes(weatherType) ? "适宜" : "不宜";

  // 运动
  const exercise = weatherType === "clear" || weatherType === "partly_cloudy"
    ? (temperature > 15 && temperature < 28 ? "适宜" : "较不宜")
    : "不宜";

  // 感冒指数
  const coldRisk = temperature < 10 || windSpeed > 30 ? "易发" : temperature < 18 ? "较易发" : "少发";

  return {
    clothing,
    uv,
    washing,
    exercise,
    coldRisk,
    humidity,
    windSpeed,
    weatherDescription,
  };
}

export function SidePanel({ current, forecast }: SidePanelProps) {
  const indices = getLifeIndices(current);

  const lifeIndices = [
    { icon: "👕", label: "穿衣", value: indices.clothing },
    { icon: "☀️", label: "紫外线", value: indices.uv },
    { icon: "🚗", label: "洗车", value: indices.washing },
    { icon: "🏃", label: "运动", value: indices.exercise },
    { icon: "🤧", label: "感冒", value: indices.coldRisk },
    { icon: "💧", label: "湿度", value: formatHumidity(indices.humidity) },
  ];

  // Pick the most representative upcoming days for the mini list
  const upcoming = forecast.slice(0, 4);

  return (
    <>
      {/* 城市信息卡 */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4">
        <h3 className="text-xs font-medium text-white/60 mb-3">当前位置</h3>
        <div className="flex items-center gap-3">
          <WeatherIcon type={current.weatherType} isDay={current.isDay} size={44} />
          <div className="min-w-0">
            <p className="text-base font-medium text-white truncate">
              {current.city}
            </p>
            <p className="text-xs text-white/50 truncate">
              {[current.admin1, current.country].filter(Boolean).join(" ")}
            </p>
          </div>
        </div>
        <dl className="mt-4 pt-3 border-t border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-white/50">当前温度</dt>
            <dd className="text-white/90">{formatTemperature(current.temperature)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">体感温度</dt>
            <dd className="text-white/90">{formatTemperature(current.feelsLike)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">风速</dt>
            <dd className="text-white/90">{formatWindSpeed(current.windSpeed)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">气压</dt>
            <dd className="text-white/90">{Math.round(current.pressure)} hPa</dd>
          </div>
        </dl>
      </div>

      {/* 生活指数 */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4">
        <h3 className="text-xs font-medium text-white/60 mb-3">生活指数</h3>
        <ul className="space-y-2.5">
          {lifeIndices.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-white/60">
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
              <span className="text-white/90">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 未来天气概览 */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4">
        <h3 className="text-xs font-medium text-white/60 mb-3">未来几天</h3>
        <ul className="space-y-3">
          {upcoming.map((day) => (
            <li key={day.date} className="flex items-center justify-between">
              <span className="text-xs text-white/60 w-16 shrink-0">
                {day.date.slice(5).replace("-", "/")}
              </span>
              <WeatherIcon type={day.weatherType} size={22} />
              <span className="text-xs text-white/50 ml-1 flex-1 truncate pl-1">
                {day.weatherDescription}
              </span>
              <span className="text-xs text-white/90 shrink-0">
                {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
