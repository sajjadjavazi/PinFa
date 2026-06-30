import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const result = await prisma.$transaction(async (transaction) => {
    const board = await transaction.board.findUnique({
      where: {
        id: boardId,
      },
      select: {
        id: true,
        ownerUserId: true,
        coverPinId: true,
      },
    });

    if (!board) {
      return { status: 404 as const, errors: { board: "Board not found." } };
    }

    if (board.ownerUserId !== currentUser.id) {
      return {
        status: 403 as const,
        errors: { board: "Only the Board owner can remove Pins." },
      };
    }

    const deleted = await transaction.boardPin.deleteMany({
      where: {
        boardId,
        pinId,
      },
    });

    if (deleted.count === 0) {
      return {
        status: 404 as const,
        errors: { pin: "Pin is not saved to this Board." },
      };
    }

    await transaction.pin.updateMany({
      where: {
        id: pinId,
        saveCount: {
          gt: 0,
        },
      },
      data: {
        saveCount: {
          decrement: 1,
        },
      },
    });

    const nextCover =
      board.coverPinId === pinId
        ? await transaction.boardPin.findFirst({
            where: {
              boardId,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              pinId: true,
            },
          })
        : null;

    await transaction.board.update({
      where: {
        id: boardId,
      },
      data: {
        pinCount: {
          decrement: 1,
        },
        coverPinId:
          board.coverPinId === pinId ? (nextCover?.pinId ?? null) : undefined,
      },
    });

    await transaction.userEvent.create({
      data: {
        userId: currentUser.id,
        eventType: "UNSAVE_PIN",
        targetType: "PIN",
        targetId: pinId,
        metadataJson: {
          boardId,
        },
      },
    });

    return {
      status: 200 as const,
      removed: true,
    };
  });

  if ("errors" in result) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json(result);
}
