import { NextRequest } from "next/server";
import { handleHomeFeedRequest } from "@/lib/feed-route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleHomeFeedRequest(request);
}
