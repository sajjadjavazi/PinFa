import { NextRequest, NextResponse } from "next/server";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import {
  decodeFeedCursor,
  getHomeFeedPage,
  parseFeedLimit,
  recordFeedViewEvents,
} from "@/lib/feed";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const currentUser = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const cursor = decodeFeedCursor(searchParams.get("cursor"));
    const limit = parseFeedLimit(searchParams.get("limit"));
    const page = await getHomeFeedPage({
      cursor,
      limit,
      viewerUserId: currentUser?.id,
    });

    await recordFeedViewEvents({
      items: page.items,
      userId: currentUser?.id,
    });

    logAnalyticsEvent("feed.home.loaded", {
      durationMs: Date.now() - startedAt,
      hasCursor: Boolean(cursor),
      hasMore: page.has_more,
      itemCount: page.items.length,
      limit,
      userId: currentUser?.id ?? null,
    });

    return NextResponse.json(page);
  } catch (error) {
    logAnalyticsError("feed.home.failed", error, {
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { errors: { feed: "Home Feed could not be loaded." } },
      { status: 500 },
    );
  }
}
