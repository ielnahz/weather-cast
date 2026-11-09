/**
 * /not-found-page — Route Handler that commits a genuine HTTP 404 status.
 *
 * Why a route handler instead of the `not-found.tsx` page?
 * `not-found.tsx` is rendered through the normal App Router pipeline, where
 * the response shell is streamed before the status is known — so the status
 * ends up as 200 (vercel/next.js#76474). A route handler controls the
 * Response object directly and can set the status to 404 before anything is
 * sent.
 *
 * The proxy (`src/proxy.ts`) rewrites unknown city routes here.
 *
 * The body is server-rendered into static HTML so crawlers and clients
 * without JavaScript still receive the proper "not found" content.
 */

export const dynamic = "force-dynamic";

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, follow" />
<title>页面未找到 - Weather Cast</title>
</head>
<body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="text-align:center;padding:2rem">
<div style="font-size:3.5rem;opacity:.4;margin-bottom:1rem">🌫️</div>
<h1 style="font-size:1.25rem;font-weight:500;margin:0 0 .5rem">页面未找到</h1>
<p style="font-size:.875rem;color:#94a3b8;margin:0 0 1.5rem">您访问的页面不存在</p>
<a href="/" style="display:inline-block;padding:.5rem 1.25rem;border-radius:9999px;background:rgba(255,255,255,.15);color:#fff;text-decoration:none;font-size:.875rem">返回首页</a>
</div>
</body>
</html>`;

export async function GET() {
  return new Response(HTML, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
