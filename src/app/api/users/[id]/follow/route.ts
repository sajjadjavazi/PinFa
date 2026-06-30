import { NotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyFollowedUserInterestSignal } from "@/lib/interest-signals";
import { createNotification } from "@/lib/notifications";
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

  const { id: targetUserId } = await context.params;

  if (currentUser.id === targetUserId) {
    return NextResponse.json(
      { errors: { follow: "You cannot follow yourself." } },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json(
      { errors: { user: "User not found." } },
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.userFollow.create({
        data: {
          followerUserId: currentUser.id,
          targetUserId,
        },
      });
      await transaction.user.update({
        where: { id: currentUser.id },
        data: { followingCount: { increment: 1 } },
      });
      await transaction.user.update({
        where: { id: targetUserId },
        data: { followerCount: { increment: 1 } },
      });
      await transaction.userEvent.create({
        data: {
          userId: currentUser.id,
          eventType: "FOLLOW_USER",
          targetType: "USER",
          targetId: targetUserId,
        },
      });
      await createNotification(
        {
          actorId: currentUser.id,
          message: `${currentUser.displayName} followed you.`,
          targetId: currentUser.id,
          targetType: "USER",
          type: NotificationType.USER_FOLLOWED_YOU,
          userId: targetUserId,
        },
        transaction,
      );
    });

    await applyFollowedUserInterestSignal({
      targetUserId,
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

  const { id: targetUserId } = await context.params;

  if (currentUser.id === targetUserId) {
    return NextResponse.json(
      { errors: { follow: "You cannot unfollow yourself." } },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.userFollow.deleteMany({
      where: {
        followerUserId: currentUser.id,
        targetUserId,
      },
    });

    if (deleted.count === 0) {
      return deleted;
    }

    await transaction.user.update({
      where: { id: currentUser.id },
      data: { followingCount: { decrement: 1 } },
    });
    await transaction.user.update({
      where: { id: targetUserId },
      data: { followerCount: { decrement: 1 } },
    });
    await transaction.userEvent.create({
      data: {
        userId: currentUser.id,
        eventType: "UNFOLLOW_USER",
        targetType: "USER",
        targetId: targetUserId,
      },
    });

    return deleted;
  });

  return NextResponse.json({
    following: false,
    changed: result.count > 0,
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
