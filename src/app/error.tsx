/**
 * Global Error Boundary
 *
 * Catches unexpected runtime errors that bypass the layered error handling.
 * Provides a reset button to retry rendering.
 */

"use client";

import { ErrorState } from "@/components/common/ErrorState";
import { ErrorType } from "@/types";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={{
        type: ErrorType.UNKNOWN,
        message: "页面发生错误，请重试",
        retryable: true,
      }}
      onRetry={reset}
    />
  );
}
