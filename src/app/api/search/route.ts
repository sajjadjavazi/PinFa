import { NextResponse } from "next/server";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import {
  canSearch,
  normalizeSearchQuery,
  parseSearchLimit,
  parseSearchTab,
  recordSearchEvent,
  searchAll,
} from "@/lib/search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const query = normalizeSearchQuery(url.searchParams.get("q"));
  const tab = parseSearchTab(url.searchParams.get("type"));
  const limit = parseSearchLimit(url.searchParams.get("limit"));

  if (!canSearch(query)) {
    return NextResponse.json(
      { errors: { q: "Search query must be at least 2 characters." } },
      { status: 400 },
    );
  }

  try {
    const [currentUser, results] = await Promise.all([
      getCurrentUser(),
      searchAll({
        limit,
        query,
      }),
    ]);

    await recordSearchEvent({
      query,
      resultCounts: {
        boards: results.boards.length,
        categories: results.categories.length,
        pins: results.pins.length,
        users: results.users.length,
      },
      source: "api",
      tab,
      userId: currentUser?.id,
    });

    logAnalyticsEvent("search.api.loaded", {
      durationMs: Date.now() - startedAt,
      queryLength: query.length,
      resultCounts: {
        boards: results.boards.length,
        categories: results.categories.length,
        pins: results.pins.length,
        users: results.users.length,
      },
      tab,
      userId: currentUser?.id ?? null,
    });

    return NextResponse.json({
      activeType: tab,
      results,
    });
  } catch (error) {
    logAnalyticsError("search.api.failed", error, {
      durationMs: Date.now() - startedAt,
      queryLength: query.length,
      tab,
    });

    return NextResponse.json(
      { errors: { search: "Search could not be loaded." } },
      { status: 500 },
    );
  }
}
