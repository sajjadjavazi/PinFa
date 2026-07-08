import { NextRequest, NextResponse } from "next/server";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  try {
    const result = await markNotificationRead({
      id,
      userId: currentUser.id,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { errors: { notification: "Notification not found." } },
        { status: 404 },
      );
    }

    return NextResponse.json({ read: true });
  } catch (error) {
    logAnalyticsError("notifications.mark_read.failed", error, {
      notificationId: id,
      userId: currentUser.id,
    });

    return NextResponse.json(
      { errors: { notification: "Could not mark notification as read." } },
      { status: 500 },
    );
  }
}
