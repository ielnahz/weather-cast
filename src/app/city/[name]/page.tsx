/**
 * City Detail Page — SSR with dynamic route
 *
 * Route: /city/[name]
 *
 * Server Component that:
 * 1. Resolves city by name (via Open-Meteo geocoding)
 * 2. Fetches weather + forecast in parallel
 * 3. Generates SEO metadata with city-specific content
 * 4. Supports generateStaticParams for static generation of popular cities
 *
 * SEO: URL is semantic (/city/beijing), metadata is city-specific.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCityByName } from "@/utils/defaultCity";
import { weatherService } from "@/services/weatherService";
import { WeatherDisplay } from "@/components/weather/WeatherDisplay";
import { ErrorState } from "@/components/common/ErrorState";
import { ErrorType } from "@/types";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const cityName = decodeURIComponent(name);

  const city = await getCityByName(cityName);
  if (!city) {
    return {
      title: `${cityName}天气 - Weather Cast`,
      description: `查看${cityName}的天气状况和未来 7 天天气预报。`,
    };
  }

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
      title: `${cityName}天气 - Weather Cast`,
      description: `查看${cityName}的天气状况和未来 7 天天气预报。`,
    };
  }
}

export default async function CityPage({ params }: PageProps) {
  const { name } = await params;
  const cityName = decodeURIComponent(name);

  // 1. Resolve city by name
  const city = await getCityByName(cityName);
  if (!city) {
    // Unknown city → proper 404 so crawlers don't index thin pages
    notFound();
  }

  // 2. Fetch weather data in parallel
  try {
    const { current, forecast } = await weatherService.getWeatherAndForecast(city);

    return (
      <WeatherDisplay
        ssrCity={city}
        ssrCurrent={current}
        ssrForecast={forecast}
      />
    );
  } catch {
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
