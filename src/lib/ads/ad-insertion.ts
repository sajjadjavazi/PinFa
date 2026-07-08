import {
  AdEventType,
  AdPlacement,
  AdProvider as PrismaAdProvider,
} from "@prisma/client";
import type { AdSlotForProvider } from "@/lib/ads/ad-provider";
import { recordAdEvent } from "@/lib/ads/ad-events";
import { getAdProvider } from "@/lib/ads/providers";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import type { FeedItem, FeedPinItem } from "@/lib/feed";
import { prisma } from "@/lib/prisma";

const DEFAULT_HOME_FEED_AD_FREQUENCY = 6;

export async function insertHomeFeedAds(input: {
  organicOffset?: number;
  pins: FeedPinItem[];
  viewerUserId?: string | null;
}): Promise<FeedItem[]> {
  const pinItems = input.pins.map((pin) => wrapPin(pin));

  if (input.pins.length === 0) {
    return pinItems;
  }

  const slot = await getActiveHomeFeedAdSlot();

  if (!slot) {
    return pinItems;
  }

  const frequency = normalizeFrequency(slot.frequencyEvery);
  const mixedItems: FeedItem[] = [];
  let organicSinceLastAd = getOrganicSinceLastAd({
    frequency,
    organicOffset: input.organicOffset ?? 0,
  });
  let adOrdinal = Math.floor(Math.max(0, input.organicOffset ?? 0) / frequency);

  for (const pin of input.pins) {
    mixedItems.push(wrapPin(pin));
    organicSinceLastAd += 1;

    if (organicSinceLastAd < frequency) {
      continue;
    }

    adOrdinal += 1;
    const adItem = await requestHomeFeedAd({
      ordinal: adOrdinal,
      slot,
      viewerUserId: input.viewerUserId,
    });

    if (adItem && mixedItems[mixedItems.length - 1]?.type !== "AD") {
      mixedItems.push(adItem);
    }

    organicSinceLastAd = 0;
  }

  return mixedItems;
}

export async function getActiveHomeFeedAdSlot() {
  return prisma.adSlot.findFirst({
    where: {
      isActive: true,
      placement: AdPlacement.HOME_FEED_INLINE,
      provider: PrismaAdProvider.YEKTANET,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      frequencyEvery: true,
      id: true,
      name: true,
      placement: true,
      provider: true,
      providerConfigJson: true,
    },
  });
}

async function requestHomeFeedAd(input: {
  ordinal: number;
  slot: AdSlotForProvider;
  viewerUserId?: string | null;
}): Promise<FeedItem | null> {
  const provider = getAdProvider(input.slot.provider);

  if (!provider) {
    logAnalyticsEvent("ads.provider.unsupported", {
      provider: input.slot.provider,
      slotId: input.slot.id,
    });

    await recordAdEvent({
      eventType: AdEventType.AD_FAILED,
      metadataJson: {
        ordinal: input.ordinal,
        reason: "unsupported_provider",
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return null;
  }

  if (provider.isEnabled && !provider.isEnabled({ slot: input.slot })) {
    return null;
  }

  await recordAdEvent({
    eventType: AdEventType.AD_SLOT_REQUESTED,
    metadataJson: {
      ordinal: input.ordinal,
      source: "home_feed",
    },
    placement: input.slot.placement,
    provider: input.slot.provider,
    slotId: input.slot.id,
    userId: input.viewerUserId,
  });

  try {
    const ad = await provider.renderAd({
      ordinal: input.ordinal,
      slot: input.slot,
      viewerUserId: input.viewerUserId,
    });

    if (!ad) {
      logAnalyticsEvent("ads.provider.empty", {
        provider: input.slot.provider,
        slotId: input.slot.id,
      });

      return null;
    }

    await recordAdEvent({
      adReference: ad.adReference,
      eventType: AdEventType.AD_SLOT_RENDERED,
      metadataJson: {
        ordinal: input.ordinal,
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return {
      ad,
      id: `ad:${ad.slotId}:${ad.adReference}`,
      type: "AD",
    };
  } catch (error) {
    logAnalyticsError("ads.provider.failed", error, {
      phase: "render",
      provider: input.slot.provider,
      slotId: input.slot.id,
    });

    await provider.handleFailure?.({
      error,
      phase: "render",
      slot: input.slot,
      userId: input.viewerUserId,
    });
    await recordAdEvent({
      eventType: AdEventType.AD_FAILED,
      metadataJson: {
        errorMessage: getErrorMessage(error),
        ordinal: input.ordinal,
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return null;
  }
}

function wrapPin(pin: FeedPinItem): FeedItem {
  return {
    id: pin.id,
    pin,
    type: "PIN",
  };
}

function normalizeFrequency(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_HOME_FEED_AD_FREQUENCY;
  }

  return value;
}

function getOrganicSinceLastAd(input: {
  frequency: number;
  organicOffset: number;
}) {
  return Math.min(
    input.frequency - 1,
    Math.max(0, input.organicOffset) % input.frequency,
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ad provider error.";
}
