import { NotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyCategoryInterestSignal } from "@/lib/interest-signals";
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

  const { id: pinId } = await context.params;
  try {
    const pin = await prisma.pin.findFirst({
      where: {
        id: pinId,
        status: "PUBLISHED",
      },
      select: {
        categoryId: true,
        id: true,
        ownerUserId: true,
      },
    });

    if (!pin) {
      return NextResponse.json(
        { errors: { pin: "Only published Pins can be liked." } },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      await transaction.like.create({
        data: {
          userId: currentUser.id,
          pinId,
        },
      });

      const updatedPin = await transaction.pin.update({
        where: {
          id: pinId,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
        select: {
          likeCount: true,
        },
      });

      await transaction.userEvent.create({
        data: {
          eventType: "LIKE_PIN",
          targetId: pinId,
          targetType: "PIN",
          userId: currentUser.id,
        },
      });

      await createNotification(
        {
          actorId: currentUser.id,
          message: `${currentUser.displayName} liked your Pin.`,
          targetId: pinId,
          targetType: "PIN",
          type: NotificationType.PIN_LIKED,
          userId: pin.ownerUserId,
        },
        transaction,
      );

      return updatedPin;
    });

    await applyCategoryInterestSignal({
      categoryId: pin.categoryId,
      signal: "like",
      userId: currentUser.id,
    });

    return NextResponse.json({ liked: true, likeCount: result.likeCount });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const pinWithCount = await prisma.pin.findUnique({
        where: {
          id: pinId,
        },
        select: {
          likeCount: true,
        },
      });

      return NextResponse.json(
        {
          liked: true,
          likeCount: pinWithCount?.likeCount ?? 0,
          errors: {
            like: "You already liked this Pin.",
          },
        },
        { status: 409 },
      );
    }

    console.error("Like Pin failed", error);

    return NextResponse.json(
      { errors: { like: "Like failed." } },
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

  const { id: pinId } = await context.params;
  try {
    const pin = await prisma.pin.findFirst({
      where: {
        id: pinId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        likeCount: true,
      },
    });

    if (!pin) {
      return NextResponse.json(
        { errors: { pin: "Only published Pins can be unliked." } },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      const deleted = await transaction.like.deleteMany({
        where: {
          pinId,
          userId: currentUser.id,
        },
      });

      if (deleted.count === 0) {
        return {
          changed: false,
          likeCount: pin.likeCount,
        };
      }

      await transaction.pin.updateMany({
        where: {
          id: pinId,
          likeCount: {
            gt: 0,
          },
        },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });

      await transaction.userEvent.create({
        data: {
          eventType: "UNLIKE_PIN",
          targetId: pinId,
          targetType: "PIN",
          userId: currentUser.id,
        },
      });

      const updatedPin = await transaction.pin.findUnique({
        where: {
          id: pinId,
        },
        select: {
          likeCount: true,
        },
      });

      return {
        changed: true,
        likeCount: updatedPin?.likeCount ?? 0,
      };
    });

    return NextResponse.json({
      changed: result.changed,
      liked: false,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("Unlike Pin failed", error);

    return NextResponse.json(
      { errors: { like: "Unlike failed." } },
      { status: 500 },
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
