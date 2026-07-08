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
  defaultNote: string;
  label: string;
  nextStatus: PinStatus;
  notificationType?: NotificationType;
};

const ACTION_CONFIG: Record<AdminPinModerationAction, ActionConfig> = {
  approve: {
    allowedStatuses: [PinStatus.PENDING_REVIEW],
    auditAction: AuditAction.PIN_APPROVED,
    defaultNote: "Pin manually approved.",
    decision: ModerationDecision.MANUALLY_APPROVED,
    label: "approved",
    nextStatus: PinStatus.PUBLISHED,
    notificationType: NotificationType.PIN_APPROVED,
  },
  reject: {
    allowedStatuses: [PinStatus.PENDING_REVIEW],
    auditAction: AuditAction.PIN_REJECTED,
    defaultNote: "Pin manually rejected.",
    decision: ModerationDecision.MANUALLY_REJECTED,
    label: "rejected",
    nextStatus: PinStatus.REJECTED,
    notificationType: NotificationType.PIN_REJECTED,
  },
  remove: {
    allowedStatuses: [PinStatus.PUBLISHED],
    auditAction: AuditAction.PIN_REMOVED,
    defaultNote: "Published Pin manually removed.",
    decision: ModerationDecision.REMOVED,
    label: "removed",
    nextStatus: PinStatus.REMOVED,
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
  reviewNote?: string | null;
}) {
  const config = ACTION_CONFIG[input.action];
  const reviewNote = normalizeReviewNote(input.reviewNote) ?? config.defaultNote;

  return prisma.$transaction(async (transaction) => {
    const pin = await transaction.pin.findUnique({
      where: {
        id: input.pinId,
      },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        moderationResults: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            decision: true,
            reviewNote: true,
            reviewedById: true,
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
          reviewNote,
        },
      });
    } else {
      await transaction.moderationResult.create({
        data: {
          pinId: input.pinId,
          provider: "manual_admin_review",
          decision: config.decision,
          reviewedById: input.actorId,
          reviewNote,
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
          reviewNote: latestModerationResult?.reviewNote ?? null,
          reviewedById: latestModerationResult?.reviewedById ?? null,
        } satisfies Prisma.InputJsonValue,
        newValueJson: {
          status: config.nextStatus,
          moderationDecision: config.decision,
          reviewNote,
          reviewedById: input.actorId,
        } satisfies Prisma.InputJsonValue,
        note: reviewNote,
        ipAddress: input.ipAddress,
      },
    });

    if (config.notificationType) {
      await createNotification(
        {
          actorId: input.actorId,
          message:
            config.notificationType === NotificationType.PIN_APPROVED
              ? "Your Pin was approved."
              : "Your Pin was rejected.",
          targetId: input.pinId,
          targetType: "PIN",
          type: config.notificationType,
          userId: pin.ownerUserId,
        },
        transaction,
      );
    }

    return {
      decision: config.decision,
      id: input.pinId,
      status: config.nextStatus,
    };
  });
}

function normalizeReviewNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}
