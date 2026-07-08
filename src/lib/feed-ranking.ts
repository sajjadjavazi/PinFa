export type RankableFeedPin = {
  category: {
    name: string;
    slug: string;
  } | null;
  categoryId: string | null;
  createdAt: Date;
  id: string;
  likeCount: number;
  ownerUserId: string;
  reportCount: number;
  saveCount: number;
  shareCount: number;
  viewCount: number;
};

export type FeedRankingContext = {
  followedBoardPinIds: Set<string>;
  followedCategoryIds: Set<string>;
  followedUserIds: Set<string>;
  interestScores: Map<string, number>;
  now: Date;
  seenPinIds: Set<string>;
};

export type RankedFeedPin<T extends RankableFeedPin> = T & {
  matchedInterestCategory: string | null;
  personalizedScore: number;
  rankingReason: string;
};

export const FEED_RANKING_WEIGHTS = {
  categoryInterestMultiplier: 4,
  followedUserBoost: 40,
  followedBoardBoost: 24,
  followedCategoryBoost: 24,
  savePopularityMultiplier: 8,
  likePopularityMultiplier: 5,
  sharePopularityMultiplier: 4,
  viewPopularityMultiplier: 1.5,
  freshnessMaxBoost: 28,
  freshnessWindowHours: 336,
  reportPenaltyMultiplier: 12,
  reportPenaltyCap: 60,
  seenPenalty: 22,
} as const;

const CATEGORY_INTEREST_MIN = -20;
const CATEGORY_INTEREST_MAX = 50;
const DIVERSITY_REPEAT_LIMIT = 2;

export function rankFeedCandidates<T extends RankableFeedPin>(
  pins: T[],
  context: FeedRankingContext,
): Array<RankedFeedPin<T>> {
  const ranked = pins.map((pin) => ({
    ...pin,
    ...scorePin(pin, context),
  }));

  ranked.sort(compareRankedPins);

  return diversifyByCategory(ranked);
}

function scorePin(pin: RankableFeedPin, context: FeedRankingContext) {
  const categoryInterestRaw = pin.categoryId
    ? (context.interestScores.get(pin.categoryId) ?? 0)
    : 0;
  const categoryInterestScore =
    clamp(categoryInterestRaw, CATEGORY_INTEREST_MIN, CATEGORY_INTEREST_MAX) *
    FEED_RANKING_WEIGHTS.categoryInterestMultiplier;
  const followedUserScore = context.followedUserIds.has(pin.ownerUserId)
    ? FEED_RANKING_WEIGHTS.followedUserBoost
    : 0;
  const followedBoardScore = context.followedBoardPinIds.has(pin.id)
    ? FEED_RANKING_WEIGHTS.followedBoardBoost
    : 0;
  const followedCategoryScore =
    pin.categoryId && context.followedCategoryIds.has(pin.categoryId)
      ? FEED_RANKING_WEIGHTS.followedCategoryBoost
      : 0;
  const popularityScore =
    Math.log1p(pin.saveCount) * FEED_RANKING_WEIGHTS.savePopularityMultiplier +
    Math.log1p(pin.likeCount) * FEED_RANKING_WEIGHTS.likePopularityMultiplier +
    Math.log1p(pin.shareCount) *
      FEED_RANKING_WEIGHTS.sharePopularityMultiplier +
    Math.log1p(pin.viewCount) * FEED_RANKING_WEIGHTS.viewPopularityMultiplier;
  const freshnessScore = getFreshnessScore(pin.createdAt, context.now);
  const reportPenalty = Math.min(
    pin.reportCount * FEED_RANKING_WEIGHTS.reportPenaltyMultiplier,
    FEED_RANKING_WEIGHTS.reportPenaltyCap,
  );
  const seenPenalty = context.seenPinIds.has(pin.id)
    ? FEED_RANKING_WEIGHTS.seenPenalty
    : 0;

  // MVP heuristic: combine category affinity, follows, engagement, and freshness,
  // then subtract report and already-seen penalties. The weights are constants so
  // the result remains deterministic and easy to reason about.
  const personalizedScore =
    categoryInterestScore +
    followedUserScore +
    followedBoardScore +
    followedCategoryScore +
    popularityScore +
    freshnessScore -
    reportPenalty -
    seenPenalty;

  return {
    matchedInterestCategory:
      categoryInterestRaw > 0 ? (pin.category?.slug ?? null) : null,
    personalizedScore,
    rankingReason: getRankingReason({
      categoryInterestRaw,
      followedBoardScore,
      followedCategoryScore,
      followedUserScore,
      pin,
    }),
  };
}

function getFreshnessScore(createdAt: Date, now: Date) {
  const ageHours = Math.max(0, now.getTime() - createdAt.getTime()) / 3_600_000;
  const ratio = Math.max(
    0,
    1 - ageHours / FEED_RANKING_WEIGHTS.freshnessWindowHours,
  );

  return ratio * FEED_RANKING_WEIGHTS.freshnessMaxBoost;
}

function getRankingReason(input: {
  categoryInterestRaw: number;
  followedBoardScore: number;
  followedCategoryScore: number;
  followedUserScore: number;
  pin: RankableFeedPin;
}) {
  if (input.followedUserScore > 0) {
    return "From a creator you follow";
  }

  if (input.categoryInterestRaw > 0 && input.pin.category) {
    return `Because you like ${input.pin.category.name}`;
  }

  if (input.followedBoardScore > 0) {
    return "Saved on a Board you follow";
  }

  if (input.followedCategoryScore > 0 && input.pin.category) {
    return `From followed category ${input.pin.category.name}`;
  }

  if (input.pin.saveCount + input.pin.likeCount >= 10) {
    return "Popular on PinFa";
  }

  return "Fresh public Pin";
}

function compareRankedPins<T extends RankableFeedPin>(
  left: RankedFeedPin<T>,
  right: RankedFeedPin<T>,
) {
  const scoreDifference = right.personalizedScore - left.personalizedScore;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const createdAtDifference =
    right.createdAt.getTime() - left.createdAt.getTime();

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  if (right.saveCount !== left.saveCount) {
    return right.saveCount - left.saveCount;
  }

  if (right.likeCount !== left.likeCount) {
    return right.likeCount - left.likeCount;
  }

  return right.id.localeCompare(left.id);
}

function diversifyByCategory<T extends RankableFeedPin>(
  rankedPins: Array<RankedFeedPin<T>>,
) {
  const remaining = [...rankedPins];
  const diversified: Array<RankedFeedPin<T>> = [];

  while (remaining.length > 0) {
    const nextIndex = findNextDiverseIndex(diversified, remaining);
    const [next] = remaining.splice(nextIndex, 1);
    diversified.push(next);
  }

  return diversified;
}

function findNextDiverseIndex<T extends RankableFeedPin>(
  diversified: Array<RankedFeedPin<T>>,
  remaining: Array<RankedFeedPin<T>>,
) {
  if (diversified.length < DIVERSITY_REPEAT_LIMIT) {
    return 0;
  }

  const recent = diversified.slice(-DIVERSITY_REPEAT_LIMIT);
  const repeatedCategoryId = recent[0].categoryId;

  if (!repeatedCategoryId) {
    return 0;
  }

  const repeats = recent.every((pin) => pin.categoryId === repeatedCategoryId);

  if (!repeats) {
    return 0;
  }

  const diverseIndex = remaining.findIndex(
    (pin) => pin.categoryId !== repeatedCategoryId,
  );

  return diverseIndex >= 0 ? diverseIndex : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
