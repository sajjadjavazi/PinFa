import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationListItem = {
  actor: {
    displayName: string;
    username: string;
  } | null;
  createdAt: string;
  href: string | null;
  id: string;
  isRead: boolean;
  message: string;
  targetId: string | null;
  targetType: string | null;
  type: NotificationType;
};

type NotificationClient = Prisma.TransactionClient | typeof prisma;

const notificationSelect = {
  id: true,
  type: true,
  actorId: true,
  targetType: true,
  targetId: true,
  message: true,
  isRead: true,
  createdAt: true,
  actor: {
    select: {
      displayName: true,
      username: true,
    },
  },
} satisfies Prisma.NotificationSelect;

type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export async function createNotification(
  input: {
    actorId?: string | null;
    avoidDuplicateUnread?: boolean;
    message: string;
    targetId?: string | null;
    targetType?: string | null;
    type: NotificationType;
    userId: string;
  },
  client: NotificationClient = prisma,
) {
  if (input.actorId && input.actorId === input.userId) {
    return null;
  }

  if (input.avoidDuplicateUnread ?? true) {
    const existingNotification = await client.notification.findFirst({
      where: {
        actorId: input.actorId ?? null,
        isRead: false,
        targetId: input.targetId ?? null,
        targetType: input.targetType ?? null,
        type: input.type,
        userId: input.userId,
      },
    });

    if (existingNotification) {
      return existingNotification;
    }
  }

  return client.notification.create({
    data: {
      actorId: input.actorId ?? undefined,
      message: input.message,
      targetId: input.targetId ?? undefined,
      targetType: input.targetType ?? undefined,
      type: input.type,
      userId: input.userId,
    },
  });
}

export async function getNotificationsForUser(input: {
  take?: number;
  userId: string;
}) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: input.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: notificationSelect,
    take: input.take ?? 50,
  });

  return notifications.map(serializeNotification);
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      isRead: false,
      userId,
    },
  });
}

export async function getNotificationSummary(input: {
  recentTake?: number;
  userId: string;
}) {
  const recentTake = input.recentTake ?? 5;
  const [recentNotifications, unreadCount] = await Promise.all([
    recentTake > 0
      ? getNotificationsForUser({
          take: recentTake,
          userId: input.userId,
        })
      : Promise.resolve([]),
    getUnreadNotificationCount(input.userId),
  ]);

  return {
    recentNotifications,
    unreadCount,
  };
}

export async function markNotificationRead(input: {
  id: string;
  userId: string;
}) {
  return prisma.notification.updateMany({
    where: {
      id: input.id,
      userId: input.userId,
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      isRead: false,
      userId,
    },
    data: {
      isRead: true,
    },
  });
}

function serializeNotification(
  notification: NotificationRecord,
): NotificationListItem {
  return {
    actor: notification.actor,
    createdAt: notification.createdAt.toISOString(),
    href: getNotificationHref(notification),
    id: notification.id,
    isRead: notification.isRead,
    message: notification.message,
    targetId: notification.targetId,
    targetType: notification.targetType,
    type: notification.type,
  };
}

function getNotificationHref(notification: NotificationRecord) {
  if (
    notification.type === "USER_FOLLOWED_YOU" &&
    notification.actor?.username
  ) {
    return `/users/${notification.actor.username}`;
  }

  if (notification.targetType === "PIN" && notification.targetId) {
    return `/pins/${notification.targetId}`;
  }

  if (notification.targetType === "BOARD" && notification.targetId) {
    return `/boards/${notification.targetId}`;
  }

  return null;
}
