import { handleAdClickEvent } from "@/lib/ads/click-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAdClickEvent(request);
}
