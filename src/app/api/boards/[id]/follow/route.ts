import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyFollowedBoardInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

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
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!board) {
    return NextResponse.json(
      { errors: { board: "Board not found." } },
      { status: 404 },
    );
  }

  if (board.ownerUserId === currentUser.id) {
    return NextResponse.json(
      { errors: { board: "You cannot follow your own Board." } },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.boardFollow.create({
        data: {
          userId: currentUser.id,
          boardId,
        },
      }),
      prisma.board.update({
        where: {
          id: boardId,
        },
        data: {
          followerCount: {
            increment: 1,
          },
        },
      }),
      prisma.userEvent.create({
        data: {
          userId: currentUser.id,
          eventType: "FOLLOW_BOARD",
          targetType: "BOARD",
          targetId: boardId,
        },
      }),
    ]);

    await applyFollowedBoardInterestSignal({
      boardId,
      userId: currentUser.id,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }

  return NextResponse.json({ following: true });
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
  const deleted = await prisma.$transaction(async (transaction) => {
    const removed = await transaction.boardFollow.deleteMany({
      where: {
        userId: currentUser.id,
        boardId,
      },
    });

    if (removed.count === 0) {
      return removed;
    }

    await transaction.board.updateMany({
      where: {
        id: boardId,
        followerCount: {
          gt: 0,
        },
      },
      data: {
        followerCount: {
          decrement: 1,
        },
      },
    });

    await transaction.userEvent.create({
      data: {
        userId: currentUser.id,
        eventType: "UNFOLLOW_BOARD",
        targetType: "BOARD",
        targetId: boardId,
      },
    });

    return removed;
  });

  return NextResponse.json({
    following: false,
    changed: deleted.count > 0,
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
