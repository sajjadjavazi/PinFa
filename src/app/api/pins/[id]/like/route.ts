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
  const pin = await prisma.pin.findFirst({
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
  });

  if (!pin) {
    return NextResponse.json(
      { errors: { pin: "Only published Pins can be liked." } },
      { status: 404 },
    );
  }

  try {
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
          userId: currentUser.id,
          eventType: "LIKE_PIN",
          targetType: "PIN",
          targetId: pinId,
        },
      });
      await createNotification(
        {
          actorId: currentUser.id,
          message: `${currentUser.displayName} liked your Pin "${pin.title}".`,
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

    throw error;
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
  const result = await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.like.deleteMany({
      where: {
        userId: currentUser.id,
        pinId,
      },
    });

    if (deleted.count === 0) {
      const pin = await transaction.pin.findUnique({
        where: {
          id: pinId,
        },
        select: {
          likeCount: true,
        },
      });

      return {
        changed: false,
        likeCount: pin?.likeCount ?? 0,
      };
    }

    const updated = await transaction.pin.updateMany({
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

    const pin = await transaction.pin.findUnique({
      where: {
        id: pinId,
      },
      select: {
        likeCount: true,
      },
    });

    if (updated.count > 0) {
      await transaction.userEvent.create({
        data: {
          userId: currentUser.id,
          eventType: "UNLIKE_PIN",
          targetType: "PIN",
          targetId: pinId,
        },
      });
    }

    return {
      changed: true,
      likeCount: pin?.likeCount ?? 0,
    };
  });

  return NextResponse.json({
    liked: false,
    changed: result.changed,
    likeCount: result.likeCount,
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
