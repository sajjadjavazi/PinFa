import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { getPendingModerationPins } from "@/lib/moderation/admin-moderation-queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  if (!canAccessAdmin(currentUser)) {
    return NextResponse.json(
      { errors: { auth: "Admin access required." } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  if (limit === null) {
    return NextResponse.json(
      { errors: { limit: "Limit must be a number from 1 to 50." } },
      { status: 400 },
    );
  }

  try {
    const queue = await getPendingModerationPins({
      cursor: url.searchParams.get("cursor"),
      limit,
    });

    return NextResponse.json({
      items: queue.items,
      nextCursor: queue.nextCursor,
      hasMore: queue.hasMore,
    });
  } catch (error) {
    logAnalyticsError("admin.moderation_pending.failed", error, {
      actorId: currentUser.id,
    });

    return NextResponse.json(
      { errors: { moderation: "Could not load moderation queue." } },
      { status: 500 },
    );
  }
}

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return null;
  }

  return limit;
}
