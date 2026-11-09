/**
 * 404 Not Found page
 *
 * Used by `notFound()` calls in dynamic routes (e.g. an unknown city).
 * `robots: noindex` prevents crawlers from indexing these thin pages,
 * even when the response status has already been committed to 200 by
 * the streaming shell.
 *
 * The proxy (`src/proxy.ts`) rewrites unknown cities to `/not-found`,
 * which is a route handler that can commit a genuine 404 status.
 */

import type { Metadata } from "next";
import NotFoundContent from "@/components/common/NotFoundContent";

export const metadata: Metadata = {
  title: "页面未找到 - Weather Cast",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return <NotFoundContent />;
}
