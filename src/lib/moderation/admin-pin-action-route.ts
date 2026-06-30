import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import {
  AdminPinActionError,
  applyAdminPinModerationAction,
  type AdminPinModerationAction,
} from "@/lib/moderation/admin-pin-actions";
import { getRequestIp } from "@/lib/request-ip";

type PinRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function handleAdminPinActionRoute(
  request: NextRequest,
  context: PinRouteContext,
  action: AdminPinModerationAction,
) {
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

  const { id: pinId } = await context.params;

  try {
    const pin = await applyAdminPinModerationAction({
      action,
      actorId: currentUser.id,
      ipAddress: getRequestIp(request),
      pinId,
    });

    return NextResponse.json({ pin });
  } catch (error) {
    if (error instanceof AdminPinActionError) {
      return NextResponse.json(
        { errors: { pin: error.message } },
        { status: error.statusCode },
      );
    }

    throw error;
  }
}
