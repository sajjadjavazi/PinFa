import { NextRequest } from "next/server";
import { handleAdminReportActionRoute } from "@/lib/admin-report-action-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return handleAdminReportActionRoute(request, context, "suspend-user");
}
