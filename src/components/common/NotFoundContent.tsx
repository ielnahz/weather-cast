/**
 * 404 Not Found UI — shared between the `not-found` page and the
 * `/not-found` route handler (used by the proxy rewrite).
 */

import Link from "next/link";

export default function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-4 opacity-40" aria-hidden="true">
        🌫️
      </div>
      <h1 className="text-xl font-medium text-white/80 mb-2">页面未找到</h1>
      <p className="text-sm text-white/50 mb-6">您访问的页面不存在</p>
      <Link
        href="/"
        className="px-5 py-2 rounded-full bg-white/15 text-white text-sm font-medium transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        返回首页
      </Link>
    </div>
  );
}
