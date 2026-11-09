/**
 * EmptyState — Empty state with guided action
 *
 * Used when no search has been performed or no results found.
 * Guides the user to the next action.
 */

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-4xl mb-2 opacity-40" aria-hidden="true">🌤️</div>
      <p className="text-sm text-gray-500">{message}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
