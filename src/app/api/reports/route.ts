import { Prisma, ReportTargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyCategoryInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";
import { readJsonBody, validateReportInput } from "@/lib/report-validation";

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
  const validation = validateReportInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const targetCheck = await validateTarget(validation.data, currentUser.id);

    if (!targetCheck.ok) {
      return NextResponse.json(
        { errors: targetCheck.errors },
        { status: targetCheck.status },
      );
    }

    const report = await prisma.$transaction(async (transaction) => {
      const createdReport = await transaction.report.create({
        data: {
          reporterUserId: currentUser.id,
          targetType: validation.data.targetType,
          targetId: validation.data.targetId,
          reason: validation.data.reason,
          description: validation.data.description,
        },
        select: {
          id: true,
          reason: true,
          status: true,
        },
      });

      if (validation.data.targetType === ReportTargetType.PIN) {
        await transaction.pin.update({
          where: {
            id: validation.data.targetId,
          },
          data: {
            reportCount: {
              increment: 1,
            },
          },
        });
      }

      await transaction.userEvent.create({
        data: {
          eventType: "REPORT_PIN",
          metadataJson: {
            reason: validation.data.reason,
            reportId: createdReport.id,
          },
          targetId: validation.data.targetId,
          targetType: validation.data.targetType,
          userId: currentUser.id,
        },
      });

      return createdReport;
    });

    if (validation.data.targetType === ReportTargetType.PIN) {
      await applyCategoryInterestSignal({
        categoryId: targetCheck.pinCategoryId,
        signal: "report",
        userId: currentUser.id,
      });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          errors: {
            report: "You have already reported this target for that reason.",
          },
        },
        { status: 409 },
      );
    }

    console.error("Report creation failed", error);

    return NextResponse.json(
      { errors: { report: "Report failed." } },
      { status: 500 },
    );
  }
}

async function validateTarget(
  input: {
    targetId: string;
    targetType: ReportTargetType;
  },
  reporterUserId: string,
): Promise<
  | { ok: true; pinCategoryId?: string | null }
  | {
      ok: false;
      errors: Record<string, string>;
      status: number;
    }
> {
  if (input.targetType === ReportTargetType.PIN) {
    const pin = await prisma.pin.findFirst({
      where: {
        id: input.targetId,
        status: "PUBLISHED",
      },
      select: {
        categoryId: true,
        id: true,
        ownerUserId: true,
      },
    });

    if (!pin) {
      return {
        ok: false,
        errors: { targetId: "Published Pin not found." },
        status: 404,
      };
    }

    return { ok: true, pinCategoryId: pin.categoryId };
  }

  if (input.targetType === ReportTargetType.USER) {
    if (input.targetId === reporterUserId) {
      return {
        ok: false,
        errors: { targetId: "You cannot report yourself." },
        status: 400,
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        id: input.targetId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return {
        ok: false,
        errors: { targetId: "User not found." },
        status: 404,
      };
    }

    return { ok: true };
  }

  const board = await prisma.board.findFirst({
    where: {
      id: input.targetId,
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!board) {
    return {
      ok: false,
      errors: { targetId: "Board not found." },
      status: 404,
    };
  }

  if (board.ownerUserId === reporterUserId) {
    return {
      ok: false,
      errors: { targetId: "You cannot report your own Board." },
      status: 400,
    };
  }

  return { ok: true };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
