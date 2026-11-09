/**
 * Icon gallery — dev-only page that renders every WeatherType icon
 * side by side at large size so the SVG geometry can be inspected.
 *
 * Not linked from the app. Route: /icon-gallery
 */

import { WeatherIcon } from "@/components/common/WeatherIcon";
import type { WeatherType } from "@/types";

const ICONS: { type: WeatherType; label: string }[] = [
  { type: "clear", label: "晴 (clear)" },
  { type: "partly_cloudy", label: "多云 (partly_cloudy)" },
  { type: "cloudy", label: "少云 (cloudy)" },
  { type: "overcast", label: "阴 (overcast)" },
  { type: "fog", label: "雾 (fog)" },
  { type: "drizzle", label: "毛毛雨 (drizzle)" },
  { type: "rain", label: "小雨 (rain)" },
  { type: "heavy_rain", label: "大雨 (heavy_rain)" },
  { type: "snow", label: "小雪 (snow)" },
  { type: "heavy_snow", label: "大雪 (heavy_snow)" },
  { type: "thunderstorm", label: "雷暴 (thunderstorm)" },
  { type: "thunderstorm_hail", label: "雷暴冰雹 (hail)" },
];

export default function IconGalleryPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-white text-lg mb-6">天气图标检查表 (64×64 viewBox, 渲染于 96px)</h1>
      <div className="grid grid-cols-6 gap-4 max-w-6xl">
        {ICONS.map((item) => (
          <div
            key={item.type}
            className="rounded-2xl bg-white/10 p-4 flex flex-col items-center gap-3"
          >
            {/* 64px reference grid to check centering against the box */}
            <div
              className="relative border border-white/20"
              style={{ width: 96, height: 96 }}
            >
              {/* vertical center line at x=32/64 */}
              <span
                className="absolute top-0 bottom-0 w-px bg-red-400/60"
                style={{ left: "50%" }}
              />
              <span
                className="absolute left-0 right-0 h-px bg-red-400/60"
                style={{ top: "50%" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <WeatherIcon type={item.type} size={96} />
              </div>
            </div>
            <span className="text-xs text-white/70 text-center">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
