import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { removePinFromBoard } from "@/lib/board-actions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    pinId: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id: boardId, pinId } = await context.params;

  try {
    const result = await removePinFromBoard({
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
    console.error("Remove from Board failed", error);

    return NextResponse.json(
      { errors: { pin: "Remove failed." } },
      { status: 500 },
    );
  }
}
