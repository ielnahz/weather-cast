/**
 * Search Store — MobX state management for city search
 *
 * Manages:
 * - Search keyword
 * - Search results
 * - Loading state
 * - Error state
 * - Debounce logic for auto-suggest
 */

import { makeAutoObservable, runInAction } from "mobx";
import { weatherService } from "@/services/weatherService";
import type { CitySearchResult, AppError } from "@/types";

export class SearchStore {
  keyword = "";
  results: CitySearchResult[] = [];
  loading = false;
  error: AppError | null = null;
  hasSearched = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Controller for the in-flight search request, so it can be cancelled. */
  private searchController: AbortController | null = null;
  /** Monotonic request id — guards against out-of-order responses. */
  private requestId = 0;

  constructor() {
    makeAutoObservable(this);
  }

  /** Set keyword without searching */
  setKeyword(value: string): void {
    this.keyword = value;
    this.hasSearched = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  /** Cancel any in-flight search and reset loading state. */
  private cancelInFlight(): void {
    if (this.searchController) {
      this.searchController.abort();
      this.searchController = null;
    }
  }

  /** Search with debounce (300ms) */
  searchWithDebounce(keyword: string): void {
    this.keyword = keyword;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (!keyword.trim()) {
      this.cancelInFlight();
      this.results = [];
      this.hasSearched = false;
      this.loading = false;
      return;
    }

    // A newer keyword supersedes any request still in flight — cancel it
    // so we don't waste bandwidth on a result nobody will see.
    this.cancelInFlight();

    this.debounceTimer = setTimeout(() => {
      this.search(keyword);
    }, 300);
  }

  /** Immediate search (no debounce) */
  async search(keyword: string): Promise<void> {
    if (!keyword.trim()) {
      this.results = [];
      this.hasSearched = false;
      return;
    }

    const id = ++this.requestId;
    this.cancelInFlight();
    const controller = new AbortController();
    this.searchController = controller;

    this.loading = true;
    this.error = null;

    try {
      // Goes through our own /api/search route — the server holds a warm
      // connection to the geocoding API and can cache results, so the
      // browser never has to wait on a cold third-party connection.
      const results = await weatherService.searchCitiesFromBrowser(
        keyword,
        controller.signal,
      );
      // Ignore a response that has been superseded by a newer request
      if (id !== this.requestId) return;

      runInAction(() => {
        this.results = results;
        this.loading = false;
        this.hasSearched = true;
      });
    } catch (error) {
      if (id !== this.requestId) return;
      runInAction(() => {
        this.error = error as AppError;
        this.loading = false;
        this.hasSearched = true;
      });
    } finally {
      if (this.searchController === controller) {
        this.searchController = null;
      }
    }
  }

  /** Clear search state */
  clear(): void {
    this.keyword = "";
    this.results = [];
    this.loading = false;
    this.error = null;
    this.hasSearched = false;
    this.requestId++; // invalidate any in-flight response
    this.cancelInFlight();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
