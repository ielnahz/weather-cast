/**
 * Loading — Loading indicator component
 *
 * Provides simple, structure-agnostic loading states:
 * - "search": skeleton rows for the search dropdown
 * - "default": a centered spinner
 *
 * The weather page uses its own inline spinner (WeatherLoading in
 * WeatherDisplay.tsx) rather than a skeleton screen — a skeleton that
 * doesn't perfectly match the real layout causes visual jarring, so
 * a clean spinner is the safer choice.
 */

interface LoadingProps {
  variant?: "search" | "default";
}

export function Loading({ variant = "default" }: LoadingProps) {
  if (variant === "search") {
    return (
      <div className="animate-pulse space-y-2" aria-label="搜索中">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-gray-100"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8" aria-label="加载中">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500"></div>
    </div>
  );
}
