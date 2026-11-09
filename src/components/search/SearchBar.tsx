/**
 * SearchBar — Search input with auto-suggest
 *
 * Presentational component — receives keyword and callbacks via props.
 * Does NOT manage its own state (parent SearchPanel handles via SearchStore).
 */

"use client";

import { ChangeEvent } from "react";

interface SearchBarProps {
  value: string;
  isLoading: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
}

export function SearchBar({
  value,
  isLoading,
  placeholder = "搜索城市名称...",
  onChange,
  onSubmit,
  onFocus,
}: SearchBarProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 px-4 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100">
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          aria-label="搜索城市"
          autoComplete="off"
        />
        {isLoading && (
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500 flex-shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
