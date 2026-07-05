import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  readJsonBody,
  validateCreateBoardInput,
} from "@/lib/board-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const mine = ["1", "true"].includes(searchParams.get("mine") ?? "");
  const ownerUserId = searchParams.get("ownerUserId");

  if (mine && !currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const boards = await prisma.board.findMany({
    where: mine
      ? {
          ownerUserId: currentUser?.id ?? "",
        }
      : {
          ...(ownerUserId ? { ownerUserId } : {}),
          visibility: "PUBLIC",
        },
    orderBy: {
      createdAt: "desc",
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
      description: true,
      followerCount: true,
      id: true,
      owner: {
        select: {
          displayName: true,
          id: true,
          username: true,
        },
      },
      pinCount: true,
      title: true,
      visibility: true,
    },
  });

  return NextResponse.json({ boards });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const body = await readJsonBody(request);
  const validation = validateCreateBoardInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const board = await prisma.board.create({
      data: {
        ownerUserId: currentUser.id,
        title: validation.data.title,
        description: validation.data.description,
        visibility: validation.data.visibility,
      },
      select: {
        description: true,
        followerCount: true,
        id: true,
        pinCount: true,
        title: true,
        visibility: true,
      },
    });

    await prisma.userEvent.create({
      data: {
        eventType: "CREATE_BOARD",
        targetId: board.id,
        targetType: "BOARD",
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error("Board creation failed", error);

    return NextResponse.json(
      { errors: { form: "Board creation failed." } },
      { status: 500 },
    );
  }
}
