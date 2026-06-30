import {
  AuditAction,
  ModerationDecision,
  NotificationType,
  PinStatus,
  Prisma,
  ReportStatus,
  ReportTargetType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type AdminReportAction =
  | "reject"
  | "remove-pin"
  | "resolve"
  | "suspend-user";

export class AdminReportActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export async function applyAdminReportAction(input: {
  action: AdminReportAction;
  actorId: string;
  actorRole: UserRole;
  ipAddress?: string | null;
  reportId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const report = await transaction.report.findUnique({
      where: {
        id: input.reportId,
      },
      select: {
        id: true,
        reporterUserId: true,
        reason: true,
        status: true,
        targetId: true,
        targetType: true,
      },
    });

    if (!report) {
      throw new AdminReportActionError("Report not found.", 404);
    }

    if (report.status === ReportStatus.RESOLVED) {
      throw new AdminReportActionError("Report is already resolved.", 400);
    }

    if (report.status === ReportStatus.REJECTED) {
      throw new AdminReportActionError("Report is already rejected.", 400);
    }

    if (input.action === "resolve") {
      await updateReportStatus({
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        note: "Report manually resolved.",
        report,
        status: ReportStatus.RESOLVED,
        transaction,
      });

      return {
        id: report.id,
        status: ReportStatus.RESOLVED,
      };
    }

    if (input.action === "reject") {
      await updateReportStatus({
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        note: "Report manually rejected.",
        report,
        status: ReportStatus.REJECTED,
        transaction,
      });

      return {
        id: report.id,
        status: ReportStatus.REJECTED,
      };
    }

    if (input.action === "remove-pin") {
      return removeReportedPin({
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        report,
        transaction,
      });
    }

    return suspendReportedUser({
      actorId: input.actorId,
      actorRole: input.actorRole,
      ipAddress: input.ipAddress,
      report,
      transaction,
    });
  });
}

async function updateReportStatus(input: {
  actorId: string;
  ipAddress?: string | null;
  note: string;
  report: ReportSnapshot;
  status: ReportStatus;
  transaction: Prisma.TransactionClient;
}) {
  await input.transaction.report.update({
    where: {
      id: input.report.id,
    },
    data: {
      reviewedById: input.actorId,
      reviewNote: input.note,
      status: input.status,
    },
  });

  await input.transaction.auditLog.create({
    data: {
      actorId: input.actorId,
      action: AuditAction.REPORT_RESOLVED,
      ipAddress: input.ipAddress,
      newValueJson: {
        reportStatus: input.status,
      } satisfies Prisma.InputJsonValue,
      note: input.note,
      oldValueJson: {
        reportStatus: input.report.status,
      } satisfies Prisma.InputJsonValue,
      targetId: input.report.id,
      targetType: "REPORT",
    },
  });

  if (input.status === ReportStatus.RESOLVED) {
    await createNotification(
      {
        actorId: input.actorId,
        message: "Your report was resolved.",
        targetId: input.report.id,
        targetType: "REPORT",
        type: NotificationType.REPORT_RESOLVED,
        userId: input.report.reporterUserId,
      },
      input.transaction,
    );
  }
}

async function removeReportedPin(input: {
  actorId: string;
  ipAddress?: string | null;
  report: ReportSnapshot;
  transaction: Prisma.TransactionClient;
}) {
  if (input.report.targetType !== ReportTargetType.PIN) {
    throw new AdminReportActionError("Report target is not a Pin.", 400);
  }

  const pin = await input.transaction.pin.findUnique({
    where: {
      id: input.report.targetId,
    },
    select: {
      id: true,
      status: true,
      moderationResults: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          decision: true,
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!pin) {
    throw new AdminReportActionError("Reported Pin not found.", 404);
  }

  if (pin.status === PinStatus.DELETED) {
    throw new AdminReportActionError("Deleted Pins cannot be removed.", 400);
  }

  const latestModerationResult = pin.moderationResults[0] ?? null;

  if (pin.status !== PinStatus.REMOVED) {
    await input.transaction.pin.update({
      where: {
        id: pin.id,
      },
      data: {
        status: PinStatus.REMOVED,
      },
    });

    if (latestModerationResult) {
      await input.transaction.moderationResult.update({
        where: {
          id: latestModerationResult.id,
        },
        data: {
          decision: ModerationDecision.REMOVED,
          reviewedById: input.actorId,
          reviewNote: "Reported Pin removed from report management.",
        },
      });
    } else {
      await input.transaction.moderationResult.create({
        data: {
          decision: ModerationDecision.REMOVED,
          pinId: pin.id,
          provider: "manual_report_review",
          reviewedById: input.actorId,
          reviewNote: "Reported Pin removed from report management.",
        },
      });
    }

    await input.transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: AuditAction.PIN_REMOVED,
        ipAddress: input.ipAddress,
        newValueJson: {
          moderationDecision: ModerationDecision.REMOVED,
          reportId: input.report.id,
          status: PinStatus.REMOVED,
        } satisfies Prisma.InputJsonValue,
        note: "Reported Pin removed.",
        oldValueJson: {
          moderationDecision: latestModerationResult?.decision ?? null,
          status: pin.status,
        } satisfies Prisma.InputJsonValue,
        targetId: pin.id,
        targetType: "PIN",
      },
    });
  }

  await updateReportStatus({
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    note:
      pin.status === PinStatus.REMOVED
        ? "Report resolved because the Pin was already removed."
        : "Report resolved by removing the reported Pin.",
    report: input.report,
    status: ReportStatus.RESOLVED,
    transaction: input.transaction,
  });

  return {
    id: input.report.id,
    status: ReportStatus.RESOLVED,
    targetStatus: PinStatus.REMOVED,
  };
}

async function suspendReportedUser(input: {
  actorId: string;
  actorRole: UserRole;
  ipAddress?: string | null;
  report: ReportSnapshot;
  transaction: Prisma.TransactionClient;
}) {
  if (input.report.targetType !== ReportTargetType.USER) {
    throw new AdminReportActionError("Report target is not a User.", 400);
  }

  if (input.report.targetId === input.actorId) {
    throw new AdminReportActionError("You cannot suspend yourself.", 400);
  }

  const user = await input.transaction.user.findUnique({
    where: {
      id: input.report.targetId,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AdminReportActionError("Reported User not found.", 404);
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    throw new AdminReportActionError("Super Admin users cannot be suspended.", 400);
  }

  if (user.role === UserRole.MODERATOR && input.actorRole !== UserRole.SUPER_ADMIN) {
    throw new AdminReportActionError(
      "Only a Super Admin can suspend a Moderator.",
      403,
    );
  }

  if (user.status === UserStatus.DELETED) {
    throw new AdminReportActionError("Deleted users cannot be suspended.", 400);
  }

  if (user.status !== UserStatus.SUSPENDED) {
    await input.transaction.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.SUSPENDED,
      },
    });

    await input.transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: AuditAction.USER_SUSPENDED,
        ipAddress: input.ipAddress,
        newValueJson: {
          reportId: input.report.id,
          status: UserStatus.SUSPENDED,
        } satisfies Prisma.InputJsonValue,
        note: "Reported User suspended.",
        oldValueJson: {
          status: user.status,
        } satisfies Prisma.InputJsonValue,
        targetId: user.id,
        targetType: "USER",
      },
    });
  }

  await updateReportStatus({
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    note:
      user.status === UserStatus.SUSPENDED
        ? "Report resolved because the User was already suspended."
        : "Report resolved by suspending the reported User.",
    report: input.report,
    status: ReportStatus.RESOLVED,
    transaction: input.transaction,
  });

  return {
    id: input.report.id,
    status: ReportStatus.RESOLVED,
    targetStatus: UserStatus.SUSPENDED,
  };
}

type ReportSnapshot = {
  id: string;
  reason: string;
  reporterUserId: string;
  status: ReportStatus;
  targetId: string;
  targetType: ReportTargetType;
};
