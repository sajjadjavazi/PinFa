import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decodeFeedCursor, getHomeFeedPage, parseFeedLimit } from "@/lib/feed";

export async function handleHomeFeedRequest(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const cursor = decodeFeedCursor(searchParams.get("cursor"));
    const limit = parseFeedLimit(searchParams.get("limit"));
    const page = await getHomeFeedPage({
      cursor,
      limit,
      viewerUserId: currentUser?.id,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Home Feed could not be loaded", error);

    return NextResponse.json(
      { errors: { feed: "Home Feed could not be loaded." } },
      { status: 500 },
    );
  }
}
