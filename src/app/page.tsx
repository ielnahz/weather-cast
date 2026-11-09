/**
 * Home Page — SSR
 *
 * Server Component that:
 * 1. Resolves default city (cookie → IP → Shenzhen fallback)
 * 2. Fetches current weather + forecast in parallel
 * 3. Generates dynamic SEO metadata
 * 4. Renders WeatherDisplay with SSR data (prevents client-side refetch)
 *
 * Performance: parallel API calls reduce server-side wait time.
 * SEO: metadata includes city name and weather description.
 */

import type { Metadata } from "next";
import { getDefaultCity } from "@/utils/defaultCity";
import { weatherService } from "@/services/weatherService";
import { WeatherDisplay } from "@/components/weather/WeatherDisplay";
import { ErrorState } from "@/components/common/ErrorState";
import { ErrorType } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const city = await getDefaultCity();

  try {
    const { current } = await weatherService.getWeatherAndForecast(city);
    return {
      title: `${current.city}天气 - ${current.weatherDescription} ${Math.round(current.temperature)}°C`,
      description: `${current.city}${current.admin1 ? ` ${current.admin1}` : ""}当前天气：${current.weatherDescription}，温度 ${Math.round(current.temperature)}°C，体感 ${Math.round(current.feelsLike)}°C，湿度 ${Math.round(current.humidity)}%，查看未来 7 天天气预报。`,
      openGraph: {
        title: `${current.city}天气 - ${current.weatherDescription} ${Math.round(current.temperature)}°C`,
        description: `${current.city}当前天气：${current.weatherDescription}，温度 ${Math.round(current.temperature)}°C`,
        type: "website",
        locale: "zh_CN",
      },
    };
  } catch {
    return {
      title: "天气预报 - Weather Cast",
      description: "搜索城市、查看当前天气状况和未来 7 天天气预报。",
    };
  }
}

export default async function HomePage() {
  // 1. Resolve default city (cookie → IP → Shenzhen)
  const city = await getDefaultCity();

  // 2. Fetch weather data in parallel (performance optimization)
  try {
    const { current, forecast } = await weatherService.getWeatherAndForecast(city);

    // 3. Pass SSR data to client component for hydration
    return (
      <WeatherDisplay
        ssrCity={city}
        ssrCurrent={current}
        ssrForecast={forecast}
      />
    );
  } catch {
    // 4. Error fallback — still show the page with an error state
    return (
      <ErrorState
        error={{
          type: ErrorType.SERVER_ERROR,
          message: "无法获取天气数据，请稍后重试",
          retryable: true,
        }}
      />
    );
  }
}
