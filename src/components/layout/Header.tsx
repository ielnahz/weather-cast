/**
 * Header — App header with logo and search trigger
 *
 * Contains search panel toggle button.
 * SearchPanel is rendered as an overlay when toggled.
 *
 * Layout: uses the same max-width as PageShell so the logo aligns
 * with the page content edge on desktop.
 */

"use client";

import { useUI } from "@/contexts/UIContext";
import { SearchPanel } from "@/components/search/SearchPanel";

export function Header() {
  const { isSearchPanelOpen, toggleSearchPanel } = useUI();

  return (
    <header className="sticky top-0 z-40 w-full max-w-6xl mx-auto px-4 md:px-0 py-3 md:py-4 bg-slate-800/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-white min-w-0">
          <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="12" fill="#FFD93D" />
            <path
              d="M36 34c-5 0-9-3-10-7-4 0-7-3-7-7s3-7 7-7c1-4 5-7 10-7s9 3 10 7c4 0 7 3 7 7s-3 7-7 7c-1 4-5 7-10 7z"
              fill="rgba(255,255,255,0.5)"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1"
            />
          </svg>
          <span className="text-lg font-semibold tracking-tight truncate">
            Weather Cast
          </span>
        </a>

        <div className="relative">
          <button
            onClick={toggleSearchPanel}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-sm transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="搜索城市"
            aria-expanded={isSearchPanelOpen}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">搜索城市</span>
          </button>

          <SearchPanel />
        </div>
      </div>
    </header>
  );
}
