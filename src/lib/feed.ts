import type { Prisma } from "@prisma/client";
import type { FeedAdItem } from "@/lib/ads/ad-provider";
import { insertHomeFeedAds } from "@/lib/ads/ad-insertion";
import {
  rankFeedCandidates,
  type FeedRankingContext,
  type RankedFeedPin,
} from "@/lib/feed-ranking";
import { applyFeedViewInterestSignals } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

const feedPinSelect = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  categoryId: true,
  createdAt: true,
  description: true,
  height: true,
  id: true,
  imageFeedUrl: true,
  imageThumbnailUrl: true,
  likeCount: true,
  owner: {
    select: {
      avatarUrl: true,
      displayName: true,
      username: true,
    },
  },
  ownerUserId: true,
  reportCount: true,
  saveCount: true,
  shareCount: true,
  title: true,
  viewCount: true,
  width: true,
} satisfies Prisma.PinSelect;

type FeedPinRecord = Prisma.PinGetPayload<{
  select: typeof feedPinSelect;
}>;

export type FeedPinItem = {
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
  description: string | null;
  height: number | null;
  id: string;
  imageFeedUrl: string;
  imageThumbnailUrl: string | null;
  likeCount: number;
  likedByViewer: boolean;
  matchedInterestCategory?: string | null;
  owner: {
    avatarUrl: string | null;
    displayName: string;
    username: string;
  };
  rankingReason?: string;
  reportCount: number;
  saveCount: number;
  savedByViewer: boolean;
  score?: number;
  shareCount: number;
  title: string;
  viewCount: number;
  width: number | null;
};

export type HomeFeedPage = {
  hasMore: boolean;
  items: FeedItem[];
  nextCursor: string | null;
  organicItems: FeedPinItem[];
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

type SimpleFeedCursor = {
  createdAt: string;
  id: string;
  likeCount: number;
  mode?: "simple";
  organicSeen?: number;
  saveCount: number;
};

type PersonalizedFeedCursor = {
  mode: "personalized";
  offset: number;
};

type FeedCursor = PersonalizedFeedCursor | SimpleFeedCursor;

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 30;
const MIN_LIMIT = 1;
const PERSONALIZED_MIN_CANDIDATES = 120;
const PERSONALIZED_MAX_CANDIDATES = 500;

const publishedFeedWhere = {
  imageFeedUrl: {
    not: null,
  },
  status: "PUBLISHED",
} satisfies Prisma.PinWhereInput;

const simpleFeedOrderBy = [
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
] satisfies Prisma.PinOrderByWithRelationInput[];

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
    ) as Record<string, unknown>;

    const personalizedOffset = parsed.offset;

    if (
      parsed.mode === "personalized" &&
      Number.isInteger(personalizedOffset) &&
      typeof personalizedOffset === "number" &&
      personalizedOffset >= 0
    ) {
      return {
        mode: "personalized",
        offset: personalizedOffset,
      };
    }

    if (
      typeof parsed.createdAt !== "string" ||
      Number.isNaN(new Date(parsed.createdAt).getTime()) ||
      typeof parsed.id !== "string" ||
      typeof parsed.likeCount !== "number" ||
      typeof parsed.saveCount !== "number"
    ) {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
      likeCount: parsed.likeCount,
      mode: "simple",
      organicSeen:
        typeof parsed.organicSeen === "number" && parsed.organicSeen >= 0
          ? parsed.organicSeen
          : undefined,
      saveCount: parsed.saveCount,
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
  if (input.viewerUserId) {
    return getPersonalizedHomeFeedPage({
      cursor: isPersonalizedCursor(input.cursor) ? input.cursor : null,
      limit: input.limit,
      viewerUserId: input.viewerUserId,
    });
  }

  return getSimpleHomeFeedPage({
    cursor: isSimpleCursor(input.cursor) ? input.cursor : null,
    limit: input.limit,
  });
}

export async function recordFeedViewEvents(input: {
  items: FeedItem[];
  userId?: string | null;
}) {
  const userId = input.userId;

  if (!userId) {
    return;
  }

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

  if (pinItems.length === 0) {
    return;
  }

  await prisma.userEvent.createMany({
    data: pinItems.map((item) => ({
      eventType: "VIEW_PIN",
      metadataJson: {
        position: item.position,
        source: "home_feed",
      },
      targetId: item.pin.id,
      targetType: "PIN",
      userId,
    })),
  });

  await applyFeedViewInterestSignals({
    categories: pinItems.map((item) => item.pin.category),
    userId,
  });
}

async function getSimpleHomeFeedPage(input: {
  cursor?: SimpleFeedCursor | null;
  limit: number;
}): Promise<HomeFeedPage> {
  const organicOffset = input.cursor?.organicSeen ?? 0;
  const pins = await prisma.pin.findMany({
    where: {
      ...publishedFeedWhere,
      ...(input.cursor ? { OR: getCursorWhere(input.cursor) } : {}),
    },
    orderBy: simpleFeedOrderBy,
    select: feedPinSelect,
    take: input.limit + 1,
  });
  const pagePins = pins.slice(0, input.limit);
  const organicItems = pagePins.map((pin) => toFeedPinItem(pin, false, false));

  return {
    hasMore: pins.length > input.limit,
    items: await insertHomeFeedAds({
      organicOffset,
      pins: organicItems,
    }),
    nextCursor:
      pins.length > input.limit
        ? encodeSimpleFeedCursor({
            organicSeen: organicOffset + pagePins.length,
            pin: pagePins[pagePins.length - 1],
          })
        : null,
    organicItems,
  };
}

async function getPersonalizedHomeFeedPage(input: {
  cursor?: PersonalizedFeedCursor | null;
  limit: number;
  viewerUserId: string;
}): Promise<HomeFeedPage> {
  const offset = input.cursor?.offset ?? 0;
  const candidateTake = getPersonalizedCandidateTake(offset, input.limit);
  const candidatePins = await prisma.pin.findMany({
    where: publishedFeedWhere,
    orderBy: simpleFeedOrderBy,
    select: feedPinSelect,
    take: candidateTake,
  });
  const candidatePinIds = candidatePins.map((pin) => pin.id);
  const rankingContext = await getRankingContext({
    candidatePinIds,
    viewerUserId: input.viewerUserId,
  });
  const rankedPins = rankFeedCandidates(candidatePins, rankingContext);
  const pagePins = rankedPins.slice(offset, offset + input.limit);
  const pinIds = pagePins.map((pin) => pin.id);
  const [likedPinIds, savedPinIds] = await Promise.all([
    getLikedPinIds({
      pinIds,
      viewerUserId: input.viewerUserId,
    }),
    getSavedPinIds({
      pinIds,
      viewerUserId: input.viewerUserId,
    }),
  ]);
  const hasMore = rankedPins.length > offset + input.limit;
  const organicItems = pagePins.map((pin) =>
    toFeedPinItem(pin, likedPinIds.has(pin.id), savedPinIds.has(pin.id)),
  );

  return {
    hasMore,
    items: await insertHomeFeedAds({
      organicOffset: offset,
      pins: organicItems,
      viewerUserId: input.viewerUserId,
    }),
    nextCursor: hasMore ? encodePersonalizedFeedCursor(offset + input.limit) : null,
    organicItems,
  };
}

function getPersonalizedCandidateTake(offset: number, limit: number) {
  return Math.min(
    PERSONALIZED_MAX_CANDIDATES,
    Math.max(PERSONALIZED_MIN_CANDIDATES, offset + limit + 1),
  );
}

async function getRankingContext(input: {
  candidatePinIds: string[];
  viewerUserId: string;
}): Promise<FeedRankingContext> {
  const [interests, userFollows, boardFollows, categoryFollows, seenEvents] =
    await Promise.all([
      prisma.userInterest.findMany({
        where: {
          userId: input.viewerUserId,
        },
        select: {
          categoryId: true,
          score: true,
        },
      }),
      prisma.userFollow.findMany({
        where: {
          followerUserId: input.viewerUserId,
        },
        select: {
          targetUserId: true,
        },
      }),
      prisma.boardFollow.findMany({
        where: {
          userId: input.viewerUserId,
        },
        select: {
          boardId: true,
        },
      }),
      prisma.categoryFollow.findMany({
        where: {
          userId: input.viewerUserId,
        },
        select: {
          categoryId: true,
        },
      }),
      input.candidatePinIds.length > 0
        ? prisma.userEvent.findMany({
            distinct: ["targetId"],
            where: {
              eventType: {
                in: ["OPEN_PIN", "VIEW_PIN"],
              },
              targetId: {
                in: input.candidatePinIds,
              },
              targetType: "PIN",
              userId: input.viewerUserId,
            },
            select: {
              targetId: true,
            },
          })
        : Promise.resolve([]),
    ]);
  const followedBoardIds = boardFollows.map((follow) => follow.boardId);
  const followedBoardPins =
    followedBoardIds.length > 0 && input.candidatePinIds.length > 0
      ? await prisma.boardPin.findMany({
          distinct: ["pinId"],
          where: {
            boardId: {
              in: followedBoardIds,
            },
            pinId: {
              in: input.candidatePinIds,
            },
          },
          select: {
            pinId: true,
          },
        })
      : [];

  return {
    followedBoardPinIds: new Set(followedBoardPins.map((boardPin) => boardPin.pinId)),
    followedCategoryIds: new Set(
      categoryFollows.map((follow) => follow.categoryId),
    ),
    followedUserIds: new Set(userFollows.map((follow) => follow.targetUserId)),
    interestScores: new Map(
      interests.map((interest) => [interest.categoryId, interest.score]),
    ),
    now: new Date(),
    seenPinIds: new Set(
      seenEvents
        .map((event) => event.targetId)
        .filter((targetId): targetId is string => Boolean(targetId)),
    ),
  };
}

function getCursorWhere(cursor: SimpleFeedCursor): Prisma.PinWhereInput[] {
  const createdAt = new Date(cursor.createdAt);

  return [
    {
      createdAt: {
        lt: createdAt,
      },
    },
    {
      createdAt,
      saveCount: {
        lt: cursor.saveCount,
      },
    },
    {
      createdAt,
      likeCount: {
        lt: cursor.likeCount,
      },
      saveCount: cursor.saveCount,
    },
    {
      createdAt,
      id: {
        lt: cursor.id,
      },
      likeCount: cursor.likeCount,
      saveCount: cursor.saveCount,
    },
  ];
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
      pinId: {
        in: input.pinIds,
      },
      userId: input.viewerUserId,
    },
    select: {
      pinId: true,
    },
  });

  return new Set(likes.map((like) => like.pinId));
}

async function getSavedPinIds(input: {
  pinIds: string[];
  viewerUserId?: string | null;
}) {
  if (!input.viewerUserId || input.pinIds.length === 0) {
    return new Set<string>();
  }

  const boardPins = await prisma.boardPin.findMany({
    where: {
      pinId: {
        in: input.pinIds,
      },
      savedByUserId: input.viewerUserId,
    },
    select: {
      pinId: true,
    },
  });

  return new Set(boardPins.map((boardPin) => boardPin.pinId));
}

function toFeedPinItem(
  pin: (FeedPinRecord | RankedFeedPin<FeedPinRecord>) & {
    matchedInterestCategory?: string | null;
    personalizedScore?: number;
    rankingReason?: string;
  },
  likedByViewer: boolean,
  savedByViewer: boolean,
): FeedPinItem {
  return {
    category: pin.category
      ? {
          id: pin.category.id,
          name: pin.category.name,
          slug: pin.category.slug,
        }
      : null,
    createdAt: pin.createdAt.toISOString(),
    description: pin.description,
    height: pin.height,
    id: pin.id,
    imageFeedUrl: pin.imageFeedUrl ?? "",
    imageThumbnailUrl: pin.imageThumbnailUrl,
    likeCount: pin.likeCount,
    likedByViewer,
    matchedInterestCategory: pin.matchedInterestCategory,
    owner: pin.owner,
    rankingReason: pin.rankingReason,
    reportCount: pin.reportCount,
    saveCount: pin.saveCount,
    savedByViewer,
    score:
      typeof pin.personalizedScore === "number"
        ? Math.round(pin.personalizedScore * 100) / 100
        : undefined,
    shareCount: pin.shareCount,
    title: pin.title,
    viewCount: pin.viewCount,
    width: pin.width,
  };
}

function encodeSimpleFeedCursor(input: {
  organicSeen: number;
  pin:
    | {
        createdAt: Date;
        id: string;
        likeCount: number;
        saveCount: number;
      }
    | undefined;
}) {
  if (!input.pin) {
    return null;
  }

  return Buffer.from(
    JSON.stringify({
      createdAt: input.pin.createdAt.toISOString(),
      id: input.pin.id,
      likeCount: input.pin.likeCount,
      mode: "simple",
      organicSeen: input.organicSeen,
      saveCount: input.pin.saveCount,
    } satisfies SimpleFeedCursor),
  ).toString("base64url");
}

function encodePersonalizedFeedCursor(offset: number) {
  return Buffer.from(
    JSON.stringify({
      mode: "personalized",
      offset,
    } satisfies PersonalizedFeedCursor),
  ).toString("base64url");
}

function isPersonalizedCursor(
  cursor: FeedCursor | null | undefined,
): cursor is PersonalizedFeedCursor {
  return cursor?.mode === "personalized";
}

function isSimpleCursor(
  cursor: FeedCursor | null | undefined,
): cursor is SimpleFeedCursor {
  return Boolean(cursor && cursor.mode !== "personalized");
}
