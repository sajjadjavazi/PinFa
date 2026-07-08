import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { applySearchInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

export const searchTypes = [
  "all",
  "pins",
  "boards",
  "users",
  "categories",
] as const;

export const searchTabs = searchTypes;

export type SearchType = (typeof searchTypes)[number];
export type SearchTab = SearchType;
export type SearchEntityType = Exclude<SearchType, "all">;

export type SearchPinResult = {
  category: {
    name: string;
    slug: string;
  } | null;
  createdAt: string;
  description: string | null;
  height: number | null;
  id: string;
  imageUrl: string | null;
  likeCount: number;
  owner: {
    displayName: string;
    username: string;
  };
  saveCount: number;
  title: string;
  width: number | null;
};

export type SearchBoardResult = {
  coverImageUrl: string | null;
  description: string | null;
  followerCount: number;
  id: string;
  owner: {
    displayName: string;
    username: string;
  };
  pinCount: number;
  title: string;
};

export type SearchUserResult = {
  avatarUrl: string | null;
  bio: string | null;
  displayName: string;
  followerCount: number;
  id: string;
  username: string;
};

export type SearchCategoryResult = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
};

export type SearchGroupedResults = {
  boards: SearchBoardResult[];
  categories: SearchCategoryResult[];
  pins: SearchPinResult[];
  users: SearchUserResult[];
};

export type SearchCounts = Record<SearchEntityType, number>;

export type SearchAllResponse = {
  counts: SearchCounts;
  query: string;
  results: SearchGroupedResults;
  type: "all";
};

export type SearchTypedItems = {
  boards: SearchBoardResult;
  categories: SearchCategoryResult;
  pins: SearchPinResult;
  users: SearchUserResult;
};

export type SearchTypedResponse<T extends SearchEntityType = SearchEntityType> = {
  count: number;
  hasMore: boolean;
  items: SearchTypedItems[T][];
  nextCursor: string | null;
  query: string;
  type: T;
};

export type SearchApiResponse = SearchAllResponse | SearchTypedResponse;

type SearchCursor = {
  offset: number;
};

const DEFAULT_SEARCH_LIMIT = 24;
const DEFAULT_GROUP_LIMIT = 5;
const MIN_SEARCH_QUERY_LENGTH = 2;
const MAX_SEARCH_QUERY_LENGTH = 120;
const MAX_SEARCH_LIMIT = 30;
const MIN_SEARCH_LIMIT = 1;

export function normalizeSearchQuery(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function parseSearchType(value: string | null | undefined): SearchType {
  return searchTypes.includes(value as SearchType) ? (value as SearchType) : "all";
}

export const parseSearchTab = parseSearchType;

export function parseSearchLimit(value: string | null | undefined) {
  const parsed = value ? Number(value) : DEFAULT_SEARCH_LIMIT;

  if (!Number.isInteger(parsed)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(MAX_SEARCH_LIMIT, Math.max(MIN_SEARCH_LIMIT, parsed));
}

export function canSearch(query: string) {
  return query.trim().length >= MIN_SEARCH_QUERY_LENGTH;
}

export function decodeSearchCursor(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    if (
      typeof parsed.offset === "number" &&
      Number.isInteger(parsed.offset) &&
      parsed.offset >= 0
    ) {
      return {
        offset: parsed.offset,
      } satisfies SearchCursor;
    }
  } catch {
    return null;
  }

  return null;
}

export async function runSearch(input: {
  cursor?: SearchCursor | null;
  limit?: number;
  query: string;
  type: SearchType;
}): Promise<SearchApiResponse> {
  const query = normalizeSearchQuery(input.query);
  const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;

  if (!canSearch(query)) {
    return emptySearchResponse({
      query,
      type: input.type,
    });
  }

  if (input.type === "all") {
    return searchGrouped({
      limit: Math.min(DEFAULT_GROUP_LIMIT, limit),
      query,
    });
  }

  return searchTyped({
    cursor: input.cursor,
    limit,
    query,
    type: input.type,
  });
}

export async function recordSearchEvent(input: {
  query: string;
  resultCounts?: Partial<SearchCounts>;
  source: "api" | "search_page";
  type?: SearchType;
  userId?: string | null;
}) {
  const query = normalizeSearchQuery(input.query);

  if (!input.userId || !canSearch(query)) {
    return;
  }

  await Promise.all([
    prisma.userEvent.create({
      data: {
        eventType: "SEARCH",
        metadataJson: {
          query,
          resultCounts: input.resultCounts,
          source: input.source,
          type: input.type,
        },
        targetId: getSearchTargetId(query),
        targetType: "SEARCH",
        userId: input.userId,
      },
    }),
    applySearchInterestSignal({
      query,
      userId: input.userId,
    }),
  ]);
}

async function searchGrouped(input: {
  limit: number;
  query: string;
}): Promise<SearchAllResponse> {
  const [pins, boards, users, categories, counts] = await Promise.all([
    findPins({
      limit: input.limit,
      query: input.query,
    }),
    findBoards({
      limit: input.limit,
      query: input.query,
    }),
    findUsers({
      limit: input.limit,
      query: input.query,
    }),
    findCategories({
      limit: input.limit,
      query: input.query,
    }),
    countAll(input.query),
  ]);

  return {
    counts,
    query: input.query,
    results: {
      boards,
      categories,
      pins,
      users,
    },
    type: "all",
  };
}

async function searchTyped<T extends SearchEntityType>(input: {
  cursor?: SearchCursor | null;
  limit: number;
  query: string;
  type: T;
}): Promise<SearchTypedResponse<T>> {
  const offset = input.cursor?.offset ?? 0;
  const [items, count] = await Promise.all([
    findByType({
      limit: input.limit + 1,
      offset,
      query: input.query,
      type: input.type,
    }) as Promise<SearchTypedItems[T][]>,
    countByType(input.type, input.query),
  ]);
  const pageItems = items.slice(0, input.limit);
  const hasMore = items.length > input.limit;

  return {
    count,
    hasMore,
    items: pageItems,
    nextCursor: hasMore ? encodeSearchCursor(offset + pageItems.length) : null,
    query: input.query,
    type: input.type,
  };
}

async function findByType(input: {
  limit: number;
  offset?: number;
  query: string;
  type: SearchEntityType;
}) {
  if (input.type === "pins") {
    return findPins(input);
  }

  if (input.type === "boards") {
    return findBoards(input);
  }

  if (input.type === "users") {
    return findUsers(input);
  }

  return findCategories(input);
}

async function findPins(input: {
  limit: number;
  offset?: number;
  query: string;
}) {
  const pins = await prisma.pin.findMany({
    where: getPinSearchWhere(input.query),
    orderBy: [
      {
        saveCount: "desc",
      },
      {
        likeCount: "desc",
      },
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      createdAt: true,
      description: true,
      height: true,
      id: true,
      imageFeedUrl: true,
      imageThumbnailUrl: true,
      likeCount: true,
      owner: {
        select: {
          displayName: true,
          username: true,
        },
      },
      saveCount: true,
      title: true,
      width: true,
    },
    skip: input.offset ?? 0,
    take: input.limit,
  });

  return pins.map((pin) => ({
    category: pin.category,
    createdAt: pin.createdAt.toISOString(),
    description: pin.description,
    height: pin.height,
    id: pin.id,
    imageUrl: pin.imageThumbnailUrl ?? pin.imageFeedUrl,
    likeCount: pin.likeCount,
    owner: pin.owner,
    saveCount: pin.saveCount,
    title: pin.title,
    width: pin.width,
  }));
}

async function findBoards(input: {
  limit: number;
  offset?: number;
  query: string;
}) {
  const boards = await prisma.board.findMany({
    where: getBoardSearchWhere(input.query),
    orderBy: [
      {
        pinCount: "desc",
      },
      {
        followerCount: "desc",
      },
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      coverPin: {
        select: {
          imageFeedUrl: true,
          imageThumbnailUrl: true,
          status: true,
        },
      },
      description: true,
      followerCount: true,
      id: true,
      owner: {
        select: {
          displayName: true,
          username: true,
        },
      },
      pinCount: true,
      title: true,
    },
    skip: input.offset ?? 0,
    take: input.limit,
  });

  return boards.map((board) => ({
    coverImageUrl:
      board.coverPin?.status === "PUBLISHED"
        ? board.coverPin.imageThumbnailUrl ?? board.coverPin.imageFeedUrl
        : null,
    description: board.description,
    followerCount: board.followerCount,
    id: board.id,
    owner: board.owner,
    pinCount: board.pinCount,
    title: board.title,
  }));
}

async function findUsers(input: {
  limit: number;
  offset?: number;
  query: string;
}) {
  return prisma.user.findMany({
    where: getUserSearchWhere(input.query),
    orderBy: [
      {
        followerCount: "desc",
      },
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      avatarUrl: true,
      bio: true,
      displayName: true,
      followerCount: true,
      id: true,
      username: true,
    },
    skip: input.offset ?? 0,
    take: input.limit,
  });
}

async function findCategories(input: {
  limit: number;
  offset?: number;
  query: string;
}) {
  return prisma.category.findMany({
    where: getCategorySearchWhere(input.query),
    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      description: true,
      id: true,
      name: true,
      slug: true,
    },
    skip: input.offset ?? 0,
    take: input.limit,
  });
}

async function countAll(query: string): Promise<SearchCounts> {
  const [pins, boards, users, categories] = await Promise.all([
    countByType("pins", query),
    countByType("boards", query),
    countByType("users", query),
    countByType("categories", query),
  ]);

  return {
    boards,
    categories,
    pins,
    users,
  };
}

async function countByType(type: SearchEntityType, query: string) {
  if (type === "pins") {
    return prisma.pin.count({
      where: getPinSearchWhere(query),
    });
  }

  if (type === "boards") {
    return prisma.board.count({
      where: getBoardSearchWhere(query),
    });
  }

  if (type === "users") {
    return prisma.user.count({
      where: getUserSearchWhere(query),
    });
  }

  return prisma.category.count({
    where: getCategorySearchWhere(query),
  });
}

function getPinSearchWhere(query: string): Prisma.PinWhereInput {
  const containsQuery = getContainsQuery(query);

  return {
    AND: [
      {
        OR: [
          {
            title: containsQuery,
          },
          {
            description: containsQuery,
          },
        ],
      },
      {
        OR: [
          {
            imageThumbnailUrl: {
              not: null,
            },
          },
          {
            imageFeedUrl: {
              not: null,
            },
          },
        ],
      },
    ],
    status: "PUBLISHED",
  };
}

function getBoardSearchWhere(query: string): Prisma.BoardWhereInput {
  const containsQuery = getContainsQuery(query);

  return {
    OR: [
      {
        title: containsQuery,
      },
      {
        description: containsQuery,
      },
    ],
    visibility: "PUBLIC",
  };
}

function getUserSearchWhere(query: string): Prisma.UserWhereInput {
  const containsQuery = getContainsQuery(query);

  return {
    OR: [
      {
        username: containsQuery,
      },
      {
        displayName: containsQuery,
      },
    ],
    status: "ACTIVE",
  };
}

function getCategorySearchWhere(query: string): Prisma.CategoryWhereInput {
  const containsQuery = getContainsQuery(query);

  return {
    OR: [
      {
        name: containsQuery,
      },
      {
        slug: containsQuery,
      },
    ],
    status: "ACTIVE",
  };
}

function getContainsQuery(query: string) {
  return {
    contains: query,
    mode: Prisma.QueryMode.insensitive,
  };
}

function emptySearchResponse(input: {
  query: string;
  type: SearchType;
}): SearchApiResponse {
  if (input.type === "all") {
    return {
      counts: {
        boards: 0,
        categories: 0,
        pins: 0,
        users: 0,
      },
      query: input.query,
      results: {
        boards: [],
        categories: [],
        pins: [],
        users: [],
      },
      type: "all",
    };
  }

  return {
    count: 0,
    hasMore: false,
    items: [],
    nextCursor: null,
    query: input.query,
    type: input.type,
  };
}

function encodeSearchCursor(offset: number) {
  return Buffer.from(
    JSON.stringify({
      offset,
    } satisfies SearchCursor),
  ).toString("base64url");
}

function getSearchTargetId(query: string) {
  return createHash("sha256").update(query.toLowerCase()).digest("hex").slice(0, 32);
}
