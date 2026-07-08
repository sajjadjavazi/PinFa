import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canSearch, normalizeSearchQuery, recordSearchEvent } from "@/lib/search";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const body = await readJson(request);
  const query = normalizeSearchQuery(
    body && typeof body === "object" && "query" in body
      ? String(body.query).trim()
      : "",
  );

  if (!canSearch(query)) {
    return NextResponse.json(
      { errors: { query: "Search query must be at least 2 characters." } },
      { status: 400 },
    );
  }

  await recordSearchEvent({
    query,
    source: "api",
    type: "all",
    userId: currentUser.id,
  });

  return NextResponse.json({ recorded: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
