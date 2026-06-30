import { prisma } from "@/lib/prisma";
import { applyFeedViewInterestSignals } from "@/lib/interest-signals";
import { insertHomeFeedAds } from "@/lib/ads/feed-ads";
import type { FeedAdItem } from "@/lib/ads/ad-provider";

export type FeedPinItem = {
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
  height: number | null;
  id: string;
  imageFeedUrl: string;
  likeCount: number;
  likedByViewer: boolean;
  owner: {
    displayName: string;
    username: string;
  };
  reportCount: number;
  saveCount: number;
  shareCount: number;
  title: string;
  width: number | null;
};

export type HomeFeedPage = {
  has_more: boolean;
  items: FeedItem[];
  next_cursor: string | null;
};

export type FeedPinListItem = {
  id: string;
  pin: FeedPinItem;
  type: "PIN";
};

export type FeedAdListItem = {
  ad: FeedAdItem;
  id: string;
  type: "AD";
};

export type FeedItem = FeedAdListItem | FeedPinListItem;

type FeedCursor = {
  adOrganicCount?: number;
  id: string;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 30;
const MIN_LIMIT = 1;
const CANDIDATE_LIMIT = 500;
const MAX_SAME_CATEGORY_STREAK = 2;

export function parseFeedLimit(value: string | null) {
  const parsed = value ? Number(value) : DEFAULT_LIMIT;

  if (!Number.isInteger(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

export function decodeFeedCursor(value: string | null): FeedCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<FeedCursor>;

    if (typeof parsed.id !== "string") {
      return null;
    }

    return {
      adOrganicCount: readAdOrganicCount(parsed.adOrganicCount),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export async function getHomeFeedPage(input: {
  cursor?: FeedCursor | null;
  limit: number;
  viewerUserId?: string | null;
}): Promise<HomeFeedPage> {
  const context = await getPersonalizationContext(input.viewerUserId);
  const pins = await prisma.pin.findMany({
    where: {
      status: "PUBLISHED",
      imageFeedUrl: {
        not: null,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        saveCount: "desc",
      },
      {
        likeCount: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      title: true,
      categoryId: true,
      ownerUserId: true,
      imageFeedUrl: true,
      width: true,
      height: true,
      likeCount: true,
      saveCount: true,
      shareCount: true,
      reportCount: true,
      createdAt: true,
      boardPins: {
        select: {
          boardId: true,
        },
        take: 24,
      },
      owner: {
        select: {
          displayName: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
  const rankedPins = diversifyByCategory(
    pins
      .map((pin) => ({
        ...pin,
        feedScore: scorePinForFeed(pin, context),
      }))
      .sort(compareRankedPins),
  );
  const startIndex = input.cursor
    ? rankedPins.findIndex((pin) => pin.id === input.cursor?.id) + 1
    : 0;
  const safeStartIndex = startIndex > 0 ? startIndex : 0;
  const pagePins = rankedPins.slice(safeStartIndex, safeStartIndex + input.limit);
  const hasMore = rankedPins.length > safeStartIndex + input.limit;
  const likedPinIds = await getLikedPinIds({
    pinIds: pagePins.map((pin) => pin.id),
    viewerUserId: input.viewerUserId,
  });
  const organicItems = pagePins.map((pin) => ({
    category: pin.category,
    createdAt: pin.createdAt.toISOString(),
    height: pin.height,
    id: pin.id,
    imageFeedUrl: pin.imageFeedUrl ?? "",
    likeCount: pin.likeCount,
    likedByViewer: likedPinIds.has(pin.id),
    owner: pin.owner,
    reportCount: pin.reportCount,
    saveCount: pin.saveCount,
    shareCount: pin.shareCount,
    title: pin.title,
    width: pin.width,
  }));
  const composedFeed = await insertHomeFeedAds({
    organicSinceLastAd: input.cursor?.adOrganicCount,
    pins: organicItems,
    viewerUserId: input.viewerUserId,
  });

  return {
    has_more: hasMore,
    items: composedFeed.items,
    next_cursor: hasMore
      ? encodeFeedCursor(
          pagePins[pagePins.length - 1],
          composedFeed.organicSinceLastAd,
        )
      : null,
  };
}

export async function recordFeedViewEvents(input: {
  items: FeedItem[];
  userId?: string | null;
}) {
  const pinItems = input.items.flatMap((item, index) =>
    item.type === "PIN"
      ? [
          {
            pin: item.pin,
            position: index,
          },
        ]
      : [],
  );

  if (!input.userId || pinItems.length === 0) {
    return;
  }

  await prisma.userEvent.createMany({
    data: pinItems.map((item) => ({
      userId: input.userId,
      eventType: "VIEW_PIN",
      targetType: "PIN",
      targetId: item.pin.id,
      metadataJson: {
        source: "home_feed",
        position: item.position,
      },
    })),
  });

  await applyFeedViewInterestSignals({
    categories: pinItems.map((item) => item.pin.category),
    userId: input.userId,
  });
}

type PersonalizationContext = {
  followedBoardIds: Set<string>;
  followedUserIds: Set<string>;
  interestScoresByCategoryId: Map<string, number>;
};

type CandidatePin = {
  boardPins: Array<{
    boardId: string;
  }>;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categoryId: string | null;
  createdAt: Date;
  height: number | null;
  id: string;
  imageFeedUrl: string | null;
  likeCount: number;
  owner: {
    displayName: string;
    username: string;
  };
  ownerUserId: string;
  reportCount: number;
  saveCount: number;
  shareCount: number;
  title: string;
  width: number | null;
};

type RankedPin = CandidatePin & {
  feedScore: number;
};

async function getPersonalizationContext(
  viewerUserId?: string | null,
): Promise<PersonalizationContext> {
  if (!viewerUserId) {
    return {
      followedBoardIds: new Set(),
      followedUserIds: new Set(),
      interestScoresByCategoryId: new Map(),
    };
  }

  const [interests, followedUsers, followedBoards] = await Promise.all([
    prisma.userInterest.findMany({
      where: {
        userId: viewerUserId,
      },
      select: {
        categoryId: true,
        score: true,
      },
    }),
    prisma.userFollow.findMany({
      where: {
        followerUserId: viewerUserId,
      },
      select: {
        targetUserId: true,
      },
    }),
    prisma.boardFollow.findMany({
      where: {
        userId: viewerUserId,
      },
      select: {
        boardId: true,
      },
    }),
  ]);

  return {
    followedBoardIds: new Set(followedBoards.map((follow) => follow.boardId)),
    followedUserIds: new Set(followedUsers.map((follow) => follow.targetUserId)),
    interestScoresByCategoryId: new Map(
      interests.map((interest) => [interest.categoryId, interest.score]),
    ),
  };
}

function scorePinForFeed(pin: CandidatePin, context: PersonalizationContext) {
  const categoryInterest = pin.categoryId
    ? context.interestScoresByCategoryId.get(pin.categoryId) ?? 0
    : 0;
  const interestScore = Math.min(categoryInterest, 30) * 1.5;
  const followedUserScore = context.followedUserIds.has(pin.ownerUserId) ? 12 : 0;
  const followedBoardScore = pin.boardPins.some((boardPin) =>
    context.followedBoardIds.has(boardPin.boardId),
  )
    ? 10
    : 0;
  const popularityScore =
    Math.log1p(pin.saveCount) * 4 + Math.log1p(pin.likeCount) * 2;
  const freshnessScore = Math.max(0, 10 - ageInDays(pin.createdAt) * 0.3);
  const reportPenalty = pin.reportCount * 5;

  return (
    interestScore +
    followedUserScore +
    followedBoardScore +
    popularityScore +
    freshnessScore -
    reportPenalty
  );
}

function compareRankedPins(left: RankedPin, right: RankedPin) {
  return (
    right.feedScore - left.feedScore ||
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.saveCount - left.saveCount ||
    right.likeCount - left.likeCount ||
    right.id.localeCompare(left.id)
  );
}

function diversifyByCategory(pins: RankedPin[]) {
  const diversified = [...pins];

  for (let index = 2; index < diversified.length; index++) {
    const currentCategoryId = diversified[index].categoryId;

    if (!currentCategoryId) {
      continue;
    }

    const previousCategories = diversified
      .slice(index - MAX_SAME_CATEGORY_STREAK, index)
      .map((pin) => pin.categoryId);

    if (
      previousCategories.length === MAX_SAME_CATEGORY_STREAK &&
      previousCategories.every((categoryId) => categoryId === currentCategoryId)
    ) {
      const swapIndex = diversified.findIndex(
        (pin, candidateIndex) =>
          candidateIndex > index && pin.categoryId !== currentCategoryId,
      );

      if (swapIndex > index) {
        const [candidate] = diversified.splice(swapIndex, 1);
        diversified.splice(index, 0, candidate);
      }
    }
  }

  return diversified;
}

function ageInDays(date: Date) {
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

async function getLikedPinIds(input: {
  pinIds: string[];
  viewerUserId?: string | null;
}) {
  if (!input.viewerUserId || input.pinIds.length === 0) {
    return new Set<string>();
  }

  const likes = await prisma.like.findMany({
    where: {
      userId: input.viewerUserId,
      pinId: {
        in: input.pinIds,
      },
    },
    select: {
      pinId: true,
    },
  });

  return new Set(likes.map((like) => like.pinId));
}

function encodeFeedCursor(
  pin:
    | {
        id: string;
      }
    | undefined,
  adOrganicCount = 0,
) {
  if (!pin) {
    return null;
  }

  return Buffer.from(
    JSON.stringify({
      adOrganicCount,
      id: pin.id,
    } satisfies FeedCursor),
  ).toString("base64url");
}

function readAdOrganicCount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}
