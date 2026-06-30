import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applySearchInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

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
  const query =
    body && typeof body === "object" && "query" in body
      ? String(body.query).trim()
      : "";

  if (query.length < 2) {
    return NextResponse.json(
      { errors: { query: "Search query must be at least 2 characters." } },
      { status: 400 },
    );
  }

  await Promise.all([
    prisma.userEvent.create({
      data: {
        userId: currentUser.id,
        eventType: "SEARCH",
        targetType: "SEARCH",
        metadataJson: {
          query,
        },
      },
    }),
    applySearchInterestSignal({
      query,
      userId: currentUser.id,
    }),
  ]);

  return NextResponse.json({ recorded: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
