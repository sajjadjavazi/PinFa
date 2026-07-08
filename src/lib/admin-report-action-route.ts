import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import {
  AdminReportActionError,
  applyAdminReportAction,
  type AdminReportAction,
} from "@/lib/admin-report-actions";
import { getRequestIp } from "@/lib/request-ip";

type ReportRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function handleAdminReportActionRoute(
  request: NextRequest,
  context: ReportRouteContext,
  action: AdminReportAction,
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

  const { id: reportId } = await context.params;
  const noteResult = await readReviewNote(request);

  if (!noteResult.ok) {
    return NextResponse.json(
      { errors: { reviewNote: noteResult.error } },
      { status: 400 },
    );
  }

  try {
    const report = await applyAdminReportAction({
      action,
      actorId: currentUser.id,
      actorRole: currentUser.role,
      ipAddress: getRequestIp(request),
      reportId,
      reviewNote: noteResult.reviewNote,
    });

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AdminReportActionError) {
      return NextResponse.json(
        { errors: { report: error.message } },
        { status: error.statusCode },
      );
    }

    logAnalyticsError("admin.report_action.failed", error, {
      action,
      actorId: currentUser.id,
      reportId,
    });

    return NextResponse.json(
      { errors: { report: "Report action failed." } },
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
