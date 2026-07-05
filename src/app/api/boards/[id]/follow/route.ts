import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { followPublicBoard, unfollowBoard } from "@/lib/board-actions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id: boardId } = await context.params;
  try {
    const result = await followPublicBoard({
      boardId,
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
    console.error("Follow Board failed", error);

    return NextResponse.json(
      { errors: { board: "Follow failed." } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id: boardId } = await context.params;
  try {
    const result = await unfollowBoard({
      boardId,
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
    console.error("Unfollow Board failed", error);

    return NextResponse.json(
      { errors: { board: "Unfollow failed." } },
      { status: 500 },
    );
  }
}
