import {
  AuditAction,
  ModerationDecision,
  NotificationType,
  PinStatus,
  Prisma,
} from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type AdminPinModerationAction = "approve" | "reject" | "remove";

type ActionConfig = {
  allowedStatuses: PinStatus[];
  auditAction: AuditAction;
  decision: ModerationDecision;
  label: string;
  nextStatus: PinStatus;
  note: string;
};

const ACTION_CONFIG: Record<AdminPinModerationAction, ActionConfig> = {
  approve: {
    allowedStatuses: [PinStatus.PENDING_REVIEW, PinStatus.REJECTED],
    auditAction: AuditAction.PIN_APPROVED,
    decision: ModerationDecision.MANUALLY_APPROVED,
    label: "approved",
    nextStatus: PinStatus.PUBLISHED,
    note: "Pin manually approved.",
  },
  reject: {
    allowedStatuses: [PinStatus.PENDING_REVIEW],
    auditAction: AuditAction.PIN_REJECTED,
    decision: ModerationDecision.MANUALLY_REJECTED,
    label: "rejected",
    nextStatus: PinStatus.REJECTED,
    note: "Pin manually rejected.",
  },
  remove: {
    allowedStatuses: [PinStatus.PUBLISHED],
    auditAction: AuditAction.PIN_REMOVED,
    decision: ModerationDecision.REMOVED,
    label: "removed",
    nextStatus: PinStatus.REMOVED,
    note: "Published Pin manually removed.",
  },
};

export class AdminPinActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export async function applyAdminPinModerationAction(input: {
  action: AdminPinModerationAction;
  actorId: string;
  ipAddress?: string | null;
  pinId: string;
}) {
  const config = ACTION_CONFIG[input.action];

  return prisma.$transaction(async (transaction) => {
    const pin = await transaction.pin.findUnique({
      where: {
        id: input.pinId,
      },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        title: true,
        moderationResults: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            decision: true,
          },
          take: 1,
        },
      },
    });

    if (!pin) {
      throw new AdminPinActionError("Pin not found.", 404);
    }

    if (!config.allowedStatuses.includes(pin.status)) {
      throw new AdminPinActionError(
        `Pin cannot be ${config.label} while it is ${pin.status}.`,
        400,
      );
    }

    const latestModerationResult = pin.moderationResults[0] ?? null;

    await transaction.pin.update({
      where: {
        id: input.pinId,
      },
      data: {
        status: config.nextStatus,
      },
    });

    if (latestModerationResult) {
      await transaction.moderationResult.update({
        where: {
          id: latestModerationResult.id,
        },
        data: {
          decision: config.decision,
          reviewedById: input.actorId,
          reviewNote: config.note,
        },
      });
    } else {
      await transaction.moderationResult.create({
        data: {
          pinId: input.pinId,
          provider: "manual_admin_review",
          decision: config.decision,
          reviewedById: input.actorId,
          reviewNote: config.note,
        },
      });
    }

    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: config.auditAction,
        targetType: "PIN",
        targetId: input.pinId,
        oldValueJson: {
          status: pin.status,
          moderationDecision: latestModerationResult?.decision ?? null,
        } satisfies Prisma.InputJsonValue,
        newValueJson: {
          status: config.nextStatus,
          moderationDecision: config.decision,
        } satisfies Prisma.InputJsonValue,
        note: config.note,
        ipAddress: input.ipAddress,
      },
    });

    if (input.action === "approve" || input.action === "reject") {
      await createNotification(
        {
          actorId: input.actorId,
          message:
            input.action === "approve"
              ? `Your Pin "${pin.title}" was approved.`
              : `Your Pin "${pin.title}" was rejected.`,
          targetId: input.pinId,
          targetType: "PIN",
          type:
            input.action === "approve"
              ? NotificationType.PIN_APPROVED
              : NotificationType.PIN_REJECTED,
          userId: pin.ownerUserId,
        },
        transaction,
      );
    }

    return {
      id: input.pinId,
      status: config.nextStatus,
      decision: config.decision,
    };
  });
}
