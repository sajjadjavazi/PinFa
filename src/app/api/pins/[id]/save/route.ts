import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { savePublishedPinToBoard } from "@/lib/board-actions";
import { readJsonBody } from "@/lib/board-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id: pinId } = await context.params;
  const body = await readJsonBody(request);
  const boardId = getBoardId(body);

  if (!boardId) {
    return NextResponse.json(
      { errors: { boardId: "Board is required." } },
      { status: 400 },
    );
  }

  try {
    const result = await savePublishedPinToBoard({
      actorDisplayName: currentUser.displayName,
      boardId,
      pinId,
      userId: currentUser.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { errors: result.errors },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Save to Board failed", error);

    return NextResponse.json(
      { errors: { save: "Save failed." } },
      { status: 500 },
    );
  }
}

function getBoardId(body: unknown) {
  if (!body || typeof body !== "object" || !("boardId" in body)) {
    return "";
  }

  const value = body.boardId;

  return typeof value === "string" ? value : "";
}
