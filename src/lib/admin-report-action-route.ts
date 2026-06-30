import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
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

  try {
    const report = await applyAdminReportAction({
      action,
      actorId: currentUser.id,
      actorRole: currentUser.role,
      ipAddress: getRequestIp(request),
      reportId,
    });

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AdminReportActionError) {
      return NextResponse.json(
        { errors: { report: error.message } },
        { status: error.statusCode },
      );
    }

    throw error;
  }
}
