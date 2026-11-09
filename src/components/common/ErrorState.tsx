/**
 * ErrorState — Friendly error display with retry button
 *
 * Shows user-friendly error messages (no technical details).
 * Provides a retry button when the error is retryable.
 */

"use client";

import type { AppError } from "@/types";

interface ErrorStateProps {
  error: AppError;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const icons: Record<string, string> = {
    NETWORK_ERROR: "📡",
    CITY_NOT_FOUND: "🔍",
    API_RATE_LIMIT: "⏱️",
    SERVER_ERROR: "🔧",
    TIMEOUT: "⏳",
    UNKNOWN: "❓",
  };

  const icon = icons[error.type] || "❓";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-3" aria-hidden="true">{icon}</div>
      <p className="text-base text-gray-600 mb-4">{error.message}</p>
      {error.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full bg-blue-500 text-white text-sm font-medium transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          重试
        </button>
      )}
    </div>
  );
}
