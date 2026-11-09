/**
 * WeatherDisplay — Client-side weather orchestrator
 *
 * This component bridges SSR data and client-side interactions.
 * On mount, it hydrates the MobX store from SSR-provided data.
 *
 * SSR rendering: on the server and during initial hydration, the
 * component renders directly from SSR props — the MobX store is
 * empty at that point. This produces fully-rendered HTML that
 * crawlers and users see immediately.
 *
 * City switching: when the user searches or clicks a history item,
 * Next.js performs a soft navigation. The new SSR props arrive but
 * the store still holds the previous city. We detect this mismatch
 * (store has a different city than the new props) and show a spinner
 * until the effect syncs the store.
 *
 * Layout:
 * - Mobile: single column
 * - Desktop: main column + side panel
 */

"use client";

import { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useStores } from "@/stores";
import { CurrentWeather } from "./CurrentWeather";
import { WeatherDetail } from "./WeatherDetail";
import { ForecastList } from "./ForecastList";
import { TemperatureChart } from "./TemperatureChart";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { SidePanel } from "@/components/layout/SidePanel";
import type { CurrentWeather as CurrentWeatherType, ForecastDay, CitySearchResult } from "@/types";

/** Minimal loading indicator — a centered spinner.
 *  No skeleton structure that could mismatch with the real layout. */
function WeatherLoading() {
  return (
    <div className="flex items-center justify-center py-20" aria-label="正在加载天气数据">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
    </div>
  );
}

interface WeatherDisplayProps {
  ssrCity: CitySearchResult;
  ssrCurrent: CurrentWeatherType;
  ssrForecast: ForecastDay[];
}

export const WeatherDisplay = observer(function WeatherDisplay({
  ssrCity,
  ssrCurrent,
  ssrForecast,
}: WeatherDisplayProps) {
  const { weatherStore } = useStores();

  // Track whether the store has been hydrated for the current SSR props.
  // null = never hydrated (SSR / first render).
  // After the effect runs, it stores the city name so we know the store
  // is in sync with these props.
  const hydratedForCity = useRef<string | null>(null);

  // Hydrate from SSR data on mount or when SSR data changes
  useEffect(() => {
    weatherStore.hydrateFromSSR(ssrCity, ssrCurrent, ssrForecast);
    hydratedForCity.current = ssrCity.name;
  }, [ssrCity, ssrCurrent, ssrForecast, weatherStore]);

  // Determine whether the store is in sync with the current SSR props.
  //
  // - hydratedForCity.current === ssrCity.name → store is synced, use store data
  // - hydratedForCity.current === null → first render (SSR), use SSR props directly
  // - hydratedForCity.current !== ssrCity.name → soft navigation in progress,
  //   store still has the old city, show spinner until effect runs
  const isSynced = hydratedForCity.current === ssrCity.name;
  const isFirstRender = hydratedForCity.current === null;
  const isNavigating = !isSynced && !isFirstRender;

  // Error state (only relevant after hydration, when store has data)
  if (!isFirstRender && weatherStore.error) {
    return (
      <PageShell>
        <ErrorState
          error={weatherStore.error}
          onRetry={() => {
            if (weatherStore.activeCity) {
              weatherStore.fetchWeather(weatherStore.activeCity);
            }
          }}
        />
      </PageShell>
    );
  }

  // Soft navigation: store has a different city, show spinner briefly
  if (isNavigating || weatherStore.loading) {
    return (
      <PageShell>
        <WeatherLoading />
      </PageShell>
    );
  }

  // Use store data if synced, otherwise use SSR props directly (first render / SSR)
  const current = isSynced ? weatherStore.current! : ssrCurrent;
  const forecast = isSynced ? weatherStore.forecast : ssrForecast;

  return (
    <PageShell
      aside={<SidePanel current={current} forecast={forecast} />}
    >
      <CurrentWeather
        city={current.city}
        admin1={current.admin1}
        temperature={current.temperature}
        feelsLike={current.feelsLike}
        weatherType={current.weatherType}
        weatherDescription={current.weatherDescription}
        isDay={current.isDay}
        updatedAt={current.updatedAt}
      />

      <WeatherDetail
        humidity={current.humidity}
        windSpeed={current.windSpeed}
        windDirection={current.windDirection}
        pressure={current.pressure}
        feelsLike={current.feelsLike}
      />

      <ForecastList forecast={forecast} />

      {/* 温度趋势 — hidden only on mobile (the side panel covers that info on desktop) */}
      <div className="hidden md:block">
        <TemperatureChart data={forecast} />
      </div>
    </PageShell>
  );
});
