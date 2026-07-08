import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
  try {
    const pin = await prisma.pin.findFirst({
      where: {
        id: pinId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!pin) {
      return NextResponse.json(
        { errors: { pin: "Only published Pins can be shared." } },
        { status: 404 },
      );
    }

    const url = new URL(`/pins/${pinId}`, request.nextUrl.origin).toString();
    const updatedPin = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.pin.update({
        where: {
          id: pinId,
        },
        data: {
          shareCount: {
            increment: 1,
          },
        },
        select: {
          shareCount: true,
        },
      });

      await transaction.userEvent.create({
        data: {
          eventType: "SHARE_PIN",
          metadataJson: {
            url,
          },
          targetId: pinId,
          targetType: "PIN",
          userId: currentUser.id,
        },
      });

      return updated;
    });

    return NextResponse.json({
      shareCount: updatedPin.shareCount,
      title: pin.title,
      url,
    });
  } catch (error) {
    console.error("Share Pin failed", error);

    return NextResponse.json(
      { errors: { share: "Share failed." } },
      { status: 500 },
    );
  }
}
