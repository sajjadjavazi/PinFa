import { PinStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MODERATION_QUEUE_PAGE_SIZE = 25;

export const moderationPinSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  imageThumbnailUrl: true,
  imageFeedUrl: true,
  imageDetailUrl: true,
  width: true,
  height: true,
  reportCount: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      trustScore: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
      isSensitive: true,
    },
  },
  moderationResults: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      adultLikelihood: true,
      racyLikelihood: true,
      violenceLikelihood: true,
      medicalLikelihood: true,
      spoofLikelihood: true,
      decision: true,
      provider: true,
      createdAt: true,
      reviewedById: true,
      reviewNote: true,
      reviewedBy: {
        select: {
          displayName: true,
        },
      },
    },
    take: 1,
  },
} satisfies Prisma.PinSelect;

export type ModerationPin = Prisma.PinGetPayload<{
  select: typeof moderationPinSelect;
}>;

export async function getPendingModerationPins(input: {
  cursor?: string | null;
  limit?: number;
}) {
  const limit = clampLimit(input.limit ?? MODERATION_QUEUE_PAGE_SIZE);
  const pins = await prisma.pin.findMany({
    where: {
      status: PinStatus.PENDING_REVIEW,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : 0,
    select: moderationPinSelect,
    take: limit + 1,
  });
  const hasMore = pins.length > limit;
  const items = hasMore ? pins.slice(0, limit) : pins;

  return {
    hasMore,
    items,
    nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
  };
}

export async function getRecentlyPublishedModerationPins(limit = 20) {
  return prisma.pin.findMany({
    where: {
      status: PinStatus.PUBLISHED,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: moderationPinSelect,
    take: clampLimit(limit),
  });
}

function clampLimit(limit: number) {
  return Math.min(Math.max(limit, 1), 50);
}
