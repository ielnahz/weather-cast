/**
 * SearchPanel — Container component for search functionality
 *
 * Orchestrates SearchBar + SearchResults + SearchHistory.
 * Uses SearchStore (MobX) for state management.
 * Writes to cookie when a city is selected.
 */

"use client";

import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { useStores } from "@/stores";
import { useUI } from "@/contexts/UIContext";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";
import { SearchHistory } from "./SearchHistory";
import { setLastCityCookie, addToSearchHistory } from "@/utils/cookies";
import type { CitySearchResult, SearchHistoryItem } from "@/types";

export const SearchPanel = observer(function SearchPanel() {
  const router = useRouter();
  const { searchStore } = useStores();
  const { isSearchPanelOpen, closeSearchPanel } = useUI();

  const handleSelectCity = (city: CitySearchResult) => {
    // Persist to cookies
    setLastCityCookie(city);
    addToSearchHistory(city);

    // Navigate to city page
    router.push(`/city/${encodeURIComponent(city.name)}`);
    searchStore.clear();
    closeSearchPanel();
  };

  const handleSelectHistory = (item: SearchHistoryItem) => {
    const city: CitySearchResult = {
      id: 0,
      name: item.name,
      country: item.country,
      countryCode: "",
      admin1: item.admin1,
      latitude: item.latitude,
      longitude: item.longitude,
    };
    setLastCityCookie(city);
    router.push(`/city/${encodeURIComponent(item.name)}`);
    searchStore.clear();
    closeSearchPanel();
  };

  if (!isSearchPanelOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:absolute md:inset-auto md:top-full md:right-0 md:w-96"
      onClick={closeSearchPanel}
    >
      {/* Backdrop (mobile only) */}
      <div className="absolute inset-0 bg-black/30 md:hidden" />

      {/* Panel */}
      <div
        className="relative bg-white rounded-b-2xl md:rounded-2xl shadow-2xl overflow-hidden w-full md:w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <SearchBar
            value={searchStore.keyword}
            isLoading={searchStore.loading}
            onChange={(value) => searchStore.searchWithDebounce(value)}
            onSubmit={() => {
              if (searchStore.keyword.trim()) {
                searchStore.search(searchStore.keyword);
              }
            }}
            onFocus={() => {}}
          />
        </div>

        {searchStore.keyword && (searchStore.hasSearched || searchStore.loading) ? (
          <SearchResults
            results={searchStore.results}
            isLoading={searchStore.loading}
            hasSearched={searchStore.hasSearched}
            keyword={searchStore.keyword}
            onSelect={handleSelectCity}
          />
        ) : (
          <SearchHistory onSelect={handleSelectHistory} />
        )}

        {searchStore.error && (
          <div className="px-4 py-2 text-xs text-red-500">
            {searchStore.error.message}
          </div>
        )}
      </div>
    </div>
  );
});
