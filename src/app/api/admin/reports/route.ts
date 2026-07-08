import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api";
import { logAnalyticsError } from "@/lib/analytics";
import {
  getAdminReportStats,
  getAdminReports,
  validateAdminReportFilterInput,
} from "@/lib/admin-report-queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApiUser();

  if (!admin.ok) {
    return admin.response;
  }

  const url = new URL(request.url);
  const filters = validateAdminReportFilterInput({
    cursor: url.searchParams.get("cursor"),
    limit: url.searchParams.get("limit"),
    order: url.searchParams.get("order"),
    reason: url.searchParams.get("reason"),
    status: url.searchParams.get("status"),
    targetType: url.searchParams.get("targetType"),
  });

  if (!filters.ok) {
    return NextResponse.json({ errors: filters.errors }, { status: 400 });
  }

  try {
    const [reports, stats] = await Promise.all([
      getAdminReports(filters.filters),
      getAdminReportStats(),
    ]);

    return NextResponse.json({
      items: reports.items,
      nextCursor: reports.nextCursor,
      hasMore: reports.hasMore,
      stats,
    });
  } catch (error) {
    logAnalyticsError("admin.reports.list.failed", error, {
      actorId: admin.user.id,
    });

    return NextResponse.json(
      { errors: { reports: "Could not load reports." } },
      { status: 500 },
    );
  }
}
