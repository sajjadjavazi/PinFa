import { NextResponse } from "next/server";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const unreadCount = await getUnreadNotificationCount(currentUser.id);

    return NextResponse.json({ unreadCount });
  } catch (error) {
    logAnalyticsError("notifications.unread_count.failed", error, {
      userId: currentUser.id,
    });

    return NextResponse.json(
      { errors: { notifications: "Could not load unread count." } },
      { status: 500 },
    );
  }
}
