import { UserInterestSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INTEREST_SIGNAL_WEIGHTS = {
  view: 1,
  open: 2,
  like: 3,
  save: 5,
  follow: 6,
  search: 2,
} as const;

type InterestSignal = keyof typeof INTEREST_SIGNAL_WEIGHTS;

const sourceBySignal: Record<InterestSignal, UserInterestSource> = {
  view: UserInterestSource.VIEW,
  open: UserInterestSource.VIEW,
  like: UserInterestSource.LIKE,
  save: UserInterestSource.SAVE,
  follow: UserInterestSource.FOLLOW,
  search: UserInterestSource.SEARCH,
};

export async function applyCategoryInterestSignal(input: {
  categoryId: string | null | undefined;
  signal: InterestSignal;
  userId: string | null | undefined;
}) {
  if (!input.userId || !input.categoryId) {
    return;
  }

  await incrementUserInterest({
    categoryId: input.categoryId,
    scoreIncrement: INTEREST_SIGNAL_WEIGHTS[input.signal],
    source: sourceBySignal[input.signal],
    userId: input.userId,
  });
}

export async function applyPinInterestSignal(input: {
  pinId: string;
  signal: InterestSignal;
  userId: string | null | undefined;
}) {
  if (!input.userId) {
    return;
  }

  const pin = await prisma.pin.findUnique({
    where: {
      id: input.pinId,
    },
    select: {
      categoryId: true,
    },
  });

  await applyCategoryInterestSignal({
    categoryId: pin?.categoryId,
    signal: input.signal,
    userId: input.userId,
  });
}

export async function applyFeedViewInterestSignals(input: {
  categories: Array<{
    id: string | null | undefined;
  } | null>;
  userId: string | null | undefined;
}) {
  const userId = input.userId;

  if (!userId || input.categories.length === 0) {
    return;
  }

  const increments = new Map<string, number>();

  for (const category of input.categories) {
    if (!category?.id) {
      continue;
    }

    increments.set(
      category.id,
      (increments.get(category.id) ?? 0) + INTEREST_SIGNAL_WEIGHTS.view,
    );
  }

  await Promise.all(
    [...increments].map(([categoryId, scoreIncrement]) =>
      incrementUserInterest({
        categoryId,
        scoreIncrement,
        source: UserInterestSource.VIEW,
        userId,
      }),
    ),
  );
}

export async function applyFollowedUserInterestSignal(input: {
  targetUserId: string;
  userId: string | null | undefined;
}) {
  if (!input.userId) {
    return;
  }

  const pins = await prisma.pin.findMany({
    where: {
      ownerUserId: input.targetUserId,
      status: "PUBLISHED",
      categoryId: {
        not: null,
      },
    },
    distinct: ["categoryId"],
    orderBy: {
      createdAt: "desc",
    },
    select: {
      categoryId: true,
    },
    take: 12,
  });

  await applyDistinctCategorySignals({
    categoryIds: pins.map((pin) => pin.categoryId),
    signal: "follow",
    userId: input.userId,
  });
}

export async function applyFollowedBoardInterestSignal(input: {
  boardId: string;
  userId: string | null | undefined;
}) {
  if (!input.userId) {
    return;
  }

  const boardPins = await prisma.boardPin.findMany({
    where: {
      boardId: input.boardId,
      pin: {
        status: "PUBLISHED",
        categoryId: {
          not: null,
        },
      },
    },
    include: {
      pin: {
        select: {
          categoryId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 24,
  });

  await applyDistinctCategorySignals({
    categoryIds: boardPins.map((boardPin) => boardPin.pin.categoryId),
    signal: "follow",
    userId: input.userId,
  });
}

export async function applySearchInterestSignal(input: {
  query: string;
  userId: string | null | undefined;
}) {
  const query = input.query.trim();

  if (!input.userId || query.length < 2) {
    return;
  }

  const categories = await prisma.category.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          slug: {
            contains: query,
          },
        },
      ],
    },
    select: {
      id: true,
    },
    take: 5,
  });

  await applyDistinctCategorySignals({
    categoryIds: categories.map((category) => category.id),
    signal: "search",
    userId: input.userId,
  });
}

async function applyDistinctCategorySignals(input: {
  categoryIds: Array<string | null>;
  signal: InterestSignal;
  userId: string;
}) {
  const categoryIds = [...new Set(input.categoryIds.filter(Boolean))] as string[];

  await Promise.all(
    categoryIds.map((categoryId) =>
      incrementUserInterest({
        categoryId,
        scoreIncrement: INTEREST_SIGNAL_WEIGHTS[input.signal],
        source: sourceBySignal[input.signal],
        userId: input.userId,
      }),
    ),
  );
}

async function incrementUserInterest(input: {
  categoryId: string;
  scoreIncrement: number;
  source: UserInterestSource;
  userId: string;
}) {
  await prisma.userInterest.upsert({
    where: {
      userId_categoryId: {
        userId: input.userId,
        categoryId: input.categoryId,
      },
    },
    create: {
      userId: input.userId,
      categoryId: input.categoryId,
      score: input.scoreIncrement,
      source: input.source,
    },
    update: {
      score: {
        increment: input.scoreIncrement,
      },
      source: input.source,
    },
  });
}
