import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import {
  readJsonBody,
  validateUpdateBoardInput,
} from "@/lib/board-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const currentUser = await getCurrentUser();
  const board = await prisma.board.findUnique({
    where: {
      id,
    },
    select: {
      coverPin: {
        select: {
          imageDetailUrl: true,
          imageFeedUrl: true,
          imageThumbnailUrl: true,
          title: true,
        },
      },
      coverPinId: true,
      createdAt: true,
      description: true,
      followerCount: true,
      id: true,
      owner: {
        select: {
          avatarUrl: true,
          displayName: true,
          id: true,
          username: true,
        },
      },
      ownerUserId: true,
      pinCount: true,
      pins: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          id: true,
          pin: {
            select: {
              description: true,
              id: true,
              imageDetailUrl: true,
              imageFeedUrl: true,
              imageThumbnailUrl: true,
              saveCount: true,
              status: true,
              title: true,
            },
          },
        },
        where: {
          pin: {
            status: "PUBLISHED",
          },
        },
      },
      title: true,
      updatedAt: true,
      visibility: true,
    },
  });

  if (!board) {
    return NextResponse.json(
      { errors: { board: "Board not found." } },
      { status: 404 },
    );
  }

  const isOwner = currentUser?.id === board.ownerUserId;

  if (board.visibility !== "PUBLIC" && !isOwner && !canAccessAdmin(currentUser)) {
    return NextResponse.json(
      { errors: { board: "Board not found." } },
      { status: 404 },
    );
  }

  const follow = currentUser
    ? await prisma.boardFollow.findUnique({
        where: {
          userId_boardId: {
            boardId: board.id,
            userId: currentUser.id,
          },
        },
        select: {
          id: true,
        },
      })
    : null;

  return NextResponse.json({
    board: {
      ...board,
      following: Boolean(follow),
      pins: board.pins.map((boardPin) => ({
        boardPinId: boardPin.id,
        createdAt: boardPin.createdAt,
        ...boardPin.pin,
      })),
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const board = await prisma.board.findUnique({
    where: {
      id,
    },
    select: {
      ownerUserId: true,
    },
  });

  if (!board) {
    return NextResponse.json(
      { errors: { board: "Board not found." } },
      { status: 404 },
    );
  }

  if (board.ownerUserId !== currentUser.id) {
    return NextResponse.json(
      { errors: { board: "Only the Board owner can edit this Board." } },
      { status: 403 },
    );
  }

  const body = await readJsonBody(request);
  const validation = validateUpdateBoardInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const updatedBoard = await prisma.board.update({
      where: {
        id,
      },
      data: validation.data,
      select: {
        description: true,
        followerCount: true,
        id: true,
        pinCount: true,
        title: true,
        updatedAt: true,
        visibility: true,
      },
    });

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error("Board update failed", error);

    return NextResponse.json(
      { errors: { board: "Board update failed." } },
      { status: 500 },
    );
  }
}
