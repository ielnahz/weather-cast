/**
 * Weather Store — MobX state management for weather data
 *
 * Manages:
 * - Current weather data
 * - Forecast data
 * - Loading state
 * - Error state (with retry support)
 *
 * Design: This store is initialized on the client side.
 * SSR data is injected via `hydrateFromSSR()` to avoid duplicate requests.
 */

import { makeAutoObservable, runInAction } from "mobx";
import { weatherService } from "@/services/weatherService";
import type { CurrentWeather, ForecastDay, CitySearchResult, AppError } from "@/types";

export class WeatherStore {
  current: CurrentWeather | null = null;
  forecast: ForecastDay[] = [];
  loading = false;
  error: AppError | null = null;
  activeCity: CitySearchResult | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** Set active city (without fetching) */
  setActiveCity(city: CitySearchResult): void {
    this.activeCity = city;
  }

  /** Hydrate from SSR data — prevents duplicate API calls on client */
  hydrateFromSSR(city: CitySearchResult, current: CurrentWeather, forecast: ForecastDay[]): void {
    this.activeCity = city;
    this.current = current;
    this.forecast = forecast;
    this.loading = false;
    this.error = null;
  }

  /** Fetch weather + forecast for a city */
  async fetchWeather(city: CitySearchResult): Promise<void> {
    this.loading = true;
    this.error = null;
    this.activeCity = city;

    try {
      const { current, forecast } = await weatherService.getWeatherAndForecast(city);
      runInAction(() => {
        this.current = current;
        this.forecast = forecast;
        this.loading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error as AppError;
        this.loading = false;
      });
    }
  }

  /** Clear all data */
  clear(): void {
    this.current = null;
    this.forecast = [];
    this.loading = false;
    this.error = null;
    this.activeCity = null;
  }
}
