import { Prisma } from "@prisma/client";
import { applySearchInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

export const searchTabs = ["pins", "boards", "users", "categories"] as const;

export type SearchTab = (typeof searchTabs)[number];

export type SearchPinResult = {
  category: {
    name: string;
    slug: string;
  } | null;
  createdAt: string;
  description: string | null;
  height: number | null;
  id: string;
  imageFeedUrl: string | null;
  imageThumbnailUrl: string | null;
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
  coverPin: {
    imageFeedUrl: string | null;
    imageThumbnailUrl: string | null;
    status: string;
    title: string;
  } | null;
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

export type SearchResults = {
  boards: SearchBoardResult[];
  categories: SearchCategoryResult[];
  pins: SearchPinResult[];
  query: string;
  users: SearchUserResult[];
};

const DEFAULT_SEARCH_LIMIT = 24;
const MIN_SEARCH_QUERY_LENGTH = 2;
const MAX_SEARCH_QUERY_LENGTH = 120;
const MAX_SEARCH_LIMIT = 30;

export function normalizeSearchQuery(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function parseSearchTab(value: string | null | undefined): SearchTab {
  return searchTabs.includes(value as SearchTab) ? (value as SearchTab) : "pins";
}

export function parseSearchLimit(value: string | null | undefined) {
  const parsed = value ? Number(value) : DEFAULT_SEARCH_LIMIT;

  if (!Number.isInteger(parsed)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, parsed));
}

export function canSearch(query: string) {
  return query.trim().length >= MIN_SEARCH_QUERY_LENGTH;
}

export async function searchAll(input: {
  limit?: number;
  query: string;
}): Promise<SearchResults> {
  const query = normalizeSearchQuery(input.query);
  const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;

  if (!canSearch(query)) {
    return {
      boards: [],
      categories: [],
      pins: [],
      query,
      users: [],
    };
  }

  const containsQuery = {
    contains: query,
    mode: Prisma.QueryMode.insensitive,
  };

  const [pins, boards, users, categories] = await Promise.all([
    prisma.pin.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          {
            title: containsQuery,
          },
          {
            description: containsQuery,
          },
        ],
      },
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
      take: limit,
    }),
    prisma.board.findMany({
      where: {
        visibility: "PUBLIC",
        OR: [
          {
            title: containsQuery,
          },
          {
            description: containsQuery,
          },
        ],
      },
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
      ],
      select: {
        coverPin: {
          select: {
            imageFeedUrl: true,
            imageThumbnailUrl: true,
            status: true,
            title: true,
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
      take: limit,
    }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          {
            username: containsQuery,
          },
          {
            displayName: containsQuery,
          },
        ],
      },
      orderBy: [
        {
          followerCount: "desc",
        },
        {
          createdAt: "desc",
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
      take: limit,
    }),
    prisma.category.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          {
            name: containsQuery,
          },
          {
            slug: containsQuery,
          },
        ],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        description: true,
        id: true,
        name: true,
        slug: true,
      },
      take: limit,
    }),
  ]);

  return {
    boards,
    categories,
    pins: pins.map((pin) => ({
      ...pin,
      createdAt: pin.createdAt.toISOString(),
    })),
    query,
    users,
  };
}

export async function recordSearchEvent(input: {
  query: string;
  resultCounts?: {
    boards: number;
    categories: number;
    pins: number;
    users: number;
  };
  source: "api" | "search_page";
  tab?: SearchTab;
  userId?: string | null;
}) {
  const query = normalizeSearchQuery(input.query);

  if (!canSearch(query)) {
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
          tab: input.tab,
        },
        targetType: "SEARCH",
        userId: input.userId ?? undefined,
      },
    }),
    applySearchInterestSignal({
      query,
      userId: input.userId,
    }),
  ]);
}
