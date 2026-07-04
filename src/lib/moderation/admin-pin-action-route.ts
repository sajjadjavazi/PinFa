import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { logAnalyticsError } from "@/lib/analytics";
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
  const noteResult = await readReviewNote(request);

  if (!noteResult.ok) {
    return NextResponse.json(
      { errors: { reviewNote: noteResult.error } },
      { status: 400 },
    );
  }

  try {
    const pin = await applyAdminPinModerationAction({
      action,
      actorId: currentUser.id,
      ipAddress: getRequestIp(request),
      pinId,
      reviewNote: noteResult.reviewNote,
    });

    return NextResponse.json({ pin });
  } catch (error) {
    if (error instanceof AdminPinActionError) {
      return NextResponse.json(
        { errors: { pin: error.message } },
        { status: error.statusCode },
      );
    }

    logAnalyticsError("admin.pin_action.failed", error, {
      action,
      actorId: currentUser.id,
      pinId,
    });

    return NextResponse.json(
      { errors: { action: "Moderation action failed." } },
      { status: 500 },
    );
  }
}

type ReviewNoteResult =
  | {
      ok: true;
      reviewNote: string | null;
    }
  | {
      ok: false;
      error: string;
    };

async function readReviewNote(request: NextRequest): Promise<ReviewNoteResult> {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return {
      ok: true,
      reviewNote: null,
    };
  }

  if (!isRecord(body) || !("reviewNote" in body)) {
    return {
      ok: true,
      reviewNote: null,
    };
  }

  if (body.reviewNote === null || body.reviewNote === undefined) {
    return {
      ok: true,
      reviewNote: null,
    };
  }

  if (typeof body.reviewNote !== "string") {
    return {
      ok: false,
      error: "Review note must be text.",
    };
  }

  const reviewNote = body.reviewNote.trim();

  if (reviewNote.length > 1000) {
    return {
      ok: false,
      error: "Review note must be 1000 characters or less.",
    };
  }

  return {
    ok: true,
    reviewNote: reviewNote || null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
