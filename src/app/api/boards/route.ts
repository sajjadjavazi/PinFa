import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  readJsonBody,
  validateCreateBoardInput,
} from "@/lib/board-validation";
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

  const body = await readJsonBody(request);
  const validation = validateCreateBoardInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      ownerUserId: currentUser.id,
      title: validation.data.title,
      description: validation.data.description,
      visibility: validation.data.visibility,
    },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      pinCount: true,
      followerCount: true,
    },
  });

  await prisma.userEvent.create({
    data: {
      userId: currentUser.id,
      eventType: "CREATE_BOARD",
      targetType: "BOARD",
      targetId: board.id,
    },
  });

  return NextResponse.json({ board }, { status: 201 });
}
