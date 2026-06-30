import { NotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/board-validation";
import { applyCategoryInterestSignal } from "@/lib/interest-signals";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

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

  const [pin, board] = await Promise.all([
    prisma.pin.findFirst({
      where: {
        id: pinId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        categoryId: true,
        ownerUserId: true,
        title: true,
      },
    }),
    prisma.board.findFirst({
      where: {
        id: boardId,
        ownerUserId: currentUser.id,
      },
      select: {
        id: true,
        coverPinId: true,
      },
    }),
  ]);

  if (!pin) {
    return NextResponse.json(
      { errors: { pin: "Only published Pins can be saved." } },
      { status: 404 },
    );
  }

  if (!board) {
    return NextResponse.json(
      { errors: { boardId: "Board not found." } },
      { status: 404 },
    );
  }

  try {
    const boardPin = await prisma.$transaction(async (transaction) => {
      const createdBoardPin = await transaction.boardPin.create({
        data: {
          boardId,
          pinId,
          savedByUserId: currentUser.id,
        },
        select: {
          id: true,
          boardId: true,
          pinId: true,
        },
      });

      await transaction.pin.update({
        where: {
          id: pinId,
        },
        data: {
          saveCount: {
            increment: 1,
          },
        },
      });

      await transaction.board.update({
        where: {
          id: boardId,
        },
        data: {
          pinCount: {
            increment: 1,
          },
          coverPinId: board.coverPinId ?? pinId,
        },
      });

      await transaction.userEvent.create({
        data: {
          userId: currentUser.id,
          eventType: "SAVE_PIN",
          targetType: "PIN",
          targetId: pinId,
          metadataJson: {
            boardId,
          },
        },
      });
      await createNotification(
        {
          actorId: currentUser.id,
          message: `${currentUser.displayName} saved your Pin "${pin.title}".`,
          targetId: pinId,
          targetType: "PIN",
          type: NotificationType.PIN_SAVED,
          userId: pin.ownerUserId,
        },
        transaction,
      );

      return createdBoardPin;
    });

    await applyCategoryInterestSignal({
      categoryId: pin.categoryId,
      signal: "save",
      userId: currentUser.id,
    });

    return NextResponse.json({ boardPin }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { errors: { save: "This Pin is already saved to that Board." } },
        { status: 409 },
      );
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function getBoardId(body: unknown) {
  if (!body || typeof body !== "object" || !("boardId" in body)) {
    return "";
  }

  const value = body.boardId;

  return typeof value === "string" ? value : "";
}
