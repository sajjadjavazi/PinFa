import { NextResponse } from "next/server";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const result = await markAllNotificationsRead(currentUser.id);

    return NextResponse.json({
      read: true,
      updatedCount: result.count,
    });
  } catch (error) {
    logAnalyticsError("notifications.mark_all_read.failed", error, {
      userId: currentUser.id,
    });

    return NextResponse.json(
      { errors: { notification: "Could not mark notifications as read." } },
      { status: 500 },
    );
  }
}
