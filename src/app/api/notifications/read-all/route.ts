import { NextResponse } from "next/server";
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

  const result = await markAllNotificationsRead(currentUser.id);

  return NextResponse.json({
    read: true,
    updatedCount: result.count,
  });
}

