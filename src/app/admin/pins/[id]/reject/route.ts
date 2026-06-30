import { NextRequest } from "next/server";
import { handleAdminPinActionRoute } from "@/lib/moderation/admin-pin-action-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return handleAdminPinActionRoute(request, context, "reject");
}
