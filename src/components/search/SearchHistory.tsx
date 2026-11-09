/**
 * SearchHistory — Recent search history quick access
 *
 * Reads from cookie (client-side).
 * Clicking a history item navigates to that city.
 */

"use client";

import { useEffect, useState } from "react";
import { getSearchHistory } from "@/utils/cookies";
import type { SearchHistoryItem } from "@/types";

interface SearchHistoryProps {
  onSelect: (item: SearchHistoryItem) => void;
}

export function SearchHistory({ onSelect }: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="px-4 pb-2">
      <p className="text-xs text-gray-400 mb-2 px-1">最近搜索</p>
      <div className="flex flex-wrap gap-2">
        {history.map((item, index) => (
          <button
            key={`${item.name}-${index}`}
            onClick={() => onSelect(item)}
            className="px-3 py-1.5 rounded-full text-xs text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
