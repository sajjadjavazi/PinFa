import { NextResponse } from "next/server";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import {
  canSearch,
  decodeSearchCursor,
  normalizeSearchQuery,
  parseSearchLimit,
  parseSearchType,
  recordSearchEvent,
  runSearch,
  type SearchEntityType,
} from "@/lib/search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const query = normalizeSearchQuery(url.searchParams.get("q"));
  const type = parseSearchType(url.searchParams.get("type"));
  const limit = parseSearchLimit(url.searchParams.get("limit"));
  const cursor = decodeSearchCursor(url.searchParams.get("cursor"));

  if (!canSearch(query)) {
    return NextResponse.json(
      { errors: { q: "Search query must be at least 2 characters." } },
      { status: 400 },
    );
  }

  try {
    const [currentUser, response] = await Promise.all([
      getCurrentUser(),
      runSearch({
        cursor,
        limit,
        query,
        type,
      }),
    ]);
    const resultCounts =
      response.type === "all"
        ? response.counts
        : {
            [response.type]: response.count,
          };

    await recordSearchEvent({
      query,
      resultCounts: resultCounts as Partial<Record<SearchEntityType, number>>,
      source: "api",
      type,
      userId: currentUser?.id,
    });

    logAnalyticsEvent("search.api.loaded", {
      durationMs: Date.now() - startedAt,
      queryLength: query.length,
      resultCounts,
      type,
      userId: currentUser?.id ?? null,
    });

    return NextResponse.json(response);
  } catch (error) {
    logAnalyticsError("search.api.failed", error, {
      durationMs: Date.now() - startedAt,
      queryLength: query.length,
      type,
    });

    return NextResponse.json(
      { errors: { search: "Search could not be loaded." } },
      { status: 500 },
    );
  }
}
