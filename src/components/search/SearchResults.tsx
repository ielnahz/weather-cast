/**
 * SearchResults — Displays city search results
 *
 * Presentational component — receives results and onSelect callback.
 * Each result item shows: city name, admin1 (province), country.
 *
 * Component design: props are explicitly typed (no ambiguous object params).
 */

"use client";

import type { CitySearchResult } from "@/types";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";

interface SearchResultsProps {
  results: CitySearchResult[];
  isLoading: boolean;
  hasSearched: boolean;
  keyword: string;
  onSelect: (city: CitySearchResult) => void;
}

export function SearchResults({
  results,
  isLoading,
  hasSearched,
  keyword,
  onSelect,
}: SearchResultsProps) {
  if (isLoading) {
    return <Loading variant="search" />;
  }

  if (hasSearched && results.length === 0) {
    return (
      <EmptyState
        message={`未找到 "${keyword}" 相关城市`}
        hint="试试搜索中文或英文名称"
      />
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <ul className="py-2 max-h-72 overflow-y-auto" role="listbox" aria-label="搜索结果">
      {results.map((city) => (
        <li key={`${city.id}-${city.latitude}-${city.longitude}`}>
          <button
            onClick={() => onSelect(city)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50"
            role="option"
            aria-selected="false"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-sm font-medium text-gray-800 truncate">
                {city.name}
              </span>
            </div>
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {[city.admin2, city.admin1, city.country].filter(Boolean).join(", ")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
