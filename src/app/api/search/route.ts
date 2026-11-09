/**
 * /api/search — Server-side city search proxy
 *
 * WHY THIS EXISTS
 * ---------------
 * The city search used to call Open-Meteo's geocoding endpoint directly from
 * the browser. Two problems with that:
 *
 *   1. Latency — cold connections from the browser to the geocoding API were
 *      measured at 2.6s, 4.6s and even 22s. The app's request timeout is
 *      10s, so a slow cold connection could blow the whole search.
 *   2. CORS coupling — the browser's request depended on the third party
 *      getting its CORS headers right (Open-Meteo's OPTIONS handler returns
 *      404, so any request that accidentally becomes "non-simple" is
 *      blocked outright).
 *
 * Routing the lookup through our own origin fixes both: the server keeps a
 * warm connection to the upstream, caches results, and the browser only ever
 * talks to same-origin URLs.
 *
 * SECURITY
 * --------
 * - The keyword is length-limited and URL-encoded.
 * - The upstream host is fixed by code (never taken from user input).
 * - The response is a plain JSON array of city records.
 */

import { NextResponse } from "next/server";
import { weatherService } from "@/services/weatherService";

export const dynamic = "force-dynamic";

/** Max keyword length — anything longer is a malformed request */
const MAX_KEYWORD_LENGTH = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("q") ?? "").trim();

  if (!keyword) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (keyword.length > MAX_KEYWORD_LENGTH) {
    return NextResponse.json(
      { error: "关键词过长" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const results = await weatherService.searchCities(keyword);

    // Results are stable for a given keyword — let the browser cache them
    // briefly so repeat searches are instant and do not hit the API again.
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: number }).status === "number"
        ? (error as { status: number }).status
        : 502;

    return NextResponse.json(
      { error: "城市搜索服务暂时不可用" },
      { status: status >= 400 && status < 600 ? status : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
