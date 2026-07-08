import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api";
import { logAnalyticsError } from "@/lib/analytics";
import { getAdminReportById } from "@/lib/admin-report-queries";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApiUser();

  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await context.params;

  try {
    const report = await getAdminReportById(id);

    if (!report) {
      return NextResponse.json(
        { errors: { report: "Report not found." } },
        { status: 404 },
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    logAnalyticsError("admin.reports.detail.failed", error, {
      actorId: admin.user.id,
      reportId: id,
    });

    return NextResponse.json(
      { errors: { report: "Could not load report." } },
      { status: 500 },
    );
  }
}
