import { NextRequest, NextResponse } from "next/server";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const take = parseTake(url.searchParams.get("limit"));

  if (take === null) {
    return NextResponse.json(
      { errors: { limit: "Limit must be a number from 1 to 100." } },
      { status: 400 },
    );
  }

  try {
    const notifications = await getNotificationsForUser({
      take,
      userId: currentUser.id,
    });

    return NextResponse.json({ items: notifications });
  } catch (error) {
    logAnalyticsError("notifications.list.failed", error, {
      userId: currentUser.id,
    });

    return NextResponse.json(
      { errors: { notifications: "Could not load notifications." } },
      { status: 500 },
    );
  }
}

function parseTake(value: string | null) {
  if (!value) {
    return 50;
  }

  const take = Number(value);

  if (!Number.isInteger(take) || take < 1 || take > 100) {
    return null;
  }

  return take;
}
